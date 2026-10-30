# Changelog — ERIN ERP

## [0.21] — 2026-10-13

### Versión 026 · Inicio de la migración completa a UnicornBBDD

- Creada la versión 026 a partir de `025-Erin-ERP`, conservando debajo todo su historial de cambios.
- Eliminada de la copia la base instalada `data/erin.sqlite` para comenzar la integración desde un entorno limpio.
- Incorporados el conector PHP ampliado y la DLL de UnicornBBDD dentro de `nucleo/datos/unicornbbdd`.
- Creada `nucleo/datos/ErinDatos.php` como única capa de persistencia para el instalador, la API, la autenticación, los usuarios, el CRUD y las migraciones.
- Preparado el runtime en `.runtime/erin-erp-026`, una ruta ASCII compatible con la DLL en Windows y excluida de Git.
- Establecido `instalacion/diagrama.json` como modelo declarativo previsto para crear las tablas, sus tipos y sus relaciones.
- Desactivado temporalmente el instalador SQLite heredado para impedir la ejecución de `esquema.sql` y la recreación de `erin.sqlite`.
- Definido que el CRUD utilizará las operaciones y sentencias de UnicornBBDD sin inspeccionar directamente sus archivos internos.
- Documentada la arquitectura y el estado de la migración en `003-arquitectura-unicorn.md`.

## [0.20] — 2026-10-13

### Versión 025 · Integración de la API de entrada y salida

- Creada la API externa de ERIN en `io/es.php` para intercambiar información mediante JSON.
- Incorporadas las operaciones `selectone`, `selectmany`, `insertone` e `insertmany` sobre las tablas de negocio.
- Añadida autenticación mediante `X-API-Key` y `Authorization: Bearer`, con la clave privada guardada fuera del código versionado.
- Aplicadas validaciones de método HTTP, `Content-Type`, tamaño de petición, tablas disponibles, campos e identificadores.
- Excluidas las tablas internas, las tablas `erin_*` y los usuarios para evitar exponer información de acceso.
- Añadidas inserciones múltiples dentro de una transacción para deshacer el conjunto completo si falla algún registro.
- Documentado el uso de la API, sus respuestas y ejemplos con PowerShell y `curl` en `io/README.md`.
- Utilizada esta versión como punto de partida para la posterior versión 026 basada en UnicornBBDD.

## [0.19] — 2026-10-05

### Versión 024 · Ajustes de interfaz

- Unificados «Mi perfil» y «Usuarios» en `usuarios.php`: cada cuenta edita sus propios datos; el administrador gestiona también el resto de cuentas.
- Conservado `perfil.php` como redirección a la pantalla unificada.
- Sustituido «Salir» por el icono PNG transparente facilitado para cerrar sesión.
- Retirado «Ver listado» de la propia pantalla de listado; «Volver al listado» permanece en los formularios.
- Movido el acceso a «Actualizaciones» de la cabecera a «Opciones», conservando la revisión y migración para administradores.
- Sustituido el texto fijo del pie por el nombre y rol del usuario de la sesión.
- Rediseñado el formulario de instalación del administrador con campos agrupados, resumen del modelo y opción de datos ficticios diferenciada.
- Mantenida sin cambios la organización general de la cabecera hasta acordar su nueva disposición.
- Igualado el logotipo de Configuración y Modelo de datos con la «I» acentuada de la página principal.
- Centrado el texto y equilibrado la altura de los botones Usuarios, Modelo de datos y Opciones de la cabecera.

## [0.18] — 2026-10-05

### Versión 023 para pruebas desde cero

- Copiada la versión 022 sin su base SQLite instalada, sus usuarios ni sus datos.
- Conservado el modelo pequeño de 12 entidades y sus claves foráneas para poder instalar y empezar a insertar registros.
- Eliminados los módulos preconfigurados. Cambiar de preset ya no crea módulos automáticamente ni sustituye los que se creen a mano.
- Añadida una indicación de inicio cuando no hay módulos y un acceso directo a «Opciones» para crear el primero.
- Ocultadas las tablas internas `erin_*` de la asignación de módulos.
- Comprobado que el CRUD genérico heredado utiliza `input` con `datalist` para las FK y muestra descripciones de registros relacionados en los listados.

## [0.17] — 2026-10-05

### Cierre de instalación, acceso y actualización

- Añadida la página «Mi perfil» para que cada usuario cambie su nombre, usuario, correo y contraseña; el cambio de contraseña exige la actual.
- Incorporados «Seleccionar todo» y «No seleccionar nada» a cada fila de permisos. Los permisos de escritura solo se guardan cuando «Ver» está marcado.
- Movida la acción de inserción a un botón flotante con signo más; sigue visible y deshabilitada cuando falta permiso.
- Ajustada la cabecera para mantener la información y los accesos del usuario a la derecha.
- Permitida la descripción de claves foráneas de una tabla visible aunque la tabla relacionada no figure en otro módulo permitido.
- Añadido desplazamiento con el botón central y zoom con la rueda en el diseñador.
- Registrada la versión de instalación en SQLite. El migrador compara versiones y esquema, presenta los cambios, crea una copia y comprueba la integridad antes de completar la actualización.

## [0.16] — 2026-10-05

### Cuentas y permisos

- Rediseñada la gestión de usuarios con la cabecera y barra lateral de ERIN, formulario de datos y selector de rol.
- Separada la elección de módulos visibles de los permisos para insertar, actualizar y eliminar; las acciones requieren que el módulo sea visible.

- Creada la versión 022 a partir de 021 sin copiar la base instalada.
- El instalador solicita los datos del administrador y guarda la contraseña con hash.
- Añadidos inicio y cierre de sesión, gestión de usuarios estándar y asignación independiente de lectura, inserción, actualización y eliminación por módulo.
- La API comprueba los permisos en el servidor; la interfaz deshabilita las acciones no autorizadas.
- La configuración de módulos y el diseñador quedan reservados al administrador.
- Las cuentas y permisos se almacenan en tablas internas separadas del modelo de negocio.

Registro de cambios y evolución del proyecto ERIN ERP.

El proyecto se encuentra en una fase inicial de desarrollo y construcción de su arquitectura base.

---

## [0.15] — 2026-10-05

### Parámetros de configuración y modelos de instalación

- Creada la versión 021 desde 020 sin copiar su base instalada, para recorrer el instalador desde el principio.
- Conectado «Opciones» a una pantalla para crear y eliminar módulos, activar o desactivar cada uno y asignarle tablas SQLite.
- Adaptada la navegación para ocultar los módulos inactivos, manteniendo las configuraciones en `carpetas.json`.
- Añadidos los tres puntos de partida del instalador: diagrama vacío, empresa pequeña y ERP completo.
- Aclarada la selección del instalador: permanece en la misma página, marca el modelo activo y presenta el diseño opcional y la creación de la base como pasos separados.
- Preparado el modelo pequeño de los apuntes con 12 entidades, 18 relaciones FK, cinco módulos y 77 registros ficticios de Brumalia Talleres.
- Conservado el preset completo con 80 entidades, 98 relaciones y los 2.351 registros de muestra existentes.
- Incorporados zoom, arrastre del lienzo, vista panorámica y minimapa al diseñador visual.
- Probadas instalaciones independientes de ambos presets y las operaciones de configuración de módulos.

## [0.14] — 2026-10-05

### Diseñador visual del modelo de datos

- Creada la versión 020 a partir de 019 con su base SQLite y los datos de demostración.
- Incorporado un diseñador de entidades, campos y relaciones FK inspirado en Jocarsa Diagrama y adaptado al estilo y a los nombres de ERIN.
- Inicializado el diagrama con las 80 tablas y 98 relaciones del esquema existente.
- Añadidas opciones para crear, editar, mover, buscar, vaciar y redistribuir entidades, guardar el modelo y exportar SQL.
- El instalador lee ahora `esquema.sql` generado por el diagrama; conserva la instalación con o sin datos de muestra y permite crear otra base SQLite independiente.
- El migrador compara `esquema.sql` con la base instalada y mantiene la revisión, la copia de seguridad y la confirmación de cambios destructivos.
- Añadido el acceso «Modelo de datos» junto a «Opciones» en la cabecera.

## [0.13] — 2026-10-05

### Tablas asignadas a módulos

- Creada la versión 019 como copia de 018, conservando su base instalada y los 2.351 registros de demostración.
- Configurados 17 módulos mediante un `carpetas.json` en cada carpeta: los cinco existentes y doce áreas nuevas.
- Asignadas las 80 tablas existentes al menos a un módulo; las entidades compartidas pueden aparecer en varios.
- Adaptada la API para leer cada JSON, comprobar el nombre del módulo y mostrar solo las tablas que también existen en SQLite.
- Actualizada la segunda columna al elegir un módulo de la primera, manteniendo el CRUD en el área principal.
- Conservada la selección de una tabla al abrir un enlace directo cuando pertenece a alguno de los módulos.
- El módulo `auditoria` queda preparado sin tablas porque el esquema actual no incluye un registro de auditoría.

## [0.12] — 2026-10-05

### Modelo ERP y datos de demostración

- Ampliado `esquema.md` a 80 tablas de gestión comercial, compras, almacén, logística, contabilidad, personal, proyectos, soporte, divisas, permisos y fabricación.
- Añadidos `esquema.sql` y `datos-demostracion.sql` como los dos archivos SQL de instalación.
- Preparados 2.351 registros ficticios con nombres, empresas y productos inventados para el proyecto de clase.
- Adaptado el instalador para crear el esquema con o sin datos de muestra y para importarlos después si todas las tablas están vacías.
- Retiradas de esta versión la base SQLite copiada y su respaldo para iniciar una instalación nueva; la versión 017 conserva sus datos.
- Comprobadas las 80 tablas, la carga de datos, la integridad SQLite y las claves foráneas en una base de prueba.

## [0.11] — 2026-10-05

### Navegación por módulos

- Añadido el bloque `modulos` a la API para leer las subcarpetas de `modulos` al cargar la aplicación.
- Separadas la columna de módulos y la columna de tablas, manteniendo el CRUD en el área principal.
- Incorporado el componente `modulos.html` y adaptado `menu.html` para seleccionar su propia columna.
- Ajustada la carga de componentes para evitar que el navegador reutilice una versión anterior del menú.
- Las tablas todavía se muestran en todos los módulos; su asignación específica queda para una versión posterior.

## [0.10] — 2026-09-26

### Detección de instalación

- Añadido el estado de instalación a la API sin requerir una conexión previa con SQLite.
- Comprobada la existencia de la base de datos antes de cargar los componentes de ERIN.
- Incorporada la redirección automática al instalador cuando falta `data/erin.sqlite`.

### Instalador

- Mostrado `esquema.md` en un editor para revisarlo antes de la instalación.
- Validado el esquema antes de guardar su contenido y crear la base de datos.
- Ejecutada la instalación únicamente después de la confirmación del usuario.
- Impedida la sobrescritura de una base de datos existente.
- Recuperado el contenido anterior de `esquema.md` cuando la instalación no puede completarse.

### Documentación y verificación

- Actualizados los objetivos, la arquitectura y la información de versión de la comprobación del entorno.
- Retirado el componente antiguo de clientes, sustituido desde versiones anteriores por el CRUD genérico.

## [0.9] — 2026-09-25

### Cabecera y búsqueda

- Conservado el buscador de la cabecera con un contexto adaptado a la entidad activa.
- Sustituido `Buscar clientes…` por mensajes como `Buscar en Pedidos…` o `Buscar en Empleados…`.
- Añadido filtrado inmediato sobre los registros visibles.
- Desactivado el buscador durante las operaciones de inserción y actualización.
- Eliminados los botones superiores `Nuevo` y `Actualizar`, ya cubiertos por el componente CRUD.

### Humanización de la interfaz

- Convertidos los nombres técnicos de tablas y campos en textos comprensibles.
- Mostrado `DetallesPedidos` como `Detalles de pedidos`.
- Transformados campos como `fecha_nacimiento` y `precio_unitario` en etiquetas legibles.
- Adaptadas las acciones a cada entidad, por ejemplo `Añadir cliente` o `Editar empleado`.
- Mejorados los recuentos para utilizar el singular y el plural adecuados.

### Relaciones mediante datalist

- Detectadas las claves foráneas mediante `PRAGMA foreign_key_list`.
- Incorporados metadatos de relación a la estructura devuelta por la API.
- Añadido el endpoint genérico `opciones` para obtener registros relacionados.
- Construidas descripciones con información significativa y el identificador del registro.
- Representadas las FK mediante `input` con `datalist`.
- Permitida la búsqueda de clientes por nombre, apellidos, correo o identificador.
- Transformada la opción descriptiva en su identificador antes de guardar.
- Recuperada la descripción correspondiente al editar o listar una relación.
- Impedido el envío de valores relacionados que no existan en la lista.

### Operaciones CRUD

- Mantenidas las operaciones de listado, inserción, actualización y eliminación.
- Bloqueado el botón de guardado durante cada petición para evitar envíos repetidos.
- Mejorados los textos de acciones, confirmaciones y estados.
- Añadidos mensajes comprensibles para errores de integridad referencial.
- Conservados los datos relacionados al utilizar el CRUD genérico.

### Verificación

- Comprobados la detección de relaciones, los textos descriptivos y el bloqueo de eliminaciones relacionadas sobre una copia temporal.
- Verificadas las sintaxis PHP y JavaScript.
- Confirmada la integridad de la base real sin modificar sus registros existentes.
- Reservados para `016` la detección automática de instalación y el editor de `esquema.md`.

## [0.8] — 2026-09-25

### Componente CRUD genérico

- Creado `nucleo/componentes/crud.html` para gestionar cualquier entidad de SQLite.
- Separadas las responsabilidades del menú y de la gestión de registros.
- Cargado el componente CRUD antes que el menú para asegurar la disponibilidad de sus funciones.
- Reservada el área principal para los listados y formularios generados dinámicamente.
- Eliminada la dependencia de `clientes.html` en `index.html`.

### Contexto y navegación

- Mantenida la identidad visual de ERIN en cabeceras, botones, formularios y mensajes.
- Mostrada la entidad activa junto con `Listado de registros`, `Nuevo registro` o `Editar registro`.
- Sustituidas las acciones técnicas `Seleccionar` e `Insertar` por `Ver listado` y `Añadir registro`.
- Añadidas las acciones `Editar` y `Eliminar` en cada fila.
- Conservada la navegación desde la pantalla de verificación hacia la entidad seleccionada.

### API CRUD

- Añadida la consulta de un registro mediante `Identificador`.
- Añadidas operaciones genéricas de inserción, actualización y eliminación.
- Utilizada la estructura real de SQLite para determinar los campos editables.
- Validada la existencia de tablas, campos e identificadores antes de ejecutar las consultas.
- Conservada la activación de claves foráneas en todas las operaciones.
- Añadidas respuestas JSON y mensajes de error para cada operación.

### Formularios dinámicos

- Generados los formularios desde las columnas reales de cada tabla.
- Excluido `Identificador` de los campos editables.
- Adaptados los controles básicos a campos de texto, fechas, números y correo electrónico.
- Añadida una distribución adaptable que mantiene la paleta, tipografía y controles de ERIN.
- Mantenidas temporalmente las claves foráneas como identificadores numéricos.

### Verificación

- Comprobadas inserción, lectura, actualización y eliminación sobre una copia temporal de SQLite.
- Confirmado que las pruebas no modifican los registros de la base real.
- Reservadas para `015` la selección descriptiva de relaciones mediante `datalist` y nuevas mejoras de las operaciones CRUD.

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
