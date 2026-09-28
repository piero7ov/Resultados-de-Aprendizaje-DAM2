"""Ejecutar: python -B pruebas_unicorn_bbdd.py

Solo usa datos técnicos de prueba en directorios temporales. unittest forma
parte de Python y devuelve un código de error si falla alguna comprobación.
"""

import csv
import io
import json
import os
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

from UnicornBBDD import UnicornBBDD, UnicornSerializador


class PruebasUnicorn(unittest.TestCase):
    """Pruebas independientes del motor con unittest, incluido en Python.

    Cada método test_ es una prueba; setUp se ejecuta de nuevo para cada una.
    assertEqual compara resultados y assertRaises comprueba errores esperados.
    Estos métodos de unittest siguen funcionando con Python optimizado (-O).
    """

    def setUp(self):
        """Prepara una base temporal antes de cada prueba y programa su limpieza."""
        self.temporal = tempfile.TemporaryDirectory(prefix="unicorn-pruebas-")
        self.addCleanup(self.temporal.cleanup)  # Limpia esta carpeta aunque falle la prueba.
        self.raiz = Path(self.temporal.name)
        self.configuracion = self.raiz / "config.json"
        self.guardarConfiguracion({"instalacion": "datos", "tamanoRegistro": 512})
        self.bbdd = UnicornBBDD(self.configuracion)
        self.bbdd.creaBaseDatos("pruebas")
        self.bbdd.usaBaseDatos("pruebas")
        self.bbdd.creaTabla("registros", "texto,numero")
        self.carpeta = self.raiz / "datos" / "pruebas"

    def guardarConfiguracion(self, contenido):
        """Escribe el JSON temporal que utilizará la prueba."""
        self.configuracion.write_text(json.dumps(contenido), encoding="utf-8")

    def insertar(self, texto="prueba", numero=1):
        """Inserta un registro técnico de prueba y devuelve su ID."""
        return self.bbdd.insertarDatos("registros", [texto, numero])

    def test_serializacion_especiales(self):
        """Verifica la conversión de ida y vuelta con caracteres especiales y separadores."""
        serializador = UnicornSerializador()
        campos = ["texto, con coma", 'texto "entre comillas"', "ñá😀", "", "  espacios  ", "línea\nsegunda\r\ntercera"]
        for delimitador in (",", "|"):
            # Cada subTest identifica la variante que falla y permite probar las siguientes.
            with self.subTest(delimitador=delimitador):
                self.assertEqual(serializador.deserializar(
                    serializador.serializar(campos, delimitador), delimitador), campos)

    def test_serializacion_invalida(self):
        """Verifica el rechazo de entradas inválidas y comillas sin cerrar."""
        serializador = UnicornSerializador()
        for valor in (None, [], "texto"):
            with self.subTest(valor=valor), self.assertRaises(ValueError):
                serializador.serializar(valor)
        for valor in (None, "", "a\nb"):
            with self.subTest(valor=valor), self.assertRaises(ValueError):
                serializador.deserializar(valor)
        with self.assertRaises(csv.Error):
            serializador.deserializar('"sin cierre')

    def test_configuracion_por_defecto_sin_crear_datos(self):
        """Comprueba los valores configurados en el proyecto y la selección inicial."""
        bbdd = UnicornBBDD()
        self.assertEqual(bbdd.tamanoRegistro, 512)
        self.assertEqual(bbdd.basededatos, "")
        self.assertEqual(Path(bbdd.instalacion), Path(__file__).resolve().parent / "datos")

    def test_ruta_independiente_de_la_terminal(self):
        """Cambia la carpeta de ejecución y verifica que la ruta dependa del JSON."""
        anterior = os.getcwd()
        try:
            os.chdir(self.raiz)
            bbdd = UnicornBBDD(self.configuracion)
            self.assertEqual(Path(bbdd.instalacion), self.raiz / "datos")
        finally:
            os.chdir(anterior)  # Restaura la carpeta de ejecución incluso si falla la comprobación.

    def test_ruta_absoluta(self):
        """Verifica que una ruta absoluta se respete sin crearla en el constructor."""
        destino = self.raiz / "otra_instalacion"
        self.guardarConfiguracion({"instalacion": str(destino), "tamanoRegistro": 512})
        bbdd = UnicornBBDD(self.configuracion)
        self.assertEqual(Path(bbdd.instalacion), destino)
        self.assertFalse(destino.exists())

    def test_configuracion_invalida(self):
        """Comprueba errores por propiedades inválidas, JSON mal formado o archivo ausente."""
        configuraciones = [[], {}, {"instalacion": "", "tamanoRegistro": 512}]
        configuraciones += [{"instalacion": "datos", "tamanoRegistro": valor}
                            for valor in (0, -1, 31, True, "512", 512.5)]
        for configuracion in configuraciones:
            with self.subTest(configuracion=configuracion):
                self.guardarConfiguracion(configuracion)
                with self.assertRaises(ValueError):
                    UnicornBBDD(self.configuracion)
        self.configuracion.write_text("{", encoding="utf-8")
        with self.assertRaises(json.JSONDecodeError):
            UnicornBBDD(self.configuracion)
        with self.assertRaises(FileNotFoundError):
            UnicornBBDD(self.raiz / "ausente.json")

    def test_bases_y_seleccion(self):
        """Comprueba duplicados, bases ausentes y operaciones sin seleccionar una base."""
        with self.assertRaises(FileExistsError):
            self.bbdd.creaBaseDatos("pruebas")
        with self.assertRaises(FileNotFoundError):
            self.bbdd.usaBaseDatos("ausente")
        self.assertEqual(self.bbdd.basededatos, "pruebas")
        (self.raiz / "datos" / "archivo").touch()
        with self.assertRaises(FileNotFoundError):
            self.bbdd.usaBaseDatos("archivo")
        otra = UnicornBBDD(self.configuracion)
        with self.assertRaises(ValueError):
            otra.creaTabla("tabla", "campo")

    def test_nombres_seguros(self):
        """Verifica el rechazo de rutas y nombres no permitidos."""
        for nombre in ("", "../fuera", "a/b", "a\\b", "C:fuera", "CON", "1tabla"):
            with self.subTest(nombre=nombre):
                for metodo in (self.bbdd.creaBaseDatos, self.bbdd.usaBaseDatos,
                               self.bbdd.obtenerEsquema):
                    with self.assertRaises(ValueError):
                        metodo(nombre)

    def test_tabla_y_esquema(self):
        """Verifica archivos, campos y errores por tablas ausentes o repetidas."""
        for extension in (".csv", ".idx", ".esquema", ".meta.json"):
            self.assertTrue((self.carpeta / ("registros" + extension)).is_file())
        self.assertEqual(self.bbdd.obtenerEsquema("registros"), ["id", "activo", "texto", "numero"])
        self.assertTrue(self.bbdd.validarDatos("registros", ["prueba", 1]))
        with self.assertRaises(FileExistsError):
            self.bbdd.creaTabla("registros", "otro")
        with self.assertRaises(FileNotFoundError):
            self.bbdd.obtenerEsquema("ausente")

    def test_esquemas_invalidos(self):
        """Comprueba que un esquema inválido no deje archivos de tabla."""
        for esquema in ("", "id", "activo", "ID", "texto,texto", "texto,TEXTO", "texto,", None):
            with self.subTest(esquema=esquema), self.assertRaises(ValueError):
                self.bbdd.creaTabla("invalida", esquema)
        self.assertFalse(list(self.carpeta.glob("invalida.*")))

    def test_creacion_fallida_retira_solo_archivos_nuevos(self):
        """Simula un fallo al guardar metadatos y verifica la limpieza sin afectar otra tabla."""
        # patch sustituye json.dump solo dentro del bloque para provocar un error controlado.
        with patch("UnicornBBDD.json.dump", side_effect=OSError("fallo simulado")):
            with self.assertRaises(OSError):
                self.bbdd.creaTabla("fallida", "campo")
        self.assertFalse(list(self.carpeta.glob("fallida.*")))
        self.assertTrue((self.carpeta / "registros.csv").exists())

    def test_insertar_ids_y_posiciones(self):
        """Verifica IDs consecutivos, posiciones por bloques y tamaño del archivo."""
        self.assertEqual(self.bbdd.siguienteId("registros"), 1)
        for identificador in range(1, 4):
            self.assertEqual(self.insertar(numero=identificador), identificador)
            self.assertEqual(self.bbdd.buscarPosicion("registros", identificador), (identificador - 1) * 512)
        self.assertEqual(self.bbdd.siguienteId("registros"), 4)
        self.assertEqual((self.carpeta / "registros.csv").stat().st_size, 1536)

    def test_consultas_y_ausentes(self):
        """Comprueba los formatos devueltos por las consultas y los resultados sin coincidencias."""
        self.assertEqual(self.bbdd.listarTodo("registros"), [])
        self.insertar()
        self.assertEqual(self.bbdd.leerRegistro("registros", 1), ["1", "1", "prueba", "1"])
        esperado = {"id": "1", "activo": "1", "texto": "prueba", "numero": "1"}
        self.assertEqual(self.bbdd.seleccionar("registros", "1"), esperado)
        self.assertEqual(self.bbdd.listarTodo("registros"), [esperado])
        self.assertEqual(self.bbdd.buscarColumna("registros", "numero", 1), [esperado])
        self.assertEqual(self.bbdd.buscarColumna("registros", "numero", 9), [])
        self.assertIsNone(self.bbdd.seleccionar("registros", 999))
        self.assertEqual(self.bbdd.buscarPosicion("registros", 999), -1)
        with self.assertRaises(ValueError):
            self.bbdd.buscarColumna("registros", "ausente", 1)

    def test_ids_invalidos(self):
        """Verifica que solo se admitan IDs positivos en el formato esperado."""
        for identificador in (0, -1, True, "01", "1.0", 1.5, None):
            with self.subTest(id=identificador), self.assertRaises(ValueError):
                self.bbdd.buscarPosicion("registros", identificador)

    def test_persistencia_de_campos_especiales(self):
        """Reabre la base y verifica que caracteres especiales y espacios se conserven."""
        textos = ['coma, y "comillas"', "áñ😀", "", "  espacios  ", "a\nb\r\nc"]
        for texto in textos:
            self.insertar(texto)
        nueva = UnicornBBDD(self.configuracion)
        nueva.usaBaseDatos("pruebas")
        self.assertEqual([fila["texto"] for fila in nueva.listarTodo("registros")], textos)
        # También se preserva el último campo, donde está el relleno del bloque.
        self.bbdd.actualizar("registros", 1, ["prueba", "  final  "])
        self.assertEqual(nueva.seleccionar("registros", 1)["numero"], "  final  ")

    def test_actualizacion_en_su_posicion(self):
        """Comprueba que actualizar no mueva el bloque ni altere el registro vecino."""
        self.insertar()
        self.insertar("segundo")
        self.assertTrue(self.bbdd.actualizar("registros", 1, ["cambio", 2]))
        self.assertEqual(self.bbdd.seleccionar("registros", 1)["texto"], "cambio")
        self.assertEqual(self.bbdd.seleccionar("registros", 2)["texto"], "segundo")
        self.assertEqual(self.bbdd.buscarPosicion("registros", 1), 0)
        self.assertEqual((self.carpeta / "registros.csv").stat().st_size, 1024)
        with self.assertRaises(ValueError):
            self.bbdd.actualizar("registros", 999, ["cambio", 1])

    def test_validaciones_no_modifican_archivos(self):
        """Compara datos e índice antes y después de operaciones rechazadas."""
        self.insertar()
        anteriores = {extension: (self.carpeta / ("registros" + extension)).read_bytes()
                      for extension in (".csv", ".idx")}
        for datos in (["uno"], [1, 2, 3], "no lista", ["á" * 300, 1]):
            with self.subTest(datos=datos):
                with self.assertRaises(ValueError):
                    self.bbdd.insertarDatos("registros", datos)
                with self.assertRaises(ValueError):
                    self.bbdd.actualizar("registros", 1, datos)
        for extension, contenido in anteriores.items():
            self.assertEqual((self.carpeta / ("registros" + extension)).read_bytes(), contenido)

    def test_limite_exacto_en_bytes(self):
        """Verifica que quepa el límite exacto del bloque y se rechace un byte adicional."""
        base = len(UnicornSerializador().serializar([1, 1, "", 1]).encode("utf-8"))
        limite = 511 - base  # De los 512 bytes, uno se reserva para el salto final.
        self.insertar("x" * limite)
        self.assertEqual(len(self.bbdd.seleccionar("registros", 1)["texto"]), limite)
        with self.assertRaises(ValueError):
            self.bbdd.actualizar("registros", 1, ["x" * (limite + 1), 1])

    def test_borrado_logico_e_historial(self):
        """Verifica ocultación, historial, conservación del bloque y no reutilización del ID."""
        self.insertar()
        self.assertTrue(self.bbdd.eliminar("registros", 1))
        self.assertIsNone(self.bbdd.seleccionar("registros", 1))
        self.assertEqual(self.bbdd.listarTodo("registros"), [])
        self.assertEqual(self.bbdd.buscarColumna("registros", "texto", "prueba"), [])
        historico = self.bbdd.seleccionar("registros", 1, incluirInactivos=True)  # Sigue físicamente guardado.
        self.assertEqual(historico["activo"], "0")
        self.assertEqual(self.bbdd.listarTodo("registros", True), [historico])
        self.assertEqual(self.bbdd.buscarColumna("registros", "texto", "prueba", True), [historico])
        self.assertEqual(self.bbdd.buscarPosicion("registros", 1), 0)
        self.assertEqual((self.carpeta / "registros.csv").stat().st_size, 512)
        for identificador in (1, 999):
            with self.assertRaises(ValueError):
                self.bbdd.eliminar("registros", identificador)
        with self.assertRaises(ValueError):
            self.bbdd.actualizar("registros", 1, ["cambio", 1])
        self.assertEqual(self.insertar(), 2)

    def test_tamano_incompatible(self):
        """Cambia el tamaño configurado y verifica el rechazo de operaciones incompatibles."""
        self.insertar()
        self.guardarConfiguracion({"instalacion": "datos", "tamanoRegistro": 256})
        otra = UnicornBBDD(self.configuracion)
        otra.usaBaseDatos("pruebas")
        with self.assertRaisesRegex(ValueError, "Tamaño incompatible"):
            otra.listarTodo("registros")
        with self.assertRaises(ValueError):
            otra.insertarDatos("registros", ["prueba", 1])

    def test_metadatos_obligatorios(self):
        """Retira los metadatos temporales y comprueba que no se use la tabla sin ellos."""
        (self.carpeta / "registros.meta.json").unlink()
        with self.assertRaises(FileNotFoundError):
            self.bbdd.listarTodo("registros")

    def test_bloque_truncado(self):
        """Recorta un bloque temporal y verifica que se detecte el archivo incompleto."""
        self.insertar()
        with open(self.carpeta / "registros.csv", "r+b") as archivo:
            archivo.truncate(511)  # Simula un bloque incompleto; solo modifica datos temporales.
        with self.assertRaises(ValueError):
            self.bbdd.listarTodo("registros")

    def test_indice_incorrecto(self):
        """Introduce índices defectuosos y comprueba que provoquen errores."""
        self.insertar()
        for contenido in ("", "1,1\n", "1,512\n", "1,0\n1,0\n", "incorrecto\n"):
            (self.carpeta / "registros.idx").write_text(contenido, encoding="utf-8")
            with self.subTest(contenido=contenido), self.assertRaises(ValueError):
                self.bbdd.listarTodo("registros")

    def test_indice_apunta_a_otro_registro(self):
        """Intercambia posiciones del índice y verifica la detección de IDs discordantes."""
        self.insertar()
        self.insertar()
        (self.carpeta / "registros.idx").write_text("1,512\n2,0\n", encoding="utf-8")
        with self.assertRaises(ValueError):
            self.bbdd.seleccionar("registros", 1)
        with self.assertRaises(ValueError):
            self.bbdd.listarTodo("registros")

    def test_reactivar_conserva_posicion_y_datos(self):
        """Reactivar cambia solo activo, sin duplicar el ID ni modificar el índice."""
        self.insertar()
        indice = (self.carpeta / "registros.idx").read_bytes()
        self.bbdd.eliminar("registros", 1)
        self.assertTrue(self.bbdd.reactivar("registros", 1))
        self.assertEqual(self.bbdd.leerRegistro("registros", 1), ["1", "1", "prueba", "1"])
        self.assertEqual(self.bbdd.buscarPosicion("registros", 1), 0)
        self.assertEqual((self.carpeta / "registros.idx").read_bytes(), indice)
        self.assertEqual((self.carpeta / "registros.csv").stat().st_size, 512)
        with self.assertRaises(ValueError):
            self.bbdd.reactivar("registros", 1)
        with self.assertRaises(ValueError):
            self.bbdd.reactivar("registros", 999)

    def test_motor_no_imprime(self):
        """Captura la salida para comprobar que el motor deje la presentación a la interfaz."""
        salida = io.StringIO()
        with redirect_stdout(salida):  # Recoge los posibles print sin mostrarlos en la terminal.
            self.insertar()
            self.bbdd.listarTodo("registros")
            self.bbdd.buscarColumna("registros", "texto", "prueba")
            self.bbdd.actualizar("registros", 1, ["cambio", 2])
            self.bbdd.eliminar("registros", 1)
        self.assertEqual(salida.getvalue(), "")


if __name__ == "__main__":
    # Ejecuta las pruebas solo al lanzar este archivo, no cuando otro módulo lo importa.
    unittest.main(verbosity=2)
