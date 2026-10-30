# Demostración de ERIN ERP 028 con UnicornBBDD

La instalación de pequeña empresa crea **Brumalia Talleres**, 12 tablas y 77 registros ficticios. PHP y la consola leen los mismos archivos de UnicornBBDD; la diferencia es que PHP pasa por `ErinDatos` y la consola habla directamente con el motor.

## 1. Instalar la pequeña empresa

1. Inicia Apache desde XAMPP.
2. Abre `http://localhost/DAM2PieroOlivares/006-Sistemas%20de%20gesti%C3%B3n%20empresarial/002-Instalaci%C3%B3n%20y%20configuraci%C3%B3n%20de%20sistemas%20ERP-CRM/007-Entornos%20de%20desarrollo,%20pruebas%20y%20explotaci%C3%B3n/028-Erin-ERP/instalacion/instalar.php`.
3. Elige **Empresa pequeña**.
4. Rellena el administrador, marca **Importar datos de demostración** y pulsa **Instalar ERIN ERP**.
5. El resultado esperado es: 12 tablas de negocio y 77 registros importados.

La base se almacena en `.runtime/erin-erp-028/datos`. El nombre físico activo aparece en `.runtime/erin-erp-028/base-activa.json`; inicialmente es `erin_erp` y puede cambiar después de una migración recuperable.

## 2. Consultar mediante PHP

Desde PowerShell, situado en la raíz del repositorio:

```powershell
php ".\006-Sistemas de gestión empresarial\002-Instalación y configuración de sistemas ERP-CRM\007-Entornos de desarrollo, pruebas y explotación\028-Erin-ERP\demostracion\028-consultar-php.php"
```

El script usa exclusivamente `nucleo/datos/ErinDatos.php`. Debe mostrar Brumalia Talleres, cinco clientes, cinco productos y ocho pedidos.

## 3. Consultar directamente desde la consola

1. Abre PowerShell en `C:\xampp\htdocs\DAM2PieroOlivares` y ejecuta:

```powershell
& ".\006-Sistemas de gestión empresarial\002-Instalación y configuración de sistemas ERP-CRM\007-Entornos de desarrollo, pruebas y explotación\028-Erin-ERP\nucleo\datos\unicornbbdd\004-unicornbbdd.exe" ".\.runtime\erin-erp-028\config.json"
```

2. Consulta `.runtime/erin-erp-028/base-activa.json` y usa el valor de `base`. En una instalación nueva escribe:

```text
USAR erin_erp
```

3. Ejecuta estas consultas:

```text
SELECCIONAR erin_identificador COMO Identificador,nombre,cif,email DE empresas
SELECCIONAR erin_identificador COMO Identificador,nombre,email,telefono DE clientes ORDENAR POR erin_identificador LIMITE 5
SELECCIONAR erin_identificador COMO Identificador,codigo,nombre,precio,stock DE productos ORDENAR POR erin_identificador LIMITE 5
SELECCIONAR erin_identificador COMO Identificador,cliente_id,fecha,estado,total DE pedidos ORDENAR POR erin_identificador
```

4. Para comprobar estructura y relaciones:

```text
ESQUEMA pedidos
MOSTRAR INDICES pedidos
```

5. Finaliza con:

```text
SALIR
```

`erin_identificador` es el nombre físico estable que ve el motor. La capa PHP lo presenta como `Identificador`. El `id` que también puede aparecer en una consulta física es el identificador técnico interno de UnicornBBDD y ERIN no lo usa como clave empresarial.

## 4. Resultado que demuestra la integración

Las cuatro consultas de la consola deben devolver los mismos valores que el script PHP. Si una migración cambia la base activa, ambos siguen usando el mismo runtime: PHP lee `base-activa.json` y en la consola se indica esa misma base con `USAR`.

La explicación detallada del comando de PowerShell y una inserción comprobable están en `005-acceso-consola-powershell.md`.
