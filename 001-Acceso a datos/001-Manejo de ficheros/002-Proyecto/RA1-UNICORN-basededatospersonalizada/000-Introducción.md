# UNICORN — Base de datos personalizada

## Presentación

UNICORN es un proyecto del Resultado de Aprendizaje 1 de la asignatura 0486 — Acceso a Datos, correspondiente a la unidad de Manejo de ficheros.

Se plantea como una herramienta del entorno ERIN. ERIN reúne distintas herramientas; el ERP-CRM desarrollado en Sistemas de Gestión Empresarial es una de ellas. UNICORN tendrá una utilidad propia: gestionar una librería que vende libros y permite reservarlos.

El proyecto partirá del motor `PierodevBBDD` desarrollado durante la unidad, aprovechando su configuración externa, gestión de errores, validación de campos, compactación, instalador y pruebas. Las versiones anteriores servirán como referencia y se conservarán.

## Objetivo y alcance

Desarrollar una aplicación que gestione clientes, libros, pedidos y líneas de pedido mediante un motor propio de almacenamiento en ficheros. Permitirá realizar reservas, confirmar ventas y cancelar reservas, utilizando estados y controlando las existencias.

Las relaciones se representarán mediante identificadores y se comprobarán desde clases Python. El motor de almacenamiento y la gestión de relaciones se diseñarán para poder reutilizarse en otras herramientas, mientras que las reglas de reservas y ventas pertenecerán a la aplicación de librería.

## Orden de desarrollo

### 1. Diseño

Definir el alcance, las cuatro tablas principales —clientes, libros, pedidos y líneas de pedido—, sus relaciones y las reglas del negocio.

Se concretarán los estados `reservado`, `vendido` y `cancelado`, las transiciones permitidas y su efecto sobre las existencias físicas y las unidades disponibles. También se definirán las reglas de desactivación para conservar el historial y evitar referencias inválidas.

El diseño relacionará las funciones previstas con los criterios de evaluación a–g del RA1.

### 2. Motor de ficheros

Adaptar la última versión de `PierodevBBDD`, conservando su configuración externa, validación y compactación. Se revisarán los registros de tamaño fijo, los esquemas, los índices y las operaciones de lectura y escritura.

Las pruebas anteriores servirán de base, ampliándolas cuando sea necesario para comprobar campos con delimitadores, límites en bytes, datos inválidos y operaciones fallidas. Se distinguirá el formato interno de almacenamiento de los archivos CSV estándar destinados al intercambio.

### 3. Relaciones

Definir referencias entre tablas mediante metadatos y añadir comprobaciones reutilizables para insertar, actualizar y eliminar registros.

Las relaciones iniciales serán:

- Un cliente puede tener varios pedidos.
- Cada pedido pertenece a un cliente y puede contener varias líneas.
- Cada línea pertenece a un pedido y referencia un libro.
- Un libro puede aparecer en las líneas de distintos pedidos.

Las clases Python comprobarán que las referencias sean válidas y recuperarán los registros relacionados. Los ficheros no proporcionan claves foráneas ni operaciones `JOIN` por sí mismos: esas funciones deberán implementarse y probarse en el proyecto.

### 4. Gestión de la librería

Implementar las operaciones de clientes, libros, reservas, ventas y cancelaciones sobre el motor y las relaciones.

Como comportamiento previsto, una reserva apartará unidades sin reducir las existencias físicas; una venta confirmada reducirá esas existencias y dejará de contar como reserva; una cancelación liberará las unidades reservadas. Las líneas conservarán el precio acordado para mantener el historial aunque cambie el precio del catálogo.

Se definirá cómo detectar y recuperar operaciones interrumpidas entre escrituras de distintos ficheros. No se supondrá que varias escrituras forman automáticamente una transacción.

### 5. Intercambio de formatos y recuperación

Incorporar importación y exportación CSV/JSON, validando los datos y sus referencias antes de incorporarlos.

Añadir copias de seguridad y restauración comprobada de los datos, esquemas, índices y definiciones de relaciones. Se documentará qué incluyen las copias y cómo recuperar la información. Las copias de seguridad no sustituyen el control de las operaciones que afectan a varios archivos.

### 6. Consola

Construir `unicorn.py` como punto de entrada de la aplicación de terminal, con menús, formularios, tablas, confirmaciones y mensajes comprensibles.

La interfaz utilizará las clases del proyecto para realizar las operaciones. Esta separación permitirá valorar posteriormente una interfaz Tkinter que comparta la misma lógica.

### 7. Pruebas finales, documentación y entrega

Durante cada fase se realizarán las comprobaciones correspondientes. Al finalizar, se probará el funcionamiento integrado, incluidos los errores, las relaciones, los estados, las conversiones y la restauración.

Se preparará un manual de uso y documentación técnica que explique las decisiones, las limitaciones y las evidencias de los criterios del RA1. La entrega se generará con la herramienta Jocarsa que facilite el profesor, siguiendo sus instrucciones cuando estén disponibles.

## Vinculación con el RA1

Resultado de aprendizaje: desarrollar aplicaciones que gestionen información almacenada en ficheros, identificando su campo de aplicación y utilizando clases específicas.

| Criterio | Evidencia prevista en UNICORN |
|---|---|
| a) Gestión de ficheros y directorios | Clases para administrar bases de datos, tablas y archivos. |
| b) Ventajas e inconvenientes de las formas de acceso | Comparación del acceso secuencial, el acceso directo con `seek()` y la búsqueda en índices. |
| c) Recuperación de información | Consultas, listados y recuperación de registros relacionados. |
| d) Almacenamiento de información | Altas, modificaciones, bajas y persistencia en ficheros. |
| e) Conversión entre formatos | Importación y exportación entre el almacenamiento propio, CSV y JSON. |
| f) Previsión y gestión de excepciones | Tratamiento de errores de archivos, datos inválidos, referencias y operaciones del negocio. |
| g) Pruebas y documentación | Pruebas automatizadas, comprobaciones de uso, manual y documentación para la entrega. |
