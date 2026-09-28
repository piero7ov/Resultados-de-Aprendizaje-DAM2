productos = ['teclado','monitor','raton','impresora','altavoces']

archivo = open("productos.bin","wb")
for producto in productos:
    archivo.write(producto.encode('utf-8'))

archivo.close()