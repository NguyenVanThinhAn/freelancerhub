#!/usr/bin/env python3
"""
scripts/migrate_to_mysql.py
Migrate SQLite -> MySQL. Chay lan dau de chuyen du lieu sang MySQL.

Usage:
    MYSQL_PASSWORD=123456 python scripts/migrate_to_mysql.py
    # hoac dat trong dev-stack.env roi chay:
    python scripts/migrate_to_mysql.py
"""
import os, sys

SQLITE_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "freelancerhub.db")
MYSQL_CREDS = {
    "host":     os.environ.get("MYSQL_HOST",     "localhost"),
    "port":     int(os.environ.get("MYSQL_PORT", "3306")),
    "user":     os.environ.get("MYSQL_USER",     "root"),
    "password": os.environ.get("MYSQL_PASSWORD", ""),
    "database": os.environ.get("MYSQL_DATABASE", "freelancerhub"),
}

import sqlite3, pymysql, warnings
warnings.filterwarnings("ignore")

def log(msg): print(f"[migrate] {msg}")
def get_col(cur, name): return [r[name] for r in cur][0] if r else None

def connect_mysql():
    return pymysql.connect(
        host=MYSQL_CREDS["host"],
        port=MYSQL_CREDS["port"],
        user=MYSQL_CREDS["user"],
        password=MYSQL_CREDS["password"],
        database=MYSQL_CREDS["database"],
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )

def connect_sqlite():
    return sqlite3.connect(SQLITE_PATH)

def sqlite_col(cur, name, rows):
    return [r[name] for r in rows]

# ---------- DDL translation SQLite -> MySQL ----------
REPLACEMENTS = [
    ("AUTOINCREMENT",          "AUTO_INCREMENT"),
    ("PRIMARY KEY AUTOINCREMENT", "PRIMARY KEY AUTO_INCREMENT"),
    ("BOOLEAN",                "TINYINT(1)"),
    ("UUID",                   "VARCHAR(36)"),
    ("BLOB",                   "LONGBLOB"),
    ("DEFAULT 't'",            "DEFAULT 1"),
    ("DEFAULT 'f'",            "DEFAULT 0"),
    ("SERIAL",                 "INT AUTO_INCREMENT"),
    ("RETURNING",              ""),
    ("::text",                 ""),
    ("::boolean",              ""),
    ("::integer",              ""),
    ("::uuid",                 ""),
]

def translate_ddl(ddl):
    import re
    for old, new in REPLACEMENTS:
        ddl = ddl.replace(old, new)
    # Fix: VARCHAR without length -> VARCHAR(255)
    ddl = re.sub(r'\bVARCHAR\s+NOT\s+NULL\b', 'VARCHAR(255) NOT NULL', ddl)
    ddl = re.sub(r'\bVARCHAR\s+\)', 'VARCHAR(255))', ddl)
    return ddl

# ---------- MySQL operations ----------
def reset_mysql(mysql_conn):
    """Disable FK checks va drop tat ca bang (neu co)."""
    mc = mysql_conn.cursor()
    mc.execute("SET FOREIGN_KEY_CHECKS = 0")
    mc.execute("SHOW TABLES")
    tables = [r[list(r.keys())[0]] for r in mc.fetchall()]
    if tables:
        log(f"Drop {len(tables)} bang cu tren MySQL...")
        for t in reversed(tables):
            mc.execute(f"DROP TABLE IF EXISTS `{t}`")
    mc.execute("SET FOREIGN_KEY_CHECKS = 1")
    mysql_conn.commit()
    mc.close()

def create_tables(mysql_conn, sqlite_conn):
    """Doc DDL tu SQLite, dich sang MySQL, tao bang."""
    log("Tao cau truc bang tren MySQL...")
    mc = mysql_conn.cursor()
    sc = sqlite_conn.cursor()

    # Tat FK check truoc khi tao bang (SQLite khong enforce FK)
    mc.execute("SET FOREIGN_KEY_CHECKS = 0")

    sc.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL ORDER BY name")
    rows = sc.fetchall()

    for row in rows:
        name = row[0]
        ddl = translate_ddl(row[1])

        try:
            mc.execute(ddl)
            log(f"  + {name}")
        except Exception as e:
            log(f"  ! {name}: {e}")

    mc.execute("SET FOREIGN_KEY_CHECKS = 1")
    mysql_conn.commit()
    mc.close()
    log("Tao cau truc xong.")

def migrate_data(mysql_conn, sqlite_conn):
    """Migrate tat ca du lieu tu SQLite -> MySQL."""
    mc = mysql_conn.cursor()
    sc = sqlite_conn.cursor()

    sc.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [r[0] for r in sc.fetchall()]

    log("Migrate du lieu...")
    for table in tables:
        if table.startswith("sqlite_"):
            continue
        try:
            sc.execute(f"SELECT * FROM `{table}`")
            cols = [d[0] for d in sc.description]
            placeholders = ", ".join(["%s"] * len(cols))
            col_list = ", ".join(f"`{c}`" for c in cols)
            insert_sql = f"INSERT INTO `{table}` ({col_list}) VALUES ({placeholders})"

            total = 0
            while True:
                batch = sc.fetchmany(500)
                if not batch:
                    break
                # Convert SQLite types -> MySQL-safe
                clean_batch = []
                for row in batch:
                    clean = []
                    for val in row:
                        if isinstance(val, bool):
                            clean.append(int(val))
                        elif isinstance(val, (list, dict)):
                            import json
                            clean.append(json.dumps(val))
                        elif isinstance(val, float) and (val != val):  # NaN
                            clean.append(None)
                        else:
                            clean.append(val)
                    clean_batch.append(tuple(clean))

                try:
                    mc.executemany(insert_sql, clean_batch)
                    total += len(batch)
                except Exception as e:
                    # Fallback: row-by-row
                    for row in clean_batch:
                        try:
                            mc.execute(insert_sql, row)
                            total += 1
                        except Exception as e2:
                            pass  # skip duplicate/null FK rows silently

            mysql_conn.commit()
            log(f"  {table}: {total} rows")
        except Exception as e:
            log(f"  ERROR {table}: {e}")

    mc.close()

def verify(mysql_conn):
    """Kiem tra so ban ghi."""
    mc = mysql_conn.cursor()
    mc.execute("SELECT COUNT(*) as cnt FROM users")
    user_count = mc.fetchone()["cnt"]
    mc.execute("SELECT COUNT(*) as cnt FROM wallets")
    wallet_count = mc.fetchone()["cnt"]
    log(f"Kiem tra: {user_count} users, {wallet_count} wallets")
    mc.close()

def main():
    log("Bat dau migrate SQLite -> MySQL")
    log(f"  SQLite: {SQLITE_PATH}")
    log(f"  MySQL:  {MYSQL_CREDS['host']}:{MYSQL_CREDS['port']}/{MYSQL_CREDS['database']}")

    if not os.path.exists(SQLITE_PATH):
        log(f"Loi: Khong thay {SQLITE_PATH}")
        sys.exit(1)

    sqlite_conn = connect_sqlite()
    try:
        mysql_conn = connect_mysql()
        try:
            reset_mysql(mysql_conn)
            create_tables(mysql_conn, sqlite_conn)
            migrate_data(mysql_conn, sqlite_conn)
            verify(mysql_conn)
        finally:
            mysql_conn.close()
    finally:
        sqlite_conn.close()

    log("Migrate hoan tat!")

if __name__ == "__main__":
    main()
