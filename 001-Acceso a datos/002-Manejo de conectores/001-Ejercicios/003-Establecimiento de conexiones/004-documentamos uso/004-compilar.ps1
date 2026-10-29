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
$argumentos = @(
    '-std=c++17', '-shared', '-O2', '-Wall', '-Wextra', '-static', '-static-libgcc', '-static-libstdc++',
    "-I$($datosPython[0])",
    (Join-Path $PSScriptRoot '003-conector_python.cpp'),
    (Join-Path $PSScriptRoot '002-PierodevBBDD.cpp'),
    "-L$($datosPython[1])",
    "-lpython$($datosPython[2])$($datosPython[3])",
    '-o', (Join-Path $PSScriptRoot 'pierodevbbdd.pyd')
)
& $compilador @argumentos
if ($LASTEXITCODE -ne 0) { throw 'Ha fallado la compilacion del conector.' }
Write-Output (Join-Path $PSScriptRoot 'pierodevbbdd.pyd')
