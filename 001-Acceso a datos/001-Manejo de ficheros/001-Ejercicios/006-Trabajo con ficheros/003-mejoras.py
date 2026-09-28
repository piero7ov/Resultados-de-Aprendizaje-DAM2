import os


class PierodevSerializador:
    def serializar(self, lista, delimitador=","):
        cadena = ""
        separador = ""
        for elemento in lista:
            cadena += separador + str(elemento)
            separador = delimitador
        return cadena

    def deserializar(self, cadena, delimitador=","):
        lista = cadena.split(delimitador)
        return lista


class PierodevBBDD:
    def __init__(self):
        self.instalacion = "./"
        self.basededatos = ""
        self.tamanoRegistro = 512

    def creaBaseDatos(self, nombre):
        ruta = self.instalacion + nombre
        if not os.path.exists(ruta):
            os.mkdir(ruta)

    def usaBaseDatos(self, nombre):
        self.basededatos = nombre

    def creaTabla(self, nombre, esquema):
        archivo = open(self.instalacion + self.basededatos + "/" + nombre + ".csv", 'wb')
        archivo.close()

        archivo = open(self.instalacion + self.basededatos + "/" + nombre + ".esquema", 'w', encoding='utf-8')
        archivo.write("id,activo," + esquema)
        archivo.close()

        archivo = open(self.instalacion + self.basededatos + "/" + nombre + ".idx", 'w', encoding='utf-8')
        archivo.close()

    def obtenerEsquema(self, tabla):
        archivo = open(self.instalacion + self.basededatos + "/" + tabla + ".esquema", 'r', encoding='utf-8')
        esquema = archivo.read()
        archivo.close()

        serial = PierodevSerializador()
        return serial.deserializar(esquema)

    # MEJORA 1: evita insertar o actualizar registros con más o menos campos que el esquema.
    def validarDatos(self, tabla, datos):
        esquema = self.obtenerEsquema(tabla)
        cantidadDatos = len(esquema) - 2

        if len(datos) != cantidadDatos:
            print("Error: se esperaban " + str(cantidadDatos) + " datos y se han recibido " + str(len(datos)))
            return False

        return True

    def siguienteId(self, tabla):
        ruta = self.instalacion + self.basededatos + "/" + tabla + ".idx"

        archivo = open(ruta, 'r', encoding='utf-8')
        ultimo = 0

        for linea in archivo:
            linea = linea.strip()
            if linea != "":
                partes = linea.split(",")
                ultimo = int(partes[0])

        archivo.close()

        return ultimo + 1

    def insertarDatos(self, tabla, datos):
        if not self.validarDatos(tabla, datos):
            return

        serial = PierodevSerializador()
        id = self.siguienteId(tabla)

        elementos = [id, 1] + datos
        cadena = serial.serializar(elementos)

        datosRegistro = cadena.encode("utf-8")

        if len(datosRegistro) > self.tamanoRegistro - 1:
            print("Error: el registro es demasiado grande")
            return

        registro = datosRegistro + b" " * (self.tamanoRegistro - 1 - len(datosRegistro)) + b"\n"

        ruta = self.instalacion + self.basededatos + "/" + tabla + ".csv"

        archivo = open(ruta, 'ab')
        posicion = archivo.tell()
        archivo.write(registro)
        archivo.close()

        indice = open(self.instalacion + self.basededatos + "/" + tabla + ".idx", 'a', encoding='utf-8')
        indice.write(str(id) + "," + str(posicion) + "\n")
        indice.close()

        return id

    def buscarPosicion(self, tabla, id):
        archivo = open(self.instalacion + self.basededatos + "/" + tabla + ".idx", 'r', encoding='utf-8')

        for linea in archivo:
            linea = linea.strip()
            if linea != "":
                partes = linea.split(",")
                if partes[0] == str(id):
                    archivo.close()
                    return int(partes[1])

        archivo.close()
        return -1

    def leerRegistro(self, tabla, id):
        posicion = self.buscarPosicion(tabla, id)

        if posicion == -1:
            return None

        ruta = self.instalacion + self.basededatos + "/" + tabla + ".csv"

        archivo = open(ruta, 'rb')
        archivo.seek(posicion)
        registro = archivo.read(self.tamanoRegistro)
        archivo.close()

        cadena = registro.decode("utf-8").rstrip("\n").rstrip()

        serial = PierodevSerializador()
        elementos = serial.deserializar(cadena)

        if len(elementos) < 2:
            return None

        if elementos[1] == "0":
            return None

        return elementos

    def seleccionar(self, tabla, id):
        registro = self.leerRegistro(tabla, id)

        if registro is None:
            return None

        esquema = self.obtenerEsquema(tabla)
        resultado = {}

        for i in range(len(esquema)):
            resultado[esquema[i]] = registro[i]

        return resultado

    def listarTodo(self, tabla):
        esquema = self.obtenerEsquema(tabla)
        ruta = self.instalacion + self.basededatos + "/" + tabla + ".csv"

        archivo = open(ruta, 'rb')

        while True:
            registro = archivo.read(self.tamanoRegistro)

            if registro == b"":
                break

            cadena = registro.decode("utf-8").rstrip("\n").rstrip()

            if cadena != "":
                serial = PierodevSerializador()
                elementos = serial.deserializar(cadena)

                if len(elementos) > 1 and elementos[1] == "1":
                    resultado = {}

                    for i in range(len(esquema)):
                        resultado[esquema[i]] = elementos[i]

                    print(resultado)

        archivo.close()

    def buscarColumna(self, tabla, columna, valor):
        esquema = self.obtenerEsquema(tabla)

        if columna not in esquema:
            return

        posicionColumna = esquema.index(columna)
        ruta = self.instalacion + self.basededatos + "/" + tabla + ".csv"

        archivo = open(ruta, 'rb')

        while True:
            registro = archivo.read(self.tamanoRegistro)

            if registro == b"":
                break

            cadena = registro.decode("utf-8").rstrip("\n").rstrip()

            if cadena != "":
                serial = PierodevSerializador()
                elementos = serial.deserializar(cadena)

                if len(elementos) > 1:
                    if elementos[1] == "1" and elementos[posicionColumna] == str(valor):
                        resultado = {}

                        for i in range(len(esquema)):
                            resultado[esquema[i]] = elementos[i]

                        print(resultado)

        archivo.close()

    def actualizar(self, tabla, id, datos):
        if not self.validarDatos(tabla, datos):
            return

        posicion = self.buscarPosicion(tabla, id)

        if posicion == -1:
            print("Error: registro no encontrado")
            return

        registroActual = self.leerRegistro(tabla, id)

        if registroActual is None:
            print("Error: registro no encontrado o eliminado")
            return

        serial = PierodevSerializador()
        elementos = [id, 1] + datos
        cadena = serial.serializar(elementos)

        datosRegistro = cadena.encode("utf-8")

        if len(datosRegistro) > self.tamanoRegistro - 1:
            print("Error: el registro es demasiado grande")
            return

        registro = datosRegistro + b" " * (self.tamanoRegistro - 1 - len(datosRegistro)) + b"\n"

        ruta = self.instalacion + self.basededatos + "/" + tabla + ".csv"

        archivo = open(ruta, 'r+b')
        archivo.seek(posicion)
        archivo.write(registro)
        archivo.close()

    def eliminar(self, tabla, id):
        posicion = self.buscarPosicion(tabla, id)

        if posicion == -1:
            print("Error: registro no encontrado")
            return

        ruta = self.instalacion + self.basededatos + "/" + tabla + ".csv"

        archivo = open(ruta, 'r+b')
        archivo.seek(posicion)
        registro = archivo.read(self.tamanoRegistro)

        cadena = registro.decode("utf-8").rstrip("\n").rstrip()

        serial = PierodevSerializador()
        elementos = serial.deserializar(cadena)

        if len(elementos) < 2:
            archivo.close()
            return

        elementos[1] = "0"
        cadena = serial.serializar(elementos)

        datosRegistro = cadena.encode("utf-8")
        registro = datosRegistro + b" " * (self.tamanoRegistro - 1 - len(datosRegistro)) + b"\n"

        archivo.seek(posicion)
        archivo.write(registro)
        archivo.close()

    # MEJORA 2: elimina físicamente los registros inactivos y reconstruye sus posiciones.
    def compactar(self, tabla):
        ruta = self.instalacion + self.basededatos + "/" + tabla + ".csv"
        rutaTemporal = ruta + ".tmp"
        rutaIndice = self.instalacion + self.basededatos + "/" + tabla + ".idx"
        identificadores = []
        posicionesActivas = {}

        indice = open(rutaIndice, 'r', encoding='utf-8')

        for linea in indice:
            linea = linea.strip()
            if linea != "":
                partes = linea.split(",")
                identificadores.append(partes[0])

        indice.close()

        archivo = open(ruta, 'rb')
        temporal = open(rutaTemporal, 'wb')

        while True:
            registro = archivo.read(self.tamanoRegistro)

            if registro == b"":
                break

            cadena = registro.decode("utf-8").rstrip("\n").rstrip()

            if cadena != "":
                serial = PierodevSerializador()
                elementos = serial.deserializar(cadena)

                if len(elementos) > 1 and elementos[1] == "1":
                    posicion = temporal.tell()
                    temporal.write(registro)
                    posicionesActivas[elementos[0]] = posicion

        archivo.close()
        temporal.close()

        os.replace(rutaTemporal, ruta)

        indice = open(rutaIndice, 'w', encoding='utf-8')

        for identificador in identificadores:
            if identificador in posicionesActivas:
                indice.write(identificador + "," + str(posicionesActivas[identificador]) + "\n")
            else:
                # El -1 conserva el historial del id sin mantener los datos personales eliminados.
                indice.write(identificador + ",-1\n")

        indice.close()


conexion = PierodevBBDD()
# conexion.creaBaseDatos("empresa_mejoras")
conexion.usaBaseDatos("empresa_mejoras")
# conexion.creaTabla("clientes", "nombre,apellidos")

# Datos ficticios
# conexion.insertarDatos("clientes", ["Piero", "Olivares"])
# conexion.insertarDatos("clientes", ["Ana", "García"])
# conexion.insertarDatos("clientes", ["Juan", "López"])
# conexion.insertarDatos("clientes", ["Laura", "Martínez"])
# conexion.insertarDatos("clientes", ["Carlos", "Sánchez"])
# conexion.insertarDatos("clientes", ["Marta", "Fernández"])

# conexion.actualizar("clientes", 2, ["Ana", "García Martínez"])
# conexion.eliminar("clientes", 3)
# conexion.compactar("clientes")
# print(conexion.seleccionar("clientes", 2))
# conexion.buscarColumna("clientes", "nombre", "Ana")

conexion.listarTodo("clientes")
