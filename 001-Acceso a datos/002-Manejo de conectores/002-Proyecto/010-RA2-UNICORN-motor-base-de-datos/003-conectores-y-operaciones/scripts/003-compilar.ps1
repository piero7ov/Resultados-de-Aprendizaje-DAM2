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
$raiz = Split-Path -Parent $PSScriptRoot
$carpetaTemporal = Join-Path $env:TEMP ('unicorn-transacciones-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $carpetaTemporal | Out-Null
try {
    $fuentes = @{
        '003-UnicornBBDD.hpp' = 'motor'
        '003-UnicornBBDD.cpp' = 'motor'
        '003-procedimientos.cpp' = 'motor'
        '003-compatibilidad.cpp' = 'motor'
        '003-indices.cpp' = 'motor'
        '003-conector_python.cpp' = 'conectores/python'
        '003-main.cpp' = 'terminal'
    }
    foreach ($archivo in $fuentes.Keys) {
        Copy-Item -LiteralPath (Join-Path (Join-Path $raiz $fuentes[$archivo]) $archivo) -Destination (Join-Path $carpetaTemporal $archivo)
    }
    $moduloTemporal = Join-Path $carpetaTemporal 'unicornbbdd.pyd'
    $argumentos = @(
        '-std=c++20', '-shared', '-O2', '-Wall', '-Wextra', '-static', '-static-libgcc', '-static-libstdc++',
        "-I$($datosPython[0])",
        (Join-Path $carpetaTemporal '003-conector_python.cpp'),
        (Join-Path $carpetaTemporal '003-UnicornBBDD.cpp'),
        (Join-Path $carpetaTemporal '003-procedimientos.cpp'),
        (Join-Path $carpetaTemporal '003-compatibilidad.cpp'),
        (Join-Path $carpetaTemporal '003-indices.cpp'),
        "-L$($datosPython[1])",
        "-lpython$($datosPython[2])$($datosPython[3])",
        '-o', $moduloTemporal
    )
    & $compilador @argumentos
    if ($LASTEXITCODE -ne 0) { throw 'Ha fallado la compilacion del conector.' }
    $ejecutableTemporal = Join-Path $carpetaTemporal '003-unicornbbdd.exe'
    $argumentosEjecutable = @(
        '-std=c++20', '-O2', '-Wall', '-Wextra', '-static', '-static-libgcc', '-static-libstdc++',
        (Join-Path $carpetaTemporal '003-main.cpp'),
        (Join-Path $carpetaTemporal '003-UnicornBBDD.cpp'),
        (Join-Path $carpetaTemporal '003-procedimientos.cpp'),
        (Join-Path $carpetaTemporal '003-compatibilidad.cpp'),
        (Join-Path $carpetaTemporal '003-indices.cpp'),
        '-o', $ejecutableTemporal
    )
    & $compilador @argumentosEjecutable
    if ($LASTEXITCODE -ne 0) { throw 'Ha fallado la compilacion del programa de terminal.' }
    $modulo = Join-Path (Join-Path $raiz 'bin') 'unicornbbdd.pyd'
    Copy-Item -LiteralPath $moduloTemporal -Destination $modulo -Force
    $ejecutable = Join-Path (Join-Path $raiz 'bin') '003-unicornbbdd.exe'
    Copy-Item -LiteralPath $ejecutableTemporal -Destination $ejecutable -Force
    Write-Output $modulo
    Write-Output $ejecutable
} finally {
    foreach ($archivo in @('003-UnicornBBDD.hpp', '003-UnicornBBDD.cpp', '003-conector_python.cpp', '003-main.cpp', '003-procedimientos.cpp', '003-compatibilidad.cpp', '003-indices.cpp', 'unicornbbdd.pyd', '003-unicornbbdd.exe')) {
        Remove-Item -LiteralPath (Join-Path $carpetaTemporal $archivo) -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $carpetaTemporal -ErrorAction SilentlyContinue
}



