# PierodevBBDD — Documentación para desarrolladores

## Descripción

`PierodevBBDD` es una librería didáctica para almacenar y gestionar información mediante ficheros.

Cada tabla utiliza tres archivos:

```text
tabla.csv       Registros
tabla.esquema   Definición de columnas
tabla.idx       Relación entre identificadores y posiciones
```

Los registros tienen un tamaño fijo, configurable mediante `config.json`. Esto permite seleccionar y actualizar registros concretos sin cargar toda la tabla en memoria.

## Archivos necesarios

```text
PierodevBBDD.py
config.json
programa.py
```

`config.json` debe encontrarse en la misma carpeta que `PierodevBBDD.py`:

```json
{
  "instalacion": "C:/pierodev-basededatos/",
  "tamanoRegistro": 512
}
```

- `instalacion`: carpeta raíz donde se guardan las bases de datos.
- `tamanoRegistro`: cantidad de bytes reservada para cada registro.

La ruta puede cambiarse directamente en `config.json` sin modificar `PierodevBBDD.py`. La librería lee estos valores cada vez que se crea un objeto `PierodevBBDD`.

## Importación

```python
from PierodevBBDD import PierodevBBDD, PierodevSerializador
```

## Inicio rápido

```python
from PierodevBBDD import PierodevBBDD

bbdd = PierodevBBDD()
bbdd.creaBaseDatos("empresa")
bbdd.usaBaseDatos("empresa")
bbdd.creaTabla("clientes", "nombre,apellidos,email")

id = bbdd.insertarDatos(
    "clientes",
    ["Cliente", "Demostración", "cliente@example.com"]
)

print(bbdd.seleccionar("clientes", id))
```

Las llamadas de creación solo deben realizarse la primera vez. Si la base de datos o la tabla ya existen, la librería muestra el error correspondiente.

## Resumen de operaciones

| Operación | Método | Ejemplo |
|---|---|---|
| Crear base de datos | `creaBaseDatos()` | `bbdd.creaBaseDatos("empresa")` |
| Seleccionar base de datos | `usaBaseDatos()` | `bbdd.usaBaseDatos("empresa")` |
| Crear tabla | `creaTabla()` | `bbdd.creaTabla("clientes", "nombre,apellidos,email")` |
| Obtener esquema | `obtenerEsquema()` | `bbdd.obtenerEsquema("clientes")` |
| Calcular siguiente ID | `siguienteId()` | `bbdd.siguienteId("clientes")` |
| Validar campos | `validarDatos()` | `bbdd.validarDatos("clientes", datos)` |
| Insertar registro | `insertarDatos()` | `bbdd.insertarDatos("clientes", datos)` |
| Buscar posición | `buscarPosicion()` | `bbdd.buscarPosicion("clientes", 1)` |
| Leer registro | `leerRegistro()` | `bbdd.leerRegistro("clientes", 1)` |
| Seleccionar registro | `seleccionar()` | `bbdd.seleccionar("clientes", 1)` |
| Listar registros | `listarTodo()` | `bbdd.listarTodo("clientes")` |
| Buscar por columna | `buscarColumna()` | `bbdd.buscarColumna("clientes", "nombre", "Cliente")` |
| Actualizar registro | `actualizar()` | `bbdd.actualizar("clientes", 1, datos)` |
| Eliminar registro | `eliminar()` | `bbdd.eliminar("clientes", 1)` |
| Compactar tabla | `compactar()` | `bbdd.compactar("clientes")` |

## Referencia de métodos

### `creaBaseDatos(nombre)`

Crea una carpeta para una nueva base de datos.

- `nombre`: nombre de la base de datos.
- Muestra un error si ya existe.

```python
bbdd.creaBaseDatos("empresa")
```

### `usaBaseDatos(nombre)`

Selecciona la base de datos utilizada por las operaciones posteriores.

```python
bbdd.usaBaseDatos("empresa")
```

### `creaTabla(nombre, esquema)`

Crea los archivos de datos, esquema e índice de una tabla.

- `nombre`: nombre de la tabla.
- `esquema`: columnas separadas por comas. `id` y `activo` se añaden automáticamente.

```python
bbdd.creaTabla("clientes", "nombre,apellidos,email")
```

### `obtenerEsquema(tabla)`

Devuelve una lista con todas las columnas de la tabla.

```python
esquema = bbdd.obtenerEsquema("clientes")
```

Resultado:

```python
["id", "activo", "nombre", "apellidos", "email"]
```

### `siguienteId(tabla)`

Devuelve el identificador que corresponderá al siguiente registro.

```python
siguiente = bbdd.siguienteId("clientes")
```

### `validarDatos(tabla, datos)`

Comprueba que la cantidad de valores coincida con las columnas definidas por el usuario.

```python
correctos = bbdd.validarDatos(
    "clientes",
    ["Cliente", "Demostración", "cliente@example.com"]
)
```

Devuelve `True` si coinciden y `False` si son incorrectos.

### `insertarDatos(tabla, datos)`

Inserta un registro activo y devuelve su nuevo identificador.

```python
id = bbdd.insertarDatos(
    "clientes",
    ["Cliente", "Demostración", "cliente@example.com"]
)
```

Devuelve `None` si no puede realizarse la inserción.

### `buscarPosicion(tabla, id)`

Busca en el índice la posición física de un identificador.

```python
posicion = bbdd.buscarPosicion("clientes", 1)
```

Devuelve `-1` si no lo encuentra o si fue eliminado y compactado.

### `leerRegistro(tabla, id)`

Devuelve los valores de un registro activo como una lista de cadenas.

```python
registro = bbdd.leerRegistro("clientes", 1)
```

Devuelve `None` si no existe o está eliminado.

### `seleccionar(tabla, id)`

Devuelve un registro activo como diccionario.

```python
cliente = bbdd.seleccionar("clientes", 1)
```

Ejemplo de resultado:

```python
{
    "id": "1",
    "activo": "1",
    "nombre": "Cliente",
    "apellidos": "Demostración",
    "email": "cliente@example.com"
}
```

### `listarTodo(tabla)`

Muestra por pantalla todos los registros activos.

```python
bbdd.listarTodo("clientes")
```

### `buscarColumna(tabla, columna, valor)`

Muestra los registros activos cuyo campo coincida exactamente con el valor indicado.

```python
bbdd.buscarColumna("clientes", "nombre", "Cliente")
```

### `actualizar(tabla, id, datos)`

Sustituye los campos de un registro activo, conservando su identificador y posición física.

```python
bbdd.actualizar(
    "clientes",
    1,
    ["Cliente actualizado", "Demostración", "nuevo@example.com"]
)
```

Debe proporcionarse la misma cantidad de valores que al insertar.

### `eliminar(tabla, id)`

Realiza un borrado lógico cambiando el estado del registro a inactivo.

```python
bbdd.eliminar("clientes", 1)
```

Después del borrado, el registro deja de aparecer en selecciones, listados y búsquedas.

### `compactar(tabla)`

Elimina físicamente los bloques inactivos y reconstruye las posiciones del índice.

```python
bbdd.compactar("clientes")
```

Los identificadores eliminados se conservan en el índice con posición `-1` para impedir su reutilización.

## Serializador

### `serializar(lista, delimitador=",")`

Convierte una lista en una cadena delimitada.

```python
serial = PierodevSerializador()
cadena = serial.serializar(["uno", "dos", 3])
```

Resultado:

```text
uno,dos,3
```

### `deserializar(cadena, delimitador=",")`

Convierte una cadena delimitada en una lista.

```python
lista = serial.deserializar("uno,dos,3")
```

## Pruebas

Las pruebas utilizan un directorio temporal y no modifican las bases de datos reales:

```powershell
python .\pruebas_pierodev_bbdd.py
```

El resultado final indica el total de pruebas correctas e incorrectas.

## Limitaciones actuales

- Los valores no pueden contener el delimitador sin alterar la estructura del registro.
- No hay tipos de datos específicos para las columnas.
- No existen transacciones ni bloqueo de escrituras concurrentes.
- La búsqueda dentro del índice es secuencial.
- Los registros no pueden superar el tamaño configurado menos un byte.
- `listarTodo()` y `buscarColumna()` muestran los resultados en vez de devolver una colección.
