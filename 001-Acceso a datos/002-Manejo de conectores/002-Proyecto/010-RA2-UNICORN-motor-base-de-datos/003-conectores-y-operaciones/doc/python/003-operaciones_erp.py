"""Muestra operaciones ERP sin modificar la base de trabajo."""

import contextlib
import json
import shutil
import sys
import tempfile
from pathlib import Path


RAIZ = Path(__file__).resolve().parents[2]
ORIGEN = RAIZ / "datos" / "Erin-erp"


def exigir(correcto, mensaje):
    if not correcto:
        raise RuntimeError(mensaje)


def main():
    exigir(ORIGEN.is_dir(), "Falta datos/Erin-erp en la version 003")
    with tempfile.TemporaryDirectory(prefix="unicorn_erp_python_", dir=RAIZ) as temporal, contextlib.chdir(temporal):
        carpeta = Path(temporal)
        datos = carpeta / "datos"
        datos.mkdir()
        shutil.copytree(ORIGEN, datos / "Erin-erp")
        (carpeta / "config.json").write_text(
            json.dumps({"instalacion": "datos", "tamanoRegistro": 512}),
            encoding="utf-8",
        )
        sys.path.insert(0, str(RAIZ / "bin"))
        import unicornbbdd as bd

        exigir(Path(bd.__file__).resolve() == (RAIZ / "bin" / "unicornbbdd.pyd").resolve(),
               "Se ha cargado otro conector Python")
        exigir(bd.usar_base("Erin-erp"), "No se pudo abrir Erin-erp")

        clientes = bd.consultar("SELECCIONAR id,nombre,email DE clientes LIMITE 3")
        productos = bd.consultar("SELECCIONAR id,nombre,precio DE productos LIMITE 3")
        pedidos = bd.consultar(
            "SELECCIONAR clientes.nombre,pedidos.total "
            "DE clientes JOIN pedidos EN clientes.id = pedidos.cliente_id LIMITE 3"
        )
        print("Clientes:", clientes)
        print("Productos:", productos)
        print("Pedidos con su cliente:", pedidos)
        print("Resumen de pedidos:", bd.consultar(
            "SELECCIONAR CONTAR(*) COMO numero_pedidos,SUMA(total) COMO facturacion DE pedidos"
        ))

        cliente_id = bd.insertar("clientes", ["1", "Cliente Ejemplo Python", "ejemplo.python@clientes-ejemplo.test", "600000303"])
        print("Cliente creado:", bd.seleccionar("clientes", cliente_id))
        exigir(bd.actualizar_donde("clientes", {"telefono": "600111303"}, "id", str(cliente_id)) == 1,
               "No se pudo actualizar el telefono")
        print("Cliente actualizado:", bd.seleccionar("clientes", cliente_id))

        temporal_id = bd.insertar("clientes", ["1", "Cliente Temporal Python", "temporal.python@clientes-ejemplo.test", "600222303"])
        exigir(bd.eliminar_donde("clientes", "id", str(temporal_id)) == 1,
               "No se pudo dar de baja el cliente temporal")
        print("Cliente dado de baja:", bd.seleccionar("clientes", temporal_id))

        exigir(bd.iniciar_transaccion(), "No se pudo iniciar la transaccion")
        try:
            pedido_id = bd.insertar("pedidos", ["1", str(cliente_id), "2026-10-12", "pendiente", "49.90"])
            bd.insertar("pedidos_lineas", [str(pedido_id), "1", "1", "49.90"])
            exigir(bd.confirmar(), "No se pudo confirmar el pedido")
        except Exception:
            bd.deshacer()
            raise
        print("Pedido y linea confirmados:", bd.seleccionar("pedidos", pedido_id))

        exigir(bd.iniciar_transaccion(), "No se pudo iniciar la transaccion de ejemplo")
        bd.insertar("clientes", ["1", "Cliente Revertido Python", "revertido.python@clientes-ejemplo.test", "600333303"])
        exigir(bd.deshacer(), "No se pudo deshacer la transaccion")
        print("Cliente revertido:", bd.buscar("clientes", "email", "revertido.python@clientes-ejemplo.test"))

        nombre_procedimiento = "pedidos_de_cliente_demo_python"
        cuerpo = "SELECCIONAR id,total DE pedidos DONDE cliente_id = {cliente}"
        exigir(bd.crear_procedimiento(nombre_procedimiento, ["cliente"], cuerpo),
               "No se pudo crear el procedimiento")
        print("Procedimiento:", bd.ejecutar_procedimiento(nombre_procedimiento, [str(cliente_id)]))

        del clientes, productos, pedidos
        print("La copia temporal se elimina al terminar; la base original no cambia.")


if __name__ == "__main__":
    main()
