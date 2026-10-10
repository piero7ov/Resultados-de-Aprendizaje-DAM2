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
