"""Public + admin content/news API routes."""
from __future__ import annotations

from flask import jsonify, request

from db import content_api


def _auth_admin(require_perm, require_admin, *perms):
    """Return admin if token valid. Prefer perm check, always allow any authenticated admin as fallback."""
    admin = None
    try:
        if require_perm and perms:
            admin = require_perm(*perms)
    except Exception:
        admin = None
    if not admin:
        try:
            admin = require_admin() if require_admin else None
        except Exception:
            admin = None
    return admin if admin else None


def register_content_routes(app, require_perm, require_admin):
    @app.get("/api/content")
    def public_content():
        try:
            kind = request.args.get("type") or None
            lang = request.args.get("lang") or None
            featured = request.args.get("featured") in ("1", "true", "yes")
            items = content_api.list_content(
                kind=kind,
                lang=lang,
                published_only=True,
                featured_only=featured,
            )
            return jsonify({"items": items, "count": len(items)})
        except Exception as e:
            return jsonify({"items": [], "count": 0, "error": str(e)}), 200

    @app.get("/api/content/<item_id>")
    def public_content_one(item_id: str):
        try:
            item = content_api.get_content(item_id)
            if not item or not item.get("published"):
                return jsonify({"error": "Ёфт нашуд."}), 404
            return jsonify({"item": item})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.get("/api/admin/content")
    def admin_list_content():
        admin = _auth_admin(require_perm, require_admin, "content.write", "content.read", "monitor.read", "students.read")
        if not admin:
            return jsonify({"error": "Дастрасӣ рад шуд."}), 401
        try:
            items = content_api.list_content()
            return jsonify({"items": items, "count": len(items)})
        except Exception as e:
            return jsonify({"items": [], "count": 0, "error": str(e)}), 200

    @app.post("/api/admin/content")
    def admin_add_content():
        admin = _auth_admin(require_perm, require_admin, "content.write", "admins.write")
        if not admin:
            return jsonify({"error": "Дастрасӣ рад шуд. Аввал дубора ворид шавед."}), 401
        payload = request.get_json(silent=True) or {}
        try:
            item = content_api.add_content(payload)
        except ValueError as e:
            msg = str(e)
            if msg == "title_required":
                return jsonify({"error": "Унвон лозим аст."}), 400
            if msg == "image_too_large":
                return jsonify({"error": "Акс хеле калон аст (макс. ~1 МБ)."}), 400
            return jsonify({"error": msg}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        return jsonify({"item": item}), 201

    @app.put("/api/admin/content/<item_id>")
    def admin_update_content(item_id: str):
        admin = _auth_admin(require_perm, require_admin, "content.write", "admins.write")
        if not admin:
            return jsonify({"error": "Дастрасӣ рад шуд. Аввал дубора ворид шавед."}), 401
        payload = request.get_json(silent=True) or {}
        try:
            item = content_api.update_content(item_id, payload)
        except ValueError as e:
            if str(e) == "image_too_large":
                return jsonify({"error": "Акс хеле калон аст (макс. ~1 МБ)."}), 400
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        if not item:
            return jsonify({"error": "Ёфт нашуд."}), 404
        return jsonify({"item": item})

    @app.delete("/api/admin/content/<item_id>")
    def admin_del_content(item_id: str):
        admin = _auth_admin(require_perm, require_admin, "content.write", "admins.write")
        if not admin:
            return jsonify({"error": "Дастрасӣ рад шуд."}), 401
        try:
            if not content_api.delete_content(item_id):
                return jsonify({"error": "Ёфт нашуд."}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        return jsonify({"ok": True})
