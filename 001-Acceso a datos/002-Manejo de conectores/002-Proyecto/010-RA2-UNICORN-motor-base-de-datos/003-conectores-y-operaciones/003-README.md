# UnicornBBDD — 003 · Conectores y operaciones

Esta versión parte de la 002 y conserva su motor en C++, su consola y la base `Erin-erp`. La copia inicial incluye el cliente Piero Olivares añadido manualmente. El catálogo contiene artículos habituales y los demás datos de demostración son ficticios.

## Qué se muestra

Los ejemplos de [Python](doc/python/003-operaciones_erp.py) y [PHP](doc/php/003-operaciones_erp.php) realizan el mismo recorrido:

1. Abren `Erin-erp` y consultan clientes, productos, pedidos con `JOIN` y un resumen con agregaciones.
2. Crean un cliente, cambian su teléfono y dan de baja otro cliente de prueba.
3. Guardan un pedido y una línea dentro de una transacción confirmada.
4. Inician otra transacción y la deshacen para mostrar que el cliente añadido desaparece.
5. Crean y ejecutan un procedimiento almacenado para consultar los pedidos de un cliente.

Cada ejecución trabaja en una **copia temporal** de `Erin-erp`. Al terminar, la copia se borra. Los datos de trabajo de `datos/Erin-erp`, incluidos los de Piero, no cambian al ejecutar estos ejemplos. En este motor, una baja marca `activo=0` y conserva el registro en el archivo de datos.

## Ejecutar desde PowerShell

Sitúate en la carpeta `003-conectores-y-operaciones`. Si modificas el código C++, compila primero:

```powershell
.\scripts\003-compilar.ps1
.\scripts\003-compilar_php.ps1
```

Ejecuta el ejemplo Python con el conector local de `bin`:

```powershell
py .\doc\python\003-operaciones_erp.py
```

Ejecuta el ejemplo PHP con el PHP de XAMPP:

```powershell
C:\xampp\php\php.exe -d ffi.enable=1 .\doc\php\003-operaciones_erp.php
```

También puedes abrir `doc/php/003-operaciones_erp.php` desde Apache en XAMPP. La dirección, si el proyecto está en `C:\xampp\htdocs\DAM2PieroOlivares`, es:

```text
http://localhost/DAM2PieroOlivares/001-Acceso%20a%20datos/002-Manejo%20de%20conectores/010-RA2-UNICORN-motor-base-de-datos/003-conectores-y-operaciones/doc/php/003-operaciones_erp.php
```

PHP necesita la extensión FFI y `ffi.enable=1` en el `php.ini` que usa Apache. La DLL se carga desde `bin` mediante la clase `UnicornBBDD` de `conectores/php`.

## Usar la consola

```powershell
.\bin\003-unicornbbdd.exe
```

Dentro de Unicorn:

```text
LISTAR BASES
USAR Erin-erp
SELECCIONAR * DE clientes DONDE email = 'piero7ov@gmail.com'
SELECCIONAR id,nombre,precio DE productos LIMITE 5
SALIR
```

## Instalación de Python en Windows

El instalador **se prepara en esta versión** para usarlo cuando terminemos de revisar la 003. Por ahora los ejemplos funcionan con el conector local y no requieren instalarlo. Cuando se ejecute `scripts/003-instalar.ps1`, copiará `unicornbbdd.pyd` al Python del usuario y, si aún no existe allí, copiará `Erin-erp` a `%LOCALAPPDATA%\UnicornBBDD\datos`. Conservará otras bases y no sobrescribirá una `Erin-erp` ya instalada. La configuración estará en `%APPDATA%\UnicornBBDD\config.json`. `scripts/003-desinstalar.ps1` quitará el módulo y dejará la configuración y los datos.

La instalación global puede sustituir el módulo `unicornbbdd.pyd` de la 001. El instalador no se ejecuta como parte de esta entrega automática; primero revisaremos la 003 y después lo haremos desde PowerShell.

## Cómo funcionan los conectores

- **Python:** importa el módulo nativo `unicornbbdd.pyd`. `consultar` devuelve una lista de diccionarios: cada diccionario es una fila y sus claves son columnas. Python gestiona la memoria de estos objetos; el ejemplo libera las referencias temporales al acabar.
- **PHP:** la clase `UnicornBBDD` llama a `unicornbbdd.dll` mediante FFI. `consultar` devuelve un array de filas asociativas. La clase libera la memoria devuelta por C++ tras leer cada resultado y cierra la conexión nativa en su destructor.
- **Ventaja:** ambos lenguajes usan el mismo motor y la misma estructura de tablas. **Coste:** hay que compilar binarios adecuados para cada entorno y configurar Python o FFI de PHP. La base de archivos embebida no ofrece aislamiento seguro entre procesos simultáneos.

El modelo de tablas está en [003-modelo-de-datos.md](doc/003-modelo-de-datos.md). Los importes se usan para aprender: `DECIMAL` utiliza punto flotante en este motor y aún no se debe emplear para facturación real.
