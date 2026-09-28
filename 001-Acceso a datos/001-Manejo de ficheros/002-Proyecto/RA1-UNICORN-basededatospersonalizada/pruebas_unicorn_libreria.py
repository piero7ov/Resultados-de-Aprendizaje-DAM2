"""Pruebas comerciales y de recuperación, siempre sobre archivos temporales.

Ejecutar este bloque: python -B pruebas_unicorn_libreria.py
Ejecutar todo: python -B -m unittest discover -p "pruebas_*.py"
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from UnicornBBDD import UnicornBBDD
from UnicornLibreria import UnicornLibreria


class PruebasLibreria(unittest.TestCase):
    """Comprueba reglas de negocio y recuperación sin utilizar datos reales."""

    def setUp(self):
        """Prepara una instalación independiente con datos técnicos de prueba."""
        self.temporal = tempfile.TemporaryDirectory(prefix="unicorn-libreria-")
        self.addCleanup(self.temporal.cleanup)
        self.raiz = Path(self.temporal.name)
        self.configuracion = self.raiz / "config.json"
        self.configuracion.write_text(json.dumps({"instalacion": "datos", "tamanoRegistro": 512}),
                                      encoding="utf-8")
        self.conexion = UnicornBBDD(self.configuracion)
        self.conexion.creaBaseDatos("pruebas")
        self.conexion.usaBaseDatos("pruebas")
        self.app = UnicornLibreria(self.conexion)
        self.app.prepararTablas()
        self.carpeta = self.raiz / "datos" / "pruebas"
        self.cliente = self.app.crearCliente("prueba")
        self.libro = self.app.crearLibro("978-0-00-000001-0", "texto de prueba", "", 1250, 10)

    def archivos(self):
        """Captura todos los archivos gestionados para comparar el estado byte a byte."""
        return {nombre: (self.carpeta / nombre).read_bytes() for nombre in self.app.operaciones.archivos}

    def reabrir(self):
        """Crea una nueva conexión, como al reiniciar la aplicación."""
        conexion = UnicornBBDD(self.configuracion)
        conexion.usaBaseDatos("pruebas")
        return UnicornLibreria(conexion)

    def test_inicializacion_repetida(self):
        """Reinicializar no borra datos ni introduce registros de demostración."""
        anterior = self.archivos()
        self.assertTrue(self.app.prepararTablas())
        self.assertEqual(self.archivos(), anterior)
        self.assertEqual(len(self.app.listarClientes()), 1)
        self.assertEqual(len(self.app.listarLibros()), 1)

    def test_crud_clientes(self):
        """Actualiza, consulta y desactiva clientes, preservando el historial."""
        self.app.actualizarCliente(self.cliente, "cambio", "prueba", "test@example.invalid", "000")
        self.assertEqual(self.app.listarClientes()[0]["nombre"], "cambio")
        self.assertTrue(self.app.desactivarCliente(self.cliente))
        self.assertEqual(self.app.listarClientes(), [])
        self.assertEqual(self.app.listarClientes(True)[0]["activo"], "0")
        with self.assertRaises(ValueError):
            self.app.actualizarCliente(self.cliente, "otro")

    def test_datos_cliente_invalidos(self):
        """Rechaza nombres vacíos, tipos incorrectos y registros que no caben."""
        anterior = self.archivos()
        for nombre in ("", "   ", None, "á" * 600):
            with self.subTest(nombre=nombre), self.assertRaises(ValueError):
                self.app.crearCliente(nombre)
        self.assertEqual(self.archivos(), anterior)

    def test_crud_libros(self):
        """Actualiza precio y stock, y permite consultar el libro desactivado."""
        self.app.actualizarLibro(self.libro, "9780000000010", "nuevo texto", "", 1500, 12)
        self.assertEqual(self.app.listarLibros()[0]["precio_centimos"], "1500")
        self.assertEqual(self.app.consultarStock(self.libro), {"fisico": 12, "reservado": 0, "disponible": 12})
        self.app.desactivarLibro(self.libro)
        self.assertEqual(self.app.listarLibros(), [])
        self.assertEqual(len(self.app.listarLibros(True)), 1)

    def test_isbn_unico_incluso_inactivos(self):
        """Normaliza guiones y espacios y cuenta también los ISBN del historial."""
        for isbn in ("9780000000010", "978 0 00 000001 0"):
            with self.subTest(isbn=isbn), self.assertRaises(ValueError):
                self.app.crearLibro(isbn, "duplicado", "", 100, 1)
        otro = self.app.crearLibro("otro-isbn", "otro", "", 100, 1)
        with self.assertRaises(ValueError):
            self.app.actualizarLibro(otro, "9780000000010", "otro", "", 100, 1)
        self.app.desactivarLibro(self.libro)
        with self.assertRaises(ValueError):
            self.app.crearLibro("9780000000010", "duplicado", "", 100, 1)

    def test_precios_y_stock_enteros_no_negativos(self):
        """No acepta decimales, booleanos, números negativos ni enteros como texto."""
        anterior = self.archivos()
        for valor in (-1, 1.5, True, "100", None):
            with self.subTest(valor=valor):
                with self.assertRaises(ValueError):
                    self.app.crearLibro("nuevo", "texto", "", valor, 1)
                with self.assertRaises(ValueError):
                    self.app.crearLibro("nuevo", "texto", "", 100, valor)
        self.assertEqual(self.archivos(), anterior)
        self.assertIsInstance(self.app.crearLibro("cero", "texto", "", 0, 0), int)

    def test_reserva_y_cancelacion(self):
        """Reservar y cancelar cambian disponibilidad, no el stock físico."""
        pedido = self.app.crearReserva(self.cliente, [(self.libro, 3)])
        self.assertEqual(self.app.consultarStock(self.libro), {"fisico": 10, "reservado": 3, "disponible": 7})
        self.assertEqual(self.app.consultarPedido(pedido)["total_centimos"], 3750)
        self.app.cancelarReserva(pedido)
        detalle = self.app.consultarPedido(pedido)
        self.assertEqual(detalle["estado"], "cancelado")
        self.assertEqual(len(detalle["lineas"]), 1)  # Cancelar no borra las líneas.
        self.assertEqual(self.app.consultarStock(self.libro), {"fisico": 10, "reservado": 0, "disponible": 10})

    def test_venta_directa_respeta_otras_reservas(self):
        """Una venta directa solo consume unidades que no estén reservadas."""
        self.app.crearReserva(self.cliente, [(self.libro, 8)])
        with self.assertRaises(ValueError):
            self.app.registrarVenta(self.cliente, [(self.libro, 3)])
        pedido = self.app.registrarVenta(self.cliente, [(self.libro, 2)])
        self.assertEqual(self.app.consultarPedido(pedido)["estado"], "vendido")
        self.assertEqual(self.app.consultarStock(self.libro), {"fisico": 8, "reservado": 8, "disponible": 0})

    def test_vender_reserva_una_sola_vez(self):
        """Vender descuenta una vez y libera exclusivamente esa reserva."""
        pedido = self.app.crearReserva(self.cliente, [(self.libro, 3)])
        self.app.crearReserva(self.cliente, [(self.libro, 2)])
        self.app.venderReserva(pedido)
        self.assertEqual(self.app.consultarStock(self.libro), {"fisico": 7, "reservado": 2, "disponible": 5})
        anterior = self.archivos()
        with self.assertRaises(ValueError):
            self.app.venderReserva(pedido)
        with self.assertRaises(ValueError):
            self.app.cancelarReserva(pedido)
        self.assertEqual(self.archivos(), anterior)

    def test_cancelada_no_se_vende_ni_se_cancela_dos_veces(self):
        """Un pedido cancelado no vuelve a procesarse."""
        pedido = self.app.crearReserva(self.cliente, [(self.libro, 1)])
        self.app.cancelarReserva(pedido)
        with self.assertRaises(ValueError):
            self.app.cancelarReserva(pedido)
        with self.assertRaises(ValueError):
            self.app.venderReserva(pedido)

    def test_precio_historico(self):
        """Modificar el catálogo no cambia el precio de las líneas ya confirmadas."""
        pedido = self.app.crearReserva(self.cliente, [(self.libro, 2)])
        self.app.actualizarLibro(self.libro, "9780000000010", "texto", "", 2000, 10)
        self.app.venderReserva(pedido)
        self.assertEqual(self.app.consultarPedido(pedido)["total_centimos"], 2500)
        nueva = self.app.registrarVenta(self.cliente, [(self.libro, 1)])
        self.assertEqual(self.app.consultarPedido(nueva)["total_centimos"], 2000)

    def test_repetidos_se_suman(self):
        """Agrupa un mismo libro y evita sobreventa repartida entre varias líneas."""
        anterior = self.archivos()
        with self.assertRaises(ValueError):
            self.app.crearReserva(self.cliente, [(self.libro, 6), (self.libro, 5)])
        self.assertEqual(self.archivos(), anterior)
        pedido = self.app.crearReserva(self.cliente, [(self.libro, 2), (self.libro, 3)])
        lineas = self.app.consultarPedido(pedido)["lineas"]
        self.assertEqual(len(lineas), 1)
        self.assertEqual(lineas[0]["cantidad"], "5")

    def test_lineas_invalidas(self):
        """Rechaza pedidos vacíos, cantidades inválidas y libros inexistentes antes de escribir."""
        anterior = self.archivos()
        variantes = [[], None, [(self.libro, 0)], [(self.libro, -1)],
                     [(self.libro, True)], [(self.libro, 1.5)], [(self.libro, "1")],
                     [(999, 1)], [(self.libro, 1, 100)], [(self.libro, 2), (999, 1)]]
        for lineas in variantes:
            with self.subTest(lineas=lineas), self.assertRaises(ValueError):
                self.app.registrarVenta(self.cliente, lineas)
        self.assertEqual(self.archivos(), anterior)
        self.assertFalse((self.carpeta / ".operacion-pendiente").exists())

    def test_inactivos_no_crean_pedidos(self):
        """No admite clientes ni libros inactivos para nuevas operaciones."""
        self.app.desactivarCliente(self.cliente)
        with self.assertRaises(ValueError):
            self.app.crearReserva(self.cliente, [(self.libro, 1)])
        cliente = self.app.crearCliente("otro")
        self.app.desactivarLibro(self.libro)
        with self.assertRaises(ValueError):
            self.app.registrarVenta(cliente, [(self.libro, 1)])

    def test_reserva_impide_bajas_y_stock_insuficiente(self):
        """Impide desactivar participantes o reducir stock por debajo de lo reservado."""
        pedido = self.app.crearReserva(self.cliente, [(self.libro, 4)])
        for metodo, id in ((self.app.desactivarCliente, self.cliente), (self.app.desactivarLibro, self.libro)):
            with self.assertRaises(ValueError):
                metodo(id)
        with self.assertRaises(ValueError):
            self.app.actualizarLibro(self.libro, "9780000000010", "texto", "", 1250, 3)
        self.app.actualizarLibro(self.libro, "9780000000010", "texto", "", 1250, 4)
        self.app.cancelarReserva(pedido)
        self.assertTrue(self.app.desactivarCliente(self.cliente))
        self.assertTrue(self.app.desactivarLibro(self.libro))

    def test_historial_tras_desactivar(self):
        """Una venta sigue consultable aunque cliente y libro estén inactivos."""
        pedido = self.app.registrarVenta(self.cliente, [(self.libro, 1)])
        self.app.desactivarCliente(self.cliente)
        self.app.desactivarLibro(self.libro)
        self.assertEqual(self.app.consultarPedido(pedido)["cliente"]["activo"], "0")
        self.assertEqual(self.conexion.compactar("clientes"), 0)
        self.assertEqual(self.conexion.compactar("libros"), 0)
        self.assertEqual(self.app.consultarPedido(pedido)["total_centimos"], 1250)

    def test_filtros_y_persistencia(self):
        """Reabre las ventas y reservas y comprueba consultas y filtros."""
        self.app.crearReserva(self.cliente, [(self.libro, 2)])
        self.app.registrarVenta(self.cliente, [(self.libro, 1)])
        nueva = self.reabrir()
        self.assertEqual(len(nueva.listarPedidos()), 2)
        self.assertEqual(len(nueva.listarPedidos("reservado")), 1)
        self.assertEqual(len(nueva.listarPedidos("vendido")), 1)
        self.assertEqual(nueva.listarPedidos("cancelado"), [])
        self.assertIsNone(nueva.consultarPedido(999))
        with self.assertRaises(ValueError):
            nueva.listarPedidos("otro")

    def test_rechaza_estado_manipulado(self):
        """Detecta un estado ajeno a la aplicación antes de aceptar nuevas ventas."""
        pedido = self.app.crearReserva(self.cliente, [(self.libro, 1)])
        self.conexion.actualizar("pedidos", pedido, [self.cliente, "2026-01-01", "incorrecto"])
        with self.assertRaises(ValueError):
            self.app.registrarVenta(self.cliente, [(self.libro, 1)])

    def test_fallo_entre_lineas_restaura_todo(self):
        """Una excepción tras guardar parte de la venta revierte pedido, líneas, índices y stock."""
        otro = self.app.crearLibro("otro", "otro", "", 500, 5)
        anterior = self.archivos()
        insertar = self.conexion.insertarDatos
        lineas = 0

        def insertarConFallo(tabla, datos):
            """Provoca un fallo cuando la primera línea y su descuento ya se han guardado."""
            nonlocal lineas
            if tabla == "lineas_pedido":
                lineas += 1
                if lineas == 2:
                    raise OSError("fallo simulado de escritura")
            return insertar(tabla, datos)

        with patch.object(self.conexion, "insertarDatos", side_effect=insertarConFallo):
            with self.assertRaises(OSError):
                self.app.registrarVenta(self.cliente, [(self.libro, 2), (otro, 1)])
        self.assertEqual(self.archivos(), anterior)
        self.assertEqual(self.app.listarPedidos(), [])
        self.assertFalse((self.carpeta / ".operacion-pendiente").exists())

    def test_fallo_al_vender_reserva_restaura_stock_y_estado(self):
        """Un error después del descuento deja la reserva y el stock como estaban."""
        pedido = self.app.crearReserva(self.cliente, [(self.libro, 3)])
        anterior = self.archivos()
        actualizar = self.conexion.actualizar

        def actualizarConFallo(tabla, id, datos):
            """Deja descontar stock y falla antes de cambiar el estado del pedido."""
            if tabla == "pedidos":
                raise OSError("fallo simulado al actualizar el pedido")
            return actualizar(tabla, id, datos)

        with patch.object(self.conexion, "actualizar", side_effect=actualizarConFallo):
            with self.assertRaises(OSError):
                self.app.venderReserva(pedido)
        self.assertEqual(self.archivos(), anterior)

    def interrumpirVenta(self):
        """Simula una interrupción después de guardar datos parciales, dejando copia pendiente."""
        actualizar = self.conexion.actualizar

        def actualizarEInterrumpir(tabla, id, datos):
            """Interrumpe tras escribir el stock para dejar una operación sin confirmar."""
            actualizar(tabla, id, datos)
            raise KeyboardInterrupt()

        with patch.object(self.conexion, "actualizar", side_effect=actualizarEInterrumpir):
            with self.assertRaises(KeyboardInterrupt):
                self.app.registrarVenta(self.cliente, [(self.libro, 2)])

    def test_interrupcion_bloquea_y_recupera_al_reabrir(self):
        """Una operación interrumpida bloquea el motor y se restaura al abrir la aplicación."""
        anterior = self.archivos()
        self.interrumpirVenta()
        self.assertTrue((self.carpeta / ".operacion-pendiente").is_dir())
        with self.assertRaises(RuntimeError):
            self.conexion.listarTodo("pedidos")
        with self.assertRaises(RuntimeError):
            self.conexion.insertarDatos("clientes", ["otro", "", "", ""])
        nueva = self.reabrir()
        self.assertEqual(self.archivos(), anterior)
        self.assertEqual(nueva.listarPedidos(), [])
        self.assertEqual(nueva.consultarStock(self.libro)["fisico"], 10)
        self.assertFalse((self.carpeta / ".operacion-pendiente").exists())

    def test_copia_corrupta_no_se_restaura(self):
        """Valida todas las copias antes de restaurar y mantiene el bloqueo si una está dañada."""
        self.interrumpirVenta()
        pendientes = self.carpeta / ".operacion-pendiente"
        (pendientes / "libros.csv").write_bytes(b"copia alterada")
        parcial = self.archivos()
        with self.assertRaises(ValueError):
            self.reabrir()
        self.assertEqual(self.archivos(), parcial)
        self.assertTrue(pendientes.exists())
        with self.assertRaises(RuntimeError):
            self.conexion.eliminar("clientes", self.cliente)

    def test_restauracion_interrumpida_se_puede_repetir(self):
        """Si restaurar falla a mitad, las copias se conservan y el siguiente intento termina."""
        anterior = self.archivos()
        self.interrumpirVenta()
        reemplazar = os.replace
        cambios = 0

        def reemplazarConFallo(origen, destino):
            """Falla tras restaurar un archivo para comprobar la repetición de la recuperación."""
            nonlocal cambios
            cambios += 1
            if cambios == 2:
                raise OSError("fallo al restaurar")
            return reemplazar(origen, destino)

        with patch("UnicornOperaciones.os.replace", side_effect=reemplazarConFallo):
            with self.assertRaises(OSError):
                self.reabrir()
        self.assertTrue((self.carpeta / ".operacion-pendiente").is_dir())
        self.reabrir()
        self.assertEqual(self.archivos(), anterior)

    def test_no_escribe_si_falla_preparar_copia(self):
        """Un error creando la copia previa sucede antes de cualquier cambio comercial."""
        anterior = self.archivos()
        with patch("UnicornOperaciones.shutil.copyfile", side_effect=OSError("sin espacio")):
            with self.assertRaises(OSError):
                self.app.registrarVenta(self.cliente, [(self.libro, 1)])
        self.assertEqual(self.archivos(), anterior)
        self.assertFalse((self.carpeta / ".operacion-pendiente").exists())

    def test_operaciones_anidadas_y_cambio_base(self):
        """Evita mezclar operaciones o cambiar la base mientras una está activa."""
        with self.app.operaciones.ejecutar("prueba"):
            with self.assertRaises(RuntimeError):
                with self.app.operaciones.ejecutar("anidada"):
                    pass
            with self.assertRaises(RuntimeError):
                self.conexion.usaBaseDatos("otra")
        self.assertFalse((self.carpeta / ".operacion-pendiente").exists())

    def test_cierre_real_del_proceso_durante_venta(self):
        """Termina un proceso sin ejecutar finally y verifica recuperación al reabrir."""
        anterior = self.archivos()
        programa = """
import os
import sys
from UnicornBBDD import UnicornBBDD
from UnicornLibreria import UnicornLibreria
conexion = UnicornBBDD(sys.argv[1])
conexion.usaBaseDatos("pruebas")
app = UnicornLibreria(conexion)
descontar = app._descontarStock
def descontar_y_salir(libro, cantidad):
    descontar(libro, cantidad)
    os._exit(23)
app._descontarStock = descontar_y_salir
app.registrarVenta(1, [(1, 2)])
"""
        resultado = subprocess.run([sys.executable, "-B", "-c", programa, str(self.configuracion)],
                                   cwd=Path(__file__).resolve().parent, capture_output=True, timeout=30)
        self.assertEqual(resultado.returncode, 23, resultado.stderr.decode(errors="replace"))
        self.assertTrue((self.carpeta / ".operacion-pendiente").exists())
        self.assertNotEqual(self.archivos(), anterior)  # El proceso llegó a escribir datos parciales.
        nueva = self.reabrir()
        self.assertEqual(self.archivos(), anterior)
        self.assertEqual(nueva.listarPedidos(), [])

    def test_registro_pendiente_invalido_no_restaurado(self):
        """Un nombre de archivo ajeno al conjunto esperado no se usa como ruta de restauración."""
        self.interrumpirVenta()
        registro = self.carpeta / ".operacion-pendiente" / "operacion.json"
        contenido = json.loads(registro.read_text(encoding="utf-8"))
        contenido["archivos"]["../fuera"] = contenido["archivos"].pop("libros.csv")
        registro.write_text(json.dumps(contenido), encoding="utf-8")
        parcial = self.archivos()
        with self.assertRaises(ValueError):
            self.reabrir()
        self.assertEqual(self.archivos(), parcial)

    def test_reactivar_conserva_historial_y_stock(self):
        """Recupera cliente y libro sin reabrir reservas canceladas ni alterar existencias."""
        pedido = self.app.crearReserva(self.cliente, [(self.libro, 2)])
        self.app.cancelarReserva(pedido)
        self.app.desactivarCliente(self.cliente)
        self.app.desactivarLibro(self.libro)
        anteriores = self.archivos()
        self.assertTrue(self.app.reactivarCliente(self.cliente))
        self.assertTrue(self.app.reactivarLibro(self.libro))
        self.assertEqual(self.app.consultarStock(self.libro), {"fisico": 10, "reservado": 0, "disponible": 10})
        self.assertEqual(self.app.consultarPedido(pedido)["estado"], "cancelado")
        for nombre, contenido in anteriores.items():
            if nombre not in ("clientes.csv", "libros.csv"):
                self.assertEqual(self.archivos()[nombre], contenido)
        nueva = self.reabrir()
        self.assertEqual(nueva.listarClientes()[0]["id"], str(self.cliente))
        self.assertEqual(nueva.listarLibros()[0]["id"], str(self.libro))
        self.assertIsInstance(nueva.crearReserva(self.cliente, [(self.libro, 1)]), int)

    def test_reactivar_rechaza_activos_ausentes_y_compactados(self):
        """No duplica activos ni puede recuperar datos retirados físicamente."""
        for metodo in (self.app.reactivarCliente, self.app.reactivarLibro):
            with self.assertRaises(ValueError):
                metodo(1)
            with self.assertRaises(ValueError):
                metodo(999)
        self.app.desactivarCliente(self.cliente)
        self.conexion.compactar("clientes")
        with self.assertRaises(ValueError):
            self.app.reactivarCliente(self.cliente)

    def test_reactivar_revierte_fallo(self):
        """Un error posterior a la escritura restaura la baja lógica desde la copia previa."""
        self.app.desactivarCliente(self.cliente)
        anteriores = self.archivos()
        reactivar = self.conexion.reactivar

        def reactivarConFallo(tabla, id):
            """Escribe la activación y simula después un fallo de operación."""
            reactivar(tabla, id)
            raise OSError("fallo simulado")

        with patch.object(self.conexion, "reactivar", side_effect=reactivarConFallo):
            with self.assertRaises(OSError):
                self.app.reactivarCliente(self.cliente)
        self.assertEqual(self.archivos(), anteriores)

    def test_otra_conexion_no_accede_a_operacion_activa(self):
        """Otra conexión ordinaria no puede leer o escribir el estado intermedio."""
        otra = UnicornBBDD(self.configuracion)
        otra.usaBaseDatos("pruebas")
        with self.app.operaciones.ejecutar("comprobación de bloqueo"):
            with self.assertRaises(RuntimeError):
                otra.listarTodo("libros")
            with self.assertRaises(RuntimeError):
                otra.configurarRelaciones()
        self.assertEqual(len(otra.listarTodo("libros")), 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
