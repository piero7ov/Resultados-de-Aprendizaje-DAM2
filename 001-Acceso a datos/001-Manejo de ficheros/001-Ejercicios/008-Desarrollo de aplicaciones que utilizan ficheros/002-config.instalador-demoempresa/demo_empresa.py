#!/usr/bin/env python3

import os
import shutil
import sys

from PierodevBBDD import PierodevBBDD, PierodevSerializador


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


class AplicacionEmpresa:
    def __init__(self):
        self.prepararTerminal()
        self.bbdd = PierodevBBDD()
        self.nombreBaseDatos = "empresa_demo"
        columnas = shutil.get_terminal_size((100, 24)).columns
        self.ancho = max(82, min(columnas - 2, 104))

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

    def cabecera(self, titulo, subtitulo="Aplicación empresarial CRUD"):
        self.limpiar()
        print(Colores.CYAN + "╔" + "═" * (self.ancho - 2) + "╗" + Colores.RESET)
        print(
            Colores.CYAN + "║" + Colores.RESET
            + Colores.NEGRITA + Colores.BLANCO
            + titulo.center(self.ancho - 2)
            + Colores.RESET + Colores.CYAN + "║" + Colores.RESET
        )
        print(
            Colores.CYAN + "║" + Colores.RESET
            + Colores.SUAVE + subtitulo.center(self.ancho - 2)
            + Colores.RESET + Colores.CYAN + "║" + Colores.RESET
        )
        print(Colores.CYAN + "╚" + "═" * (self.ancho - 2) + "╝" + Colores.RESET)
        print()

    def mensaje(self, simbolo, texto, color):
        print("  " + color + simbolo + Colores.RESET + "  " + texto)

    def exito(self, texto):
        self.mensaje("✔", texto, Colores.VERDE)

    def error(self, texto):
        self.mensaje("✘", texto, Colores.ROJO)

    def aviso(self, texto):
        self.mensaje("!", texto, Colores.AMARILLO)

    def info(self, texto):
        self.mensaje("●", texto, Colores.CYAN)

    def pausa(self):
        input("\n  " + Colores.SUAVE + "Pulsa ENTER para continuar..." + Colores.RESET)

    def pedir(self, texto, defecto=""):
        if defecto != "":
            respuesta = input(
                "  " + Colores.AMARILLO + "› " + Colores.RESET
                + texto + " " + Colores.SUAVE + "[" + str(defecto) + "]"
                + Colores.RESET + ": "
            ).strip()

            if respuesta == "":
                return str(defecto)

            return respuesta

        return input(
            "  " + Colores.AMARILLO + "› " + Colores.RESET + texto + ": "
        ).strip()

    def confirmar(self, texto):
        respuesta = input(
            "\n  " + Colores.AMARILLO + "? " + Colores.RESET
            + texto + " " + Colores.SUAVE + "[s/N]" + Colores.RESET + " "
        ).strip().lower()

        return respuesta in ["s", "si", "sí", "y", "yes"]

    def prepararBaseDatos(self):
        try:
            os.makedirs(self.bbdd.instalacion, exist_ok=True)
            ruta = self.bbdd.instalacion + self.nombreBaseDatos

            if not os.path.isdir(ruta):
                self.bbdd.creaBaseDatos(self.nombreBaseDatos)

            self.bbdd.usaBaseDatos(self.nombreBaseDatos)

            if not os.path.isfile(ruta + "/clientes.csv"):
                self.bbdd.creaTabla(
                    "clientes",
                    "nombre,apellidos,email,telefono,empresa"
                )

            if not os.path.isfile(ruta + "/productos.csv"):
                self.bbdd.creaTabla(
                    "productos",
                    "nombre,categoria,precio,stock"
                )

            return True
        except Exception as error:
            self.error("No se ha podido preparar la base de datos.")
            self.error(str(error))
            return False

    def obtenerTodos(self, tabla):
        try:
            esquema = self.bbdd.obtenerEsquema(tabla)
            assert esquema is not None, "No se ha podido obtener el esquema"

            ruta = (
                self.bbdd.instalacion + self.bbdd.basededatos
                + "/" + tabla + ".csv"
            )
            resultados = []
            serial = PierodevSerializador()
            archivo = open(ruta, 'rb')

            while True:
                bloque = archivo.read(self.bbdd.tamanoRegistro)

                if bloque == b"":
                    break

                cadena = bloque.decode("utf-8").rstrip("\n").rstrip()

                if cadena != "":
                    elementos = serial.deserializar(cadena)

                    if elementos is not None and len(elementos) == len(esquema):
                        if elementos[1] == "1":
                            registro = {}

                            for i in range(len(esquema)):
                                registro[esquema[i]] = elementos[i]

                            resultados.append(registro)

            archivo.close()
            return resultados
        except Exception as error:
            self.error("No se han podido recuperar los registros.")
            print(error)
            return []

    def tabla(self, registros, columnas):
        if len(registros) == 0:
            self.aviso("No hay registros para mostrar.")
            return

        borde = "  +"

        for clave, titulo, ancho in columnas:
            borde += "-" * (ancho + 2) + "+"

        print(Colores.SUAVE + borde + Colores.RESET)
        cabecera = "  |"

        for clave, titulo, ancho in columnas:
            cabecera += " " + titulo[:ancho].ljust(ancho) + " |"

        print(Colores.NEGRITA + cabecera + Colores.RESET)
        print(Colores.SUAVE + borde + Colores.RESET)

        for registro in registros:
            fila = "  |"

            for clave, titulo, ancho in columnas:
                valor = str(registro.get(clave, ""))
                fila += " " + valor[:ancho].ljust(ancho) + " |"

            print(fila)

        print(Colores.SUAVE + borde + Colores.RESET)
        print("\n  " + Colores.SUAVE + str(len(registros)) + " registro(s)" + Colores.RESET)

    def leerId(self, texto):
        valor = self.pedir(texto)

        try:
            return int(valor)
        except Exception:
            self.error("El ID debe ser numérico.")
            return None

    def validarProducto(self, precio, stock):
        try:
            precioNumero = float(precio.replace(",", "."))
            stockNumero = int(stock)
            assert precioNumero >= 0, "El precio no puede ser negativo"
            assert stockNumero >= 0, "El stock no puede ser negativo"
            return True
        except Exception as error:
            self.error("Precio o stock incorrectos.")
            self.error(str(error))
            return False

    # CLIENTES

    def listarClientes(self):
        self.cabecera("CLIENTES", "Listado de clientes activos")
        self.tabla(
            self.obtenerTodos("clientes"),
            [
                ("id", "ID", 4),
                ("nombre", "Nombre", 14),
                ("apellidos", "Apellidos", 18),
                ("email", "Email", 25),
                ("telefono", "Teléfono", 13)
            ]
        )

    def crearCliente(self):
        self.cabecera("NUEVO CLIENTE")
        nombre = self.pedir("Nombre")
        apellidos = self.pedir("Apellidos")
        email = self.pedir("Email")
        telefono = self.pedir("Teléfono")
        empresa = self.pedir("Empresa")

        if nombre == "":
            self.error("El nombre es obligatorio.")
            self.pausa()
            return

        id = self.bbdd.insertarDatos(
            "clientes",
            [nombre, apellidos, email, telefono, empresa]
        )

        if id is not None:
            self.exito("Cliente creado con ID " + str(id) + ".")

        self.pausa()

    def editarCliente(self):
        self.listarClientes()
        id = self.leerId("ID del cliente que quieres editar")

        if id is None:
            self.pausa()
            return

        cliente = self.bbdd.seleccionar("clientes", id)

        if cliente is None:
            self.error("No se ha encontrado el cliente.")
            self.pausa()
            return

        print()
        self.info("Pulsa ENTER para conservar el valor actual.")
        print()

        nombre = self.pedir("Nombre", cliente["nombre"])
        apellidos = self.pedir("Apellidos", cliente["apellidos"])
        email = self.pedir("Email", cliente["email"])
        telefono = self.pedir("Teléfono", cliente["telefono"])
        empresa = self.pedir("Empresa", cliente["empresa"])

        self.bbdd.actualizar(
            "clientes",
            id,
            [nombre, apellidos, email, telefono, empresa]
        )
        self.exito("Cliente actualizado.")
        self.pausa()

    def eliminarCliente(self):
        self.listarClientes()
        id = self.leerId("ID del cliente que quieres eliminar")

        if id is None:
            self.pausa()
            return

        cliente = self.bbdd.seleccionar("clientes", id)

        if cliente is None:
            self.error("No se ha encontrado el cliente.")
            self.pausa()
            return

        print()
        self.info("Cliente: " + cliente["nombre"] + " " + cliente["apellidos"])

        if self.confirmar("¿Eliminar este cliente?"):
            self.bbdd.eliminar("clientes", id)
            self.exito("Cliente eliminado.")
        else:
            self.aviso("Operación cancelada.")

        self.pausa()

    def menuClientes(self):
        while True:
            self.cabecera("GESTIÓN DE CLIENTES")
            print("  " + Colores.CYAN + "[1]" + Colores.RESET + " Listar clientes")
            print("  " + Colores.CYAN + "[2]" + Colores.RESET + " Nuevo cliente")
            print("  " + Colores.CYAN + "[3]" + Colores.RESET + " Editar cliente")
            print("  " + Colores.CYAN + "[4]" + Colores.RESET + " Eliminar cliente")
            print()
            print("  " + Colores.SUAVE + "[0] Volver" + Colores.RESET)

            opcion = self.pedir("Selecciona una opción")

            if opcion == "1":
                self.listarClientes()
                self.pausa()
            elif opcion == "2":
                self.crearCliente()
            elif opcion == "3":
                self.editarCliente()
            elif opcion == "4":
                self.eliminarCliente()
            elif opcion == "0":
                break
            else:
                self.aviso("Opción no válida.")
                self.pausa()

    # PRODUCTOS

    def listarProductos(self):
        self.cabecera("PRODUCTOS", "Catálogo de productos activos")
        self.tabla(
            self.obtenerTodos("productos"),
            [
                ("id", "ID", 4),
                ("nombre", "Producto", 28),
                ("categoria", "Categoría", 20),
                ("precio", "Precio", 12),
                ("stock", "Stock", 8)
            ]
        )

    def crearProducto(self):
        self.cabecera("NUEVO PRODUCTO")
        nombre = self.pedir("Nombre")
        categoria = self.pedir("Categoría")
        precio = self.pedir("Precio")
        stock = self.pedir("Stock")

        if nombre == "":
            self.error("El nombre es obligatorio.")
            self.pausa()
            return

        if not self.validarProducto(precio, stock):
            self.pausa()
            return

        id = self.bbdd.insertarDatos(
            "productos",
            [nombre, categoria, precio.replace(",", "."), stock]
        )

        if id is not None:
            self.exito("Producto creado con ID " + str(id) + ".")

        self.pausa()

    def editarProducto(self):
        self.listarProductos()
        id = self.leerId("ID del producto que quieres editar")

        if id is None:
            self.pausa()
            return

        producto = self.bbdd.seleccionar("productos", id)

        if producto is None:
            self.error("No se ha encontrado el producto.")
            self.pausa()
            return

        print()
        self.info("Pulsa ENTER para conservar el valor actual.")
        print()

        nombre = self.pedir("Nombre", producto["nombre"])
        categoria = self.pedir("Categoría", producto["categoria"])
        precio = self.pedir("Precio", producto["precio"])
        stock = self.pedir("Stock", producto["stock"])

        if not self.validarProducto(precio, stock):
            self.pausa()
            return

        self.bbdd.actualizar(
            "productos",
            id,
            [nombre, categoria, precio.replace(",", "."), stock]
        )
        self.exito("Producto actualizado.")
        self.pausa()

    def eliminarProducto(self):
        self.listarProductos()
        id = self.leerId("ID del producto que quieres eliminar")

        if id is None:
            self.pausa()
            return

        producto = self.bbdd.seleccionar("productos", id)

        if producto is None:
            self.error("No se ha encontrado el producto.")
            self.pausa()
            return

        print()
        self.info("Producto: " + producto["nombre"])

        if self.confirmar("¿Eliminar este producto?"):
            self.bbdd.eliminar("productos", id)
            self.exito("Producto eliminado.")
        else:
            self.aviso("Operación cancelada.")

        self.pausa()

    def menuProductos(self):
        while True:
            self.cabecera("GESTIÓN DE PRODUCTOS")
            print("  " + Colores.CYAN + "[1]" + Colores.RESET + " Listar productos")
            print("  " + Colores.CYAN + "[2]" + Colores.RESET + " Nuevo producto")
            print("  " + Colores.CYAN + "[3]" + Colores.RESET + " Editar producto")
            print("  " + Colores.CYAN + "[4]" + Colores.RESET + " Eliminar producto")
            print()
            print("  " + Colores.SUAVE + "[0] Volver" + Colores.RESET)

            opcion = self.pedir("Selecciona una opción")

            if opcion == "1":
                self.listarProductos()
                self.pausa()
            elif opcion == "2":
                self.crearProducto()
            elif opcion == "3":
                self.editarProducto()
            elif opcion == "4":
                self.eliminarProducto()
            elif opcion == "0":
                break
            else:
                self.aviso("Opción no válida.")
                self.pausa()

    # DASHBOARD

    def dashboard(self):
        clientes = self.obtenerTodos("clientes")
        productos = self.obtenerTodos("productos")
        stockTotal = 0
        valorInventario = 0.0

        for producto in productos:
            try:
                stock = int(producto["stock"])
                precio = float(producto["precio"].replace(",", "."))
                stockTotal += stock
                valorInventario += stock * precio
            except Exception:
                pass

        self.cabecera("PIERODEV EMPRESA", "Gestión empresarial con PierodevBBDD")

        tarjetas = [
            ("CLIENTES", str(len(clientes)), Colores.CYAN),
            ("PRODUCTOS", str(len(productos)), Colores.MAGENTA),
            ("VALOR INVENTARIO", "%.2f €" % valorInventario, Colores.VERDE)
        ]
        anchoTarjeta = 25
        borde = "  " + "  ".join(["+" + "-" * anchoTarjeta + "+" for tarjeta in tarjetas])
        print(Colores.SUAVE + borde + Colores.RESET)

        titulos = "  "
        valores = "  "

        for titulo, valor, color in tarjetas:
            titulos += "|" + color + titulo.center(anchoTarjeta) + Colores.RESET + "|  "
            valores += "|" + Colores.NEGRITA + valor.center(anchoTarjeta) + Colores.RESET + "|  "

        print(titulos.rstrip())
        print(valores.rstrip())
        print(Colores.SUAVE + borde + Colores.RESET)
        print()
        self.info("Unidades totales en inventario: " + str(stockTotal))

    def despedida(self):
        self.cabecera("PIERODEV EMPRESA", "Sesión finalizada")
        arte = [
            "  ____  ___ _____ ____   ___  ____  _______     __",
            " |  _ \\|_ _| ____|  _ \\ / _ \\|  _ \\| ____\\ \\   / /",
            " | |_) || ||  _| | |_) | | | | | | |  _|  \\ \\ / / ",
            " |  __/ | || |___|  _ <| |_| | |_| | |___  \\ V /  ",
            " |_|   |___|_____|_| \\_\\___/|____/|_____|  \\_/   "
        ]

        for lineaArte in arte:
            self.centrar(lineaArte, Colores.CYAN + Colores.NEGRITA)

        print()
        self.centrar("Gracias por utilizar la demostración.", Colores.VERDE)
        print()

    def ejecutar(self):
        try:
            if not self.prepararBaseDatos():
                return

            while True:
                self.dashboard()
                print()
                self.linea()
                print()
                print("  " + Colores.NEGRITA + "MENÚ PRINCIPAL" + Colores.RESET)
                print()
                print("  " + Colores.CYAN + "[1]" + Colores.RESET + " Gestión de clientes")
                print("  " + Colores.CYAN + "[2]" + Colores.RESET + " Gestión de productos")
                print("  " + Colores.CYAN + "[3]" + Colores.RESET + " Actualizar dashboard")
                print()
                print("  " + Colores.SUAVE + "[0] Salir" + Colores.RESET)

                opcion = self.pedir("Selecciona una opción")

                if opcion == "1":
                    self.menuClientes()
                elif opcion == "2":
                    self.menuProductos()
                elif opcion == "3":
                    pass
                elif opcion == "0":
                    self.despedida()
                    break
                else:
                    self.aviso("Opción no válida.")
                    self.pausa()
        except KeyboardInterrupt:
            print()
            self.aviso("Aplicación finalizada por el usuario.")
        except Exception as error:
            print()
            self.error("Se ha producido un error general:")
            self.error(str(error))


if __name__ == "__main__":
    aplicacion = AplicacionEmpresa()
    aplicacion.ejecutar()
