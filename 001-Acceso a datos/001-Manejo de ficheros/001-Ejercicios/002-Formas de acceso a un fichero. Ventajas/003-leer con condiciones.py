import csv

columna = "nombre"
valor = "Daniel"

archivo = open("agenda.csv", mode='r', newline='', encoding='utf-8')
lector = csv.DictReader(archivo)
for linea in lector:
    if linea[columna] == valor:
        print(linea)
archivo.close()
