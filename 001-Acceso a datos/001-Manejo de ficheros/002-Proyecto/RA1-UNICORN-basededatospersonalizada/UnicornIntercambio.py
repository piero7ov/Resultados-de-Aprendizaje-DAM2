"""Conversión de la librería a CSV/JSON de intercambio (no son copias físicas).

Cada exportación ocupa una carpeta nueva: datos.json, o cuatro CSV y manifiesto.json.
Todos los valores de los registros son cadenas, como en el motor. Se incluyen
inactivos y los IDs retirados por compactación, para no reutilizarlos al importar.
La importación usa el tamaño de bloque de la configuración de destino y carga
el conjunto en memoria: esta versión está pensada para bases pequeñas de clase.
No ejecutar otro proceso sobre la base mientras se exporta o importa.
"""

import csv
import json
import os
from pathlib import Path
import re
import tempfile

from UnicornBBDD import UnicornBBDD
from UnicornLibreria import UnicornLibreria


class UnicornIntercambio:
    """Gestiona archivos de intercambio sin cambiar la base seleccionada ni su configuración."""

    FORMATO = "unicorn-intercambio-1"

    def __init__(self, conexion):
        """Recibe el motor para conocer la instalación y el tamaño de registro destino."""
        self.conexion = conexion

    def _campos(self, tabla):
        """Devuelve el orden de columnas del modelo de librería, incluidos ID y activo."""
        return ["id", "activo"] + UnicornLibreria.ESQUEMAS[tabla].split(",")

    def _objetoJson(self, pares):
        """Rechaza claves JSON repetidas, que json.load normalmente ocultaría."""
        resultado = {}
        for clave, valor in pares:
            if clave in resultado:
                raise ValueError("Clave JSON repetida: " + clave)
            resultado[clave] = valor
        return resultado

    def _leerJson(self, ruta):
        """Lee UTF-8, admitiendo BOM y detectando propiedades repetidas."""
        with ruta.open(encoding="utf-8-sig") as archivo:
            return json.load(archivo, object_pairs_hook=self._objetoJson)

    def _guardarJson(self, ruta, datos):
        """Crea un JSON nuevo, legible y con tildes, sin sobrescribir archivos."""
        with ruta.open("x", encoding="utf-8") as archivo:
            json.dump(datos, archivo, ensure_ascii=False, indent=4)
            archivo.write("\n")

    def _validarPaquete(self, paquete):
        """Valida estructura, campos, tipos, IDs y bajas antes de construir bloques."""
        if not isinstance(paquete, dict) or set(paquete) != {"formato", "tablas"}:
            raise ValueError("Estructura de intercambio incorrecta")
        tablas = paquete["tablas"]
        if paquete["formato"] != self.FORMATO or not isinstance(tablas, dict) or set(tablas) != set(UnicornLibreria.ESQUEMAS):
            raise ValueError("Formato o conjunto de tablas incompatible")
        for tabla, contenido in tablas.items():
            if not isinstance(contenido, dict) or set(contenido) != {"registros", "retirados"}:
                raise ValueError("Contenido incorrecto: " + tabla)
            if not isinstance(contenido["registros"], list) or not isinstance(contenido["retirados"], list):
                raise ValueError("Se necesitan listas de registros e IDs retirados")
            vistos = set()
            for registro in contenido["registros"]:
                if not isinstance(registro, dict) or set(registro) != set(self._campos(tabla)):
                    raise ValueError("Campos incorrectos: " + tabla)
                if any(not isinstance(valor, str) for valor in registro.values()):
                    raise ValueError("Los campos deben ser texto: " + tabla)
                identificador = registro["id"]
                if not re.fullmatch(r"[1-9][0-9]*", identificador) or identificador in vistos:
                    raise ValueError("ID incorrecto o duplicado: " + tabla)
                vistos.add(identificador)
                if registro["activo"] not in ("0", "1"):
                    raise ValueError("Estado activo incorrecto: " + tabla)
                if tabla == "clientes" and not registro["nombre"].strip():
                    raise ValueError("El nombre del cliente es obligatorio")
            for identificador in contenido["retirados"]:
                if not isinstance(identificador, str) or not re.fullmatch(r"[1-9][0-9]*", identificador) or identificador in vistos:
                    raise ValueError("ID retirado incorrecto o duplicado: " + tabla)
                vistos.add(identificador)

    def exportar(self, destino, formato):
        """Exporta todas las tablas a una carpeta nueva, nunca a una carpeta existente."""
        if formato not in ("csv", "json"):
            raise ValueError("El formato debe ser csv o json")
        destino = Path(destino).resolve()
        if os.path.lexists(destino):
            raise FileExistsError("La carpeta de exportación ya existe")
        self.conexion._comprobarOperacionPendiente()
        UnicornLibreria(self.conexion)._preparar()
        paquete = {"formato": self.FORMATO, "tablas": {}}
        for tabla in UnicornLibreria.ESQUEMAS:
            paquete["tablas"][tabla] = {
                "registros": self.conexion.listarTodo(tabla, True),
                "retirados": [str(id) for id, posicion in self.conexion._leerIndice(tabla).items() if posicion == -1]
            }
        self._validarPaquete(paquete)
        # El directorio padre debe existir; solo publicamos el resultado completo.
        with tempfile.TemporaryDirectory(prefix=".exportar-", dir=destino.parent) as temporal:
            carpeta = Path(temporal) / "resultado"
            carpeta.mkdir()
            if formato == "json":
                self._guardarJson(carpeta / "datos.json", paquete)
            else:
                metadatos = {"formato": self.FORMATO, "tablas": {}}
                for tabla, contenido in paquete["tablas"].items():
                    with (carpeta / (tabla + ".csv")).open("x", encoding="utf-8", newline="") as archivo:
                        escritor = csv.DictWriter(archivo, fieldnames=self._campos(tabla))
                        escritor.writeheader()
                        escritor.writerows(contenido["registros"])
                    metadatos["tablas"][tabla] = {"retirados": contenido["retirados"]}
                self._guardarJson(carpeta / "manifiesto.json", metadatos)
            if os.path.lexists(destino):
                raise FileExistsError("El destino ha aparecido durante la exportación")
            os.rename(carpeta, destino)
        return str(destino)

    def _leerPaquete(self, origen, formato):
        """Lee solo nombres de archivo conocidos; el manifiesto no puede indicar otras rutas."""
        origen = Path(origen).resolve()
        if formato == "json":
            paquete = self._leerJson(origen / "datos.json")
        elif formato == "csv":
            paquete = self._leerJson(origen / "manifiesto.json")
            if not isinstance(paquete, dict) or set(paquete) != {"formato", "tablas"}:
                raise ValueError("Manifiesto incorrecto")
            if not isinstance(paquete["tablas"], dict) or set(paquete["tablas"]) != set(UnicornLibreria.ESQUEMAS):
                raise ValueError("El manifiesto debe incluir las cuatro tablas")
            for tabla, contenido in paquete["tablas"].items():
                if not isinstance(contenido, dict) or set(contenido) != {"retirados"}:
                    raise ValueError("Metadatos de tabla incorrectos")
                with (origen / (tabla + ".csv")).open(encoding="utf-8-sig", newline="") as archivo:
                    lector = csv.DictReader(archivo, strict=True)
                    if lector.fieldnames != self._campos(tabla):
                        raise ValueError("Cabecera CSV incorrecta: " + tabla)
                    contenido["registros"] = list(lector)
        else:
            raise ValueError("El formato debe ser csv o json")
        self._validarPaquete(paquete)
        return paquete

    def importar(self, origen, formato, nombre):
        """Reconstruye una base nueva y la publica tras validar relaciones y reglas de negocio."""
        self.conexion._validarNombre(nombre)
        destino = Path(self.conexion.instalacion) / nombre
        if os.path.lexists(destino):
            raise FileExistsError("La base destino ya existe; elige otro nombre")
        paquete = self._leerPaquete(origen, formato)
        with tempfile.TemporaryDirectory(prefix=".importar-", dir=self.conexion.instalacion) as temporal:
            rutaConfig = Path(temporal) / "config.json"
            self._guardarJson(rutaConfig, {"instalacion": temporal, "tamanoRegistro": self.conexion.tamanoRegistro})
            auxiliar = UnicornBBDD(rutaConfig)
            auxiliar.creaBaseDatos(nombre)
            auxiliar.usaBaseDatos(nombre)
            app = UnicornLibreria(auxiliar)
            app.prepararTablas()
            for tabla, contenido in paquete["tablas"].items():
                ruta = Path(temporal) / nombre / tabla
                # Solo escribimos tablas recién creadas en el temporal, nunca en la base del usuario.
                # No usamos altas/ventas: necesitamos preservar IDs, bajas, precios y stock histórico.
                with ruta.with_suffix(".csv").open("wb") as archivo, ruta.with_suffix(".idx").open("w", encoding="utf-8", newline="") as indice:
                    escritor = csv.writer(indice)
                    for registro in contenido["registros"]:
                        bloque = auxiliar._prepararRegistro([registro[campo] for campo in self._campos(tabla)])
                        escritor.writerow([registro["id"], archivo.tell()])
                        archivo.write(bloque)
                    for identificador in contenido["retirados"]:
                        escritor.writerow([identificador, -1])
            app._preparar()  # Reutiliza la validación de relaciones, estados, ISBN y disponibilidad.
            if os.path.lexists(destino):
                raise FileExistsError("La base destino ha aparecido durante la importación")
            os.rename(Path(temporal) / nombre, destino)
        return str(destino)
