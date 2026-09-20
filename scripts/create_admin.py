#!/usr/bin/env python3
"""Bootstrap / reset super_admin for M.J.O.F.

Hash algorithm MUST match server_core.hash_password:
  pbkdf2_hmac(sha256, password, bytes.fromhex(salt), 120000).hex()

Usage:
  export DATABASE_URL=postgresql://...
  python scripts/create_admin.py
  python scripts/create_admin.py --login admin --password 'YourStrongPass!'
"""
from __future__ import annotations

import argparse
import hashlib
import os
import secrets
import sys
import uuid


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        120_000,
    ).hex()
    return salt, password_hash


def main() -> int:
    parser = argparse.ArgumentParser(description="Create or reset M.J.O.F super_admin")
    parser.add_argument("--login", default="admin")
    parser.add_argument("--password", default="AdminMJOF2026!")
    parser.add_argument("--name", default="Super Admin")
    args = parser.parse_args()

    url = (os.environ.get("DATABASE_URL") or "").strip()
    if not url:
        print("DATABASE_URL is not set", file=sys.stderr)
        return 2
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    try:
        from sqlalchemy import create_engine, text
    except ImportError:
        print("Install sqlalchemy + psycopg2-binary first", file=sys.stderr)
        return 2

    salt, ph = hash_password(args.password)
    aid = str(uuid.uuid4())

    sql = """
    INSERT INTO admins (id, login, name, salt, password_hash, role, status, created_by)
    VALUES (:id, :login, :name, :salt, :ph, 'super_admin', 'active', 'bootstrap')
    ON CONFLICT (login) DO UPDATE SET
      salt = EXCLUDED.salt,
      password_hash = EXCLUDED.password_hash,
      role = 'super_admin',
      status = 'active',
      name = EXCLUDED.name
    """

    eng = create_engine(url, pool_pre_ping=True)
    with eng.begin() as conn:
        conn.execute(
            text(sql),
            {
                "id": aid,
                "login": args.login,
                "name": args.name,
                "salt": salt,
                "ph": ph,
            },
        )

    print("OK")
    print("login =", args.login)
    print("password =", args.password)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
