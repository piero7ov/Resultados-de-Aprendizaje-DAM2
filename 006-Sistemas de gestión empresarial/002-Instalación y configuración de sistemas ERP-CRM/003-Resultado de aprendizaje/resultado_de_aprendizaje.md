# Resultado de aprendizaje 2 — ERIN ERP

En ERIN ERP he preparado distintas formas de instalar el sistema según el tamaño y las necesidades de la empresa. Para esta entrega he partido de la versión 028, que utiliza PHP y UnicornBBDD como motor de datos. La instalación que he dejado como principal es la de una empresa pequeña.

## a) Módulos del ERP-CRM

He organizado ERIN en módulos que agrupan las tablas de cada área. El modelo de empresa pequeña incluye Compras, CRM, Personas, Todo y Ventas. El modelo completo dispone de 17 módulos, entre ellos Almacén, Contabilidad, Facturación y Recursos Humanos.

Cada módulo tiene un archivo `carpetas.json` con su nombre y las tablas que presenta; también puede indicar si está activo. Por ejemplo, en el modelo pequeño CRM reúne clientes y empresas. Esta organización separa las áreas de trabajo sin duplicar los datos.

## b) Diferentes tipos de instalación

He probado por separado la instalación para una empresa pequeña y la del ERP completo. Son dos presets con modelos de datos distintos: el primero crea 12 tablas y puede cargar 77 registros ficticios; el segundo crea 80 tablas y también dispone de datos de demostración. ERIN ofrece además la opción «desde cero» para diseñar un modelo propio.

El instalador lee las entidades y relaciones de `diagrama.json`, crea las tablas en UnicornBBDD y comprueba la integridad de los datos cargados.

Después de las pruebas eliminé las bases que no necesitaba. Dejé instalada la de empresa pequeña porque es el caso en el que quiero centrar el proyecto.

## c) Configuración de los módulos

He configurado los módulos que corresponden a cada modelo. Desde la pantalla de configuración puedo crear módulos, activarlos o desactivarlos y elegir las tablas que muestra cada uno. También he probado estas operaciones durante el desarrollo.

En la instalación final aparecen los cinco módulos del modelo pequeño. La configuración permite ajustar lo que se ve en el menú sin cambiar el esquema de la base de datos. El acceso a esta pantalla está reservado al administrador.

## d) Instalaciones adaptadas a distintos supuestos

Para una empresa pequeña preparé un modelo con las áreas y los datos necesarios para empezar a trabajar. Para una organización con más procesos probé el modelo completo, con más tablas y módulos. Si ninguna de esas opciones encaja, el instalador permite partir de un modelo vacío y editar sus entidades, campos y relaciones antes de crear la base.

También puedo ajustar un preset con el diseñador de datos antes de instalarlo, por ejemplo, añadiendo un campo o una relación mediante clave foránea.

## e) Verificación del funcionamiento

He comprobado las instalaciones con pruebas aisladas. En la versión 027 se verificaron los modelos pequeño y completo con UnicornBBDD. En la 028 he vuelto a comprobar el modelo pequeño, sus datos, las claves foráneas, las operaciones de alta, modificación y baja, y la migración recuperable. La prueba de integración de la 028 terminó correctamente.

También se comprobaron restricciones de los campos, como `NO NULO` y `ÚNICO` en el código de producto, la creación de su índice y la conservación de registros e identificadores tras una migración.

## f) Documentación de operaciones e incidencias

He registrado la evolución del proyecto en `changelog.md` y he descrito sus objetivos y arquitectura en documentos separados. Allí constan las instalaciones, la configuración de módulos y las comprobaciones realizadas. La versión 028 incluye además un script de prueba de integración que puedo volver a ejecutar.

También he anotado incidencias y correcciones hechas durante el desarrollo. Por ejemplo, ajusté el orden de instalación para cargar los registros antes de crear sus claves foráneas y preparé una migración que guarda una copia JSON, valida la nueva base y solo después la activa. Así puedo explicar qué ocurrió y cómo quedó resuelto.

La base anterior permanece disponible si necesito recuperarla después de una actualización.
