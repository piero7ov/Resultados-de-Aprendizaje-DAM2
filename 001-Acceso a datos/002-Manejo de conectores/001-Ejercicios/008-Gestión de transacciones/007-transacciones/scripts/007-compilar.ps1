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
$carpetaTemporal = Join-Path $env:TEMP ('pierodev-transacciones-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $carpetaTemporal | Out-Null
try {
    $fuentes = @{
        '002-PierodevBBDD.hpp' = 'motor'
        '002-PierodevBBDD.cpp' = 'motor'
        '006-procedimientos.cpp' = 'motor'
        '006-compatibilidad.cpp' = 'motor'
        '006-indices.cpp' = 'motor'
        '003-conector_python.cpp' = 'conectores/python'
        '003-main.cpp' = 'terminal'
    }
    foreach ($archivo in $fuentes.Keys) {
        Copy-Item -LiteralPath (Join-Path (Join-Path $raiz $fuentes[$archivo]) $archivo) -Destination (Join-Path $carpetaTemporal $archivo)
    }
    $moduloTemporal = Join-Path $carpetaTemporal 'pierodevbbdd.pyd'
    $argumentos = @(
        '-std=c++20', '-shared', '-O2', '-Wall', '-Wextra', '-static', '-static-libgcc', '-static-libstdc++',
        "-I$($datosPython[0])",
        (Join-Path $carpetaTemporal '003-conector_python.cpp'),
        (Join-Path $carpetaTemporal '002-PierodevBBDD.cpp'),
        (Join-Path $carpetaTemporal '006-procedimientos.cpp'),
        (Join-Path $carpetaTemporal '006-compatibilidad.cpp'),
        (Join-Path $carpetaTemporal '006-indices.cpp'),
        "-L$($datosPython[1])",
        "-lpython$($datosPython[2])$($datosPython[3])",
        '-o', $moduloTemporal
    )
    & $compilador @argumentos
    if ($LASTEXITCODE -ne 0) { throw 'Ha fallado la compilacion del conector.' }
    $ejecutableTemporal = Join-Path $carpetaTemporal '007-pierodevbbdd.exe'
    $argumentosEjecutable = @(
        '-std=c++20', '-O2', '-Wall', '-Wextra', '-static', '-static-libgcc', '-static-libstdc++',
        (Join-Path $carpetaTemporal '003-main.cpp'),
        (Join-Path $carpetaTemporal '002-PierodevBBDD.cpp'),
        (Join-Path $carpetaTemporal '006-procedimientos.cpp'),
        (Join-Path $carpetaTemporal '006-compatibilidad.cpp'),
        (Join-Path $carpetaTemporal '006-indices.cpp'),
        '-o', $ejecutableTemporal
    )
    & $compilador @argumentosEjecutable
    if ($LASTEXITCODE -ne 0) { throw 'Ha fallado la compilacion del programa de terminal.' }
    $modulo = Join-Path (Join-Path $raiz 'bin') 'pierodevbbdd.pyd'
    Copy-Item -LiteralPath $moduloTemporal -Destination $modulo -Force
    $ejecutable = Join-Path (Join-Path $raiz 'bin') '007-pierodevbbdd.exe'
    Copy-Item -LiteralPath $ejecutableTemporal -Destination $ejecutable -Force
    Write-Output $modulo
    Write-Output $ejecutable
} finally {
    foreach ($archivo in @('002-PierodevBBDD.hpp', '002-PierodevBBDD.cpp', '003-conector_python.cpp', '003-main.cpp', '006-procedimientos.cpp', '006-compatibilidad.cpp', '006-indices.cpp', 'pierodevbbdd.pyd', '007-pierodevbbdd.exe')) {
        Remove-Item -LiteralPath (Join-Path $carpetaTemporal $archivo) -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $carpetaTemporal -ErrorAction SilentlyContinue
}



