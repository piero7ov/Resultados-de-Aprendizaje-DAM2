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

La interfaz incluye cabecera, menú lateral, contenido principal, pie y una tabla con diez clientes de demostración. Los componentes se cargan mediante JavaScript y `fetch()`.

Existe una primera API en PHP. El menú y la tabla se generan dinámicamente con los datos JSON que devuelve la API, aunque esos datos todavía están escritos de forma estática en el servidor.

También incorpora una verificación del entorno. Esta comprobación identifica el sistema operativo, el servidor, la versión de PHP y la disponibilidad de JSON, PDO y los controladores previstos para SQLite y MySQL.

La conexión a una base de datos, el CRUD, la autenticación y los módulos funcionales quedan pendientes para versiones posteriores.

## Diseño

Nombre: ERIN ERP. La identidad visual utiliza tonos crema, arena, salmón y terracota. Coolvetica se emplea como tipografía de identidad, con botones de acabado metálico, esquinas opuestas y un indicador propio para el apartado activo. La interfaz mantiene una estructura limpia, compacta y adaptable.
