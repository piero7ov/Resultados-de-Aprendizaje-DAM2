# Objetivos de ERIN ERP 028

ERIN ERP es un sistema de gestión empresarial modular. La versión 027 conserva la interfaz, el CRUD genérico, los usuarios, los permisos, los presets y el diseñador de las versiones anteriores, y utiliza UnicornBBDD como único motor de persistencia.

## Funciones actuales

- Instalación desde los modelos «desde cero», «empresa pequeña» y «ERP completo».
- Modelo declarativo editable en `instalacion/diagrama.json`.
- CRUD genérico para cualquier tabla de negocio.
- Relaciones con opciones descriptivas y claves foráneas comprobadas por UnicornBBDD.
- Autenticación, perfiles, administradores y permisos por módulo.
- Creación y configuración de módulos.
- Migración del modelo con copia JSON previa.
- API web interna para la interfaz y API externa JSON con clave privada.
- Verificación de PHP, JSON, FFI, la DLL y la capa de datos.

## Persistencia

Todo acceso se realiza mediante `nucleo/datos/ErinDatos.php`. Esta capa llama al conector PHP y a la DLL de UnicornBBDD. El motor guarda la base principal en:

```text
C:\xampp\htdocs\DAM2PieroOlivares\.runtime\erin-erp-028\datos\erin_erp
```

La carpeta exacta nace del directorio del repositorio, por lo que la aplicación no depende de una ruta absoluta escrita en el código.

`diagrama.json` es la fuente ejecutable de tablas, campos, tipos y relaciones. `esquema.sql` se conserva como antecedente histórico, pero ningún archivo PHP de la versión 027 lo lee o ejecuta.

## Diseño

La identidad visual mantiene los tonos crema, arena, salmón y terracota, la tipografía Coolvetica y la estructura de cabecera, menú, zona de trabajo y pie heredada.

