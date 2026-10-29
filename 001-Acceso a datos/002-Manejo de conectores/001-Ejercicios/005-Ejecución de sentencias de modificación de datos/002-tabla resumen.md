# 002 - Tabla resumen de modificación de datos

| Sentencia | Función | Ejemplo SQL |
| --- | --- | --- |
| `INSERT` | Insertar registros. | `INSERT INTO clientes VALUES (1, 'Ana');` |
| `INSERT INTO ... VALUES` | Insertar valores indicando columnas. | `INSERT INTO clientes (nombre) VALUES ('Ana');` |
| `INSERT INTO ... SELECT` | Insertar registros obtenidos de otra consulta. | `INSERT INTO copia SELECT * FROM clientes;` |
| `UPDATE` | Modificar registros. | `UPDATE clientes SET nombre = 'Ana';` |
| `UPDATE ... WHERE` | Modificar solo los registros que cumplen una condición. | `UPDATE clientes SET edad = 30 WHERE id = 1;` |
| `DELETE` | Eliminar registros. | `DELETE FROM clientes;` |
| `DELETE ... WHERE` | Eliminar solo los registros que cumplen una condición. | `DELETE FROM clientes WHERE id = 1;` |

Las operaciones básicas de inserción, actualización y eliminación por identificador ya existían en `PierodevBBDD`. Las variantes con columnas, origen en otra tabla y condición se incorporarán en la iteración `004-sentencias DML`.
