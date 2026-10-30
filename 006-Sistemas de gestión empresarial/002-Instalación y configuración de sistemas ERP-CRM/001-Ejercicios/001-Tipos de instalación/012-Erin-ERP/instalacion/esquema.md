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
