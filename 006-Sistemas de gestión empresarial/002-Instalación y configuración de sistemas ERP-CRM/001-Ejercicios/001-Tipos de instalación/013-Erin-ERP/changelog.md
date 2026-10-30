# Changelog — ERIN ERP

Registro de cambios y evolución del proyecto ERIN ERP.

El proyecto se encuentra en una fase inicial de desarrollo y construcción de su arquitectura base.

---

## [0.7] — 2026-09-25

### Ampliación del esquema

- Añadida la entidad `Departamentos` con nombre y descripción.
- Añadida la entidad `Empleados` con información personal y laboral básica.
- Relacionado cada empleado con `Departamentos.Identificador`.
- Incorporadas ambas tablas mediante `migrar.php`, sin reinstalar la base.
- Verificada la sincronización completa entre `esquema.md` y SQLite.
- Comprobadas la integridad de la base y las claves foráneas sin incidencias.

### API conectada a SQLite

- Sustituido el menú estático por una consulta a las tablas reales de `data/erin.sqlite`.
- Excluidas las tablas internas de SQLite.
- Actualizado el endpoint `tabla` para consultar cualquier tabla válida.
- Añadida la devolución de la estructura mediante `PRAGMA table_info`.
- Añadida la devolución de los registros reales almacenados en SQLite.
- Eliminados de la API los clientes estáticos de demostración.

### Menú y tablas dinámicas

- Creado automáticamente un apartado del menú por cada tabla de SQLite.
- Añadida la carga de la tabla seleccionada sin abandonar la pantalla principal.
- Construidas las cabeceras a partir de la estructura real de la tabla.
- Permitida la visualización de columnas aunque la tabla no contenga registros.
- Añadido el recuento de registros y el marcado visual del apartado activo.
- Cargada automáticamente la primera tabla disponible al abrir ERIN.
- Mantenido temporalmente `DetallesPedidos` como apartado visible, aunque su finalidad será auxiliar a la gestión de pedidos.

### Verificación del entorno

- Corregida la carga automática del menú para que no sustituya la pantalla de verificación.
- Limitada la apertura automática de la primera tabla a la pantalla principal.
- Conservada provisionalmente la verificación como pantalla visible hasta su futura integración interna.

### Estado de la base

- Base migrada con Clientes, Departamentos, DetallesPedidos, Empleados, Pedidos y Productos.
- Todas las tablas permanecen preparadas para recibir sus primeros registros.

### Evolución de la arquitectura

- Establecido el flujo dinámico `esquema.md → SQLite → api.php → menu.html → interfaz`.
- El CRUD permanece pendiente para la siguiente fase.

## [0.6] — 2026-09-25

### Esquema inicial de ERIN

- Creado `instalacion/esquema.md` como fuente de verdad de la estructura SQLite.
- Definidas las entidades Clientes, Productos, Pedidos y DetallesPedidos.
- Añadidas las relaciones de Pedidos con Clientes y de DetallesPedidos con Pedidos y Productos.
- Indicados los tipos `INTEGER` y `REAL` en los campos que no deben utilizar el tipo `TEXT` predeterminado.

### Instalación de SQLite

- Creado `instalacion/instalar.php`.
- Añadida la lectura y validación de tablas, campos, tipos y claves foráneas desde `esquema.md`.
- Incorporada la creación automática de `Identificador` como `INTEGER PRIMARY KEY AUTOINCREMENT`.
- Preparada la creación de `data/erin.sqlite` y de todas las tablas definidas en el esquema.
- Impedido que el instalador sobrescriba una base existente.
- Añadido un informe visual con las tablas, campos, tipos y relaciones creadas.

### Migraciones

- Creado `instalacion/migrar.php`.
- Incorporada la comparación entre `esquema.md` y la estructura real de SQLite.
- Detectadas tablas y campos nuevos, modificados o eliminados.
- Clasificados los cambios como seguros o destructivos.
- Añadida una confirmación expresa antes de ejecutar operaciones destructivas.
- Incorporada una copia de seguridad automática previa a cada migración.
- Preparada la reconstrucción de tablas conservando los campos compatibles.
- Añadidas la comprobación final del esquema y la validación de claves foráneas.

### Estado de la persistencia

- El sistema de instalación y migración está preparado y verificado mediante pruebas aisladas.
- La base real se creará al ejecutar el instalador desde XAMPP.
- La API continúa usando datos estáticos y su conexión con SQLite queda pendiente.

## [0.5] — 2026-09-25

### Informe de verificación

- Añadida la descarga de un informe técnico en formato Markdown.
- Incluidos en el informe la fecha, la versión y el estado general del entorno.
- Documentados los resultados de cada comprobación.
- Preparado el informe para recoger como incidencias los requisitos no superados.
- Conservada la verificación sin crear ni modificar bases de datos.

## [0.4] — 2026-09-25

### Verificación del entorno

- Añadida una pantalla independiente para revisar la configuración del servidor.
- Incorporada la detección del sistema operativo, servidor web y versión de PHP.
- Comprobada la disponibilidad de JSON, PDO y los controladores para SQLite y MySQL.
- Añadido un acceso a la verificación desde el pie de la aplicación.
- Aclarado que esta versión no crea ni modifica ninguna base de datos.

## [0.3] — 2026-09-24

### Entrega del RA1

- Preparada la carpeta final `010-RA1-crimson-erinERP`.
- Añadido `resultado_de_aprendizaje.md` con la respuesta a los criterios a–h.
- Actualizados los objetivos y la arquitectura para reflejar el estado real del proyecto.
- Verificados Apache, PHP, las respuestas JSON de la API y los módulos disponibles para SQLite y MySQL.

## [0.2] — 2026-09-24

### Documentación

- Añadido el archivo `changelog.md` para registrar la evolución del proyecto.
- Documentado el estado funcional, visual y técnico alcanzado.

## [0.1] — 2026-09-24

### Estado inicial

Primera versión funcional de ERIN ERP. Esta versión establece la estructura sobre la que se desarrollarán los módulos y las funciones del sistema.

### Arquitectura

- Creada la estructura inicial del proyecto con las carpetas `api`, `modulos` y `nucleo`.
- Separados los componentes HTML, los estilos CSS y el código JavaScript.
- Preparada la carpeta `modulos` para futuras ampliaciones.

### Interfaz

- Creada la estructura principal con cabecera, menú lateral, área de trabajo y pie de página.
- Definidas alturas fijas para la cabecera y el pie, con una zona central adaptable.
- Aplicada la identidad visual de ERIN mediante la paleta crema, arena, salmón y terracota.
- Incorporada la tipografía Coolvetica para los elementos de identidad.
- Añadidos botones metálicos, esquinas opuestas y un indicador para el apartado activo.
- Mantenida la adaptación de la interfaz para pantallas pequeñas.

### Componentes

- Implementados `cabecera.html`, `menu.html`, `clientes.html` y `piedepagina.html`.
- Creado `incluir.js` para cargar los componentes mediante `data-include` y `fetch()`.
- Añadida la ejecución de los scripts incluidos dentro de los componentes.
- Mantenida la gestión básica de errores durante la carga.

### API y datos

- Creada la API inicial en `api/api.php`.
- Implementados los bloques `menu` y `tabla`.
- Generado dinámicamente el menú a partir de la respuesta de la API.
- Generada dinámicamente la tabla utilizando las claves y los valores de los clientes recibidos.
- Incluidos diez clientes de demostración con sus datos de contacto.

### Persistencia

- Todavía no existe una base de datos persistente.
- Los datos actuales son estáticos y se proporcionan desde la API.
- La incorporación de SQLite y la futura migración a MySQL quedan pendientes.

### Estado de la versión

- Versión: `0.1`.
- Fase: prototipo funcional y arquitectura inicial.
