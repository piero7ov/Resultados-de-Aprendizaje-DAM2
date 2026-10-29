$ErrorActionPreference = 'Stop'

$compilador = 'C:\msys64\ucrt64\bin\g++.exe'
if (-not (Test-Path -LiteralPath $compilador)) {
    throw "No se ha encontrado g++ en $compilador"
}

$raiz = Split-Path -Parent $PSScriptRoot
$destino = Join-Path (Join-Path $raiz 'bin') 'unicornbbdd.dll'
$temporal = Join-Path $env:TEMP ('unicorn-php-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporal | Out-Null
$env:Path = 'C:\msys64\ucrt64\bin;' + $env:Path

try {
    $fuentes = @{
        '002-UnicornBBDD.hpp' = 'motor'
        '002-UnicornBBDD.cpp' = 'motor'
        '002-procedimientos.cpp' = 'motor'
        '002-indices.cpp' = 'motor'
        '002-compatibilidad.cpp' = 'motor'
        '002-conector_php.cpp' = 'conectores/php'
    }
    foreach ($archivo in $fuentes.Keys) {
        Copy-Item -LiteralPath (Join-Path (Join-Path $raiz $fuentes[$archivo]) $archivo) -Destination (Join-Path $temporal $archivo)
    }

    $salida = Join-Path $temporal 'unicornbbdd.dll'
    $argumentos = @(
        '-std=c++20', '-O2', '-shared', '-Wall', '-Wextra',
        '-static', '-static-libgcc', '-static-libstdc++',
        (Join-Path $temporal '002-conector_php.cpp'),
        (Join-Path $temporal '002-UnicornBBDD.cpp'),
        (Join-Path $temporal '002-procedimientos.cpp'),
        (Join-Path $temporal '002-indices.cpp'),
        (Join-Path $temporal '002-compatibilidad.cpp'),
        '-o', $salida
    )
    & $compilador @argumentos
    if ($LASTEXITCODE -ne 0) { throw 'Ha fallado la compilacion del conector PHP.' }
    Copy-Item -LiteralPath $salida -Destination $destino -Force
    Write-Output "Biblioteca PHP generada: $destino"
} finally {
    foreach ($archivo in @('002-UnicornBBDD.hpp', '002-UnicornBBDD.cpp', '002-procedimientos.cpp', '002-indices.cpp', '002-compatibilidad.cpp', '002-conector_php.cpp', 'unicornbbdd.dll')) {
        Remove-Item -LiteralPath (Join-Path $temporal $archivo) -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $temporal -Force -ErrorAction SilentlyContinue
}
