"""Consulta los datos ficticios del ERP con el conector Python de esta versión."""

import os
import sys
from pathlib import Path


RAIZ = Path(__file__).resolve().parents[2]
os.chdir(RAIZ)
sys.path.insert(0, str(RAIZ / "bin"))
import unicornbbdd as bd


if not bd.usar_base("Erin-erp"):
    raise RuntimeError("Primero ejecuta scripts/002-cargar_erp.py")

consulta = (
    "SELECCIONAR clientes.nombre,pedidos.total "
    "DE clientes JOIN pedidos EN clientes.id = pedidos.cliente_id "
    "ORDENAR POR pedidos.id LIMITE 5"
)
filas = bd.consultar(consulta)
print("Primeros pedidos con su cliente:")
for fila in filas:
    print(fila)
print("Productos:", len(bd.listar("productos")))
