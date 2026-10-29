"""Crea una base ERP ficticia con 10 tablas y 800 registros en esta versión."""

import json
import os
import sys
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from uuid import uuid4


RAIZ = Path(__file__).resolve().parents[1]
CONFIGURACION = RAIZ / "config.json"
DATOS = RAIZ / "datos"
BASE = "Erin-erp"

NOMBRES_CLIENTES = (
    "Marta Serrano", "Daniel Rivas", "Lucia Moreno", "Sergio Paredes", "Elena Vidal",
    "Javier Campos", "Paula Navarro", "Ivan Torres", "Clara Molina", "Ruben Castillo",
    "Andrea Fuentes", "Hugo Blanco", "Nuria Salas", "Mario Ortega", "Eva Lozano",
    "Adrian Vega", "Sara Prieto", "Pablo Medina", "Laura Cabrera", "Alvaro Santos",
    "Irene Herrera", "David Gil", "Cristina Leon", "Samuel Romero", "Noelia Pastor",
    "Oscar Ferrer", "Beatriz Cruz", "Raul Dominguez", "Alicia Soler", "Marcos Mendez",
    "Celia Ramos", "Diego Carrasco", "Natalia Robles", "Victor Calvo", "Ana Beltran",
    "Jorge Marquez", "Silvia Hidalgo", "Miguel Arias", "Patricia Galan", "Carlos Ibanez",
)

NOMBRES_PROVEEDORES = (
    "Tecnoalba Distribucion", "Suministros Delta", "Papeleria Horizonte",
    "Oficina Nexo", "Muebles Arista", "Redes Levante", "Almacen Nova",
    "Seguridad Prisma", "Impresion Litoral", "Movil Centro",
    "Electricidad Aurea", "Servicios Brisa", "Componentes Atlas",
    "Equipos Boreal", "Logistica Roble",
)

# Productos existentes en el mercado por tipo; nombres y precios de esta muestra son ficticios.
PRODUCTOS = (
    ("Teclado mecanico USB", "49.90"), ("Raton optico inalambrico", "18.50"),
    ("Monitor LED de 24 pulgadas", "159.00"), ("Memoria USB de 64 GB", "12.90"),
    ("Disco SSD de 1 TB", "84.90"), ("Webcam Full HD", "39.50"),
    ("Auriculares con microfono USB", "32.00"), ("Hub USB de cuatro puertos", "17.90"),
    ("Alfombrilla para raton", "8.90"), ("Soporte ajustable para portatil", "29.00"),
    ("Cuaderno A4 de tapa dura", "6.90"), ("Boligrafo azul caja de 50", "14.50"),
    ("Carpeta archivadora A4", "4.80"), ("Papel A4 paquete de 500 hojas", "5.90"),
    ("Grapadora de sobremesa", "11.90"), ("Caja de 100 clips", "2.50"),
    ("Notas adhesivas pack de 12", "9.90"), ("Rotulador permanente pack de 4", "7.50"),
    ("Calculadora de sobremesa", "16.90"), ("Organizador de escritorio", "13.50"),
    ("Silla de oficina ergonomica", "149.00"), ("Escritorio de 120 cm", "179.00"),
    ("Cajonera de tres cajones", "89.00"), ("Estanteria metalica de cinco baldas", "119.00"),
    ("Mesa de reuniones de 180 cm", "249.00"), ("Armario archivador con llave", "199.00"),
    ("Reposapies ajustable", "35.90"), ("Lampara LED de escritorio", "28.50"),
    ("Pizarra blanca de 90 cm", "64.90"), ("Papelera de oficina de 15 litros", "14.90"),
    ("Cable Ethernet Cat 6 de 2 m", "5.90"), ("Switch de red de ocho puertos", "34.90"),
    ("Router WiFi de doble banda", "69.00"), ("Adaptador USB WiFi", "19.90"),
    ("Punto de acceso WiFi", "89.00"), ("Bobina de cable de red de 100 m", "79.00"),
    ("Conector RJ45 bolsa de 100", "12.50"), ("Panel de parcheo de 24 puertos", "49.00"),
    ("Latiguillo de fibra optica de 2 m", "11.90"), ("Armario rack mural de 6U", "129.00"),
    ("Caja de carton de 40 cm", "2.80"), ("Cinta de embalaje transparente", "3.20"),
    ("Film estirable para palets", "14.90"), ("Etiqueta adhesiva de envio", "8.90"),
    ("Carretilla plegable de almacen", "69.00"), ("Caja organizadora de 30 litros", "18.90"),
    ("Guantes de manipulacion pack de 12", "16.50"), ("Cutter de seguridad", "9.90"),
    ("Bascula digital para paquetes", "49.90"), ("Portadocumentos adhesivo pack de 100", "19.90"),
    ("Camara de vigilancia IP", "79.00"), ("Detector de humo", "22.90"),
    ("Candado de seguridad", "17.50"), ("Caja fuerte compacta", "89.00"),
    ("Sensor de apertura de puerta", "29.90"), ("Luz de emergencia LED", "26.90"),
    ("Extintor de polvo de 6 kg", "54.00"), ("Botiquin de primeros auxilios", "31.50"),
    ("Chaleco reflectante", "8.90"), ("Cerradura electronica", "119.00"),
    ("Impresora laser monocromo", "169.00"), ("Impresora de etiquetas termica", "119.00"),
    ("Cartucho de tinta negra", "24.90"), ("Toner negro compatible", "39.90"),
    ("Papel fotografico pack de 50", "13.90"), ("Escaner de documentos A4", "149.00"),
    ("Tambor para impresora laser", "59.00"), ("Etiquetas A4 pack de 100 hojas", "19.90"),
    ("Cable USB para impresora de 2 m", "7.90"), ("Bandeja de papel adicional", "69.00"),
    ("Telefono movil de 128 GB", "229.00"), ("Funda para telefono movil", "14.90"),
    ("Protector de pantalla de cristal", "9.90"), ("Cargador USB-C de 20 W", "18.90"),
    ("Cable USB-C de 1 m", "8.90"), ("Soporte de movil para coche", "16.90"),
    ("Bateria externa de 10000 mAh", "29.90"), ("Auriculares Bluetooth", "39.90"),
    ("Tarjeta microSD de 128 GB", "21.90"), ("Telefono inalambrico de sobremesa", "59.00"),
    ("Regleta electrica de seis tomas", "18.90"), ("Alargador electrico de 5 m", "16.50"),
    ("Bombilla LED E27 pack de 4", "12.90"), ("Enchufe inteligente WiFi", "19.90"),
    ("Pila alcalina AA pack de 20", "14.90"), ("Cargador de pilas recargables", "29.00"),
    ("Protector contra sobretensiones", "24.90"), ("Adaptador universal de enchufe", "15.90"),
    ("Multimetro digital", "34.90"), ("Linterna LED recargable", "26.90"),
    ("Instalacion de equipo informatico", "65.00"), ("Configuracion de red local", "95.00"),
    ("Mantenimiento preventivo de PC", "49.00"), ("Limpieza de impresora", "35.00"),
    ("Montaje de mobiliario de oficina", "79.00"), ("Copia de seguridad inicial", "55.00"),
    ("Diagnostico de averia", "39.00"), ("Asistencia remota de una hora", "45.00"),
    ("Formacion basica de ofimatica", "89.00"), ("Migracion de correo electronico", "99.00"),
)


def cliente(numero):
    nombre = NOMBRES_CLIENTES[numero - 1]
    partes = nombre.lower().split()
    return [1, nombre, f"{partes[0]}.{partes[1]}@clientes-ejemplo.test", f"600{numero:06d}"]


def proveedor(numero):
    nombre = NOMBRES_PROVEEDORES[numero - 1]
    return [1, nombre, f"ventas{numero:02d}@proveedores-ejemplo.test", f"910{numero:06d}"]


def exigir(correcto, mensaje):
    if not correcto:
        raise RuntimeError(mensaje)


def fecha_dia(numero):
    return (date(2026, 1, 1) + timedelta(days=numero)).isoformat()


def importe(valor):
    return f"{valor.quantize(Decimal('0.01')):.2f}"


def insertar(bd, tabla, valores, numero, cantidades):
    identificador = bd.insertar(tabla, [str(valor) for valor in valores])
    exigir(identificador == numero, f"ID inesperado en {tabla}: {identificador}")
    cantidades[tabla] += 1


def crear_esquema(bd):
    tablas = {
        "empresas": {"nombre": "TEXTO", "cif": "TEXTO"},
        "clientes": {"empresa_id": "ENTERO", "nombre": "TEXTO", "email": "TEXTO", "telefono": "TEXTO"},
        "proveedores": {"empresa_id": "ENTERO", "nombre": "TEXTO", "email": "TEXTO", "telefono": "TEXTO"},
        "categorias": {"empresa_id": "ENTERO", "nombre": "TEXTO"},
        "productos": {"empresa_id": "ENTERO", "categoria_id": "ENTERO", "codigo": "TEXTO", "nombre": "TEXTO", "precio": "DECIMAL", "stock": "ENTERO"},
        "pedidos": {"empresa_id": "ENTERO", "cliente_id": "ENTERO", "fecha": "FECHA", "estado": "TEXTO", "total": "DECIMAL"},
        "pedidos_lineas": {"pedido_id": "ENTERO", "producto_id": "ENTERO", "cantidad": "ENTERO", "precio": "DECIMAL"},
        "facturas": {"empresa_id": "ENTERO", "cliente_id": "ENTERO", "pedido_id": "ENTERO", "numero": "TEXTO", "fecha": "FECHA", "total": "DECIMAL"},
        "compras": {"empresa_id": "ENTERO", "proveedor_id": "ENTERO", "fecha": "FECHA", "total": "DECIMAL"},
        "compras_lineas": {"compra_id": "ENTERO", "producto_id": "ENTERO", "cantidad": "ENTERO", "precio": "DECIMAL"},
    }
    for tabla, campos in tablas.items():
        exigir(bd.crear_tabla_tipada(tabla, campos), f"No se pudo crear {tabla}")

    referencias = {
        "clientes": {"empresa_id": "empresas"},
        "proveedores": {"empresa_id": "empresas"},
        "categorias": {"empresa_id": "empresas"},
        "productos": {"empresa_id": "empresas", "categoria_id": "categorias"},
        "pedidos": {"empresa_id": "empresas", "cliente_id": "clientes"},
        "pedidos_lineas": {"pedido_id": "pedidos", "producto_id": "productos"},
        "facturas": {"empresa_id": "empresas", "cliente_id": "clientes", "pedido_id": "pedidos"},
        "compras": {"empresa_id": "empresas", "proveedor_id": "proveedores"},
        "compras_lineas": {"compra_id": "compras", "producto_id": "productos"},
    }
    for tabla, claves in referencias.items():
        for columna, destino in claves.items():
            exigir(bd.anadir_clave_foranea(tabla, columna, destino), f"FK {tabla}.{columna}")

    obligatorios = {
        "empresas": ("nombre", "cif"),
        "clientes": ("empresa_id", "nombre", "email"),
        "proveedores": ("empresa_id", "nombre", "email"),
        "categorias": ("empresa_id", "nombre"),
        "productos": ("empresa_id", "categoria_id", "codigo", "nombre", "precio", "stock"),
        "pedidos": ("empresa_id", "cliente_id", "fecha", "estado", "total"),
        "pedidos_lineas": ("pedido_id", "producto_id", "cantidad", "precio"),
        "facturas": ("empresa_id", "cliente_id", "pedido_id", "numero", "fecha", "total"),
        "compras": ("empresa_id", "proveedor_id", "fecha", "total"),
        "compras_lineas": ("compra_id", "producto_id", "cantidad", "precio"),
    }
    for tabla, columnas in obligatorios.items():
        for columna in columnas:
            exigir(bd.establecer_no_nulo(tabla, columna), f"NO NULO {tabla}.{columna}")
    for tabla, columna in (("empresas", "cif"), ("clientes", "email"), ("proveedores", "email"), ("productos", "codigo"), ("facturas", "numero")):
        exigir(bd.establecer_unico(tabla, columna), f"UNICO {tabla}.{columna}")
    return {tabla: 0 for tabla in tablas}


def cargar_datos(bd, cantidades):
    insertar(bd, "empresas", ["Comercial Arista", "DEMO0001"], 1, cantidades)

    for numero in range(1, 41):
        insertar(bd, "clientes", cliente(numero), numero, cantidades)
    for numero in range(1, 16):
        insertar(bd, "proveedores", proveedor(numero), numero, cantidades)

    nombres_categorias = ("Informatica", "Oficina", "Mobiliario", "Redes", "Almacen", "Seguridad", "Impresion", "Telefonia", "Electricidad", "Servicios")
    for numero, nombre in enumerate(nombres_categorias, 1):
        insertar(bd, "categorias", [1, nombre], numero, cantidades)

    precios = {}
    for numero in range(1, 101):
        categoria = (numero - 1) // 10 + 1
        nombre_producto, precio_texto = PRODUCTOS[numero - 1]
        precio = Decimal(precio_texto)
        precios[numero] = precio
        insertar(bd, "productos", [1, categoria, f"ART-{numero:04d}", nombre_producto, importe(precio), 10 + numero * 7 % 91], numero, cantidades)

    pedidos = {}
    numero_linea = 0
    for numero in range(1, 101):
        cliente = (numero - 1) % 40 + 1
        fecha = fecha_dia(numero)
        lineas = []
        total = Decimal("0")
        for posicion in range(1, 4 if numero <= 50 else 3):
            producto = (numero * 7 + posicion * 11) % 100 + 1
            cantidad = (numero + posicion) % 5 + 1
            precio = precios[producto]
            lineas.append((producto, cantidad, precio))
            total += precio * cantidad
        pedidos[numero] = (cliente, fecha, importe(total))
        estado = "facturado" if numero <= 74 else "pendiente"
        insertar(bd, "pedidos", [1, cliente, fecha, estado, importe(total)], numero, cantidades)
        for producto, cantidad, precio in lineas:
            numero_linea += 1
            insertar(bd, "pedidos_lineas", [numero, producto, cantidad, importe(precio)], numero_linea, cantidades)

    for numero in range(1, 75):
        cliente, fecha, total = pedidos[numero]
        fecha_factura = (date.fromisoformat(fecha) + timedelta(days=1)).isoformat()
        insertar(bd, "facturas", [1, cliente, numero, f"F-DEMO-{numero:04d}", fecha_factura, total], numero, cantidades)

    numero_linea = 0
    for numero in range(1, 61):
        proveedor = (numero - 1) % 15 + 1
        lineas = []
        total = Decimal("0")
        for posicion in range(1, 4 if numero <= 30 else 3):
            producto = (numero * 5 + posicion * 13) % 100 + 1
            cantidad = (numero + posicion) % 8 + 2
            precio = (precios[producto] * Decimal("0.60")).quantize(Decimal("0.01"))
            lineas.append((producto, cantidad, precio))
            total += precio * cantidad
        insertar(bd, "compras", [1, proveedor, fecha_dia(numero - 1), importe(total)], numero, cantidades)
        for producto, cantidad, precio in lineas:
            numero_linea += 1
            insertar(bd, "compras_lineas", [numero, producto, cantidad, importe(precio)], numero_linea, cantidades)

    for nombre, tabla, columna in (
        ("idx_cliente_email", "clientes", "email"),
        ("idx_producto_codigo", "productos", "codigo"),
        ("idx_pedido_cliente", "pedidos", "cliente_id"),
        ("idx_linea_pedido", "pedidos_lineas", "pedido_id"),
        ("idx_factura_pedido", "facturas", "pedido_id"),
        ("idx_compra_proveedor", "compras", "proveedor_id"),
    ):
        exigir(bd.crear_indice(nombre, tabla, columna), f"Indice {nombre}")


def actualizar_datos_existentes(bd):
    exigir(bd.usar_base(BASE), f"No se pudo seleccionar {BASE}")
    cambios = {"empresas": 0, "clientes": 0, "proveedores": 0, "productos": 0}
    conservados = {tabla: 0 for tabla in cambios}

    def cambiar(tabla, numero, valores_anteriores, valores):
        fila = bd.seleccionar(tabla, numero)
        exigir(fila and fila["id"] == str(numero), f"Falta {tabla} con ID {numero}")
        if fila["nombre"] == valores["nombre"]:
            return
        if any(fila[columna] != valor for columna, valor in valores_anteriores.items()):
            conservados[tabla] += 1
            return
        exigir(bd.actualizar_donde(tabla, valores, "id", str(numero)) == 1,
               f"No se pudo actualizar {tabla} con ID {numero}")
        cambios[tabla] += 1

    exigir(bd.iniciar_transaccion(), "No se pudo iniciar la transaccion")
    try:
        cambiar("empresas", 1, {"nombre": "Empresa de demostracion"},
                {"nombre": "Comercial Arista"})
        for numero in range(1, 41):
            _, nombre, email, telefono = cliente(numero)
            cambiar("clientes", numero,
                    {"nombre": f"Cliente comercial {numero:03d}",
                     "email": f"cliente{numero:03d}@example.test",
                     "telefono": f"900100{numero:03d}"},
                    {"nombre": nombre, "email": email, "telefono": telefono})
        for numero in range(1, 16):
            _, nombre, email, telefono = proveedor(numero)
            cambiar("proveedores", numero,
                    {"nombre": f"Proveedor {numero:03d}",
                     "email": f"proveedor{numero:03d}@example.test",
                     "telefono": f"900200{numero:03d}"},
                    {"nombre": nombre, "email": email, "telefono": telefono})
        categorias = ("Informatica", "Oficina", "Mobiliario", "Redes", "Almacen",
                      "Seguridad", "Impresion", "Telefonia", "Electricidad", "Servicios")
        for numero, (nombre, precio) in enumerate(PRODUCTOS, 1):
            categoria = categorias[(numero - 1) // 10]
            precio_anterior = importe(Decimal("8.50") + Decimal(numero) * Decimal("1.75"))
            cambiar("productos", numero,
                    {"nombre": f"{categoria} modelo {numero:03d}", "precio": precio_anterior},
                    {"nombre": nombre, "precio": precio})
        exigir(bd.confirmar(), "No se pudo confirmar la transaccion")
    except Exception:
        bd.deshacer()
        raise

    for tabla in cambios:
        print(f"{tabla}: {cambios[tabla]} actualizados, {conservados[tabla]} personalizados conservados")
    print("Pedidos, facturas y clientes añadidos manualmente conservados.")


def main():
    actualizar = len(sys.argv) == 2 and sys.argv[1] == "--actualizar-datos"
    exigir(len(sys.argv) == 1 or actualizar,
           "Uso: py scripts/004-cargar_erp.py [--actualizar-datos]")
    exigir(len(NOMBRES_CLIENTES) == 40 and len(NOMBRES_PROVEEDORES) == 15
           and len(PRODUCTOS) == 100, "Catalogo incompleto")
    configuracion = json.loads(CONFIGURACION.read_text(encoding="utf-8-sig"))
    instalacion = Path(configuracion["instalacion"])
    if not instalacion.is_absolute():
        instalacion = RAIZ / instalacion
    exigir(instalacion.resolve() == DATOS.resolve(), "La carga solo admite la carpeta datos de esta versión")
    exigir((DATOS / BASE).exists() if actualizar else not (DATOS / BASE).exists(),
           f"La base {BASE} {'no existe' if actualizar else 'ya existe; no se sobrescribe'}")
    DATOS.mkdir(exist_ok=True)

    os.chdir(RAIZ)
    sys.path.insert(0, str(RAIZ / "bin"))
    import unicornbbdd as bd

    exigir(Path(bd.__file__).resolve() == (RAIZ / "bin" / "unicornbbdd.pyd").resolve(), "Se ha cargado otro conector Python")
    if actualizar:
        actualizar_datos_existentes(bd)
        return
    temporal = f"{BASE}_carga_{uuid4().hex[:8]}"
    exigir(bd.crear_base(temporal), f"No se pudo crear la base temporal {temporal}")
    exigir(bd.usar_base(temporal), f"No se pudo seleccionar {temporal}")
    transaccion = bd.iniciar_transaccion()
    exigir(transaccion, "No se pudo iniciar la transaccion de carga")
    try:
        cantidades = crear_esquema(bd)
        cargar_datos(bd, cantidades)
        exigir(sum(cantidades.values()) == 800, "La carga no contiene 800 registros")
        exigir(bd.confirmar(), "No se pudo confirmar la carga")
    except Exception:
        bd.deshacer()
        print(f"Carga interrumpida. Base temporal para revisar: {DATOS / temporal}", file=sys.stderr)
        raise

    (DATOS / temporal).rename(DATOS / BASE)
    for tabla, cantidad in cantidades.items():
        print(f"{tabla}: {cantidad}")
    print(f"Total: {sum(cantidades.values())} registros ficticios en {DATOS / BASE}")


if __name__ == "__main__":
    main()
