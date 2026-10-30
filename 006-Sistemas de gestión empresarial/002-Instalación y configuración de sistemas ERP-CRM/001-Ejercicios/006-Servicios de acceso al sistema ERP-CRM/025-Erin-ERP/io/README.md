# API E/S de ERIN

La API permite que aplicaciones externas lean e inserten datos de ERIN mediante JSON. El punto de acceso es `io/es.php`.

## Configurar la clave

La clave privada se guarda en `io/.env`, fuera de la documentación y bloqueada para peticiones HTTP mediante `.htaccess`. El archivo ya está preparado para esta instalación local. Para otra instalación, copia `.env.example` como `.env` y establece `ERIN_API_KEY` con una clave propia. También se puede configurar la variable de entorno `ERIN_API_KEY` en PHP; si existe, tiene prioridad sobre el archivo.

Todas las peticiones deben enviar `X-API-Key`. También se acepta `Authorization: Bearer ...`. No envíes la clave como parámetro de la URL.

## Tablas disponibles

Se aceptan tablas de negocio existentes con el campo `Identificador`. Las tablas SQLite internas y las tablas `erin_*` quedan excluidas. La tabla `usuarios` también se bloquea para impedir que esta API exponga datos de acceso.

## Acciones

| Acción | Método | Parámetros | Resultado |
|---|---|---|---|
| `selectone` | GET | `tabla`, `id` | Un registro |
| `selectmany` | GET | `tabla` | Todos los registros de la tabla |
| `insertone` | POST | `tabla` y un objeto JSON | Identificador creado |
| `insertmany` | POST | `tabla` y un array JSON | Identificadores creados; operación atómica |

Las inserciones omiten `Identificador`, que genera SQLite. Los campos enviados deben existir en la tabla. Las claves foráneas se comprueban en SQLite. El cuerpo JSON tiene un máximo de 1 MB y `insertmany` admite hasta 500 registros.

## URL local en Windows

Arranca Apache desde XAMPP. Sustituye `RUTA_025` por la ruta de la carpeta `025-Erin-ERP` relativa a `C:\\xampp\\htdocs`, usando `/` en la URL. Por ejemplo, si la carpeta está en `C:\\xampp\\htdocs\\pruebas\\025-Erin-ERP`, la base de la URL es `http://localhost/pruebas/025-Erin-ERP`.

En PowerShell usa `curl.exe` y el acento grave `` ` `` para continuar un comando en otra línea.

## PowerShell: insertar y verificar un registro

En Windows PowerShell, `Invoke-RestMethod` evita problemas al pasar comillas JSON a `curl.exe`. Estos valores corresponden a la ubicación actual de 025. La clave se lee de `.env` sin imprimirla:

```powershell
$api = 'http://localhost/DAM2PieroOlivares/006-Sistemas%20de%20gesti%C3%B3n%20empresarial/002-Instalaci%C3%B3n%20y%20configuraci%C3%B3n%20de%20sistemas%20ERP-CRM/006-Servicios%20de%20acceso%20al%20sistema%20ERP-CRM/025-Erin-ERP/io/es.php'
$rutaClave = 'C:\xampp\htdocs\DAM2PieroOlivares\006-Sistemas de gestión empresarial\002-Instalación y configuración de sistemas ERP-CRM\006-Servicios de acceso al sistema ERP-CRM\025-Erin-ERP\io\.env'
$contenidoClave = Get-Content -Raw -LiteralPath $rutaClave
$clave = [regex]::Match($contenidoClave, '(?m)^ERIN_API_KEY="([^"]+)"').Groups[1].Value
if (-not $clave) { throw 'No se encontró la clave API' }
Invoke-RestMethod -Uri "$($api)?accion=selectmany&tabla=empresas" -Headers @{ 'X-API-Key' = $clave }
```

La consulta muestra las empresas disponibles. Usa un `empresa_id` existente; en esta instalación, el `1` corresponde a Brumalia. Este ejemplo crea un cliente llamado Pepe:

```powershell
$datos = @{ empresa_id = 1; nombre = 'Pepe' } | ConvertTo-Json -Compress
$respuesta = Invoke-RestMethod `
  -Uri "$($api)?accion=insertone&tabla=clientes" `
  -Method Post `
  -Headers @{ 'X-API-Key' = $clave } `
  -ContentType 'application/json' `
  -Body $datos
$respuesta
```

La respuesta incluye el `Identificador` nuevo. Verifícalo con una consulta:

```powershell
$id = $respuesta.Identificador
Invoke-RestMethod `
  -Uri "$($api)?accion=selectone&tabla=clientes&id=$id" `
  -Headers @{ 'X-API-Key' = $clave }
```

Si no quieres asociar el cliente a una empresa, omite `empresa_id` del objeto `$datos`. Ejecuta el `POST` una sola vez para evitar crear duplicados.

## SELECT MANY

```powershell
curl.exe -H "X-API-Key: TU_CLAVE" "http://localhost/RUTA_025/io/es.php?accion=selectmany&tabla=clientes"
```

## SELECT ONE

```powershell
curl.exe -H "X-API-Key: TU_CLAVE" "http://localhost/RUTA_025/io/es.php?accion=selectone&tabla=clientes&id=1"
```

## INSERT ONE: crear un cliente

Antes de insertar, comprueba qué `empresa_id` usarás. Debe existir en la tabla `empresas`; si quieres crear el cliente sin asociarlo a una empresa, envía `null`.

```powershell
curl.exe -X POST `
  -H "Content-Type: application/json" `
  -H "X-API-Key: TU_CLAVE" `
  -d '{"empresa_id":1,"nombre":"Cliente de prueba","cif":"B12345678","email":"cliente@example.com","telefono":"600000000","direccion":"Ayacucho"}' `
  "http://localhost/RUTA_025/io/es.php?accion=insertone&tabla=clientes"
```

La respuesta correcta tiene estado HTTP `201` e incluye el `Identificador`. Guarda ese número para consultar el nuevo registro con `selectone`. El ejemplo añade un registro real a la base instalada.

## INSERT MANY

```powershell
curl.exe -X POST `
  -H "Content-Type: application/json" `
  -H "X-API-Key: TU_CLAVE" `
  -d '[{"empresa_id":1,"nombre":"Cliente A"},{"empresa_id":1,"nombre":"Cliente B"}]' `
  "http://localhost/RUTA_025/io/es.php?accion=insertmany&tabla=clientes"
```

`insertmany` usa una transacción: si falla un registro, ninguno de los registros de esa petición queda insertado.

## Respuestas y códigos HTTP

- `200`: consulta correcta.
- `201`: inserción correcta.
- `400`: parámetros o JSON incorrectos, o una relación no válida.
- `401`: falta una clave válida.
- `403`: tabla no permitida.
- `404`: tabla o registro no disponible.
- `405`: método HTTP incorrecto.
- `409`: conflicto con una restricción de unicidad.
- `413`: cuerpo o lote demasiado grande.
- `415`: falta `Content-Type: application/json`.
- `503`: ERIN no está instalado o falta configurar la clave.

Las respuestas JSON incluyen `ok` y, en caso de error, `error`. Los detalles internos de SQLite no se devuelven al cliente.

## Carpetas

- `entrada/`: reservada para futuras funciones de recepción.
- `salida/`: reservada para futuras funciones de exportación.
- `es.php`: endpoint que atiende las cuatro acciones de esta versión.
