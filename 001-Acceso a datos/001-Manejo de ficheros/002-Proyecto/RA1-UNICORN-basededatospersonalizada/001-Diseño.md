# UNICORN — Diseño de datos y funcionamiento

## 1. Tablas

Todas tendrán `id` automático y `activo`. Los identificadores no se reutilizarán.

| Tabla | Campos principales |
|---|---|
| clientes | nombre, apellidos, email, telefono |
| libros | isbn, titulo, autor, precio_centimos, stock |
| pedidos | cliente_id, fecha, estado |
| lineas_pedido | pedido_id, libro_id, cantidad, precio_unitario_centimos |

El ISBN será único, las cantidades positivas y el stock no negativo. Los precios se guardarán en céntimos enteros y cada línea conservará el precio acordado. El total se calculará a partir de sus líneas.

## 2. Relaciones

```text
clientes 1 ---- N pedidos 1 ---- N lineas_pedido N ---- 1 libros
```

`relaciones.json` definirá las referencias: `cliente_id`, `pedido_id` y `libro_id`. Una clase Python comprobará que los registros existan y recuperará los datos relacionados.

El motor gestionará los ficheros; el gestor de relaciones comprobará referencias; la clase de librería aplicará las reglas de negocio; la consola presentará los resultados.

## 3. Desactivación e historial

Los clientes y libros desactivados no se utilizarán en nuevos pedidos, pero seguirán disponibles para consultar el historial. No se desactivarán mientras tengan reservas pendientes.

Cancelar un pedido cambiará su estado sin borrar sus líneas. La compactación conservará cualquier registro referenciado.

## 4. Reservas, ventas y existencias

| Operación | Transición | Efecto |
|---|---|---|
| Reservar | Nuevo → reservado | Aparta unidades sin reducir el stock físico. |
| Venta directa | Nuevo → vendido | Descuenta las unidades vendidas. |
| Vender reserva | Reservado → vendido | Descuenta el stock y libera la reserva correspondiente. |
| Cancelar reserva | Reservado → cancelado | Libera las unidades reservadas. |

**Disponible = stock físico − unidades reservadas.**

Cada pedido tendrá al menos una línea y se guardará al confirmar, tras comprobar la disponibilidad. Para cambiar una reserva confirmada se cancelará y se creará otra. Una venta o cancelación no podrá aplicarse dos veces ni se reducirá el stock por debajo de lo reservado.

## 5. Recuperación de operaciones

Antes de modificar varios ficheros se validará la operación y se guardará una copia previa con un registro de operación pendiente. Si queda interrumpida, se restaurará el estado anterior antes de permitir nuevas escrituras.

Este mecanismo deberá probarse y no equivale por sí solo a las transacciones de un gestor SQL.

## 6. Intercambio y copias

Se importará y exportará CSV/JSON, validando campos, IDs, relaciones y existencias. Inicialmente se importarán conjuntos completos en una base nueva.

Las copias incluirán datos, esquemas, índices y relaciones. Se comprobará la restauración antes de sustituir archivos existentes. Las exportaciones relacionadas conservarán también las referencias necesarias a registros inactivos.

## 7. Configuración y portabilidad

`config.json` contendrá rutas y tamaño de registro. Las rutas relativas partirán del proyecto; un cambio de tamaño no convertirá los datos existentes y deberá detectarse si es incompatible.

UNICORN tendrá sus propios archivos y datos, sin depender de otras carpetas del curso. Datos generados, copias y cachés se excluirán del repositorio.

## 8. Pruebas

Se comprobarán CRUD y persistencia, serialización, relaciones, historial, compactación, estados, stock, recuperación, conversiones y restauración. Las pruebas utilizarán carpetas temporales y aportarán evidencias para el RA1.
