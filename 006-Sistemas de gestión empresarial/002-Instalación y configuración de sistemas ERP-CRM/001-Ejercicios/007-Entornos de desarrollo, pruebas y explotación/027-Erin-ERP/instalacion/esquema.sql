PRAGMA foreign_keys = ON;

CREATE TABLE "empresas" (
  "Identificador" INTEGER PRIMARY KEY AUTOINCREMENT,
  "nombre" TEXT,
  "cif" TEXT,
  "email" TEXT,
  "telefono" TEXT
);

CREATE TABLE "usuarios" (
  "Identificador" INTEGER PRIMARY KEY AUTOINCREMENT,
  "empresa_id" INTEGER,
  "username" TEXT,
  "password_hash" TEXT,
  "nombre" TEXT,
  "email" TEXT,
  "activo" INTEGER,
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("Identificador")
);

CREATE TABLE "clientes" (
  "Identificador" INTEGER PRIMARY KEY AUTOINCREMENT,
  "empresa_id" INTEGER,
  "nombre" TEXT,
  "cif" TEXT,
  "email" TEXT,
  "telefono" TEXT,
  "direccion" TEXT,
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("Identificador")
);

CREATE TABLE "proveedores" (
  "Identificador" INTEGER PRIMARY KEY AUTOINCREMENT,
  "empresa_id" INTEGER,
  "nombre" TEXT,
  "cif" TEXT,
  "email" TEXT,
  "telefono" TEXT,
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("Identificador")
);

CREATE TABLE "categorias" (
  "Identificador" INTEGER PRIMARY KEY AUTOINCREMENT,
  "empresa_id" INTEGER,
  "nombre" TEXT,
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("Identificador")
);

CREATE TABLE "productos" (
  "Identificador" INTEGER PRIMARY KEY AUTOINCREMENT,
  "empresa_id" INTEGER,
  "categoria_id" INTEGER,
  "codigo" TEXT,
  "nombre" TEXT,
  "precio" REAL,
  "stock" REAL,
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("Identificador"),
  FOREIGN KEY ("categoria_id") REFERENCES "categorias"("Identificador")
);

CREATE TABLE "pedidos" (
  "Identificador" INTEGER PRIMARY KEY AUTOINCREMENT,
  "empresa_id" INTEGER,
  "cliente_id" INTEGER,
  "fecha" TEXT,
  "estado" TEXT,
  "total" REAL,
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("Identificador"),
  FOREIGN KEY ("cliente_id") REFERENCES "clientes"("Identificador")
);

CREATE TABLE "pedidos_lineas" (
  "Identificador" INTEGER PRIMARY KEY AUTOINCREMENT,
  "pedido_id" INTEGER,
  "producto_id" INTEGER,
  "cantidad" REAL,
  "precio" REAL,
  FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("Identificador"),
  FOREIGN KEY ("producto_id") REFERENCES "productos"("Identificador")
);

CREATE TABLE "facturas" (
  "Identificador" INTEGER PRIMARY KEY AUTOINCREMENT,
  "empresa_id" INTEGER,
  "cliente_id" INTEGER,
  "pedido_id" INTEGER,
  "numero" TEXT,
  "fecha" TEXT,
  "estado" TEXT,
  "total" REAL,
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("Identificador"),
  FOREIGN KEY ("cliente_id") REFERENCES "clientes"("Identificador"),
  FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("Identificador")
);

CREATE TABLE "compras" (
  "Identificador" INTEGER PRIMARY KEY AUTOINCREMENT,
  "empresa_id" INTEGER,
  "proveedor_id" INTEGER,
  "fecha" TEXT,
  "total" REAL,
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("Identificador"),
  FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("Identificador")
);

CREATE TABLE "compras_lineas" (
  "Identificador" INTEGER PRIMARY KEY AUTOINCREMENT,
  "compra_id" INTEGER,
  "producto_id" INTEGER,
  "cantidad" REAL,
  "precio" REAL,
  FOREIGN KEY ("compra_id") REFERENCES "compras"("Identificador"),
  FOREIGN KEY ("producto_id") REFERENCES "productos"("Identificador")
);

CREATE TABLE "empleados" (
  "Identificador" INTEGER PRIMARY KEY AUTOINCREMENT,
  "empresa_id" INTEGER,
  "nombre" TEXT,
  "email" TEXT,
  "telefono" TEXT,
  "puesto" TEXT,
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("Identificador")
);
