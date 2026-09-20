"""M.J.O.F content store — news, articles, magazines, announcements."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

VALID_TYPES = ("news", "article", "magazine", "announcement", "link")


def _data_dir() -> Path:
    candidates = [
        Path(__file__).resolve().parent.parent / "data",
        Path.cwd() / "data",
        Path("/opt/render/project/src/data"),
        Path("/app/data"),
    ]
    for p in candidates:
        try:
            p.mkdir(parents=True, exist_ok=True)
            return p
        except Exception:
            continue
    p = Path.cwd() / "data"
    p.mkdir(parents=True, exist_ok=True)
    return p


DATA_DIR = _data_dir()
CONTENT_FILE = DATA_DIR / "content_items.json"

DEFAULT_ITEMS = [
    {
        "type": "announcement",
        "title": "Оғози мавсими олимпиадаҳои M.J.O.F",
        "summary": "Маҷмӯаи Олимпиадаҳои Фаннӣ барои соли нав омодагӣ мегирад.",
        "body": "Хуш омадед ба платформаи M.J.O.F — Маҷмӯаи Олимпиадаҳои Фаннӣ.\n\nДар ин ҷо шумо метавонед дар олимпиадаҳои фаннии гуногун (математика, физика, химия, забони тоҷикӣ, русӣ, англисӣ ва ғайра) иштирок намоед.\n\nБарои иштирок ID-и худро аз маъмури мактаб гиред ва аз саҳифаи «Олимпиадаҳо» ворид шавед.",
        "coverImage": "",
        "author": "M.J.O.F",
        "featured": True,
        "published": True,
        "lang": "tg",
        "url": "",
        "tags": ["эълон", "олимпиада"],
    },
    {
        "type": "news",
        "title": "Рейтинги иштирокчиён нав шуд",
        "summary": "Натиҷаҳои охирин дар саҳифаи Рейтинг нашр гардиданд.",
        "body": "Натиҷаҳои олимпиадаҳои гузашта дар қисми «Рейтинг» ҷойгир шудаанд. Иштирокчиён метавонанд ҷойгоҳи худро бинанд ва бо дигарон муқоиса кунанд.\n\nБарои дидани рейтинг ба менюи «Рейтинг» гузаред.",
        "coverImage": "",
        "author": "M.J.O.F",
        "featured": False,
        "published": True,
        "lang": "tg",
        "url": "/leaderboard",
        "tags": ["рейтинг"],
    },
]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _load_json(path: Path) -> Any:
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return []


def _save_json(path: Path, data: Any) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass


def _normalize(item: dict) -> dict:
    t = str(item.get("type") or "news").lower()
    if t == "book":
        t = "article"
    if t not in VALID_TYPES:
        t = "news"
    return {
        "id": item.get("id") or str(uuid.uuid4()),
        "type": t,
        "title": str(item.get("title") or "").strip(),
        "summary": str(item.get("summary") or item.get("description") or "").strip(),
        "body": str(item.get("body") or item.get("description") or "").strip(),
        "coverImage": str(item.get("coverImage") or item.get("image") or "").strip(),
        "author": str(item.get("author") or "M.J.O.F").strip()[:80],
        "featured": bool(item.get("featured")),
        "published": item.get("published", True) is not False,
        "lang": str(item.get("lang") or "tg").strip()[:5],
        "url": str(item.get("url") or "").strip(),
        "tags": item.get("tags") if isinstance(item.get("tags"), list) else [],
        "createdAt": item.get("createdAt") or _utc_now().isoformat(),
        "updatedAt": item.get("updatedAt") or item.get("createdAt") or _utc_now().isoformat(),
    }


def _items() -> list[dict]:
    data = _load_json(CONTENT_FILE)
    if not isinstance(data, list):
        data = []
    if not data:
        now = _utc_now().isoformat()
        data = []
        for b in DEFAULT_ITEMS:
            row = dict(b)
            row["id"] = str(uuid.uuid4())
            row["createdAt"] = now
            row["updatedAt"] = now
            data.append(_normalize(row))
        _save_json(CONTENT_FILE, data)
        return data
    return [_normalize(r) for r in data]


def list_content(
    kind: str | None = None,
    lang: str | None = None,
    published_only: bool = False,
    featured_only: bool = False,
) -> list[dict]:
    rows = _items()
    if published_only:
        rows = [r for r in rows if r.get("published")]
    if featured_only:
        rows = [r for r in rows if r.get("featured")]
    if kind:
        rows = [r for r in rows if r.get("type") == kind]
    if lang:
        rows = [r for r in rows if r.get("lang") == lang or not r.get("lang")]
    return sorted(rows, key=lambda x: x.get("createdAt") or "", reverse=True)


def get_content(item_id: str) -> dict | None:
    for r in _items():
        if r.get("id") == item_id:
            return r
    return None


def add_content(payload: dict) -> dict:
    title = str(payload.get("title") or "").strip()
    if len(title) < 2:
        raise ValueError("title_required")
    kind = str(payload.get("type") or "news").strip().lower()
    if kind not in VALID_TYPES:
        kind = "news"
    cover = str(payload.get("coverImage") or payload.get("image") or "").strip()
    if cover.startswith("data:") and len(cover) > 1_600_000:
        raise ValueError("image_too_large")
    now = _utc_now().isoformat()
    item = _normalize({
        "id": str(uuid.uuid4()),
        "type": kind,
        "title": title,
        "summary": str(payload.get("summary") or payload.get("description") or "").strip()[:500],
        "body": str(payload.get("body") or payload.get("description") or "").strip(),
        "coverImage": cover,
        "author": str(payload.get("author") or "M.J.O.F").strip()[:80],
        "featured": bool(payload.get("featured")),
        "published": payload.get("published", True) is not False,
        "lang": str(payload.get("lang") or "tg").strip()[:5],
        "url": str(payload.get("url") or "").strip(),
        "tags": payload.get("tags") if isinstance(payload.get("tags"), list) else [],
        "createdAt": now,
        "updatedAt": now,
    })
    rows = _items()
    rows.insert(0, item)
    _save_json(CONTENT_FILE, rows)
    return item


def update_content(item_id: str, payload: dict) -> dict | None:
    rows = _items()
    for i, r in enumerate(rows):
        if r.get("id") != item_id:
            continue
        if "title" in payload:
            t = str(payload.get("title") or "").strip()
            if len(t) >= 2:
                r["title"] = t
        if "type" in payload:
            k = str(payload.get("type") or "").strip().lower()
            if k in VALID_TYPES:
                r["type"] = k
        if "summary" in payload or "description" in payload:
            r["summary"] = str(payload.get("summary") or payload.get("description") or "").strip()[:500]
        if "body" in payload:
            r["body"] = str(payload.get("body") or "").strip()
        if "coverImage" in payload or "image" in payload:
            cover = str(payload.get("coverImage") or payload.get("image") or "").strip()
            if cover.startswith("data:") and len(cover) > 1_600_000:
                raise ValueError("image_too_large")
            r["coverImage"] = cover
        if "author" in payload:
            r["author"] = str(payload.get("author") or "M.J.O.F").strip()[:80]
        if "featured" in payload:
            r["featured"] = bool(payload.get("featured"))
        if "published" in payload:
            r["published"] = payload.get("published") is not False
        if "url" in payload:
            r["url"] = str(payload.get("url") or "").strip()
        if "lang" in payload:
            r["lang"] = str(payload.get("lang") or "tg").strip()[:5]
        if "tags" in payload and isinstance(payload.get("tags"), list):
            r["tags"] = payload["tags"]
        r["updatedAt"] = _utc_now().isoformat()
        rows[i] = _normalize(r)
        _save_json(CONTENT_FILE, rows)
        return rows[i]
    return None


def delete_content(item_id: str) -> bool:
    rows = _items()
    n = len(rows)
    rows = [r for r in rows if r.get("id") != item_id]
    if len(rows) == n:
        return False
    _save_json(CONTENT_FILE, rows)
    return True
