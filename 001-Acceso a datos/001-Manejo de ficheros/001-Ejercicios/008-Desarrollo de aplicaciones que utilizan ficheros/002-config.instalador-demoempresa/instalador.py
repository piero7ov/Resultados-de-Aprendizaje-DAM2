#!/usr/bin/env python3

import json
import os
import shutil
import sys


class Colores:
    RESET = "\033[0m"
    NEGRITA = "\033[1m"
    SUAVE = "\033[2m"
    ROJO = "\033[91m"
    VERDE = "\033[92m"
    AMARILLO = "\033[93m"
    AZUL = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"
    BLANCO = "\033[97m"


class InstaladorPierodevBBDD:
    def __init__(self):
        self.directorioInstalador = os.path.dirname(os.path.abspath(__file__))
        self.archivoConfiguracion = os.path.join(
            self.directorioInstalador,
            "config.json"
        )
        self.archivoBiblioteca = os.path.join(
            self.directorioInstalador,
            "PierodevBBDD.py"
        )
        columnas = shutil.get_terminal_size((80, 24)).columns
        self.ancho = max(64, min(columnas - 4, 82))

    def prepararTerminal(self):
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")

        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")

        if os.name == "nt":
            os.system("")

    def limpiar(self):
        if sys.stdout.isatty():
            os.system("cls" if os.name == "nt" else "clear")

    def linea(self, caracter="─", color=Colores.CYAN):
        print(color + caracter * self.ancho + Colores.RESET)

    def centrar(self, texto, color=Colores.BLANCO):
        print(color + texto.center(self.ancho) + Colores.RESET)

    def titulo(self):
        self.limpiar()
        print(Colores.CYAN + "╔" + "═" * (self.ancho - 2) + "╗" + Colores.RESET)
        print(
            Colores.CYAN + "║" + Colores.RESET
            + Colores.NEGRITA + Colores.BLANCO
            + "PIERODEV BBDD".center(self.ancho - 2)
            + Colores.RESET + Colores.CYAN + "║" + Colores.RESET
        )
        print(
            Colores.CYAN + "║" + Colores.RESET
            + Colores.SUAVE
            + "Instalador y configurador".center(self.ancho - 2)
            + Colores.RESET + Colores.CYAN + "║" + Colores.RESET
        )
        print(Colores.CYAN + "╚" + "═" * (self.ancho - 2) + "╝" + Colores.RESET)
        print()

    def mensaje(self, simbolo, texto, color):
        print("  " + color + simbolo + Colores.RESET + "  " + texto)

    def exito(self, texto):
        self.mensaje("✔", texto, Colores.VERDE)

    def aviso(self, texto):
        self.mensaje("!", texto, Colores.AMARILLO)

    def error(self, texto):
        self.mensaje("✘", texto, Colores.ROJO)

    def info(self, texto):
        self.mensaje("●", texto, Colores.CYAN)

    def paso(self, numero, total, texto):
        etiqueta = "[" + str(numero) + "/" + str(total) + "]"
        print(
            "  " + Colores.MAGENTA + Colores.NEGRITA + etiqueta
            + Colores.RESET + " " + texto
        )

    def preguntaSiNo(self, texto, defecto=None):
        while True:
            if defecto is True:
                opciones = "[S/n]"
            elif defecto is False:
                opciones = "[s/N]"
            else:
                opciones = "[s/n]"

            respuesta = input(
                "\n  " + Colores.AMARILLO + "?" + Colores.RESET
                + "  " + texto + " " + Colores.SUAVE
                + opciones + Colores.RESET + " "
            ).strip().lower()

            if respuesta == "" and defecto is not None:
                return defecto

            if respuesta in ["s", "si", "sí", "y", "yes"]:
                return True

            if respuesta in ["n", "no"]:
                return False

            self.aviso("Escribe 's' para sí o 'n' para no.")

    def preguntarTexto(self, texto, defecto):
        respuesta = input(
            "  " + Colores.AMARILLO + "›" + Colores.RESET
            + "  " + texto + "\n     " + Colores.SUAVE
            + "Valor por defecto: " + str(defecto)
            + Colores.RESET + "\n     > "
        ).strip()

        if respuesta == "":
            return defecto

        return respuesta

    def preguntarEntero(self, texto, defecto):
        while True:
            valor = self.preguntarTexto(texto, defecto)

            try:
                valor = int(valor)
                assert valor > 1, "El tamaño del registro debe ser mayor que 1"
                return valor
            except Exception as error:
                self.error(str(error))

    def normalizarRuta(self, ruta):
        ruta = os.path.expandvars(os.path.expanduser(ruta.strip()))

        if not os.path.isabs(ruta):
            ruta = os.path.join(self.directorioInstalador, ruta)

        ruta = os.path.abspath(os.path.normpath(ruta)).replace("\\", "/")

        if not ruta.endswith("/"):
            ruta += "/"

        return ruta

    def cargarConfiguracionActual(self):
        try:
            archivo = open(self.archivoConfiguracion, 'r', encoding='utf-8')
            configuracion = json.load(archivo)
            archivo.close()

            assert isinstance(configuracion, dict), "La configuración debe ser un objeto JSON"
            assert "instalacion" in configuracion, "Falta la propiedad 'instalacion'"
            assert "tamanoRegistro" in configuracion, "Falta la propiedad 'tamanoRegistro'"
            assert str(configuracion["instalacion"]).strip() != "", "La ruta de instalación está vacía"
            assert int(configuracion["tamanoRegistro"]) > 1, "El tamaño del registro debe ser mayor que 1"

            configuracion["tamanoRegistro"] = int(configuracion["tamanoRegistro"])
            return configuracion
        except Exception as error:
            self.error("El config.json existente no se ha podido leer correctamente.")
            self.error(str(error))
            return None

    def mostrarConfiguracion(self, configuracion):
        print()
        self.linea("─", Colores.SUAVE)
        self.centrar("CONFIGURACIÓN", Colores.NEGRITA + Colores.BLANCO)
        self.linea("─", Colores.SUAVE)
        print()
        print("  " + Colores.SUAVE + "Ruta de datos:" + Colores.RESET)
        print("    " + Colores.CYAN + str(configuracion.get("instalacion", "")) + Colores.RESET)
        print()
        print(
            "  " + Colores.SUAVE + "Tamaño del registro:" + Colores.RESET
            + " " + Colores.MAGENTA
            + str(configuracion.get("tamanoRegistro", "")) + " bytes"
            + Colores.RESET
        )
        print()

    def crearConfiguracion(self, configuracionAnterior=None):
        if configuracionAnterior is None:
            configuracionAnterior = {}

        instalacionDefecto = configuracionAnterior.get(
            "instalacion",
            "C:/pierodev-basededatos/"
        )
        tamanoDefecto = configuracionAnterior.get("tamanoRegistro", 512)

        print()
        self.info("Indica dónde se guardarán las bases de datos.")
        print()

        instalacion = self.preguntarTexto(
            "Ruta de instalación de los datos",
            instalacionDefecto
        )
        instalacion = self.normalizarRuta(instalacion)

        tamanoRegistro = self.preguntarEntero(
            "Tamaño fijo de cada registro en bytes",
            tamanoDefecto
        )

        configuracion = {
            "instalacion": instalacion,
            "tamanoRegistro": tamanoRegistro
        }

        self.mostrarConfiguracion(configuracion)

        if not self.preguntaSiNo("¿Guardar esta configuración?", True):
            self.aviso("Configuración cancelada.")
            return None

        return configuracion

    def guardarConfiguracion(self, configuracion):
        temporal = self.archivoConfiguracion + ".tmp"

        try:
            archivo = open(temporal, 'w', encoding='utf-8')
            json.dump(configuracion, archivo, ensure_ascii=False, indent=2)
            archivo.write("\n")
            archivo.close()

            os.replace(temporal, self.archivoConfiguracion)
            self.exito("config.json guardado correctamente.")
            return True
        except Exception as error:
            self.error("No se ha podido guardar config.json.")
            self.error(str(error))

            if os.path.exists(temporal):
                os.remove(temporal)

            return False

    def crearDirectorioDatos(self, configuracion):
        try:
            ruta = configuracion["instalacion"]
            os.makedirs(ruta, exist_ok=True)
            self.exito("Directorio de datos preparado.")
            self.info(ruta)
            return True
        except Exception as error:
            self.error("No se ha podido crear el directorio de datos.")
            self.error(str(error))
            return False

    def comprobarBiblioteca(self):
        if os.path.isfile(self.archivoBiblioteca):
            self.exito("Biblioteca PierodevBBDD.py encontrada.")
            return True

        self.error("No se encuentra PierodevBBDD.py junto al instalador.")
        return False

    def pausa(self):
        input(
            "\n  " + Colores.SUAVE
            + "Pulsa ENTER para cerrar el instalador..."
            + Colores.RESET
        )

    def finalizar(self):
        print()
        self.linea("═", Colores.VERDE)
        self.centrar("✔ INSTALACIÓN COMPLETADA", Colores.VERDE + Colores.NEGRITA)
        self.linea("═", Colores.VERDE)
        print()
        self.centrar("PierodevBBDD está preparada para utilizarse.")

    def ejecutar(self):
        try:
            self.prepararTerminal()
            self.titulo()
            self.info("Directorio del instalador: " + self.directorioInstalador)
            print()

            self.paso(1, 3, "Comprobando la biblioteca")

            if not self.comprobarBiblioteca():
                self.pausa()
                return

            print()
            self.paso(2, 3, "Revisando la configuración")

            if os.path.isfile(self.archivoConfiguracion):
                self.aviso("Se ha encontrado un archivo config.json existente.")
                configuracionActual = self.cargarConfiguracionActual()

                if configuracionActual is not None:
                    self.mostrarConfiguracion(configuracionActual)

                sobrescribir = self.preguntaSiNo(
                    "¿Quieres sobrescribir config.json?",
                    False
                )

                if sobrescribir:
                    configuracion = self.crearConfiguracion(configuracionActual)

                    if configuracion is None:
                        self.pausa()
                        return

                    if not self.guardarConfiguracion(configuracion):
                        self.pausa()
                        return
                else:
                    if configuracionActual is None:
                        self.error("No se puede continuar sin una configuración válida.")
                        self.pausa()
                        return

                    configuracion = configuracionActual
                    self.info("Se conserva el config.json existente.")
            else:
                self.aviso("No existe config.json.")
                self.info("Se creará una nueva configuración.")
                configuracion = self.crearConfiguracion()

                if configuracion is None:
                    self.pausa()
                    return

                if not self.guardarConfiguracion(configuracion):
                    self.pausa()
                    return

            print()
            self.paso(3, 3, "Preparando el directorio de datos")

            if not self.crearDirectorioDatos(configuracion):
                self.pausa()
                return

            self.finalizar()
            self.pausa()
        except KeyboardInterrupt:
            print()
            print()
            self.aviso("Instalación cancelada por el usuario.")
        except Exception as error:
            print()
            self.error("Se ha producido un error durante la instalación:")
            self.error(str(error))


if __name__ == "__main__":
    instalador = InstaladorPierodevBBDD()
    instalador.ejecutar()
