# 002 - Implantación deseable

Partiremos de la versión `004-documentamos uso` del motor `PierodevBBDD` y su conector Python. Esta lista define las operaciones DDL que queremos incorporar.

| Operación | Qué hará nuestro motor |
| --- | --- |
| `ALTER TABLE ... ADD COLUMN` | Añadir una columna vacía a los registros existentes. |
| `ALTER TABLE ... DROP COLUMN` | Eliminar una columna y sus valores, salvo las columnas internas `id` y `activo`. |
| `ALTER TABLE ... RENAME COLUMN` | Cambiar el nombre de una columna. |
| `ALTER TABLE ... RENAME TO` | Renombrar una tabla y sus archivos `.csv`, `.esquema` y `.idx`. |
| `TRUNCATE TABLE` | Vaciar los registros y el índice, conservando el esquema. |
| `DROP TABLE` | Eliminar los archivos de una tabla. |
| `DROP DATABASE` | Eliminar una base de datos y sus tablas. |

