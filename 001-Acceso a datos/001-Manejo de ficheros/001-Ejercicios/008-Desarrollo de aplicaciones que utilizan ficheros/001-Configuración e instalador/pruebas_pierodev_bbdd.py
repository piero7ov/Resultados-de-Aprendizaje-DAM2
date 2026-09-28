import os
import shutil
import tempfile
from contextlib import redirect_stdout
from io import StringIO

from PierodevBBDD import PierodevSerializador, PierodevBBDD


class PruebasPierodevBBDD:
    def __init__(self):
        self.correctas = 0
        self.incorrectas = 0
        self.directorio = tempfile.mkdtemp(prefix="pierodev-bbdd-pruebas-") + os.sep

    def comprobar(self, nombre, condicion):
        try:
            assert condicion, "La condición de la prueba no se ha cumplido"
            self.correctas += 1
            print("[OK] " + nombre)
        except Exception as error:
            self.incorrectas += 1
            print("[ERROR] " + nombre)
            print(error)

    def captura(self, funcion, *argumentos):
        salida = StringIO()
        try:
            with redirect_stdout(salida):
                resultado = funcion(*argumentos)
            return resultado, salida.getvalue()
        except Exception as error:
            print("Se ha producido un error al capturar la salida:")
            print(error)
            return None, salida.getvalue()

    def ejecutar(self):
        try:
            print("========================================")
            print(" PRUEBAS EXHAUSTIVAS PIERODEV BBDD")
            print("========================================")
            print("Directorio temporal:", self.directorio)

            serial = PierodevSerializador()

            self.comprobar(
                "serializar lista",
                serial.serializar(["Cliente", "Uno", 1]) == "Cliente,Uno,1"
            )
            self.comprobar(
                "serializar con delimitador personalizado",
                serial.serializar(["uno", "dos", "tres"], "|") == "uno|dos|tres"
            )
            self.comprobar(
                "deserializar cadena",
                serial.deserializar("Cliente,Uno,1") == ["Cliente", "Uno", "1"]
            )
            self.comprobar(
                "deserializar con delimitador personalizado",
                serial.deserializar("uno|dos|tres", "|") == ["uno", "dos", "tres"]
            )

            resultado, salida = self.captura(serial.serializar, None)
            self.comprobar(
                "capturar error al serializar",
                resultado is None and "error al serializar" in salida
            )

            resultado, salida = self.captura(serial.deserializar, None)
            self.comprobar(
                "capturar error al deserializar",
                resultado is None and "error al deserializar" in salida
            )

            bbdd = PierodevBBDD()
            bbdd.instalacion = self.directorio.replace("\\", "/")

            self.comprobar(
                "cargar tamaño desde config.json",
                bbdd.tamanoRegistro == 512
            )

            bbdd.creaBaseDatos("empresa")
            self.comprobar(
                "crear base de datos",
                os.path.isdir(self.directorio + "empresa")
            )

            _, salida = self.captura(bbdd.creaBaseDatos, "empresa")
            self.comprobar(
                "impedir base de datos duplicada",
                "ya existe" in salida
            )

            bbdd.usaBaseDatos("empresa")
            self.comprobar(
                "usar base de datos",
                bbdd.basededatos == "empresa"
            )

            bbddInexistente = PierodevBBDD()
            bbddInexistente.instalacion = self.directorio.replace("\\", "/")
            _, salida = self.captura(bbddInexistente.usaBaseDatos, "inexistente")
            self.comprobar(
                "detectar base de datos inexistente",
                "no existe" in salida
            )

            bbdd.creaTabla("clientes", "nombre,apellidos,email")
            self.comprobar(
                "crear archivo de datos",
                os.path.isfile(self.directorio + "empresa/clientes.csv")
            )
            self.comprobar(
                "crear archivo de esquema",
                os.path.isfile(self.directorio + "empresa/clientes.esquema")
            )
            self.comprobar(
                "crear archivo de índice",
                os.path.isfile(self.directorio + "empresa/clientes.idx")
            )
            self.comprobar(
                "obtener esquema",
                bbdd.obtenerEsquema("clientes") == ["id", "activo", "nombre", "apellidos", "email"]
            )
            self.comprobar(
                "validar número correcto de campos",
                bbdd.validarDatos("clientes", ["Cliente", "Uno", "uno@example.com"])
            )

            resultado, salida = self.captura(
                bbdd.validarDatos,
                "clientes",
                ["Cliente", "Uno"]
            )
            self.comprobar(
                "detectar número incorrecto de campos",
                resultado is False and "Se esperaban" in salida
            )
            self.comprobar(
                "siguiente id en tabla vacía",
                bbdd.siguienteId("clientes") == 1
            )

            id1 = bbdd.insertarDatos(
                "clientes",
                ["Cliente", "Uno", "uno@example.com"]
            )
            id2 = bbdd.insertarDatos(
                "clientes",
                ["Cliente", "Dos", "dos@example.com"]
            )
            id3 = bbdd.insertarDatos(
                "clientes",
                ["Cliente", "Tres", "tres@example.com"]
            )

            self.comprobar("insertar primer registro", id1 == 1)
            self.comprobar("insertar segundo registro", id2 == 2)
            self.comprobar("insertar tercer registro", id3 == 3)
            self.comprobar(
                "siguiente id tras inserciones",
                bbdd.siguienteId("clientes") == 4
            )

            posicion1 = bbdd.buscarPosicion("clientes", id1)
            posicion2 = bbdd.buscarPosicion("clientes", id2)
            posicion3 = bbdd.buscarPosicion("clientes", id3)

            self.comprobar("posición registro 1", posicion1 == 0)
            self.comprobar(
                "posición registro 2",
                posicion2 == bbdd.tamanoRegistro
            )
            self.comprobar(
                "posición registro 3",
                posicion3 == bbdd.tamanoRegistro * 2
            )

            resultado, salida = self.captura(
                bbdd.buscarPosicion,
                "clientes",
                999999
            )
            self.comprobar(
                "buscar id inexistente",
                resultado == -1 and "No se ha encontrado" in salida
            )

            self.comprobar(
                "leer registro",
                bbdd.leerRegistro("clientes", id1)
                == ["1", "1", "Cliente", "Uno", "uno@example.com"]
            )

            cliente = bbdd.seleccionar("clientes", id1)
            self.comprobar(
                "seleccionar devuelve diccionario",
                cliente == {
                    "id": "1",
                    "activo": "1",
                    "nombre": "Cliente",
                    "apellidos": "Uno",
                    "email": "uno@example.com"
                }
            )

            _, salida = self.captura(bbdd.listarTodo, "clientes")
            self.comprobar(
                "listarTodo incluye los registros activos",
                "Uno" in salida and "Dos" in salida and "Tres" in salida
            )

            _, salida = self.captura(
                bbdd.buscarColumna,
                "clientes",
                "apellidos",
                "Dos"
            )
            self.comprobar(
                "buscar por columna",
                "Dos" in salida and "dos@example.com" in salida
            )

            _, salida = self.captura(
                bbdd.buscarColumna,
                "clientes",
                "columna_inexistente",
                "Dos"
            )
            self.comprobar(
                "detectar columna inexistente",
                "no existe" in salida
            )

            tamanoAntes = os.path.getsize(self.directorio + "empresa/clientes.csv")
            posicionAntes = bbdd.buscarPosicion("clientes", id2)

            bbdd.actualizar(
                "clientes",
                id2,
                ["Cliente actualizado", "Dos", "actualizado@example.com"]
            )

            tamanoDespues = os.path.getsize(self.directorio + "empresa/clientes.csv")
            posicionDespues = bbdd.buscarPosicion("clientes", id2)
            actualizado = bbdd.seleccionar("clientes", id2)

            self.comprobar(
                "actualizar modifica los datos",
                actualizado["nombre"] == "Cliente actualizado"
                and actualizado["email"] == "actualizado@example.com"
            )
            self.comprobar(
                "actualizar mantiene el tamaño del archivo",
                tamanoAntes == tamanoDespues
            )
            self.comprobar(
                "actualizar mantiene la posición física",
                posicionAntes == posicionDespues
            )

            _, salida = self.captura(
                bbdd.actualizar,
                "clientes",
                id2,
                ["solo", "dos"]
            )
            self.comprobar(
                "impedir actualización con campos incorrectos",
                "Se esperaban" in salida
            )

            datosGrandes = ["A" * 600, "Apellido", "correo@example.com"]
            resultado, salida = self.captura(
                bbdd.insertarDatos,
                "clientes",
                datosGrandes
            )
            self.comprobar(
                "impedir registro mayor que el bloque",
                resultado is None and "máximo permitido" in salida
            )

            tamanoAntes = os.path.getsize(self.directorio + "empresa/clientes.csv")
            bbdd.eliminar("clientes", id3)
            tamanoDespues = os.path.getsize(self.directorio + "empresa/clientes.csv")

            resultado, salida = self.captura(
                bbdd.leerRegistro,
                "clientes",
                id3
            )
            self.comprobar(
                "eliminar es borrado lógico",
                resultado is None and "está eliminado" in salida
            )
            self.comprobar(
                "eliminar no cambia el tamaño",
                tamanoAntes == tamanoDespues
            )
            self.comprobar(
                "eliminado conserva posición antes de compactar",
                bbdd.buscarPosicion("clientes", id3) == posicion3
            )

            _, salida = self.captura(bbdd.eliminar, "clientes", id3)
            self.comprobar(
                "detectar doble eliminación",
                "ya estaba eliminado" in salida
            )

            _, salida = self.captura(bbdd.listarTodo, "clientes")
            self.comprobar(
                "listarTodo oculta eliminados",
                "Tres" not in salida
            )

            _, salida = self.captura(
                bbdd.buscarColumna,
                "clientes",
                "apellidos",
                "Tres"
            )
            self.comprobar(
                "buscarColumna oculta eliminados",
                "{" not in salida
            )

            tamanoAntes = os.path.getsize(self.directorio + "empresa/clientes.csv")
            bbdd.compactar("clientes")
            tamanoDespues = os.path.getsize(self.directorio + "empresa/clientes.csv")

            self.comprobar(
                "compactar elimina el bloque inactivo",
                tamanoDespues == tamanoAntes - bbdd.tamanoRegistro
            )
            self.comprobar(
                "compactar marca la posición eliminada",
                bbdd.buscarPosicion("clientes", id3) == -1
            )

            archivoIndice = open(
                self.directorio + "empresa/clientes.idx",
                'r',
                encoding='utf-8'
            )
            contenidoIndice = archivoIndice.read()
            archivoIndice.close()

            self.comprobar(
                "compactar conserva el historial del id",
                "3,-1" in contenidoIndice
            )

            id4 = bbdd.insertarDatos(
                "clientes",
                ["Cliente", "Cuatro", "cuatro@example.com"]
            )
            self.comprobar(
                "no reutilizar id después de compactar",
                id4 == 4
            )

            bbddSinSeleccion = PierodevBBDD()
            bbddSinSeleccion.instalacion = self.directorio.replace("\\", "/")
            _, salida = self.captura(
                bbddSinSeleccion.creaTabla,
                "sinbbdd",
                "campo"
            )
            self.comprobar(
                "impedir crear tabla sin seleccionar BBDD",
                "No se ha seleccionado" in salida
            )

            _, salida = self.captura(
                bbdd.creaTabla,
                "clientes",
                "campo"
            )
            self.comprobar(
                "impedir tabla duplicada",
                "ya existe" in salida
            )

            resultado, salida = self.captura(
                bbdd.obtenerEsquema,
                "tabla_inexistente"
            )
            self.comprobar(
                "esquema inexistente devuelve None",
                resultado is None and "No existe" in salida
            )

            resultado, salida = self.captura(
                bbdd.siguienteId,
                "tabla_inexistente"
            )
            self.comprobar(
                "índice inexistente devuelve None",
                resultado is None and "No existe" in salida
            )

            _, salida = self.captura(
                bbdd.compactar,
                "tabla_inexistente"
            )
            self.comprobar(
                "impedir compactar tabla inexistente",
                "no existe" in salida
            )

            print()
            print("========================================")
            print(" RESULTADO")
            print("========================================")
            print("Pruebas correctas:", self.correctas)
            print("Pruebas incorrectas:", self.incorrectas)
            print("Total:", self.correctas + self.incorrectas)

            if self.incorrectas == 0:
                print("RESULTADO FINAL: TODAS LAS PRUEBAS HAN PASADO")
            else:
                print("RESULTADO FINAL: HAY PRUEBAS QUE REVISAR")
        except Exception as error:
            print("Se ha producido un error general durante las pruebas:")
            print(error)
        finally:
            try:
                shutil.rmtree(self.directorio)
                print("Directorio temporal eliminado correctamente")
            except Exception as error:
                print("Se ha producido un error al limpiar las pruebas:")
                print(error)


if __name__ == "__main__":
    pruebas = PruebasPierodevBBDD()
    pruebas.ejecutar()
