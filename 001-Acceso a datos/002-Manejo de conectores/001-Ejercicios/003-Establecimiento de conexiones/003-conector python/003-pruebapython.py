import pierodevbbdd


pierodevbbdd.crear_base("prueba_conector")
pierodevbbdd.usar_base("prueba_conector")
pierodevbbdd.crear_tabla("clientes", "nombre")

identificador = pierodevbbdd.insertar("clientes", ["Piero Olivares"])
print("ID insertado:", identificador)
