import csv
import os
import random
import time

ruta = os.path.join(os.path.dirname(__file__), "empresa", "clientes_pierodev.csv")

# La cabecera cuenta como línea 1; la línea 500 es el contacto 499.
archivo = open(ruta, "r", encoding="utf-8")
for numero, linea in enumerate(archivo, start=1):
    if numero == 500:
        print("Línea 500:", linea.strip())
        break
archivo.close()

# Búsqueda secuencial: contamos todas las coincidencias.
inicio = time.perf_counter()
archivo = open(ruta, "r", newline="", encoding="utf-8")
lineas = csv.DictReader(archivo)
contador_secuencial = 0
cantidad = 0

for linea in lineas:
    cantidad += 1
    if linea["nombre"] == "Daniel":
        contador_secuencial += 1

archivo.close()
tiempo_secuencial = time.perf_counter() - inicio

print("Contactos:", cantidad)
print("Personas llamadas Daniel (secuencial):", contador_secuencial)
print("Tiempo secuencial:", tiempo_secuencial, "segundos")

# Guardamos posiciones en bytes para evitar recorrer desde el inicio cada vez.
inicio = time.perf_counter()
archivo = open(ruta, "rb")
archivo.readline()
posiciones = []

while True:
    posicion = archivo.tell()
    linea = archivo.readline()
    if not linea:
        break
    posiciones.append(posicion)

archivo.close()
random.shuffle(posiciones)
tiempo_preparacion = time.perf_counter() - inicio

# Cada registro ocupa una línea en esta agenda; shuffle visita todos una vez.
inicio = time.perf_counter()
archivo = open(ruta, "rb")
contador_aleatorio = 0

for posicion in posiciones:
    archivo.seek(posicion)
    linea = archivo.readline().decode("utf-8")
    datos = next(csv.reader([linea]))
    if datos[1] == "Daniel":
        contador_aleatorio += 1

archivo.close()
tiempo_aleatorio = time.perf_counter() - inicio

print("Personas llamadas Daniel (aleatorio):", contador_aleatorio)
print("Tiempo de preparar y barajar el índice:", tiempo_preparacion, "segundos")
print("Tiempo de búsqueda aleatoria:", tiempo_aleatorio, "segundos")
print("Tiempo aleatorio total:", tiempo_preparacion + tiempo_aleatorio, "segundos")
print("Los recuentos coinciden:", contador_secuencial == contador_aleatorio)
