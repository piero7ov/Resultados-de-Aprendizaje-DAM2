# Resultado de aprendizaje 2 — UnicornBBDD

En este ejercicio he continuado el trabajo de UNICORN para crear **UnicornBBDD**, un motor de bases de datos basado en tablas y escrito en C++. Lo utilizo desde la consola, Python y PHP en Windows. La base de ejemplo se llama `Erin-erp` y contiene información ficticia de clientes, proveedores, productos, pedidos, facturas y compras. He organizado el desarrollo en cuatro versiones para poder seguir cómo pasó de un motor inicial a una aplicación que consulta y modifica datos empresariales.

## a) Ventajas e inconvenientes de los conectores

Un conector permite que una aplicación utilice el motor sin tener que reescribirlo en cada lenguaje. En Python cargo `unicornbbdd.pyd` y llamo a sus funciones como si fueran parte de un módulo. En PHP uso una clase que llama a la DLL de C++ mediante FFI. Los dos trabajan con las mismas tablas y reglas.

La ventaja es que las aplicaciones pueden compartir el motor. El inconveniente es que hay que compilar los binarios para el entorno de Windows y configurar el lenguaje que los carga. PHP necesita FFI activado. Además, como el motor trabaja directamente con archivos, todavía no es adecuado para varios procesos que escriban al mismo tiempo.

## b) Gestores embebidos e independientes

UnicornBBDD funciona como gestor **embebido**: el código del motor se carga dentro del proceso de Python o PHP y accede a sus archivos de datos. Para comparar ese funcionamiento con un gestor **independiente**, he preparado un ejemplo que abre una conexión a MariaDB de XAMPP y consulta su catálogo. MariaDB funciona como un servidor separado y recibe las peticiones por una conexión.

La comparación se hace en `004-entrega-ra2/doc/php/004-comparar-gestores.php`. En UnicornBBDD ejecuta `SELECCIONAR CONTAR(*) COMO total_clientes DE clientes` y obtuvo **41 clientes**: los 40 iniciales y el que añadí después. Para MariaDB utiliza `mysqli` y consulta `information_schema.ENGINES`; obtuvo, entre otros, **InnoDB** y **MyISAM**. Lo ejecuté tanto desde el PHP de XAMPP como desde Apache, con MySQL iniciado. La consulta a MariaDB es de solo lectura y los datos del ERP permanecen en UnicornBBDD.

## c) Elección del conector

Para Python he elegido el módulo nativo `unicornbbdd.pyd`: se importa con `import unicornbbdd as bd`, permite llamar directamente a las operaciones del motor y devuelve listas y diccionarios fáciles de recorrer. Para PHP he utilizado la clase `UnicornBBDD`, que carga `unicornbbdd.dll` mediante FFI y devuelve arrays asociativos. XAMPP puede usar así la DLL sin crear una extensión PHP propia. El ejemplo de MariaDB usa `mysqli` para comunicarse con ese servidor.

## d) Establecimiento de la conexión

La configuración indica dónde se encuentran los archivos de las bases. En Python, el ejemplo llama a `bd.usar_base('Erin-erp')`; en PHP, a `$bd->usarBase('Erin-erp')`. Ambos comprueban el resultado antes de consultar. También instalé el módulo Python de la versión 003 en mi usuario de Windows y lo ejecuté desde `C:\Users\piero`: Python lo encontró en `site-packages`, abrió la base y la búsqueda por `piero7ov@gmail.com` recuperó a **Piero Olivares, ID 41**. Los ejemplos de la versión 004 cargan sus conectores locales, por lo que no requieren reinstalar ese módulo global.

## e) Estructura de la base de datos

He creado **diez tablas**. Todas tienen un `id` que identifica sus registros y un campo `activo` para la baja lógica:

| Tabla | Datos y relaciones principales |
| --- | --- |
| `empresas` | Nombre y CIF; es la entidad principal. |
| `clientes` | Nombre, correo y teléfono; `empresa_id` referencia a `empresas.id`. |
| `proveedores` | Nombre, correo y teléfono; `empresa_id` referencia a `empresas.id`. |
| `categorias` | Nombre; `empresa_id` referencia a `empresas.id`. |
| `productos` | Código, nombre, precio y existencias; referencia a empresa y categoría. |
| `pedidos` | Cliente, fecha, estado y total; `cliente_id` referencia a `clientes.id`. |
| `pedidos_lineas` | Producto, cantidad y precio; referencia a pedido y producto. |
| `facturas` | Número, fecha y total; referencia a empresa, cliente y pedido. |
| `compras` | Proveedor, fecha y total; referencia a empresa y proveedor. |
| `compras_lineas` | Producto, cantidad y precio; referencia a compra y producto. |

El motor comprueba que las claves foráneas apunten a registros existentes. También hay campos obligatorios y valores únicos, como los correos de clientes, los códigos de productos y los números de factura. Creé índices secundarios para búsquedas frecuentes, entre ellas `clientes.email`, `productos.codigo` y `pedidos.cliente_id`.

La carga inicial contiene **800 registros**: 1 empresa, 40 clientes, 15 proveedores, 10 categorías, 100 productos, 100 pedidos, 250 líneas de pedido, 74 facturas, 60 compras y 150 líneas de compra. Después añadí manualmente a Piero como cliente 41. Los demás nombres y correos son ficticios; los productos representan artículos y servicios habituales.

El tipo `DECIMAL` del motor utiliza punto flotante. Por eso estos importes sirven para el ejercicio, pero todavía no tienen la precisión necesaria para facturación real.

## f) Aplicaciones que modifican los datos

Los programas `004-entrega-ra2/doc/python/004-operaciones_erp.py` y `004-entrega-ra2/doc/php/004-operaciones_erp.php` crean un cliente de prueba, cambian su teléfono y dan de baja otro cliente. La baja es lógica: el registro permanece en el archivo con `activo=0`. También crean un pedido y una línea relacionada. Para repetir las operaciones sin alterar los datos de trabajo, cada ejecución usa una copia temporal de `Erin-erp` y la elimina al terminar.

## g) Objetos que guardan los resultados

En Python, `bd.consultar('SELECCIONAR id,nombre,email DE clientes LIMITE 3')` devuelve una **lista de diccionarios**: cada diccionario representa una fila y sus claves son los nombres de las columnas. En PHP, `$bd->consultar(...)` devuelve un **array de filas asociativas**. Así, las aplicaciones pueden acceder a un nombre o un identificador sin leer manualmente los archivos de datos.

## h) Aplicaciones que realizan consultas

He consultado clientes y productos, buscado un cliente por correo, unido clientes con pedidos mediante `JOIN` y obtenido un resumen con `CONTAR` y `SUMA`. Por ejemplo, los dos programas ejecutan:

```text
SELECCIONAR clientes.nombre,pedidos.total DE clientes JOIN pedidos EN clientes.id = pedidos.cliente_id LIMITE 3
SELECCIONAR CONTAR(*) COMO numero_pedidos,SUMA(total) COMO facturacion DE pedidos
```

La base original tenía **100 pedidos** antes de los ejemplos. El pedido adicional que crea cada programa solo existe en su copia temporal.

## i) Liberación de objetos

El conector PHP convierte cada resultado de la DLL y llama a `unicorn_liberar` para liberar la memoria nativa. Al destruir el objeto `UnicornBBDD`, llama a `unicorn_cerrar`. En el ejemplo de MariaDB, PHP libera el resultado con `free()` y cierra la conexión con `close()`. En Python se eliminan las referencias a los resultados que dejan de usarse. Ambos programas eliminan su copia temporal al finalizar.

## j) Gestión de transacciones

Para guardar un pedido, cada programa llama a `iniciar_transaccion()` o `iniciarTransaccion()`, inserta la cabecera y su línea y termina con `confirmar()`. Si algo falla entre esos pasos, llama a `deshacer()`. En otro caso inserta un cliente de prueba, deshace la transacción y consulta su correo: **no aparece ningún cliente**. Así se ve qué ocurre al confirmar o cancelar una operación formada por varios pasos.

Las transacciones de este motor se apoyan en una copia de los archivos. Todavía no proporcionan aislamiento seguro entre varios procesos, por lo que este comportamiento se presenta como parte del aprendizaje y no como una solución multiusuario.

## k) Procedimientos almacenados

Los ejemplos crean `pedidos_de_cliente_demo_python` y `pedidos_de_cliente_demo_php`, respectivamente. Cada procedimiento recibe el parámetro `cliente` y guarda este cuerpo: `SELECCIONAR id,total DE pedidos DONDE cliente_id = {cliente}`. Después se ejecuta con el identificador del cliente creado en la copia temporal y devuelve su pedido. El procedimiento queda almacenado en esa copia y desaparece cuando se elimina al finalizar.
