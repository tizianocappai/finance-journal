from dataclasses import dataclass


@dataclass
class MetodoPagamento:
    nome: str
    predefinito: bool = False
    id: int | None = None
