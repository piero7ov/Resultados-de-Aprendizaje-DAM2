"""Ejemplo aislado de índices, EXPLICAR, tipos, NULL, JOIN y transacciones."""

import json
import os
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

raiz = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(raiz / "bin"))

with TemporaryDirectory(prefix="pierodev_007_", dir=raiz.parents[3]) as carpeta:
    ruta = Path(carpeta)
    configuracion = ruta / "config.json"
    configuracion.write_text(
        json.dumps({"instalacion": (ruta / "datos").as_posix(), "tamanoRegistro": 512}),
        encoding="utf-8",
    )
    os.environ["PIERODEV_CONFIG"] = str(configuracion)
    anterior = Path.cwd()
    os.chdir(ruta)
    try:
        import pierodevbbdd as bd

        bd.crear_base("comercio")
        bd.usar_base("comercio")
        bd.crear_tabla_tipada("clientes", {"nombre": "TEXTO", "email": "TEXTO", "nacimiento": "FECHA", "saldo": "DECIMAL"})
        bd.crear_tabla_tipada("pedidos", {"id_cliente": "ENTERO", "total": "DECIMAL"})
        bd.insertar("clientes", ["Ana", "ana@correo.com", "2026-01-10", "100.25"])
        bd.insertar("clientes", ["Luis", "luis@correo.com", None, "50.50"])
        bd.insertar("pedidos", ["1", "120.00"])
        bd.insertar("pedidos", ["999", "20.00"])

        consulta_email = "SELECCIONAR * DE clientes DONDE email = 'ana@correo.com'"
        print("Sin índice:", bd.explicar(consulta_email))
        bd.crear_indice("idx_email", "clientes", "email")
        print("Índices:", bd.indices("clientes"))
        print(bd.explicar(consulta_email))
        print("Consulta por índice:", bd.consultar(consulta_email))
        print("Fecha y NULL:", bd.consultar("SELECCIONAR nombre,nacimiento,saldo DE clientes"))
        for tipo in ("LEFT", "RIGHT", "FULL", "CROSS"):
            consulta = f"SELECCIONAR c.nombre,p.total DE clientes c {tipo} JOIN pedidos p"
            if tipo != "CROSS":
                consulta += " EN c.id = p.id_cliente"
            print(f"{tipo} JOIN:", bd.consultar(consulta))

        bd.iniciar_transaccion()
        bd.insertar("clientes", ["Temporal", "temp@correo.com", None, "1.00"])
        bd.deshacer()
        print("Tras DESHACER:", bd.consultar("SELECCIONAR nombre DE clientes"))
        bd.iniciar_transaccion()
        bd.insertar("clientes", ["Confirmado", "ok@correo.com", None, "1.00"])
        bd.confirmar()
        print("Tras CONFIRMAR:", bd.consultar("SELECCIONAR nombre DE clientes"))
        print("Eliminar índice:", bd.eliminar_indice("idx_email", "clientes"))
    finally:
        os.chdir(anterior)
