CREATE TABLE "ActividadesComerciales" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "oportunidad" INTEGER REFERENCES "Oportunidades"("Identificador"), "fecha" TEXT, "tipo" TEXT, "descripcion" TEXT);

CREATE TABLE "Almacenes" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "nombre" TEXT, "ubicacion" TEXT);

CREATE TABLE "Asientos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa" INTEGER REFERENCES "Empresas"("Identificador"), "fecha" TEXT, "concepto" TEXT, "numero" INTEGER);

CREATE TABLE "AsientosLineas" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "asiento" INTEGER REFERENCES "Asientos"("Identificador"), "cuenta" INTEGER REFERENCES "CuentasContables"("Identificador"), "debe" REAL, "haber" REAL);

CREATE TABLE "Ausencias" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empleado" INTEGER REFERENCES "Empleados"("Identificador"), "fecha_inicio" TEXT, "fecha_fin" TEXT, "motivo" TEXT);

CREATE TABLE "Bancos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "nombre" TEXT, "codigo" TEXT);

CREATE TABLE "Campanas" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "nombre" TEXT, "fecha_inicio" TEXT, "fecha_fin" TEXT, "estado" TEXT);

CREATE TABLE "CampanasContactos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "campana" INTEGER REFERENCES "Campanas"("Identificador"), "contacto" INTEGER REFERENCES "Contactos"("Identificador"), "estado" TEXT);

CREATE TABLE "CategoriasProductos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "nombre" TEXT, "descripcion" TEXT);

CREATE TABLE "CentrosCoste" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa" INTEGER REFERENCES "Empresas"("Identificador"), "codigo" TEXT, "nombre" TEXT);

CREATE TABLE "Clientes" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "nombre" TEXT, "apellidos" TEXT, "email" TEXT, "telefono" TEXT, "ciudad" TEXT);

CREATE TABLE "Cobros" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "factura" INTEGER REFERENCES "Facturas"("Identificador"), "fecha" TEXT, "importe" REAL, "metodo" TEXT);

CREATE TABLE "Compras" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "fecha" TEXT, "estado" TEXT, "proveedor" INTEGER REFERENCES "Proveedores"("Identificador"));

CREATE TABLE "ConsumosFabricacion" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "orden" INTEGER REFERENCES "OrdenesFabricacion"("Identificador"), "producto" INTEGER REFERENCES "Productos"("Identificador"), "cantidad" REAL);

CREATE TABLE "Contactos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "cliente" INTEGER REFERENCES "Clientes"("Identificador"), "nombre" TEXT, "apellidos" TEXT, "email" TEXT, "telefono" TEXT);

CREATE TABLE "Contratos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empleado" INTEGER REFERENCES "Empleados"("Identificador"), "tipo" TEXT, "fecha_inicio" TEXT, "fecha_fin" TEXT, "salario_anual" REAL);

CREATE TABLE "CuentasBancarias" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa" INTEGER REFERENCES "Empresas"("Identificador"), "banco" INTEGER REFERENCES "Bancos"("Identificador"), "iban" TEXT, "moneda" INTEGER REFERENCES "Monedas"("Identificador"));

CREATE TABLE "CuentasContables" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa" INTEGER REFERENCES "Empresas"("Identificador"), "codigo" TEXT, "nombre" TEXT, "tipo" TEXT);

CREATE TABLE "Departamentos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "nombre" TEXT, "descripcion" TEXT);

CREATE TABLE "DetallesCompras" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "compra" INTEGER REFERENCES "Compras"("Identificador"), "producto" INTEGER REFERENCES "Productos"("Identificador"), "cantidad" INTEGER, "precio_unitario" REAL);

CREATE TABLE "DetallesFacturas" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "factura" INTEGER REFERENCES "Facturas"("Identificador"), "producto" INTEGER REFERENCES "Productos"("Identificador"), "cantidad" INTEGER, "precio_unitario" REAL);

CREATE TABLE "DetallesPedidos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "pedido" INTEGER REFERENCES "Pedidos"("Identificador"), "producto" INTEGER REFERENCES "Productos"("Identificador"), "cantidad" INTEGER, "precio_unitario" REAL);

CREATE TABLE "DetallesPresupuestos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "presupuesto" INTEGER REFERENCES "Presupuestos"("Identificador"), "producto" INTEGER REFERENCES "Productos"("Identificador"), "cantidad" INTEGER, "precio_unitario" REAL);

CREATE TABLE "Devoluciones" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "pedido" INTEGER REFERENCES "Pedidos"("Identificador"), "producto" INTEGER REFERENCES "Productos"("Identificador"), "fecha" TEXT, "cantidad" INTEGER, "motivo" TEXT);

CREATE TABLE "DiariosContables" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa" INTEGER REFERENCES "Empresas"("Identificador"), "plan" INTEGER REFERENCES "PlanesContables"("Identificador"), "codigo" TEXT, "nombre" TEXT);

CREATE TABLE "Documentos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa" INTEGER REFERENCES "Empresas"("Identificador"), "nombre" TEXT, "tipo" TEXT, "ruta" TEXT);

CREATE TABLE "Empleados" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "nombre" TEXT, "apellidos" TEXT, "fecha_nacimiento" TEXT, "email" TEXT, "telefono" TEXT, "puesto" TEXT, "fecha_contratacion" TEXT, "departamento" INTEGER REFERENCES "Departamentos"("Identificador"));

CREATE TABLE "EmpleadosFormaciones" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empleado" INTEGER REFERENCES "Empleados"("Identificador"), "formacion" INTEGER REFERENCES "Formaciones"("Identificador"), "fecha" TEXT, "resultado" TEXT);

CREATE TABLE "Empresas" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "nombre" TEXT, "cif" TEXT, "ciudad" TEXT);

CREATE TABLE "Envios" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "pedido" INTEGER REFERENCES "Pedidos"("Identificador"), "transportista" INTEGER REFERENCES "Transportistas"("Identificador"), "fecha_salida" TEXT, "fecha_entrega" TEXT, "estado" TEXT);

CREATE TABLE "Existencias" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "almacen" INTEGER REFERENCES "Almacenes"("Identificador"), "producto" INTEGER REFERENCES "Productos"("Identificador"), "cantidad" INTEGER);

CREATE TABLE "Facturas" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "numero" TEXT, "fecha" TEXT, "pedido" INTEGER REFERENCES "Pedidos"("Identificador"), "estado" TEXT, "total" REAL);

CREATE TABLE "Fichajes" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empleado" INTEGER REFERENCES "Empleados"("Identificador"), "fecha" TEXT, "entrada" TEXT, "salida" TEXT);

CREATE TABLE "Formaciones" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "nombre" TEXT, "proveedor" INTEGER REFERENCES "Proveedores"("Identificador"), "horas" REAL, "coste" REAL);

CREATE TABLE "FormasPago" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "nombre" TEXT, "plazo_dias" INTEGER);

CREATE TABLE "Inventarios" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "almacen" INTEGER REFERENCES "Almacenes"("Identificador"), "fecha" TEXT, "estado" TEXT);

CREATE TABLE "InventariosLineas" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "inventario" INTEGER REFERENCES "Inventarios"("Identificador"), "producto" INTEGER REFERENCES "Productos"("Identificador"), "cantidad_teorica" INTEGER, "cantidad_real" INTEGER);

CREATE TABLE "ListasMateriales" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "producto" INTEGER REFERENCES "Productos"("Identificador"), "version" TEXT, "activa" INTEGER);

CREATE TABLE "ListasMaterialesLineas" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "lista" INTEGER REFERENCES "ListasMateriales"("Identificador"), "componente" INTEGER REFERENCES "Productos"("Identificador"), "cantidad" REAL);

CREATE TABLE "Lotes" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "producto" INTEGER REFERENCES "Productos"("Identificador"), "codigo" TEXT, "fecha_entrada" TEXT, "caducidad" TEXT);

CREATE TABLE "Monedas" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "codigo" TEXT, "nombre" TEXT, "simbolo" TEXT, "decimales" INTEGER);

CREATE TABLE "MovimientosInventario" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "fecha" TEXT, "almacen" INTEGER REFERENCES "Almacenes"("Identificador"), "producto" INTEGER REFERENCES "Productos"("Identificador"), "tipo" TEXT, "cantidad" INTEGER, "referencia" TEXT);

CREATE TABLE "Nominas" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empleado" INTEGER REFERENCES "Empleados"("Identificador"), "anio" INTEGER, "mes" INTEGER, "bruto" REAL, "neto" REAL);

CREATE TABLE "OperacionesRuta" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "ruta" INTEGER REFERENCES "RutasFabricacion"("Identificador"), "maquina" INTEGER REFERENCES "RecursosMaquina"("Identificador"), "secuencia" INTEGER, "nombre" TEXT, "tiempo_minutos" REAL);

CREATE TABLE "Oportunidades" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "cliente" INTEGER REFERENCES "Clientes"("Identificador"), "contacto" INTEGER REFERENCES "Contactos"("Identificador"), "titulo" TEXT, "importe" REAL, "estado" TEXT);

CREATE TABLE "OrdenesFabricacion" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "producto" INTEGER REFERENCES "Productos"("Identificador"), "lista" INTEGER REFERENCES "ListasMateriales"("Identificador"), "ruta" INTEGER REFERENCES "RutasFabricacion"("Identificador"), "cantidad" INTEGER, "fecha" TEXT, "estado" TEXT);

CREATE TABLE "Pagos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "compra" INTEGER REFERENCES "Compras"("Identificador"), "fecha" TEXT, "importe" REAL, "metodo" TEXT);

CREATE TABLE "Paises" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "codigo" TEXT, "nombre" TEXT);

CREATE TABLE "PartesHoras" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "proyecto" INTEGER REFERENCES "Proyectos"("Identificador"), "empleado" INTEGER REFERENCES "Empleados"("Identificador"), "fecha" TEXT, "horas" REAL, "descripcion" TEXT);

CREATE TABLE "Pedidos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "fecha" TEXT, "estado" TEXT, "cliente" INTEGER REFERENCES "Clientes"("Identificador"));

CREATE TABLE "Permisos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "codigo" TEXT, "descripcion" TEXT);

CREATE TABLE "PlanesContables" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa" INTEGER REFERENCES "Empresas"("Identificador"), "nombre" TEXT, "ejercicio" INTEGER);

CREATE TABLE "Presupuestos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "cliente" INTEGER REFERENCES "Clientes"("Identificador"), "fecha" TEXT, "estado" TEXT, "total" REAL);

CREATE TABLE "PresupuestosFinancieros" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa" INTEGER REFERENCES "Empresas"("Identificador"), "ejercicio" INTEGER, "nombre" TEXT, "estado" TEXT);

CREATE TABLE "PresupuestosFinancierosLineas" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "presupuesto" INTEGER REFERENCES "PresupuestosFinancieros"("Identificador"), "cuenta" INTEGER REFERENCES "CuentasContables"("Identificador"), "centro_coste" INTEGER REFERENCES "CentrosCoste"("Identificador"), "mes" INTEGER, "importe" REAL);

CREATE TABLE "ProduccionesFabricacion" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "orden" INTEGER REFERENCES "OrdenesFabricacion"("Identificador"), "fecha" TEXT, "cantidad_buena" INTEGER, "cantidad_rechazada" INTEGER);

CREATE TABLE "Productos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "nombre" TEXT, "descripcion" TEXT, "precio" REAL);

CREATE TABLE "ProductosCategorias" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "producto" INTEGER REFERENCES "Productos"("Identificador"), "categoria" INTEGER REFERENCES "CategoriasProductos"("Identificador"));

CREATE TABLE "Proveedores" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "nombre" TEXT, "email" TEXT, "telefono" TEXT, "ciudad" TEXT);

CREATE TABLE "Provincias" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "pais" INTEGER REFERENCES "Paises"("Identificador"), "nombre" TEXT);

CREATE TABLE "Proyectos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "cliente" INTEGER REFERENCES "Clientes"("Identificador"), "responsable" INTEGER REFERENCES "Empleados"("Identificador"), "nombre" TEXT, "fecha_inicio" TEXT, "estado" TEXT);

CREATE TABLE "RecepcionesCompra" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "compra" INTEGER REFERENCES "Compras"("Identificador"), "almacen" INTEGER REFERENCES "Almacenes"("Identificador"), "fecha" TEXT, "estado" TEXT);

CREATE TABLE "RecursosMaquina" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa" INTEGER REFERENCES "Empresas"("Identificador"), "nombre" TEXT, "coste_hora" REAL, "activo" INTEGER);

CREATE TABLE "Roles" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "nombre" TEXT, "descripcion" TEXT);

CREATE TABLE "RolesPermisos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "rol" INTEGER REFERENCES "Roles"("Identificador"), "permiso" INTEGER REFERENCES "Permisos"("Identificador"));

CREATE TABLE "RutasFabricacion" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "producto" INTEGER REFERENCES "Productos"("Identificador"), "version" TEXT, "activa" INTEGER);

CREATE TABLE "Sedes" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa" INTEGER REFERENCES "Empresas"("Identificador"), "nombre" TEXT, "direccion" TEXT);

CREATE TABLE "SolicitudesCompra" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "proveedor" INTEGER REFERENCES "Proveedores"("Identificador"), "fecha" TEXT, "estado" TEXT);

CREATE TABLE "TareasProyecto" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "proyecto" INTEGER REFERENCES "Proyectos"("Identificador"), "responsable" INTEGER REFERENCES "Empleados"("Identificador"), "titulo" TEXT, "estado" TEXT);

CREATE TABLE "Tarifas" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "nombre" TEXT, "fecha_inicio" TEXT, "fecha_fin" TEXT);

CREATE TABLE "TarifasLineas" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "tarifa" INTEGER REFERENCES "Tarifas"("Identificador"), "producto" INTEGER REFERENCES "Productos"("Identificador"), "precio" REAL, "descuento" REAL);

CREATE TABLE "TicketsSoporte" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "cliente" INTEGER REFERENCES "Clientes"("Identificador"), "responsable" INTEGER REFERENCES "Empleados"("Identificador"), "asunto" TEXT, "fecha" TEXT, "estado" TEXT);

CREATE TABLE "TiposCambio" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "moneda_origen" INTEGER REFERENCES "Monedas"("Identificador"), "moneda_destino" INTEGER REFERENCES "Monedas"("Identificador"), "fecha" TEXT, "cambio" REAL);

CREATE TABLE "TiposIVA" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "nombre" TEXT, "porcentaje" REAL);

CREATE TABLE "Transportistas" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "nombre" TEXT, "telefono" TEXT);

CREATE TABLE "UbicacionesAlmacen" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "almacen" INTEGER REFERENCES "Almacenes"("Identificador"), "codigo" TEXT, "descripcion" TEXT);

CREATE TABLE "UnidadesMedida" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "codigo" TEXT, "nombre" TEXT, "simbolo" TEXT);

CREATE TABLE "Usuarios" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa" INTEGER REFERENCES "Empresas"("Identificador"), "empleado" INTEGER REFERENCES "Empleados"("Identificador"), "nombre_usuario" TEXT, "email" TEXT, "activo" INTEGER);

CREATE TABLE "UsuariosRoles" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "usuario" INTEGER REFERENCES "Usuarios"("Identificador"), "rol" INTEGER REFERENCES "Roles"("Identificador"));

CREATE TABLE "VariantesProducto" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "producto" INTEGER REFERENCES "Productos"("Identificador"), "unidad" INTEGER REFERENCES "UnidadesMedida"("Identificador"), "tipo_iva" INTEGER REFERENCES "TiposIVA"("Identificador"), "codigo" TEXT, "descripcion" TEXT);
