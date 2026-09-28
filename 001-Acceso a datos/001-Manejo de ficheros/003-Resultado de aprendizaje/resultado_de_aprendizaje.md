# Resultado de aprendizaje 1 — UNICORN

En UNICORN he creado una base de datos personalizada para gestionar una librería. El programa trabaja con clientes, libros, reservas y ventas mediante ficheros y clases de Python, sin utilizar SQLite ni otro servidor de bases de datos.

## a) Clases para gestionar ficheros y directorios

He dividido el programa en varias clases. `UnicornBBDD` organiza las bases y las tablas, mientras que `UnicornCopias` crea, comprueba y restaura las copias de seguridad. El instalador prepara las carpetas, la configuración y la base inicial.

Para trabajar con las rutas se utiliza `Path`. También se usan archivos y directorios temporales para evitar publicar operaciones incompletas.

## b) Formas de acceso a los ficheros

He utilizado acceso secuencial para recorrer los registros, acceso directo con `seek()` para llegar a una posición concreta e índices para localizar registros con mayor facilidad.

El acceso secuencial es sencillo, pero necesita recorrer el fichero. El acceso directo es más rápido para una posición conocida, aunque depende del tamaño fijo de los registros. Los índices ayudan en las búsquedas, pero también hay que mantenerlos y comprobarlos.

## c) Recuperación de información

UNICORN puede leer registros, generar listados y recuperar información relacionada. `UnicornRelaciones` permite obtener, por ejemplo, los pedidos de un cliente o las líneas que pertenecen a un pedido.

La consola muestra nombres de clientes y títulos de libros para que la información sea comprensible, aunque internamente las relaciones se guarden mediante identificadores.

## d) Almacenamiento de información

El programa permite crear y modificar clientes y libros, desactivarlos y volver a activarlos. También guarda pedidos, líneas, precios, estados y movimientos de existencias.

La información permanece almacenada al cerrar y volver a abrir la aplicación. `UnicornLibreria` aplica las reglas de reservas y ventas, mientras que el motor se encarga de leer y escribir los ficheros.

## e) Conversión entre formatos

`UnicornIntercambio` permite exportar la base completa a JSON o CSV e importar esos datos en una base nueva. Antes de aceptar una importación se comprueban los campos, los identificadores y las relaciones.

La importación no sobrescribe la base original y tampoco vuelve a ejecutar las ventas, por lo que no descuenta dos veces las existencias.

## f) Gestión de excepciones

He controlado datos inválidos, referencias que no existen, errores de permisos, rutas incorrectas, archivos incompletos y tamaños de registro incompatibles. Cuando una operación no es segura, el programa la detiene y muestra un mensaje comprensible.

Las operaciones que modifican varios ficheros guardan un estado anterior. Si una escritura se interrumpe, UNICORN intenta recuperar ese estado antes de permitir nuevos cambios. Las copias de seguridad también utilizan huellas SHA-256 para detectar archivos modificados.

## g) Pruebas y documentación

El proyecto tiene pruebas para el motor, las relaciones, la librería, la consola, el instalador, las importaciones y exportaciones y las copias de seguridad.

El 24 de septiembre de 2026 ejecuté la batería completa y se superaron correctamente 172 pruebas en 70,613 segundos. El proyecto también incluye un README, documentación para desarrolladores y un documento con el diseño de los datos y las relaciones.
