from dataclasses import dataclass
from datetime import date, datetime

from .enums import TipoMovimento, SezioneMovimento


@dataclass
class Movimento:
    data: date
    tipo: TipoMovimento
    importo: float  # always positive
    categoria_id: int
    metodo_id: int
    sezione: SezioneMovimento
    nota: str = ""
    id: int | None = None
    created_at: datetime | None = None
