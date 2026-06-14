"""
Run this once to add missing columns to an existing predictions table.
Safe to run multiple times — skips columns that already exist.

Usage:
    python migrate.py
"""
from database import engine
from sqlalchemy import text

MIGRATIONS = [
    {
        "check": "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='predictions' AND COLUMN_NAME='admin_approved'",
        "sql":   "ALTER TABLE predictions ADD COLUMN admin_approved TINYINT(1) NULL DEFAULT NULL",
        "label": "admin_approved",
    },
    {
        "check": "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='predictions' AND COLUMN_NAME='retrained'",
        "sql":   "ALTER TABLE predictions ADD COLUMN retrained TINYINT(1) NOT NULL DEFAULT 0",
        "label": "retrained",
    },
]

def run():
    with engine.connect() as conn:
        for m in MIGRATIONS:
            count = conn.execute(text(m["check"])).scalar()
            if count == 0:
                conn.execute(text(m["sql"]))
                conn.commit()
                print(f"✅ Added column: {m['label']}")
            else:
                print(f"⏭  Already exists: {m['label']}")
    print("Migration complete.")

if __name__ == "__main__":
    run()
