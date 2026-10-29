# 003 - Sentencias DDL en PierodevBBDD

Esta iteración parte de `003-Establecimiento de conexiones/004-documentamos uso`. Conserva el motor C++, el conector Python y los scripts de PowerShell. Las operaciones pueden llamarse desde Python o desde `003-pierodevbbdd.exe`, compilado a partir de `003-main.cpp`.

| Operación | Función Python |
| --- | --- |
| Añadir columna | `alterar_anadir_columna(tabla, columna)` |
| Eliminar columna | `alterar_eliminar_columna(tabla, columna)` |
| Renombrar columna | `alterar_renombrar_columna(tabla, anterior, nueva)` |
| Renombrar tabla | `alterar_renombrar_tabla(anterior, nueva)` |
| Vaciar tabla | `truncar_tabla(tabla)` |
| Eliminar tabla | `eliminar_tabla(tabla)` |
| Eliminar base de datos | `eliminar_base(nombre)` |

Ejemplo, después de crear y seleccionar una base de datos:

```python
import pierodevbbdd

pierodevbbdd.alterar_anadir_columna("clientes", "telefono")
pierodevbbdd.alterar_renombrar_columna("clientes", "telefono", "movil")
pierodevbbdd.alterar_eliminar_columna("clientes", "movil")
```

Las funciones devuelven `True` si realizan la operación y `False` si no pueden hacerlo. `id` y `activo` son columnas internas y no se pueden eliminar ni renombrar. Añadir o eliminar una columna reescribe los registros de tamaño fijo; si alguno no cabe, los archivos originales se conservan. `TRUNCATE` borra los registros y reinicia el índice, por lo que el siguiente identificador vuelve a ser 1. `DROP TABLE` y `DROP DATABASE` eliminan datos de forma permanente.

## Compilar y comprobar

Desde esta carpeta, en PowerShell:

```powershell
.\004-compilar.ps1
py .\003-probar-ddl.py
py .\003-probar-consola.py
```

El script de compilación usa una carpeta temporal para evitar problemas de `g++` con las tildes de la ruta y copia aquí `pierodevbbdd.pyd` y `003-pierodevbbdd.exe`. Las pruebas crean sus propias bases temporales y no usan los datos instalados. Para instalar el módulo en el Python del usuario, ejecutar `.\004-instalar.ps1` después de compilar; el ejecutable se usa desde esta carpeta.

## Consola en español

```powershell
.\003-pierodevbbdd.exe
```

Por defecto usa `%APPDATA%\PierodevBBDD\config.json` si existe, de modo que ve las mismas bases instaladas que Python. Al arrancar muestra la ruta de configuración y la carpeta de datos. También acepta la ruta de otro archivo de configuración como primer argumento.

Ejemplo de comandos dentro de la consola:

```text
USAR prueba_ddl_ficticia
CREAR TABLA clientes nombre,correo
INSERTAR clientes Ana,ana@ejemplo.invalid
ALTERAR TABLA clientes ANADIR COLUMNA telefono
ALTERAR TABLA clientes RENOMBRAR COLUMNA telefono movil
ALTERAR TABLA clientes ELIMINAR COLUMNA movil
RENOMBRAR TABLA clientes personas
TRUNCAR TABLA personas
ELIMINAR TABLA personas
ELIMINAR BASE prueba_ddl_ficticia
SALIR
```

`AYUDA` muestra todos los comandos. `ELIMINAR tabla id` borra un registro, mientras que `ELIMINAR TABLA tabla` borra la tabla completa. Usa `ANADIR` sin tilde en la consola.
