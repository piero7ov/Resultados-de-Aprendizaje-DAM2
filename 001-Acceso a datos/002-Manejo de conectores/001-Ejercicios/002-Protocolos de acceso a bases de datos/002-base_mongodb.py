from pymongo import MongoClient

# Conectar a MongoDB
conexion = MongoClient("mongodb://localhost:27017/")

# Crear/seleccionar base de datos y colección
base_datos = conexion["empresa"]
clientes = base_datos["clientes"]

# Insertar datos de demostración
lista_clientes = [
    {"nombre": "Ana García", "email": "ana@correo.com", "telefono": "600111222"},
    {"nombre": "Juan López", "email": "juan@correo.com", "telefono": "600333444"},
    {"nombre": "Piero Olivares","email": "piero@correo.com", "telefono": "600555666"}
]

for cliente_nuevo in lista_clientes:
    clientes.insert_one(cliente_nuevo)

# Mostrar clientes
for registro in clientes.find():
    print(registro)

# Cerrar conexión
conexion.close()
