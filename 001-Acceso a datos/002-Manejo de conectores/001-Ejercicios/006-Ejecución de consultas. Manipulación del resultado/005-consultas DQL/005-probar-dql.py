"""Comprueba las consultas DQL en Python y terminal con datos temporales."""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


proyecto = Path(__file__).parent
sys.path.insert(0, str(proyecto))
import pierodevbbdd as base


def configuracion(raiz):
    ruta = raiz / "config.json"
    ruta.write_text(
        json.dumps({"instalacion": str(raiz / "datos"), "tamanoRegistro": 512}),
        encoding="utf-8",
    )
    return ruta


directorio_anterior = Path.cwd()
with tempfile.TemporaryDirectory(prefix="pierodev-dql-python-") as carpeta:
    raiz = Path(carpeta)
    configuracion(raiz)
    try:
        os.chdir(raiz)
        assert base.crear_base("prueba")
        assert base.usar_base("prueba")
        assert base.crear_tabla("clientes", "nombre,edad,ciudad")
        for fila in [
            ["Ana", "30", "Valencia"],
            ["Luis", "17", "Madrid"],
            ["Ane", "25", "Valencia"],
            ["Jose", "40", "Sevilla"],
            ["Jose", "40", "Sevilla"],
        ]:
            assert base.insertar("clientes", fila) > 0

        def consultar(texto):
            return base.consultar(texto)

        assert len(consultar("SELECCIONAR * DE clientes")) == 5
        assert consultar("SELECCIONAR nombre COMO cliente DE clientes LIMITE 1") == [
            {"cliente": "Ana"}
        ]
        assert consultar("SELECCIONAR DISTINTO ciudad DE clientes") == [
            {"ciudad": "Valencia"}, {"ciudad": "Madrid"}, {"ciudad": "Sevilla"}
        ]
        assert [fila["nombre"] for fila in consultar(
            "SELECCIONAR nombre DE clientes DONDE edad >= 18 Y "
            "(ciudad = 'Valencia' O ciudad = 'Madrid') ORDENAR POR edad DESCENDENTE"
        )] == ["Ana", "Ane"]
        assert [fila["nombre"] for fila in consultar(
            "SELECCIONAR nombre DE clientes DONDE NO ciudad = 'Valencia' "
            "Y edad ENTRE 18 Y 40"
        )] == ["Jose", "Jose"]
        assert len(consultar(
            "SELECCIONAR nombre DE clientes DONDE ciudad EN ('Madrid','Sevilla')"
        )) == 3
        assert consultar("SELECCIONAR DISTINTO nombre DE clientes "
                        "DONDE nombre COMO 'Jos%' ") == [{"nombre": "Jose"}]
        assert len(consultar("SELECCIONAR nombre DE clientes DONDE nombre LIKE 'An_'")) == 2
        assert [fila["nombre"] for fila in consultar(
            "SELECCIONAR nombre DE clientes ORDENAR POR edad DESCENDENTE LIMITE 2"
        )] == ["Jose", "Jose"]
        assert consultar("SELECCIONAR nombre DE clientes LIMITE 0") == []
        assert consultar("SELECCIONAR nombre DE clientes DONDE edad > 100") == []
        assert consultar("SELECCIONAR nombre DE clientes; ")[:1] == [{"nombre": "Ana"}]

        for instruccion in [
            "SELECCIONAR nombre DE clientes DONDE",
            "SELECCIONAR nombre DE clientes DONDE inventada = 1",
            "SELECCIONAR desconocida DE clientes",
            "SELECCIONAR nombre DE clientes LIMITE -1",
            "SELECCIONAR nombre DE clientes ORDENAR POR inventada",
            "SELECCIONAR nombre DE clientes DONDE ciudad = 'Valencia",
        ]:
            try:
                consultar(instruccion)
            except RuntimeError:
                pass
            else:
                raise AssertionError(f"Se acepto una consulta no valida: {instruccion}")

        assert base.eliminar_donde("clientes", "nombre", "Luis") == 1
        assert len(consultar("SELECCIONAR * DE clientes")) == 4
    finally:
        os.chdir(directorio_anterior)

with tempfile.TemporaryDirectory(prefix="pierodev-dql-consola-") as carpeta:
    raiz = Path(carpeta)
    ruta = configuracion(raiz)
    comandos = "\n".join([
        "CREAR BASE prueba",
        "USAR prueba",
        "CREAR TABLA clientes nombre,edad,ciudad",
        "INSERTAR EN clientes VALORES ('Ana','30','Valencia')",
        "INSERTAR EN clientes VALORES ('Luis','17','Madrid')",
        "SELECCIONAR nombre COMO cliente,edad DE clientes DONDE edad >= 18",
        "SELECCIONAR * DE clientes ORDENAR POR edad DESCENDENTE LIMITE 1",
        "SELECCIONAR clientes 1",
        "SALIR",
        "",
    ])
    proceso = subprocess.run(
        [str(proyecto / "005-pierodevbbdd.exe"), str(ruta)],
        input=comandos, text=True, capture_output=True, cwd=raiz, check=True,
    )
    salida = proceso.stdout + proceso.stderr
    assert "ERROR" not in salida, salida
    assert "cliente | edad" in salida, salida
    assert "Ana | 30" in salida, salida
    assert "1 fila(s)" in salida, salida
    assert "nombre=Ana" in salida, salida

print("Consultas DQL verificadas desde Python y consola con datos temporales")
