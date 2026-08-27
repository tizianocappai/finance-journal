from dataclasses import dataclass


@dataclass
class Categoria:
    nome: str
    predefinita: bool = False
    id: int | None = None
