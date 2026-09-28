import csv

archivo = open("agenda.csv", mode='r', newline='', encoding='utf-8')
lector = csv.DictReader(archivo)
for linea in lector:
    print(linea ['nombre'], linea['telefono'])
archivo.close()

