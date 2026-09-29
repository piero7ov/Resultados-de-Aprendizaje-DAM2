# Resultado de aprendizaje 1 — ERIN IU

En ERIN IU he creado y adaptado una interfaz gráfica para gestionar información de una empresa. El proyecto está hecho con HTML, CSS y JavaScript y utiliza archivos JSON para cargar parte de los datos.

## a) Herramientas y librerías disponibles

He utilizado Visual Studio Code para editar los archivos HTML, CSS y JavaScript. Para ejecutar el proyecto he usado XAMPP como servidor local y lo he visualizado en Google Chrome.

También he utilizado la consola y las herramientas de desarrollo de Chrome para revisar la interfaz, comprobar el funcionamiento del código y localizar posibles errores. No he añadido librerías externas.

El proyecto usa plantillas HTML, archivos JSON, variables CSS y clases de JavaScript. Esto permite separar el contenido, el diseño y el funcionamiento.

## b) Creación de la interfaz gráfica

El nombre ERIN nace del nombre de mi novia y también encaja con el lema «Ecosistema de Recursos, Información y Negocio». Me parece un nombre fácil de recordar y que puede utilizarse en proyectos de distintos ámbitos.

Elegí el color salmón para transmitir claridad y familiaridad sin crear una interfaz demasiado cargada. Busco un diseño minimalista, limpio, moderno, empresarial y cercano.

Los botones metálicos y las esquinas opuestas forman una apariencia propia que permite reconocer ERIN. El degradado se utiliza de forma suave para que no resulte chillón. Elegí Coolvetica porque me parece una tipografía moderna y fácil de leer.

He creado una interfaz formada por una cabecera, dos columnas laterales y un espacio principal con una tabla. También incluye páginas para formularios, mensajes toast y acceso de usuarios.

He utilizado la vista del navegador para comprobar visualmente el resultado y ajustar cada parte de la interfaz.

## c) Colocación de los componentes

Los componentes se han colocado con Flexbox y Grid. La cabecera contiene la marca, el buscador y el usuario, mientras que el contenido principal separa la navegación, los elementos y la tabla.

También he preparado el diseño para que se adapte cuando cambia el tamaño de la pantalla.

## d) Propiedades de los componentes

He modificado colores, tamaños, espacios, bordes, fuentes y estados de foco mediante CSS. La identidad de ERIN IU se controla con variables para mantener el mismo estilo en toda la aplicación.

La herramienta interna del tema permite cambiar el tono, la saturación, el brillo y el tamaño del texto. Los filtros y sus controles también respetan estos colores.

## e) Análisis del código generado

He revisado y desminificado los archivos HTML, CSS y JavaScript de la versión anterior. He pasado el código que estaba agrupado a un formato extendido, separando las etiquetas, las reglas CSS y las instrucciones JavaScript para poder leerlas y modificarlas con más facilidad.

También he revisado el sistema de plantillas. Cada componente se guarda en un archivo HTML independiente y JavaScript lo carga con `fetch()` para después clonarlo donde corresponde. Los menús, productos y datos del usuario se obtienen desde archivos JSON.

Al analizar el JavaScript comprobé que se podía organizar mediante programación orientada a objetos. Por eso se separaron las responsabilidades en clases para cargar recursos, crear componentes, controlar las columnas y gestionar las interacciones.

También he comprobado qué partes se podían organizar mejor antes de continuar modificando el proyecto.

## f) Modificación del código generado

He organizado el JavaScript mediante clases, métodos y propiedades dentro del namespace `erin.iu`. También he separado las funciones relacionadas con los componentes, las interacciones, el tema y los controles de la tabla.

Sobre esa base he añadido el configurador del tema, los filtros, la ordenación y el control mediante teclado sin cambiar la identidad visual del proyecto.

## g) Asociación de acciones a eventos

La aplicación utiliza eventos como `click`, `input`, `change`, `submit`, `mousedown` y `keydown`. Estos eventos permiten buscar, filtrar, ordenar, enviar formularios, redimensionar columnas y mostrar o cerrar mensajes.

La tecla `Escape` cierra los filtros y los toasts. Las flechas permiten ajustar el ancho de las columnas y los botones se pueden activar con `Enter` o espacio.

## h) Aplicación con la interfaz obtenida

La versión final reúne la interfaz y todas las funciones anteriores. Se pueden consultar productos, buscar, filtrar, ordenar, utilizar formularios, mostrar mensajes y acceder a la pantalla de login.

También he comprobado la sintaxis de los archivos JavaScript y he probado en el navegador los filtros, la ordenación, los controles de teclado y el cierre de los mensajes.
