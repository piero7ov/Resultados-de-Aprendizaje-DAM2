# UNICORN — Relaciones explicadas

## 1. La idea principal

**Los registros guardan los IDs, el JSON define las relaciones y Python las comprueba.**

Un pedido guarda el ID de su cliente, no una copia de todos sus datos:

```text
Cliente: id=2
Pedido:  id=7, cliente_id=2, estado="reservado"
```

- `id=7` identifica el pedido que queremos consultar o modificar.
- `cliente_id=2` conecta ese pedido con el cliente 2.

Si cambia el estado, sigue siendo el pedido 7 del cliente 2. Si cambia `cliente_id` a 3, pasa a relacionarse con el cliente 3.

## 2. Qué indica relaciones.json

```json
{
    "tabla": "pedidos",
    "campo": "cliente_id",
    "tabla_destino": "clientes"
}
```

Esta regla significa: **«pedidos.cliente_id apunta a clientes.id»**. El destino siempre es el campo `id`.

El JSON describe la regla, pero no la ejecuta ni almacena los pedidos. No cambia cada vez que modificamos un pedido.

Nuestro archivo contiene tres reglas:

| Campo que guarda la referencia | Destino |
|---|---|
| `pedidos.cliente_id` | `clientes.id` |
| `lineas_pedido.pedido_id` | `pedidos.id` |
| `lineas_pedido.libro_id` | `libros.id` |

Después de crear las cuatro tablas, `conexion.configurarRelaciones()` valida la plantilla del proyecto y guarda una copia dentro de la base seleccionada. **Cada base utiliza su propia copia.**

## 3. Qué ocurre al insertar

```python
conexion.insertarDatos("pedidos", [2, "2026-09-24", "reservado"])
```

El primer valor es `cliente_id`, según el orden del esquema.

1. `UnicornBBDD` comprueba los campos recibidos.
2. Llama a `UnicornRelaciones.validarDatos()`.
3. El gestor lee la regla y busca al cliente 2.
4. Si existe y está activo, permite guardar el pedido con su propio ID.
5. Si no, lanza un error antes de guardar el pedido.

**No llamamos al validador manualmente:** el motor lo utiliza al insertar y actualizar.

## 4. Qué ocurre al actualizar

- **Cambiamos de cliente:** el nuevo cliente debe existir y estar activo.
- **Mantenemos el mismo cliente:** podemos cambiar otro campo aunque ese cliente esté inactivo; conservamos una relación histórica.

Por eso `validarDatos()` recibe también el registro anterior: compara la referencia antigua con la nueva. Un destino inexistente no se acepta, aunque la referencia no cambie.

## 5. Cómo consultamos la relación

```python
relaciones = UnicornRelaciones(conexion)
cliente = relaciones.obtenerRelacionado("pedidos", 7, "cliente_id")
```

El gestor lee el pedido 7, obtiene su `cliente_id` y busca ese ID en `clientes`. Devuelve un diccionario con el cliente, incluso si está inactivo, para consultar el historial.

Por defecto, un pedido inactivo no se consulta con este método; podemos incluirlo pasando `incluirInactivos=True`.

Otros métodos útiles:

- `buscarReferencias("clientes", 2)`: devuelve los registros que apuntan al cliente 2; incluye los inactivos por defecto.
- `validarIntegridad()`: comprueba que las referencias guardadas tengan destino, también las históricas.
- `idsProtegidos("clientes")`: obtiene los IDs referenciados que deben conservarse al compactar.

## 6. Eliminar y compactar no son lo mismo

**`eliminar()`** pone `activo=0`. Conserva el ID, los datos y su posición física. El registro se oculta en las consultas normales, pero puede recuperarse incluyendo inactivos.

**`compactar()`** retira físicamente los inactivos no referenciados. Conserva cualquier registro al que otro apunte, aunque ese otro también esté inactivo.

Ejemplo: si un pedido apunta al cliente 2, compactar clientes no elimina ese cliente. Si el pedido se retira físicamente y no quedan más referencias, el cliente inactivo ya podrá retirarse.

Los IDs retirados quedan en el índice con posición `-1`, para **no reutilizarlos**.

## 7. Qué hemos construido y qué no

En SQLite, el gestor puede comprobar las claves foráneas. Aquí **hemos programado esa comprobación en Python sobre ficheros**: no hemos convertido los CSV en un gestor SQL.

El sistema comprueba relaciones por ID; las reglas de reservas, ventas y stock están separadas en `UnicornLibreria`. Sus operaciones usan una copia previa mediante `UnicornOperaciones`: si quedan pendientes, se restaura el estado anterior al reabrir la aplicación, antes de aceptar nuevas escrituras. No equivale a transacciones SQL ni permite trabajar con varios procesos a la vez. La compactación ejecutada directamente conserva su mecanismo de bloqueo para revisión y no se recupera automáticamente con este sistema.

### Para recordarlo

> El ID identifica. La referencia conecta. El JSON indica la regla. Python la comprueba. La compactación protege el historial que sigue referenciado.
