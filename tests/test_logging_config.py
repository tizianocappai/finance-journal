import logging

import pytest

from finance_journal.logging_config import setup_logging

_LOGGER_NAME = "finance_journal"


@pytest.fixture(autouse=True)
def _restore_logger():
    logger = logging.getLogger(_LOGGER_NAME)
    original_handlers = logger.handlers[:]
    original_level = logger.level
    original_propagate = logger.propagate
    yield
    logger.handlers = original_handlers
    logger.level = original_level
    logger.propagate = original_propagate


def test_default_level_is_info(tmp_path):
    setup_logging(debug=False, _log_dir=tmp_path)
    assert logging.getLogger(_LOGGER_NAME).level == logging.INFO


def test_debug_flag_sets_debug_level(tmp_path):
    setup_logging(debug=True, _log_dir=tmp_path)
    assert logging.getLogger(_LOGGER_NAME).level == logging.DEBUG


def test_calling_twice_does_not_duplicate_handlers(tmp_path):
    setup_logging(debug=False, _log_dir=tmp_path)
    setup_logging(debug=False, _log_dir=tmp_path)
    assert len(logging.getLogger(_LOGGER_NAME).handlers) == 2
