import csv
import os


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

    def buscarColumna(self, columna, valor):
        archivo = open(self.instalacion + self.basededatos, mode='r', newline='', encoding='utf-8')
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
        cadena = ",".join(map(str, datos))
        archivo.write(cadena + "\n")
        archivo.close()


conexion = PierodevBBDD()
conexion.usaBaseDatos("pierodevbbdd")
conexion.creaTabla("personas", "nombre,apellidos")
conexion.insertarDatos("personas", [1, "Piero", "Olivares"])
conexion.listarTodo("personas")
