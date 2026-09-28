"""Pruebas del instalador aisladas en carpetas temporales, sin tocar datos de clase."""

import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from consola_unicorn import ConsolaUnicorn
from instalador import instalar, comprobarPermisos
from UnicornBBDD import UnicornBBDD
from UnicornLibreria import UnicornLibreria


class PruebasInstalador(unittest.TestCase):
    """Comprueba creación, conservación, cancelaciones y fallos de instalación."""

    def setUp(self):
        self.temporal = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporal.cleanup)
        self.raiz = Path(self.temporal.name)
        self.config = self.raiz / "config.json"
        self.salida = []

    def ejecutar(self, *respuestas):
        """Sustituye el teclado por respuestas controladas, conservando la interfaz real."""
        entradas = iter(respuestas)
        consola = ConsolaUnicorn(entrada=lambda _: next(entradas), salida=self.salida.append, color=False)
        return instalar(self.config, consola)

    def crearVacia(self):
        self.assertTrue(self.ejecutar("", "", "", "n", "s"))
        conexion = UnicornBBDD(self.config)
        conexion.usaBaseDatos("unicorn_demo")
        return UnicornLibreria(conexion)

    def instantanea(self):
        return {str(p.relative_to(self.raiz)): p.read_bytes()
                for p in self.raiz.rglob("*") if p.is_file()}

    def test_crear_vacia_y_conservar_datos(self):
        app = self.crearVacia()
        app.crearCliente("Ana", "Prueba", "", "")
        anterior = self.instantanea()
        self.assertTrue(self.ejecutar("1", "", "s"))
        self.assertEqual(anterior, self.instantanea())

    def test_cancelar_no_escribe(self):
        self.assertFalse(self.ejecutar("", "", "", "n", "n"))
        self.assertEqual(list(self.raiz.iterdir()), [])

    def test_permiso_denegado_no_reintenta(self):
        with patch.object(Path, "open", side_effect=PermissionError("Acceso denegado")) as apertura:
            with self.assertRaises(PermissionError):
                comprobarPermisos(self.raiz)
        apertura.assert_called_once_with("xb")
        self.assertEqual(list(self.raiz.iterdir()), [])

    def test_comprobacion_crea_carpeta_y_retira_prueba(self):
        carpeta = self.raiz / "nueva" / "datos"
        comprobarPermisos(carpeta)
        self.assertTrue(carpeta.is_dir())
        self.assertEqual(list(carpeta.iterdir()), [])

    def test_fallo_escritura_retira_prueba(self):
        with patch("instalador.os.fsync", side_effect=OSError("Fallo de disco")):
            with self.assertRaises(OSError):
                comprobarPermisos(self.raiz)
        self.assertEqual(list(self.raiz.iterdir()), [])

    def test_colision_no_borra_archivo_previo(self):
        with patch("instalador.uuid4") as identificador:
            identificador.return_value.hex = "fijo"
            archivo = self.raiz / ".unicorn-permisos-fijo"
            archivo.write_bytes(b"Conservar")
            with self.assertRaises(FileExistsError):
                comprobarPermisos(self.raiz)
            self.assertEqual(archivo.read_bytes(), b"Conservar")

    def test_progreso_visible(self):
        self.crearVacia()
        texto = "\n".join(self.salida)
        for paso in ("[1/3]", "[2/3]", "[3/3]"):
            self.assertIn(paso, texto)

    def test_nombre_invalido_no_escribe(self):
        with self.assertRaises(ValueError):
            self.ejecutar("", "", "../otra")
        self.assertEqual(list(self.raiz.iterdir()), [])

    def test_config_danada_se_conserva(self):
        self.config.write_text("{rota", encoding="utf-8")
        with self.assertRaises(ValueError):
            self.ejecutar("1")
        self.assertEqual(self.config.read_text(), "{rota")

    def test_config_danada_se_puede_reemplazar(self):
        self.config.write_text("{rota", encoding="utf-8")
        self.assertTrue(self.ejecutar("2", "", "", "tienda", "s"))
        self.assertEqual(json.loads(self.config.read_text())["tamanoRegistro"], 512)

    def test_cambio_tamano_rechazado_sin_modificar(self):
        self.crearVacia()
        anterior = self.instantanea()
        with self.assertRaises(ValueError):
            self.ejecutar("2", "", "1024", "", "s")
        self.assertEqual(anterior, self.instantanea())

    def test_fallo_permisos_conserva_config(self):
        self.crearVacia()
        anterior = self.instantanea()
        with patch("instalador.comprobarPermisos", side_effect=PermissionError("Sin permiso")):
            with self.assertRaises(PermissionError):
                self.ejecutar("1", "", "s")
        self.assertEqual(anterior, self.instantanea())

    def test_base_incompleta_no_se_rellena(self):
        self.crearVacia()
        (self.raiz / "datos/unicorn_demo/clientes.csv").unlink()
        anterior = self.instantanea()
        with self.assertRaises(FileNotFoundError):
            self.ejecutar("1", "", "s")
        self.assertEqual(anterior, self.instantanea())

    def test_fallo_inicializacion_no_publica(self):
        with patch("instalador.UnicornLibreria.prepararTablas", side_effect=OSError("Fallo")):
            with self.assertRaises(OSError):
                self.ejecutar("", "", "", "n", "s")
        self.assertFalse(self.config.exists())
        self.assertEqual(list((self.raiz / "datos").iterdir()), [])

    def test_ruta_absoluta(self):
        destino = self.raiz / "otra carpeta"
        self.assertTrue(self.ejecutar(str(destino), "", "tienda", "s"))
        self.assertTrue((destino / "tienda/clientes.csv").exists())

    def test_operacion_pendiente_no_se_recupera(self):
        self.crearVacia()
        (self.raiz / "datos/unicorn_demo/.operacion-pendiente").mkdir()
        anterior = self.instantanea()
        with self.assertRaises(RuntimeError):
            self.ejecutar("1", "", "s")
        self.assertEqual(anterior, self.instantanea())
        self.assertTrue((self.raiz / "datos/unicorn_demo/.operacion-pendiente").exists())

    def test_fallo_guardar_config_permite_reintentar(self):
        reemplazar = os.replace

        def bloquearConfiguracion(origen, destino):
            # Simula únicamente el JSON bloqueado, no las escrituras internas de relaciones.
            if Path(destino) == self.config:
                raise PermissionError("JSON bloqueado")
            return reemplazar(origen, destino)

        with patch("instalador.os.replace", side_effect=bloquearConfiguracion):
            with self.assertRaises(PermissionError):
                self.ejecutar("", "", "", "n", "s")
        self.assertFalse(self.config.exists())
        self.assertTrue((self.raiz / "datos/unicorn_demo/clientes.csv").exists())
        self.assertTrue(self.ejecutar("", "", "", "s"))

    def test_cargar_registros_iniciales(self):
        self.assertTrue(self.ejecutar("", "", "", "s", "s"))
        conexion = UnicornBBDD(self.config)
        conexion.usaBaseDatos("unicorn_demo")
        self.assertEqual(sum(len(conexion.listarTodo(t, True))
                             for t in UnicornLibreria.ESQUEMAS), 50)

    def test_modificar_enter_mantiene_valores_actuales(self):
        self.assertTrue(self.ejecutar("datos propios", "1024", "", "n", "s"))
        self.salida.clear()
        self.assertTrue(self.ejecutar("2", "", "", "", "s"))
        datos = json.loads(self.config.read_text())
        self.assertEqual(datos["instalacion"], "datos propios")
        self.assertEqual(datos["tamanoRegistro"], 1024)
        texto = "\n".join(self.salida)
        self.assertIn("CONFIGURACIÓN ACTUAL", texto)
        self.assertIn(str(self.raiz / "datos propios"), texto)

    def test_menu_cancelar_conserva_archivos(self):
        self.crearVacia()
        anterior = self.instantanea()
        self.assertFalse(self.ejecutar("incorrecta", "0"))
        self.assertEqual(anterior, self.instantanea())

    def test_cambiar_ruta_no_mueve_datos(self):
        self.crearVacia().crearCliente("Ana", "Prueba", "", "")
        originales = {p.name: p.read_bytes() for p in
                      (self.raiz / "datos/unicorn_demo").iterdir() if p.is_file()}
        self.assertTrue(self.ejecutar("2", "otra", "", "", "n", "s"))
        for nombre, contenido in originales.items():
            self.assertEqual((self.raiz / "datos/unicorn_demo" / nombre).read_bytes(), contenido)
        conexion = UnicornBBDD(self.config)
        conexion.usaBaseDatos("unicorn_demo")
        self.assertEqual(conexion.listarTodo("clientes"), [])


if __name__ == "__main__":
    unittest.main()
