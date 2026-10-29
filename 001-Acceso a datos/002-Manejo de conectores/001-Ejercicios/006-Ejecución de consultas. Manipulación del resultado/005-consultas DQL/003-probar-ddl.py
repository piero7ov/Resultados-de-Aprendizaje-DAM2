"""Comprueba las operaciones DDL con datos temporales, sin instalar el conector."""

import json
import os
import sys
import tempfile
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parent))
import pierodevbbdd


with tempfile.TemporaryDirectory(prefix="pierodev-ddl-") as carpeta:
    raiz = Path(carpeta)
    (raiz / "config.json").write_text(
        json.dumps({"instalacion": str(raiz / "datos"), "tamanoRegistro": 96}),
        encoding="utf-8",
    )
    os.chdir(raiz)

    assert pierodevbbdd.crear_base("prueba")
    assert pierodevbbdd.usar_base("prueba")
    assert pierodevbbdd.crear_tabla("clientes", "nombre,email")
    primero = pierodevbbdd.insertar("clientes", ["Ana", "ana@ejemplo.com"])
    segundo = pierodevbbdd.insertar("clientes", ["Luis", "luis@ejemplo.com"])
    assert pierodevbbdd.eliminar("clientes", segundo)

    assert pierodevbbdd.alterar_anadir_columna("clientes", "telefono")
    assert pierodevbbdd.seleccionar("clientes", primero)["telefono"] == ""
    assert pierodevbbdd.seleccionar("clientes", segundo) == {}
    assert pierodevbbdd.insertar("clientes", ["Eva", "eva@ejemplo.com", "600"]) == 3
    assert not pierodevbbdd.alterar_anadir_columna("clientes", "telefono")

    assert pierodevbbdd.alterar_renombrar_columna("clientes", "email", "correo")
    assert pierodevbbdd.seleccionar("clientes", primero)["correo"] == "ana@ejemplo.com"
    assert not pierodevbbdd.alterar_eliminar_columna("clientes", "id")
    assert pierodevbbdd.alterar_eliminar_columna("clientes", "telefono")
    assert pierodevbbdd.seleccionar("clientes", primero)["nombre"] == "Ana"
    assert len(pierodevbbdd.listar("clientes")) == 2

    assert not pierodevbbdd.alterar_renombrar_tabla("clientes", "../fuera")
    assert pierodevbbdd.alterar_renombrar_tabla("clientes", "personas")
    assert pierodevbbdd.seleccionar("personas", primero)["correo"] == "ana@ejemplo.com"
    assert not pierodevbbdd.eliminar_base("../fuera")

    assert pierodevbbdd.truncar_tabla("personas")
    assert pierodevbbdd.listar("personas") == []
    assert pierodevbbdd.insertar("personas", ["Sol", "sol@ejemplo.com"]) == 1
    assert pierodevbbdd.eliminar_tabla("personas")
    assert not (raiz / "datos" / "prueba" / "personas.csv").exists()

    assert pierodevbbdd.crear_tabla("grande", "texto,marca")
    identificador = pierodevbbdd.insertar("grande", ["x" * 89, "a"])
    assert not pierodevbbdd.alterar_anadir_columna("grande", "extra")
    assert pierodevbbdd.seleccionar("grande", identificador)["texto"] == "x" * 89
    assert not (raiz / "datos" / "prueba" / "grande.csv.tmpddl").exists()
    assert pierodevbbdd.eliminar_tabla("grande")

    assert pierodevbbdd.eliminar_base("prueba")
    assert not (raiz / "datos" / "prueba").exists()
    os.chdir(Path(__file__).parent)

print("Operaciones DDL verificadas con datos temporales")
