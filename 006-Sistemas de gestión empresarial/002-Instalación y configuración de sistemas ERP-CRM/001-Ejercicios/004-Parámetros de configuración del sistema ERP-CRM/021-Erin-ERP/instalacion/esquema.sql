CREATE TABLE "categorias" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa_id" INTEGER REFERENCES "empresas"("Identificador"), "nombre" TEXT);

CREATE TABLE "clientes" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa_id" INTEGER REFERENCES "empresas"("Identificador"), "nombre" TEXT, "cif" TEXT, "email" TEXT, "telefono" TEXT, "direccion" TEXT);

CREATE TABLE "compras" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa_id" INTEGER REFERENCES "empresas"("Identificador"), "proveedor_id" INTEGER REFERENCES "proveedores"("Identificador"), "fecha" TEXT, "total" REAL);

CREATE TABLE "compras_lineas" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "compra_id" INTEGER REFERENCES "compras"("Identificador"), "producto_id" INTEGER REFERENCES "productos"("Identificador"), "cantidad" REAL, "precio" REAL);

CREATE TABLE "empleados" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa_id" INTEGER REFERENCES "empresas"("Identificador"), "nombre" TEXT, "email" TEXT, "telefono" TEXT, "puesto" TEXT);

CREATE TABLE "empresas" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "nombre" TEXT, "cif" TEXT, "email" TEXT, "telefono" TEXT);

CREATE TABLE "facturas" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa_id" INTEGER REFERENCES "empresas"("Identificador"), "cliente_id" INTEGER REFERENCES "clientes"("Identificador"), "pedido_id" INTEGER REFERENCES "pedidos"("Identificador"), "numero" TEXT, "fecha" TEXT, "estado" TEXT, "total" REAL);

CREATE TABLE "pedidos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa_id" INTEGER REFERENCES "empresas"("Identificador"), "cliente_id" INTEGER REFERENCES "clientes"("Identificador"), "fecha" TEXT, "estado" TEXT, "total" REAL);

CREATE TABLE "pedidos_lineas" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "pedido_id" INTEGER REFERENCES "pedidos"("Identificador"), "producto_id" INTEGER REFERENCES "productos"("Identificador"), "cantidad" REAL, "precio" REAL);

CREATE TABLE "productos" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa_id" INTEGER REFERENCES "empresas"("Identificador"), "categoria_id" INTEGER REFERENCES "categorias"("Identificador"), "codigo" TEXT, "nombre" TEXT, "precio" REAL, "stock" REAL);

CREATE TABLE "proveedores" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa_id" INTEGER REFERENCES "empresas"("Identificador"), "nombre" TEXT, "cif" TEXT, "email" TEXT, "telefono" TEXT);

CREATE TABLE "usuarios" ("Identificador" INTEGER PRIMARY KEY AUTOINCREMENT, "empresa_id" INTEGER REFERENCES "empresas"("Identificador"), "username" TEXT, "password_hash" TEXT, "nombre" TEXT, "email" TEXT, "activo" INTEGER);
