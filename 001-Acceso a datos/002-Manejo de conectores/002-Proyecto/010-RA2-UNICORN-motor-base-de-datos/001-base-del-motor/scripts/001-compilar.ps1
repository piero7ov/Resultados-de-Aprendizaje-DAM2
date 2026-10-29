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
        '001-UnicornBBDD.hpp' = 'motor'
        '001-UnicornBBDD.cpp' = 'motor'
        '001-procedimientos.cpp' = 'motor'
        '001-compatibilidad.cpp' = 'motor'
        '001-indices.cpp' = 'motor'
        '001-conector_python.cpp' = 'conectores/python'
        '001-main.cpp' = 'terminal'
    }
    foreach ($archivo in $fuentes.Keys) {
        Copy-Item -LiteralPath (Join-Path (Join-Path $raiz $fuentes[$archivo]) $archivo) -Destination (Join-Path $carpetaTemporal $archivo)
    }
    $moduloTemporal = Join-Path $carpetaTemporal 'unicornbbdd.pyd'
    $argumentos = @(
        '-std=c++20', '-shared', '-O2', '-Wall', '-Wextra', '-static', '-static-libgcc', '-static-libstdc++',
        "-I$($datosPython[0])",
        (Join-Path $carpetaTemporal '001-conector_python.cpp'),
        (Join-Path $carpetaTemporal '001-UnicornBBDD.cpp'),
        (Join-Path $carpetaTemporal '001-procedimientos.cpp'),
        (Join-Path $carpetaTemporal '001-compatibilidad.cpp'),
        (Join-Path $carpetaTemporal '001-indices.cpp'),
        "-L$($datosPython[1])",
        "-lpython$($datosPython[2])$($datosPython[3])",
        '-o', $moduloTemporal
    )
    & $compilador @argumentos
    if ($LASTEXITCODE -ne 0) { throw 'Ha fallado la compilacion del conector.' }
    $ejecutableTemporal = Join-Path $carpetaTemporal '001-unicornbbdd.exe'
    $argumentosEjecutable = @(
        '-std=c++20', '-O2', '-Wall', '-Wextra', '-static', '-static-libgcc', '-static-libstdc++',
        (Join-Path $carpetaTemporal '001-main.cpp'),
        (Join-Path $carpetaTemporal '001-UnicornBBDD.cpp'),
        (Join-Path $carpetaTemporal '001-procedimientos.cpp'),
        (Join-Path $carpetaTemporal '001-compatibilidad.cpp'),
        (Join-Path $carpetaTemporal '001-indices.cpp'),
        '-o', $ejecutableTemporal
    )
    & $compilador @argumentosEjecutable
    if ($LASTEXITCODE -ne 0) { throw 'Ha fallado la compilacion del programa de terminal.' }
    $modulo = Join-Path (Join-Path $raiz 'bin') 'unicornbbdd.pyd'
    Copy-Item -LiteralPath $moduloTemporal -Destination $modulo -Force
    $ejecutable = Join-Path (Join-Path $raiz 'bin') '001-unicornbbdd.exe'
    Copy-Item -LiteralPath $ejecutableTemporal -Destination $ejecutable -Force
    Write-Output $modulo
    Write-Output $ejecutable
} finally {
    foreach ($archivo in @('001-UnicornBBDD.hpp', '001-UnicornBBDD.cpp', '001-conector_python.cpp', '001-main.cpp', '001-procedimientos.cpp', '001-compatibilidad.cpp', '001-indices.cpp', 'unicornbbdd.pyd', '001-unicornbbdd.exe')) {
        Remove-Item -LiteralPath (Join-Path $carpetaTemporal $archivo) -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $carpetaTemporal -ErrorAction SilentlyContinue
}



