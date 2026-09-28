"""Pruebas de copias físicas en carpetas temporales; no usan datos del alumno."""

import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from UnicornBBDD import UnicornBBDD
from UnicornLibreria import UnicornLibreria
from UnicornCopias import UnicornCopias
from consola_unicorn import ConsolaUnicorn
from datos_demo import abrirDemo


class PruebasCopias(unittest.TestCase):
    """Comprueba integridad, límites de restauración y formularios de consola."""

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
        self.app.crearCliente('Prueba, "á"\nsegunda línea ')
        self.app.crearLibro("PRUEBA", "Título", "", 1234, 10)
        self.app.registrarVenta(1, [(1, 2)])
        self.app.desactivarCliente(1)
        self.origen = self.raiz / "datos/origen"
        self.copia = self.raiz / "copia"
        self.gestor = UnicornCopias(self.conexion)

    def instantanea(self, carpeta):
        """Recoge nombres relativos y bytes para detectar modificaciones no autorizadas."""
        return {str(p.relative_to(carpeta)): p.read_bytes() for p in carpeta.rglob("*") if p.is_file()}

    def leerManifiesto(self):
        return json.loads((self.copia / "copia.json").read_text(encoding="utf-8"))

    def guardarManifiesto(self, manifiesto):
        (self.copia / "copia.json").write_text(json.dumps(manifiesto), encoding="utf-8")

    def cambiarArchivo(self, nombre, contenido):
        """Actualiza incluso la huella: obliga a comprobar los datos además de SHA-256."""
        (self.copia / "archivos" / nombre).write_bytes(contenido)
        manifiesto = self.leerManifiesto()
        manifiesto["archivos"][nombre] = hashlib.sha256(contenido).hexdigest()
        self.guardarManifiesto(manifiesto)

    def rechazar(self):
        """Exige que ambos caminos rechacen la copia y no dejen una base parcial."""
        anterior = self.instantanea(self.origen)
        copiaAnterior = self.instantanea(self.copia)
        configAnterior = self.config.read_bytes()
        with self.assertRaises((ValueError, OSError, RuntimeError)):
            self.gestor.comprobar(self.copia)
        with self.assertRaises((ValueError, OSError, RuntimeError)):
            self.gestor.restaurar(self.copia, "restaurada")
        self.assertFalse((self.raiz / "datos/restaurada").exists())
        self.assertEqual(list((self.raiz / "datos").glob(".restaurar-copia-*")), [])
        self.assertEqual(anterior, self.instantanea(self.origen))
        self.assertEqual(copiaAnterior, self.instantanea(self.copia))
        self.assertEqual(configAnterior, self.config.read_bytes())

    def test_copia_y_restauracion_exactas(self):
        idRetirado = self.app.crearCliente("Retirar")
        self.app.desactivarCliente(idRetirado)
        self.conexion.compactar("clientes")
        anterior = self.instantanea(self.origen)
        configAnterior = self.config.read_bytes()
        self.gestor.crear(self.copia)
        manifiesto = self.gestor.comprobar(self.copia)
        self.assertEqual(len(manifiesto["archivos"]), 17)
        self.assertEqual(manifiesto["base"], "origen")
        self.assertEqual(anterior, self.instantanea(self.copia / "archivos"))
        copiaAnterior = self.instantanea(self.copia)
        self.gestor.restaurar(self.copia, "restaurada")
        self.assertEqual(anterior, self.instantanea(self.raiz / "datos/restaurada"))
        restaurada = UnicornBBDD(self.config)
        restaurada.usaBaseDatos("restaurada")
        self.assertEqual(restaurada.siguienteId("clientes"), idRetirado + 1)
        self.assertEqual(restaurada._leerIndice("clientes")[idRetirado], -1)
        self.assertEqual(restaurada.seleccionar("libros", 1)["stock"], "8")
        self.assertEqual(self.conexion.basededatos, "origen")
        self.assertEqual(anterior, self.instantanea(self.origen))
        self.assertEqual(copiaAnterior, self.instantanea(self.copia))
        self.assertEqual(configAnterior, self.config.read_bytes())

    def test_copia_con_50_registros(self):
        abrirDemo(self.conexion)
        anterior = self.instantanea(self.raiz / "datos/unicorn_demo")
        self.gestor.crear(self.copia)
        self.gestor.restaurar(self.copia, "restaurada")
        self.assertEqual(anterior, self.instantanea(self.raiz / "datos/restaurada"))

    def test_copia_base_vacia(self):
        self.conexion.creaBaseDatos("vacia")
        self.conexion.usaBaseDatos("vacia")
        UnicornLibreria(self.conexion).prepararTablas()
        self.gestor.crear(self.copia)
        self.gestor.restaurar(self.copia, "restaurada")
        self.assertEqual(self.instantanea(self.raiz / "datos/vacia"), self.instantanea(self.raiz / "datos/restaurada"))

    def test_restaurar_sin_abrir_original_danada(self):
        self.gestor.crear(self.copia)
        esperado = self.instantanea(self.origen)
        (self.origen / "clientes.csv").write_bytes("Dañado".encode("utf-8"))
        conexion = UnicornBBDD(self.config)  # No seleccionamos ninguna base.
        UnicornCopias(conexion).restaurar(self.copia, "restaurada")
        self.assertEqual(esperado, self.instantanea(self.raiz / "datos/restaurada"))
        self.assertEqual(conexion.basededatos, "")

    def test_destinos_existentes_se_conservan(self):
        self.gestor.crear(self.copia)
        anterior = self.instantanea(self.raiz)
        with self.assertRaises(FileExistsError):
            self.gestor.crear(self.copia)
        with self.assertRaises(FileExistsError):
            self.gestor.restaurar(self.copia, "origen")
        self.assertEqual(anterior, self.instantanea(self.raiz))

    def test_no_copia_dentro_de_la_base(self):
        with self.assertRaises(ValueError):
            self.gestor.crear(self.origen / "copia")
        self.assertFalse((self.origen / "copia").exists())

    def test_archivo_modificado(self):
        self.gestor.crear(self.copia)
        (self.copia / "archivos/clientes.csv").write_bytes(b"corrupto")
        self.rechazar()

    def test_archivo_ausente(self):
        self.gestor.crear(self.copia)
        (self.copia / "archivos/libros.idx").unlink()
        self.rechazar()

    def test_archivo_inesperado(self):
        self.gestor.crear(self.copia)
        (self.copia / "archivos/extra.txt").write_text("No pertenece a la copia")
        self.rechazar()

    def test_manifiesto_con_ruta_externa(self):
        self.gestor.crear(self.copia)
        manifiesto = self.leerManifiesto()
        manifiesto["archivos"]["../externo"] = manifiesto["archivos"].pop("libros.idx")
        self.guardarManifiesto(manifiesto)
        self.rechazar()

    def test_manifiesto_claves_repetidas(self):
        self.gestor.crear(self.copia)
        (self.copia / "copia.json").write_text('{"formato":1,"formato":2}')
        self.rechazar()

    def test_huella_invalida(self):
        self.gestor.crear(self.copia)
        manifiesto = self.leerManifiesto()
        manifiesto["archivos"]["libros.idx"] = "no-es-sha256"
        self.guardarManifiesto(manifiesto)
        self.rechazar()

    def test_indice_corrupto_con_huella_correcta(self):
        self.gestor.crear(self.copia)
        self.cambiarArchivo("clientes.idx", b"1,999999\n")
        self.rechazar()

    def test_relacion_rota_con_huella_correcta(self):
        self.gestor.crear(self.copia)
        pedido = self.conexion.seleccionar("pedidos", 1)
        pedido["cliente_id"] = "999"
        campos = self.conexion.obtenerEsquema("pedidos")
        self.cambiarArchivo("pedidos.csv", self.conexion._prepararRegistro([pedido[c] for c in campos]))
        self.rechazar()

    def test_stock_invalido_con_huella_correcta(self):
        self.gestor.crear(self.copia)
        libro = self.conexion.seleccionar("libros", 1)
        libro["stock"] = "-1"
        campos = self.conexion.obtenerEsquema("libros")
        self.cambiarArchivo("libros.csv", self.conexion._prepararRegistro([libro[c] for c in campos]))
        self.rechazar()

    def test_metadatos_incompatibles_con_huella_correcta(self):
        self.gestor.crear(self.copia)
        datos = json.dumps({"formato": "unicorn-1", "tamanoRegistro": 1024}).encode("utf-8")
        self.cambiarArchivo("clientes.meta.json", datos)
        self.rechazar()

    def test_interrupcion_no_deja_copia_publicada(self):
        anterior = self.instantanea(self.origen)
        with patch.object(self.gestor, "_copiarArchivos", side_effect=KeyboardInterrupt):
            with self.assertRaises(KeyboardInterrupt):
                self.gestor.crear(self.copia)
        self.assertFalse(self.copia.exists())
        self.assertEqual(list(self.raiz.glob(".crear-copia-*")), [])
        self.assertEqual(anterior, self.instantanea(self.origen))

    def test_detecta_cambio_durante_copia(self):
        copiar = self.gestor._copiarArchivos

        def simularCambio(origen, destino):
            copiar(origen, destino)
            # Simula otro proceso modificando el origen después de copiarlo.
            (origen / "clientes.idx").write_bytes(b"1,999\n")

        with patch.object(self.gestor, "_copiarArchivos", side_effect=simularCambio):
            with self.assertRaisesRegex(RuntimeError, "cambiaron"):
                self.gestor.crear(self.copia)
        self.assertFalse(self.copia.exists())

    def test_rechaza_desvio_de_ruta(self):
        with patch("UnicornCopias.os.path.realpath", return_value=str(self.raiz / "externo")):
            with self.assertRaisesRegex(ValueError, "enlaces"):
                self.gestor.comprobar(self.copia)

    def test_tamano_incompatible_no_cambia_config(self):
        self.gestor.crear(self.copia)
        config = self.raiz / "otra.json"
        config.write_text(json.dumps({"instalacion": "datos", "tamanoRegistro": 1024}))
        gestor = UnicornCopias(UnicornBBDD(config))
        self.assertEqual(gestor.comprobar(self.copia)["tamanoRegistro"], 512)
        anterior = self.instantanea(self.raiz)
        with self.assertRaisesRegex(ValueError, "512"):
            gestor.restaurar(self.copia, "restaurada")
        self.assertEqual(anterior, self.instantanea(self.raiz))

    def test_operacion_pendiente_no_se_recupera(self):
        (self.origen / ".operacion-pendiente").mkdir()
        anterior = self.instantanea(self.origen)
        with self.assertRaises(RuntimeError):
            self.gestor.crear(self.copia)
        self.assertEqual(anterior, self.instantanea(self.origen))
        self.assertTrue((self.origen / ".operacion-pendiente").exists())
        self.assertFalse(self.copia.exists())

    def test_compactacion_pendiente_bloquea_copia(self):
        (self.origen / "clientes.compactacion-pendiente").write_text("pendiente")
        with self.assertRaises(RuntimeError):
            self.gestor.crear(self.copia)
        self.assertFalse(self.copia.exists())

    def test_no_crear_durante_operacion_activa(self):
        self.conexion._operacionActiva = "operacion-de-prueba"
        with self.assertRaises(RuntimeError):
            self.gestor.crear(self.copia)
        self.assertFalse(self.copia.exists())

    def test_fallo_copia_no_publica(self):
        anterior = self.instantanea(self.origen)
        with patch("UnicornCopias.shutil.copyfile", side_effect=PermissionError("Sin permisos")):
            with self.assertRaises(PermissionError):
                self.gestor.crear(self.copia)
        self.assertEqual(anterior, self.instantanea(self.origen))
        self.assertFalse(self.copia.exists())
        self.assertEqual(list(self.raiz.glob(".crear-copia-*")), [])

    def test_fallo_restauracion_no_publica(self):
        self.gestor.crear(self.copia)
        anterior = self.instantanea(self.raiz)
        with patch("UnicornCopias.os.rename", side_effect=PermissionError("Destino bloqueado")):
            with self.assertRaises(PermissionError):
                self.gestor.restaurar(self.copia, "restaurada")
        self.assertEqual(anterior, self.instantanea(self.raiz))
        self.assertFalse((self.raiz / "datos/restaurada").exists())

    def test_nombre_invalido_y_base_no_seleccionada(self):
        for nombre in ("../fuera", "restaurada.csv", "CON"):
            with self.assertRaises(ValueError):
                self.gestor.restaurar(self.copia, nombre)
        with self.assertRaises(ValueError):
            UnicornCopias(UnicornBBDD(self.config)).crear(self.copia)

    def test_consola_confirmar_cancelar_y_comprobar(self):
        salida = []
        entradas = iter([str(self.copia), "n", str(self.copia), "s", str(self.copia),
                         str(self.copia), "restaurada", "n", str(self.copia), "restaurada", "s"])
        consola = ConsolaUnicorn(self.app, lambda _: next(entradas), salida.append, False)
        consola.crearCopia()
        self.assertFalse(self.copia.exists())
        consola.crearCopia()
        consola.comprobarCopia()
        consola.restaurarCopia()
        self.assertFalse((self.raiz / "datos/restaurada").exists())
        consola.restaurarCopia()
        self.assertTrue((self.raiz / "datos/restaurada").exists())
        self.assertEqual(self.conexion.basededatos, "origen")
        self.assertIn("La copia ha superado", "\n".join(salida))


if __name__ == "__main__":
    unittest.main()
