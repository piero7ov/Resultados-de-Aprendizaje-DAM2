# Changelog — ERIN ERP

Registro de cambios y evolución del proyecto ERIN ERP.

El proyecto se encuentra en una fase inicial de desarrollo y construcción de su arquitectura base.

---

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
