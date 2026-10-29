# PierodevBBDD 006: manejo de conectores y procedimientos almacenados

## De dónde sale esta versión

`006` continúa el proyecto `005-consultas DQL`. Conserva el motor en C++, la terminal y el módulo nativo `pierodevbbdd` para Python. Añade un conector PHP para Windows mediante FFI. Los apuntes de la sesión aportan el siguiente hito: claves y restricciones, relaciones, consultas con JOIN y agregaciones, tipos, índices, subconsultas, transacciones y vistas. Sobre esa base se añade la creación y ejecución de procedimientos almacenados.

El código de los apuntes usa el nombre `JocarsaBBDD`; aquí se adapta al nombre y a la instalación de Windows de `PierodevBBDD`.

## Estructura de esta versión

| Archivo | Función |
| --- | --- |
| `motor/` | Motor C++: interfaz, almacenamiento, consultas, índices, compatibilidad y procedimientos. |
| `conectores/python/` | Código C++ del módulo nativo de Python. |
| `conectores/php/` | Puente C++ para PHP y clase PHP que carga la DLL mediante FFI. |
| `terminal/` | Programa de consola en español. |
| `scripts/` | Compilación e instalación en Windows; incluye `006-compilar_php.sh` y su equivalente PowerShell. |
| `bin/` | Ejecutable, módulo Python `.pyd` y biblioteca PHP `.dll` generados. |
| `doc/` | Esta guía y ejemplos separados en `python/` y `php/`. |
| `config.json` | Configuración local para ejecutar desde la raíz de esta versión. |

Los ejemplos y documentos de `005` siguen en la carpeta de aquella versión. Aquí solo quedan los archivos de `006`.

## Cómo se guardan los datos

`config.json` indica `instalacion` (directorio de las bases) y `tamanoRegistro` (bytes por registro). Cada base es una carpeta. Cada tabla usa `.csv` para registros de tamaño fijo, `.esquema` para las columnas y `.idx` para localizar registros por `id`. El motor añade automáticamente `id` como clave primaria implícita y `activo` para el borrado lógico.

Los archivos adicionales tienen una finalidad concreta:

| Extensión | Contenido |
| --- | --- |
| `.rel` | Clave primaria y claves foráneas. |
| `.tipos` | Tipos `TEXTO`, `ENTERO`, `REAL` y `BOOLEANO`. |
| `.vista` | Consulta de una vista. |
| `.indice` | Índice de usuario por una columna. |
| `.proc` | Parámetros y cuerpo de un procedimiento. |
| `.ultimo` | Último `id` asignado, incluso si luego se borra o se modifica el esquema. |

Las transacciones hacen una copia temporal de los archivos de la base en una carpeta `.txn_nombre`. `CONFIRMAR` descarta la copia; `DESHACER` la restaura. Es un mecanismo didáctico, sin control de concurrencia entre procesos.

## Operaciones disponibles en la terminal

```text
CREAR BASE tienda
USAR tienda
CREAR TABLA clientes nombre,email,ciudad
CREAR TABLA productos nombre:TEXTO,stock:ENTERO,precio:REAL
ALTERAR TABLA clientes ANADIR telefono
ALTERAR TABLA clientes MODIFICAR email NO NULO
ALTERAR TABLA clientes MODIFICAR email UNICO
ALTERAR TABLA clientes MODIFICAR ciudad POR DEFECTO 'Valencia'
ALTERAR TABLA pedidos ANADIR CLAVE FORANEA id_cliente REFERENCIAS clientes id
TRUNCAR TABLA productos
RENOMBRAR TABLA clientes personas
COMPACTAR productos
ELIMINAR TABLA productos
ELIMINAR BASE tienda
```

`INSERTAR EN`, `ACTUALIZAR ... ESTABLECER` y `ELIMINAR DE` modifican registros. `SELECCIONAR`, `LISTAR`, `BUSCAR` y `ESQUEMA` los consultan. Una clave foránea exige que el valor referenciado exista e impide borrar un registro todavía referenciado. `NO NULO`, `UNICO` y `POR DEFECTO` se aplican al insertar y actualizar.

```text
INSERTAR EN clientes (nombre,email) VALORES ('Ana','ana@correo.com')
ACTUALIZAR clientes ESTABLECER ciudad='Madrid' DONDE id='1'
ELIMINAR DE clientes DONDE id='1'
SELECCIONAR * DE clientes
```

El motor conserva los comandos breves de las versiones anteriores, como `INSERTAR clientes Ana,ana@correo.com`, `SELECCIONAR clientes 1`, `LISTAR clientes` y `BUSCAR clientes nombre Ana`.

## Consultas DQL

Se mantienen filtros, `DISTINTO`, alias `COMO`, `ENTRE`, `EN`, patrones `COMO`/`LIKE`, `ORDENAR POR` y `LIMITE`. Esta versión añade `JOIN` interno, `LEFT JOIN`, agregaciones y agrupación:

```text
SELECCIONAR clientes.nombre,pedidos.total DE clientes JOIN pedidos EN clientes.id = pedidos.id_cliente
SELECCIONAR clientes.nombre,pedidos.total DE clientes LEFT JOIN pedidos EN clientes.id = pedidos.id_cliente
SELECCIONAR CONTAR(*) COMO numero,SUMA(total) COMO importe DE pedidos
SELECCIONAR id_cliente,CONTAR(*) COMO numero,SUMA(total) COMO importe DE pedidos AGRUPAR POR id_cliente TENIENDO importe > 100
```

Las funciones disponibles son `CONTAR`, `SUMA`, `MEDIA`, `MINIMO` y `MAXIMO`. `SUMA` y `MEDIA` requieren valores numéricos. `TENIENDO` filtra grupos ya agregados. Un `LEFT JOIN` incluye las filas de la tabla izquierda sin coincidencia, con valores vacíos en las columnas de la derecha.

Las subconsultas no correlacionadas se resuelven de dentro hacia fuera. Deben devolver una columna; fuera de `EN` deben devolver exactamente una fila:

```text
SELECCIONAR nombre DE productos DONDE precio > (SELECCIONAR MEDIA(precio) DE productos)
```

## Índices, vistas y transacciones

```text
CREAR INDICE idx_nombre EN clientes (nombre)
LISTAR INDICES
BUSCAR clientes nombre Ana
ELIMINAR INDICE idx_nombre

CREAR VISTA caros COMO SELECCIONAR nombre,precio DE productos DONDE precio > 100
SELECCIONAR * DE caros
LISTAR VISTAS
ELIMINAR VISTA caros

INICIAR TRANSACCION
INSERTAR EN productos VALORES ('Prueba','1','10')
DESHACER
```

El índice de usuario se usa en `BUSCAR` y en las búsquedas de integridad referencial por igualdad. Se actualiza al insertar, actualizar, eliminar, truncar y compactar. Si se elimina o renombra su columna, también se elimina el índice. Las consultas DQL generales todavía recorren las filas. Para renombrar una tabla con índices o referencias externas, elimina primero esas dependencias.

## Procedimientos almacenados

Un procedimiento tiene nombre, parámetros y un cuerpo guardado en la base. Los parámetros aparecen en el cuerpo como `{nombre}`. Al llamarlo, cada argumento se introduce como valor de texto entre comillas.

```text
CREAR PROCEDIMIENTO pedidos_cliente(cliente) COMO SELECCIONAR * DE pedidos DONDE id_cliente = {cliente}
LLAMAR pedidos_cliente('1')
LISTAR PROCEDIMIENTOS
ELIMINAR PROCEDIMIENTO pedidos_cliente
```

El cuerpo puede contener varias instrucciones separadas por `;`. Se admiten `SELECCIONAR`, `INSERTAR EN ... VALORES`, `ACTUALIZAR ... ESTABLECER` y `ELIMINAR DE`. Las condiciones de `ACTUALIZAR` y `ELIMINAR` usan `columna = valor`. La llamada devuelve el número de filas modificadas y, si hubo consultas, las filas de la última consulta. Las instrucciones de un procedimiento no se envuelven automáticamente en una transacción; usa `INICIAR TRANSACCION` si necesitas confirmarlas o deshacerlas como conjunto.

```text
CREAR PROCEDIMIENTO registrar(cliente,total) COMO INSERTAR EN pedidos VALORES ({cliente},{total})
LLAMAR registrar('1','120')
```

## Conector Python

El módulo devuelve los resultados DQL como listas de diccionarios. Las funciones principales son `crear_base`, `usar_base`, `crear_tabla`, `crear_tabla_tipada`, `insertar`, `insertar_columnas`, `actualizar_donde`, `eliminar_donde`, `consultar`, `listar`, `buscar`, `seleccionar`, `actualizar` y `eliminar`.

También expone `anadir_clave_foranea`, `claves_foraneas`, `establecer_no_nulo`, `establecer_unico`, `establecer_por_defecto`, `tipos`, `crear_indice`, `listar_indices`, `eliminar_indice`, `crear_vista`, `listar_vistas`, `eliminar_vista`, `iniciar_transaccion`, `confirmar`, `deshacer`, `crear_procedimiento`, `listar_procedimientos`, `ejecutar_procedimiento` y `eliminar_procedimiento`.

```python
import pierodevbbdd as bd

bd.usar_base("tienda")
bd.crear_procedimiento(
    "pedidos_cliente",
    ["cliente"],
    "SELECCIONAR * DE pedidos DONDE id_cliente = {cliente}"
)
resultado = bd.ejecutar_procedimiento("pedidos_cliente", ["1"])
print(resultado["filas"])
print(resultado["modificados"])
```

`crear_procedimiento` devuelve `False` si ya existe ese nombre. `ejecutar_procedimiento` lanza `RuntimeError` si falta el procedimiento, no coincide el número de argumentos o falla una instrucción.

El código fuente está en `conectores/python/003-conector_python.cpp` y el módulo compilado en `bin/pierodevbbdd.pyd`. Para probarlo sin tocar los datos instalados:

```powershell
py .\doc\python\01-procedimientos.py
```

El ejemplo crea su propia configuración y borra sus datos de prueba al terminar.

## Conector PHP para XAMPP en Windows

`conectores/php/006-conector_php.cpp` expone las operaciones del mismo motor C++ en `bin/pierodevbbdd.dll`. `conectores/php/006-conector_php.php` ofrece la clase `PierodevBBDD` con `crearBase`, `usarBase`, `crearTabla`, `insertar`, `consultar`, `crearProcedimiento`, `listarProcedimientos`, `ejecutarProcedimiento` y `eliminarProcedimiento`. Las consultas devuelven listas de arrays asociativos; la ejecución de un procedimiento devuelve `modificados` y `filas`.

La [versión del profesor](https://github.com/jocarsa/tame2627dam2/tree/main/001-Acceso%20a%20datos/002-Manejo%20de%20conectores/007-Ejecuci%C3%B3n%20de%20procedimientos%20almacenados%20en%20la%20base%20de%20datos/020-conector%20php) usa `php-config` y genera una extensión `.so` para Linux. XAMPP en este equipo proporciona PHP 8.2 compilado con Visual C++ y FFI, pero no las cabeceras de PHP para compilar esa extensión con MSYS2. Por eso esta adaptación genera una DLL C++ que PHP carga mediante FFI. El módulo Python y PHP comparten los archivos de datos y la sintaxis del motor; cada proceso debe seleccionar la base que vaya a usar.

Desde la raíz de `006`, compila y ejecuta el ejemplo así:

```powershell
.\scripts\006-compilar_php.ps1
C:\xampp\php\php.exe -d extension=php_ffi.dll -d ffi.enable=1 .\doc\php\01-procedimientos.php
```

También se incluye `scripts/006-compilar_php.sh` para Bash de MSYS2; en Windows llama al script PowerShell para tratar correctamente las rutas con acentos. El ejemplo PHP crea datos de demostración en una carpeta temporal. La clase prepara una copia de la DLL en la carpeta temporal porque FFI de este PHP no la carga de forma fiable desde una ruta con acentos. Para usarla con Apache, activa `extension=php_ffi.dll` y `ffi.enable=1` en el `php.ini` que cargue Apache y reinicia Apache; no hace falta copiar la DLL al directorio de extensiones de PHP.

## Actualizar la instalación en Windows

Desde PowerShell, entra en la raíz de esta versión y ejecuta:

```powershell
.\scripts\006-compilar.ps1
.\scripts\006-instalar.ps1
```

El primer script genera `bin/pierodevbbdd.pyd` y `bin/006-pierodevbbdd.exe`. El segundo copia el `.pyd` a la carpeta de paquetes de usuario de Python, sustituyendo la versión instalada. Si ya existe `%APPDATA%\PierodevBBDD\config.json`, el instalador la conserva. Los datos de `%LOCALAPPDATA%\PierodevBBDD\datos` también se conservan. Para PHP se compila la DLL con `scripts/006-compilar_php.ps1`; no hay instalador global de PHP.

Cierra y vuelve a abrir la consola o el proceso Python que estuviera usando el módulo. Comprueba la instalación desde **otra carpeta** para que Python cargue el módulo instalado y no el `.pyd` local:

```powershell
Set-Location $env:USERPROFILE
py -c "import pierodevbbdd; print(pierodevbbdd.__file__); print(pierodevbbdd.configuracion())"
```

La ruta mostrada debe apuntar al directorio de paquetes de usuario. El ejecutable `bin/006-pierodevbbdd.exe` se ejecuta desde la raíz de esta versión para que encuentre `config.json`; `scripts/006-instalar.ps1` instala solamente el módulo Python.

## Límites de esta versión

Se implementan `JOIN` interno y `LEFT JOIN`; no `RIGHT JOIN` ni `FULL JOIN`. Las subconsultas son no correlacionadas. Los índices de usuario aceleran búsquedas por igualdad con `BUSCAR`, no el plan general de DQL. Los procedimientos aceptan el subconjunto de instrucciones descrito arriba; no tienen lenguaje de control, procedimientos anidados ni parámetros de salida. El almacenamiento y las transacciones son didácticos y no ofrecen aislamiento para accesos simultáneos. Antes de apuntar esta versión a una carpeta con datos anteriores, haz una copia de esa carpeta.
