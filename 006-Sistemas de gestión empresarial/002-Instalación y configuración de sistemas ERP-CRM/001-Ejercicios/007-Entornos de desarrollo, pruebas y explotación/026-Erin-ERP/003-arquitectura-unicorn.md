# Arquitectura de ERIN ERP 026 con UnicornBBDD

## Objetivo

La versión 026 reemplaza completamente SQLite por UnicornBBDD. La interfaz y la organización modular de ERIN se conservan, pero todo acceso persistente debe atravesar una única capa situada en `nucleo/datos/ErinDatos.php`.

## Recorrido de los datos

```text
Interfaz HTML y JavaScript
          |
API, instalador, autenticación, usuarios y migrador
          |
nucleo/datos/ErinDatos.php
          |
nucleo/datos/unicornbbdd/UnicornBBDD.php
          |
FFI + unicornbbdd.dll
          |
Motor C++ UnicornBBDD
          |
.runtime/erin-erp-026/datos/erin_erp
```

`ErinDatos` es la única puerta de persistencia para el código de ERIN. Los consumidores no deben instanciar `UnicornBBDD`, usar FFI ni leer los archivos internos del motor.

## Responsabilidades

### Interfaz y controladores

- Reciben y validan las acciones del usuario.
- Solicitan operaciones a `ErinDatos`.
- Transforman los resultados en HTML o JSON.
- No conocen el formato físico usado por UnicornBBDD.

### Capa `ErinDatos`

- Prepara la configuración local del motor.
- Mantiene el runtime en una ruta ASCII del repositorio para evitar el límite de rutas Unicode de la DLL en Windows.
- Comprueba si la base `erin_erp` está instalada.
- Selecciona la base antes de cada operación.
- Ofrece operaciones de tablas, estructura, relaciones, consultas, CRUD y transacciones.
- Convierte los errores del conector en excepciones comprensibles para ERIN.

### Conector PHP

- Traduce las llamadas de PHP a la API C de la DLL mediante FFI.
- Convierte listas, registros y metadatos entre arrays PHP y JSON nativo.
- Libera los resultados reservados por la DLL.

### Motor UnicornBBDD

- Es el único componente que interpreta y modifica sus datos, esquemas, relaciones e índices.
- Aplica tipos, claves foráneas, restricciones y transacciones.
- Ejecuta las sentencias propias de consulta de UnicornBBDD.

## Modelo de instalación

`instalacion/diagrama.json` será el modelo declarativo de la instalación. Contiene las tablas, sus campos, tipos y relaciones.

`instalacion/esquema.sql` deja de ser una fuente ejecutable en la versión 026. Se conserva temporalmente como material heredado mientras se reemplaza el instalador. La instalación SQLite heredada está bloqueada para impedir que vuelva a crear `data/erin.sqlite`.

El nuevo instalador recorrerá el modelo declarativo y llamará a `ErinDatos` para:

1. Crear la base `erin_erp`.
2. Crear las tablas tipadas.
3. Añadir las claves foráneas y restricciones.
4. Crear las tablas internas de usuarios, permisos y versión.
5. Insertar el administrador y, cuando se solicite, los datos de demostración.

## CRUD

El CRUD dejará de construir SQL y de consultar `sqlite_master` o `PRAGMA`. Obtendrá la estructura mediante `ErinDatos::estructura()` y utilizará:

- `listar()` y `consultar()` para lectura;
- `insertar()` para altas indicando columnas;
- `actualizar()` para cambios por `id`;
- `eliminar()` para el borrado lógico de UnicornBBDD.

Las relaciones se obtendrán mediante la API pública del motor. PHP no inspeccionará archivos `.csv`, `.esquema`, `.rel`, `.tipos` ni `.idx`.

## Estado de la migración

En el primer paso de la versión 026 están preparados el runtime y la capa única de datos. El instalador, la API, la autenticación, los usuarios, la configuración de módulos y el migrador todavía conservan código SQLite heredado y se adaptarán en los siguientes pasos.
