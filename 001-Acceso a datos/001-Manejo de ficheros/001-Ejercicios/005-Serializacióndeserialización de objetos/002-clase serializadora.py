class PierodevSerializador:
    def serializar(self, lista, delimitador=","):
        cadena = ""
        separador = ""
        for elemento in lista:
            cadena += separador + elemento
            separador = delimitador
        return cadena

    def deserializar(self, cadena, delimitador=","):
        lista = cadena.split(delimitador)
        return lista


serial = PierodevSerializador()
productos = ["teclado", "ratón", "monitor"]

archivo = open("productos.txt", 'w', encoding='utf-8')
archivo.write(serial.serializar(productos))
archivo.close()

archivo = open("productos.txt", 'r', encoding='utf-8')
cadena = archivo.read()
archivo.close()

productos_recuperados = serial.deserializar(cadena)
print(productos_recuperados)
