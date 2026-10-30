# Arquitectura de ERIN ERP

## Separación entre cliente y servidor

- Cliente: HTML para la estructura, CSS para el aspecto y JavaScript para cargar componentes y representar los datos.
- Servidor: primera API desarrollada en PHP.
- Comunicación: peticiones `fetch()` y respuestas JSON.
- Datos actuales: estructura y registros reales obtenidos desde SQLite.
- Persistencia: esquema e instalación inicial preparados para SQLite. MySQL se mantiene como posibilidad futura cuando el sistema alcance mayor madurez.

La separación permite modificar el almacenamiento o el servidor sin rehacer toda la interfaz.

## Núcleo y módulos

El núcleo reúne las funciones comunes y los componentes reutilizables. La carpeta `modulos` queda preparada para ampliar el sistema con nuevas áreas de gestión.

En la versión actual el menú representa automáticamente las tablas de SQLite y las entrega a un componente CRUD común. Las entidades no necesitan formularios ni listados específicos.

## Archivos principales

- `index.html`: estructura general con cabecera, navegación, área de trabajo y pie.
- `api/api.php`: consulta SQLite y proporciona las operaciones genéricas del menú y del CRUD.
- `verificacion.html`: muestra el estado del entorno en una pantalla independiente.
- `api/comprobar_entorno.php`: reúne las comprobaciones técnicas del servidor.
- `api/verificacion.php`: devuelve los resultados de la comprobación en formato JSON.
- `api/informe_verificacion.php`: genera y descarga un informe Markdown con los resultados actuales.
- `instalacion/esquema.md`: define las tablas, los campos, los tipos y las relaciones iniciales de ERIN.
- `instalacion/instalar.php`: valida el esquema y crea la base `data/erin.sqlite` desde cero.
- `instalacion/migrar.php`: compara el esquema con SQLite y aplica los cambios después de informar al usuario.
- `nucleo/componentes/cabecera.html`: identidad de ERIN, buscador, herramientas y zona de usuario.
- `nucleo/componentes/crud.html`: construye los listados y formularios y gestiona las cuatro operaciones CRUD.
- `nucleo/componentes/menu.html`: crea un enlace por cada tabla y solicita al componente CRUD la entidad seleccionada.
- `nucleo/componentes/clientes.html`: componente anterior conservado como referencia, pero ya no se carga desde `index.html`.
- `nucleo/componentes/piedepagina.html`: información general y estado del sistema.
- `nucleo/js/incluir.js`: carga los componentes y ejecuta sus scripts incluidos.
- `nucleo/estilo/general.css`: distribución mediante Flexbox e identidad visual de ERIN.
- `nucleo/fuentes/Coolvetica-Rg.otf`: tipografía de identidad utilizada localmente.

## Carga y representación

Los atributos `data-include` indican qué componente debe cargarse en cada zona. `incluir.js` obtiene el archivo con `fetch()`, inserta su contenido y recrea los elementos `script` para que se ejecuten. El componente CRUD se carga antes que el menú para que sus funciones estén disponibles durante la navegación.

El menú consulta `api/api.php?bloque=menu`. Este endpoint obtiene de `sqlite_master` las tablas existentes y excluye las tablas internas de SQLite.

Al seleccionar un apartado, el menú llama al CRUD con el nombre de la tabla. El componente consulta `api/api.php?bloque=tabla&tabla=Nombre`, construye las columnas y ofrece las acciones disponibles.

## Componente CRUD

`crud.html` mantiene separadas la navegación y la gestión de registros. Su cabecera muestra la entidad activa y un contexto comprensible: `Listado de registros`, `Nuevo registro` o `Editar registro`.

La API incorpora operaciones para obtener un registro por `Identificador`, insertar, actualizar y eliminar. Antes de construir cada consulta se valida que la tabla exista y solo se utilizan campos obtenidos mediante `PRAGMA table_info`.

Los formularios se crean a partir de los tipos SQLite. `Identificador` no aparece como campo editable porque SQLite lo gestiona automáticamente. En esta versión las claves foráneas se introducen mediante su identificador numérico; su representación mediante valores descriptivos se reserva para `015`.

## Esquema y persistencia

`esquema.md` es la fuente de verdad de la estructura SQLite. El esquema inicial contiene:

- `Clientes`.
- `Productos`.
- `Pedidos`, relacionado con `Clientes`.
- `DetallesPedidos`, relacionado con `Pedidos` y `Productos`.
- `Departamentos`.
- `Empleados`, relacionado con `Departamentos`.

Los campos sin tipo explícito se crean como `TEXT`. También se utilizan `INTEGER` y `REAL`, mientras que las relaciones se indican mediante `FK`. Cada tabla recibe automáticamente un campo `Identificador` definido como `INTEGER PRIMARY KEY AUTOINCREMENT`.

`instalar.php` crea la carpeta `data`, la base `erin.sqlite` y todas las tablas. La instalación no sobrescribe una base existente.

`migrar.php` inspecciona la estructura real de SQLite y la compara con `esquema.md`. Antes de ejecutar una migración muestra las operaciones pendientes. Los cambios destructivos requieren confirmación y toda migración crea primero una copia de seguridad. Las reconstrucciones conservan los campos compatibles y se comprueba finalmente la integridad de las claves foráneas.

## Estado funcional

La versión actual permite comprobar la arquitectura cliente-servidor, la navegación generada desde SQLite, las cuatro operaciones CRUD, la compatibilidad del entorno y el proceso de instalación y migración. La búsqueda, las herramientas, las opciones de usuario y la autenticación todavía no están implementadas.

La base SQLite se crea inicialmente con `instalar.php` y evoluciona con `migrar.php`. La API utiliza esa misma base como origen del menú, las columnas y los registros mostrados.

El informe utiliza las mismas comprobaciones que la pantalla, por lo que ambos resultados permanecen coordinados. Los elementos pendientes se incluyen como incidencias técnicas.

## Ejecución

La aplicación debe abrirse mediante un servidor HTTP con soporte para PHP, como Apache de XAMPP. No debe abrirse mediante `file://`, porque los componentes y los datos se obtienen con `fetch()`.

Para iniciar la persistencia se debe abrir primero `instalacion/instalar.php`. Las modificaciones posteriores de `esquema.md` se aplican desde `instalacion/migrar.php`.
