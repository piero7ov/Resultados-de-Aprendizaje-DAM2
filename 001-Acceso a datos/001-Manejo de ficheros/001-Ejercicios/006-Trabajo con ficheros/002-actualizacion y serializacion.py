import csv
import os


class PierodevSerializador:
    def serializar(self, lista, delimitador=","):
        cadena = ""
        separador = ""
        for elemento in lista:
            cadena += separador + str(elemento)
            separador = delimitador
        return cadena

    def deserializar(self, cadena, delimitador=","):
        lista = cadena.split(delimitador)
        return lista


class PierodevBBDD:
    def __init__(self):
        self.instalacion = "./"
        self.basededatos = ""

    def listarTodo(self, tabla):
        archivo = open(self.instalacion + self.basededatos + "/" + tabla + ".csv", mode='r', newline='', encoding='utf-8')
        lector = csv.DictReader(archivo)
        for linea in lector:
            print(linea)
        archivo.close()

    def buscarColumna(self, tabla, columna, valor):
        archivo = open(self.instalacion + self.basededatos + "/" + tabla + ".csv", mode='r', newline='', encoding='utf-8')
        lector = csv.DictReader(archivo)
        for linea in lector:
            if linea[columna] == valor:
                print(linea)
        archivo.close()

    def creaBaseDatos(self, nombre):
        os.mkdir(self.instalacion + nombre)

    def usaBaseDatos(self, nombre):
        self.basededatos = nombre

    def creaTabla(self, nombre, esquema):
        archivo = open(self.instalacion + self.basededatos + "/" + nombre + ".csv", 'w', encoding='utf-8')
        archivo.write("id," + esquema + "\n")
        archivo.close()

    def insertarDatos(self, tabla, datos):
        archivo = open(self.instalacion + self.basededatos + "/" + tabla + ".csv", 'a', encoding='utf-8')
        serial = PierodevSerializador()
        cadena = serial.serializar(datos)
        archivo.write(cadena + "\n")
        archivo.close()

    def eliminar(self, tabla, columna, valor):
        archivo = open(self.instalacion + self.basededatos + "/" + tabla + ".csv", 'r', newline='', encoding='utf-8')
        lector = csv.DictReader(archivo)
        cabeceras = lector.fieldnames
        lineas = []

        for linea in lector:
            if linea[columna] != valor:
                lineas.append(linea)

        archivo.close()

        archivo = open(self.instalacion + self.basededatos + "/" + tabla + ".csv", 'w', newline='', encoding='utf-8')
        escritor = csv.DictWriter(archivo, fieldnames=cabeceras)
        escritor.writeheader()

        for linea in lineas:
            escritor.writerow(linea)

        archivo.close()

    def actualizar(self, tabla, id, datos):
        archivo = open(self.instalacion + self.basededatos + "/" + tabla + ".csv", 'r', encoding='utf-8')
        lineas = archivo.readlines()
        archivo.close()

        serial = PierodevSerializador()
        nuevaslineas = []

        for linea in lineas:
            linea = linea.strip()
            elementos = serial.deserializar(linea)

            if elementos[0] == str(id):
                elementos = [str(id)] + datos
                linea = serial.serializar(elementos)

            nuevaslineas.append(linea)

        archivo = open(self.instalacion + self.basededatos + "/" + tabla + ".csv", 'w', encoding='utf-8')

        for linea in nuevaslineas:
            archivo.write(linea + "\n")

        archivo.close()


conexion = PierodevBBDD()
# conexion.creaBaseDatos("empresa")
conexion.usaBaseDatos("empresa")
# conexion.creaTabla("clientes", "nombre,apellidos")
# conexion.insertarDatos("clientes", [1, "Piero", "Olivares"])
# conexion.eliminar("clientes", "nombre", "Piero")
# conexion.actualizar("clientes", 1, ["Piero", "Olivares"])
conexion.listarTodo("clientes")
