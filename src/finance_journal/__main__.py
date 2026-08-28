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


def _load_tema_salvato() -> str:
    try:
        from finance_journal.db.connection import create_connection
        from finance_journal.repositories.impostazioni import ImpostazioniRepository

        conn = create_connection()
        tema = ImpostazioniRepository(conn).get("tema", "sistema") or "sistema"
        conn.close()
        return tema
    except Exception:
        return "sistema"


def main() -> None:
    parser = argparse.ArgumentParser(prog="finance-journal")
    parser.add_argument("--debug", action="store_true", help="Abilita log a livello DEBUG")
    args, qt_args = parser.parse_known_args()

    setup_logging(debug=args.debug)
    sys.excepthook = _excepthook

    logger.info("avvio applicazione (debug=%s)", args.debug)

    app = QApplication([sys.argv[0]] + qt_args)
    app.setStyle("Fusion")

    from finance_journal.ui import theme as th

    tema = _load_tema_salvato()
    th.set_tema(tema)
    app.setStyleSheet(th.get_stylesheet(tema))

    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
