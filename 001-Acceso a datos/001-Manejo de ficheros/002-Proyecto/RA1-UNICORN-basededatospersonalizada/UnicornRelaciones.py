"""Relaciones por ID sobre los ficheros de UnicornBBDD, sin SQL.

El JSON del proyecto es una plantilla: configurarRelaciones lo valida y
guarda una copia en la base seleccionada, después de crear sus tablas.
Las tres propiedades de cada relación son tabla, campo y tabla_destino.
Todas las referencias son obligatorias y apuntan al campo id del destino.

Uso, después de crear clientes, libros, pedidos y lineas_pedido:
    conexion.configurarRelaciones()
    relaciones = UnicornRelaciones(conexion)
    cliente = relaciones.obtenerRelacionado("pedidos", idPedido, "cliente_id")

Las comprobaciones de escritura se ejecutan desde conexion.insertarDatos y
conexion.actualizar: no hay que recordar llamar al validador manualmente.
El motor es reutilizable: otra base puede instalar una plantilla diferente.
Una base anterior sin relaciones.json requiere configuración explícita;
no se interpreta la ausencia del archivo como permiso para omitir controles.
"""

import json
import os
import re
import tempfile


class UnicornRelaciones:
    """Valida referencias y recupera registros relacionados usando el motor.

    No aplica reglas de la tienda (reservas, estados ni stock). Las escrituras
    normales del motor llaman a este gestor antes de insertar o actualizar.
    """

    def __init__(self, conexion):
        """Recibe la conexión existente; no crea otra base ni modifica sus datos."""
        self.conexion = conexion
        # El gestor queda ligado a esta base y no se reutiliza tras cambiar la selección.
        if not conexion.basededatos:
            raise ValueError("No se ha seleccionado ninguna base de datos")
        self.base = conexion.basededatos
        self.ruta = os.path.join(conexion.instalacion, self.base, "relaciones.json")

    def _comprobarBase(self):
        """Evita mezclar las reglas de una base con los registros de otra."""
        if self.conexion.basededatos != self.base:
            raise ValueError("La base seleccionada ha cambiado; crea otro gestor de relaciones")
        self.conexion._comprobarOperacionPendiente()

    def _validarModelo(self, modelo):
        """Comprueba formato, tablas, campos y duplicados; devuelve las relaciones."""
        if not isinstance(modelo, dict) or type(modelo.get("version")) is not int or modelo["version"] != 1:
            raise ValueError("Versión de relaciones no válida")
        if set(modelo) != {"version", "relaciones"} or not isinstance(modelo["relaciones"], list):
            raise ValueError("Se esperaba una lista de relaciones")
        relaciones = modelo["relaciones"]
        vistas = set()
        for relacion in relaciones:
            if not isinstance(relacion, dict) or set(relacion) != {"tabla", "campo", "tabla_destino"}:
                raise ValueError("Cada relación necesita tabla, campo y tabla_destino")
            for nombre in relacion.values():
                self.conexion._validarNombre(nombre)
            tabla, campo, destino = relacion["tabla"], relacion["campo"], relacion["tabla_destino"]
            clave = (tabla.lower(), campo.lower())
            if clave in vistas:
                raise ValueError("Relación duplicada para " + tabla + "." + campo)
            vistas.add(clave)
            esquema = self.conexion.obtenerEsquema(tabla)
            if campo not in esquema[2:]:
                raise ValueError("El campo relacionado no existe o es reservado: " + campo)
            self.conexion.obtenerEsquema(destino)  # El destino siempre utiliza su id automático.
        return relaciones

    def cargar(self):
        """Lee y valida las reglas de la base; un archivo ausente o dañado es un error."""
        self._comprobarBase()
        with open(self.ruta, encoding="utf-8") as archivo:
            modelo = json.load(archivo)
        return self._validarModelo(modelo)

    def configurar(self, rutaRelaciones=None):
        """Instala un modelo válido en una base sin relaciones; devuelve True.

        Verifica también los datos existentes. No permite reemplazar un modelo
        ya configurado por otro distinto: cambiarlo requerirá una migración.
        """
        self._comprobarBase()
        if rutaRelaciones is None:
            rutaRelaciones = os.path.join(os.path.dirname(__file__), "relaciones.json")
        with open(rutaRelaciones, encoding="utf-8") as archivo:
            modelo = json.load(archivo)
        relaciones = self._validarModelo(modelo)
        if os.path.exists(self.ruta):
            actuales = self.cargar()
            if actuales and actuales != relaciones:
                raise ValueError("La base ya tiene otro modelo de relaciones")
        self._validarIntegridad(relaciones)  # No guardamos reglas que los datos ya incumplen.
        descriptor, temporal = tempfile.mkstemp(prefix="relaciones-", suffix=".tmp",
                                               dir=os.path.dirname(self.ruta))
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as archivo:
                json.dump(modelo, archivo, ensure_ascii=False, indent=4)
            os.replace(temporal, self.ruta)  # Sustituye un único archivo, ya escrito por completo.
        finally:
            if os.path.exists(temporal):
                os.remove(temporal)
        return True

    def _identificador(self, valor):
        """Convierte una referencia positiva en texto canónico; no acepta valores vacíos."""
        if not re.fullmatch(r"[1-9][0-9]*", str(valor)):
            raise ValueError("La referencia debe ser un ID entero positivo")
        return str(valor)

    def validarDatos(self, tabla, datos, anterior=None):
        """Comprueba referencias antes de escribir; permite mantener un vínculo histórico."""
        relaciones = self.cargar()
        self.conexion.validarDatos(tabla, datos)
        campos = self.conexion.obtenerEsquema(tabla)[2:]
        nuevos = dict(zip(campos, datos))
        for relacion in relaciones:
            if os.path.normcase(relacion["tabla"]) != os.path.normcase(tabla):
                continue
            campo = relacion["campo"]
            identificador = self._identificador(nuevos[campo])
            # Una referencia sin cambios puede seguir apuntando a un registro inactivo.
            historica = anterior is not None and anterior[campo] == identificador
            destino = self.conexion.seleccionar(relacion["tabla_destino"], identificador,
                                                incluirInactivos=historica)
            if destino is None:
                raise ValueError("Referencia inexistente o inactiva: " + tabla + "." + campo)
        return True

    def _validarIntegridad(self, relaciones):
        """Comprueba que todos los vínculos guardados tengan destino, también los históricos."""
        for relacion in relaciones:
            registros = self.conexion.listarTodo(relacion["tabla"], incluirInactivos=True)
            for registro in registros:
                identificador = self._identificador(registro[relacion["campo"]])
                destino = self.conexion.seleccionar(relacion["tabla_destino"], identificador,
                                                    incluirInactivos=True)
                if destino is None:
                    raise ValueError("Referencia rota en " + relacion["tabla"] + ", id " + registro["id"])
        return True

    def validarIntegridad(self):
        """Devuelve True si no hay referencias rotas; en caso contrario lanza un error."""
        return self._validarIntegridad(self.cargar())

    def obtenerRelacionado(self, tabla, id, campo, incluirInactivos=False):
        """Devuelve el destino de una referencia o None si el origen no es visible.

        Un destino inactivo se devuelve igualmente para poder consultar el
        historial. incluirInactivos controla la visibilidad del registro origen.
        """
        relaciones = self.cargar()
        relacion = next((item for item in relaciones
                         if os.path.normcase(item["tabla"]) == os.path.normcase(tabla)
                         and item["campo"] == campo), None)
        if relacion is None:
            raise ValueError("No existe la relación " + tabla + "." + campo)
        origen = self.conexion.seleccionar(tabla, id, incluirInactivos)
        if origen is None:
            return None
        identificador = self._identificador(origen[campo])
        destino = self.conexion.seleccionar(relacion["tabla_destino"], identificador,
                                            incluirInactivos=True)
        if destino is None:
            raise ValueError("La referencia guardada no tiene destino")
        return destino

    def buscarReferencias(self, tabla, id, incluirInactivos=True):
        """Devuelve qué registros apuntan al ID, indicando tabla, campo y registro."""
        identificador = self._identificador(id)
        relaciones = self.cargar()
        self.conexion.obtenerEsquema(tabla)
        resultados = []
        for relacion in relaciones:
            if os.path.normcase(relacion["tabla_destino"]) == os.path.normcase(tabla):
                registros = self.conexion.buscarColumna(relacion["tabla"], relacion["campo"],
                                                        identificador, incluirInactivos)
                for registro in registros:
                    resultados.append({"tabla": relacion["tabla"], "campo": relacion["campo"],
                                       "registro": registro})
        return resultados

    def idsProtegidos(self, tabla):
        """Devuelve los IDs que no deben perder su bloque porque alguien los referencia."""
        relaciones = self.cargar()
        self.conexion.obtenerEsquema(tabla)
        protegidos = set()
        for relacion in relaciones:
            if os.path.normcase(relacion["tabla_destino"]) == os.path.normcase(tabla):
                # Los registros inactivos también forman parte del historial.
                for registro in self.conexion.listarTodo(relacion["tabla"], incluirInactivos=True):
                    protegidos.add(int(self._identificador(registro[relacion["campo"]])))
        return protegidos
