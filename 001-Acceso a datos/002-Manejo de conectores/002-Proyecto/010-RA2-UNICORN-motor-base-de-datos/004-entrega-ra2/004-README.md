# UnicornBBDD — 004 · Entrega del RA2

Esta es la versión de entrega del ejercicio de acceso a datos. El motor está escrito en C++ y se usa en Windows desde la consola, Python y PHP. `Erin-erp` contiene diez tablas relacionadas, 800 registros ficticios iniciales y el cliente Piero Olivares añadido manualmente. Las carpetas 001, 002 y 003 se conservan como versiones anteriores.

La explicación personal del resultado de aprendizaje está en [005-resultado-de-aprendizaje.md](../005-resultado-de-aprendizaje.md). El [modelo de datos](doc/004-modelo-de-datos.md) enumera las tablas, campos y relaciones.

## Uso rápido en Windows

Desde PowerShell, entra en `004-entrega-ra2` y abre la consola:

```powershell
.\bin\004-unicornbbdd.exe
```

En el indicador de Unicorn:

```text
LISTAR BASES
USAR Erin-erp
SELECCIONAR * DE clientes DONDE email = 'piero7ov@gmail.com'
SELECCIONAR id,nombre,precio DE productos LIMITE 5
SALIR
```

Para ejecutar los ejemplos completos con sus conectores locales:

```powershell
py .\doc\python\004-operaciones_erp.py
C:\xampp\php\php.exe -d ffi.enable=1 .\doc\php\004-operaciones_erp.php
```

Estos dos programas copian `Erin-erp` a una carpeta temporal. Muestran consultas, altas, cambios, baja lógica, un pedido con su línea, confirmación y deshacer de transacciones y un procedimiento almacenado. Eliminan la copia al terminar. Así no cambian la base de trabajo.

En Apache de XAMPP, con FFI activado, el ejemplo PHP está en:

```text
http://localhost/DAM2PieroOlivares/001-Acceso%20a%20datos/002-Manejo%20de%20conectores/010-RA2-UNICORN-motor-base-de-datos/004-entrega-ra2/doc/php/004-operaciones_erp.php
```

## API completa para PHP

El conector PHP encapsula la DLL mediante una única clase `UnicornBBDD`. PHP no lee ni modifica directamente los archivos CSV, esquemas, relaciones o índices del motor. Todas las operaciones pasan por la API nativa C y el motor C++.

La interfaz pública permite:

- consultar la configuración y listar bases y tablas;
- crear, seleccionar y eliminar bases;
- crear tablas con o sin tipos y consultar esquema, tipos, clave primaria, claves foráneas y restricciones;
- insertar por posición o por columnas, seleccionar, listar, buscar, consultar, actualizar uno o varios campos y realizar borrado lógico;
- añadir, eliminar y renombrar columnas, renombrar, truncar, compactar y eliminar tablas;
- gestionar claves foráneas, `NO NULO`, `UNICO` y valores por defecto;
- crear, listar y eliminar índices, vistas y procedimientos almacenados;
- iniciar, confirmar y deshacer transacciones.

La comprobación aislada de toda la API se ejecuta con:

```powershell
C:\xampp\php\php.exe -d ffi.enable=1 .\doc\php\004-comprobar-api-completa.php
```

La prueba crea su propia instalación dentro de `datos`, verifica las operaciones y la elimina al terminar. No modifica la base `Erin-erp` incluida en la entrega.

## Gestor embebido y gestor independiente

[004-comparar-gestores.php](doc/php/004-comparar-gestores.php) consulta **UnicornBBDD**, que trabaja dentro del proceso PHP, y **MariaDB de XAMPP**, que funciona en un proceso servidor aparte. La consulta a MariaDB lee los motores disponibles en `information_schema`; no muestra otras bases, no crea tablas ni copia los datos del ERP.

Con MySQL iniciado en el panel de XAMPP, ejecuta:

```powershell
C:\xampp\php\php.exe -d ffi.enable=1 .\doc\php\004-comparar-gestores.php
```

El ejemplo usa `127.0.0.1:3306`, usuario `root` y contraseña vacía, que son los valores habituales de un XAMPP local. Si tu instalación utiliza otros datos, establece las variables de entorno `UNICORN_RA2_DB_HOST`, `UNICORN_RA2_DB_PORT`, `UNICORN_RA2_DB_USER` y `UNICORN_RA2_DB_PASSWORD` antes de ejecutarlo. No guardes contraseñas en los archivos del proyecto. Si MariaDB no está iniciado, el programa muestra un error de conexión y la comprobación de ese criterio queda pendiente.

También se puede abrir desde Apache:

```text
http://localhost/DAM2PieroOlivares/001-Acceso%20a%20datos/002-Manejo%20de%20conectores/010-RA2-UNICORN-motor-base-de-datos/004-entrega-ra2/doc/php/004-comparar-gestores.php
```

## Instalación de Python

La versión 003 ya se instaló en el Python del usuario y se comprobó desde `C:\Users\piero`: `unicornbbdd.pyd` se cargó desde `site-packages`, `usar_base('Erin-erp')` devolvió `True` y se encontró el cliente Piero con ID 41. La 004 usa el mismo motor y la instalación global de la 003 sigue disponible. Para ejecutar los ejemplos de esta carpeta se usa el conector local de `bin`; no hace falta reinstalar.

Los scripts `004-compilar.ps1`, `004-compilar_php.ps1`, `004-instalar.ps1` y `004-desinstalar.ps1` acompañan al código por si se necesita reconstruirlo o instalar esta versión después. El instalador conserva las bases ya existentes y no sobrescribe una `Erin-erp` instalada.

Las claves foráneas pueden referenciar la clave primaria técnica `id` o cualquier columna declarada `UNICO`. Esta ampliación permite que aplicaciones como ERIN ERP mantengan identificadores públicos estables sin depender del identificador físico de cada registro.

## Evidencia por criterio

| Criterio | Dónde se muestra |
| --- | --- |
| a) Ventajas e inconvenientes de conectores | Explicación en `005-resultado-de-aprendizaje.md` y comparación de Python y PHP en este README. |
| b) Gestores embebidos e independientes | UnicornBBDD en los ejemplos y MariaDB en `004-comparar-gestores.php`, comprobados desde PHP y Apache con los servicios iniciados. |
| c) Conector idóneo y d) conexión | `unicornbbdd.pyd` en Python y DLL con FFI en PHP; ambos seleccionan `Erin-erp`. |
| e) Estructura de la base | `scripts/004-cargar_erp.py` y `doc/004-modelo-de-datos.md`. |
| f) Modificación de contenido | Altas, cambios y baja lógica en los dos ejemplos de operaciones. |
| g) Objetos de resultados y h) consultas | Lista de diccionarios en Python, arrays asociativos en PHP, filtros, JOIN y agregación. |
| i) Liberación de objetos | PHP libera resultados de FFI y cierra su conexión; los ejemplos eliminan sus copias temporales. |
| j) Transacciones | Pedido con línea confirmado y cliente de prueba deshecho en los dos ejemplos. |
| k) Procedimientos almacenados | Procedimiento `pedidos_de_cliente_demo_*` creado y ejecutado en los dos ejemplos. |

## Comprobaciones realizadas

El 12 de octubre de 2026 compilé el ejecutable, el módulo Python y la DLL PHP de esta versión. Ejecuté los ejemplos de operaciones con Python y con el PHP de XAMPP. Ambos completaron las consultas, los cambios, las transacciones y el procedimiento.

Con Apache y MySQL iniciados en XAMPP, las dos páginas PHP de la 004 respondieron con HTTP 200. La comparación mostró 41 clientes en UnicornBBDD y los motores InnoDB y MyISAM del servidor MariaDB. Después de ejecutar los ejemplos, comparé los 66 archivos de `Erin-erp` en la 003 y la 004: no había diferencias ni archivos añadidos.

El 13 de octubre de 2026 se amplió el conector PHP hasta cubrir la API necesaria para un ERP completo. Se recompiló la DLL, se ejecutó `004-comprobar-api-completa.php` con resultado `API PHP COMPLETA: CORRECTA` y se volvió a ejecutar `004-operaciones_erp.php` correctamente. También se corrigió el cierre del archivo de índice antes de compactar una tabla en Windows.

## Límites

UnicornBBDD es un motor de aprendizaje embebido. Sus archivos no ofrecen aislamiento seguro para varios procesos escribiendo a la vez y `DECIMAL` utiliza punto flotante. El ejemplo no está destinado a facturación real ni a trabajo multiusuario. MariaDB aparece únicamente para demostrar el acceso a un gestor independiente en el criterio b.
