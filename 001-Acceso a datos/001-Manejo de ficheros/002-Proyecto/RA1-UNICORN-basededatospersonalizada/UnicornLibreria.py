"""Reglas de la tienda de libros, separadas del motor de ficheros.

Uso: seleccionar una base, crear UnicornLibreria(conexion) y llamar a
prepararTablas() una vez para inicializarla. No se crean clientes ni libros de demo.
Las líneas de entrada son pares (libro_id, cantidad); los precios los toma el catálogo.
Usar esta clase para las operaciones comerciales: el motor genérico no controla stock.
"""

import os
import re
from datetime import date

from UnicornOperaciones import UnicornOperaciones
from UnicornRelaciones import UnicornRelaciones


class UnicornLibreria:
    """Gestiona clientes, catálogo, reservas y ventas de una única base."""

    ESQUEMAS = {
        "clientes": "nombre,apellidos,email,telefono",
        "libros": "isbn,titulo,autor,precio_centimos,stock",
        "pedidos": "cliente_id,fecha,estado",
        "lineas_pedido": "pedido_id,libro_id,cantidad,precio_unitario_centimos"
    }
    RELACIONES = {
        ("pedidos", "cliente_id", "clientes"),
        ("lineas_pedido", "pedido_id", "pedidos"),
        ("lineas_pedido", "libro_id", "libros")
    }

    def __init__(self, conexion):
        """Usa una base seleccionada y recupera sus operaciones interrumpidas, si existen."""
        self.conexion = conexion
        self.operaciones = UnicornOperaciones(conexion, self.ESQUEMAS)
        self.operaciones.recuperarPendiente()
        self.relaciones = UnicornRelaciones(conexion)

    def prepararTablas(self):
        """Crea solo tablas ausentes y configura las relaciones sin sobrescribir datos."""
        self.operaciones.recuperarPendiente()
        for tabla, esquema in self.ESQUEMAS.items():
            ruta = self.conexion._rutaTabla(tabla)
            extensiones = (".csv", ".idx", ".esquema", ".meta.json")
            if not any(os.path.exists(ruta + extension) for extension in extensiones):
                self.conexion.creaTabla(tabla, esquema)
            if self.conexion.obtenerEsquema(tabla) != ["id", "activo"] + esquema.split(","):
                raise ValueError("Esquema incompatible con la librería: " + tabla)
        self.conexion.configurarRelaciones()
        self._preparar()
        return True

    def _preparar(self):
        """Recupera antes de leer y comprueba el modelo y las reglas del estado guardado."""
        self.operaciones.recuperarPendiente()
        for tabla, esquema in self.ESQUEMAS.items():
            if self.conexion.obtenerEsquema(tabla) != ["id", "activo"] + esquema.split(","):
                raise ValueError("Esquema incompatible: " + tabla)
        reglas = {(r["tabla"], r["campo"], r["tabla_destino"]) for r in self.relaciones.cargar()}
        if reglas != self.RELACIONES:
            raise ValueError("Faltan las relaciones de la librería")
        self.relaciones.validarIntegridad()
        self._validarEstado()

    def _entero(self, valor, nombre, minimo=0):
        """Valida enteros recibidos por la aplicación, rechazando decimales y booleanos."""
        if type(valor) is not int or valor < minimo:
            raise ValueError(nombre + " debe ser un entero mayor o igual que " + str(minimo))
        return valor

    def _numeroGuardado(self, valor, nombre, minimo=0):
        """Convierte un entero almacenado como texto y detecta datos numéricos dañados."""
        if not re.fullmatch(r"0|[1-9][0-9]*", valor):
            raise ValueError("Valor guardado no válido: " + nombre)
        return self._entero(int(valor), nombre, minimo)

    def _texto(self, valor, nombre, obligatorio=False):
        """Comprueba campos de texto; solo los obligatorios deben contener algo visible."""
        if not isinstance(valor, str) or (obligatorio and not valor.strip()):
            raise ValueError("Texto no válido: " + nombre)
        return valor

    def _isbn(self, valor):
        """Normaliza el ISBN para comparar duplicados; no comprueba su dígito de control."""
        self._texto(valor, "ISBN", True)
        normalizado = valor.replace("-", "").replace(" ", "").upper()
        if not normalizado:
            raise ValueError("El ISBN no puede estar vacío")
        return normalizado

    def _activo(self, tabla, id):
        """Recupera un registro activo o rechaza la operación solicitada."""
        registro = self.conexion.seleccionar(tabla, id)
        if registro is None:
            raise ValueError("No existe un registro activo en " + tabla + " con id " + str(id))
        return registro

    def _reservadas(self):
        """Suma las cantidades de las líneas cuyos pedidos están reservados."""
        pedidos = {p["id"] for p in self.conexion.listarTodo("pedidos") if p["estado"] == "reservado"}
        cantidades = {}
        for linea in self.conexion.listarTodo("lineas_pedido"):
            if linea["pedido_id"] in pedidos:
                libro = linea["libro_id"]
                cantidades[libro] = cantidades.get(libro, 0) + int(linea["cantidad"])
        return cantidades

    def _validarEstado(self):
        """Detecta datos comerciales inconsistentes antes de admitir otra operación."""
        libros = {r["id"]: r for r in self.conexion.listarTodo("libros", True)}
        clientes = {r["id"]: r for r in self.conexion.listarTodo("clientes", True)}
        pedidos = {r["id"]: r for r in self.conexion.listarTodo("pedidos", True)}
        isbns = set()
        for libro in libros.values():
            isbn = self._isbn(libro["isbn"])
            if isbn in isbns:
                raise ValueError("ISBN duplicado en los datos")
            isbns.add(isbn)  # También cuenta los libros inactivos.
            self._texto(libro["titulo"], "título", True)
            self._numeroGuardado(libro["precio_centimos"], "precio")
            self._numeroGuardado(libro["stock"], "stock")
        lineasPorPedido = {}
        for linea in self.conexion.listarTodo("lineas_pedido", True):
            if linea["activo"] != "1":
                raise ValueError("No se deben desactivar líneas; se cancela el pedido")
            self._numeroGuardado(linea["cantidad"], "cantidad", 1)
            self._numeroGuardado(linea["precio_unitario_centimos"], "precio de línea")
            lineasPorPedido.setdefault(linea["pedido_id"], []).append(linea)
        for pedido in pedidos.values():
            if pedido["estado"] not in ("reservado", "vendido", "cancelado"):
                raise ValueError("Estado de pedido no válido")
            date.fromisoformat(pedido["fecha"])
            lineas = lineasPorPedido.get(pedido["id"], [])
            if not lineas:
                raise ValueError("Un pedido debe tener al menos una línea")
            if pedido["estado"] == "reservado":
                if pedido["activo"] != "1" or clientes[pedido["cliente_id"]]["activo"] != "1":
                    raise ValueError("Una reserva pendiente necesita pedido y cliente activos")
                if any(libros[linea["libro_id"]]["activo"] != "1" for linea in lineas):
                    raise ValueError("Una reserva pendiente necesita libros activos")
        for libro, cantidad in self._reservadas().items():
            if cantidad > int(libros[libro]["stock"]):
                raise ValueError("Las reservas superan el stock físico")

    def _comprobarBloque(self, tabla, datos, id=None):
        """Comprueba esquema y tamaño antes de iniciar cualquier escritura agrupada."""
        self.conexion.validarDatos(tabla, datos)
        if id is None:
            id = self.conexion.siguienteId(tabla)
        self.conexion._prepararRegistro([id, 1] + list(datos))

    def crearCliente(self, nombre, apellidos="", email="", telefono=""):
        """Crea un cliente activo y devuelve su ID."""
        self._preparar()
        datos = [self._texto(nombre, "nombre", True), self._texto(apellidos, "apellidos"),
                 self._texto(email, "email"), self._texto(telefono, "teléfono")]
        self._comprobarBloque("clientes", datos)
        with self.operaciones.ejecutar("crear cliente"):
            return self.conexion.insertarDatos("clientes", datos)

    def actualizarCliente(self, id, nombre, apellidos="", email="", telefono=""):
        """Sustituye los datos de un cliente activo, conservando su ID e historial."""
        self._preparar()
        self._activo("clientes", id)
        datos = [self._texto(nombre, "nombre", True), self._texto(apellidos, "apellidos"),
                 self._texto(email, "email"), self._texto(telefono, "teléfono")]
        self._comprobarBloque("clientes", datos, id)
        with self.operaciones.ejecutar("actualizar cliente"):
            return self.conexion.actualizar("clientes", id, datos)

    def desactivarCliente(self, id):
        """Desactiva un cliente únicamente si no tiene reservas pendientes."""
        self._preparar()
        cliente = self._activo("clientes", id)
        if any(p["estado"] == "reservado" for p in
               self.conexion.buscarColumna("pedidos", "cliente_id", cliente["id"])):
            raise ValueError("El cliente tiene reservas pendientes")
        with self.operaciones.ejecutar("desactivar cliente"):
            return self.conexion.eliminar("clientes", id)

    def _reactivar(self, tabla, id):
        """Recupera una baja lógica bajo copia previa, sin modificar pedidos ni existencias."""
        self._preparar()
        registro = self.conexion.seleccionar(tabla, id, incluirInactivos=True)
        if registro is None:
            raise ValueError("El registro no existe o ya fue retirado al compactar")
        if registro["activo"] == "1":
            raise ValueError("El registro ya está activo")
        with self.operaciones.ejecutar("reactivar " + tabla):
            self.conexion.reactivar(tabla, id)
            self._validarEstado()
        return True

    def reactivarCliente(self, id):
        """Permite utilizar de nuevo un cliente sin reabrir sus pedidos cancelados."""
        return self._reactivar("clientes", id)

    def reactivarLibro(self, id):
        """Devuelve un libro al catálogo conservando su ISBN, precio, stock e historial."""
        return self._reactivar("libros", id)

    def listarClientes(self, incluirInactivos=False):
        """Devuelve clientes para que la futura interfaz los presente."""
        self._preparar()
        return self.conexion.listarTodo("clientes", incluirInactivos)

    def _datosLibro(self, isbn, titulo, autor, precio_centimos, stock, id=None):
        """Valida los datos del catálogo y evita ISBN repetidos, incluso entre inactivos."""
        isbn = self._isbn(isbn)
        for libro in self.conexion.listarTodo("libros", True):
            if self._isbn(libro["isbn"]) == isbn and libro["id"] != str(id):
                raise ValueError("Ya existe un libro con ese ISBN")
        return [isbn, self._texto(titulo, "título", True), self._texto(autor, "autor"),
                self._entero(precio_centimos, "precio"), self._entero(stock, "stock")]

    def crearLibro(self, isbn, titulo, autor, precio_centimos, stock):
        """Crea un libro con precio en céntimos y stock físico entero no negativo."""
        self._preparar()
        datos = self._datosLibro(isbn, titulo, autor, precio_centimos, stock)
        self._comprobarBloque("libros", datos)
        with self.operaciones.ejecutar("crear libro"):
            return self.conexion.insertarDatos("libros", datos)

    def actualizarLibro(self, id, isbn, titulo, autor, precio_centimos, stock):
        """Actualiza el catálogo sin permitir stock físico inferior a las unidades reservadas."""
        self._preparar()
        libro = self._activo("libros", id)
        datos = self._datosLibro(isbn, titulo, autor, precio_centimos, stock, id)
        if stock < self._reservadas().get(libro["id"], 0):
            raise ValueError("El stock no puede ser inferior a las unidades reservadas")
        self._comprobarBloque("libros", datos, id)
        with self.operaciones.ejecutar("actualizar libro"):
            return self.conexion.actualizar("libros", id, datos)

    def desactivarLibro(self, id):
        """Desactiva un libro si no forma parte de reservas pendientes."""
        self._preparar()
        libro = self._activo("libros", id)
        if self._reservadas().get(libro["id"], 0):
            raise ValueError("El libro tiene reservas pendientes")
        with self.operaciones.ejecutar("desactivar libro"):
            return self.conexion.eliminar("libros", id)

    def listarLibros(self, incluirInactivos=False):
        """Devuelve los libros del catálogo; por defecto oculta los inactivos."""
        self._preparar()
        return self.conexion.listarTodo("libros", incluirInactivos)

    def consultarStock(self, id):
        """Devuelve stock físico, reservado y disponible de un libro activo."""
        self._preparar()
        libro = self._activo("libros", id)
        fisico = int(libro["stock"])
        reservado = self._reservadas().get(libro["id"], 0)
        return {"fisico": fisico, "reservado": reservado, "disponible": fisico - reservado}

    def _prepararLineas(self, lineas):
        """Agrupa libros repetidos y comprueba cantidades y disponibilidad antes de escribir."""
        if not isinstance(lineas, (list, tuple)) or not lineas:
            raise ValueError("El pedido necesita al menos una línea")
        cantidades = {}
        for linea in lineas:
            if not isinstance(linea, (list, tuple)) or len(linea) != 2:
                raise ValueError("Cada línea debe ser (libro_id, cantidad)")
            libro = self._activo("libros", linea[0])
            cantidad = self._entero(linea[1], "cantidad", 1)
            cantidades[libro["id"]] = cantidades.get(libro["id"], 0) + cantidad
        reservadas = self._reservadas()
        preparadas = []
        for id, cantidad in cantidades.items():
            libro = self._activo("libros", id)
            if cantidad > int(libro["stock"]) - reservadas.get(id, 0):
                raise ValueError("No hay unidades disponibles del libro " + id)
            preparadas.append((libro, cantidad, int(libro["precio_centimos"])))
        return preparadas

    def _descontarStock(self, libro, cantidad):
        """Descuenta unidades físicas sin tocar el resto del catálogo."""
        stock = int(libro["stock"]) - cantidad
        if stock < 0:
            raise ValueError("Stock insuficiente")
        self.conexion.actualizar("libros", libro["id"],
                                 [libro["isbn"], libro["titulo"], libro["autor"], libro["precio_centimos"], stock])

    def _crearPedido(self, cliente_id, lineas, estado):
        """Guarda pedido, líneas y posible descuento como una sola operación recuperable."""
        self._preparar()
        cliente = self._activo("clientes", cliente_id)
        preparadas = self._prepararLineas(lineas)
        datosPedido = [cliente["id"], date.today().isoformat(), estado]
        idPedido = self.conexion.siguienteId("pedidos")
        self._comprobarBloque("pedidos", datosPedido, idPedido)
        siguienteLinea = self.conexion.siguienteId("lineas_pedido")
        for numero, (libro, cantidad, precio) in enumerate(preparadas):
            self._comprobarBloque("lineas_pedido", [idPedido, libro["id"], cantidad, precio],
                                 siguienteLinea + numero)
        with self.operaciones.ejecutar("crear pedido " + estado):
            idPedido = self.conexion.insertarDatos("pedidos", datosPedido)
            for libro, cantidad, precio in preparadas:
                self.conexion.insertarDatos("lineas_pedido", [idPedido, libro["id"], cantidad, precio])
                if estado == "vendido":
                    self._descontarStock(libro, cantidad)
            self._validarEstado()
        return idPedido

    def crearReserva(self, cliente_id, lineas):
        """Aparta unidades sin reducir el stock físico y devuelve el ID del pedido."""
        return self._crearPedido(cliente_id, lineas, "reservado")

    def registrarVenta(self, cliente_id, lineas):
        """Crea una venta directa y descuenta solo unidades disponibles."""
        return self._crearPedido(cliente_id, lineas, "vendido")

    def _reserva(self, id):
        """Obtiene un pedido reservado y sus líneas; rechaza una segunda venta o cancelación."""
        pedido = self._activo("pedidos", id)
        if pedido["estado"] != "reservado":
            raise ValueError("Solo se puede vender o cancelar una reserva pendiente")
        return pedido, self.conexion.buscarColumna("lineas_pedido", "pedido_id", pedido["id"])

    def venderReserva(self, id):
        """Vende una reserva al precio acordado y descuenta el stock físico una sola vez."""
        self._preparar()
        pedido, lineas = self._reserva(id)
        with self.operaciones.ejecutar("vender reserva"):
            for linea in lineas:
                libro = self._activo("libros", linea["libro_id"])
                self._descontarStock(libro, int(linea["cantidad"]))
            # Cambiar el estado libera las unidades reservadas, sin borrar las líneas.
            self.conexion.actualizar("pedidos", id, [pedido["cliente_id"], pedido["fecha"], "vendido"])
            self._validarEstado()
        return True

    def cancelarReserva(self, id):
        """Libera las unidades reservadas sin cambiar el stock físico ni borrar el historial."""
        self._preparar()
        pedido, _ = self._reserva(id)
        with self.operaciones.ejecutar("cancelar reserva"):
            self.conexion.actualizar("pedidos", id, [pedido["cliente_id"], pedido["fecha"], "cancelado"])
            self._validarEstado()
        return True

    def consultarPedido(self, id):
        """Devuelve el pedido, su cliente histórico, sus líneas y el total en céntimos."""
        self._preparar()
        pedido = self.conexion.seleccionar("pedidos", id, incluirInactivos=True)
        if pedido is None:
            return None
        lineas = self.conexion.buscarColumna("lineas_pedido", "pedido_id", pedido["id"], True)
        pedido["cliente"] = self.relaciones.obtenerRelacionado("pedidos", id, "cliente_id", True)
        pedido["lineas"] = lineas
        pedido["total_centimos"] = sum(int(l["cantidad"]) * int(l["precio_unitario_centimos"]) for l in lineas)
        return pedido

    def listarPedidos(self, estado=None):
        """Devuelve los pedidos, opcionalmente filtrados por estado, sin imprimirlos."""
        self._preparar()
        if estado is not None and estado not in ("reservado", "vendido", "cancelado"):
            raise ValueError("Estado de filtro no válido")
        pedidos = self.conexion.listarTodo("pedidos", True)
        return [pedido for pedido in pedidos if estado is None or pedido["estado"] == estado]
