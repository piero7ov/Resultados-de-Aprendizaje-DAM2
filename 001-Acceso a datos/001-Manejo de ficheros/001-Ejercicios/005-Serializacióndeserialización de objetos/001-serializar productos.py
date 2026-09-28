productos = ["teclado", "ratón", "monitor"]
cadena = ""
separador = ""

for producto in productos:
    cadena += separador + producto
    separador = ","

archivo = open("productos.txt", 'w', encoding='utf-8')
archivo.write(cadena)
archivo.close()
