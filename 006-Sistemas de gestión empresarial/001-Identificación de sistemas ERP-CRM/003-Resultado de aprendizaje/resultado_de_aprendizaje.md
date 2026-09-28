# Resultado de aprendizaje 1 — ERIN ERP

En ERIN ERP he creado un prototipo de sistema de gestión empresarial organizado en módulos. El programa utiliza HTML, CSS y JavaScript para la interfaz y una API en PHP para proporcionar el menú y los clientes.

También he añadido una verificación del entorno y un informe descargable para reforzar los criterios relacionados con el sistema operativo, el gestor de datos, la comprobación de la configuración y la documentación del proyecto.

## a) Sistemas ERP-CRM del mercado

Durante la unidad he conocido diferentes sistemas como Odoo, SAP, Business Central, Sage, Holded y ERPNext. Cada uno está pensado para unas necesidades distintas y puede incluir funciones de ventas, contabilidad, almacén, producción o gestión de clientes.

ERIN está tomando el rumbo de un ERP modular dirigido inicialmente a pequeñas y medianas empresas. Por su estructura ampliable se acerca al planteamiento de Odoo y ERPNext, mientras que por su intención de ofrecer una gestión sencilla para pymes también comparte parte del enfoque de Holded y Sage. Por ahora no pretende alcanzar la complejidad de sistemas como SAP o Business Central, sino crecer poco a poco desde una base propia y adaptable.

## b) Tipos de licencia

He estudiado las licencias propietarias, las licencias libres como GPL, AGPL y LGPL, y el modelo de software como servicio.

Para ERIN he elegido provisionalmente una licencia propietaria comercial porque la idea es mantener el control del producto y ofrecer su uso a los clientes. Las condiciones definitivas y las licencias de las tecnologías utilizadas tendrán que revisarse antes de distribuirlo.

## c) Comparación de sistemas ERP-CRM

Los sistemas como SAP, Business Central u Odoo ya ofrecen muchos módulos y están preparados para trabajar en empresas reales. Otras soluciones como Holded o FACTUSOL se centran más en pymes, facturación y gestión comercial.

ERIN todavía tiene menos funciones, pero me permite controlar el código y adaptarlo a necesidades concretas. Actualmente dispone de una interfaz modular, una API en PHP y una primera gestión de clientes. Aún faltan la persistencia, el CRUD y la autenticación.

## d) Sistema operativo

He desarrollado y probado ERIN en Windows utilizando XAMPP. Para una futura instalación en producción utilizaría un servidor Linux con Apache y PHP.

La parte cliente funciona en un navegador, por lo que podría utilizarse desde Windows o desde otros sistemas operativos con un navegador moderno.

Para reforzar este criterio, la herramienta de verificación detecta el sistema operativo y el servidor que están ejecutando ERIN. En la prueba realizada ha identificado Windows y Apache correctamente.

## e) Gestor de datos

Durante el desarrollo utilizaré SQLite porque guarda toda la base de datos en un archivo que puede copiarse con cada versión del proyecto. Cuando ERIN esté más avanzado, la previsión es migrar los datos relacionales a MySQL.

MongoDB también se ha estudiado como opción para documentos, pero actualmente no forma parte del proyecto. Los clientes que aparecen en ERIN siguen siendo datos estáticos devueltos por la API.

De momento no he creado ninguna base de datos. Para reforzar la elección del gestor de datos sin adelantar la siguiente unidad, la verificación confirma que PHP dispone de controladores compatibles con SQLite y MySQL para utilizarlos más adelante.

## f) Verificación de la configuración

Para reforzar especialmente este criterio, he añadido una pantalla que comprueba el entorno donde se ejecuta ERIN. La prueba ha detectado Windows, Apache 2.4.58 y PHP 8.2.12. También ha confirmado la disponibilidad de JSON, PDO y los controladores para SQLite y MySQL.

Las siete comprobaciones se han superado y la pantalla responde correctamente mediante Apache. La API mantiene los seis apartados del menú y los diez clientes originales.

## g) Documentación de las operaciones

He separado la entrega en tres versiones. La 001 conserva el estado inicial, la 002 añade la verificación del entorno y la 003 permite descargar un informe con los resultados.

Cada versión mantiene su propio `changelog.md`. Como mejora adicional para reforzar la documentación, la versión final puede descargar un informe Markdown con la fecha, la versión y los resultados de todas las comprobaciones. También he actualizado los documentos de objetivos y arquitectura para que describan los cambios realizados.

## h) Documentación de incidencias

Uno de los problemas encontrados fue que los scripts cargados dentro de los componentes no se ejecutaban automáticamente al insertarlos con `innerHTML`. Lo solucioné recreando esos scripts desde `incluir.js`.

También fue necesario mantener un JSON válido para que JavaScript pudiera interpretar las respuestas de la API. La carpeta `api` se escribió en minúsculas para evitar problemas al ejecutar el proyecto en Linux.

Para reforzar el registro de incidencias, el informe de verificación incluye un apartado específico. Si alguna comprobación no se supera, queda identificada como pendiente y aparece en ese apartado. En la prueba final no se han detectado incidencias de configuración.

No se han producido incidencias con pérdida de datos porque ERIN todavía trabaja con información estática de demostración.
