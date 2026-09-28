# Arquitectura de ERIN ERP

## Separación entre cliente y servidor

- Cliente: HTML para la estructura, CSS para el aspecto y JavaScript para cargar componentes y representar los datos.
- Servidor: primera API desarrollada en PHP.
- Comunicación: peticiones `fetch()` y respuestas JSON.
- Datos actuales: información estática de demostración proporcionada por la API.
- Persistencia prevista: SQLite durante el desarrollo y MySQL cuando el sistema alcance mayor madurez.

La separación permite modificar el almacenamiento o el servidor sin rehacer toda la interfaz.

## Núcleo y módulos

El núcleo reúne las funciones comunes y los componentes reutilizables. La carpeta `modulos` queda preparada para ampliar el sistema con nuevas áreas de gestión.

En la versión actual solo Clientes dispone de contenido. Productos, Pedidos, Almacén, Transporte y Empleados aparecen en el menú, pero todavía no tienen un módulo funcional.

## Archivos principales

- `index.html`: estructura general con cabecera, navegación, área de trabajo y pie.
- `api/api.php`: devuelve los bloques JSON `menu` y `tabla`.
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

## Estado funcional

La versión actual permite comprobar la arquitectura cliente-servidor y la generación dinámica de la interfaz. La búsqueda, las herramientas, las opciones de usuario, la autenticación, el CRUD y la persistencia en una base de datos todavía no están implementados.

## Ejecución

La aplicación debe abrirse mediante un servidor HTTP con soporte para PHP, como Apache de XAMPP. No debe abrirse mediante `file://`, porque los componentes y los datos se obtienen con `fetch()`.
