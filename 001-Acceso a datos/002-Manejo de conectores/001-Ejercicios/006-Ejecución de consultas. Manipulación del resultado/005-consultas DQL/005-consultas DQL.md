# 005 - Consultas DQL

Esta versión parte de `004-sentencias DML` de la subunidad anterior. Conserva las instrucciones DDL y DML y añade consultas sobre **una tabla** con instrucciones en español. Las consultas leen solo los registros activos y no modifican los datos.

| Elemento | Ejemplo en la terminal |
| --- | --- |
| Todas las columnas | `SELECCIONAR * DE clientes` |
| Columnas concretas | `SELECCIONAR nombre,edad DE clientes` |
| Alias | `SELECCIONAR nombre COMO cliente DE clientes` |
| Sin duplicados | `SELECCIONAR DISTINTO ciudad DE clientes` |
| Filtro y comparaciones | `SELECCIONAR * DE clientes DONDE edad >= 18` |
| Condiciones combinadas | `SELECCIONAR * DE clientes DONDE edad >= 18 Y (ciudad = 'Valencia' O ciudad = 'Madrid')` |
| Negación | `SELECCIONAR * DE clientes DONDE NO ciudad = 'Madrid'` |
| Intervalo | `SELECCIONAR * DE clientes DONDE edad ENTRE 18 Y 65` |
| Pertenencia | `SELECCIONAR * DE clientes DONDE ciudad EN ('Valencia','Madrid')` |
| Patrón | `SELECCIONAR * DE clientes DONDE nombre COMO 'Jos%'` |
| Orden y límite | `SELECCIONAR nombre,edad DE clientes ORDENAR POR edad DESCENDENTE LIMITE 10` |

En `DONDE` se admiten `=`, `<>`, `!=`, `>`, `<`, `>=` y `<=`; `NO`, `Y`, `O` y paréntesis. La precedencia es `NO`, después `Y` y finalmente `O`. `COMO` dentro de `DONDE` busca un patrón y admite `%` para cualquier secuencia y `_` para un carácter; `LIKE` es un sinónimo. `COMO` después del nombre de una columna crea un alias. `ORDENAR POR` permite `ASCENDENTE` o `DESCENDENTE`; el orden ascendente es el predeterminado. `LIMITE 0` devuelve cero filas.

Las comparaciones y la ordenación son numéricas cuando ambos valores pueden interpretarse como números; en otro caso son alfabéticas. Las búsquedas por patrón distinguen mayúsculas y minúsculas. Las consultas devuelven los campos internos `id` y `activo` al pedir `*`, porque forman parte del esquema actual.

Desde Python se usa la misma instrucción mediante `consultar`. El resultado es una lista de diccionarios con los nombres de las columnas solicitadas o sus alias:

```python
import pierodevbbdd as bd

bd.usar_base("empresa")
filas = bd.consultar(
    "SELECCIONAR nombre COMO cliente,edad DE clientes "
    "DONDE edad >= 18 ORDENAR POR edad DESCENDENTE LIMITE 10"
)
print(filas)
```

El comando anterior `SELECCIONAR clientes 1` sigue seleccionando por identificador. `LISTAR` y `BUSCAR` también siguen disponibles.

## Compilar y comprobar en Windows

Desde esta carpeta en PowerShell:

```powershell
.\005-compilar.ps1
py .\003-probar-ddl.py
py .\003-probar-consola.py
py .\004-probar-dml.py
py .\005-probar-dql.py
.\005-pierodevbbdd.exe
```
