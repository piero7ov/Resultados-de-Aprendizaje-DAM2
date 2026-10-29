$ErrorActionPreference = 'Stop'

$carpetaPython = py -m site --user-site
if ($LASTEXITCODE -ne 0) { throw 'No se ha podido localizar la carpeta de paquetes de Python.' }
$modulo = Join-Path $carpetaPython.Trim() 'pierodevbbdd.pyd'
if (Test-Path -LiteralPath $modulo) { Remove-Item -LiteralPath $modulo }

Write-Output 'Modulo eliminado. La configuracion y los datos se conservan.'

