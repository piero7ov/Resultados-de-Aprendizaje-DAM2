"""Conversiones en bases temporales: round-trip, rechazos y preservación del origen."""

import csv
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from UnicornBBDD import UnicornBBDD
from UnicornLibreria import UnicornLibreria
from UnicornIntercambio import UnicornIntercambio
from consola_unicorn import ConsolaUnicorn
from datos_demo import abrirDemo


class PruebasIntercambio(unittest.TestCase):
    """Utiliza datos técnicos aislados; nunca modifica la librería del alumno."""

    def setUp(self):
        self.temporal = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporal.cleanup)
        self.raiz = Path(self.temporal.name)
        self.config = self.raiz / "config.json"
        self.config.write_text(json.dumps({"instalacion": "datos", "tamanoRegistro": 512}), encoding="utf-8")
        self.conexion = UnicornBBDD(self.config)
        self.conexion.creaBaseDatos("origen")
        self.conexion.usaBaseDatos("origen")
        self.app = UnicornLibreria(self.conexion)
        self.app.prepararTablas()
        self.app.crearCliente('Prueba, "ñ"\nsegunda línea  ')
        self.app.crearLibro("PRUEBA", "Título", "", 1234, 10)
        self.app.registrarVenta(1, [(1, 2)])
        self.app.desactivarCliente(1)  # La venta conserva un vínculo histórico al cliente inactivo.
        self.gestor = UnicornIntercambio(self.conexion)
        self.exportacion = self.raiz / "exportacion"

    def instantanea(self):
        """Compara bytes de todos los ficheros de la base original."""
        return {p.name: p.read_bytes() for p in (self.raiz / "datos/origen").iterdir() if p.is_file()}

    def abrirImportada(self, nombre="copia"):
        conexion = UnicornBBDD(self.config)
        conexion.usaBaseDatos(nombre)
        return conexion

    def cambiarJson(self, modificar):
        """Genera un paquete correcto y altera un dato concreto para probar su rechazo."""
        self.gestor.exportar(self.exportacion, "json")
        ruta = self.exportacion / "datos.json"
        paquete = json.loads(ruta.read_text(encoding="utf-8"))
        modificar(paquete)
        ruta.write_text(json.dumps(paquete), encoding="utf-8")

    def rechazar(self, formato="json"):
        anterior = self.instantanea()
        with self.assertRaises((ValueError, OSError, csv.Error)):
            self.gestor.importar(self.exportacion, formato, "copia")
        self.assertFalse((self.raiz / "datos/copia").exists())
        self.assertEqual(anterior, self.instantanea())
        self.assertEqual(list((self.raiz / "datos").glob(".importar-*")), [])

    def test_ida_vuelta_json_y_csv(self):
        anterior = self.instantanea()
        for formato in ("json", "csv"):
            with self.subTest(formato=formato):
                destino = self.raiz / formato
                self.gestor.exportar(destino, formato)
                self.gestor.importar(destino, formato, "copia_" + formato)
                copia = self.abrirImportada("copia_" + formato)
                for tabla in UnicornLibreria.ESQUEMAS:
                    self.assertEqual(self.conexion.listarTodo(tabla, True), copia.listarTodo(tabla, True))
                self.assertEqual(copia.seleccionar("libros", 1)["stock"], "8")
                UnicornLibreria(copia).listarClientes(True)
        self.assertEqual(anterior, self.instantanea())
        self.assertEqual(self.conexion.basededatos, "origen")

    def test_50_registros_ambos_formatos(self):
        # Genera el conjunto aprobado únicamente dentro del directorio temporal de la prueba.
        abrirDemo(self.conexion)
        for formato in ("csv", "json"):
            destino = self.raiz / formato
            self.gestor.exportar(destino, formato)
            self.gestor.importar(destino, formato, "copia_" + formato)
            copia = self.abrirImportada("copia_" + formato)
            self.assertEqual(sum(len(copia.listarTodo(t, True)) for t in UnicornLibreria.ESQUEMAS), 50)
            for tabla in UnicornLibreria.ESQUEMAS:
                self.assertEqual(self.conexion.listarTodo(tabla, True), copia.listarTodo(tabla, True))

    def test_base_vacia(self):
        self.conexion.creaBaseDatos("vacia")
        self.conexion.usaBaseDatos("vacia")
        UnicornLibreria(self.conexion).prepararTablas()
        for formato in ("csv", "json"):
            destino = self.raiz / formato
            self.gestor.exportar(destino, formato)
            self.gestor.importar(destino, formato, "copia_" + formato)
            copia = self.abrirImportada("copia_" + formato)
            for tabla in UnicornLibreria.ESQUEMAS:
                self.assertEqual(copia.listarTodo(tabla, True), [])

    def test_nombre_y_formato_invalidos(self):
        with self.assertRaises(ValueError):
            self.gestor.importar(self.exportacion, "json", "../fuera")
        with self.assertRaises(ValueError):
            self.gestor.exportar(self.exportacion, "xml")
        with self.assertRaises(ValueError):
            self.gestor.importar(self.exportacion, "xml", "copia")
        self.assertFalse(self.exportacion.exists())

    def test_fallo_publicacion_no_deja_base_parcial(self):
        self.gestor.exportar(self.exportacion, "json")
        with patch("UnicornIntercambio.os.rename", side_effect=PermissionError("Fallo simulado")):
            self.rechazar()

    def test_ids_retirados_no_se_reutilizan(self):
        id = self.app.crearCliente("Retirar")
        self.app.desactivarCliente(id)
        self.conexion.compactar("clientes")
        for formato in ("csv", "json"):
            destino = self.raiz / formato
            self.gestor.exportar(destino, formato)
            self.gestor.importar(destino, formato, "copia_" + formato)
            copia = self.abrirImportada("copia_" + formato)
            self.assertEqual(copia.siguienteId("clientes"), id + 1)
            self.assertEqual(copia._leerIndice("clientes")[id], -1)

    def test_destinos_existentes_no_se_sobrescriben(self):
        self.gestor.exportar(self.exportacion, "json")
        contenido = (self.exportacion / "datos.json").read_bytes()
        with self.assertRaises(FileExistsError):
            self.gestor.exportar(self.exportacion, "json")
        anterior = self.instantanea()
        with self.assertRaises(FileExistsError):
            self.gestor.importar(self.exportacion, "json", "origen")
        self.assertEqual(anterior, self.instantanea())
        self.assertEqual(contenido, (self.exportacion / "datos.json").read_bytes())

    def test_referencia_inexistente(self):
        self.cambiarJson(lambda p: p["tablas"]["pedidos"]["registros"][0].update(cliente_id="999"))
        self.rechazar()

    def test_id_duplicado(self):
        self.cambiarJson(lambda p: p["tablas"]["clientes"]["registros"].append(p["tablas"]["clientes"]["registros"][0]))
        self.rechazar()

    def test_estado_incorrecto(self):
        self.cambiarJson(lambda p: p["tablas"]["pedidos"]["registros"][0].update(estado="desconocido"))
        self.rechazar()

    def test_reserva_supera_stock(self):
        def modificar(p):
            p["tablas"]["clientes"]["registros"][0]["activo"] = "1"
            p["tablas"]["pedidos"]["registros"][0]["estado"] = "reservado"
            p["tablas"]["libros"]["registros"][0]["stock"] = "0"
        self.cambiarJson(modificar)
        self.rechazar()

    def test_campo_demasiado_largo(self):
        self.cambiarJson(lambda p: p["tablas"]["clientes"]["registros"][0].update(nombre="ñ" * 512))
        self.rechazar()

    def test_tipo_json_incorrecto(self):
        self.cambiarJson(lambda p: p["tablas"]["clientes"]["registros"][0].update(id=1))
        self.rechazar()

    def test_tabla_ausente(self):
        self.cambiarJson(lambda p: p["tablas"].pop("libros"))
        self.rechazar()

    def test_clave_json_repetida(self):
        self.exportacion.mkdir()
        (self.exportacion / "datos.json").write_text('{"formato":1,"formato":2}')
        self.rechazar()

    def test_csv_cabecera_incorrecta(self):
        self.gestor.exportar(self.exportacion, "csv")
        (self.exportacion / "clientes.csv").write_text("id,id\n1,1\n")
        self.rechazar("csv")

    def test_csv_campos_sobrantes(self):
        self.gestor.exportar(self.exportacion, "csv")
        ruta = self.exportacion / "clientes.csv"
        with ruta.open("a", encoding="utf-8", newline="") as archivo:
            csv.writer(archivo).writerow(["9", "1", "Nombre", "", "", "", "sobrante"])
        self.rechazar("csv")

    def test_csv_archivo_ausente(self):
        self.gestor.exportar(self.exportacion, "csv")
        (self.exportacion / "libros.csv").unlink()
        self.rechazar("csv")

    def test_exportacion_fallida_no_publica(self):
        with patch.object(self.gestor, "_guardarJson", side_effect=OSError("Fallo simulado")):
            with self.assertRaises(OSError):
                self.gestor.exportar(self.exportacion, "json")
        self.assertFalse(self.exportacion.exists())
        self.assertEqual(list(self.raiz.glob(".exportar-*")), [])

    def test_exportar_bloquea_operacion_pendiente(self):
        (self.raiz / "datos/origen/.operacion-pendiente").mkdir()
        with self.assertRaises(RuntimeError):
            self.gestor.exportar(self.exportacion, "json")
        self.assertFalse(self.exportacion.exists())

    def test_consola_confirmar_y_cancelar(self):
        salida = []
        respuestas = iter([str(self.exportacion), "n", str(self.exportacion), "s",
                           str(self.exportacion), "copia", "n", str(self.exportacion), "copia", "s"])
        consola = ConsolaUnicorn(self.app, lambda _: next(respuestas), salida.append, False)
        consola.exportarDatos("json")
        self.assertFalse(self.exportacion.exists())
        consola.exportarDatos("json")
        consola.importarDatos("json")
        self.assertFalse((self.raiz / "datos/copia").exists())
        consola.importarDatos("json")
        self.assertTrue((self.raiz / "datos/copia/clientes.csv").exists())
        self.assertEqual(self.conexion.basededatos, "origen")


if __name__ == "__main__":
    unittest.main()
