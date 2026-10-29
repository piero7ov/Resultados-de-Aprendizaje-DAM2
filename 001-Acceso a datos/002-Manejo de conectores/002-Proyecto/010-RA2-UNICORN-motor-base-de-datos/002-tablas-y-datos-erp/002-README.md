# UnicornBBDD — 002 · Tablas y datos ERP

Esta versión conserva el motor, la terminal y los conectores de `001-base-del-motor`. Añade una base de demostración empresarial con **10 tablas relacionadas y 800 registros ficticios iniciales**. Los clientes, proveedores, empresa, correos, códigos, teléfonos y precios de la muestra son inventados. Los productos tienen nombres de artículos y servicios habituales en una empresa, como monitores, papel A4 y configuración de red. Los correos usan el dominio reservado `.test` para que no se envíen mensajes a personas reales.

## Tablas y cantidades

| Tabla | Registros | Qué guarda |
| --- | ---: | --- |
| `empresas` | 1 | Empresa ficticia de la demostración. |
| `clientes` | 40 | Clientes y datos de contacto. |
| `proveedores` | 15 | Proveedores y datos de contacto. |
| `categorias` | 10 | Familias de productos. |
| `productos` | 100 | Código, categoría, precio y existencias. |
| `pedidos` | 100 | Cabecera de pedidos de clientes. |
| `pedidos_lineas` | 250 | Productos, cantidades y precios de cada pedido. |
| `facturas` | 74 | Facturas vinculadas a pedidos. |
| `compras` | 60 | Cabecera de compras a proveedores. |
| `compras_lineas` | 150 | Productos, cantidades y precios de cada compra. |
| **Total** | **800** | |

Cada tabla tiene `id` y `activo` añadidos por el motor. Las relaciones se comprueban con claves foráneas: los clientes y proveedores pertenecen a una empresa, los productos a una categoría, los pedidos a un cliente y las líneas a su pedido o compra y a un producto. Las facturas apuntan a un pedido y un cliente. Los importes de cabecera se calculan desde sus líneas durante la carga.

El detalle de campos, tipos y relaciones está en [Modelo de datos](doc/002-modelo-de-datos.md).

El esquema usa `TEXTO`, `ENTERO`, `DECIMAL` y `FECHA`, campos `NO NULO`, valores `UNICO` en correos, códigos y números de factura, e índices secundarios para búsquedas frecuentes. `DECIMAL` en este motor usa punto flotante; los importes son solo para la demostración del ejercicio.

## Preparar la base

Desde PowerShell, entra en `002-tablas-y-datos-erp` y ejecuta:

```powershell
.\scripts\002-compilar.ps1
.\scripts\002-compilar_php.ps1
py .\scripts\002-cargar_erp.py
```

El cargador usa únicamente `config.json` y la carpeta `datos` de esta versión. Crea una base temporal y la publica como `datos/Erin-erp` cuando termina. **No sobrescribe** una base `Erin-erp` existente. Si tienes la carga antigua con nombres genéricos, ejecuta una sola vez `py .\scripts\002-cargar_erp.py --actualizar-datos`. Esta opción cambia los registros originales de clientes, proveedores y productos; conserva los registros añadidos manualmente y cualquier nombre que ya se haya personalizado. La base y los binarios de la versión 001 permanecen separados.

Los precios actuales del catálogo son ficticios. Los importes ya registrados en líneas de pedidos, compras y facturas se conservan como valores históricos.

## Consultar en la terminal

```powershell
.\bin\002-unicornbbdd.exe
```

Una vez aparezca `unicorn>`, introduce:

```text
LISTAR BASES
USAR Erin-erp
LISTAR clientes
SELECCIONAR nombre,precio,stock DE productos LIMITE 5
SELECCIONAR clientes.nombre,pedidos.total DE clientes JOIN pedidos EN clientes.id = pedidos.cliente_id LIMITE 5
SALIR
```

### Registrar un cliente manualmente

Dentro de la consola, después de `USAR Erin-erp`, escribe un cliente ficticio de prueba:

```text
INSERTAR EN clientes VALORES ('1','Cliente manual','manual@example.test','900300001')
SELECCIONAR * DE clientes DONDE email = 'manual@example.test'
```

El primer valor, `1`, es la empresa a la que pertenece. El motor asigna el `id` del cliente automáticamente. El correo debe ser distinto de los existentes; puedes cambiar el nombre, el correo y el teléfono antes de ejecutar el comando. Esta alta modifica la base local `Erin-erp` de la versión 002 y no altera la versión 001.

## Consultar desde Python y PHP

```powershell
py .\doc\python\002-consultar_erp.py
C:\xampp\php\php.exe -d ffi.enable=1 .\doc\php\002-consultar_erp.php
```

Para ver el ejemplo PHP desde XAMPP, con Apache iniciado y FFI activado, abre la ruta del archivo `doc/php/002-consultar_erp.php` dentro de este proyecto mediante `http://localhost/`. El ejemplo solo lee datos; la versión 003 incorporará operaciones ERP desde ambos conectores.

## Instalación final

En la versión 002 trabajamos con el ejecutable y el conector locales de `bin`; no hace falta instalar nada en Python para consultar esta base. La instalación final del módulo Python y su instalador se prepararán en la versión 003, cuando el ejercicio esté terminado. La base `Erin-erp` de esta versión vive en su propia carpeta `datos`.
