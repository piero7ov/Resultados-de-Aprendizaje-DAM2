# 004: usar PierodevBBDD desde cualquier carpeta

Esta versión reúne las iteraciones 008, 009 y 010 de clase: instalar el conector, encontrar su configuración y dejar preparada su compilación e instalación.

El profesor trabaja en Linux y usa `Makefile`, `make` y `sudo make install`. Aquí usamos **PowerShell en Windows**: `004-compilar.ps1` equivale a `make`, y `004-instalar.ps1` a `make install`. Los `.ps1` son nuestra adaptación, no archivos del profesor.

## Qué hace cada pieza

- `002-PierodevBBDD.hpp/.cpp`: motor de base de datos en C++.
- `003-conector_python.cpp`: puente que permite llamar al motor desde Python.
- `pierodevbbdd.pyd`: puente compilado que Python importa.
- `config.json`: indica dónde guardar las bases de datos y el tamaño de registro.

## Compilar e instalar

En PowerShell, dentro de esta carpeta:

```powershell
.\004-compilar.ps1
.\004-instalar.ps1
```

El instalador copia el `.pyd` a los paquetes de tu Python, crea la configuración en `%APPDATA%\PierodevBBDD\config.json` si falta y reserva `%LOCALAPPDATA%\PierodevBBDD\datos` para los datos. No sustituye una configuración existente ni crea bases de datos.

## Prueba manual sin crear datos

Desde **otra carpeta**:

```powershell
Set-Location $env:TEMP
py -c "import pierodevbbdd; print(pierodevbbdd.__file__); print(pierodevbbdd.configuracion())"
```

Debe mostrar el `.pyd` dentro de `site-packages` y la ruta de datos del usuario. Así compruebas que Python encuentra el conector y que el motor encuentra su configuración, sin crear una base.

## Configuración y errores

El motor busca `config.json` en este orden: carpeta actual, ruta de `PIERODEV_CONFIG` y `%APPDATA%\PierodevBBDD\config.json`. Si `instalacion` es relativa, se interpreta respecto al archivo de configuración. El motor se abre al llamar a una función; un fallo de configuración se muestra como error de Python sin cerrar el intérprete.

## Uso y retirada

Funciones Python: `crear_base`, `usar_base`, `crear_tabla`, `insertar`, `seleccionar`, `listar`, `buscar`, `actualizar`, `eliminar` y `configuracion`.

Tras cambiar el C++, vuelve a ejecutar `004-compilar.ps1` y `004-instalar.ps1`. Para quitar el módulo y su configuración: `.\004-desinstalar.ps1`. La desinstalación conserva las bases de datos.
