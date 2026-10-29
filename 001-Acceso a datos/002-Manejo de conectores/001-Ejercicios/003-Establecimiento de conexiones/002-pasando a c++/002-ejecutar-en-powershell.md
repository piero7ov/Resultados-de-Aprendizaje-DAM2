# Ejecutar PierodevBBDD en PowerShell

Abre PowerShell en esta carpeta (`002-pasando a c++`) y ejecuta:

```powershell
$env:Path = "C:\msys64\ucrt64\bin;" + $env:Path
.\002-pierodevbbdd.exe
```

La primera línea permite que Windows encuentre las DLL de MSYS2 que necesita el programa. Solo afecta a la ventana de PowerShell actual.

Cuando aparezca `pierodev>`, escribe `AYUDA` para ver los comandos o `SALIR` para cerrar el programa.
