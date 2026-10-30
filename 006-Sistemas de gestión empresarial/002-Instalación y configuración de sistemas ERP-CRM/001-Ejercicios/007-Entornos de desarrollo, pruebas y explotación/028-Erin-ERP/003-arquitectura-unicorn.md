# Integración de UnicornBBDD en ERIN ERP 028

## Decisión

UnicornBBDD es el único motor usado durante la ejecución. SQLite no participa en la instalación, el CRUD, el acceso, los usuarios, los módulos, la API ni las migraciones.

ERIN conserva las responsabilidades empresariales y visuales. UnicornBBDD conserva las responsabilidades físicas: tablas tipadas, registros, relaciones, restricciones, transacciones y baja lógica.

## Frontera única

`nucleo/datos/ErinDatos.php` concentra:

- la configuración del runtime;
- la selección y creación de bases;
- la traducción de nombres y tipos;
- la lectura del esquema público;
- el CRUD y las transacciones;
- la creación de relaciones y restricciones.

Los controladores solo manejan arrays PHP y excepciones. No inspeccionan los archivos internos de UnicornBBDD.

## Fuente del modelo

`instalacion/diagrama.json` es la única fuente estructural ejecutable. `esquema.sql` ha dejado de ser fuente ejecutable y se mantiene solo para consultar la evolución histórica.

Los INSERT de demostración se interpretan como datos heredados y nunca se entregan a un motor SQL.

## Ubicación

Las bases se guardan en `.runtime/erin-erp-028/datos` y `base-activa.json` selecciona la que usa ERIN. La DLL y la consola viajan con la aplicación en `nucleo/datos/unicornbbdd`. La configuración, las bases y las copias quedan fuera de la carpeta de ERIN, excluidas de Git y protegidas frente al acceso HTTP mediante `.htaccess`.

## Compatibilidad con ERIN

La capa presenta `erin_identificador` como `Identificador`, oculta el `id` y la marca de baja lógica técnicos y permite un campo empresarial llamado `activo`. Esto mantiene identificadores públicos estables y el contrato que esperan los componentes JavaScript y las APIs existentes.

Los tres presets comparten el mismo recorrido de instalación. El preset completo también reconstruye las relaciones cuando los identificadores históricos contienen saltos.

