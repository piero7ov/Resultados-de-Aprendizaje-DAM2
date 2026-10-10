# Resultado de aprendizaje 1 — Producto en Marcha

En Producto en Marcha he creado una demostración interactiva de una línea industrial. Un producto pasa por Recepción, Control de calidad, Embalaje y Expedición. Se puede observar un lote automático de seis productos o intervenir en cada estación con el modo «Pruébalo tú». Algunos productos no superan la inspección y se desvían a un contenedor de descarte.

He desarrollado la aplicación como experiencia web con HTML, CSS, JavaScript, A-Frame y Three.js. Así he podido trabajar la parte multimedia y probar su uso en pantallas pequeñas.

## a) Limitaciones de la ejecución en dispositivos móviles

Una escena 3D exige más trabajo a la GPU y consume más memoria y batería que una página de texto. En un móvil también hay menos espacio para mostrar a la vez la nave, los controles y la explicación de cada estación. Además, el rendimiento depende del navegador y de que el dispositivo admita WebGL.

Por eso utilizo una vista general y acercamientos a las estaciones, en lugar de obligar a recorrer toda la nave con una cámara libre. En pantallas estrechas, el panel explicativo aparece debajo del visor. El modelo de operario se ha optimizado en versiones anteriores y la aplicación respeta la preferencia de movimiento reducido. Estas decisiones ayudan a que la experiencia sea más manejable.

## b) Tecnologías de desarrollo para móviles

He comparado la posibilidad de hacer una aplicación nativa con la de crear una experiencia web. En este proyecto he elegido la segunda: HTML organiza los controles, CSS adapta la interfaz y JavaScript controla la simulación. A-Frame proporciona la escena 3D y utiliza Three.js para construir el entorno, animar objetos y manejar la cámara.

Esta elección permite abrir la misma demostración en un navegador de ordenador o móvil. También tiene una dependencia clara: necesita un navegador compatible con WebGL y, en esta entrega, conexión para cargar A-Frame desde su dirección externa.

## c) Entorno de trabajo utilizado

He trabajado con el proyecto servido desde XAMPP. El HTML carga una versión concreta de A-Frame, los módulos JavaScript y el modelo `operario.glb` desde las carpetas que acompañan a la entrega.

La estructura separa `css`, `js`, `fuentes` y `modelos`. Esto facilita modificar el aspecto o el recorrido sin mezclarlo todo en el HTML. He utilizado este entorno web ya disponible.

## d) Configuraciones de los dispositivos

He tenido en cuenta diferencias de tamaño de pantalla y capacidad de representación. El diseño utiliza un visor amplio en ordenador y reorganiza el panel en pantallas de hasta 900 píxeles. En tamaños más estrechos ajusta espacios, cabecera y controles para que puedan utilizarse sin desplazamiento horizontal.

También he considerado la preferencia de movimiento reducido del sistema. Cuando está activa, se evitan transiciones y gestos decorativos. La configuración real del procesador, la memoria y la GPU puede variar mucho entre móviles.

## e) Relación entre el dispositivo y la aplicación

El perfil previsto es un dispositivo con navegador moderno, JavaScript y WebGL. La misma aplicación ofrece botones que pueden pulsarse con ratón o mediante la interacción táctil habitual del navegador. La cámara de la nave tiene vistas predefinidas para que el usuario pueda elegir una estación sin necesitar controles complejos.

La interfaz responde al espacio disponible: la explicación queda a la derecha en pantallas grandes y debajo de la escena en pantallas pequeñas. Es un perfil de aplicación web adaptable.

## f) Estructura de una aplicación existente

Antes de llegar a esta entrega partí de las versiones anteriores de Producto en Marcha y revisé su organización. `escena.js` monta la nave; `estaciones.js` construye los puestos; `camara.js` controla las vistas; `avatar.js` carga los operarios; y `simulacion.js` une la representación con los botones.

También hay clases con responsabilidades concretas. `Piezas` crea elementos reutilizables de la escena y `Recorrido` guarda el estado del lote, las etapas, los tiempos y los resultados. Separar el recorrido de su representación permite utilizarlo tanto en modo automático como paso a paso.

## g) Modificaciones sobre aplicaciones existentes

He conservado versiones incrementales del proyecto. A partir de la maqueta inicial añadí acercamientos a las estaciones, operarios con chalecos, una nave y un exterior más detallados, paneles informativos y un producto que avanza por la cinta. Después incorporé el control de calidad con descarte, la animación de los brazos y los dos modos de uso.

El cambio más importante ha sido convertir una maqueta que se podía observar en una simulación que se puede utilizar. Ahora el producto avanza por las cuatro estaciones, el control de calidad puede rechazarlo y el usuario puede seguir el proceso completo o tomar decisiones paso a paso. Así, las versiones muestran cómo fue creciendo tanto la escena como su funcionamiento.

## h) Comprobación con emuladores

He probado la aplicación en el navegador con un tamaño de pantalla móvil. Comprobé que la página no tuviera desbordamiento horizontal y que se pudieran usar las vistas y el modo paso a paso. También revisé la consola del navegador y ejecuté las pruebas de la lógica del recorrido, incluidos la pausa, el descarte y el cambio de modo.
