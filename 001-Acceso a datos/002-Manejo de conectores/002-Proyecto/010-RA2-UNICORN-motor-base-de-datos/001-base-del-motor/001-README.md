# UnicornBBDD — 001 · Base del motor

Esta primera versión del RA2 toma como base técnica PierodevBBDD 007 y adopta el nombre y la presentación de UNICORN. Es un motor de tablas escrito en C++ para Windows, con terminal y conectores para Python y PHP. Los datos de gestión empresarial se añadirán en la versión 002.

## Estructura

| Carpeta o archivo | Contenido |
| --- | --- |
| `motor/` | Almacenamiento, relaciones, tipos, consultas, índices, procedimientos y transacciones en C++. |
| `conectores/python/` | Código fuente del módulo nativo `unicornbbdd.pyd`. |
| `conectores/php/` | Puente C++ para `unicornbbdd.dll` y clase PHP `UnicornBBDD` mediante FFI. |
| `terminal/` | Consola con identidad visual de UNICORN y comandos del motor. |
| `scripts/` | Compilación, instalación y desinstalación en Windows. |
| `bin/` | Ejecutable, módulo Python y DLL generados por los scripts. |
| `doc/` | Ejemplos pequeños de Python y PHP con datos de prueba separados. |
| `config.json` | Configuración local: carpeta `datos` y tamaño de registro. |

Cada base se guarda como una carpeta dentro de `datos`. Las tablas utilizan registros de tamaño fijo en `.csv` e incluyen archivos de esquema, índice y metadatos. Cada tabla incorpora `id` como clave primaria y `activo` para el borrado lógico.

## Funciones disponibles

- Crear bases y tablas; definir tipos `TEXTO`, `ENTERO`, `REAL`, `BOOLEANO`, `FECHA` y `DECIMAL`.
- Insertar, consultar, actualizar, eliminar lógicamente y compactar registros.
- Definir claves foráneas, restricciones `NO NULO`, `UNICO` y valores por defecto.
- Consultar con filtros, ordenación, agrupaciones, agregaciones y varios tipos de JOIN.
- Crear índices secundarios, usar `EXPLICAR`, crear vistas y procedimientos almacenados.
- Iniciar, confirmar y deshacer transacciones.

El motor mantiene las funciones de la versión 007. Su nueva instalación usa `UnicornBBDD` en `%APPDATA%` y `%LOCALAPPDATA%`, de forma separada de PierodevBBDD. Los ficheros de la antigua aplicación de librería UNICORN tienen otro esquema y no se abren directamente con este motor. Las funciones de exportación y copia de aquella aplicación dependen de sus cuatro tablas; su adaptación al modelo ERP queda para una versión posterior.

## Compilar en Windows

Desde esta carpeta, con PowerShell y las herramientas ya utilizadas en la versión 007:

```powershell
.\scripts\001-compilar.ps1
.\scripts\001-compilar_php.ps1
```

El primer script genera `bin/unicornbbdd.pyd` y `bin/001-unicornbbdd.exe`. El segundo genera `bin/unicornbbdd.dll`. Ambos usan MSYS2 UCRT64; el módulo Python se compila para el Python que ejecuta `py`.

## Probar sin instalar

Los ejemplos crean bases de demostración en carpetas temporales y no usan las bases instaladas:

```powershell
py .\doc\python\001-ejemplo.py
C:\xampp\php\php.exe -d ffi.enable=1 .\doc\php\001-ejemplo.php
```

Para abrir la terminal con el `config.json` local, sitúate en la raíz de esta versión y ejecuta:

```powershell
.\bin\001-unicornbbdd.exe
```

Escribe `AYUDA` para ver los comandos y `SALIR` para cerrar. La terminal crea `datos` cuando se abre; selecciona una base antes de crear tablas.

## Instalar y desinstalar el módulo Python

La instalación es opcional. Permite importar `unicornbbdd` desde otras carpetas:

```powershell
.\scripts\001-instalar.ps1
```

El script instala solo el módulo Python en los paquetes del usuario. Si no existe, crea `%APPDATA%\UnicornBBDD\config.json` y la carpeta `%LOCALAPPDATA%\UnicornBBDD\datos`. No instala el conector PHP globalmente: la clase PHP carga la DLL de `bin`. Para usarlo en Apache de XAMPP deben estar activos `extension=ffi` y `ffi.enable=1` en su `php.ini`. El comando PHP de arriba presupone que FFI ya está habilitado en `php.ini`.

```powershell
.\scripts\001-desinstalar.ps1
```

La desinstalación quita el módulo Python instalado y conserva configuración y datos. No afecta al módulo `pierodevbbdd` de la versión 007.

## Límites de esta fase

Esta versión prepara el motor y sus conectores; aún no incluye las tablas ni la carga de datos ERP. Las transacciones son una copia temporal de archivos y no aíslan procesos simultáneos. `DECIMAL` usa punto flotante y no ofrece precisión exacta para importes monetarios. El motor es embebido, por lo que todavía falta demostrar un gestor independiente para el criterio b del RA2.
