# Modelo de datos de Erin-erp

La base `Erin-erp` contiene información ficticia de una empresa. Cada tabla recibe automáticamente las columnas `id` (identificador) y `activo` (borrado lógico) del motor UnicornBBDD.

| Tabla | Columnas propias y tipos | Relaciones |
| --- | --- | --- |
| `empresas` | `nombre:TEXTO`, `cif:TEXTO` | Tabla principal. |
| `clientes` | `empresa_id:ENTERO`, `nombre:TEXTO`, `email:TEXTO`, `telefono:TEXTO` | `empresa_id → empresas.id`. |
| `proveedores` | `empresa_id:ENTERO`, `nombre:TEXTO`, `email:TEXTO`, `telefono:TEXTO` | `empresa_id → empresas.id`. |
| `categorias` | `empresa_id:ENTERO`, `nombre:TEXTO` | `empresa_id → empresas.id`. |
| `productos` | `empresa_id:ENTERO`, `categoria_id:ENTERO`, `codigo:TEXTO`, `nombre:TEXTO`, `precio:DECIMAL`, `stock:ENTERO` | Empresa y categoría. |
| `pedidos` | `empresa_id:ENTERO`, `cliente_id:ENTERO`, `fecha:FECHA`, `estado:TEXTO`, `total:DECIMAL` | Empresa y cliente. |
| `pedidos_lineas` | `pedido_id:ENTERO`, `producto_id:ENTERO`, `cantidad:ENTERO`, `precio:DECIMAL` | Pedido y producto. |
| `facturas` | `empresa_id:ENTERO`, `cliente_id:ENTERO`, `pedido_id:ENTERO`, `numero:TEXTO`, `fecha:FECHA`, `total:DECIMAL` | Empresa, cliente y pedido. |
| `compras` | `empresa_id:ENTERO`, `proveedor_id:ENTERO`, `fecha:FECHA`, `total:DECIMAL` | Empresa y proveedor. |
| `compras_lineas` | `compra_id:ENTERO`, `producto_id:ENTERO`, `cantidad:ENTERO`, `precio:DECIMAL` | Compra y producto. |

El cargador marca como `NO NULO` los campos necesarios para identificar entidades, relaciones, fechas, cantidades e importes. Son `UNICO` el CIF de la empresa, los correos de clientes y proveedores, los códigos de productos y los números de factura. Hay índices secundarios en `clientes.email`, `productos.codigo`, `pedidos.cliente_id`, `pedidos_lineas.pedido_id`, `facturas.pedido_id` y `compras.proveedor_id`.

## Ejemplo de relación

Un pedido guarda `cliente_id=1`. Sus líneas guardan `pedido_id` y `producto_id`; el precio de la línea queda almacenado aunque después cambie el precio del producto. La factura guarda el `pedido_id` al que corresponde. El motor comprueba que los identificadores referenciados existan.

```text
empresas ── clientes ── pedidos ── pedidos_lineas ── productos ── categorias
                            └── facturas
empresas ── proveedores ── compras ── compras_lineas ── productos
```

## Datos iniciales

La carga contiene 1 empresa, 40 clientes, 15 proveedores, 10 categorías, 100 productos, 100 pedidos con 250 líneas, 74 facturas y 60 compras con 150 líneas: **800 registros iniciales**. Los nombres de clientes y proveedores, los datos de contacto y los precios son ficticios; el catálogo representa productos y servicios habituales. Los totales de pedidos, facturas y compras se calculan desde sus líneas con `Decimal` en el cargador; el tipo `DECIMAL` del motor sigue siendo de punto flotante y no debe usarse aún para facturación real. Al actualizar el catálogo de una base ya creada, sus pedidos y facturas conservan los importes históricos.

La base se puede ampliar manualmente. Para crear un cliente en la consola, primero ejecuta `USAR Erin-erp`; después usa `INSERTAR EN clientes VALORES (...)` siguiendo el orden de columnas de la tabla. Hay un comando completo en [004-README.md](../004-README.md).
