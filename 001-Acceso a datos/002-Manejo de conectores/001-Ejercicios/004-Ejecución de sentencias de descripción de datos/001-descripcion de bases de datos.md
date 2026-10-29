# 001 - Sentencias de definición de datos (DDL)

DDL (*Data Definition Language*) agrupa las sentencias que crean, modifican o eliminan la estructura de una base de datos. La sintaxis y las operaciones disponibles dependen del gestor. La tabla distingue **MySQL 8.4** y **SQLite**; no describe todavía lo implementado en el motor de clase `jocarsabbdd`.

| Sentencia o variante | Función | MySQL 8.4 | SQLite |
| --- | --- | --- | --- |
| `CREATE DATABASE nombre` | Crear una base de datos. | Sí | No; se crea al abrir un archivo de base de datos. |
| `CREATE SCHEMA nombre` | Crear un esquema; en MySQL equivale a `CREATE DATABASE`. | Sí | No. |
| `ALTER DATABASE nombre ...` | Cambiar propiedades de una base de datos. | Sí | No. |
| `DROP DATABASE nombre` | Eliminar una base de datos. | Sí | No. |
| `DROP SCHEMA nombre` | Eliminar un esquema; en MySQL equivale a `DROP DATABASE`. | Sí | No. |
| `CREATE TABLE nombre (...)` | Crear una tabla y definir sus columnas. | Sí | Sí. |
| `CREATE TEMPORARY TABLE nombre (...)` | Crear una tabla temporal. | Sí | Sí: `CREATE TEMP TABLE`. |
| `CREATE TABLE nueva LIKE existente` | Copiar la definición de otra tabla. | Sí | No con esta sintaxis. |
| `CREATE TABLE nueva AS SELECT ...` | Crear una tabla a partir de una consulta. | Sí | Sí. |
| `CREATE VIRTUAL TABLE nombre USING modulo(...)` | Crear una tabla virtual. | No con esta sintaxis | Sí. |
| `ALTER TABLE nombre ADD COLUMN columna tipo` | Añadir una columna. | Sí | Sí, con restricciones. |
| `ALTER TABLE nombre DROP COLUMN columna` | Eliminar una columna. | Sí | Sí, si no rompe el esquema. |
| `ALTER TABLE nombre RENAME COLUMN anterior TO nuevo` | Renombrar una columna. | Sí | Sí. |
| `ALTER TABLE nombre RENAME TO nuevo` | Renombrar una tabla. | Sí | Sí. |
| `RENAME TABLE anterior TO nuevo` | Renombrar una tabla con la sintaxis propia de MySQL. | Sí | No; usar `ALTER TABLE`. |
| `ALTER TABLE nombre MODIFY COLUMN columna tipo` | Cambiar la definición de una columna. | Sí | No directamente. |
| `ALTER TABLE nombre ADD CONSTRAINT ...` | Añadir una restricción a una tabla existente. | Sí | No directamente; suele requerir reconstruir la tabla. |
| `ALTER TABLE nombre DROP ...` | Quitar restricciones o índices definidos en la tabla. | Sí, según el objeto | No directamente. |
| `CREATE TABLE nombre (... PRIMARY KEY ..., UNIQUE ..., CHECK ..., FOREIGN KEY ...)` | Definir restricciones al crear la tabla. | Sí | Sí, con diferencias de sintaxis y funcionamiento. |
| `DROP TABLE nombre` | Eliminar una tabla y sus datos. | Sí | Sí. |
| `TRUNCATE TABLE nombre` | Vaciar una tabla conservando su definición. | Sí | No; se usa `DELETE FROM nombre`, que es DML. |
| `CREATE INDEX indice ON tabla(columna)` | Crear un índice. | Sí | Sí. |
| `CREATE UNIQUE INDEX indice ON tabla(columna)` | Crear un índice que impide valores duplicados. | Sí | Sí. |
| `DROP INDEX indice ON tabla` | Eliminar un índice con sintaxis MySQL. | Sí | No; se usa `DROP INDEX indice`. |
| `DROP INDEX indice` | Eliminar un índice con sintaxis SQLite. | No con esta sintaxis | Sí. |
| `CREATE VIEW nombre AS SELECT ...` | Crear una vista. | Sí | Sí. |
| `ALTER VIEW nombre AS SELECT ...` | Cambiar la definición de una vista. | Sí | No directamente; se elimina y se vuelve a crear. |
| `DROP VIEW nombre` | Eliminar una vista. | Sí | Sí. |
| `CREATE TRIGGER nombre ...` | Crear un disparador. | Sí | Sí. |
| `DROP TRIGGER nombre` | Eliminar un disparador. | Sí | Sí. |
| `CREATE PROCEDURE nombre(...) ...` | Crear un procedimiento almacenado. | Sí | No. |
| `ALTER PROCEDURE nombre ...` | Cambiar características de un procedimiento. | Sí, con límites | No. |
| `DROP PROCEDURE nombre` | Eliminar un procedimiento. | Sí | No. |
| `CREATE FUNCTION nombre(...) ...` | Crear una función almacenada. | Sí | No mediante SQL DDL. |
| `ALTER FUNCTION nombre ...` | Cambiar características de una función almacenada. | Sí, con límites | No. |
| `DROP FUNCTION nombre` | Eliminar una función almacenada. | Sí | No. |
| `CREATE EVENT nombre ...` | Crear un evento programado. | Sí | No. |
| `ALTER EVENT nombre ...` | Modificar un evento programado. | Sí | No. |
| `DROP EVENT nombre` | Eliminar un evento programado. | Sí | No. |
| `CREATE TABLESPACE nombre ...` | Crear un espacio de tablas. | Sí | No. |
| `ALTER TABLESPACE nombre ...` | Modificar un espacio de tablas. | Sí | No. |
| `DROP TABLESPACE nombre` | Eliminar un espacio de tablas. | Sí | No. |
| `CREATE LOGFILE GROUP nombre ...` | Crear un grupo de archivos de registro. | Sí, según el motor de almacenamiento | No. |
| `ALTER LOGFILE GROUP nombre ...` | Modificar un grupo de archivos de registro. | Sí, según el motor de almacenamiento | No. |
| `DROP LOGFILE GROUP nombre ...` | Eliminar un grupo de archivos de registro. | Sí, según el motor de almacenamiento | No. |
| `CREATE SERVER nombre ...` | Definir un servidor externo. | Sí | No. |
| `ALTER SERVER nombre ...` | Modificar un servidor externo. | Sí | No. |
| `DROP SERVER nombre` | Eliminar la definición de un servidor externo. | Sí | No. |
| `CREATE SPATIAL REFERENCE SYSTEM ...` | Registrar un sistema de referencia espacial. | Sí | No. |
| `DROP SPATIAL REFERENCE SYSTEM ...` | Eliminar un sistema de referencia espacial. | Sí | No. |
| `ALTER INSTANCE ...` | Cambiar determinadas propiedades de la instancia del servidor. | Sí | No. |

`INSERT`, `UPDATE`, `DELETE` y `SELECT` no son DDL. `CONSTRAINT` no es una sentencia independiente: forma parte de `CREATE TABLE` o, cuando el gestor lo permite, de `ALTER TABLE`. Las entradas con `...` muestran la forma general; necesitan más cláusulas para ejecutarse.

## Fuentes

- [MySQL 8.4: sentencias de definición de datos](https://dev.mysql.com/doc/refman/8.4/en/sql-data-definition-statements.html).
- [SQLite: sentencias SQL admitidas](https://www.sqlite.org/lang.html).
- [SQLite: operaciones admitidas por `ALTER TABLE`](https://www.sqlite.org/lang_altertable.html).
