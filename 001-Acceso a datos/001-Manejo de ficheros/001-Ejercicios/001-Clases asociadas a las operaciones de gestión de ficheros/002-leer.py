archivo = open("presentacion.txt",'r') # Flag indica el modo de apertura
lineas = archivo.readlines() # Lee todas las líneas del archivo y las guarda en una lista
for linea in lineas: # Recorre la lista de líneas
    print(linea) # Imprime cada línea
archivo.close() # Cierra el archivo
