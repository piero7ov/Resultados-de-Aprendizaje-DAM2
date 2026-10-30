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
