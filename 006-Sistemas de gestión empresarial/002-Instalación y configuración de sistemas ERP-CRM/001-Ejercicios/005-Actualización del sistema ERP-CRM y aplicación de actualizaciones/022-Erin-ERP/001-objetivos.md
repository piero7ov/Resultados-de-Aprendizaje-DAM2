# Objetivos de Erin-ERP

Erin-ERP es un sistema de gestión empresarial organizado en módulos.

## Tipo de sistema

Cubrir distintas necesidades de una empresa mediante un núcleo común y módulos especializados.

Gestionará las entidades de una empresa y sus relaciones mediante herramientas comunes y módulos. La gestión de clientes es el primer apartado del sistema; Erin-ERP contempla distintas áreas empresariales.

## Funciones previstas

- Núcleo común: operaciones CRUD (crear, leer, actualizar y eliminar), enrutador y modelo de datos compartido.
- Gestión de usuarios como función común del sistema.
- Módulos con una estructura estándar y jerárquica, preparados para activación y desactivación.
- Instalación y versionado del sistema y sus módulos.
- Motor de listados, formularios e informes.
- Gráficas y panel de control (dashboard).
- Monitorización de la salud del sistema.
- Importación y exportación de información.
- APIs de entrada y salida para conectar con otros sistemas.

## Estado actual

La interfaz incluye cabecera, menú lateral, contenido principal y pie. Los componentes se cargan mediante JavaScript y `fetch()`.

La API en PHP se conecta a SQLite. El menú obtiene automáticamente las tablas existentes y la interfaz puede representar la estructura y el contenido de cualquiera de ellas, incluso cuando todavía no contiene registros.

Un componente CRUD genérico permite listar, insertar, actualizar y eliminar registros de cualquier entidad. Los listados y formularios se generan automáticamente a partir de la estructura real de SQLite.

La interfaz humaniza los nombres técnicos de tablas y campos. El buscador de la cabecera se adapta a la entidad activa y filtra sus registros. Las relaciones se seleccionan mediante valores descriptivos, aunque SQLite conserva internamente sus identificadores.

También incorpora una verificación del entorno. Esta comprobación identifica el sistema operativo, el servidor, la versión de PHP y la disponibilidad de JSON, PDO y los controladores previstos para SQLite y MySQL.

Los resultados pueden descargarse en un informe Markdown. El informe incluye la fecha, la versión, las comprobaciones y las incidencias detectadas.

La estructura de persistencia se define en `instalacion/esquema.md`. Incluye Clientes, Productos, Pedidos, DetallesPedidos, Departamentos y Empleados. Además de las relaciones comerciales, cada empleado puede quedar relacionado con su departamento.

El instalador crea `data/erin.sqlite`, las tablas, sus identificadores automáticos y las claves foráneas. El migrador compara la base existente con el esquema, informa de las diferencias, crea una copia de seguridad y aplica los cambios confirmados por el usuario.

Las ampliaciones del esquema se aplican mediante el migrador. Las relaciones FK utilizan `datalist` para buscar registros por información comprensible y transformar la selección en su `Identificador`. Al abrir ERIN, la aplicación comprueba automáticamente si existe la base de datos: si falta, dirige al instalador; si existe, solicita iniciar sesión. El administrador inicial se crea durante la instalación; después puede gestionar usuarios, roles y permisos por módulo. Cada usuario puede editar su perfil. El migrador compara la versión instalada y el esquema disponible, muestra los cambios y crea una copia antes de aplicarlos. Los módulos funcionales específicos siguen en desarrollo.

## Diseño

Nombre: ERIN ERP. La identidad visual utiliza tonos crema, arena, salmón y terracota. Coolvetica se emplea como tipografía de identidad, con botones de acabado metálico, esquinas opuestas y un indicador propio para el apartado activo. La interfaz mantiene una estructura limpia, compacta y adaptable.
