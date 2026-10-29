"""Prueba la consola con una configuración y una base de datos temporales."""

import json
import subprocess
import tempfile
from pathlib import Path


ejecutable = Path(__file__).with_name("003-pierodevbbdd.exe")
with tempfile.TemporaryDirectory(prefix="pierodev-consola-") as carpeta:
    raiz = Path(carpeta)
    configuracion = raiz / "config.json"
    configuracion.write_text(
        json.dumps({"instalacion": str(raiz / "datos"), "tamanoRegistro": 512}),
        encoding="utf-8",
    )
    comandos = "\n".join([
        "CREAR BASE prueba",
        "USAR prueba",
        "CREAR TABLA clientes nombre,correo",
        "INSERTAR clientes Ana,ana@ejemplo.invalid",
        "ALTERAR TABLA clientes ANADIR COLUMNA telefono",
        "ACTUALIZAR clientes 1 Ana,ana@ejemplo.invalid,600000001",
        "ALTERAR TABLA clientes RENOMBRAR COLUMNA telefono movil",
        "ALTERAR TABLA clientes ELIMINAR COLUMNA movil",
        "RENOMBRAR TABLA clientes personas",
        "SELECCIONAR personas 1",
        "TRUNCAR TABLA personas",
        "LISTAR personas",
        "ELIMINAR TABLA personas",
        "ELIMINAR BASE prueba",
        "SALIR",
        "",
    ])
    resultado = subprocess.run(
        [str(ejecutable), str(configuracion)],
        input=comandos,
        text=True,
        capture_output=True,
        cwd=raiz,
        check=True,
    )
    assert "ERROR" not in resultado.stdout + resultado.stderr, resultado.stdout + resultado.stderr
    assert "correo=ana@ejemplo.invalid" in resultado.stdout, resultado.stdout
    assert resultado.stdout.count("OK") == 11, resultado.stdout
    assert not (raiz / "datos" / "prueba").exists()

print("Consola DDL verificada con datos temporales")
