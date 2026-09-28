import os

ruta = "./"
base = "pierodevbbdd"

os.mkdir(ruta+base)

archivo = open(ruta+base+"/personas.csv", 'w', encoding='utf-8')
archivo.write("1,Piero,Olivares")
archivo.close()
