import os
import json


class PierodevSerializador:
    def serializar(self, lista, delimitador=","):
        try:
            cadena = ""
            separador = ""
            for elemento in lista:
                cadena += separador + str(elemento)
                separador = delimitador
            return cadena
        except Exception as error:
            print("Se ha producido un error al serializar:")
            print(error)
            return None

    def deserializar(self, cadena, delimitador=","):
        try:
            lista = cadena.split(delimitador)
            return lista
        except Exception as error:
            print("Se ha producido un error al deserializar:")
            print(error)
            return None


class PierodevBBDD:
    def __init__(self):
        try:
            rutaConfiguracion = os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                "config.json"
            )

            assert os.path.exists(rutaConfiguracion), "No se ha encontrado el archivo de configuración: " + rutaConfiguracion

            archivo = open(rutaConfiguracion, 'r', encoding='utf-8')
            configuracion = json.load(archivo)
            archivo.close()

            assert "instalacion" in configuracion, "Falta la propiedad 'instalacion' en config.json"
            assert "tamanoRegistro" in configuracion, "Falta la propiedad 'tamanoRegistro' en config.json"

            self.instalacion = configuracion["instalacion"]

            if not self.instalacion.endswith("/"):
                self.instalacion += "/"

            self.tamanoRegistro = int(configuracion["tamanoRegistro"])
            self.basededatos = ""
        except Exception as error:
            print("Se ha producido un error al cargar la configuración:")
            print(error)
            raise

    def creaBaseDatos(self, nombre):
        try:
            ruta = self.instalacion + nombre
            assert not os.path.exists(ruta), "La base de datos '" + nombre + "' ya existe"
            os.mkdir(ruta)
        except Exception as error:
            print("Se ha producido un error al crear la base de datos:")
            print(error)

    def usaBaseDatos(self, nombre):
        try:
            ruta = self.instalacion + nombre
            assert os.path.exists(ruta), "La base de datos '" + nombre + "' no existe"
            self.basededatos = nombre
        except Exception as error:
            print("Se ha producido un error al seleccionar la base de datos:")
            print(error)

    def creaTabla(self, nombre, esquema):
        try:
            assert self.basededatos != "", "No se ha seleccionado ninguna base de datos"

            ruta = self.instalacion + self.basededatos + "/" + nombre + ".csv"
            assert not os.path.exists(ruta), "La tabla '" + nombre + "' ya existe"

            archivo = open(ruta, 'wb')
            archivo.close()

            archivo = open(self.instalacion + self.basededatos + "/" + nombre + ".esquema", 'w', encoding='utf-8')
            archivo.write("id,activo," + esquema)
            archivo.close()

            archivo = open(self.instalacion + self.basededatos + "/" + nombre + ".idx", 'w', encoding='utf-8')
            archivo.close()
        except Exception as error:
            print("Se ha producido un error al crear la tabla:")
            print(error)

    def obtenerEsquema(self, tabla):
        try:
            ruta = self.instalacion + self.basededatos + "/" + tabla + ".esquema"
            assert os.path.exists(ruta), "No existe el esquema de la tabla '" + tabla + "'"

            archivo = open(ruta, 'r', encoding='utf-8')
            esquema = archivo.read()
            archivo.close()

            serial = PierodevSerializador()
            resultado = serial.deserializar(esquema)
            assert resultado is not None, "No se ha podido deserializar el esquema"
            return resultado
        except Exception as error:
            print("Se ha producido un error al obtener el esquema:")
            print(error)
            return None

    # MEJORA 1: evita insertar o actualizar registros con más o menos campos que el esquema.
    def validarDatos(self, tabla, datos):
        try:
            esquema = self.obtenerEsquema(tabla)
            assert esquema is not None, "No se ha podido obtener el esquema"
            cantidadDatos = len(esquema) - 2

            assert len(datos) == cantidadDatos, "Se esperaban " + str(cantidadDatos) + " datos y se han recibido " + str(len(datos))
            return True
        except Exception as error:
            print("Se ha producido un error al validar los datos:")
            print(error)
            return False

    def siguienteId(self, tabla):
        try:
            ruta = self.instalacion + self.basededatos + "/" + tabla + ".idx"
            assert os.path.exists(ruta), "No existe el índice de la tabla '" + tabla + "'"

            archivo = open(ruta, 'r', encoding='utf-8')
            ultimo = 0

            for linea in archivo:
                linea = linea.strip()
                if linea != "":
                    partes = linea.split(",")
                    ultimo = int(partes[0])

            archivo.close()
            return ultimo + 1
        except Exception as error:
            print("Se ha producido un error al calcular el siguiente id:")
            print(error)
            return None

    def insertarDatos(self, tabla, datos):
        try:
            assert self.basededatos != "", "No se ha seleccionado ninguna base de datos"

            ruta = self.instalacion + self.basededatos + "/" + tabla + ".csv"
            assert os.path.exists(ruta), "La tabla '" + tabla + "' no existe"
            assert self.validarDatos(tabla, datos), "Los datos no coinciden con el esquema"

            serial = PierodevSerializador()
            id = self.siguienteId(tabla)
            assert id is not None, "No se ha podido obtener el siguiente id"

            elementos = [id, 1] + datos
            cadena = serial.serializar(elementos)
            assert cadena is not None, "No se ha podido serializar el registro"

            datosRegistro = cadena.encode("utf-8")
            assert len(datosRegistro) <= self.tamanoRegistro - 1, "El registro ocupa " + str(len(datosRegistro)) + " bytes y el máximo permitido es " + str(self.tamanoRegistro - 1)

            registro = datosRegistro + b" " * (self.tamanoRegistro - 1 - len(datosRegistro)) + b"\n"

            archivo = open(ruta, 'ab')
            posicion = archivo.tell()
            archivo.write(registro)
            archivo.close()

            indice = open(self.instalacion + self.basededatos + "/" + tabla + ".idx", 'a', encoding='utf-8')
            indice.write(str(id) + "," + str(posicion) + "\n")
            indice.close()

            return id
        except Exception as error:
            print("Se ha producido un error al insertar datos:")
            print(error)
            return None

    def buscarPosicion(self, tabla, id):
        try:
            ruta = self.instalacion + self.basededatos + "/" + tabla + ".idx"
            assert os.path.exists(ruta), "No existe el índice de la tabla '" + tabla + "'"

            archivo = open(ruta, 'r', encoding='utf-8')

            for linea in archivo:
                linea = linea.strip()
                if linea != "":
                    partes = linea.split(",")
                    if partes[0] == str(id):
                        archivo.close()
                        return int(partes[1])

            archivo.close()
            raise Exception("No se ha encontrado el id " + str(id) + " en la tabla '" + tabla + "'")
        except Exception as error:
            print("Se ha producido un error al buscar la posición del registro:")
            print(error)
            return -1

    def leerRegistro(self, tabla, id):
        try:
            posicion = self.buscarPosicion(tabla, id)
            assert posicion != -1, "No se ha podido localizar el registro"

            ruta = self.instalacion + self.basededatos + "/" + tabla + ".csv"
            assert os.path.exists(ruta), "La tabla '" + tabla + "' no existe"

            archivo = open(ruta, 'rb')
            archivo.seek(posicion)
            registro = archivo.read(self.tamanoRegistro)
            archivo.close()

            assert registro != b"", "No se han encontrado datos en la posición " + str(posicion)

            cadena = registro.decode("utf-8").rstrip("\n").rstrip()

            serial = PierodevSerializador()
            elementos = serial.deserializar(cadena)

            assert elementos is not None, "No se ha podido deserializar el registro"
            assert len(elementos) >= 2, "El registro está incompleto"
            assert elementos[1] != "0", "El registro con id " + str(id) + " está eliminado"

            return elementos
        except Exception as error:
            print("Se ha producido un error al leer el registro:")
            print(error)
            return None

    def seleccionar(self, tabla, id):
        try:
            registro = self.leerRegistro(tabla, id)
            assert registro is not None, "No se ha podido recuperar el registro"

            esquema = self.obtenerEsquema(tabla)
            assert esquema is not None, "No se ha podido obtener el esquema"
            assert len(registro) == len(esquema), "El número de campos del registro no coincide con el esquema"

            resultado = {}

            for i in range(len(esquema)):
                resultado[esquema[i]] = registro[i]

            return resultado
        except Exception as error:
            print("Se ha producido un error al seleccionar el registro:")
            print(error)
            return None

    def listarTodo(self, tabla):
        try:
            esquema = self.obtenerEsquema(tabla)
            assert esquema is not None, "No se ha podido obtener el esquema"

            ruta = self.instalacion + self.basededatos + "/" + tabla + ".csv"
            assert os.path.exists(ruta), "La tabla '" + tabla + "' no existe"

            archivo = open(ruta, 'rb')
            serial = PierodevSerializador()

            while True:
                registro = archivo.read(self.tamanoRegistro)

                if registro == b"":
                    break

                cadena = registro.decode("utf-8").rstrip("\n").rstrip()

                if cadena != "":
                    elementos = serial.deserializar(cadena)

                    if elementos is not None:
                        if len(elementos) > 1 and elementos[1] == "1":
                            assert len(elementos) == len(esquema), "Registro corrupto: el número de campos no coincide con el esquema"

                            resultado = {}

                            for i in range(len(esquema)):
                                resultado[esquema[i]] = elementos[i]

                            print(resultado)

            archivo.close()
        except Exception as error:
            print("Se ha producido un error al listar los registros:")
            print(error)

    def buscarColumna(self, tabla, columna, valor):
        try:
            esquema = self.obtenerEsquema(tabla)
            assert esquema is not None, "No se ha podido obtener el esquema"
            assert columna in esquema, "La columna '" + columna + "' no existe en la tabla '" + tabla + "'"

            posicionColumna = esquema.index(columna)
            ruta = self.instalacion + self.basededatos + "/" + tabla + ".csv"
            assert os.path.exists(ruta), "La tabla '" + tabla + "' no existe"

            archivo = open(ruta, 'rb')
            serial = PierodevSerializador()

            while True:
                registro = archivo.read(self.tamanoRegistro)

                if registro == b"":
                    break

                cadena = registro.decode("utf-8").rstrip("\n").rstrip()

                if cadena != "":
                    elementos = serial.deserializar(cadena)

                    if elementos is not None:
                        if len(elementos) > posicionColumna:
                            if elementos[1] == "1" and elementos[posicionColumna] == str(valor):
                                resultado = {}

                                for i in range(len(esquema)):
                                    resultado[esquema[i]] = elementos[i]

                                print(resultado)

            archivo.close()
        except Exception as error:
            print("Se ha producido un error al buscar por columna:")
            print(error)

    def actualizar(self, tabla, id, datos):
        try:
            posicion = self.buscarPosicion(tabla, id)
            assert posicion != -1, "No se ha podido localizar el registro"

            registroActual = self.leerRegistro(tabla, id)
            assert registroActual is not None, "El registro no existe o está eliminado"
            assert self.validarDatos(tabla, datos), "Los datos no coinciden con el esquema"

            serial = PierodevSerializador()
            elementos = [id, 1] + datos
            cadena = serial.serializar(elementos)
            assert cadena is not None, "No se ha podido serializar el registro actualizado"

            datosRegistro = cadena.encode("utf-8")
            assert len(datosRegistro) <= self.tamanoRegistro - 1, "El registro actualizado ocupa " + str(len(datosRegistro)) + " bytes y el máximo permitido es " + str(self.tamanoRegistro - 1)

            registro = datosRegistro + b" " * (self.tamanoRegistro - 1 - len(datosRegistro)) + b"\n"

            ruta = self.instalacion + self.basededatos + "/" + tabla + ".csv"

            archivo = open(ruta, 'r+b')
            archivo.seek(posicion)
            archivo.write(registro)
            archivo.close()
        except Exception as error:
            print("Se ha producido un error al actualizar el registro:")
            print(error)

    def eliminar(self, tabla, id):
        try:
            posicion = self.buscarPosicion(tabla, id)
            assert posicion != -1, "No se ha podido localizar el registro"

            ruta = self.instalacion + self.basededatos + "/" + tabla + ".csv"
            assert os.path.exists(ruta), "La tabla '" + tabla + "' no existe"

            archivo = open(ruta, 'r+b')
            archivo.seek(posicion)
            registro = archivo.read(self.tamanoRegistro)

            assert registro != b"", "No existe ningún registro en la posición " + str(posicion)

            cadena = registro.decode("utf-8").rstrip("\n").rstrip()

            serial = PierodevSerializador()
            elementos = serial.deserializar(cadena)

            assert elementos is not None, "No se ha podido deserializar el registro"
            assert len(elementos) >= 2, "El registro está incompleto"
            assert elementos[1] != "0", "El registro con id " + str(id) + " ya estaba eliminado"

            elementos[1] = "0"
            cadena = serial.serializar(elementos)

            datosRegistro = cadena.encode("utf-8")
            registro = datosRegistro + b" " * (self.tamanoRegistro - 1 - len(datosRegistro)) + b"\n"

            archivo.seek(posicion)
            archivo.write(registro)
            archivo.close()
        except Exception as error:
            print("Se ha producido un error al eliminar el registro:")
            print(error)

    # MEJORA 2: elimina físicamente los registros inactivos y reconstruye sus posiciones.
    def compactar(self, tabla):
        try:
            assert self.basededatos != "", "No se ha seleccionado ninguna base de datos"

            ruta = self.instalacion + self.basededatos + "/" + tabla + ".csv"
            rutaTemporal = ruta + ".tmp"
            rutaIndice = self.instalacion + self.basededatos + "/" + tabla + ".idx"

            assert os.path.exists(ruta), "La tabla '" + tabla + "' no existe"
            assert os.path.exists(rutaIndice), "No existe el índice de la tabla '" + tabla + "'"

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
            serial = PierodevSerializador()

            while True:
                registro = archivo.read(self.tamanoRegistro)

                if registro == b"":
                    break

                cadena = registro.decode("utf-8").rstrip("\n").rstrip()

                if cadena != "":
                    elementos = serial.deserializar(cadena)
                    assert elementos is not None, "No se ha podido deserializar un registro"

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
        except Exception as error:
            print("Se ha producido un error al compactar la tabla:")
            print(error)

