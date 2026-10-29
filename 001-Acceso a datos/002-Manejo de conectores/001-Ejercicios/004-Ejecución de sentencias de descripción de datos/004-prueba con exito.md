# 004 - Prueba con éxito

Prueba manual realizada el 05/10/2026 con `003-pierodevbbdd.exe` y datos ficticios. Las siete operaciones DDL previstas respondieron `OK`. Se comprobó que al añadir una columna los registros existentes reciben un valor vacío, que al renombrarla se conserva su valor, que al renombrar la tabla se conservan los registros y que `TRUNCAR TABLA` mantiene el esquema y reinicia los identificadores. Al final se eliminaron la tabla y la base de prueba.

## Transcripción

```text
PS C:\xampp\htdocs\DAM2PieroOlivares\001-Acceso a datos\002-Manejo de conectores\004-Ejecución de sentencias de descripción de datos\003-sentencias DDL> .\003-pierodevbbdd.exe
PierodevBBDD - terminal
Configuracion: C:\Users\piero\AppData\Roaming\PierodevBBDD\config.json
Datos: C:\Users\piero\AppData\Local\PierodevBBDD\datos
Comandos:
  CREAR BASE nombre
  USAR nombre
  CREAR TABLA nombre columna1,columna2
  INSERTAR tabla valor1,valor2
  SELECCIONAR tabla id
  LISTAR tabla
  BUSCAR tabla columna valor
  ACTUALIZAR tabla id valor1,valor2
  ELIMINAR tabla id
  COMPACTAR tabla
  ESQUEMA tabla
  ALTERAR TABLA tabla ANADIR COLUMNA columna
  ALTERAR TABLA tabla ELIMINAR COLUMNA columna
  ALTERAR TABLA tabla RENOMBRAR COLUMNA anterior nueva
  RENOMBRAR TABLA anterior nueva
  TRUNCAR TABLA tabla
  ELIMINAR TABLA tabla
  ELIMINAR BASE nombre
  AYUDA
  SALIR
pierodev> USAR prueba_ddl_ficticia
OK
pierodev[prueba_ddl_ficticia]> CREAR TABLA clientes nombre,correo
OK
pierodev[prueba_ddl_ficticia]> INSERTAR clientes Ana_Prueba,ana@ejemplo.invalid
ID=1
pierodev[prueba_ddl_ficticia]> ALTERAR TABLA clientes ANADIR COLUMNA telefono
OK
pierodev[prueba_ddl_ficticia]> SELECCIONAR clientes 1
activo=1  correo=ana@ejemplo.invalid  id=1  nombre=Ana_Prueba  telefono=
pierodev[prueba_ddl_ficticia]> ACTUALIZAR clientes 1 Ana_Prueba,ana@ejemplo.invalid,600000001
OK
pierodev[prueba_ddl_ficticia]> ALTERAR TABLA clientes RENOMBRAR COLUMNA telefono movil
OK
pierodev[prueba_ddl_ficticia]> SELECCIONAR clientes 1
activo=1  correo=ana@ejemplo.invalid  id=1  movil=600000001  nombre=Ana_Prueba
pierodev[prueba_ddl_ficticia]> ALTERAR TABLA clientes ELIMINAR COLUMNA movil
OK
pierodev[prueba_ddl_ficticia]> RENOMBRAR TABLA clientes personas
OK
pierodev[prueba_ddl_ficticia]> LISTAR personas
activo=1  correo=ana@ejemplo.invalid  id=1  nombre=Ana_Prueba
pierodev[prueba_ddl_ficticia]> TRUNCAR TABLA personas
OK
pierodev[prueba_ddl_ficticia]> ESQUEMA personas
id,activo,nombre,correo
pierodev[prueba_ddl_ficticia]> INSERTAR personas Sol_Prueba,sol@ejemplo.invalid
ID=1
pierodev[prueba_ddl_ficticia]> ELIMINAR TABLA personas
OK
pierodev[prueba_ddl_ficticia]> ELIMINAR BASE prueba_ddl_ficticia
OK
pierodev> SALIR
PS C:\xampp\htdocs\DAM2PieroOlivares\001-Acceso a datos\002-Manejo de conectores\004-Ejecución de sentencias de descripción de datos\003-sentencias DDL>
```
