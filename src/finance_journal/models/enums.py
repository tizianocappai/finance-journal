from enum import StrEnum


class TipoMovimento(StrEnum):
    ENTRATA = "entrata"
    USCITA = "uscita"


class SezioneMovimento(StrEnum):
    PERSONALE = "personale"
    CASA = "casa"
