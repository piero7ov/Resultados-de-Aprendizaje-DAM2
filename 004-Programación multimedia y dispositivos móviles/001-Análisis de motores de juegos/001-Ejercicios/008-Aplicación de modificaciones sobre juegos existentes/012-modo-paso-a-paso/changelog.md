# Changelog · Producto en Marcha

## 0.1 — 006-Producto en marcha

- Creada la primera maqueta 3D en la subcarpeta `001-Base-3D`.
- Distribuidas las estaciones de Recepción, Control de calidad, Embalaje y Expedición sobre una cinta común.
- Añadidos operarios esquemáticos, mesas, pantallas, paquetes y palés.
- Organizado el código en módulos de datos, piezas, estaciones y escena.
- Utilizados A-Frame 1.7.1 y Three.js para una demostración web, servida desde el servidor local.
- Fijada la base visual del recorrido; todavía sin animaciones del proceso.

## 0.2 — 007-acercamiento-producto-en-marcha

- Creada una versión independiente a partir de la base 3D de la 006.
- Incorporadas transiciones de cámara hacia las cuatro estaciones y regreso a la vista general.
- Añadidos botones de navegación y marcadores seleccionables sobre la escena.
- Ampliado el encuadre de los puestos para mostrar más espacio alrededor.
- Incorporado el avatar GLB con su esqueleto de 12 articulaciones; retirados su plano, cámara y luces al cargarlo.
- Reconstruida la mitad reflejada del cuerpo en tiempo de ejecución, asociando sus pesos a las articulaciones opuestas.
- Conservado el archivo original del avatar, que todavía no contiene animaciones.

## 0.3 — 008-mejoras-producto-en-marcha

- Orientados los cuatro operarios hacia sus puestos y diferenciados sus chalecos con los colores de las estaciones.
- Ampliada la nave con ventanas, estructura abierta, lámparas, suelo exterior y cielo.
- Añadidos el muelle y el camión de Expedición, así como naves vecinas, vía de servicio, valla y arbolado.
- Optimizado el chaleco de 969 936 a 33 947 polígonos.
- Combinados el cuerpo completo, su esqueleto y el chaleco en `modelos/operario.glb`.
- Corregida la orientación de la prenda y ajustada su malla al pecho, los hombros y la espalda.
- Aplicadas las texturas aportadas en `Texture.zip`: color, rugosidad, metalicidad y normales. Los ribetes y reflectantes conservan su aspecto al cambiar el color de la tela.
- Sustituidas las bandas provisionales de geometría por las originales de la textura.
- Conservados los archivos fuente y el script `herramientas/ajustar_operario.py` para regenerar el modelo con Blender. La opción `-- --previsualizar` genera cuatro vistas de revisión.
- Chaleco procedente de [Work Safety Vest 3D Model, de abuzawad33](https://www.cgtrader.com/free-3d-models/character/clothing/work-safety-vest-3d-model).
- Comprobado el ajuste en la pose actual. El chaleco sigue rígidamente al torso; sus deformaciones durante futuros movimientos quedan por revisar.

## 0.4 — 009-mejora-entorno

- Sustituidas las parcelas aisladas por un terreno continuo, prolongado fuera del encuadre.
- Conectadas las calles del polígono con el patio y el acceso de Expedición.
- Diferenciados asfalto, hormigón, aceras, césped y tierra mediante texturas de Canvas de 512 píxeles y relieve suave.
- Añadidos bordillos, paso peatonal, marcas de carril, señalización de carga, huellas suaves y desagües.
- Ajustadas las alturas de apoyo del camión, las naves vecinas y la vegetación.
- Incorporadas sombras exteriores con un mapa de 2048 píxeles, manteniendo la dirección de iluminación.
- Separadas la construcción del terreno y la generación de materiales en `js/terreno.js` y `js/texturas-entorno.js`.
- Conservados el interior, los operarios y los acercamientos anteriores. Revisados la carga, las vistas y la consola del navegador.

## 0.5 — 010-interfaz-estaciones

- Añadido un contorno del color del puesto seleccionado y un tinte suave sobre su suelo.
- Creado el panel explicativo con función, tareas, entrada y salida de cada estación.
- Distribuidos el visor a la izquierda y el panel a la derecha en ordenador; en pantallas de hasta 900 píxeles, el panel aparece debajo.
- Separada la interfaz en `js/interfaz-estaciones.js`, conservando cámara y navegación en `js/camara.js`.
- Adaptado el encuadre al espacio disponible y al cambio de tamaño de pantalla.
- Suavizados la apertura y el cierre: el panel se desplaza y desvanece mientras la cámara realiza el acercamiento o alejamiento.
- Corregida la transición que redimensionaba continuamente el lienzo: ahora conserva su tamaño y el panel se superpone sobre la escena, con el enfoque desplazado hacia la izquierda.
- Conservados el cierre mediante botón o Escape y el respeto de la preferencia de movimiento reducido.
- Retirados el aviso del contorno, la descripción repetida bajo la botonera y las cuatro tarjetas inferiores.
- Convertida la documentación en `changelog.md` acumulativos: cada carpeta conserva las entradas anteriores y añade la suya.
- Conservados los modelos, la distribución interior y el entorno de la 009. El recorrido automático y las acciones guiadas corresponden a las versiones siguientes.

## 0.6 — 011-recorrido-automatico

- Creada una copia independiente de la 010, manteniendo sus vistas, paneles y transición con el lienzo estable.
- Añadido un lote automático de seis productos, procesados uno a uno desde Recepción.
- Separadas la lógica temporal en `js/recorrido.js`, su representación y controles en `js/simulacion.js` y los gestos en `js/animaciones-operarios.js`.
- Incorporados Iniciar, Pausar, Continuar y Reiniciar, progreso del producto, etapa actual y contadores de preparados y descartados.
- Añadido seguimiento opcional de cámara. Elegir una vista manual o cerrar la tarjeta desactiva el seguimiento.
- Animadas las marcas de la cinta durante los traslados y pequeños gestos de brazos durante el trabajo, conservando el chaleco unido al torso.
- Representado el producto antes del embalaje y añadidos caja, precinto y etiqueta por etapas.
- Establecido un rechazo demostrativo cada tres productos: los paquetes 3 y 6 se desvían por un canal al contenedor y no pasan por Embalaje ni Expedición.
- Liberado el palé de Expedición para mostrar la llegada del paquete terminado. Los contadores conservan los resultados; los modelos no se acumulan.
- Conservada la posición del proceso al pausar y detenida la simulación al ocultar la pestaña. La preferencia de movimiento reducido desactiva los gestos y las marcas móviles de la cinta.
- Añadidas cinco pruebas con el módulo de pruebas de Node: pausa, bifurcación por calidad, conteo final, independencia de la frecuencia y reinicio.
- Verificados en navegador el lote completo (4 preparados y 2 descartados), la pausa sin avance, el reinicio a cero, el seguimiento opcional y la disposición móvil sin desbordamiento. Sin errores de consola.
- Los gestos son procedurales y breves; todavía no hay agarre del producto con las manos ni locomoción. El modo paso a paso queda para la 012. Sin sonido ni dependencias nuevas.
- Corregidos al cargar el avatar los pesos de las piernas vinculados a las manos: las piernas y los pies permanecen fijos mientras se animan los brazos. El GLB original se conserva.
- Simplificado el panel inferior con iconos accesibles de reproducción, pausa y reinicio, manteniendo estado, progreso, contadores y seguimiento de cámara.
- Retirados del panel la lista repetida de estaciones y el texto explicativo; la cabecera queda en un título y un subtítulo, sin numeración de versión.
- Añadida una comprobación sobre el GLB real para verificar piernas y pies fijos y conservar los pesos de brazos y cara.

## 0.7 — 012-modo-paso-a-paso

- Creada una copia independiente de la 011 con los modos Automático y Pruébalo tú.
- Compartidos el recorrido, los productos, las animaciones y el criterio de calidad entre ambos modos.
- Añadidas acciones guiadas: Recibir, Inspeccionar, Embalar y Expedir. Cada acción ejecuta su trabajo y el traslado hasta la siguiente espera.
- Tras una inspección fallida, el proceso espera la acción Descartar; ese producto no pasa por Embalaje ni Expedición.
- Deshabilitada la acción durante el movimiento para evitar avances duplicados. La pausa permite continuar la acción sin saltar la siguiente espera.
- Conservados los controles con iconos, el seguimiento opcional, la exploración libre y la corrección de las piernas del avatar.
- Cambiar de modo reinicia el lote, con un aviso junto al selector. Reiniciar mantiene el modo elegido.
- Añadidas cuatro pruebas del modo guiado: orden de acciones, descarte y equivalencia con el automático, pausa y cambio de modo. Superadas las diez pruebas del proyecto.
- Comprobados en navegador dos paquetes expedidos y un descarte manual, pausa y continuación, cambio a automático y reinicio. Revisada la interfaz móvil sin desbordamiento y la consola sin errores.
