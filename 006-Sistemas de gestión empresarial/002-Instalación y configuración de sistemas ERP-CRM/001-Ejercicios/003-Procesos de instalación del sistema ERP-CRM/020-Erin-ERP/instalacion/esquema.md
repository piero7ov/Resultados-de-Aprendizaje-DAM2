Clientes
	-nombre
	-apellidos
	-email
	-telefono
	-ciudad

Productos
	-nombre
	-descripcion
	-precio:REAL

Pedidos
	-fecha
	-estado
	-cliente FK Clientes

DetallesPedidos
	-pedido FK Pedidos
	-producto FK Productos
	-cantidad:INTEGER
	-precio_unitario:REAL

Departamentos
	-nombre
	-descripcion

Empleados
	-nombre
	-apellidos
	-fecha_nacimiento
	-email
	-telefono
	-puesto
	-fecha_contratacion
	-departamento FK Departamentos

Proveedores
	-nombre
	-email
	-telefono
	-ciudad

Compras
	-fecha
	-estado
	-proveedor FK Proveedores

DetallesCompras
	-compra FK Compras
	-producto FK Productos
	-cantidad:INTEGER
	-precio_unitario:REAL

Almacenes
	-nombre
	-ubicacion

Existencias
	-almacen FK Almacenes
	-producto FK Productos
	-cantidad:INTEGER

MovimientosInventario
	-fecha
	-almacen FK Almacenes
	-producto FK Productos
	-tipo
	-cantidad:INTEGER
	-referencia

Facturas
	-numero
	-fecha
	-pedido FK Pedidos
	-estado
	-total:REAL

DetallesFacturas
	-factura FK Facturas
	-producto FK Productos
	-cantidad:INTEGER
	-precio_unitario:REAL

Transportistas
	-nombre
	-telefono

Envios
	-pedido FK Pedidos
	-transportista FK Transportistas
	-fecha_salida
	-fecha_entrega
	-estado

Ausencias
	-empleado FK Empleados
	-fecha_inicio
	-fecha_fin
	-motivo

Empresas
	-nombre
	-cif
	-ciudad

Sedes
	-empresa FK Empresas
	-nombre
	-direccion

Roles
	-nombre
	-descripcion

Usuarios
	-empresa FK Empresas
	-empleado FK Empleados
	-nombre_usuario
	-email
	-activo:INTEGER

UsuariosRoles
	-usuario FK Usuarios
	-rol FK Roles

Contactos
	-cliente FK Clientes
	-nombre
	-apellidos
	-email
	-telefono

Oportunidades
	-cliente FK Clientes
	-contacto FK Contactos
	-titulo
	-importe:REAL
	-estado

ActividadesComerciales
	-oportunidad FK Oportunidades
	-fecha
	-tipo
	-descripcion

CategoriasProductos
	-nombre
	-descripcion

ProductosCategorias
	-producto FK Productos
	-categoria FK CategoriasProductos

Presupuestos
	-cliente FK Clientes
	-fecha
	-estado
	-total:REAL

DetallesPresupuestos
	-presupuesto FK Presupuestos
	-producto FK Productos
	-cantidad:INTEGER
	-precio_unitario:REAL

Devoluciones
	-pedido FK Pedidos
	-producto FK Productos
	-fecha
	-cantidad:INTEGER
	-motivo

SolicitudesCompra
	-proveedor FK Proveedores
	-fecha
	-estado

RecepcionesCompra
	-compra FK Compras
	-almacen FK Almacenes
	-fecha
	-estado

Lotes
	-producto FK Productos
	-codigo
	-fecha_entrada
	-caducidad

Inventarios
	-almacen FK Almacenes
	-fecha
	-estado

InventariosLineas
	-inventario FK Inventarios
	-producto FK Productos
	-cantidad_teorica:INTEGER
	-cantidad_real:INTEGER

CuentasContables
	-empresa FK Empresas
	-codigo
	-nombre
	-tipo

Asientos
	-empresa FK Empresas
	-fecha
	-concepto
	-numero:INTEGER

AsientosLineas
	-asiento FK Asientos
	-cuenta FK CuentasContables
	-debe:REAL
	-haber:REAL

Pagos
	-compra FK Compras
	-fecha
	-importe:REAL
	-metodo

Cobros
	-factura FK Facturas
	-fecha
	-importe:REAL
	-metodo

Contratos
	-empleado FK Empleados
	-tipo
	-fecha_inicio
	-fecha_fin
	-salario_anual:REAL

Fichajes
	-empleado FK Empleados
	-fecha
	-entrada
	-salida

Nominas
	-empleado FK Empleados
	-anio:INTEGER
	-mes:INTEGER
	-bruto:REAL
	-neto:REAL

Proyectos
	-cliente FK Clientes
	-responsable FK Empleados
	-nombre
	-fecha_inicio
	-estado

TareasProyecto
	-proyecto FK Proyectos
	-responsable FK Empleados
	-titulo
	-estado

TicketsSoporte
	-cliente FK Clientes
	-responsable FK Empleados
	-asunto
	-fecha
	-estado

Campanas
	-nombre
	-fecha_inicio
	-fecha_fin
	-estado

CampanasContactos
	-campana FK Campanas
	-contacto FK Contactos
	-estado

Documentos
	-empresa FK Empresas
	-nombre
	-tipo
	-ruta

Monedas
	-codigo
	-nombre
	-simbolo
	-decimales:INTEGER

TiposCambio
	-moneda_origen FK Monedas
	-moneda_destino FK Monedas
	-fecha
	-cambio:REAL

Paises
	-codigo
	-nombre

Provincias
	-pais FK Paises
	-nombre

Permisos
	-codigo
	-descripcion

RolesPermisos
	-rol FK Roles
	-permiso FK Permisos

FormasPago
	-nombre
	-plazo_dias:INTEGER

Bancos
	-nombre
	-codigo

CuentasBancarias
	-empresa FK Empresas
	-banco FK Bancos
	-iban
	-moneda FK Monedas

UnidadesMedida
	-codigo
	-nombre
	-simbolo

TiposIVA
	-nombre
	-porcentaje:REAL

VariantesProducto
	-producto FK Productos
	-unidad FK UnidadesMedida
	-tipo_iva FK TiposIVA
	-codigo
	-descripcion

Tarifas
	-nombre
	-fecha_inicio
	-fecha_fin

TarifasLineas
	-tarifa FK Tarifas
	-producto FK Productos
	-precio:REAL
	-descuento:REAL

UbicacionesAlmacen
	-almacen FK Almacenes
	-codigo
	-descripcion

PlanesContables
	-empresa FK Empresas
	-nombre
	-ejercicio:INTEGER

DiariosContables
	-empresa FK Empresas
	-plan FK PlanesContables
	-codigo
	-nombre

CentrosCoste
	-empresa FK Empresas
	-codigo
	-nombre

PresupuestosFinancieros
	-empresa FK Empresas
	-ejercicio:INTEGER
	-nombre
	-estado

PresupuestosFinancierosLineas
	-presupuesto FK PresupuestosFinancieros
	-cuenta FK CuentasContables
	-centro_coste FK CentrosCoste
	-mes:INTEGER
	-importe:REAL

Formaciones
	-nombre
	-proveedor FK Proveedores
	-horas:REAL
	-coste:REAL

EmpleadosFormaciones
	-empleado FK Empleados
	-formacion FK Formaciones
	-fecha
	-resultado

PartesHoras
	-proyecto FK Proyectos
	-empleado FK Empleados
	-fecha
	-horas:REAL
	-descripcion

RecursosMaquina
	-empresa FK Empresas
	-nombre
	-coste_hora:REAL
	-activo:INTEGER

ListasMateriales
	-producto FK Productos
	-version
	-activa:INTEGER

ListasMaterialesLineas
	-lista FK ListasMateriales
	-componente FK Productos
	-cantidad:REAL

RutasFabricacion
	-producto FK Productos
	-version
	-activa:INTEGER

OperacionesRuta
	-ruta FK RutasFabricacion
	-maquina FK RecursosMaquina
	-secuencia:INTEGER
	-nombre
	-tiempo_minutos:REAL

OrdenesFabricacion
	-producto FK Productos
	-lista FK ListasMateriales
	-ruta FK RutasFabricacion
	-cantidad:INTEGER
	-fecha
	-estado

ConsumosFabricacion
	-orden FK OrdenesFabricacion
	-producto FK Productos
	-cantidad:REAL

ProduccionesFabricacion
	-orden FK OrdenesFabricacion
	-fecha
	-cantidad_buena:INTEGER
	-cantidad_rechazada:INTEGER
