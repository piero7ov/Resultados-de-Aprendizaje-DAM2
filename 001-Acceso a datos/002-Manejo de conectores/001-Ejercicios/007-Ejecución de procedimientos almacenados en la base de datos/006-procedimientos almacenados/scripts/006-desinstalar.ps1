$ErrorActionPreference = 'Stop'

$carpetaPython = py -m site --user-site
if ($LASTEXITCODE -ne 0) { throw 'No se ha podido localizar la carpeta de paquetes de Python.' }
$modulo = Join-Path $carpetaPython.Trim() 'pierodevbbdd.pyd'
if (Test-Path -LiteralPath $modulo) { Remove-Item -LiteralPath $modulo }

$rutaConfiguracion = Join-Path $env:APPDATA 'PierodevBBDD\config.json'
if (Test-Path -LiteralPath $rutaConfiguracion) { Remove-Item -LiteralPath $rutaConfiguracion }
Write-Output 'Modulo y configuracion eliminados. Los datos se conservan.'

