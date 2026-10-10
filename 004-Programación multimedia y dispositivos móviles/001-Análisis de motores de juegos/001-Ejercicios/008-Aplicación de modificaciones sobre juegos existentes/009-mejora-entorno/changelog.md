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
