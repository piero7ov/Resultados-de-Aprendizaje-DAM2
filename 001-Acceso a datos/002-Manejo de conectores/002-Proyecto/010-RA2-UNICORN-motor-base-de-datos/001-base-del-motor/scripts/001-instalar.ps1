$ErrorActionPreference = 'Stop'

$modulo = Join-Path (Join-Path (Split-Path -Parent $PSScriptRoot) 'bin') 'unicornbbdd.pyd'
if (-not (Test-Path -LiteralPath $modulo)) { throw 'Compila antes con .\scripts\001-compilar.ps1' }
if (-not $env:APPDATA -or -not $env:LOCALAPPDATA) {
    throw 'No se han encontrado APPDATA y LOCALAPPDATA.'
}

$carpetaPython = py -m site --user-site
if ($LASTEXITCODE -ne 0) { throw 'No se ha podido localizar la carpeta de paquetes de Python.' }
$carpetaPython = $carpetaPython.Trim()
$carpetaConfiguracion = Join-Path $env:APPDATA 'UnicornBBDD'
$carpetaDatos = Join-Path $env:LOCALAPPDATA 'UnicornBBDD\datos'
$rutaConfiguracion = Join-Path $carpetaConfiguracion 'config.json'

New-Item -ItemType Directory -Path $carpetaPython -Force | Out-Null
New-Item -ItemType Directory -Path $carpetaConfiguracion -Force | Out-Null
New-Item -ItemType Directory -Path $carpetaDatos -Force | Out-Null
if (-not (Test-Path -LiteralPath $rutaConfiguracion)) {
    $configuracion = [ordered]@{
        instalacion = $carpetaDatos.Replace('\', '/')
        tamanoRegistro = 512
    }
    $configuracion | ConvertTo-Json | Set-Content -LiteralPath $rutaConfiguracion -Encoding UTF8
}
Copy-Item -LiteralPath $modulo -Destination (Join-Path $carpetaPython 'unicornbbdd.pyd') -Force
Write-Output "Modulo instalado en $carpetaPython"
Write-Output "Configuracion en $rutaConfiguracion"
Write-Output "Datos en $carpetaDatos"


