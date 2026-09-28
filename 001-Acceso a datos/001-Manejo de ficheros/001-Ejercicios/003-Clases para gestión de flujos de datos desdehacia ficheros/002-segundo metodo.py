import csv


class PierodevBBDD:
    def listarTodo(self):
        archivo = open("agenda.csv", mode='r', newline='', encoding='utf-8')
        lector = csv.DictReader(archivo)
        for linea in lector:
            print(linea)
        archivo.close()

    def buscarColumna(self, columna, valor):
        archivo = open("agenda.csv", mode='r', newline='', encoding='utf-8')
        lector = csv.DictReader(archivo)
        for linea in lector:
            if linea[columna] == valor:
                print(linea)
        archivo.close()


conexion = PierodevBBDD()
conexion.listarTodo()
conexion.buscarColumna("nombre", "Daniel")
