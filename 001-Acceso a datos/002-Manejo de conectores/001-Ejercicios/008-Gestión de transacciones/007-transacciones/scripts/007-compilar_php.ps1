$ErrorActionPreference = 'Stop'

$compilador = 'C:\msys64\ucrt64\bin\g++.exe'
if (-not (Test-Path -LiteralPath $compilador)) {
    throw "No se ha encontrado g++ en $compilador"
}

$raiz = Split-Path -Parent $PSScriptRoot
$destino = Join-Path (Join-Path $raiz 'bin') 'pierodevbbdd.dll'
$temporal = Join-Path $env:TEMP ('pierodev-php-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporal | Out-Null
$env:Path = 'C:\msys64\ucrt64\bin;' + $env:Path

try {
    $fuentes = @{
        '002-PierodevBBDD.hpp' = 'motor'
        '002-PierodevBBDD.cpp' = 'motor'
        '006-procedimientos.cpp' = 'motor'
        '006-indices.cpp' = 'motor'
        '006-compatibilidad.cpp' = 'motor'
        '007-conector_php.cpp' = 'conectores/php'
    }
    foreach ($archivo in $fuentes.Keys) {
        Copy-Item -LiteralPath (Join-Path (Join-Path $raiz $fuentes[$archivo]) $archivo) -Destination (Join-Path $temporal $archivo)
    }

    $salida = Join-Path $temporal 'pierodevbbdd.dll'
    $argumentos = @(
        '-std=c++20', '-O2', '-shared', '-Wall', '-Wextra',
        '-static', '-static-libgcc', '-static-libstdc++',
        (Join-Path $temporal '007-conector_php.cpp'),
        (Join-Path $temporal '002-PierodevBBDD.cpp'),
        (Join-Path $temporal '006-procedimientos.cpp'),
        (Join-Path $temporal '006-indices.cpp'),
        (Join-Path $temporal '006-compatibilidad.cpp'),
        '-o', $salida
    )
    & $compilador @argumentos
    if ($LASTEXITCODE -ne 0) { throw 'Ha fallado la compilacion del conector PHP.' }
    Copy-Item -LiteralPath $salida -Destination $destino -Force
    Write-Output "Biblioteca PHP generada: $destino"
} finally {
    foreach ($archivo in @('002-PierodevBBDD.hpp', '002-PierodevBBDD.cpp', '006-procedimientos.cpp', '006-indices.cpp', '006-compatibilidad.cpp', '007-conector_php.cpp', 'pierodevbbdd.dll')) {
        Remove-Item -LiteralPath (Join-Path $temporal $archivo) -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $temporal -Force -ErrorAction SilentlyContinue
}
