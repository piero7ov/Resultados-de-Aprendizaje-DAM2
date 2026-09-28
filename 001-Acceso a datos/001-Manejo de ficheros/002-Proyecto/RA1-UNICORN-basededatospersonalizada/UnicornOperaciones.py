"""Copias previas y recuperación para operaciones de un único proceso.

No proporciona concurrencia ni garantías ACID frente a cualquier fallo de disco.
Antes de escribir se publica una carpeta .operacion-pendiente con las copias.
Confirmar retira ese marcador; si permanece al reabrir, se restaura el estado previo.
La inicialización de tablas y la compactación directa no forman parte de este mecanismo.
"""

import hashlib
import json
import os
import shutil
import tempfile
import uuid
from contextlib import contextmanager


class UnicornOperaciones:
    """Agrupa cambios en tablas existentes y conserva una copia hasta confirmar."""

    def __init__(self, conexion, tablas):
        """Vincula el gestor a la base seleccionada y a una lista concreta de tablas."""
        if not conexion.basededatos:
            raise ValueError("Selecciona una base antes de crear el gestor de operaciones")
        self.conexion = conexion
        self.base = conexion.basededatos
        self.carpeta = os.path.join(conexion.instalacion, self.base)
        self.pendiente = os.path.join(self.carpeta, ".operacion-pendiente")
        self.tablas = list(tablas)
        if not self.tablas or len(set(self.tablas)) != len(self.tablas):
            raise ValueError("Se necesita una lista de tablas sin duplicados")
        for tabla in self.tablas:
            conexion._validarNombre(tabla)
        self.archivos = ["relaciones.json"]
        for tabla in self.tablas:
            self.archivos.extend(tabla + extension for extension in (".csv", ".idx", ".esquema", ".meta.json"))

    def _comprobarBase(self):
        """Evita restaurar una copia en otra base o dentro de otra operación."""
        actual = os.path.join(self.conexion.instalacion, self.conexion.basededatos)
        if actual != self.carpeta:
            raise ValueError("La conexión ha cambiado de base")
        if self.conexion._operacionActiva is not None:
            raise RuntimeError("No se permiten operaciones anidadas")

    def _huella(self, ruta):
        """Calcula SHA-256 para detectar copias incompletas o modificadas."""
        with open(ruta, "rb") as archivo:
            return hashlib.file_digest(archivo, "sha256").hexdigest()

    def _sincronizar(self, ruta):
        """Solicita al sistema guardar los bytes antes de publicar o confirmar una operación."""
        with open(ruta, "r+b") as archivo:
            archivo.flush()
            os.fsync(archivo.fileno())  # No sustituye las garantías de un gestor SQL.

    def _archivoLocal(self, carpeta, nombre):
        """Rechaza enlaces o desvíos de ruta antes de copiar o restaurar un archivo."""
        ruta = os.path.join(carpeta, nombre)
        if os.path.normcase(os.path.realpath(ruta)) != os.path.normcase(os.path.abspath(ruta)):
            raise ValueError("No se admiten enlaces en los archivos de una operación")
        return ruta

    def _retirarPendiente(self):
        """Marca el fin mediante un cambio de nombre y limpia únicamente la copia generada."""
        resuelta = os.path.join(self.carpeta, ".operacion-resuelta-" + uuid.uuid4().hex)
        os.rename(self.pendiente, resuelta)  # Este paso decide si queda pendiente o confirmada.
        # Si la limpieza falla, quedan copias sobrantes; no se anuncia falsamente un fallo de la venta.
        shutil.rmtree(resuelta, ignore_errors=True)

    def recuperarPendiente(self):
        """Restaura todos los archivos si hay una operación pendiente; devuelve si la había."""
        self._comprobarBase()
        if not os.path.lexists(self.pendiente):
            return False
        if os.path.normcase(os.path.realpath(self.pendiente)) != os.path.normcase(os.path.abspath(self.pendiente)):
            raise ValueError("La carpeta pendiente no puede ser un enlace")
        with open(self._archivoLocal(self.pendiente, "operacion.json"), encoding="utf-8") as archivo:
            registro = json.load(archivo)
        if (not isinstance(registro, dict) or type(registro.get("version")) is not int or registro["version"] != 1
                or not isinstance(registro.get("archivos"), dict)
                or set(registro["archivos"]) != set(self.archivos)):
            raise ValueError("El registro de operación no corresponde a estas tablas")

        # Se comprueban TODAS las copias antes de empezar a reemplazar archivos.
        for nombre, huella in registro["archivos"].items():
            copia = self._archivoLocal(self.pendiente, nombre)
            self._archivoLocal(self.carpeta, nombre)
            if self._huella(copia) != huella:
                raise ValueError("Copia dañada: " + nombre + ". Se mantiene el bloqueo")
        for nombre in self.archivos:
            descriptor, temporal = tempfile.mkstemp(prefix=".restaurar-", dir=self.carpeta)
            os.close(descriptor)
            try:
                shutil.copyfile(os.path.join(self.pendiente, nombre), temporal)
                self._sincronizar(temporal)
                os.replace(temporal, os.path.join(self.carpeta, nombre))
            finally:
                if os.path.exists(temporal):
                    os.remove(temporal)
        # Si se interrumpe la restauración, la carpeta original sigue disponible para repetirla.
        self._retirarPendiente()
        return True

    @contextmanager
    def ejecutar(self, nombre):
        """Ejecuta un bloque with: confirma al terminar o restaura ante una excepción normal."""
        self._comprobarBase()
        self.recuperarPendiente()
        for tabla in self.tablas:
            self.conexion._comprobarTabla(tabla)
        preparacion = tempfile.mkdtemp(prefix=".operacion-preparando-", dir=self.carpeta)
        try:
            huellas = {}
            for archivo in self.archivos:
                origen = self._archivoLocal(self.carpeta, archivo)
                destino = os.path.join(preparacion, archivo)
                shutil.copyfile(origen, destino)
                self._sincronizar(destino)
                huellas[archivo] = self._huella(destino)
            rutaRegistro = os.path.join(preparacion, "operacion.json")
            with open(rutaRegistro, "x", encoding="utf-8") as archivo:
                json.dump({"version": 1, "nombre": nombre, "archivos": huellas}, archivo, indent=4)
            self._sincronizar(rutaRegistro)
            os.rename(preparacion, self.pendiente)  # Publica la copia completa ANTES de permitir escrituras.
        finally:
            if os.path.isdir(preparacion):
                shutil.rmtree(preparacion)

        self.conexion._operacionActiva = self.pendiente
        try:
            yield
            for archivo in self.archivos:
                self._sincronizar(os.path.join(self.carpeta, archivo))
            self._retirarPendiente()
        except Exception:
            self.conexion._operacionActiva = None
            self.recuperarPendiente()
            raise
        finally:
            # KeyboardInterrupt/SystemExit dejan la copia pendiente para la siguiente apertura.
            self.conexion._operacionActiva = None
