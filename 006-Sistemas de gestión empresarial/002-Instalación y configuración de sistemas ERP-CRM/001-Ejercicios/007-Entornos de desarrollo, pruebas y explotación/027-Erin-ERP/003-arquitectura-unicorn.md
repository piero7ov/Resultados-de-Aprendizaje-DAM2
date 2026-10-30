# Integración de UnicornBBDD en ERIN ERP 027

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

La base principal se guarda en `.runtime/erin-erp-027/datos/erin_erp`. La DLL viaja con la aplicación en `nucleo/datos/unicornbbdd/unicornbbdd.dll`. La configuración y los datos quedan fuera de la carpeta de ERIN, excluidos de Git y protegidos frente al acceso HTTP mediante `.htaccess`.

## Compatibilidad con ERIN

La capa adapta `id` a `Identificador`, oculta la marca técnica de baja lógica y permite un campo empresarial llamado `activo`. Esto mantiene el contrato que esperan los componentes JavaScript y las APIs existentes.

Los tres presets comparten el mismo recorrido de instalación. El preset completo también reconstruye las relaciones cuando los identificadores históricos contienen saltos.

