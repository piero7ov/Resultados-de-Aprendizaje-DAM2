# 001 - Sentencias de modificación de datos

Las sentencias de modificación de datos cambian el **contenido** de una tabla. En esta clase se estudian principalmente `INSERT`, `UPDATE` y `DELETE`.

| Sentencia | Qué hace | Ejemplo SQL |
| --- | --- | --- |
| `INSERT INTO` | Añade un registro nuevo. | `INSERT INTO usuarios (nombre, correo) VALUES ('Ana', 'ana@example.com');` |
| `UPDATE` | Cambia valores de registros existentes. | `UPDATE usuarios SET correo = 'ana@nueva.com' WHERE nombre = 'Ana';` |
| `DELETE FROM` | Elimina registros. | `DELETE FROM usuarios WHERE nombre = 'Ana';` |

## Relación con CRUD

CRUD significa **Create, Read, Update, Delete**. En estos apuntes, `C`, `U` y `D` son operaciones de modificación; `R` corresponde a la lectura o selección de datos. Crear una base de datos o una tabla cambia su **estructura** y pertenece a DDL, no a la inserción de registros.
