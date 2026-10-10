"""Diagnose the checkpoint database connection.   poetry run python -m scripts.check_db_connection

Reads SUPABASE_DB_URL (from the environment or from backend/.env), never prints the password,
and tells you exactly which step fails.
"""
import os
import sys

import psycopg

from app.graph.checkpointing import connection_hints, mask_secret


def _load_dotenv() -> None:
    path = os.path.join(os.getcwd(), ".env")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line.startswith("SUPABASE_DB_URL="):
                os.environ.setdefault("SUPABASE_DB_URL", line.split("=", 1)[1].strip().strip('"').strip("'"))


def main() -> int:
    _load_dotenv()
    url = os.getenv("SUPABASE_DB_URL")
    if not url:
        print("FAIL  SUPABASE_DB_URL is not set (environment or backend/.env).")
        return 1

    print("URL      :", mask_secret(url))
    hints = connection_hints(url)
    for h in hints:
        print("HINT     :", h)

    try:
        info = psycopg.conninfo.conninfo_to_dict(url)
        print(f"PARSED   : host={info.get('host')} port={info.get('port')} user={info.get('user')} "
              f"db={info.get('dbname')} sslmode={info.get('sslmode')}")
    except Exception as exc:
        print("FAIL  cannot parse URL:", exc)
        return 1

    try:
        with psycopg.connect(url, connect_timeout=8) as conn:
            print("OK       : connected")
            row = conn.execute("select current_user, current_setting('search_path')").fetchone()
            print(f"OK       : current_user={row[0]} search_path={row[1]}")
            tables = conn.execute(
                "select table_schema, table_name from information_schema.tables "
                "where table_name in ('checkpoints','checkpoint_blobs','checkpoint_writes','checkpoint_migrations') "
                "order by 1, 2"
            ).fetchall()
            if tables:
                print("OK       : tables found:", ", ".join(f"{s}.{t}" for s, t in tables))
                reg = conn.execute("select to_regclass('checkpoints')").fetchone()[0]
                print("OK       : 'checkpoints' resolves through search_path" if reg
                      else "FAIL     : tables exist but search_path does not include their schema")
            else:
                print("FAIL     : connected, but the checkpoint tables do not exist -> run checkpoints_full_setup.sql")
                return 1
    except Exception as exc:
        print("FAIL     :", type(exc).__name__)
        print("          ", " ".join(mask_secret(str(exc)).split())[:700])
        print("\nNext steps: see the hints above; check the project is not paused; "
              "check Dashboard > Database > Network restrictions; confirm the role/password from the SQL script.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
