#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
if [[ "${OSTYPE:-}" == msys* || "${OSTYPE:-}" == cygwin* ]]; then
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w scripts/003-compilar_php.ps1)"
  exit $?
fi
CXX="${CXX:-/c/msys64/ucrt64/bin/g++.exe}"
if [[ ! -x "$CXX" ]]; then
  echo "No se ha encontrado g++ de MSYS2 UCRT64: $CXX" >&2
  exit 1
fi

export PATH="/c/msys64/ucrt64/bin:$PATH"
"$CXX" -std=c++20 -O2 -shared -Wall -Wextra \
  -static -static-libgcc -static-libstdc++ \
  -Imotor \
  conectores/php/003-conector_php.cpp motor/003-UnicornBBDD.cpp \
  motor/003-procedimientos.cpp motor/003-indices.cpp motor/003-compatibilidad.cpp \
  -o bin/unicornbbdd.dll

echo "Generado: $(pwd)/bin/unicornbbdd.dll"
echo 'Ejemplo: C:\xampp\php\php.exe -d ffi.enable=1 doc/php/003-consultar_erp.php'
