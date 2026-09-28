nombre = "Piero Olivares" # Nombre a escribir en el archivo binario

archivo = open("datos.bin","wb") # Abre el archivo en modo escritura binaria
archivo.write(nombre.encode("utf-8"))  # Escribe el nombre en el archivo binario codificado en UTF-8

archivo.close() # Cierra el archivo