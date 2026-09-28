import csv
import os


class PierodevBBDD:
    def __init__(self):
        self.instalacion = "./"
        self.basededatos = ""

    def listarTodo(self):
        archivo = open(self.instalacion + self.basededatos, mode='r', newline='', encoding='utf-8')
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


conexion = PierodevBBDD()
conexion.creaBaseDatos("pierodevbbdd")
conexion.usaBaseDatos("pierodevbbdd")
