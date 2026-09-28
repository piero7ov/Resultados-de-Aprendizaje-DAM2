"""Demo empresarial en terminal. Ejecutar: python consola_unicorn.py

Por defecto utiliza unicorn_demo, una base separada con datos ficticios.
--base nombre abre otra base (vacía si se confirma su creación).
--config ruta permite otra configuración; --sin-color desactiva ANSI.
No hay escrituras al importar el módulo. No abrir dos consolas sobre la misma base.
"""

import argparse
import csv
import os
import re
import shutil
import sys
import textwrap

from UnicornBBDD import UnicornBBDD
from UnicornLibreria import UnicornLibreria
from UnicornIntercambio import UnicornIntercambio
from UnicornCopias import UnicornCopias
from datos_demo import BASE_DEMO, abrirDemo


class OperacionCancelada(Exception):
    """Permite volver al menú sin guardar el formulario en curso."""


class ConsolaUnicorn:
    """Recoge entradas y presenta resultados; las reglas comerciales están en UnicornLibreria."""

    def __init__(self, app=None, entrada=None, salida=None, color=None):
        """Acepta entrada y salida sustituibles para probar la consola sin intervención manual."""
        self.app = app
        self.entrada = entrada or input
        self.salida = salida or print
        self.color = self._activarColor() if color is None else color
        # Las pruebas y las entradas por tubería no necesitan pausas ni limpieza de pantalla.
        self.interactiva = entrada is None and salida is None and sys.stdin.isatty() and sys.stdout.isatty()

    def ancho(self):
        """Adapta marcos y tablas al espacio disponible en la terminal."""
        return max(20, min(100, shutil.get_terminal_size((88, 24)).columns - 2))

    def limpiar(self):
        """Limpia solo una terminal interactiva con ANSI, sin ejecutar comandos del sistema."""
        if self.interactiva and self.color:
            self.salida("\033[2J\033[H")

    def pausa(self):
        """Mantiene los resultados visibles antes de volver al menú."""
        if self.interactiva:
            self.entrada("  [ ENTER ] Volver al menú...")

    def _seguro(self, texto):
        """Sustituye controles antes de medir o mostrar contenido procedente de registros."""
        return "".join(caracter if caracter.isprintable() else " " for caracter in str(texto))

    def _activarColor(self):
        """Activa colores solo en terminales compatibles; respeta NO_COLOR."""
        if not sys.stdout.isatty() or "NO_COLOR" in os.environ:
            return False
        if os.name == "nt":
            import ctypes
            from ctypes import wintypes
            sistema = ctypes.windll.kernel32
            sistema.GetStdHandle.restype = wintypes.HANDLE  # Evita truncar identificadores en Windows de 64 bits.
            sistema.GetStdHandle.argtypes = [wintypes.DWORD]
            sistema.GetConsoleMode.argtypes = [wintypes.HANDLE, ctypes.POINTER(wintypes.DWORD)]
            sistema.SetConsoleMode.argtypes = [wintypes.HANDLE, wintypes.DWORD]
            modo = wintypes.DWORD()
            terminal = sistema.GetStdHandle(-11)
            if not sistema.GetConsoleMode(terminal, ctypes.byref(modo)):
                return False
            return bool(sistema.SetConsoleMode(terminal, modo.value | 4))
        return os.environ.get("TERM") != "dumb"

    def mostrar(self, texto="", tono=""):
        """Muestra texto sin caracteres de control procedentes de los datos."""
        seguro = self._seguro(texto)
        colores = {"titulo": "1;96", "bien": "92", "aviso": "93", "error": "91",
                   "acento": "1;95", "suave": "90", "texto": "97"}
        if self.color and tono in colores:
            seguro = "\033[" + colores[tono] + "m" + seguro + "\033[0m"
        self.salida(seguro)

    def cabecera(self, titulo):
        """Dibuja la identidad ASCII y el contexto de cada pantalla."""
        self.limpiar()
        ancho = self.ancho()
        self.mostrar()
        logo = [
            "U   U  N   N  III   CCC   OOO   RRRR   N   N",
            "U   U  NN  N   I   C     O   O  R   R  NN  N",
            "U   U  N N N   I   C     O   O  RRRR   N N N",
            "U   U  N  NN   I   C     O   O  R  R   N  NN",
            " UUU   N   N  III   CCC   OOO   R   R  N   N"
        ]
        if titulo in ("BIENVENIDA", "LIBRERÍA") and ancho >= 48:
            # En pantallas bajas el menú cabe mejor con una firma compacta.
            alto = shutil.get_terminal_size((88, 24)).lines
            firma = logo if titulo == "BIENVENIDA" or alto >= 32 else ["<>----  U N I C O R N  ----<>"]
            for linea in firma:
                self.mostrar(linea.center(ancho), "acento")
            self.mostrar("LIBROS  /  PERSONAS  /  HISTORIAS".center(ancho), "suave")
            self.mostrar()
        self.mostrar("+" + "=" * (ancho - 2) + "+", "titulo")
        for linea in textwrap.wrap(self._seguro("UNICORN  /  " + titulo), ancho - 6):
            self.mostrar("|  " + linea.ljust(ancho - 6) + "  |", "titulo")
        if self.app:
            etiqueta = "GESTIÓN DE LIBRERÍA"
            self.mostrar("|  " + etiqueta.ljust(ancho - 6) + "  |", "suave")
        self.mostrar("+" + "=" * (ancho - 2) + "+", "titulo")
        self.mostrar()

    def tabla(self, registros, columnas):
        """Presenta filas enmarcadas; envuelve texto largo y usa fichas en pantallas estrechas."""
        if not registros:
            self.mostrar("  ( Sin registros para mostrar )", "suave")
            return
        ancho = sum(columna[2] for columna in columnas) + 3 * len(columnas) + 1
        if ancho > self.ancho():
            # No se cortan campos para hacerlos caber: se cambia la disposición.
            for registro in registros:
                self.ficha({titulo: registro.get(clave, "") for clave, titulo, _ in columnas})
            return
        borde = "+" + "+".join("-" * (tamano + 2) for _, _, tamano in columnas) + "+"
        self.mostrar(borde, "suave")
        self.mostrar("| " + " | ".join(titulo.ljust(tamano) for _, titulo, tamano in columnas) + " |", "titulo")
        self.mostrar(borde, "suave")
        for registro in registros:
            celdas = [textwrap.wrap(self._seguro(registro.get(clave, "")), tamano) or [""]
                      for clave, _, tamano in columnas]
            tono = registro.get("_tono", "texto")
            for numero in range(max(map(len, celdas))):
                self.mostrar("| " + " | ".join(
                    (celda[numero] if numero < len(celda) else "").ljust(columna[2])
                    for celda, columna in zip(celdas, columnas)) + " |", tono)
            self.mostrar(borde, "suave")
        self.mostrar(f"  {len(registros)} registro(s)", "suave")

    def leer(self, mensaje):
        """Lee una respuesta; ! cancela el formulario antes de guardar."""
        prompt = self._seguro(mensaje)
        if self.color:
            prompt = "\033[93m  > " + prompt.strip() + "\033[0m"
        valor = self.entrada(prompt).strip()
        if valor == "!":
            raise OperacionCancelada()
        return valor

    def texto(self, etiqueta, obligatorio=False, actual=None):
        """Pide un texto; al editar, Enter conserva el valor y - vacía campos opcionales."""
        while True:
            pista = " [Enter conserva]" if actual is not None else ""
            valor = self.leer(etiqueta + pista + ": ")
            if valor == "" and actual is not None:
                return actual
            if valor == "-" and not obligatorio:
                return ""
            if valor or not obligatorio:
                return valor
            self.mostrar("Este campo es obligatorio.", "aviso")

    def entero(self, etiqueta, minimo=1, actual=None):
        """Pide un entero y repite ante valores que no cumplen el formato."""
        while True:
            valor = self.leer(etiqueta + (f" [{actual}]" if actual is not None else "") + ": ")
            if valor == "" and actual is not None:
                return int(actual)
            if re.fullmatch(r"[0-9]+", valor) and int(valor) >= minimo:
                return int(valor)
            self.mostrar("Introduce un entero mayor o igual que " + str(minimo) + ".", "aviso")

    def precio(self, actual=None):
        """Convierte euros a céntimos mediante texto, sin errores de coma flotante."""
        while True:
            valor = self.leer("Precio EUR" + (f" [{self.dinero(actual)}]" if actual is not None else "") + ": ")
            if valor == "" and actual is not None:
                return int(actual)
            if re.fullmatch(r"[0-9]+([,.][0-9]{1,2})?", valor):
                partes = valor.replace(",", ".").split(".")
                return int(partes[0]) * 100 + int((partes[1] if len(partes) == 2 else "").ljust(2, "0"))
            self.mostrar("Usa un precio positivo o cero, por ejemplo 12,50 (máximo dos decimales).", "aviso")

    def dinero(self, centimos):
        """Presenta un importe entero en euros con dos decimales."""
        return f"{int(centimos) // 100},{int(centimos) % 100:02d} EUR"

    def confirmar(self, mensaje):
        """Solicita confirmación explícita; Enter significa no."""
        while True:
            valor = self.leer(mensaje + " [s/N]: ").lower()
            if valor in ("s", "si", "sí"):
                return True
            if valor in ("", "n", "no"):
                return False
            self.mostrar("Responde s o n.", "aviso")

    def ficha(self, registro):
        """Presenta campos completos para no ocultar información al editar."""
        ancho = self.ancho()
        self.mostrar("+" + "-" * (ancho - 2) + "+", "suave")
        for campo, valor in registro.items():
            for linea in textwrap.wrap(self._seguro(campo) + ": " + self._seguro(valor), ancho - 6):
                self.mostrar("|  " + linea.ljust(ancho - 6) + "  |")
        self.mostrar("+" + "-" * (ancho - 2) + "+", "suave")

    def _elegir(self, registros, etiqueta):
        """Selecciona por ID un registro de la lista y vuelve a preguntar si no existe."""
        if not registros:
            raise ValueError("No hay " + etiqueta + " disponibles")
        opciones = {int(registro["id"]): registro for registro in registros}
        while True:
            id = self.entero("Número de " + etiqueta + " (columna Ref. o Pedido)")
            if id in opciones:
                return opciones[id]
            self.mostrar("Ese ID no está en la lista.", "aviso")

    def fichaRegistro(self, registro):
        """Traduce campos técnicos para los resúmenes, sin modificar el registro original."""
        etiquetas = {"id": "Referencia", "activo": "Estado", "nombre": "Nombre",
                     "apellidos": "Apellidos", "email": "Correo", "telefono": "Teléfono",
                     "isbn": "ISBN", "titulo": "Título", "autor": "Autor",
                     "precio_centimos": "Precio", "stock": "Stock físico"}
        visibles = {}
        for campo, valor in registro.items():
            if campo == "activo":
                valor = "Activo" if str(valor) == "1" else "Inactivo"
            elif campo == "precio_centimos":
                valor = self.dinero(valor)
            elif campo == "stock":
                valor = str(valor) + " unidades"
            visibles[etiquetas.get(campo, campo)] = valor if valor != "" else "Sin indicar"
        self.ficha(visibles)

    def listarClientes(self, historial=False):
        """Muestra clientes activos o también inactivos y devuelve la lista para seleccionarlos."""
        clientes = self.app.listarClientes(historial)
        filas = [{"id": c["id"], "nombre": c["nombre"] + " " + c["apellidos"],
                  "contacto": c["email"] + (" / " + c["telefono"] if c["telefono"] else ""),
                  "estado": "ACTIVO" if c["activo"] == "1" else "INACTIVO",
                  "_tono": "texto" if c["activo"] == "1" else "suave"} for c in clientes]
        self.tabla(filas, [("id", "Ref.", 4), ("nombre", "Cliente", 23),
                           ("contacto", "Contacto", 28), ("estado", "Estado", 8)])
        return clientes

    def cliente(self, editar=False):
        """Recoge un alta o edición y guarda solo tras mostrar su resumen."""
        anterior = self._elegir(self.listarClientes(), "cliente") if editar else {}
        if anterior:
            self.fichaRegistro(anterior)
        datos = [self.texto(campo, campo == "nombre", anterior.get(campo))
                 for campo in ("nombre", "apellidos", "email", "telefono")]
        self.fichaRegistro(dict(zip(("nombre", "apellidos", "email", "telefono"), datos)))
        if self.confirmar("¿Guardar cliente?"):
            resultado = (self.app.actualizarCliente(anterior["id"], *datos) if editar
                         else self.app.crearCliente(*datos))
            self.mostrar("Cliente actualizado." if editar else f"Cliente creado: #{resultado}", "bien")

    def listarLibros(self, historial=False):
        """Presenta catálogo, precio y existencias físicas, reservadas y disponibles."""
        libros = self.app.listarLibros(historial)
        filas = []
        for libro in libros:
            fila = {"id": libro["id"], "libro": libro["titulo"] + " / " + libro["autor"],
                    "isbn": libro["isbn"], "precio": self.dinero(libro["precio_centimos"]),
                    "stock": "Inactivo. Físico: " + libro["stock"], "_tono": "suave"}
            if libro["activo"] == "1":
                stock = self.app.consultarStock(libro["id"])
                fila["stock"] = f"Físico: {stock['fisico']} Reservado: {stock['reservado']} Disponible: {stock['disponible']}"
                fila["_tono"] = "aviso" if stock["disponible"] == 0 else "texto"
            filas.append(fila)
        self.mostrar("  Existencias expresadas en unidades.", "suave")
        self.tabla(filas, [("id", "Ref.", 4), ("libro", "Libro / autor", 23), ("isbn", "ISBN", 13),
                           ("precio", "Precio", 10), ("stock", "Existencias", 16)])
        return libros

    def libro(self, editar=False):
        """Recoge catálogo y stock físico; delega todas las validaciones comerciales."""
        anterior = self._elegir(self.listarLibros(), "libro") if editar else {}
        if anterior:
            self.fichaRegistro(anterior)
        datos = [self.texto(campo, campo != "autor", anterior.get(campo)) for campo in ("isbn", "titulo", "autor")]
        datos += [self.precio(anterior.get("precio_centimos")),
                  self.entero("Stock físico", 0, anterior.get("stock"))]
        self.fichaRegistro(dict(zip(("isbn", "titulo", "autor", "precio_centimos", "stock"), datos)))
        if self.confirmar("¿Guardar libro?"):
            resultado = (self.app.actualizarLibro(anterior["id"], *datos) if editar
                         else self.app.crearLibro(*datos))
            self.mostrar("Libro actualizado." if editar else f"Libro creado: #{resultado}", "bien")

    def desactivar(self, tipo):
        """Confirma la baja lógica y deja que la aplicación compruebe reservas pendientes."""
        registros = self.listarClientes() if tipo == "cliente" else self.listarLibros()
        registro = self._elegir(registros, tipo)
        self.fichaRegistro(registro)
        if self.confirmar("¿Desactivar este " + tipo + " conservando su historial?"):
            metodo = self.app.desactivarCliente if tipo == "cliente" else self.app.desactivarLibro
            metodo(registro["id"])
            self.mostrar("Registro desactivado.", "bien")

    def reactivar(self, tipo):
        """Muestra solo inactivos con nombres legibles y confirma su reactivación."""
        registros = self.app.listarClientes(True) if tipo == "cliente" else self.app.listarLibros(True)
        inactivos = [registro for registro in registros if registro["activo"] == "0"]
        if not inactivos:
            self.mostrar("No hay " + ("clientes" if tipo == "cliente" else "libros") + " inactivos.", "aviso")
            return
        filas = [{"id": r["id"], "nombre": (r["nombre"] + " " + r["apellidos"]).strip()
                  if tipo == "cliente" else r["titulo"] + " / " + r["autor"],
                  "estado": "Inactivo"} for r in inactivos]
        self.tabla(filas, [("id", "Ref.", 4), ("nombre", "Cliente" if tipo == "cliente" else "Libro / autor", 36),
                          ("estado", "Estado", 8)])
        registro = self._elegir(inactivos, tipo)
        self.fichaRegistro(registro)
        self.mostrar("Se conservarán el historial y los datos. Los pedidos no cambiarán.", "suave")
        if self.confirmar("¿Reactivar este " + tipo + "?"):
            metodo = self.app.reactivarCliente if tipo == "cliente" else self.app.reactivarLibro
            metodo(registro["id"])
            self.mostrar("Cliente reactivado." if tipo == "cliente" else "Libro reactivado.", "bien")

    def crearPedido(self, reserva=True):
        """Prepara una cesta sin escribir; muestra cantidades y total antes de confirmar."""
        cliente = self._elegir(self.listarClientes(), "cliente")
        libros = {int(libro["id"]): libro for libro in self.listarLibros()}
        if not libros:
            raise ValueError("No hay libros activos")
        cesta = {}
        while True:
            id = self.entero("Referencia del libro (0 termina la cesta; ! cancela todo)", 0)
            if id == 0:
                break
            if id not in libros:
                self.mostrar("Ese libro no está en el catálogo activo.", "aviso")
                continue
            cesta[id] = cesta.get(id, 0) + self.entero("Cantidad")
        if not cesta:
            raise ValueError("La cesta está vacía")
        total = 0
        self.mostrar("Cliente: " + cliente["nombre"] + " " + cliente["apellidos"])
        for id, cantidad in cesta.items():
            subtotal = cantidad * int(libros[id]["precio_centimos"])
            total += subtotal
            self.mostrar(f"  {cantidad} x {libros[id]['titulo']} = {self.dinero(subtotal)}")
        self.mostrar("TOTAL: " + self.dinero(total), "titulo")
        if self.confirmar("¿Confirmar " + ("reserva" if reserva else "venta") + "?"):
            metodo = self.app.crearReserva if reserva else self.app.registrarVenta
            id = metodo(cliente["id"], list(cesta.items()))
            self.mostrar(f"Pedido #{id} guardado.", "bien")

    def listarPedidos(self, estado=None):
        """Muestra el historial o las reservas pendientes."""
        pedidos = self.app.listarPedidos(estado)
        tonos = {"reservado": "aviso", "vendido": "bien", "cancelado": "suave"}
        # Incluimos inactivos para que el historial conserve nombres, no solo números.
        clientes = {cliente["id"]: cliente for cliente in self.app.listarClientes(True)}
        filas = []
        for pedido in pedidos:
            cliente = clientes[pedido["cliente_id"]]
            nombre = (cliente["nombre"] + " " + cliente["apellidos"]).strip()
            if cliente["activo"] == "0":
                nombre += " (inactivo)"
            filas.append(dict(pedido, cliente=nombre, _tono=tonos.get(pedido["estado"], "texto")))
        self.tabla(filas, [("id", "Pedido", 6), ("fecha", "Fecha", 10),
                           ("estado", "Estado", 10), ("cliente", "Cliente", 30)])
        return pedidos

    def detallePedido(self, id=None):
        """Presenta el cliente histórico, las líneas y sus precios acordados."""
        if id is None:
            id = self._elegir(self.listarPedidos(), "pedido")["id"]
        pedido = self.app.consultarPedido(id)
        if pedido is None:
            raise ValueError("No existe ese pedido")
        self.mostrar(f"Pedido #{pedido['id']} / {pedido['estado']} / {pedido['fecha']}", "titulo")
        self.mostrar("Cliente: " + pedido["cliente"]["nombre"] + " " + pedido["cliente"]["apellidos"])
        libros = {libro["id"]: libro for libro in self.app.listarLibros(True)}
        filas = [{"libro": libros[linea["libro_id"]]["titulo"], "cantidad": linea["cantidad"],
                  "precio": self.dinero(linea["precio_unitario_centimos"]),
                  "subtotal": self.dinero(int(linea["cantidad"]) * int(linea["precio_unitario_centimos"]))}
                 for linea in pedido["lineas"]]
        self.tabla(filas, [("libro", "Libro", 30), ("cantidad", "Unidades", 8),
                           ("precio", "Precio unidad", 13), ("subtotal", "Subtotal", 12)])
        self.mostrar("TOTAL: " + self.dinero(pedido["total_centimos"]), "bien")

    def resolverReserva(self, vender):
        """Muestra la reserva elegida y confirma su venta o cancelación."""
        pedido = self._elegir(self.listarPedidos("reservado"), "reserva")
        self.detallePedido(pedido["id"])
        if self.confirmar("¿" + ("Vender" if vender else "Cancelar") + " esta reserva?"):
            metodo = self.app.venderReserva if vender else self.app.cancelarReserva
            metodo(pedido["id"])
            self.mostrar("Reserva vendida." if vender else "Reserva cancelada.", "bien")

    def menu(self, titulo, opciones, principal=False):
        """Ejecuta acciones y trata errores previstos, manteniendo accesible el menú."""
        while True:
            self.cabecera(titulo)
            ancho = self.ancho()
            self.mostrar("  SELECCIONA UNA OPCIÓN", "suave")
            self.mostrar("+" + "-" * (ancho - 2) + "+", "suave")
            for numero, (texto, _) in enumerate(opciones, 1):
                for linea in textwrap.wrap(f"[{numero}]  {texto}", ancho - 6):
                    self.mostrar("|  " + linea.ljust(ancho - 6) + "  |", "texto")
            self.mostrar("+" + "-" * (ancho - 2) + "+", "suave")
            self.mostrar("  [0] " + ("Salir de UNICORN" if principal else "Volver al menú principal"), "acento")
            self.mostrar()
            self.mostrar("  ! Cancelar formulario", "suave")
            self.mostrar("  Al editar: Enter conserva / - vacía campos opcionales", "suave")
            try:
                opcion = self.leer("  Opción > ")
                if opcion == "0":
                    return
                if not opcion.isascii() or not opcion.isdigit() or not 1 <= int(opcion) <= len(opciones):
                    self.mostrar("Elige una opción del menú.", "aviso")
                    self.pausa()
                    continue
                if not principal:
                    self.cabecera(opciones[int(opcion) - 1][0])
                opciones[int(opcion) - 1][1]()
            except OperacionCancelada:
                self.mostrar("Operación cancelada; el formulario no se ha guardado.", "aviso")
            except (ValueError, OSError, RuntimeError, csv.Error) as error:
                self.mostrar("No se pudo completar: " + str(error), "error")
            if not principal:
                self.pausa()  # Los resultados permanecen visibles hasta pulsar Enter.

    def exportarDatos(self, formato):
        """Pide una carpeta nueva y exporta el conjunto completo, incluido el historial."""
        self.mostrar("Incluye las cuatro tablas, registros inactivos e historial.")
        self.mostrar("Indica una carpeta NUEVA dentro de una carpeta existente. Las rutas relativas parten de la terminal.")
        destino = self.texto("Carpeta de exportación", True)
        self.mostrar("Destino: " + os.path.abspath(destino))
        if self.confirmar("¿Exportar en " + formato.upper() + "?"):
            self.mostrar("Exportando y comprobando los datos...", "titulo")
            ruta = UnicornIntercambio(self.app.conexion).exportar(destino, formato)
            self.mostrar("Exportación completada: " + ruta, "bien")

    def importarDatos(self, formato):
        """Importa en una base distinta; la sesión actual continúa sobre la base original."""
        self.mostrar("Selecciona una carpeta exportada por UNICORN en " + formato.upper() + ".")
        self.mostrar("No se sobrescribe ninguna base. Las rutas relativas parten de la terminal.")
        origen = self.texto("Carpeta de origen", True)
        nombre = self.texto("Nombre de la NUEVA base", True)
        self.mostrar("Origen: " + os.path.abspath(origen))
        self.mostrar("Nueva base: " + nombre)
        if self.confirmar("¿Validar e importar todos los datos?"):
            self.mostrar("Comprobando archivos, relaciones y stock...", "titulo")
            ruta = UnicornIntercambio(self.app.conexion).importar(origen, formato, nombre)
            self.mostrar("Importación completada: " + ruta, "bien")
            self.mostrar("Sigues en la base original; para abrir la importada, reinicia la consola con --base " + nombre)

    def crearCopia(self):
        """Confirma una copia completa de la base seleccionada en una carpeta nueva."""
        self.mostrar("Base que se copiará: " + self.app.conexion.basededatos, "titulo")
        self.mostrar("Incluye datos, índices, esquemas, metadatos y relaciones. No incluye el programa ni config.json.")
        self.mostrar("Elige una carpeta NUEVA fuera de la base, dentro de una carpeta existente.")
        self.mostrar("Las rutas relativas parten de la terminal. No abras otra sesión durante la copia.", "aviso")
        destino = self.texto("Carpeta de copia (por ejemplo copia_unicorn)", True)
        self.mostrar("Destino: " + os.path.abspath(destino))
        if self.confirmar("¿Crear y comprobar esta copia de seguridad?"):
            self.mostrar("Copiando archivos y comprobando su integridad...", "titulo")
            ruta = UnicornCopias(self.app.conexion).crear(destino)
            self.mostrar("Copia completa verificada: " + ruta, "bien")
            self.mostrar("Conserva juntos copia.json y la carpeta archivos. Para protegerte de fallos de disco, guarda otra copia en otro dispositivo.")

    def comprobarCopia(self):
        """Verifica una copia sin restaurarla ni cambiar sus archivos."""
        origen = self.texto("Carpeta de la copia (contiene copia.json y archivos)", True)
        self.mostrar("Comprobando huellas, relaciones y stock...", "titulo")
        manifiesto = UnicornCopias(self.app.conexion).comprobar(origen)
        self.ficha({"Base original": manifiesto["base"], "Fecha de copia (UTC)": manifiesto["fecha"],
                    "Registro": str(manifiesto["tamanoRegistro"]) + " bytes",
                    "Archivos comprobados": len(manifiesto["archivos"])})
        self.mostrar("La copia ha superado las comprobaciones de integridad.", "bien")

    def restaurarCopia(self):
        """Restaura únicamente con un nombre nuevo y mantiene la sesión en su base actual."""
        self.mostrar("No sobrescribe bases ni cambia config.json. La copia debe usar el mismo tamaño de registro.")
        self.mostrar("Las rutas relativas parten de la terminal.")
        origen = self.texto("Carpeta de la copia", True)
        nombre = self.texto("Nombre de la NUEVA base, sin extensión (ejemplo unicorn_restaurada)", True)
        self.app.conexion._validarNombre(nombre)
        self.ficha({"Copia": os.path.abspath(origen),
                    "Destino": os.path.join(self.app.conexion.instalacion, nombre)})
        if self.confirmar("¿Comprobar y restaurar la copia en esta base nueva?"):
            self.mostrar("Verificando y restaurando los archivos...", "titulo")
            ruta = UnicornCopias(self.app.conexion).restaurar(origen, nombre)
            self.mostrar("Base restaurada y verificada: " + ruta, "bien")
            self.mostrar("Sigues en " + self.app.conexion.basededatos + ". Para abrir la restaurada, reinicia la consola con --base " + nombre)

    def ejecutar(self):
        """Abre los menús de la aplicación, sin duplicar las reglas de negocio."""
        self.mostrar("UNICORN / Gestión de librería", "titulo")
        self.mostrar("Un solo proceso por base. Las operaciones se guardan al confirmar.", "aviso")
        clientes = [("Listar activos", self.listarClientes), ("Ver historial", lambda: self.listarClientes(True)),
                    ("Crear", self.cliente), ("Modificar", lambda: self.cliente(True)),
                    ("Desactivar", lambda: self.desactivar("cliente")),
                    ("Reactivar", lambda: self.reactivar("cliente"))]
        libros = [("Catálogo y stock", self.listarLibros), ("Ver inactivos también", lambda: self.listarLibros(True)),
                  ("Crear", self.libro), ("Modificar", lambda: self.libro(True)),
                  ("Desactivar", lambda: self.desactivar("libro")),
                  ("Reactivar", lambda: self.reactivar("libro"))]
        reservas = [("Pendientes", lambda: self.listarPedidos("reservado")),
                    ("Crear reserva", self.crearPedido), ("Vender reserva", lambda: self.resolverReserva(True)),
                    ("Cancelar reserva", lambda: self.resolverReserva(False))]
        ventas = [("Venta directa", lambda: self.crearPedido(False)), ("Historial", self.listarPedidos),
                  ("Detalle de pedido", self.detallePedido)]
        intercambio = [("Exportar JSON", lambda: self.exportarDatos("json")),
                       ("Exportar CSV", lambda: self.exportarDatos("csv")),
                       ("Importar JSON a base nueva", lambda: self.importarDatos("json")),
                       ("Importar CSV a base nueva", lambda: self.importarDatos("csv"))]
        copias = [("Crear copia de seguridad", self.crearCopia),
                  ("Comprobar copia", self.comprobarCopia),
                  ("Restaurar en base nueva", self.restaurarCopia)]
        self.menu("LIBRERÍA", [("Clientes", lambda: self.menu("CLIENTES", clientes)),
                              ("Libros", lambda: self.menu("CATÁLOGO", libros)),
                              ("Reservas", lambda: self.menu("RESERVAS", reservas)),
                              ("Ventas e historial", lambda: self.menu("VENTAS", ventas)),
                              ("Importar y exportar", lambda: self.menu("INTERCAMBIO", intercambio)),
                              ("Copias de seguridad", lambda: self.menu("COPIAS DE SEGURIDAD", copias))], True)
        self.mostrar("Gracias por utilizar UNICORN.", "titulo")


def principal(argumentos=None):
    """Abre la configuración y confirma las creaciones; importar el módulo no ejecuta nada."""
    parser = argparse.ArgumentParser(description="UNICORN: gestión de librería en consola")
    parser.add_argument("--config", help="Ruta de config.json")
    parser.add_argument("--base", default=BASE_DEMO, help="Base a abrir; por defecto unicorn_demo")
    parser.add_argument("--sin-color", action="store_true")
    opciones = parser.parse_args(argumentos)
    consola = ConsolaUnicorn(color=False if opciones.sin_color else None)
    try:
        conexion = UnicornBBDD(opciones.config)
        conexion._validarNombre(opciones.base)
        destino = os.path.join(conexion.instalacion, opciones.base)
        consola.cabecera("BIENVENIDA")
        if opciones.base == BASE_DEMO:
            if not os.path.exists(destino):
                if not consola.confirmar("¿Crear librería con 50 registros iniciales (10 clientes, 12 libros, 10 pedidos y 18 líneas)?"):
                    return 0
                consola.mostrar("Preparando y comprobando la librería…")
            consola.app = abrirDemo(conexion)
        else:
            consola.mostrar("Destino: " + destino)
            nueva = not os.path.exists(destino)
            if nueva:
                if not consola.confirmar("¿Crear esta base vacía?"):
                    return 0
                conexion.creaBaseDatos(opciones.base)
            conexion.usaBaseDatos(opciones.base)
            consola.app = UnicornLibreria(conexion)
            if nueva:
                consola.app.prepararTablas()
            else:
                consola.app.listarClientes()  # No reconfiguramos silenciosamente una base existente.
        consola.ejecutar()
        return 0
    except (EOFError, KeyboardInterrupt, OperacionCancelada):
        consola.mostrar("Salida solicitada. Si quedó una operación pendiente, se recuperará al reabrir.", "aviso")
        return 0
    except (ValueError, OSError, RuntimeError, csv.Error) as error:
        consola.mostrar("No se puede abrir UNICORN: " + str(error), "error")
        return 1


if __name__ == "__main__":
    sys.exit(principal())
