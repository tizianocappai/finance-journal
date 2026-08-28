import logging
import sqlite3
from pathlib import Path

from platformdirs import user_data_dir

from .schema import create_tables, seed_defaults

logger = logging.getLogger(__name__)


def get_db_path() -> Path:
    data_dir = Path(user_data_dir("finance-journal"))
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "finance.db"


def create_connection(path: str | Path | None = None) -> sqlite3.Connection:
    if path is None:
        path = get_db_path()
    logger.info("apertura database: %s", path)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    create_tables(conn)
    seed_defaults(conn)
    return conn
