# Arquitectura de ERIN ERP

## Separación entre cliente y servidor

- Cliente: HTML para la estructura, CSS para el aspecto y JavaScript para cargar componentes y representar los datos.
- Servidor: primera API desarrollada en PHP.
- Comunicación: peticiones `fetch()` y respuestas JSON.
- Datos actuales: información estática de demostración proporcionada por la API.
- Persistencia: esquema e instalación inicial preparados para SQLite. MySQL se mantiene como posibilidad futura cuando el sistema alcance mayor madurez.

La separación permite modificar el almacenamiento o el servidor sin rehacer toda la interfaz.

## Núcleo y módulos

El núcleo reúne las funciones comunes y los componentes reutilizables. La carpeta `modulos` queda preparada para ampliar el sistema con nuevas áreas de gestión.

En la versión actual solo Clientes dispone de contenido. Productos, Pedidos, Almacén, Transporte y Empleados aparecen en el menú, pero todavía no tienen un módulo funcional.

## Archivos principales

- `index.html`: estructura general con cabecera, navegación, área de trabajo y pie.
- `api/api.php`: devuelve los bloques JSON `menu` y `tabla`.
- `verificacion.html`: muestra el estado del entorno en una pantalla independiente.
- `api/comprobar_entorno.php`: reúne las comprobaciones técnicas del servidor.
- `api/verificacion.php`: devuelve los resultados de la comprobación en formato JSON.
- `api/informe_verificacion.php`: genera y descarga un informe Markdown con los resultados actuales.
- `instalacion/esquema.md`: define las tablas, los campos, los tipos y las relaciones iniciales de ERIN.
- `instalacion/instalar.php`: valida el esquema y crea la base `data/erin.sqlite` desde cero.
- `instalacion/migrar.php`: compara el esquema con SQLite y aplica los cambios después de informar al usuario.
- `nucleo/componentes/cabecera.html`: identidad de ERIN, buscador, herramientas y zona de usuario.
- `nucleo/componentes/menu.html`: solicita las áreas a la API y crea sus enlaces.
- `nucleo/componentes/clientes.html`: solicita los clientes y construye la tabla dinámicamente.
- `nucleo/componentes/piedepagina.html`: información general y estado del sistema.
- `nucleo/js/incluir.js`: carga los componentes y ejecuta sus scripts incluidos.
- `nucleo/estilo/general.css`: distribución mediante Flexbox e identidad visual de ERIN.
- `nucleo/fuentes/Coolvetica-Rg.otf`: tipografía de identidad utilizada localmente.

## Carga y representación

Los atributos `data-include` indican qué componente debe cargarse en cada zona. `incluir.js` obtiene el archivo con `fetch()`, inserta su contenido y recrea los elementos `script` para que se ejecuten.

El menú consulta `api/api.php?bloque=menu`. La tabla consulta `api/api.php?bloque=tabla` y genera sus columnas y filas a partir de las claves y valores recibidos.

## Esquema y persistencia

`esquema.md` es la fuente de verdad de la estructura SQLite. El esquema inicial contiene:

- `Clientes`.
- `Productos`.
- `Pedidos`, relacionado con `Clientes`.
- `DetallesPedidos`, relacionado con `Pedidos` y `Productos`.

Los campos sin tipo explícito se crean como `TEXT`. También se utilizan `INTEGER` y `REAL`, mientras que las relaciones se indican mediante `FK`. Cada tabla recibe automáticamente un campo `Identificador` definido como `INTEGER PRIMARY KEY AUTOINCREMENT`.

`instalar.php` crea la carpeta `data`, la base `erin.sqlite` y todas las tablas. La instalación no sobrescribe una base existente.

`migrar.php` inspecciona la estructura real de SQLite y la compara con `esquema.md`. Antes de ejecutar una migración muestra las operaciones pendientes. Los cambios destructivos requieren confirmación y toda migración crea primero una copia de seguridad. Las reconstrucciones conservan los campos compatibles y se comprueba finalmente la integridad de las claves foráneas.

## Estado funcional

La versión actual permite comprobar la arquitectura cliente-servidor, la generación dinámica de la interfaz, la compatibilidad del entorno y el proceso de instalación y migración de SQLite. La búsqueda, las herramientas, las opciones de usuario, la autenticación y el CRUD todavía no están implementados.

La base SQLite se crea únicamente cuando el usuario ejecuta `instalar.php`. La API todavía no consulta esa base y continúa devolviendo los clientes estáticos de demostración.

El informe utiliza las mismas comprobaciones que la pantalla, por lo que ambos resultados permanecen coordinados. Los elementos pendientes se incluyen como incidencias técnicas.

## Ejecución

La aplicación debe abrirse mediante un servidor HTTP con soporte para PHP, como Apache de XAMPP. No debe abrirse mediante `file://`, porque los componentes y los datos se obtienen con `fetch()`.

Para iniciar la persistencia se debe abrir primero `instalacion/instalar.php`. Las modificaciones posteriores de `esquema.md` se aplican desde `instalacion/migrar.php`.
