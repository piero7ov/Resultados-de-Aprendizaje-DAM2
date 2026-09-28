"""Pruebas temporales de relaciones y compactación: python -B pruebas_unicorn_relaciones.py.

Para ejecutar ambos bloques: python -B -m unittest discover -p "pruebas_*.py".
No crea la librería real ni utiliza sus posibles datos.
"""

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from UnicornBBDD import UnicornBBDD
from UnicornRelaciones import UnicornRelaciones


class PruebasRelaciones(unittest.TestCase):
    """Comprueba las referencias desde la API del motor, sin saltarse sus validaciones."""

    def setUp(self):
        """Crea las cuatro tablas del diseño en una instalación temporal y vacía."""
        self.temporal = tempfile.TemporaryDirectory(prefix="unicorn-relaciones-")
        self.addCleanup(self.temporal.cleanup)  # También limpia si se simula una interrupción.
        self.raiz = Path(self.temporal.name)
        self.configuracion = self.raiz / "config.json"
        self.configuracion.write_text(json.dumps({"instalacion": "datos", "tamanoRegistro": 512}),
                                      encoding="utf-8")
        self.bbdd = UnicornBBDD(self.configuracion)
        self.bbdd.creaBaseDatos("pruebas")
        self.bbdd.usaBaseDatos("pruebas")
        self.bbdd.creaTabla("clientes", "nombre,apellidos,email,telefono")
        self.bbdd.creaTabla("libros", "isbn,titulo,autor,precio_centimos,stock")
        self.bbdd.creaTabla("pedidos", "cliente_id,fecha,estado")
        self.bbdd.creaTabla("lineas_pedido", "pedido_id,libro_id,cantidad,precio_unitario_centimos")
        self.carpeta = self.raiz / "datos" / "pruebas"
        self.gestor = UnicornRelaciones(self.bbdd)
        self.bbdd.configurarRelaciones()

    def cliente(self):
        """Inserta datos técnicos de cliente y devuelve su ID."""
        return self.bbdd.insertarDatos("clientes", ["prueba", "", "", ""])

    def libro(self):
        """Inserta un registro técnico de libro; aún no se aplican reglas comerciales."""
        return self.bbdd.insertarDatos("libros", ["isbn-prueba", "texto", "", 100, 10])

    def pedido(self, cliente):
        """Inserta un pedido técnico con el cliente indicado."""
        return self.bbdd.insertarDatos("pedidos", [cliente, "2026-01-01", "vendido"])

    def modeloTemporal(self, modelo):
        """Guarda una plantilla temporal para probar configuraciones alternativas."""
        ruta = self.raiz / "modelo.json"
        ruta.write_text(json.dumps(modelo), encoding="utf-8")
        return ruta

    def test_modelo_persistente(self):
        """Comprueba las tres relaciones y su carga desde una nueva conexión."""
        self.assertEqual(len(self.gestor.cargar()), 3)
        otra = UnicornBBDD(self.configuracion)
        otra.usaBaseDatos("pruebas")
        self.assertEqual(UnicornRelaciones(otra).cargar(), self.gestor.cargar())
        self.assertTrue(self.bbdd.configurarRelaciones())  # El mismo modelo se puede validar de nuevo.

    def test_insertar_y_consultar_relaciones(self):
        """Recorre línea → pedido → cliente y línea → libro, y consulta referencias inversas."""
        cliente = self.cliente()
        libro = self.libro()
        pedido = self.pedido(cliente)
        linea = self.bbdd.insertarDatos("lineas_pedido", [pedido, libro, 2, 100])
        self.assertEqual(self.gestor.obtenerRelacionado("pedidos", pedido, "cliente_id")["id"], str(cliente))
        self.assertEqual(self.gestor.obtenerRelacionado("lineas_pedido", linea, "libro_id")["id"], str(libro))
        self.assertEqual(self.gestor.obtenerRelacionado("lineas_pedido", linea, "pedido_id")["id"], str(pedido))
        referencias = self.gestor.buscarReferencias("clientes", cliente)
        self.assertEqual(len(referencias), 1)
        self.assertEqual(referencias[0]["tabla"], "pedidos")
        self.assertEqual(referencias[0]["registro"]["id"], str(pedido))
        self.assertTrue(self.gestor.validarIntegridad())

    def test_referencias_invalidas_no_escriben(self):
        """Rechaza referencias vacías, inexistentes o mal formadas sin consumir IDs."""
        for valor in ("", 999, 0, -1, None, True, "01", "1.0"):
            with self.subTest(valor=valor), self.assertRaises(ValueError):
                self.pedido(valor)
        self.assertEqual(self.bbdd.siguienteId("pedidos"), 1)
        self.assertEqual((self.carpeta / "pedidos.csv").read_bytes(), b"")
        self.assertEqual((self.carpeta / "pedidos.idx").read_bytes(), b"")

    def test_valida_las_dos_referencias_de_una_linea(self):
        """Comprueba tanto pedido_id como libro_id antes de insertar una línea."""
        pedido = self.pedido(self.cliente())
        libro = self.libro()
        for datos in ([999, libro, 1, 100], [pedido, 999, 1, 100]):
            with self.subTest(datos=datos), self.assertRaises(ValueError):
                self.bbdd.insertarDatos("lineas_pedido", datos)
        self.assertEqual(self.bbdd.listarTodo("lineas_pedido"), [])

    def test_actualizar_referencia(self):
        """Permite cambiar a un destino activo y rechaza otro inexistente sin alterar el pedido."""
        primero, segundo = self.cliente(), self.cliente()
        pedido = self.pedido(primero)
        self.bbdd.actualizar("pedidos", pedido, [segundo, "2026-01-02", "vendido"])
        anterior = (self.carpeta / "pedidos.csv").read_bytes()
        with self.assertRaises(ValueError):
            self.bbdd.actualizar("pedidos", pedido, [999, "2026-01-02", "vendido"])
        self.assertEqual((self.carpeta / "pedidos.csv").read_bytes(), anterior)
        self.assertEqual(self.gestor.obtenerRelacionado("pedidos", pedido, "cliente_id")["id"], str(segundo))

    def test_historial_con_destino_inactivo(self):
        """Conserva vínculos históricos, pero no permite crear otros nuevos hacia inactivos."""
        cliente = self.cliente()
        pedido = self.pedido(cliente)
        self.bbdd.eliminar("clientes", cliente)
        self.assertEqual(self.gestor.obtenerRelacionado("pedidos", pedido, "cliente_id")["activo"], "0")
        self.assertTrue(self.gestor.validarIntegridad())
        with self.assertRaises(ValueError):
            self.pedido(cliente)
        # Cambiar otro campo del pedido no exige reactivar su cliente histórico.
        self.bbdd.actualizar("pedidos", pedido, [cliente, "2026-01-02", "vendido"])
        otroPedido = self.pedido(self.cliente())
        with self.assertRaises(ValueError):
            self.bbdd.actualizar("pedidos", otroPedido, [cliente, "2026-01-02", "vendido"])

    def test_origen_inactivo_y_ausente(self):
        """Comprueba las opciones de historial y los resultados de consultas sin origen."""
        cliente = self.cliente()
        pedido = self.pedido(cliente)
        self.bbdd.eliminar("pedidos", pedido)
        self.assertIsNone(self.gestor.obtenerRelacionado("pedidos", pedido, "cliente_id"))
        self.assertIsNotNone(self.gestor.obtenerRelacionado("pedidos", pedido, "cliente_id", True))
        self.assertIsNone(self.gestor.obtenerRelacionado("pedidos", 999, "cliente_id"))
        self.assertEqual(self.gestor.buscarReferencias("clientes", cliente, False), [])
        self.assertEqual(len(self.gestor.buscarReferencias("clientes", cliente)), 1)
        with self.assertRaises(ValueError):
            self.gestor.obtenerRelacionado("pedidos", pedido, "fecha")

    def test_modelos_invalidos(self):
        """Rechaza versiones, tablas, campos y definiciones de relaciones incorrectas."""
        relacion = {"tabla": "pedidos", "campo": "cliente_id", "tabla_destino": "clientes"}
        modelos = [
            [], {}, {"version": True, "relaciones": []}, {"version": 2, "relaciones": []},
            {"version": 1, "relaciones": {}},
            {"version": 1, "relaciones": [relacion, relacion]},
            {"version": 1, "relaciones": [{"tabla": "pedidos"}]},
            {"version": 1, "relaciones": [dict(relacion, campo="id")]},
            {"version": 1, "relaciones": [dict(relacion, campo="ausente")]},
            {"version": 1, "relaciones": [dict(relacion, tabla_destino="ausente")]},
            {"version": 1, "relaciones": [dict(relacion, tabla="../fuera")]}
        ]
        anterior = (self.carpeta / "relaciones.json").read_bytes()
        for modelo in modelos:
            with self.subTest(modelo=modelo), self.assertRaises((ValueError, FileNotFoundError)):
                self.bbdd.configurarRelaciones(self.modeloTemporal(modelo))
        self.assertEqual((self.carpeta / "relaciones.json").read_bytes(), anterior)

    def test_no_sustituye_modelo_configurado(self):
        """Impide borrar las reglas de una base configurada mediante una nueva plantilla."""
        with self.assertRaises(ValueError):
            self.bbdd.configurarRelaciones(self.modeloTemporal({"version": 1, "relaciones": []}))

    def test_configurar_detecta_datos_previos_invalidos(self):
        """No instala un modelo si los datos anteriores ya tienen referencias rotas."""
        self.bbdd.creaBaseDatos("otra")
        self.bbdd.usaBaseDatos("otra")
        self.bbdd.creaTabla("origen", "destino_id")
        self.bbdd.creaTabla("destino", "texto")
        self.bbdd.insertarDatos("origen", [999])  # Todavía no hay relaciones en esta base.
        modelo = {"version": 1, "relaciones": [
            {"tabla": "origen", "campo": "destino_id", "tabla_destino": "destino"}]}
        with self.assertRaises(ValueError):
            self.bbdd.configurarRelaciones(self.modeloTemporal(modelo))
        self.assertEqual(UnicornRelaciones(self.bbdd).cargar(), [])

    def test_gestor_no_mezcla_bases(self):
        """El gestor antiguo detecta que la conexión cambió de base."""
        self.bbdd.creaBaseDatos("otra")
        self.bbdd.usaBaseDatos("otra")
        with self.assertRaises(ValueError):
            self.gestor.cargar()

    def test_modelo_ausente_o_roto_no_desactiva_validaciones(self):
        """Un fallo del JSON bloquea inserciones y compactación en vez de ignorar las reglas."""
        ruta = self.carpeta / "relaciones.json"
        original = ruta.read_bytes()
        for contenido in (None, b"{"):
            if contenido is None:
                ruta.unlink()
            else:
                ruta.write_bytes(contenido)
            with self.assertRaises((ValueError, FileNotFoundError)):
                self.cliente()
            with self.assertRaises((ValueError, FileNotFoundError)):
                self.bbdd.compactar("clientes")
            ruta.write_bytes(original)

    def test_integridad_detecta_manipulacion_externa(self):
        """Simula un fichero modificado fuera del motor y bloquea su compactación."""
        self.pedido(self.cliente())
        # Esta escritura directa solo sirve para simular corrupción en datos temporales.
        ruta = self.carpeta / "pedidos.csv"
        ruta.write_bytes(self.bbdd._prepararRegistro([1, 1, 999, "2026-01-01", "vendido"]))
        with self.assertRaises(ValueError):
            self.gestor.validarIntegridad()
        with self.assertRaises(ValueError):
            self.gestor.obtenerRelacionado("pedidos", 1, "cliente_id")
        with self.assertRaises(ValueError):
            self.bbdd.compactar("clientes")

    def test_compactar_reubica_sin_reutilizar_ids(self):
        """Elimina un bloque intermedio y el último; verifica posiciones, IDs y reapertura."""
        for _ in range(4):
            self.cliente()
        self.bbdd.eliminar("clientes", 2)
        self.bbdd.eliminar("clientes", 4)
        self.assertEqual(self.bbdd.compactar("clientes"), 2)
        self.assertEqual(self.bbdd.buscarPosicion("clientes", 3), 512)
        self.assertEqual(self.bbdd.buscarPosicion("clientes", 2), -1)
        self.assertEqual(self.bbdd.buscarPosicion("clientes", 4), -1)
        self.assertIsNone(self.bbdd.seleccionar("clientes", 4, True))
        self.assertEqual((self.carpeta / "clientes.csv").stat().st_size, 1024)
        nueva = UnicornBBDD(self.configuracion)
        nueva.usaBaseDatos("pruebas")
        self.assertEqual([fila["id"] for fila in nueva.listarTodo("clientes")], ["1", "3"])
        self.assertEqual(self.cliente(), 5)
        self.assertEqual(self.bbdd.buscarPosicion("clientes", 5), 1024)
        self.assertFalse(list(self.carpeta.glob("compactacion-*")))

    def test_compactar_conserva_referencias_incluso_inactivas(self):
        """Un pedido inactivo sigue protegiendo a su cliente para mantener el historial."""
        cliente = self.cliente()
        pedido = self.pedido(cliente)
        self.bbdd.eliminar("clientes", cliente)
        self.bbdd.eliminar("pedidos", pedido)
        self.assertEqual(self.gestor.idsProtegidos("clientes"), {cliente})
        self.assertEqual(self.bbdd.compactar("clientes"), 0)
        self.assertIsNotNone(self.gestor.obtenerRelacionado("pedidos", pedido, "cliente_id", True))
        # Cuando se retira físicamente el pedido, su cliente ya no tiene referencias.
        self.assertEqual(self.bbdd.compactar("pedidos"), 1)
        self.assertEqual(self.bbdd.compactar("clientes"), 1)
        self.assertEqual(self.cliente(), 2)

    def test_compactar_conserva_pedido_y_libro_referenciados(self):
        """Las líneas protegen tanto su pedido como su libro, aunque estén inactivos."""
        pedido = self.pedido(self.cliente())
        libro = self.libro()
        self.bbdd.insertarDatos("lineas_pedido", [pedido, libro, 1, 100])
        self.bbdd.eliminar("pedidos", pedido)
        self.bbdd.eliminar("libros", libro)
        self.assertEqual(self.bbdd.compactar("pedidos"), 0)
        self.assertEqual(self.bbdd.compactar("libros"), 0)
        self.assertTrue(self.gestor.validarIntegridad())

    def test_compactar_vacio_o_sin_bajas(self):
        """No reescribe archivos si no hay bloques que retirar."""
        self.assertEqual(self.bbdd.compactar("clientes"), 0)
        self.cliente()
        anterior = (self.carpeta / "clientes.csv").read_bytes()
        self.assertEqual(self.bbdd.compactar("clientes"), 0)
        self.assertEqual((self.carpeta / "clientes.csv").read_bytes(), anterior)

    def test_compactar_revierte_fallo_del_segundo_archivo(self):
        """Simula un fallo al sustituir el índice y comprueba la restauración de ambos archivos."""
        self.cliente()
        self.cliente()
        self.bbdd.eliminar("clientes", 1)
        anteriores = {extension: (self.carpeta / ("clientes" + extension)).read_bytes()
                      for extension in (".csv", ".idx")}
        reemplazar = os.replace

        def reemplazoConFallo(origen, destino):
            """Deja sustituir los datos, pero provoca un error antes de sustituir el índice."""
            if str(destino).endswith(".idx"):
                raise OSError("fallo simulado del índice")
            return reemplazar(origen, destino)

        with patch("UnicornBBDD.os.replace", side_effect=reemplazoConFallo):
            with self.assertRaises(OSError):
                self.bbdd.compactar("clientes")
        for extension, contenido in anteriores.items():
            self.assertEqual((self.carpeta / ("clientes" + extension)).read_bytes(), contenido)
        self.assertEqual(len(self.bbdd.listarTodo("clientes", True)), 2)
        self.assertFalse((self.carpeta / "clientes.compactacion-pendiente").exists())
        self.assertFalse(list(self.carpeta.glob("compactacion-*")))

    def test_interrupcion_conserva_copias_y_bloquea_tabla(self):
        """Una interrupción fuera de Exception deja copias y un marcador para revisión."""
        cliente = self.cliente()
        self.bbdd.eliminar("clientes", cliente)
        with patch("UnicornBBDD.os.replace", side_effect=KeyboardInterrupt):
            with self.assertRaises(KeyboardInterrupt):
                self.bbdd.compactar("clientes")
        marcador = self.carpeta / "clientes.compactacion-pendiente"
        copias = Path(marcador.read_text(encoding="utf-8"))
        self.assertTrue((copias / "datos.previos").exists())
        self.assertTrue((copias / "indice.previo").exists())
        nueva = UnicornBBDD(self.configuracion)
        nueva.usaBaseDatos("pruebas")
        with self.assertRaises(RuntimeError):
            nueva.listarTodo("clientes")
        with self.assertRaises(RuntimeError):
            nueva.insertarDatos("clientes", ["prueba", "", "", ""])

    def test_fallo_de_restauracion_conserva_copias(self):
        """Si tampoco se puede restaurar, no elimina las copias ni permite usar la tabla."""
        cliente = self.cliente()
        self.bbdd.eliminar("clientes", cliente)
        # Las dos primeras copias son las de seguridad; la tercera sería la restauración.
        from shutil import copyfile
        llamadas = 0

        def copiarConFallo(origen, destino):
            """Permite preparar las copias y simula que su restauración no puede escribirse."""
            nonlocal llamadas
            llamadas += 1
            if llamadas > 2:
                raise OSError("fallo simulado de restauración")
            return copyfile(origen, destino)

        with patch("UnicornBBDD.shutil.copyfile", side_effect=copiarConFallo):
            with patch("UnicornBBDD.os.replace", side_effect=OSError("fallo de sustitución")):
                with self.assertRaises(OSError):
                    self.bbdd.compactar("clientes")
        marcador = self.carpeta / "clientes.compactacion-pendiente"
        copias = Path(marcador.read_text(encoding="utf-8"))
        self.assertTrue((copias / "datos.previos").is_file())
        self.assertTrue((copias / "indice.previo").is_file())
        with self.assertRaises(RuntimeError):
            self.bbdd.listarTodo("clientes")

    def test_compactacion_conserva_texto_especial(self):
        """Verifica que reubicar un registro conserve comillas, tildes, saltos y espacios."""
        primero = self.cliente()
        campos = ['texto, "entre comillas"', "áñ\nsegunda línea", "", "  final  "]
        segundo = self.bbdd.insertarDatos("clientes", campos)
        self.bbdd.eliminar("clientes", primero)
        self.assertEqual(self.bbdd.compactar("clientes"), 1)
        self.assertEqual(self.bbdd.leerRegistro("clientes", segundo), [str(segundo), "1"] + campos)
        self.assertEqual(self.bbdd.buscarPosicion("clientes", segundo), 0)

    def test_modelo_reutilizable_en_otro_tema(self):
        """Instala relaciones de equipos y ubicaciones sin depender del modelo de librería."""
        self.bbdd.creaBaseDatos("inventario")
        self.bbdd.usaBaseDatos("inventario")
        self.bbdd.creaTabla("ubicaciones", "etiqueta")
        self.bbdd.creaTabla("equipos", "ubicacion_id")
        modelo = {"version": 1, "relaciones": [
            {"tabla": "equipos", "campo": "ubicacion_id", "tabla_destino": "ubicaciones"}]}
        self.bbdd.configurarRelaciones(self.modeloTemporal(modelo))
        ubicacion = self.bbdd.insertarDatos("ubicaciones", ["prueba"])
        equipo = self.bbdd.insertarDatos("equipos", [ubicacion])
        gestor = UnicornRelaciones(self.bbdd)
        self.assertEqual(gestor.obtenerRelacionado("equipos", equipo, "ubicacion_id")["id"], str(ubicacion))
        with self.assertRaises(ValueError):
            self.bbdd.insertarDatos("equipos", [999])

    @unittest.skipUnless(os.name == "nt", "Windows no distingue mayúsculas en estas rutas")
    def test_mayusculas_no_evitan_relaciones(self):
        """Comprueba que otro uso de mayúsculas no permita saltarse una referencia."""
        with self.assertRaises(ValueError):
            self.bbdd.insertarDatos("PEDIDOS", [999, "2026-01-01", "vendido"])
        cliente = self.cliente()
        self.pedido(cliente)
        self.bbdd.eliminar("clientes", cliente)
        self.assertEqual(self.bbdd.compactar("CLIENTES"), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)  # Muestra el resultado de cada prueba al ejecutar este archivo.
