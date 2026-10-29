$ErrorActionPreference = 'Stop'

$compilador = 'C:\msys64\ucrt64\bin\g++.exe'
if (-not (Test-Path -LiteralPath $compilador)) {
    throw "No se ha encontrado g++ en $compilador"
}

$datosPython = py -c "import sys,sysconfig; print(sysconfig.get_path('include')); print(sysconfig.get_config_var('LIBDIR')); print(sys.version_info.major); print(sys.version_info.minor)"
if ($LASTEXITCODE -ne 0 -or $datosPython.Count -ne 4) {
    throw 'No se han podido localizar las cabeceras y bibliotecas de Python.'
}

$env:Path = 'C:\msys64\ucrt64\bin;' + $env:Path
$carpetaTemporal = Join-Path $env:TEMP ('pierodev-dql-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $carpetaTemporal | Out-Null
try {
    foreach ($archivo in @('002-PierodevBBDD.hpp', '002-PierodevBBDD.cpp', '005-consultas.cpp', '003-conector_python.cpp', '003-main.cpp')) {
        Copy-Item -LiteralPath (Join-Path $PSScriptRoot $archivo) -Destination (Join-Path $carpetaTemporal $archivo)
    }
    $moduloTemporal = Join-Path $carpetaTemporal 'pierodevbbdd.pyd'
    $argumentos = @(
        '-std=c++17', '-shared', '-O2', '-Wall', '-Wextra', '-static', '-static-libgcc', '-static-libstdc++',
        "-I$($datosPython[0])",
        (Join-Path $carpetaTemporal '003-conector_python.cpp'),
        (Join-Path $carpetaTemporal '002-PierodevBBDD.cpp'),
        (Join-Path $carpetaTemporal '005-consultas.cpp'),
        "-L$($datosPython[1])",
        "-lpython$($datosPython[2])$($datosPython[3])",
        '-o', $moduloTemporal
    )
    & $compilador @argumentos
    if ($LASTEXITCODE -ne 0) { throw 'Ha fallado la compilacion del conector.' }
    $ejecutableTemporal = Join-Path $carpetaTemporal '005-pierodevbbdd.exe'
    $argumentosEjecutable = @(
        '-std=c++17', '-O2', '-Wall', '-Wextra', '-static', '-static-libgcc', '-static-libstdc++',
        (Join-Path $carpetaTemporal '003-main.cpp'),
        (Join-Path $carpetaTemporal '002-PierodevBBDD.cpp'),
        (Join-Path $carpetaTemporal '005-consultas.cpp'),
        '-o', $ejecutableTemporal
    )
    & $compilador @argumentosEjecutable
    if ($LASTEXITCODE -ne 0) { throw 'Ha fallado la compilacion del programa de terminal.' }
    $modulo = Join-Path $PSScriptRoot 'pierodevbbdd.pyd'
    Copy-Item -LiteralPath $moduloTemporal -Destination $modulo -Force
    $ejecutable = Join-Path $PSScriptRoot '005-pierodevbbdd.exe'
    Copy-Item -LiteralPath $ejecutableTemporal -Destination $ejecutable -Force
    Write-Output $modulo
    Write-Output $ejecutable
} finally {
    foreach ($archivo in @('002-PierodevBBDD.hpp', '002-PierodevBBDD.cpp', '005-consultas.cpp', '003-conector_python.cpp', '003-main.cpp', 'pierodevbbdd.pyd', '005-pierodevbbdd.exe')) {
        Remove-Item -LiteralPath (Join-Path $carpetaTemporal $archivo) -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $carpetaTemporal -ErrorAction SilentlyContinue
}

