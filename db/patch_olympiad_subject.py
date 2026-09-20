"""Wrap admin olympiad create to include subject (runs after builder)."""
from __future__ import annotations
import logging
log = logging.getLogger("geografia.patch_olympiad_subject")

def install(app=None):
    from db import repo
    from db.connection import get_session
    from sqlalchemy import text
    import uuid
    from datetime import datetime, timezone

    def _utc_now():
        return datetime.now(timezone.utc).isoformat()

    _orig_create = repo.create_olympiad
    _orig_find = repo.find_olympiad
    _orig_list = repo.list_olympiads
    _orig_oly = getattr(repo, "_oly_from_pg", None)

    def _oly_from_pg(session, o_row):
        if _orig_oly:
            base = _orig_oly(session, o_row)
        else:
            base = {"id": str(o_row.get("id"))}
        subj = None
        try:
            subj = o_row.get("subject")
        except Exception:
            subj = None
        if subj is None and base.get("id"):
            try:
                subj = session.execute(
                    text("SELECT subject FROM olympiads WHERE id::text = :id"),
                    {"id": str(base.get("id"))},
                ).scalar()
            except Exception:
                pass
        base["subject"] = (subj or "") or ""
        return base

    def list_olympiads():
        if repo.use_pg():
            try:
                with get_session() as s:
                    rows = s.execute(text(
                        "SELECT id, title, description, type, pass_score, duration_sec, "
                        "start_at, end_at, is_active, status, created_at, subject "
                        "FROM olympiads ORDER BY created_at DESC"
                    )).mappings().all()
                    return [_oly_from_pg(s, r) for r in rows]
            except Exception as e:
                log.warning("list_olympiads: %s", e)
                items = _orig_list()
                try:
                    with get_session() as s:
                        for o in items:
                            try:
                                r = s.execute(text("SELECT subject FROM olympiads WHERE id::text = :id"),
                                              {"id": str(o.get("id"))}).scalar()
                                o["subject"] = (r or "") or ""
                            except Exception:
                                o.setdefault("subject", "")
                except Exception:
                    pass
                return items
        return _orig_list()

    def find_olympiad(olympiad_id: str):
        if repo.use_pg():
            try:
                with get_session() as s:
                    r = s.execute(text(
                        "SELECT id, title, description, type, pass_score, duration_sec, "
                        "start_at, end_at, is_active, status, created_at, subject "
                        "FROM olympiads WHERE id::text = :id"
                    ), {"id": str(olympiad_id)}).mappings().first()
                    if not r:
                        return None
                    return _oly_from_pg(s, r)
            except Exception as e:
                log.warning("find_olympiad: %s", e)
                o = _orig_find(olympiad_id)
                if o and "subject" not in o:
                    o["subject"] = ""
                return o
        return _orig_find(olympiad_id)

    def create_olympiad(data: dict):
        data = dict(data or {})
        if not data.get("subject"):
            data["subject"] = "general"
        data["subject"] = str(data.get("subject") or "general").strip().lower() or "general"
        if repo.use_pg():
            try:
                result = _orig_create(data)
                oid = result.get("id") if isinstance(result, dict) else None
                if oid:
                    with get_session() as s:
                        try:
                            s.execute(text("ALTER TABLE olympiads ADD COLUMN IF NOT EXISTS subject TEXT"))
                        except Exception:
                            pass
                        s.execute(
                            text("UPDATE olympiads SET subject = :subj WHERE id::text = :id"),
                            {"subj": data["subject"], "id": str(oid)},
                        )
                    result["subject"] = data["subject"]
                return result
            except Exception as e:
                log.error("create_olympiad subject wrap: %s", e)
                return _orig_create(data)
        result = _orig_create(data)
        if isinstance(result, dict):
            result["subject"] = data["subject"]
            try:
                items = repo._load_json(repo.OLYMPIADS_FILE)
                for o in items:
                    if o.get("id") == result.get("id"):
                        o["subject"] = data["subject"]
                repo._save_json(repo.OLYMPIADS_FILE, items)
            except Exception:
                pass
        return result

    repo._oly_from_pg = _oly_from_pg
    repo.list_olympiads = list_olympiads
    repo.find_olympiad = find_olympiad
    repo.create_olympiad = create_olympiad

    if app is not None and "admin_create_olympiad" in app.view_functions:
        from flask import request
        _prev_route = app.view_functions["admin_create_olympiad"]

        def admin_create_olympiad_subject():
            payload = request.get_json(silent=True) or {}
            subj = str(payload.get("subject") or "general").strip().lower() or "general"
            _inner = repo.create_olympiad

            def _create_with_subj(data):
                data = dict(data or {})
                data["subject"] = subj
                return _inner(data)

            repo.create_olympiad = _create_with_subj
            try:
                return _prev_route()
            finally:
                repo.create_olympiad = create_olympiad

        app.view_functions["admin_create_olympiad"] = admin_create_olympiad_subject
        print("[boot] admin_create_olympiad wrapped for subject")

    print("[boot] patch_olympiad_subject: installed")
    log.info("patch_olympiad_subject installed")
