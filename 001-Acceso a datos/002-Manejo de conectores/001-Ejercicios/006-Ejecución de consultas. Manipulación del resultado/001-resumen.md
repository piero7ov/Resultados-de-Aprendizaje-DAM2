# 001 - Resumen de consultas DQL

Las consultas recuperan datos sin modificar los registros. En esta unidad ampliaremos **PierodevBBDD** a partir de la versión DML anterior, manteniendo la nomenclatura de instrucciones en español y la posibilidad de consultar desde la terminal y el conector Python.

## Primera versión que implementaremos

| Instrucción | Función | Ejemplo |
| --- | --- | --- |
| `SELECCIONAR ... DE` | Elegir todas las columnas (`*`) o una lista de columnas de una tabla. | `SELECCIONAR nombre,edad DE clientes` |
| `DONDE` | Filtrar los registros que cumplen una condición. | `SELECCIONAR * DE clientes DONDE edad >= 18` |
| `=`, `<>`, `!=`, `>`, `<`, `>=`, `<=` | Comparar valores en `DONDE`. | `DONDE edad >= 18` |
| `Y`, `O`, `NO` | Combinar o negar condiciones; admitir paréntesis para agruparlas. | `DONDE edad >= 18 Y NO ciudad = 'Madrid'` |
| `ORDENAR POR` | Ordenar por una columna de forma `ASCENDENTE` o `DESCENDENTE`. | `ORDENAR POR edad DESCENDENTE` |
| `LIMITE` | Restringir el número de filas devueltas. | `LIMITE 10` |
| `DISTINTO` | Evitar resultados duplicados. | `SELECCIONAR DISTINTO ciudad DE clientes` |
| `COMO` | Asignar un alias a una columna seleccionada. | `SELECCIONAR nombre COMO cliente DE clientes` |
| `ENTRE` | Comprobar si un valor está dentro de un intervalo. | `DONDE edad ENTRE 18 Y 65` |
| `EN` | Comprobar si un valor pertenece a una lista. | `DONDE ciudad EN ('Valencia','Madrid')` |
| `COMO` / `LIKE` en `DONDE` | Buscar un patrón con `%` y `_`. | `DONDE nombre COMO 'Jos%'` |

`COMO` tiene dos usos según su posición: en `SELECCIONAR` crea un alias y en `DONDE` busca un patrón. `LIKE` será un sinónimo para la búsqueda por patrón.

La consulta devolverá las **columnas** y las **filas** del resultado. En la terminal se mostrarán; desde Python se expondrán mediante una función `consultar`.
