"""Asistente de configuración: py instalador.py [--config ruta] [--sin-color].

No instala dependencias ni mueve bases existentes. Cierra la consola antes de
ejecutarlo: UNICORN trabaja con un solo proceso por base.
"""

import argparse
import csv
import json
import os
from pathlib import Path
import sys
import tempfile
from uuid import uuid4

from consola_unicorn import ConsolaUnicorn, OperacionCancelada
from datos_demo import BASE_DEMO, abrirDemo
from UnicornBBDD import UnicornBBDD
from UnicornLibreria import UnicornLibreria


def comprobarPermisos(carpeta):
    """Comprueba escritura real creando y retirando únicamente un archivo temporal."""
    carpeta.mkdir(parents=True, exist_ok=True)
    rutaPrueba = carpeta / (".unicorn-permisos-" + uuid4().hex)
    # La apertura exclusiva falla al primer rechazo, sin los reintentos de tempfile en Windows.
    prueba = rutaPrueba.open("xb")
    try:
        with prueba:
            prueba.write(b"UNICORN")
            prueba.flush()
            os.fsync(prueba.fileno())  # os.access no garantiza que podamos escribir realmente.
    finally:
        rutaPrueba.unlink()  # Solo retiramos el archivo que hemos creado, incluso si falla la escritura.


def prepararBase(conexion, nombre, ejemplos=False):
    """Valida una base existente o publica una nueva solo cuando está completa."""
    conexion._validarNombre(nombre)
    destino = Path(conexion.instalacion) / nombre
    if os.path.lexists(destino):
        conexion.usaBaseDatos(nombre)
        conexion._comprobarOperacionPendiente()  # El instalador no recupera ni modifica datos previos.
        UnicornLibreria(conexion).listarClientes()
        return False
    if ejemplos and nombre != BASE_DEMO:
        raise ValueError("Los registros iniciales utilizan la base unicorn_demo")
    # El temporal está en el mismo disco que el destino para publicar con rename.
    with tempfile.TemporaryDirectory(prefix=".instalar-base-", dir=conexion.instalacion) as temporal:
        ruta = Path(temporal) / "config.json"
        ruta.write_text(json.dumps({"instalacion": temporal,
                                    "tamanoRegistro": conexion.tamanoRegistro}), encoding="utf-8")
        auxiliar = UnicornBBDD(ruta)
        if ejemplos:
            abrirDemo(auxiliar)
        else:
            auxiliar.creaBaseDatos(nombre)
            auxiliar.usaBaseDatos(nombre)
            UnicornLibreria(auxiliar).prepararTablas()
        if os.path.lexists(destino):
            raise FileExistsError("El destino ha aparecido durante la instalación")
        os.rename(Path(temporal) / nombre, destino)
    return True


def instalar(ruta, consola):
    """Recoge las opciones y confirma antes de escribir configuración o crear bases."""
    ruta = Path(ruta).resolve()
    consola.cabecera("BIENVENIDA")
    consola.mostrar("[ INSTALADOR ]  Configuración y puesta en marcha", "acento")
    consola.mostrar("Cierra las otras consolas de UNICORN antes de continuar.", "aviso")
    consola.mostrar("Escribe ! para cancelar. Configuración: " + str(ruta))
    anterior = ruta.read_bytes() if ruta.exists() else None
    conservar = False
    actuales = {"instalacion": "./datos", "tamanoRegistro": 512}
    conexion = None
    if anterior is not None:
        try:
            conexion = UnicornBBDD(ruta)
            actuales = json.loads(anterior)  # Mantiene también las propiedades adicionales del JSON.
            consola.mostrar("CONFIGURACIÓN ACTUAL", "titulo")
            consola.ficha({"Ruta guardada": actuales["instalacion"],
                           "Ruta absoluta": conexion.instalacion,
                           "Registro": str(conexion.tamanoRegistro) + " bytes"})
        except (ValueError, OSError) as error:
            consola.mostrar("La configuración actual no es válida: " + str(error), "aviso")
        consola.mostrar("1 · Conservar configuración   2 · Modificar   0 · Cancelar", "acento")
        while True:
            opcion = consola.leer("Elige una opción: ")
            if opcion in ("0", "1", "2"):
                break
            consola.mostrar("Escribe 1, 2 o 0.", "aviso")
        if opcion == "0":
            consola.mostrar("Instalación cancelada; no se han guardado cambios.", "aviso")
            return False
        conservar = opcion == "1"
    if conservar:
        if conexion is None:
            raise ValueError("No se puede conservar una configuración inválida; elige Modificar o Cancelar")
        configuracion = None
    else:
        consola.mostrar("Cambiar la ruta no mueve datos. Cambiar el tamaño no convierte tablas.", "aviso")
        directorio = consola.texto("Carpeta de datos (relativa al JSON o absoluta) [" + actuales["instalacion"] + "]",
                                   True, actuales["instalacion"])
        tamano = consola.entero("Tamaño del registro en bytes", 32, actuales["tamanoRegistro"])
        configuracion = dict(actuales)
        configuracion.update({"instalacion": directorio, "tamanoRegistro": tamano})
        conexion = None
    nombre = consola.texto("Nombre de la base [" + BASE_DEMO + "]", True, BASE_DEMO)
    # Validación de nombre sin necesitar aún un archivo de configuración nuevo.
    UnicornBBDD._validarNombre(None, nombre)
    carpeta = Path(conexion.instalacion) if conservar else (ruta.parent / directorio).resolve()
    existe = os.path.lexists(carpeta / nombre)
    ejemplos = False
    if not existe and nombre == BASE_DEMO:
        ejemplos = consola.confirmar("¿Cargar los 50 registros iniciales? (No = base vacía)")
    consola.cabecera("RESUMEN DE INSTALACIÓN")
    consola.ficha({"Carpeta": str(carpeta), "Base": nombre,
                   "Registro": str(conexion.tamanoRegistro if conservar else tamano) + " bytes",
                   "Configuración": "Conservar" if conservar else "Guardar nueva configuración",
                   "Datos": "Comprobar sin sobrescribir" if existe else
                   ("Crear con 50 registros" if ejemplos else "Crear base vacía")})
    if not consola.confirmar("¿Continuar con esta instalación?"):
        consola.mostrar("Instalación cancelada; no se han guardado cambios.", "aviso")
        return False
    consola.mostrar("[1/3] Comprobando permisos de configuración: " + str(ruta.parent), "titulo")
    comprobarPermisos(ruta.parent)
    consola.mostrar("[1/3] Preparando carpeta y comprobando permisos: " + str(carpeta), "titulo")
    comprobarPermisos(carpeta)
    # Construimos el JSON junto al definitivo para que sus rutas relativas coincidan.
    temporal = None
    try:
        if not conservar:
            descriptor, temporal = tempfile.mkstemp(prefix=".config-", suffix=".json", dir=ruta.parent)
            with os.fdopen(descriptor, "w", encoding="utf-8") as archivo:
                json.dump(configuracion, archivo, ensure_ascii=False, indent=4)
                archivo.write("\n")
                archivo.flush()
                os.fsync(archivo.fileno())
            conexion = UnicornBBDD(temporal)
        consola.mostrar("[2/3] " + ("Comprobando base existente..." if existe else "Creando la base de datos..."), "titulo")
        prepararBase(conexion, nombre, ejemplos)
        consola.mostrar("[3/3] " + ("Conservando configuración." if conservar else "Guardando configuración..."), "titulo")
        if not conservar:
            actual = ruta.read_bytes() if ruta.exists() else None
            if actual != anterior:
                raise RuntimeError("La configuración cambió durante la instalación; no se sobrescribe")
            os.replace(temporal, ruta)  # Solo sustituye el JSON después de validar la base.
            temporal = None
    finally:
        if temporal is not None:
            os.unlink(temporal)
    consola.cabecera("INSTALACIÓN COMPLETADA")
    consola.mostrar("Configuración lista. Los datos anteriores se han conservado.", "bien")
    consola.mostrar("Para abrir la aplicación:", "titulo")
    consola.mostrar(f'py "{Path(__file__).with_name("consola_unicorn.py")}" --config "{ruta}" --base {nombre}')
    return True


def principal(argumentos=None):
    """Captura cancelaciones y errores de ficheros sin mostrar un traceback al usuario."""
    parser = argparse.ArgumentParser(description="Instalador de UNICORN")
    parser.add_argument("--config", default=str(Path(__file__).with_name("config.json")))
    parser.add_argument("--sin-color", action="store_true")
    opciones = parser.parse_args(argumentos)
    consola = ConsolaUnicorn(color=False if opciones.sin_color else None)
    try:
        instalar(opciones.config, consola)
        return 0
    except (EOFError, KeyboardInterrupt, OperacionCancelada):
        consola.mostrar("Instalación interrumpida. Puedes volver a ejecutarla.", "aviso")
        return 0
    except (ValueError, OSError, RuntimeError, csv.Error) as error:
        consola.mostrar("No se pudo completar la instalación: " + str(error), "error")
        consola.mostrar("No se han borrado bases previas. Si se creó una base nueva, se conserva para reintentar.", "aviso")
        return 1


if __name__ == "__main__":
    sys.exit(principal())
