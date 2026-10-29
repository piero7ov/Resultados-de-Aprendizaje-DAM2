"""Ejemplo aislado del módulo nativo de Python."""

import json
import os
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "bin"))

# La configuración va en la raíz del repositorio, cuya ruta no tiene acentos.
# El motor C++ de Windows no interpreta bien rutas UTF-8 con acentos.
with TemporaryDirectory(prefix="unicorn_python_", dir=RAIZ.parents[3]) as carpeta:
    ruta = Path(carpeta)
    configuracion = ruta / "config.json"
    configuracion.write_text(
        json.dumps({"instalacion": (ruta / "datos").as_posix(), "tamanoRegistro": 512}),
        encoding="utf-8",
    )
    os.environ["UNICORN_CONFIG"] = str(configuracion)
    directorio_anterior = Path.cwd()
    os.chdir(ruta)
    try:
        import unicornbbdd as bd

        bd.crear_base("tienda")
        bd.usar_base("tienda")
        bd.crear_tabla("productos", "nombre,precio")
        bd.insertar("productos", ["Teclado", "25"])
        bd.insertar("productos", ["Monitor", "180"])
        bd.crear_procedimiento(
            "productos_caros",
            ["precio_minimo"],
            "SELECCIONAR nombre,precio DE productos DONDE precio > {precio_minimo}",
        )

        print("Consulta:", bd.consultar("SELECCIONAR * DE productos"))
        print("Procedimiento:", bd.ejecutar_procedimiento("productos_caros", ["30"]))
    finally:
        os.chdir(directorio_anterior)
