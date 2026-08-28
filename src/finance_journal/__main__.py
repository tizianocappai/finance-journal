import argparse
import logging
import sys

from PyQt6.QtWidgets import QApplication

from finance_journal.logging_config import setup_logging
from finance_journal.ui.main_window import MainWindow

logger = logging.getLogger(__name__)


def _excepthook(exc_type, exc_value, exc_tb):
    logger.critical("Eccezione non gestita", exc_info=(exc_type, exc_value, exc_tb))
    sys.__excepthook__(exc_type, exc_value, exc_tb)


def main() -> None:
    parser = argparse.ArgumentParser(prog="finance-journal")
    parser.add_argument("--debug", action="store_true", help="Abilita log a livello DEBUG")
    args, qt_args = parser.parse_known_args()

    setup_logging(debug=args.debug)
    sys.excepthook = _excepthook

    logger.info("avvio applicazione (debug=%s)", args.debug)

    app = QApplication([sys.argv[0]] + qt_args)
    app.setStyle("Fusion")
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
