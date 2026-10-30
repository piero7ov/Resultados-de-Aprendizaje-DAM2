# Arquitectura de ERIN ERP 028

## Capas

```text
HTML, CSS y JavaScript
          │
Controladores PHP: API, instalación, acceso, usuarios y migración
          │
nucleo/datos/ErinDatos.php
          │
Conector PHP por FFI + unicornbbdd.dll
          │
Motor C++ UnicornBBDD
          │
.runtime/erin-erp-028/datos/<base-activa>
```

`ErinDatos` es la única capa del núcleo autorizada para acceder a la persistencia. El resto de ERIN no usa PDO, SQLite, FFI ni los archivos físicos del motor.

## Modelo e instalación

`instalacion/diagrama.json` declara las entidades, tipos y relaciones. Cada preset aporta su diagrama y sus módulos. El instalador crea las tablas, carga los datos conservando sus identificadores, añade las claves foráneas, comprueba la integridad y registra la versión 0.23.

`base-activa.json` indica qué base física atiende ERIN. Una actualización se construye y valida en otra base antes de cambiar ese puntero; la base anterior queda disponible en la pantalla de recuperación.

Los archivos `esquema.sql` permanecen como historial de versiones anteriores y no son una fuente ejecutable. Los archivos de demostración con sentencias INSERT se leen como formato de datos heredado: ERIN extrae sus valores sin ejecutar SQL. Durante la importación se crea un mapa de identificadores para conservar las relaciones aunque existan huecos en la numeración original.

## Convenciones de datos

UnicornBBDD crea `id` y `activo` como campos técnicos. La capa presenta `id` como `Identificador` y oculta el `activo` técnico. Si un modelo contiene un campo empresarial llamado `activo`, se guarda físicamente con un nombre reservado y se devuelve como `activo`.

Los tipos del diseñador se traducen así:

| Modelo ERIN | UnicornBBDD |
|---|---|
| INTEGER | ENTERO |
| REAL o NUMERIC | DECIMAL |
| TEXT o BLOB | TEXTO |

## Funciones conectadas

- `api/api.php`: estado, módulos, menús, estructura, registros, relaciones y CRUD.
- `api/acceso.php`: inicio, estado y cierre de sesión.
- `usuarios.php`: perfil, usuarios, roles y permisos.
- `configuracion.php`: módulos y asignación de tablas.
- `io/es.php`: selectone, selectmany, insertone e insertmany.
- `instalacion/instalar.php`: presets, base principal, datos de muestra y bases adicionales.
- `instalacion/disenador.php`: edición y validación de `diagrama.json`.
- `instalacion/migrar.php`: comparación, copia JSON y reconstrucción compatible.

## Migraciones

El migrador compara las tablas y campos visibles del motor con el diagrama. Antes de reconstruir guarda tablas, estructura y registros en `data/copias`. Después crea el nuevo modelo, reasigna identificadores, actualiza las claves foráneas y restaura usuarios y permisos.

## Ejecución

La aplicación debe abrirse desde Apache con PHP y FFI habilitado. `index.html` consulta el estado de UnicornBBDD; si la base `erin_erp` no existe, dirige al instalador.

