from dataclasses import dataclass


@dataclass
class Dettaglio:
    nome: str
    categoria_id: int
    predefinita: bool = False
    id: int | None = None
