# 004 - Sentencias de modificación de datos

Esta iteración continúa `003-sentencias DDL`. Conserva las operaciones anteriores y añade las variantes de `INSERT`, `UPDATE` y `DELETE` trabajadas en clase. El motor sigue generando automáticamente `id` y utiliza `activo` para el borrado lógico.

| Operación | Consola en español | Función Python |
| --- | --- | --- |
| Insertar valores | `INSERTAR EN clientes VALORES ('Ana','ana@ejemplo.invalid')` | `insertar("clientes", ["Ana", "ana@ejemplo.invalid"])` |
| Insertar indicando columnas | `INSERTAR EN clientes (nombre) VALORES ('Ana')` | `insertar_columnas("clientes", ["nombre"], ["Ana"])` |
| Insertar desde otra tabla | `INSERTAR EN copia SELECCIONAR * DE clientes` | `insertar_desde("copia", "clientes")` |
| Actualizar todos los registros | `ACTUALIZAR clientes ESTABLECER ciudad='Madrid'` | `actualizar_donde("clientes", {"ciudad": "Madrid"})` |
| Actualizar con condición | `ACTUALIZAR clientes ESTABLECER ciudad='Madrid' DONDE nombre='Ana'` | `actualizar_donde("clientes", {"ciudad": "Madrid"}, "nombre", "Ana")` |
| Eliminar todos los registros | `ELIMINAR DE clientes` | `eliminar_donde("clientes")` |
| Eliminar con condición | `ELIMINAR DE clientes DONDE nombre='Ana'` | `eliminar_donde("clientes", "nombre", "Ana")` |

`DONDE` admite en esta versión una comparación de igualdad (`columna=valor`). `INSERTAR EN ... SELECCIONAR *` requiere el mismo número de columnas de usuario en ambas tablas y copia solo los registros activos. El borrado es lógico: `ELIMINAR DE` no reinicia los identificadores; `TRUNCAR TABLA` sí. Los comandos antiguos `INSERTAR tabla ...`, `ACTUALIZAR tabla id ...` y `ELIMINAR tabla id` siguen disponibles. El formato CSV sencillo del motor no admite comas dentro de los valores.

## Compilar y probar

En PowerShell, desde esta carpeta:

```powershell
.\004-compilar.ps1
py .\003-probar-ddl.py
py .\003-probar-consola.py
py .\004-probar-dml.py
.\004-pierodevbbdd.exe
```

Las pruebas usan configuraciones y bases de datos temporales. El ejecutable usa por defecto `%APPDATA%\PierodevBBDD\config.json` si existe, igual que el conector instalado. Para actualizar el módulo Python instalado, después de compilar se puede ejecutar `.\004-instalar.ps1`; la compilación por sí sola no cambia la instalación anterior.
