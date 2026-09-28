"""Copias manuales de la librería: conserva los bytes de sus 17 archivos internos.

Una copia contiene copia.json y archivos/ (cuatro tablas con sus índices,
esquemas y metadatos, más relaciones.json). No incluye código, config.json,
permisos del sistema ni temporales de operaciones. No sustituye un respaldo
del proyecto completo. Guarda las copias importantes en otro dispositivo.

SHA-256 detecta alteraciones, pero no autentica al autor ni cifra los datos.
Trabajar con un solo proceso por base; los hashes no son un bloqueo concurrente.
La restauración exige el mismo tamaño de bloque y siempre un nombre nuevo.
Para restaurar no hace falta seleccionar ni abrir la base original:
UnicornCopias(UnicornBBDD("config.json")).restaurar("copia_unicorn", "recuperada").
"""

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import tempfile

from UnicornBBDD import UnicornBBDD
from UnicornLibreria import UnicornLibreria


class UnicornCopias:
    """Crea, comprueba y restaura copias completas sin sobrescribir bases ni copias."""

    FORMATO = "unicorn-copia-1"

    def __init__(self, conexion):
        """Usa la conexión como configuración; solo crear necesita una base seleccionada."""
        self.conexion = conexion
        self.archivos = ["relaciones.json"]
        for tabla in UnicornLibreria.ESQUEMAS:
            self.archivos.extend(tabla + extension for extension in (".csv", ".idx", ".esquema", ".meta.json"))

    def _rutaLocal(self, ruta):
        """Rechaza enlaces y redirecciones de carpetas antes de leer datos de la copia."""
        ruta = Path(os.path.abspath(ruta))
        if os.path.normcase(os.path.realpath(ruta)) != os.path.normcase(str(ruta)):
            raise ValueError("No se admiten enlaces en las copias: " + str(ruta))
        return ruta

    def _huellas(self, carpeta):
        """Calcula SHA-256 de los archivos conocidos; nunca toma rutas del manifiesto."""
        resultado = {}
        for nombre in self.archivos:
            ruta = self._rutaLocal(carpeta / nombre)
            if not ruta.is_file():
                raise FileNotFoundError("Falta un archivo de la copia: " + nombre)
            with ruta.open("rb") as archivo:
                resultado[nombre] = hashlib.file_digest(archivo, "sha256").hexdigest()
        return resultado

    def _copiarArchivos(self, origen, destino):
        """Copia solo los archivos de la base y solicita guardar sus bytes en disco."""
        for nombre in self.archivos:
            shutil.copyfile(self._rutaLocal(origen / nombre), destino / nombre)
            with (destino / nombre).open("r+b") as archivo:
                os.fsync(archivo.fileno())  # No convierte esta operación en una transacción SQL.

    def _guardarJson(self, ruta, contenido):
        """Escribe un archivo nuevo; nunca reemplaza la configuración del usuario."""
        with ruta.open("x", encoding="utf-8") as archivo:
            json.dump(contenido, archivo, ensure_ascii=False, indent=4)
            archivo.write("\n")
            archivo.flush()
            os.fsync(archivo.fileno())

    def _sinDuplicados(self, pares):
        """Impide que claves JSON duplicadas oculten información del manifiesto."""
        resultado = {}
        for clave, valor in pares:
            if clave in resultado:
                raise ValueError("Clave repetida en copia.json: " + clave)
            resultado[clave] = valor
        return resultado

    def _leerCopia(self, origen):
        """Valida el manifiesto y todas las huellas antes de copiar o usar los datos."""
        origen = self._rutaLocal(origen)
        with self._rutaLocal(origen / "copia.json").open(encoding="utf-8") as archivo:
            manifiesto = json.load(archivo, object_pairs_hook=self._sinDuplicados)
        campos = {"formato", "base", "fecha", "tamanoRegistro", "archivos"}
        if not isinstance(manifiesto, dict) or set(manifiesto) != campos or manifiesto["formato"] != self.FORMATO:
            raise ValueError("Formato de copia incompatible")
        self.conexion._validarNombre(manifiesto["base"])
        if not isinstance(manifiesto["fecha"], str):
            raise ValueError("Fecha de copia incorrecta")
        datetime.fromisoformat(manifiesto["fecha"])
        if type(manifiesto["tamanoRegistro"]) is not int or manifiesto["tamanoRegistro"] < 32:
            raise ValueError("Tamaño de registro incorrecto en la copia")
        huellas = manifiesto["archivos"]
        if not isinstance(huellas, dict) or set(huellas) != set(self.archivos):
            raise ValueError("La copia debe contener los 17 archivos de la librería")
        if any(not isinstance(h, str) or not re.fullmatch(r"[0-9a-f]{64}", h) for h in huellas.values()):
            raise ValueError("Huella SHA-256 incorrecta")
        carpeta = self._rutaLocal(origen / "archivos")
        if {p.name for p in carpeta.iterdir()} != set(self.archivos):
            raise ValueError("Hay archivos ausentes o inesperados en la copia")
        if self._huellas(carpeta) != huellas:
            raise ValueError("La copia está dañada o modificada: las huellas no coinciden")
        return origen, manifiesto

    def _validarBase(self, carpeta, tamano):
        """Valida bloques, índices, relaciones y negocio sin reparar ni modificar la base."""
        carpeta = self._rutaLocal(carpeta)
        if os.path.lexists(carpeta / ".operacion-pendiente"):
            raise RuntimeError("Hay una operación pendiente; recupérala antes de crear la copia")
        # Solo el JSON auxiliar se escribe en el temporal; la base se abre para comprobarla.
        with tempfile.TemporaryDirectory(prefix="unicorn-validar-copia-") as temporal:
            ruta = Path(temporal) / "config.json"
            self._guardarJson(ruta, {"instalacion": str(carpeta.parent), "tamanoRegistro": tamano})
            auxiliar = UnicornBBDD(ruta)
            auxiliar.usaBaseDatos(carpeta.name)
            auxiliar._comprobarOperacionPendiente()
            UnicornLibreria(auxiliar)._preparar()

    def crear(self, destino):
        """Publica una carpeta nueva con los archivos originales y su manifiesto de integridad."""
        if not self.conexion.basededatos:
            raise ValueError("Selecciona una base para crear su copia")
        if self.conexion._operacionActiva is not None:
            raise RuntimeError("No se puede crear una copia durante una operación")
        origen = self._rutaLocal(Path(self.conexion.instalacion) / self.conexion.basededatos)
        destino = self._rutaLocal(destino)
        if destino.is_relative_to(origen):
            raise ValueError("Guarda la copia fuera de la carpeta de la base original")
        if os.path.lexists(destino):
            raise FileExistsError("La carpeta de copia ya existe; elige un nombre nuevo")
        huellas = self._huellas(origen)
        self._validarBase(origen, self.conexion.tamanoRegistro)
        # El padre debe existir. El nombre definitivo aparece solo al terminar todas las comprobaciones.
        with tempfile.TemporaryDirectory(prefix=".crear-copia-", dir=destino.parent) as temporal:
            resultado = Path(temporal) / "resultado"
            archivos = resultado / "archivos"
            archivos.mkdir(parents=True)
            self._copiarArchivos(origen, archivos)
            if self._huellas(archivos) != huellas or self._huellas(origen) != huellas:
                raise RuntimeError("Los archivos cambiaron durante la copia; vuelve a intentarlo sin otras sesiones")
            self._validarBase(origen, self.conexion.tamanoRegistro)
            self._validarBase(archivos, self.conexion.tamanoRegistro)
            self._guardarJson(resultado / "copia.json", {
                "formato": self.FORMATO, "base": self.conexion.basededatos,
                "fecha": datetime.now(timezone.utc).isoformat(),
                "tamanoRegistro": self.conexion.tamanoRegistro, "archivos": huellas
            })
            if os.path.lexists(destino):
                raise FileExistsError("El destino ha aparecido durante la copia")
            os.rename(resultado, destino)
        return str(destino)

    def comprobar(self, origen):
        """Comprueba huellas y contenido; devuelve el manifiesto sin alterar la copia."""
        origen, manifiesto = self._leerCopia(origen)
        self._validarBase(origen / "archivos", manifiesto["tamanoRegistro"])
        return manifiesto

    def restaurar(self, origen, nombre):
        """Restaura en una base nueva sin abrir la original ni cambiar la selección actual."""
        self.conexion._validarNombre(nombre)
        destino = self._rutaLocal(Path(self.conexion.instalacion) / nombre)
        if os.path.lexists(destino):
            raise FileExistsError("La base destino ya existe; elige un nombre nuevo sin extensión")
        origen, manifiesto = self._leerCopia(origen)
        if manifiesto["tamanoRegistro"] != self.conexion.tamanoRegistro:
            raise ValueError("La copia requiere registros de " + str(manifiesto["tamanoRegistro"]) +
                             " bytes; usa una configuración compatible. No se convierten los archivos")
        with tempfile.TemporaryDirectory(prefix=".restaurar-copia-", dir=destino.parent) as temporal:
            nueva = Path(temporal) / nombre
            nueva.mkdir()
            self._copiarArchivos(origen / "archivos", nueva)
            if self._huellas(nueva) != manifiesto["archivos"]:
                raise ValueError("La copia cambió o falló la escritura durante la restauración")
            self._validarBase(nueva, self.conexion.tamanoRegistro)
            if os.path.lexists(destino):
                raise FileExistsError("La base destino ha aparecido durante la restauración")
            os.rename(nueva, destino)
        return str(destino)
