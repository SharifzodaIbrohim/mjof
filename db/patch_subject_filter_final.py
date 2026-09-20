"""Final subject filter for student olympiad list + start.

Must run AFTER patch_student_portal and patch_olympiad_subject so that:
- list_olympiads / find_olympiad already include the subject column
- we re-bind /api/student/olympiads and do not close over the old list_olympiads

Root cause of "list shows physics, start 403":
patch_student_portal did `from db.repo import list_olympiads` at install time
(before subject was added to SELECT), so the list handler kept the old function
without subject → subjects_compatible treated olympiad as open → shown in UI.
Start path imports find_olympiad at call time → had subject → subject_mismatch 403.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from flask import jsonify, request

log = logging.getLogger("geografia.patch_subject_filter_final")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _window_status(oly: dict) -> str:
    if oly.get("isActive") is False:
        return "closed"
    now = _now()

    def parse(v):
        if not v:
            return None
        if isinstance(v, datetime):
            return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
        try:
            s = str(v).replace("Z", "+00:00")
            d = datetime.fromisoformat(s)
            return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
        except Exception:
            return None

    start = parse(oly.get("startTime") or oly.get("start_at"))
    end = parse(oly.get("endTime") or oly.get("end_at"))
    if start and now < start:
        return "not_started"
    if end and now > end:
        return "ended"
    return "open"


def _public_student(st: dict | None) -> dict | None:
    if not st:
        return None
    return {
        "id": st.get("id") or st.get("student_code"),
        "fullName": st.get("fullName") or st.get("full_name"),
        "className": st.get("className") or st.get("class_name"),
        "school": st.get("school") or st.get("school_name") or "",
        "subject": (st.get("subject") or st.get("Subject") or "") or "",
    }


def install(app) -> None:
    from db import repo
    from db.student_access import subjects_compatible, student_has_olympiad_access

    def student_olympiads():
        code = str(
            request.args.get("studentId")
            or request.args.get("id")
            or request.headers.get("X-Student-Id")
            or (request.get_json(silent=True) or {}).get("studentId")
            or (request.get_json(silent=True) or {}).get("id")
            or ""
        ).strip()
        if not code:
            return jsonify({"error": "studentId лозим аст.", "olympiads": [], "quizzes": []}), 400

        # Always call through repo module so we get the subject-aware implementation
        st = repo.find_student_by_code(code)
        if not st:
            return jsonify({
                "error": "Хонанда ёфт нашуд.",
                "olympiads": [],
                "quizzes": [],
            }), 401

        st_subj = (st.get("subject") or st.get("Subject") or "") or ""

        olympiads = []
        quizzes = []
        seen = set()
        try:
            items = repo.list_olympiads() or []
        except Exception as e:
            log.warning("list_olympiads: %s", e)
            items = []

        for o in items:
            oid = str(o.get("id") or "")
            if not oid or oid in seen:
                continue
            if o.get("isActive") is False:
                continue
            seen.add(oid)

            oly_subj = (o.get("subject") or o.get("Subject") or "") or ""
            # Direct subject filter — do not rely only on access reason
            if not subjects_compatible(st_subj, oly_subj):
                continue

            access = {"allowed": False, "reason": "unknown"}
            try:
                access = student_has_olympiad_access(oid, code)
            except Exception as e:
                log.warning("access check %s: %s", oid, e)

            if access.get("reason") == "subject_mismatch":
                continue

            allowed = bool(access.get("allowed"))
            window = _window_status(o)
            card = {
                "id": oid,
                "title": o.get("title") or "Бе ном",
                "description": o.get("description") or "",
                "type": (o.get("type") or "olympiad").lower(),
                "subject": oly_subj,
                "passScore": o.get("passScore") or 70,
                "questionCount": o.get("questionCount") or len(o.get("questions") or []),
                "isActive": o.get("isActive") is not False,
                "isOpen": window == "open" and allowed,
                "windowStatus": window if allowed else ("locked" if window == "open" else window),
                "accessAllowed": allowed,
                "accessReason": access.get("reason"),
                "startTime": o.get("startTime"),
                "endTime": o.get("endTime"),
                "durationSec": o.get("durationSec"),
            }
            if card["type"] == "quiz":
                quizzes.append(card)
            else:
                olympiads.append(card)

        return jsonify({
            "ok": True,
            "student": _public_student(st),
            "olympiads": olympiads,
            "quizzes": quizzes,
        })

    def _bind(rule: str, ep: str, fn, methods: list[str]):
        for r in list(app.url_map.iter_rules()):
            if r.rule == rule:
                app.view_functions[r.endpoint] = fn
        if ep in app.view_functions:
            app.view_functions[ep] = fn
        else:
            try:
                app.add_url_rule(rule, ep, fn, methods=methods)
            except AssertionError:
                for r in list(app.url_map.iter_rules()):
                    if r.rule == rule:
                        app.view_functions[r.endpoint] = fn

    _bind("/api/student/olympiads", "student_portal_olympiads", student_olympiads, ["GET"])
    # Also override any other endpoint name that might serve this path
    for r in list(app.url_map.iter_rules()):
        if r.rule == "/api/student/olympiads":
            app.view_functions[r.endpoint] = student_olympiads

    print("[boot] patch_subject_filter_final: student list re-bound + subject filter")
    log.info("patch_subject_filter_final installed")
