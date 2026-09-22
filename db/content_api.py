"""M.J.O.F content store — news/articles. PostgreSQL (Neon) preferred, JSON fallback."""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text

log = logging.getLogger("mjof.content")

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
        "body": (
            "Хуш омадед ба платформаи M.J.O.F — Маҷмӯаи Олимпиадаҳои Фаннӣ.\n\n"
            "Дар ин ҷо шумо метавонед дар олимпиадаҳои фаннии гуногун "
            "(математика, физика, химия, забони тоҷикӣ, русӣ, англисӣ ва ғайра) иштирок намоед.\n\n"
            "Барои иштирок ID-и худро аз маъмури мактаб гиред ва аз саҳифаи «Олимпиадаҳо» ворид шавед."
        ),
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
        "body": (
            "Натиҷаҳои олимпиадаҳои гузашта дар қисми «Рейтинг» ҷойгир шудаанд. "
            "Иштирокчиён метавонанд ҷойгоҳи худро бинанд ва бо дигарон муқоиса кунанд.\n\n"
            "Барои дидани рейтинг ба менюи «Рейтинг» гузаред."
        ),
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


def use_pg() -> bool:
    try:
        from db.connection import is_postgres_enabled
        return bool(is_postgres_enabled())
    except Exception:
        return False


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
    except Exception as e:
        log.warning("content json save failed: %s", e)


def _normalize(row: dict) -> dict:
    return {
        "id": str(row.get("id") or ""),
        "type": str(row.get("type") or "news").lower(),
        "title": str(row.get("title") or "").strip(),
        "summary": str(row.get("summary") or "").strip(),
        "body": str(row.get("body") or "").strip(),
        "coverImage": str(row.get("coverImage") or row.get("cover_image") or "").strip(),
        "author": str(row.get("author") or "M.J.O.F").strip(),
        "featured": bool(row.get("featured")),
        "published": row.get("published") is not False,
        "lang": str(row.get("lang") or "tg").strip()[:5],
        "url": str(row.get("url") or "").strip(),
        "tags": row.get("tags") if isinstance(row.get("tags"), list) else [],
        "createdAt": row.get("createdAt") or row.get("created_at") or "",
        "updatedAt": row.get("updatedAt") or row.get("updated_at") or "",
    }


def _row_pg(r) -> dict:
    tags = r.get("tags")
    if isinstance(tags, str):
        try:
            tags = json.loads(tags)
        except Exception:
            tags = []
    if not isinstance(tags, list):
        tags = []
    created = r.get("created_at")
    updated = r.get("updated_at")
    return _normalize({
        "id": r.get("id"),
        "type": r.get("type"),
        "title": r.get("title"),
        "summary": r.get("summary"),
        "body": r.get("body"),
        "cover_image": r.get("cover_image") or "",
        "author": r.get("author"),
        "featured": r.get("featured"),
        "published": r.get("published"),
        "lang": r.get("lang"),
        "url": r.get("url"),
        "tags": tags,
        "created_at": created.isoformat() if hasattr(created, "isoformat") else (created or ""),
        "updated_at": updated.isoformat() if hasattr(updated, "isoformat") else (updated or ""),
    })


def _ensure_pg_table() -> None:
    if not use_pg():
        return
    try:
        from db.connection import get_session
        with get_session() as s:
            s.execute(text("""
                CREATE TABLE IF NOT EXISTS content_items (
                  id UUID PRIMARY KEY,
                  type TEXT NOT NULL DEFAULT 'news',
                  title TEXT NOT NULL,
                  summary TEXT NOT NULL DEFAULT '',
                  body TEXT NOT NULL DEFAULT '',
                  cover_image TEXT NOT NULL DEFAULT '',
                  author TEXT NOT NULL DEFAULT 'M.J.O.F',
                  featured BOOLEAN NOT NULL DEFAULT false,
                  published BOOLEAN NOT NULL DEFAULT true,
                  lang TEXT NOT NULL DEFAULT 'tg',
                  url TEXT NOT NULL DEFAULT '',
                  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
            """))
            s.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_content_items_published "
                "ON content_items (published, featured DESC, created_at DESC)"
            ))
    except Exception as e:
        log.warning("ensure content_items table: %s", e)


def _seed_pg_if_empty() -> None:
    if not use_pg():
        return
    try:
        from db.connection import get_session
        with get_session() as s:
            n = s.execute(text("SELECT COUNT(*) FROM content_items")).scalar() or 0
            if n > 0:
                return
            for raw in DEFAULT_ITEMS:
                item = _normalize({
                    **raw,
                    "id": str(uuid.uuid4()),
                    "createdAt": _utc_now().isoformat(),
                    "updatedAt": _utc_now().isoformat(),
                })
                s.execute(text("""
                    INSERT INTO content_items
                    (id, type, title, summary, body, cover_image, author, featured, published, lang, url, tags)
                    VALUES
                    (CAST(:id AS uuid), :type, :title, :summary, :body, :cover, :author,
                     :featured, :published, :lang, :url, CAST(:tags AS jsonb))
                """), {
                    "id": item["id"],
                    "type": item["type"],
                    "title": item["title"],
                    "summary": item["summary"],
                    "body": item["body"],
                    "cover": item["coverImage"],
                    "author": item["author"],
                    "featured": item["featured"],
                    "published": item["published"],
                    "lang": item["lang"],
                    "url": item["url"],
                    "tags": json.dumps(item["tags"], ensure_ascii=False),
                })
            log.info("seeded content_items defaults")
    except Exception as e:
        log.warning("seed content: %s", e)


_pg_ready = False


def _pg_boot() -> bool:
    global _pg_ready
    if not use_pg():
        return False
    if not _pg_ready:
        _ensure_pg_table()
        _seed_pg_if_empty()
        _pg_ready = True
    return True


def _items_json() -> list[dict]:
    data = _load_json(CONTENT_FILE)
    if not isinstance(data, list) or not data:
        now = _utc_now().isoformat()
        seeded = []
        for raw in DEFAULT_ITEMS:
            seeded.append(_normalize({
                **raw,
                "id": str(uuid.uuid4()),
                "createdAt": now,
                "updatedAt": now,
            }))
        _save_json(CONTENT_FILE, seeded)
        return seeded
    return [_normalize(r) for r in data if isinstance(r, dict)]


def list_content(
    kind: str | None = None,
    lang: str | None = None,
    published_only: bool = False,
    featured_only: bool = False,
) -> list[dict]:
    if _pg_boot():
        try:
            from db.connection import get_session
            clauses = []
            params: dict[str, Any] = {}
            if published_only:
                clauses.append("published = true")
            if featured_only:
                clauses.append("featured = true")
            if kind:
                clauses.append("type = :kind")
                params["kind"] = kind
            if lang:
                clauses.append("lang = :lang")
                params["lang"] = lang
            where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
            sql = f"""
                SELECT id::text, type, title, summary, body, cover_image, author,
                       featured, published, lang, url, tags, created_at, updated_at
                FROM content_items
                {where}
                ORDER BY featured DESC, created_at DESC
            """
            with get_session() as s:
                rows = s.execute(text(sql), params).mappings().all()
                return [_row_pg(dict(r)) for r in rows]
        except Exception as e:
            log.exception("list_content pg: %s", e)

    items = _items_json()
    out = []
    for it in items:
        if published_only and not it.get("published"):
            continue
        if featured_only and not it.get("featured"):
            continue
        if kind and it.get("type") != kind:
            continue
        if lang and it.get("lang") != lang:
            continue
        out.append(it)
    featured = [i for i in out if i.get("featured")]
    rest = [i for i in out if not i.get("featured")]
    featured.sort(key=lambda x: str(x.get("createdAt") or ""), reverse=True)
    rest.sort(key=lambda x: str(x.get("createdAt") or ""), reverse=True)
    return featured + rest


def get_content(item_id: str) -> dict | None:
    item_id = str(item_id or "").strip()
    if not item_id:
        return None
    if _pg_boot():
        try:
            from db.connection import get_session
            with get_session() as s:
                r = s.execute(text("""
                    SELECT id::text, type, title, summary, body, cover_image, author,
                           featured, published, lang, url, tags, created_at, updated_at
                    FROM content_items WHERE id = CAST(:id AS uuid)
                """), {"id": item_id}).mappings().first()
                return _row_pg(dict(r)) if r else None
        except Exception as e:
            log.exception("get_content pg: %s", e)
    for it in _items_json():
        if it.get("id") == item_id:
            return it
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
    now = _utc_now()
    item_id = str(uuid.uuid4())
    item = _normalize({
        "id": item_id,
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
        "createdAt": now.isoformat(),
        "updatedAt": now.isoformat(),
    })

    if _pg_boot():
        try:
            from db.connection import get_session
            with get_session() as s:
                s.execute(text("""
                    INSERT INTO content_items
                    (id, type, title, summary, body, cover_image, author, featured, published, lang, url, tags, created_at, updated_at)
                    VALUES
                    (CAST(:id AS uuid), :type, :title, :summary, :body, :cover, :author,
                     :featured, :published, :lang, :url, CAST(:tags AS jsonb), :created, :updated)
                """), {
                    "id": item["id"],
                    "type": item["type"],
                    "title": item["title"],
                    "summary": item["summary"],
                    "body": item["body"],
                    "cover": item["coverImage"],
                    "author": item["author"],
                    "featured": item["featured"],
                    "published": item["published"],
                    "lang": item["lang"],
                    "url": item["url"],
                    "tags": json.dumps(item["tags"], ensure_ascii=False),
                    "created": now,
                    "updated": now,
                })
            return item
        except Exception as e:
            log.exception("add_content pg: %s", e)
            raise

    rows = _items_json()
    rows.insert(0, item)
    _save_json(CONTENT_FILE, rows)
    return item


def update_content(item_id: str, payload: dict) -> dict | None:
    item_id = str(item_id or "").strip()
    if not item_id:
        return None

    if _pg_boot():
        try:
            from db.connection import get_session
            with get_session() as s:
                cur = s.execute(text(
                    "SELECT id::text FROM content_items WHERE id = CAST(:id AS uuid)"
                ), {"id": item_id}).first()
                if not cur:
                    return None
                fields = []
                params: dict[str, Any] = {"id": item_id}
                if "title" in payload:
                    t = str(payload.get("title") or "").strip()
                    if len(t) < 2:
                        raise ValueError("title_required")
                    fields.append("title = :title")
                    params["title"] = t
                if "type" in payload:
                    k = str(payload.get("type") or "").strip().lower()
                    if k in VALID_TYPES:
                        fields.append("type = :type")
                        params["type"] = k
                if "summary" in payload or "description" in payload:
                    fields.append("summary = :summary")
                    params["summary"] = str(payload.get("summary") or payload.get("description") or "").strip()[:500]
                if "body" in payload:
                    fields.append("body = :body")
                    params["body"] = str(payload.get("body") or "").strip()
                if "coverImage" in payload or "image" in payload:
                    cover = str(payload.get("coverImage") or payload.get("image") or "").strip()
                    if cover.startswith("data:") and len(cover) > 1_600_000:
                        raise ValueError("image_too_large")
                    fields.append("cover_image = :cover")
                    params["cover"] = cover
                if "author" in payload:
                    fields.append("author = :author")
                    params["author"] = str(payload.get("author") or "M.J.O.F").strip()[:80]
                if "featured" in payload:
                    fields.append("featured = :featured")
                    params["featured"] = bool(payload.get("featured"))
                if "published" in payload:
                    fields.append("published = :published")
                    params["published"] = payload.get("published") is not False
                if "url" in payload:
                    fields.append("url = :url")
                    params["url"] = str(payload.get("url") or "").strip()
                if "lang" in payload:
                    fields.append("lang = :lang")
                    params["lang"] = str(payload.get("lang") or "tg").strip()[:5]
                if "tags" in payload and isinstance(payload.get("tags"), list):
                    fields.append("tags = CAST(:tags AS jsonb)")
                    params["tags"] = json.dumps(payload["tags"], ensure_ascii=False)
                fields.append("updated_at = now()")
                if fields:
                    s.execute(text(
                        f"UPDATE content_items SET {', '.join(fields)} WHERE id = CAST(:id AS uuid)"
                    ), params)
                r = s.execute(text("""
                    SELECT id::text, type, title, summary, body, cover_image, author,
                           featured, published, lang, url, tags, created_at, updated_at
                    FROM content_items WHERE id = CAST(:id AS uuid)
                """), {"id": item_id}).mappings().first()
                return _row_pg(dict(r)) if r else None
        except ValueError:
            raise
        except Exception as e:
            log.exception("update_content pg: %s", e)
            raise

    rows = _items_json()
    for i, r in enumerate(rows):
        if r.get("id") != item_id:
            continue
        if "title" in payload:
            t = str(payload.get("title") or "").strip()
            if len(t) < 2:
                raise ValueError("title_required")
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
    item_id = str(item_id or "").strip()
    if not item_id:
        return False
    if _pg_boot():
        try:
            from db.connection import get_session
            with get_session() as s:
                res = s.execute(text(
                    "DELETE FROM content_items WHERE id = CAST(:id AS uuid) RETURNING id"
                ), {"id": item_id})
                return res.first() is not None
        except Exception as e:
            log.exception("delete_content pg: %s", e)
            return False
    rows = _items_json()
    n = len(rows)
    rows = [r for r in rows if r.get("id") != item_id]
    if len(rows) == n:
        return False
    _save_json(CONTENT_FILE, rows)
    return True
