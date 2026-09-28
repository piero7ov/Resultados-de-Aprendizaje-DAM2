"""Motor de ficheros UNICORN, basado en el ejercicio PierodevBBDD.

Cada tabla usa .csv (bloques fijos, no un CSV de intercambio), .esquema,
.idx y .meta.json. Los valores se recuperan como texto, también id y activo.
Las consultas devuelven datos; la interfaz será responsable de mostrarlos
y capturar ValueError, FileNotFoundError y otros errores de ficheros.

Versión para un único proceso, con relaciones delegadas en UnicornRelaciones.
No ofrece transacciones SQL ni convierte las tablas de clase. UnicornOperaciones
permite recuperar las operaciones de aplicación que se ejecuten bajo su control.
"""

import csv
import io
import json
import os
import re
import shutil
import tempfile


class UnicornSerializador:
    """Convierte listas de campos a texto CSV y recupera sus valores como cadenas.

    No abre archivos ni conoce las tablas: solo se ocupa de la conversión.
    """

    def serializar(self, lista, delimitador=","):
        """Convierte una lista o tupla en una fila CSV con el separador indicado."""
        if not isinstance(lista, (list, tuple)) or not lista:
            raise ValueError("Se necesita una lista de campos no vacía")
        salida = io.StringIO(newline="")  # Archivo de texto en memoria, sin tocar el disco.
        # Las comillas protegen comas, saltos de línea y espacios finales.
        escritor = csv.writer(salida, delimiter=delimitador,
                              quoting=csv.QUOTE_ALL, lineterminator="\n")
        escritor.writerow([str(elemento) for elemento in lista])
        return salida.getvalue()[:-1]  # Quita solo el salto final añadido por writerow.

    def deserializar(self, cadena, delimitador=","):
        """Recupera una única fila CSV como lista de cadenas, respetando sus comillas."""
        if not isinstance(cadena, str):
            raise ValueError("Se necesita una cadena de texto")
        lector = csv.reader(io.StringIO(cadena, newline=""),
                            delimiter=delimitador, strict=True)
        filas = list(lector)  # Un salto dentro de un campo entrecomillado no crea otra fila.
        if len(filas) != 1 or not filas[0]:
            raise ValueError("Se esperaba un único registro CSV")
        return filas[0]


class UnicornBBDD:
    """Gestiona bases de datos como carpetas y tablas como conjuntos de ficheros.

    Conserva registros de tamaño fijo para leer y actualizar mediante seek.
    El índice relaciona cada ID con su posición en bytes, no con una línea.
    Los métodos que empiezan por «_» son auxiliares de uso interno.
    """

    def __init__(self, rutaConfiguracion=None):
        """Carga rutas y tamaño de bloque sin crear datos ni seleccionar una base.

        Sin argumento utiliza config.json junto a este módulo. Una ruta de
        instalación relativa se resuelve desde la carpeta del JSON utilizado.
        Los errores de configuración se propagan a quien cree la conexión.
        """
        if rutaConfiguracion is None:
            rutaConfiguracion = os.path.join(os.path.dirname(__file__), "config.json")
        rutaConfiguracion = os.path.abspath(rutaConfiguracion)
        with open(rutaConfiguracion, encoding="utf-8") as archivo:
            configuracion = json.load(archivo)
        if not isinstance(configuracion, dict):
            raise ValueError("La configuración debe ser un objeto JSON")
        instalacion = configuracion.get("instalacion")
        tamano = configuracion.get("tamanoRegistro")
        if not isinstance(instalacion, str) or not instalacion.strip():
            raise ValueError("Falta una ruta de instalación válida")
        if type(tamano) is not int or tamano < 32:
            raise ValueError("tamanoRegistro debe ser un entero de al menos 32 bytes")
        # La ruta relativa parte del archivo de configuración, no de la terminal.
        self.instalacion = os.path.abspath(os.path.join(
            os.path.dirname(rutaConfiguracion), instalacion))
        self.tamanoRegistro = tamano
        self.basededatos = ""
        self._operacionActiva = None  # Solo el gestor de operaciones autoriza el acceso durante una escritura agrupada.
        self.serializador = UnicornSerializador()

    def _comprobarOperacionPendiente(self):
        """Bloquea el acceso ordinario mientras exista una operación sin confirmar."""
        if self.basededatos:
            pendiente = os.path.join(self.instalacion, self.basededatos, ".operacion-pendiente")
            if os.path.lexists(pendiente) and self._operacionActiva != pendiente:
                raise RuntimeError("Hay una operación pendiente: abre UnicornLibreria para recuperarla")

    def _validarNombre(self, nombre):
        """Valida nombres de bases, tablas y campos, no el texto de los registros."""
        if not isinstance(nombre, str) or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", nombre):
            raise ValueError("Usa letras sin tildes, números y guion bajo; no rutas")
        reservados = {"CON", "PRN", "AUX", "NUL"}  # Windows reserva estos nombres para dispositivos.
        reservados.update("COM" + str(numero) for numero in range(1, 10))
        reservados.update("LPT" + str(numero) for numero in range(1, 10))
        if nombre.upper() in reservados:
            raise ValueError("Nombre reservado por el sistema")

    def _rutaTabla(self, tabla):
        """Devuelve la ruta base de una tabla, sin extensión; exige una base seleccionada."""
        self._validarNombre(tabla)
        if not self.basededatos:
            raise ValueError("No se ha seleccionado ninguna base de datos")
        self._comprobarOperacionPendiente()
        return os.path.join(self.instalacion, self.basededatos, tabla)

    def _comprobarTabla(self, tabla):
        """Comprueba los cuatro archivos, el formato y el tamaño; devuelve la ruta base.

        Detecta bloques truncados, pero no valida aquí el contenido de cada
        registro ni del índice: eso corresponde a sus métodos de lectura.
        """
        ruta = self._rutaTabla(tabla)
        if os.path.exists(ruta + ".compactacion-pendiente"):
            raise RuntimeError("Compactación pendiente de revisión: " + ruta)
        for extension in (".csv", ".esquema", ".idx", ".meta.json"):
            if not os.path.isfile(ruta + extension):
                raise FileNotFoundError("Falta un archivo de la tabla: " + ruta + extension)
        with open(ruta + ".meta.json", encoding="utf-8") as archivo:
            metadatos = json.load(archivo)
        if not isinstance(metadatos, dict) or metadatos.get("formato") != "unicorn-1":
            raise ValueError("Formato de tabla incompatible")
        if metadatos.get("tamanoRegistro") != self.tamanoRegistro:
            raise ValueError("Tamaño incompatible: cambiar config.json no convierte los datos")
        if os.path.getsize(ruta + ".csv") % self.tamanoRegistro != 0:
            raise ValueError("Archivo de datos incompleto: no contiene bloques enteros")
        return ruta

    def creaBaseDatos(self, nombre):
        """Crea una nueva base y devuelve True, sin seleccionarla."""
        self._validarNombre(nombre)
        os.makedirs(self.instalacion, exist_ok=True)  # La instalación puede existir previamente.
        os.mkdir(os.path.join(self.instalacion, nombre))  # La base nueva no puede existir.
        # Cada base empieza sin relaciones; después se configura su propio modelo.
        with open(os.path.join(self.instalacion, nombre, "relaciones.json"),
                  "x", encoding="utf-8") as archivo:
            json.dump({"version": 1, "relaciones": []}, archivo, indent=4)
        return True

    def _gestorRelaciones(self):
        """Crea el gestor de integridad para la base seleccionada."""
        from UnicornRelaciones import UnicornRelaciones  # Importación local para separar responsabilidades.
        return UnicornRelaciones(self)

    def configurarRelaciones(self, rutaRelaciones=None):
        """Valida y guarda el modelo de relaciones; por defecto usa la plantilla del proyecto."""
        return self._gestorRelaciones().configurar(rutaRelaciones)

    def usaBaseDatos(self, nombre):
        """Selecciona una base existente y devuelve True; falla si no existe."""
        self._validarNombre(nombre)
        if self._operacionActiva is not None:
            raise RuntimeError("No se puede cambiar de base durante una operación")
        if not os.path.isdir(os.path.join(self.instalacion, nombre)):
            raise FileNotFoundError("No existe la base de datos: " + nombre)
        self.basededatos = nombre  # Solo cambia la selección después de comprobar la carpeta.
        return True

    def creaTabla(self, nombre, esquema):
        """Crea una tabla vacía y devuelve True, sin sobrescribir archivos existentes.

        esquema contiene campos separados por comas, por ejemplo «texto,numero».
        Añade id y activo automáticamente. Guarda los datos en .csv, los nombres
        en .esquema, las posiciones en .idx y formato/tamaño en .meta.json.
        """
        ruta = self._rutaTabla(nombre)
        if not isinstance(esquema, str):
            raise ValueError("El esquema debe contener nombres separados por comas")
        campos = [campo.strip() for campo in esquema.split(",")]
        for campo in campos:
            self._validarNombre(campo)
        nombres = [campo.lower() for campo in campos]
        if len(set(nombres)) != len(nombres) or {"id", "activo"}.intersection(nombres):
            raise ValueError("Campos repetidos o reservados: id y activo son automáticos")
        extensiones = (".csv", ".esquema", ".idx", ".meta.json")
        if any(os.path.exists(ruta + extension) for extension in extensiones):
            raise FileExistsError("La tabla ya existe o tiene archivos pendientes: " + nombre)
        creados = []
        try:
            for extension in extensiones:
                # El modo "x" crea un archivo nuevo y falla si ya existe.
                with open(ruta + extension, "x", encoding="utf-8", newline="") as archivo:
                    creados.append(ruta + extension)
                    if extension == ".esquema":
                        archivo.write(self.serializador.serializar(["id", "activo"] + campos))
                    elif extension == ".meta.json":
                        json.dump({"formato": "unicorn-1", "tamanoRegistro": self.tamanoRegistro},
                                  archivo, indent=4)
        except Exception:
            # Solo se retiran los archivos creados por esta llamada fallida.
            for creado in creados:
                os.remove(creado)
            raise
        return True

    def obtenerEsquema(self, tabla):
        """Lee y valida el esquema; devuelve los nombres de campos en su orden."""
        ruta = self._comprobarTabla(tabla)
        with open(ruta + ".esquema", encoding="utf-8", newline="") as archivo:
            campos = self.serializador.deserializar(archivo.read())
        if len(campos) < 3 or campos[:2] != ["id", "activo"]:
            raise ValueError("Esquema incorrecto")
        for campo in campos:
            self._validarNombre(campo)
        if len(set(campo.lower() for campo in campos)) != len(campos):
            raise ValueError("Esquema con campos repetidos")
        return campos

    # MEJORA 1: evita insertar o actualizar registros con más o menos campos que el esquema.
    def validarDatos(self, tabla, datos):
        """Devuelve True si la lista o tupla tiene los campos de usuario esperados.

        No recibe id ni activo y no valida aún tipos ni reglas de negocio.
        Si no coincide con el esquema, lanza ValueError antes de escribir.
        """
        if not isinstance(datos, (list, tuple)):
            raise ValueError("Los datos deben ser una lista o tupla")
        cantidad = len(self.obtenerEsquema(tabla)) - 2  # id y activo los añade el motor.
        if len(datos) != cantidad:
            raise ValueError("Se esperaban " + str(cantidad) + " datos")
        return True

    def _leerIndice(self, tabla):
        """Devuelve un diccionario {id: posición} tras validar todo el índice.

        Comprueba IDs únicos, posiciones alineadas y cobertura de los bloques.
        Admite -1 para conservar un ID sin bloque después de compactar;
        el borrado lógico actual mantiene su posición original.
        """
        ruta = self._comprobarTabla(tabla)
        tamanoArchivo = os.path.getsize(ruta + ".csv")
        posiciones = {}
        ocupadas = set()
        with open(ruta + ".idx", encoding="utf-8", newline="") as archivo:
            for fila in csv.reader(archivo):
                if len(fila) != 2:
                    raise ValueError("Índice incorrecto")
                identificador, posicion = map(int, fila)
                if identificador <= 0 or identificador in posiciones:
                    raise ValueError("Identificador incorrecto o duplicado en el índice")
                if posicion != -1:  # -1 conserva el ID, pero indica que ya no tiene bloque.
                    if posicion < 0 or posicion % self.tamanoRegistro or posicion >= tamanoArchivo:
                        raise ValueError("Posición incorrecta en el índice")
                    if posicion in ocupadas:
                        raise ValueError("Posición duplicada en el índice")
                    ocupadas.add(posicion)
                posiciones[identificador] = posicion
        if len(ocupadas) != tamanoArchivo // self.tamanoRegistro:
            raise ValueError("El índice no cubre todos los registros")
        return posiciones

    def siguienteId(self, tabla):
        """Devuelve el siguiente ID sin reutilizar los inactivos ni los que no tienen bloque."""
        # default=0 hace que el primer ID de una tabla vacía sea 1.
        return max(self._leerIndice(tabla), default=0) + 1

    def _prepararRegistro(self, elementos):
        """Convierte todos los campos, incluidos id y activo, en un bloque de bytes.

        Mide el CSV codificado en UTF-8, añade relleno y reserva un byte para
        el salto final. Rechaza el exceso: nunca recorta los datos del usuario.
        """
        contenido = self.serializador.serializar(elementos).encode("utf-8")  # Medimos bytes, no letras.
        if len(contenido) > self.tamanoRegistro - 1:
            raise ValueError("El registro supera el máximo de " + str(self.tamanoRegistro - 1) + " bytes")
        return contenido.ljust(self.tamanoRegistro - 1, b" ") + b"\n"

    def _interpretarRegistro(self, bloque, esquema):
        """Extrae los campos de un bloque y comprueba tamaño, ID, estado y esquema.

        Devuelve una lista de cadenas o lanza un error si el bloque no es válido.
        """
        if len(bloque) != self.tamanoRegistro or not bloque.endswith(b"\n"):
            raise ValueError("Bloque incompleto o incorrecto")
        # Solo quitamos el relleno exterior; los espacios del valor quedan entre comillas.
        cadena = bloque[:-1].rstrip(b" ").decode("utf-8")
        elementos = self.serializador.deserializar(cadena)
        if len(elementos) != len(esquema) or elementos[1] not in ("0", "1"):
            raise ValueError("Registro con campos o estado incorrectos")
        if not elementos[0].isascii() or not elementos[0].isdigit() or int(elementos[0]) < 1:
            raise ValueError("Identificador incorrecto en el registro")
        return elementos

    def insertarDatos(self, tabla, datos):
        """Añade un registro activo y su entrada de índice; devuelve el nuevo ID entero.

        datos contiene solo los campos de usuario, en el orden del esquema.
        Valida y prepara el bloque completo antes de modificar los archivos.
        """
        self.validarDatos(tabla, datos)
        self._gestorRelaciones().validarDatos(tabla, datos)
        identificador = self.siguienteId(tabla)
        bloque = self._prepararRegistro([identificador, 1] + list(datos))
        ruta = self._comprobarTabla(tabla)
        with open(ruta + ".csv", "r+b") as archivo, open(ruta + ".idx", "r+b") as indice:
            # Ambos cursores van al final; tell guarda los tamaños previos para revertir.
            archivo.seek(0, os.SEEK_END)
            indice.seek(0, os.SEEK_END)
            posicion = archivo.tell()
            finalIndice = indice.tell()
            try:
                archivo.write(bloque)
                archivo.flush()
                indice.write((str(identificador) + "," + str(posicion) + "\n").encode("utf-8"))
                indice.flush()
            except Exception:
                # Revierte errores durante la llamada; no protege ante cortes de corriente.
                archivo.truncate(posicion)
                indice.truncate(finalIndice)
                raise
        return identificador

    def buscarPosicion(self, tabla, id):
        """Busca un ID entero positivo (o su texto) y devuelve su posición en bytes.

        Devuelve -1 si no está en el índice o ya no tiene bloque físico.
        Recorre el índice completo: no es una búsqueda indexada de coste constante.
        """
        if isinstance(id, bool) or not re.fullmatch(r"[1-9][0-9]*", str(id)):
            raise ValueError("El id debe ser un entero positivo")
        return self._leerIndice(tabla).get(int(id), -1)

    def leerRegistro(self, tabla, id, incluirInactivos=False):
        """Devuelve los campos del registro como lista, incluidos id y activo.

        Devuelve None si no existe o está inactivo, salvo que se solicite
        incluirInactivos=True. Los archivos dañados provocan una excepción.
        """
        posicion = self.buscarPosicion(tabla, id)
        if posicion == -1:
            return None
        esquema = self.obtenerEsquema(tabla)
        with open(self._rutaTabla(tabla) + ".csv", "rb") as archivo:
            # seek salta a la posición física; read toma exactamente un bloque.
            archivo.seek(posicion)
            elementos = self._interpretarRegistro(archivo.read(self.tamanoRegistro), esquema)
        if elementos[0] != str(id):
            raise ValueError("El índice apunta a otro registro")
        if elementos[1] == "0" and not incluirInactivos:
            return None
        return elementos

    def seleccionar(self, tabla, id, incluirInactivos=False):
        """Devuelve un registro como diccionario campo/valor, o None si no es visible."""
        registro = self.leerRegistro(tabla, id, incluirInactivos)
        if registro is None:
            return None
        # zip empareja cada nombre del esquema con el valor en la misma posición.
        return dict(zip(self.obtenerEsquema(tabla), registro))

    def listarTodo(self, tabla, incluirInactivos=False):
        """Recorre los bloques y devuelve una lista de diccionarios, sin imprimir.

        Por defecto oculta inactivos. Comprueba la correspondencia con el índice.
        La lista resultante se guarda en memoria; una tabla vacía devuelve [].
        """
        esquema = self.obtenerEsquema(tabla)
        posiciones = self._leerIndice(tabla)
        resultados = []  # El listado completo se acumula en memoria.
        with open(self._rutaTabla(tabla) + ".csv", "rb") as archivo:
            while True:
                posicion = archivo.tell()
                bloque = archivo.read(self.tamanoRegistro)
                if not bloque:  # Una lectura vacía indica el final del archivo.
                    break
                elementos = self._interpretarRegistro(bloque, esquema)
                if posiciones.get(int(elementos[0])) != posicion:
                    raise ValueError("El índice no coincide con los registros")
                if elementos[1] == "1" or incluirInactivos:
                    resultados.append(dict(zip(esquema, elementos)))
        return resultados

    def buscarColumna(self, tabla, columna, valor, incluirInactivos=False):
        """Devuelve los registros cuyo campo coincide exactamente con str(valor).

        Filtra el listado completo, sin búsquedas parciales; devuelve [] si
        no hay coincidencias y lanza ValueError si la columna no existe.
        """
        if columna not in self.obtenerEsquema(tabla):
            raise ValueError("No existe la columna: " + str(columna))
        return [registro for registro in self.listarTodo(tabla, incluirInactivos)
                if registro[columna] == str(valor)]

    def actualizar(self, tabla, id, datos):
        """Sustituye todos los campos de usuario de un registro activo y devuelve True.

        Conserva su ID, posición y tamaño físico. Rechaza registros inexistentes
        o inactivos y datos que no caben, antes de escribir el nuevo bloque.
        """
        self.validarDatos(tabla, datos)
        anterior = self.seleccionar(tabla, id)
        if anterior is None:
            raise ValueError("El registro no existe o está inactivo")
        self._gestorRelaciones().validarDatos(tabla, datos, anterior)
        bloque = self._prepararRegistro([id, 1] + list(datos))
        posicion = self.buscarPosicion(tabla, id)
        with open(self._rutaTabla(tabla) + ".csv", "r+b") as archivo:
            archivo.seek(posicion)
            archivo.write(bloque)
        return True

    def eliminar(self, tabla, id):
        """Desactiva sin borrar datos; las restricciones por reservas se añadirán en la aplicación.

        Cambia activo a 0 en el mismo bloque y devuelve True. Conserva el ID,
        el índice y los datos para el historial; falla si ya estaba inactivo
        o no existe. No reduce el tamaño del archivo.
        """
        elementos = self.leerRegistro(tabla, id)
        if elementos is None:
            raise ValueError("El registro no existe o ya está inactivo")
        elementos[1] = "0"  # Borrado lógico: conserva los datos y cambia únicamente activo.
        bloque = self._prepararRegistro(elementos)
        posicion = self.buscarPosicion(tabla, id)
        with open(self._rutaTabla(tabla) + ".csv", "r+b") as archivo:
            archivo.seek(posicion)
            archivo.write(bloque)
        return True

    def reactivar(self, tabla, id):
        """Activa un registro dado de baja, conservando ID, campos y posición física."""
        elementos = self.leerRegistro(tabla, id, incluirInactivos=True)
        if elementos is None:
            raise ValueError("El registro no existe o ya fue retirado al compactar")
        if elementos[1] == "1":
            raise ValueError("El registro ya está activo")
        # Si tiene referencias, deben ser válidas para volver a utilizarlo.
        self._gestorRelaciones().validarDatos(tabla, elementos[2:])
        elementos[1] = "1"
        bloque = self._prepararRegistro(elementos)
        posicion = self.buscarPosicion(tabla, id)
        with open(self._rutaTabla(tabla) + ".csv", "r+b") as archivo:
            archivo.seek(posicion)
            archivo.write(bloque)
        return True

    def compactar(self, tabla):
        """Retira inactivos no referenciados y devuelve cuántos bloques se eliminaron.

        Conserva los IDs en el índice con posición -1 y reconstruye las demás
        posiciones. Si se interrumpe la sustitución, un marcador bloquea la
        tabla para revisión; no hay recuperación automática ni transacción SQL.
        """
        gestor = self._gestorRelaciones()
        gestor.validarIntegridad()  # No compactamos si ya existen referencias rotas.
        protegidos = gestor.idsProtegidos(tabla)
        esquema = self.obtenerEsquema(tabla)
        registros = self.listarTodo(tabla, incluirInactivos=True)
        indice = self._leerIndice(tabla)
        conservados = [registro for registro in registros
                       if registro["activo"] == "1" or int(registro["id"]) in protegidos]
        eliminados = len(registros) - len(conservados)
        if eliminados == 0:
            return 0

        ruta = self._comprobarTabla(tabla)
        carpeta = tempfile.mkdtemp(prefix="compactacion-", dir=os.path.dirname(ruta))
        marcador = ruta + ".compactacion-pendiente"
        conservarCopias = False
        try:
            # Preparamos ambos archivos y sus copias antes de sustituir los originales.
            nuevasPosiciones = dict.fromkeys(indice, -1)
            with open(os.path.join(carpeta, "datos.nuevos"), "wb") as archivo:
                for registro in conservados:
                    nuevasPosiciones[int(registro["id"])] = archivo.tell()
                    archivo.write(self._prepararRegistro([registro[campo] for campo in esquema]))
            with open(os.path.join(carpeta, "indice.nuevo"), "w", encoding="utf-8", newline="") as archivo:
                for identificador, posicion in nuevasPosiciones.items():
                    archivo.write(str(identificador) + "," + str(posicion) + "\n")
            shutil.copyfile(ruta + ".csv", os.path.join(carpeta, "datos.previos"))
            shutil.copyfile(ruta + ".idx", os.path.join(carpeta, "indice.previo"))
            with open(marcador, "x", encoding="utf-8") as archivo:
                archivo.write(carpeta)  # Indica dónde están las copias si el proceso se interrumpe.
            try:
                os.replace(os.path.join(carpeta, "datos.nuevos"), ruta + ".csv")
                os.replace(os.path.join(carpeta, "indice.nuevo"), ruta + ".idx")
            except Exception:
                conservarCopias = True
                # Intentamos deshacer el cambio; si falla, mantenemos marcador y copias.
                shutil.copyfile(os.path.join(carpeta, "datos.previos"), ruta + ".csv")
                shutil.copyfile(os.path.join(carpeta, "indice.previo"), ruta + ".idx")
                os.remove(marcador)
                conservarCopias = False
                raise
            os.remove(marcador)
        finally:
            if not conservarCopias and not os.path.exists(marcador):
                shutil.rmtree(carpeta)  # Solo elimina el temporal creado por esta llamada.
        return eliminados
