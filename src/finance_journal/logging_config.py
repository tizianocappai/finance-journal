import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

from platformdirs import user_log_dir

_LOGGER_NAME = "finance_journal"
_FORMAT = "%(asctime)s [%(levelname)s] %(name)s — %(message)s"
_DATE_FMT = "%Y-%m-%d %H:%M:%S"


def setup_logging(debug: bool = False, _log_dir: Path | None = None) -> None:
    level = logging.DEBUG if debug else logging.INFO

    logger = logging.getLogger(_LOGGER_NAME)
    if logger.handlers:
        return

    log_dir = _log_dir or Path(user_log_dir("ZeroBudget"))
    log_dir.mkdir(parents=True, exist_ok=True)

    formatter = logging.Formatter(_FORMAT, datefmt=_DATE_FMT)

    file_handler = RotatingFileHandler(
        log_dir / "finance_journal.log",
        maxBytes=1_000_000,
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)

    logger.setLevel(level)
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    logger.propagate = False
