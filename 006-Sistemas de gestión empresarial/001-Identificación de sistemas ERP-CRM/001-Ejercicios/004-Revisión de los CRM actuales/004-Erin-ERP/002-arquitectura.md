# Arquitectura de Erin-ERP

## Separación cliente y servidor

- Cliente: HTML para la estructura, CSS para el aspecto y JavaScript para cargar componentes.
- Servidor previsto: PHP como lenguaje inicial, con separación suficiente para poder reemplazarlo sin rehacer el frontal.
- Datos previstos: SQL para información relacional y tabular; NoSQL, con MongoDB como opción, para documentos.

Las tecnologías de servidor y datos todavía no están implementadas.

## Núcleo y módulos

El núcleo reúne las funciones comunes. Los módulos ampliarán el sistema con una organización estándar. La interfaz actual no implementa microservicios.

La carpeta modulos queda preparada para el desarrollo posterior. clientes.html se encuentra en nucleo/componentes. La gestión de usuarios, el modelo de datos común, los listados, la instalación y el versionado se diseñarán en pasos posteriores.

## Archivos actuales

- index.html: documento principal, cabecera, sección con menú y main, y pie.
- nucleo/componentes/cabecera.html: logo y nombre del producto.
- nucleo/componentes/menu.html: clientes y los apartados previstos del sistema.
- nucleo/componentes/clientes.html: tabla estática con datos de demostración.
- nucleo/componentes/piedepagina.html: pie del sistema, destinado más adelante a notificaciones.
- nucleo/js/incluir.js: cargarIncludes busca los atributos data-include, obtiene el archivo con fetch e inserta respuesta.text() mediante innerHTML.
- nucleo/estilo/general.css: diseño con Flexbox y colores de la interfaz.
- nucleo/imagenes/erin.png: logo de Erin-ERP.

## Organización de la interfaz

Las etiquetas estructurales se encuentran en index.html. Los componentes contienen únicamente el contenido de cada área para evitar duplicaciones. main carga clientes.html directamente.

El JavaScript se encuentra en incluir.js y el CSS en general.css. body organiza la pantalla en columna; section distribuye menú y contenido, con el pie fuera de esta sección. El padding del contenido se aplica a main. La cabecera alinea logo y título con display:flex y align-items:center.

La tabla utiliza border-collapse, espaciado en celdas, encabezados destacados y resaltado de filas al pasar el ratón. Las variables CSS centralizan los colores de la interfaz.

## Funciones disponibles y pendientes

Solo Clientes tiene contenido. Los demás apartados se muestran desactivados hasta desarrollar sus módulos. La búsqueda, información del usuario, cierre de sesión y notificaciones están previstos y todavía no están disponibles.

## Ejecución

Abrir index.html mediante un servidor HTTP local, por ejemplo Apache de XAMPP. No abrirlo mediante file://, porque los componentes se obtienen con fetch. Comprobar que cabecera, menú, tabla y pie cargan, y que el logo aparece.
