# Acceso a UnicornBBDD desde PowerShell

ERIN ERP 028 incluye el ejecutable de consola de UnicornBBDD. No hace falta un archivo BAT para utilizarlo.

## 1. Abrir PowerShell en el repositorio

```powershell
cd "C:\xampp\htdocs\DAM2PieroOlivares"
```

Las rutas siguientes comienzan por `.\`, por lo que se calculan desde esta carpeta.

## 2. Ejecutar UnicornBBDD

```powershell
& ".\006-Sistemas de gestión empresarial\002-Instalación y configuración de sistemas ERP-CRM\007-Entornos de desarrollo, pruebas y explotación\028-Erin-ERP\nucleo\datos\unicornbbdd\004-unicornbbdd.exe" ".\.runtime\erin-erp-028\config.json"
```

El comando contiene tres elementos:

1. `&` es el operador de ejecución de PowerShell. Permite ejecutar una ruta escrita entre comillas.
2. La primera ruta señala `004-unicornbbdd.exe`, la consola incluida en ERIN ERP 028.
3. La segunda ruta es el argumento de configuración. Indica al motor que las bases están en `.runtime/erin-erp-028/datos` y establece el tamaño físico del registro.

Las comillas son necesarias porque las carpetas contienen espacios. Si PowerShell está situado en otra carpeta, hay que usar las dos rutas absolutas o volver primero a la raíz del repositorio.

Cuando el motor arranca aparece:

```text
unicorn>
```

## 3. Entrar en la base de ERIN

Muestra las bases disponibles:

```text
LISTAR BASES
```

En una instalación nueva de la versión 028 aparecerá normalmente `erin_erp`. Para seleccionarla:

```text
USAR erin_erp
```

La respuesta esperada es `OK` y el indicador cambia a:

```text
unicorn[erin_erp]>
```

Después de una migración, el nombre activo puede ser distinto. Se puede consultar en:

```text
C:\xampp\htdocs\DAM2PieroOlivares\.runtime\erin-erp-028\base-activa.json
```

## 4. Consultar clientes

```text
SELECCIONAR erin_identificador COMO Identificador,nombre,cif,email,telefono,direccion DE clientes ORDENAR POR erin_identificador
```

Contar los clientes:

```text
SELECCIONAR CONTAR(*) COMO total_clientes DE clientes
```

Consultar uno concreto:

```text
SELECCIONAR * DE clientes DONDE erin_identificador = 1
```

## 5. Añadir una empresa y verla en PHP

Primero se consultan los identificadores utilizados:

```text
SELECCIONAR erin_identificador COMO Identificador,nombre,cif,email,telefono DE empresas ORDENAR POR erin_identificador
```

Si el último identificador es `1`, se puede insertar la empresa de prueba con el `2`:

```text
INSERTAR EN empresas (erin_identificador,nombre,cif,email,telefono) VALORES (2,'Aurora Comercial','B12345678','contacto@aurora.example','910555222')
```

Se vuelve a consultar:

```text
SELECCIONAR erin_identificador COMO Identificador,nombre,cif,email,telefono DE empresas ORDENAR POR erin_identificador
```

Tras ejecutar `SALIR`, se abre la tabla `empresas` desde los módulos CRM o Todo y se actualiza la página. ERIN presenta `erin_identificador` como `Identificador`, por lo que Aurora Comercial aparece con el identificador empresarial `2`.

El valor que devuelve la consola como `ID` es el identificador técnico interno del motor. Las relaciones y la interfaz de ERIN utilizan `erin_identificador`.

## 6. Finalizar

```text
SALIR
```

Para evitar escrituras simultáneas sobre los archivos del motor, las modificaciones directas se realizan sin operaciones activas en la interfaz. Después se sale de la consola y se actualiza ERIN en el navegador.
