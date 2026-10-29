"""Prueba DML en el conector Python y en la consola usando datos temporales."""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


carpeta_proyecto = Path(__file__).parent
sys.path.insert(0, str(carpeta_proyecto))
import pierodevbbdd as base


def configurar(raiz):
    ruta = raiz / "config.json"
    ruta.write_text(
        json.dumps({"instalacion": str(raiz / "datos"), "tamanoRegistro": 512}),
        encoding="utf-8",
    )
    return ruta


directorio_anterior = Path.cwd()
with tempfile.TemporaryDirectory(prefix="pierodev-dml-python-") as carpeta:
    raiz = Path(carpeta)
    configurar(raiz)
    try:
        os.chdir(raiz)
        assert base.crear_base("prueba")
        assert base.usar_base("prueba")
        assert base.crear_tabla("clientes", "nombre,correo,edad")
        ana = base.insertar("clientes", ["Ana", "ana@ejemplo.invalid", "30"])
        luis = base.insertar_columnas("clientes", ["nombre", "edad"], ["Luis", "25"])
        assert base.seleccionar("clientes", luis)["correo"] == ""

        assert base.crear_tabla("copia", "nombre,correo,edad")
        assert base.insertar_desde("copia", "clientes") == 2
        assert len(base.listar("copia")) == 2

        try:
            base.actualizar_donde("clientes", {"id": "99"})
        except RuntimeError:
            pass
        else:
            raise AssertionError("No se debe modificar la columna interna id")
        try:
            base.actualizar_donde("clientes", {"correo": "x" * 512})
        except RuntimeError:
            pass
        else:
            raise AssertionError("No debe caber un registro demasiado largo")
        assert base.seleccionar("clientes", ana)["correo"] == "ana@ejemplo.invalid"

        assert base.actualizar_donde("clientes", {"edad": "31"}, "nombre", "Ana") == 1
        assert base.seleccionar("clientes", ana)["edad"] == "31"
        assert base.seleccionar("clientes", luis)["edad"] == "25"
        assert base.actualizar_donde("clientes", {"correo": "comun@ejemplo.invalid"}) == 2

        assert base.eliminar_donde("clientes", "nombre", "Luis") == 1
        assert len(base.listar("clientes")) == 1
        assert base.eliminar_donde("clientes") == 1
        assert base.listar("clientes") == []
        assert base.insertar("clientes", ["Eva", "eva@ejemplo.invalid", "22"]) == 3
    finally:
        os.chdir(directorio_anterior)


with tempfile.TemporaryDirectory(prefix="pierodev-dml-consola-") as carpeta:
    raiz = Path(carpeta)
    configuracion = configurar(raiz)
    comandos = "\n".join([
        "CREAR BASE prueba",
        "USAR prueba",
        "CREAR TABLA clientes nombre,correo",
        "INSERTAR EN clientes VALORES ('Ana','ana@ejemplo.invalid')",
        "INSERTAR EN clientes (nombre) VALORES ('Luis')",
        "CREAR TABLA copia nombre,correo",
        "INSERTAR EN copia SELECCIONAR * DE clientes",
        "ACTUALIZAR clientes ESTABLECER correo='nuevo@ejemplo.invalid' DONDE nombre='Ana'",
        "SELECCIONAR clientes 1",
        "ELIMINAR DE clientes DONDE nombre='Luis'",
        "LISTAR clientes",
        "ELIMINAR DE clientes",
        "LISTAR clientes",
        "SALIR",
        "",
    ])
    resultado = subprocess.run(
        [str(carpeta_proyecto / "005-pierodevbbdd.exe"), str(configuracion)],
        input=comandos,
        text=True,
        capture_output=True,
        cwd=raiz,
        check=True,
    )
    salida = resultado.stdout + resultado.stderr
    assert "ERROR" not in salida, salida
    assert "INSERTADOS=2" in salida, salida
    assert "ACTUALIZADOS=1" in salida, salida
    assert salida.count("ELIMINADOS=1") == 2, salida
    assert "correo=nuevo@ejemplo.invalid" in salida, salida

print("Operaciones DML verificadas desde Python y consola con datos temporales")
