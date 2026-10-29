# Conector Python del motor C++

El archivo `003-conector_python.cpp` es el puente entre Python y el motor `002-PierodevBBDD.cpp`. Al compilarlo se obtiene `pierodevbbdd.pyd`, que Python puede importar desde esta misma carpeta.

En PowerShell, desde `003-conector python`:

```powershell
$env:Path = "C:\msys64\ucrt64\bin;" + $env:Path
& "C:\msys64\ucrt64\bin\g++.exe" -std=c++17 -shared -O2 -static -static-libgcc -static-libstdc++ -I"C:\Program Files\Python313\Include" .\003-conector_python.cpp .\002-PierodevBBDD.cpp -L"C:\Program Files\Python313\libs" -lpython313 -o .\pierodevbbdd.pyd
py .\003-pruebapython.py
```

El conector expone cuatro funciones, como la primera versión de clase: `crear_base`, `usar_base`, `crear_tabla` e `insertar`. Usa `config.json` y guarda los archivos en `datos`. La prueba crea `prueba_conector/clientes` e inserta `Piero Olivares`. Para repetirla después, cambia el nombre de la base de datos en `003-pruebapython.py`.
