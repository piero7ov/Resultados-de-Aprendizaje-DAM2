"""Datos ficticios de UNICORN: 10 clientes, 12 libros, 10 pedidos y 18 líneas."""

import json
import os
import tempfile

from UnicornBBDD import UnicornBBDD
from UnicornLibreria import UnicornLibreria

BASE_DEMO = "unicorn_demo"

CLIENTES = [
    ("Alba", "Serrano Vidal", "alba.serrano@correo.example"),
    ("Bruno", "Salvatierra Ríos", "bruno.salvatierra@correo.example"),
    ("Clara", "Montiel Vega", "clara.montiel@correo.example"),
    ("Diego", "Valcárcel Soto", "diego.valcarcel@correo.example"),
    ("Elena", "Robles Luján", "elena.robles@correo.example"),
    ("Fabio", "Castañeda Soler", "fabio.castaneda@correo.example"),
    ("Gala", "Beltrán Olmedo", "gala.beltran@correo.example"),
    ("Hugo", "Aranda Cifuentes", "hugo.aranda@correo.example"),
    ("Inés", "Valverde Pardo", "ines.valverde@correo.example"),
    ("Joel", "Montalvo Ferrer", "joel.montalvo@correo.example")
]

LIBROS = [
    ("El bosque de papel", "Marina Valdovinos"),
    ("Viaje a la luna azul", "Tomás Arce Belmonte"),
    ("Python entre páginas", "Alicia Vilar Castaño"),
    ("La ciudad de los faroles", "Gabriel Sanz Oliva"),
    ("Recetas entre páginas", "Celia Monfort"),
    ("El mapa de las mareas", "Nicolás Brezo"),
    ("Historias del mar", "Lara Cendales"),
    ("Jardines de invierno", "Samuel Niebla"),
    ("La estación de los días lentos", "Vera Alcántara"),
    ("Cuaderno de estrellas", "Adrián Loma"),
    ("El reloj de las dunas", "Irene Valcázar"),
    ("Un mundo por descubrir", "Mateo Albor")
]


def isbnInicial(numero):
    """Genera un identificador sintético con formato ISBN-13, sin asignación editorial verificada."""
    base = "978990" + str(numero).zfill(6)
    suma = sum(int(cifra) * (1 if posicion % 2 == 0 else 3) for posicion, cifra in enumerate(base))
    return base + str((-suma) % 10)


def abrirDemo(conexion):
    """Abre la demo existente o prepara una nueva completa antes de publicarla."""
    destino = os.path.join(conexion.instalacion, BASE_DEMO)
    if not os.path.exists(destino):
        os.makedirs(conexion.instalacion, exist_ok=True)
        # Construimos en un temporal: si se interrumpe, la demo final no queda a medias.
        with tempfile.TemporaryDirectory(prefix=".preparar-demo-", dir=conexion.instalacion) as temporal:
            configuracion = os.path.join(temporal, "config.json")
            with open(configuracion, "x", encoding="utf-8") as archivo:
                json.dump({"instalacion": temporal, "tamanoRegistro": conexion.tamanoRegistro}, archivo)
            auxiliar = UnicornBBDD(configuracion)
            auxiliar.creaBaseDatos(BASE_DEMO)
            auxiliar.usaBaseDatos(BASE_DEMO)
            app = UnicornLibreria(auxiliar)
            app.prepararTablas()
            _rellenarDemo(app)
            app.relaciones.validarIntegridad()
            os.rename(os.path.join(temporal, BASE_DEMO), destino)  # Nunca sobrescribe una base con archivos.
    conexion.usaBaseDatos(BASE_DEMO)
    app = UnicornLibreria(conexion)
    app.listarClientes()  # Valida también la demo existente; no vuelve a cargar sus registros.
    return app


def _rellenarDemo(app):
    """Carga ejemplos mediante la aplicación, con stock y estados calculados por sus reglas."""
    # El dominio .example evita que los correos correspondan a buzones reales.
    clientes = [app.crearCliente(nombre, apellidos, email, "") for nombre, apellidos, email in CLIENTES]
    libros = []
    for numero, (titulo, autor) in enumerate(LIBROS, 1):
        libros.append(app.crearLibro(isbnInicial(numero), titulo,
                                     autor, 800 + numero * 125,
                                     0 if numero == 12 else 20))
    for numero, cliente in enumerate(clientes):
        lineas = [(libros[numero], 1)]
        if numero < 8:
            lineas.append((libros[numero + 1], 2))  # Ocho pedidos dobles y dos simples: 18 líneas.
        if numero < 4:
            app.crearReserva(cliente, lineas)
        elif numero < 8:
            app.registrarVenta(cliente, lineas)
        else:
            pedido = app.crearReserva(cliente, lineas)
            app.cancelarReserva(pedido)
    app.desactivarCliente(clientes[-1])  # Su pedido cancelado conserva el vínculo histórico.
    app.desactivarLibro(libros[10])  # Otro ejemplo de borrado lógico, sin reservas pendientes.


def actualizarDatosIniciales(app):
    """Actualización explícita del conjunto inicial; nunca se ejecuta al abrir la consola."""
    if app.conexion.basededatos != BASE_DEMO:
        raise ValueError("La actualización solo corresponde a la base inicial de UNICORN")
    app._preparar()
    conexion = app.conexion
    cambios = []
    for numero, (nombre, apellidos, email) in enumerate(CLIENTES, 1):
        registro = conexion.seleccionar("clientes", numero, True)
        if registro is None or (registro["nombre"], registro["apellidos"], registro["email"]) not in (
                (nombre, "Ejemplo", f"demo{numero}@example.invalid"), (nombre, apellidos, email)):
            raise ValueError("El cliente " + str(numero) + " tiene cambios ajenos a esta actualización")
        registro.update(nombre=nombre, apellidos=apellidos, email=email)
        cambios.append(("clientes", numero, registro))
    for numero, (titulo, autor) in enumerate(LIBROS, 1):
        registro = conexion.seleccionar("libros", numero, True)
        if registro is None or registro["isbn"] not in ("DEMO" + str(numero).zfill(3), isbnInicial(numero)):
            raise ValueError("El libro " + str(numero) + " no pertenece al conjunto inicial")
        registro.update(isbn=isbnInicial(numero), titulo=titulo, autor=autor)
        cambios.append(("libros", numero, registro))
    bloques = []
    for tabla, id, registro in cambios:
        esquema = conexion.obtenerEsquema(tabla)
        bloque = conexion._prepararRegistro([registro[campo] for campo in esquema])
        bloques.append((tabla, conexion.buscarPosicion(tabla, id), bloque))
    with app.operaciones.ejecutar("actualizar nombres y catálogo inicial"):
        for tabla, posicion, bloque in bloques:
            # Esta migración conserva activo, incluso en los registros dados de baja.
            with open(conexion._rutaTabla(tabla) + ".csv", "r+b") as archivo:
                archivo.seek(posicion)
                archivo.write(bloque)
        app._validarEstado()
        app.relaciones.validarIntegridad()
    return len(cambios)
