"""Pruebas de consola y demo con entradas simuladas y bases temporales."""

import json
import os
import tempfile
import unittest
from collections import Counter
from pathlib import Path
from unittest.mock import patch

from UnicornBBDD import UnicornBBDD
from UnicornLibreria import UnicornLibreria
from consola_unicorn import ConsolaUnicorn, OperacionCancelada, principal
from datos_demo import BASE_DEMO, CLIENTES, LIBROS, abrirDemo, actualizarDatosIniciales, isbnInicial


class PruebasConsola(unittest.TestCase):
    """Ejercita formularios reales de consola sin requerir teclado."""

    def setUp(self):
        """Crea una base temporal y un cliente y libro técnicos, sin cargar toda la demo."""
        self.temporal = tempfile.TemporaryDirectory(prefix="unicorn-consola-")
        self.addCleanup(self.temporal.cleanup)
        self.raiz = Path(self.temporal.name)
        self.configuracion = self.raiz / "config.json"
        self.configuracion.write_text(json.dumps({"instalacion": "datos", "tamanoRegistro": 512}), encoding="utf-8")
        self.conexion = UnicornBBDD(self.configuracion)
        self.conexion.creaBaseDatos("pruebas")
        self.conexion.usaBaseDatos("pruebas")
        self.app = UnicornLibreria(self.conexion)
        self.app.prepararTablas()
        self.app.crearCliente("prueba")
        self.app.crearLibro("PRUEBA", "texto", "", 1250, 10)
        self.salida = []

    def consola(self, respuestas):
        """Inyecta respuestas y captura la salida para verificarla."""
        respuestas = iter(respuestas)
        return ConsolaUnicorn(self.app, lambda mensaje: next(respuestas), self.salida.append, False)

    def test_precio_exacto_y_reintentos(self):
        """Rechaza formatos dudosos y convierte euros sin utilizar float."""
        consola = self.consola(["-1", "1.234", "nan", "12,50", "0.01", ""])
        self.assertEqual(consola.precio(), 1250)
        self.assertEqual(consola.precio(), 1)
        self.assertEqual(consola.precio(999), 999)
        self.assertEqual(consola.dinero(1001), "10,01 EUR")

    def test_entradas_y_cancelacion(self):
        """Comprueba enteros, confirmación por defecto y cancelación explícita."""
        consola = self.consola(["abc", "-1", "0", "2", "", "!"])
        self.assertEqual(consola.entero("cantidad"), 2)
        self.assertFalse(consola.confirmar("guardar"))
        with self.assertRaises(OperacionCancelada):
            consola.leer("dato")

    def test_cliente_crear_editar_y_rechazar(self):
        """Un alta rechazada no escribe; la edición conserva campos al pulsar Enter."""
        self.consola(["nuevo", "", "", "", "n"]).cliente()
        self.assertEqual(len(self.app.listarClientes()), 1)
        self.consola(["nuevo", "", "test@example.invalid", "", "s"]).cliente()
        self.assertEqual(len(self.app.listarClientes()), 2)
        self.consola(["2", "", "", "-", "", "s"]).cliente(True)
        self.assertEqual(self.app.listarClientes()[1]["nombre"], "nuevo")
        self.assertEqual(self.app.listarClientes()[1]["email"], "")

    def test_libro_crear_y_editar(self):
        """Comprueba que el formulario envíe céntimos y stock enteros a la aplicación."""
        self.consola(["OTRO", "otro", "", "9,99", "3", "s"]).libro()
        self.assertEqual(self.app.listarLibros()[1]["precio_centimos"], "999")
        self.consola(["2", "", "", "", "10.05", "4", "s"]).libro(True)
        self.assertEqual(self.app.listarLibros()[1]["precio_centimos"], "1005")
        self.assertEqual(self.app.consultarStock(2)["fisico"], 4)

    def test_reserva_venta_y_detalle(self):
        """Simula selección de cliente, cesta, confirmación y posterior venta de reserva."""
        self.consola(["1", "1", "2", "0", "s"]).crearPedido()
        self.assertEqual(self.app.consultarStock(1)["reservado"], 2)
        self.consola(["1", "s"]).resolverReserva(True)
        self.assertEqual(self.app.consultarStock(1)["fisico"], 8)
        self.assertTrue(any("25,00 EUR" in linea for linea in self.salida))
        self.assertTrue(any("texto" in linea for linea in self.salida))

    def test_venta_rechazada_y_formulario_cancelado(self):
        """No se guarda un pedido sin confirmación o con una cancelación en el formulario."""
        self.consola(["1", "1", "1", "0", "n"]).crearPedido(False)
        self.assertEqual(self.app.listarPedidos(), [])
        with self.assertRaises(OperacionCancelada):
            self.consola(["1", "1", "!"]).crearPedido()
        self.assertEqual(self.app.listarPedidos(), [])

    def test_venta_directa_cancelar_y_desactivar(self):
        """Ejecuta las otras acciones de escritura de los menús."""
        self.consola(["1", "1", "1", "0", "s"]).crearPedido(False)
        self.consola(["1", "1", "2", "0", "s"]).crearPedido()
        self.consola(["2", "s"]).resolverReserva(False)
        self.assertEqual(self.app.consultarPedido(2)["estado"], "cancelado")
        self.consola(["1", "s"]).desactivar("cliente")
        self.consola(["1", "s"]).desactivar("libro")
        self.assertEqual(self.app.listarClientes(), [])
        self.assertEqual(self.app.listarLibros(), [])
        self.consola([]).detallePedido(1)  # El historial funciona con participantes inactivos.

    def test_menu_maneja_error_de_stock(self):
        """Un error comercial vuelve al menú sin mostrar éxito ni guardar un pedido."""
        self.consola(["1", "0"]).menu(
            "prueba", [("venta", lambda: self.consola(["1", "1", "99", "0", "s"]).crearPedido(False))])
        self.assertEqual(self.app.listarPedidos(), [])
        self.assertTrue(any("No se pudo completar" in linea for linea in self.salida))

    def test_navegacion_y_salida(self):
        """Abre cada submenú y vuelve al menú principal hasta salir."""
        self.consola(["x", "1", "1", "0", "2", "1", "0", "3", "1", "0", "4", "2", "0", "0"]).ejecutar()
        self.assertTrue(any("Gracias" in linea for linea in self.salida))
        self.assertTrue(any("Disponible" in linea for linea in self.salida))

    def test_no_inyecta_controles_de_terminal(self):
        """El texto procedente de registros no puede insertar saltos ni secuencias ANSI."""
        self.consola([]).mostrar("texto\x1b[2J\nfin")
        self.assertNotIn("\x1b", self.salida[0])
        self.assertNotIn("\n", self.salida[0])

    def test_inicio_no_crea_demo_sin_confirmar(self):
        """Rechazar la creación deja intacta la instalación."""
        with patch("builtins.input", return_value="n"), patch("builtins.print"):
            self.assertEqual(principal(["--config", str(self.configuracion), "--sin-color"]), 0)
        self.assertFalse((self.raiz / "datos" / BASE_DEMO).exists())

    def test_reactivar_desde_consola(self):
        """La consola ofrece solo inactivos y exige confirmar antes de activarlos."""
        self.app.desactivarCliente(1)
        self.app.desactivarLibro(1)
        self.consola(["1", "n"]).reactivar("cliente")
        self.assertEqual(self.app.listarClientes(), [])
        self.consola(["1", "s"]).reactivar("cliente")
        self.consola(["1", "s"]).reactivar("libro")
        self.assertEqual(len(self.app.listarClientes()), 1)
        self.assertEqual(len(self.app.listarLibros()), 1)
        self.consola([]).reactivar("cliente")
        self.assertTrue(any("No hay clientes inactivos" in linea for linea in self.salida))

    def test_inicio_existente_y_error_configuracion(self):
        """Abre una base existente y presenta los errores de apertura sin traceback."""
        with patch("builtins.input", return_value="0"), patch("builtins.print"):
            self.assertEqual(principal(["--config", str(self.configuracion), "--base", "pruebas"]), 0)
        with patch("builtins.print"):
            self.assertEqual(principal(["--config", str(self.raiz / "ausente.json")]), 1)

    def test_listados_muestran_cliente_y_conservan_ids(self):
        """Reservas e historial muestran nombres, también inactivos, sin cambiar los datos."""
        self.app.actualizarCliente(1, "Alba", "Serrano Vidal")
        pedido = self.app.crearReserva(1, [(1, 1)])
        consola = self.consola([])
        filas = consola.listarPedidos("reservado")
        self.assertEqual(filas[0]["cliente_id"], "1")
        self.assertIn("Alba Serrano Vidal", " ".join(self.salida))
        self.assertNotIn("Cliente ID", " ".join(self.salida))
        self.app.cancelarReserva(pedido)
        self.app.desactivarCliente(1)
        carpeta = Path(self.app.operaciones.carpeta)
        anteriores = {nombre: (carpeta / nombre).read_bytes() for nombre in self.app.operaciones.archivos}
        self.salida.clear()
        consola.listarPedidos()
        consola.detallePedido(pedido)
        self.assertIn("(inactivo)", " ".join(self.salida))
        self.assertIn("texto", " ".join(self.salida))
        self.assertEqual(anteriores, {nombre: (carpeta / nombre).read_bytes() for nombre in anteriores})


class PruebasDemo(unittest.TestCase):
    """Verifica los 50 registros y que una carga repetida no borre cambios."""

    def setUp(self):
        """Prepara una configuración aislada para la demo."""
        self.temporal = tempfile.TemporaryDirectory(prefix="unicorn-demo-pruebas-")
        self.addCleanup(self.temporal.cleanup)
        self.raiz = Path(self.temporal.name)
        ruta = self.raiz / "config.json"
        ruta.write_text(json.dumps({"instalacion": "datos", "tamanoRegistro": 512}), encoding="utf-8")
        self.conexion = UnicornBBDD(ruta)

    def test_conteos_stock_y_no_duplicacion(self):
        """Comprueba cantidades exactas, estados, stock y preservación al reabrir."""
        app = abrirDemo(self.conexion)
        cantidades = [len(self.conexion.listarTodo(tabla, True)) for tabla in app.ESQUEMAS]
        self.assertEqual(cantidades, [10, 12, 10, 18])
        self.assertEqual(Counter(p["estado"] for p in app.listarPedidos()),
                         {"reservado": 4, "vendido": 4, "cancelado": 2})
        self.assertEqual(app.consultarStock(5), {"fisico": 19, "reservado": 2, "disponible": 17})
        self.assertEqual(app.consultarStock(12)["disponible"], 0)
        self.assertEqual(app.listarClientes(True)[0]["apellidos"], CLIENTES[0][1])
        self.assertEqual(app.listarLibros(True)[0]["autor"], LIBROS[0][1])
        self.assertEqual(len({isbnInicial(i) for i in range(1, 13)}), 12)
        # Simula datos de la versión anterior sin modificar pedidos ni sus líneas.
        self.conexion.actualizar("clientes", 1, ["Alba", "Ejemplo", "demo1@example.invalid", ""])
        libro = app.listarLibros(True)[0]
        self.conexion.actualizar("libros", 1, ["DEMO001", libro["titulo"], "Autor ficticio 1",
                                             libro["precio_centimos"], libro["stock"]])
        antes = {tabla: self.conexion.listarTodo(tabla, True) for tabla in app.ESQUEMAS}
        self.assertEqual(actualizarDatosIniciales(app), 22)
        despues = {tabla: self.conexion.listarTodo(tabla, True) for tabla in app.ESQUEMAS}
        for tabla in ("pedidos", "lineas_pedido"):
            self.assertEqual(antes[tabla], despues[tabla])
        for tabla, campos in (("clientes", ("id", "activo", "telefono")),
                              ("libros", ("id", "activo", "precio_centimos", "stock"))):
            for viejo, nuevo in zip(antes[tabla], despues[tabla]):
                self.assertEqual([viejo[c] for c in campos], [nuevo[c] for c in campos])
        self.assertEqual(actualizarDatosIniciales(app), 22)  # Repetir no añade ni reactiva registros.
        app.actualizarCliente(1, "editado")
        with self.assertRaises(ValueError):
            actualizarDatosIniciales(app)  # No sobrescribe una edición posterior ajena a la migración.
        archivos = {nombre: (Path(app.operaciones.carpeta) / nombre).read_bytes()
                    for nombre in app.operaciones.archivos}
        otra = abrirDemo(self.conexion)
        self.assertEqual(otra.listarClientes()[0]["nombre"], "editado")
        self.assertEqual(archivos, {nombre: (Path(otra.operaciones.carpeta) / nombre).read_bytes()
                                   for nombre in otra.operaciones.archivos})

    def test_fallo_carga_no_publica_demo_incompleta(self):
        """Si falla la carga, la base final no existe y puede volver a prepararse."""
        with patch("datos_demo._rellenarDemo", side_effect=OSError("fallo de carga")):
            with self.assertRaises(OSError):
                abrirDemo(self.conexion)
        self.assertFalse((self.raiz / "datos" / BASE_DEMO).exists())
        self.assertEqual(list((self.raiz / "datos").iterdir()), [])


class PruebasPresentacion(unittest.TestCase):
    """Verifica colores, adaptación y pausas sin abrir ni modificar bases de datos."""

    def test_marcos_y_textos_largos(self):
        """Las celdas se envuelven sin desalinear los bordes ni perder palabras."""
        salida = []
        consola = ConsolaUnicorn(entrada=lambda _: "", salida=salida.append, color=False)
        with patch("consola_unicorn.shutil.get_terminal_size", return_value=os.terminal_size((90, 32))):
            consola.tabla([{"id": "1", "texto": "palabra " * 8}], [("id", "ID", 3), ("texto", "Texto", 12)])
        filas = [linea for linea in salida if linea.startswith("|")]
        self.assertEqual(len(set(map(len, filas))), 1)
        self.assertEqual(" ".join(salida).count("palabra"), 8)

    def test_ventana_estrecha_usa_fichas(self):
        """Una ventana estrecha conserva todos los valores sin sacar los marcos fuera."""
        salida = []
        consola = ConsolaUnicorn(salida=salida.append, color=False)
        with patch("consola_unicorn.shutil.get_terminal_size", return_value=os.terminal_size((32, 24))):
            consola.cabecera("CATÁLOGO")
            consola.tabla([{"nombre": "Cliente de ejemplo", "estado": "INACTIVO"}],
                          [("nombre", "Nombre", 25), ("estado", "Estado", 10)])
        self.assertTrue(all(len(linea) <= 30 for linea in salida))
        contenido = " ".join(" ".join(linea.strip("| ").split()) for linea in salida if linea.startswith("|"))
        self.assertIn("Cliente de ejemplo", contenido)
        self.assertIn("INACTIVO", " ".join(salida))

    def test_colores_y_modo_simple(self):
        """Solo añade ANSI cuando los colores están activados y sanea el contenido recibido."""
        salida = []
        consola = ConsolaUnicorn(salida=salida.append, color=True)
        consola.mostrar("mensaje", "bien")
        self.assertEqual(salida[-1], "\033[92mmensaje\033[0m")
        consola.color = False
        consola.mostrar("dato\033[2J", "error")
        self.assertNotIn("\033", salida[-1])

    def test_pausa_antes_de_redibujar(self):
        """La navegación interactiva espera Enter después de una acción de submenú."""
        eventos = []
        respuestas = iter(["1", "", "0"])

        def entrada(mensaje):
            """Registra el orden de los prompts y simula una respuesta."""
            eventos.append(mensaje)
            return next(respuestas)

        consola = ConsolaUnicorn(entrada=entrada, salida=eventos.append, color=False)
        consola.interactiva = True
        consola.menu("PRUEBA", [("Consultar", lambda: eventos.append("RESULTADO"))])
        indice = eventos.index("RESULTADO")
        self.assertIn("ENTER", eventos[indice + 1])

    def test_salida_no_interactiva_no_pausa_ni_limpia(self):
        """Las ejecuciones por tubería y las pruebas no necesitan entradas adicionales."""
        salida = []
        consola = ConsolaUnicorn(entrada=lambda _: self.fail("No debe pedir datos"),
                                 salida=salida.append, color=True)
        consola.pausa()
        consola.limpiar()
        self.assertEqual(salida, [])

    def test_cabecera_sin_avisos_de_demo(self):
        """La base interna no impone etiquetas de demo en la presentación."""
        salida = []
        consola = ConsolaUnicorn(app=object(), salida=salida.append, color=False)
        consola.cabecera("CLIENTES")
        self.assertIn("GESTIÓN DE LIBRERÍA", " ".join(salida))
        self.assertNotIn("DEMO", " ".join(salida))

    def test_ficha_traduce_estado_importes_y_unidades(self):
        """Los resúmenes no muestran activo=0 ni precios internos en céntimos."""
        salida = []
        consola = ConsolaUnicorn(salida=salida.append, color=False)
        original = {"id": "8", "activo": "0", "precio_centimos": "1250", "stock": "3", "autor": ""}
        copia = dict(original)
        consola.fichaRegistro(original)
        texto = " ".join(salida)
        for esperado in ("Referencia: 8", "Estado: Inactivo", "Precio: 12,50 EUR",
                         "Stock físico: 3 unidades", "Autor: Sin indicar"):
            self.assertIn(esperado, texto)
        self.assertNotIn("precio_centimos", texto)
        self.assertEqual(original, copia)


if __name__ == "__main__":
    unittest.main(verbosity=2)
