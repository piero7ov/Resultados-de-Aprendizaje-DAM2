# UNICORN — Documentación para desarrolladores

## 1. Descripción y alcance

UNICORN es un proyecto del RA1 de Acceso a datos. Parte del motor de ficheros trabajado en clase con PierodevBBDD y lo amplía con relaciones por ID, una aplicación de librería, recuperación de operaciones, conversiones y copias de seguridad.

Para instalar y utilizar los menús, consulta [README.md](README.md). La explicación inicial de las relaciones se conserva en [002-Relaciones explicadas.md](002-Relaciones%20explicadas.md).

El motor puede utilizarse para otros temas; `UnicornLibreria`, la consola, las conversiones y las copias actuales están adaptados al modelo de la tienda de libros. No basta con renombrar las tablas para convertir toda la aplicación en otro negocio.

No es un servidor SQL ni dispone de bloqueo para varios procesos. No abrir dos sesiones sobre la misma base, tampoco durante conversiones o copias.

## 2. Archivos y responsabilidades

| Archivo | Responsabilidad |
|---|---|
| [UnicornBBDD.py](UnicornBBDD.py) | Motor de archivos y clase `UnicornSerializador`. |
| [UnicornRelaciones.py](UnicornRelaciones.py) | Validación de referencias, consultas relacionadas y protección del historial. |
| [UnicornOperaciones.py](UnicornOperaciones.py) | Copia previa y recuperación de escrituras agrupadas. |
| [UnicornLibreria.py](UnicornLibreria.py) | Clientes, libros, pedidos, reservas, ventas y stock. |
| [UnicornIntercambio.py](UnicornIntercambio.py) | Exportación CSV/JSON e importación a una base nueva. |
| [UnicornCopias.py](UnicornCopias.py) | Copias físicas, comprobación y restauración a una base nueva. |
| [consola_unicorn.py](consola_unicorn.py) | Formularios, menús, tablas legibles, ASCII y colores. |
| [instalador.py](instalador.py) | Configuración, permisos e inicialización. No instala Python. |
| [datos_demo.py](datos_demo.py) | Creación del conjunto inicial mediante la aplicación. |
| [config.json](config.json) | Ubicación de datos y tamaño de bloque. |
| [relaciones.json](relaciones.json) | Plantilla de relaciones de la librería. |
| `pruebas_unicorn_*.py` | Pruebas automatizadas con directorios temporales. |

La consola llama a la aplicación para las operaciones comerciales. La aplicación utiliza el motor, las relaciones y el gestor de operaciones. Los módulos de intercambio y copias usan el motor y validan el estado mediante la aplicación.

No hay bibliotecas externas que instalar con `pip`. El entorno verificado utiliza Python 3.13.7 en Windows. Las comprobaciones de huellas usan `hashlib.file_digest`; no asumir compatibilidad con cualquier versión antigua de Python.

## 3. Configuración y selección de base

Configuración inicial propuesta:

```json
{
    "instalacion": "./datos",
    "tamanoRegistro": 512
}
```

- `instalacion`: carpeta que contiene las bases. Una ruta relativa se interpreta desde la carpeta del JSON, no desde la terminal.
- `tamanoRegistro`: entero de al menos 32 bytes. El valor inicial de 512 permite trabajar con el conjunto de ejemplo; el mínimo admitido no garantiza que los datos concretos quepan.
- `UnicornBBDD()` lee el JSON junto al módulo. `UnicornBBDD("otra_config.json")` permite una configuración distinta.
- La configuración se carga al construir la conexión. Modificar el JSON no cambia una conexión que ya está abierta.
- Cambiar la ruta no mueve ni copia bases. Cambiar el tamaño no convierte archivos existentes: sus metadatos deben coincidir.

Para una ruta Windows absoluta puede escribirse `"C:/UnicornDatos"`; si se usan barras invertidas en JSON, deben duplicarse.

La base se selecciona por separado:

```python
from UnicornBBDD import UnicornBBDD

conexion = UnicornBBDD()
conexion.usaBaseDatos("unicorn_demo")  # La carpeta debe existir.
```

`conexion.instalacion` contiene la ruta absoluta y `conexion.basededatos` el nombre seleccionado. No modificar estos atributos manualmente. Si se cambia de base con `usaBaseDatos`, crear nuevos gestores de aplicación y relaciones: quedan vinculados a una base concreta.

Los nombres de bases, tablas y campos deben empezar por letra ASCII o `_`, y continuar con letras ASCII, números o `_`. No se admiten puntos, espacios, rutas ni nombres reservados de Windows, como `CON`. Esta restricción no se aplica al texto de los clientes o libros ni al nombre de una carpeta de exportación.

## 4. Formato interno y formas de acceso

Cada base es una carpeta. Cada tabla tiene cuatro archivos:

```text
datos/
└── unicorn_demo/
    ├── clientes.csv
    ├── clientes.esquema
    ├── clientes.idx
    ├── clientes.meta.json
    ├── ... los mismos cuatro archivos para las otras tres tablas
    └── relaciones.json
```

| Archivo | Contenido |
|---|---|
| `.csv` | Bloques de tamaño fijo en UTF-8; no incluye una fila de cabecera. |
| `.esquema` | Nombres de columnas, incluidos `id` y `activo`. |
| `.idx` | Pares `id,posicion`, donde la posición es un desplazamiento en bytes. |
| `.meta.json` | Formato `unicorn-1` y tamaño de registro utilizado. |

El motor serializa los campos como CSV entrecomillado, añade espacios de relleno y reserva el último byte para `\n`. Con bloques de 512 bytes, el CSV serializado completo —incluidos ID, estado, separadores y comillas— debe ocupar como máximo 511 bytes. No son 511 caracteres ni 511 bytes disponibles por campo.

Los valores se recuperan como cadenas, incluso los IDs y cantidades. `activo` es `"1"` o `"0"`. Los IDs son propios de cada tabla, empiezan en 1 y no se reutilizan después de compactar.

No editar estos CSV con Excel ni tratarlos como los CSV de intercambio: cambiar un byte, un salto de línea o el relleno puede desajustar el índice.

### Acceso secuencial, directo y mediante índice

| Técnica | Uso en UNICORN | Ventaja | Coste o limitación |
|---|---|---|---|
| Secuencial | Listados y búsquedas por columna. | Sencillo; permite validar todos los bloques. | Recorre la tabla y acumula resultados en memoria. |
| Directo con `seek` | Leer o sustituir un bloque conocido. | No necesita reescribir toda la tabla para cambiar un registro. | Exige bloques de igual tamaño y una posición válida. |
| Índice ID → posición | Localizar un registro aunque haya compactaciones. | El ID no depende del número de fila. | El índice completo se lee y valida; localizar un ID no es una operación global de coste constante. |

Las comprobaciones comerciales y relacionales hacen recorridos adicionales. El programa completo no tiene coste constante solo porque una escritura utilice `seek`. El enfoque prioriza comprensión e integridad sobre rendimiento para archivos grandes.

## 5. Inicio rápido: motor genérico

Este ejemplo es ejecutable desde la carpeta del proyecto y usa solo datos temporales. No requiere que exista `config.json` y no altera las bases reales. Al terminar el bloque `with`, se eliminan los archivos de demostración.

```python
import json
import tempfile
from pathlib import Path
from UnicornBBDD import UnicornBBDD

with tempfile.TemporaryDirectory(prefix="unicorn-manual-") as temporal:
    ruta = Path(temporal) / "config.json"
    ruta.write_text(json.dumps({"instalacion": "datos", "tamanoRegistro": 512}), encoding="utf-8")
    bbdd = UnicornBBDD(ruta)
    bbdd.creaBaseDatos("ejemplo")
    bbdd.usaBaseDatos("ejemplo")
    bbdd.creaTabla("contactos", "nombre,email")
    identificador = bbdd.insertarDatos("contactos", ["Prueba", ""])
    assert bbdd.seleccionar("contactos", identificador)["nombre"] == "Prueba"
    bbdd.actualizar("contactos", identificador, ["Prueba actualizada", ""])
    bbdd.eliminar("contactos", identificador)
    assert bbdd.seleccionar("contactos", identificador) is None
    bbdd.reactivar("contactos", identificador)
    assert len(bbdd.listarTodo("contactos")) == 1
```

`creaBaseDatos` y `creaTabla` son operaciones de creación: fallan si el destino ya existe. El motor no configura automáticamente las relaciones de una tienda al crear una tabla genérica.

## 6. Referencia de `UnicornBBDD`

Los métodos propagan excepciones: un dato inválido no se representa mediante un `False` genérico. `None` significa registro no visible o inexistente en las consultas que lo indican.

| Método | Parámetros y resultado |
|---|---|
| `UnicornBBDD(rutaConfiguracion=None)` | Carga la configuración; no crea datos ni selecciona base. |
| `creaBaseDatos(nombre)` | Crea la carpeta y un `relaciones.json` vacío. Devuelve `True`; no selecciona la base. |
| `usaBaseDatos(nombre)` | Selecciona una base existente. Devuelve `True`. |
| `creaTabla(nombre, esquema)` | `esquema` es texto con columnas separadas por comas, sin `id` ni `activo`. Crea los cuatro archivos y devuelve `True`. |
| `obtenerEsquema(tabla)` | Devuelve una lista de nombres, incluidos `id` y `activo`. |
| `configurarRelaciones(rutaRelaciones=None)` | Instala una plantilla validada en la base. Devuelve `True`; por defecto usa el JSON del proyecto. |
| `validarDatos(tabla, datos)` | Exige lista o tupla con el número correcto de campos de usuario. Devuelve `True` o lanza `ValueError`; no valida por sí solo el negocio ni las referencias. |
| `siguienteId(tabla)` | Devuelve un entero: máximo ID del índice + 1. No reserva ese ID. |
| `insertarDatos(tabla, datos)` | Valida campos, relaciones y tamaño; crea un registro activo y devuelve su ID entero. |
| `buscarPosicion(tabla, id)` | Devuelve posición en bytes, o `-1` si no existe o fue retirado físicamente. |
| `leerRegistro(tabla, id, incluirInactivos=False)` | Devuelve lista de cadenas con todos los campos, o `None`. |
| `seleccionar(tabla, id, incluirInactivos=False)` | Devuelve diccionario campo/valor, o `None`. |
| `listarTodo(tabla, incluirInactivos=False)` | Devuelve lista de diccionarios; `[]` si no hay registros visibles. No imprime. |
| `buscarColumna(tabla, columna, valor, incluirInactivos=False)` | Coincidencia exacta con `str(valor)`; devuelve lista, no una búsqueda parcial. |
| `actualizar(tabla, id, datos)` | Sustituye todos los campos de usuario de un registro activo. Conserva ID y posición. Devuelve `True`. |
| `eliminar(tabla, id)` | Borrado lógico: cambia `activo` a `0`. Devuelve `True`; falla si no existe o ya estaba inactivo. |
| `reactivar(tabla, id)` | Recupera un inactivo cuyo bloque existe y cuyas referencias son válidas. Devuelve `True`. |
| `compactar(tabla)` | Retira bloques inactivos no referenciados y devuelve cuántos retiró. Conserva sus IDs con posición `-1`. |

Los IDs aceptados por las búsquedas son enteros positivos o su representación canónica en texto, como `1` o `"1"`, no `True`, `"01"` ni `"1.csv"`.

### Actualización, bajas y compactación

`actualizar` no recibe un diccionario parcial: debe recibir todos los campos de usuario en el orden del esquema. No se incluyen ID ni activo.

La baja lógica conserva el historial y permite reactivar. La compactación cambia las posiciones físicas, no los IDs, y conserva incluso registros inactivos si siguen referenciados por otro registro. Un bloque retirado físicamente ya no puede reactivarse.

La compactación no tiene opción en la consola. Es una operación técnica: hacer una copia antes, cerrar otras sesiones y no ejecutarla dentro de una operación de negocio. Si queda un marcador `.compactacion-pendiente`, requiere revisión manual; no se debe borrar para eludir el bloqueo.

El motor genérico no impide por sí solo desactivar un cliente con reservas o establecer stock incoherente. En la tienda deben usarse los métodos de `UnicornLibreria`, no modificar directamente sus tablas para operaciones comerciales.

## 7. Serializador

`UnicornSerializador` está en `UnicornBBDD.py`. No abre archivos ni aplica reglas de negocio.

| Método | Resultado |
|---|---|
| `serializar(lista, delimitador=",")` | Cadena CSV sin salto final; acepta una lista o tupla no vacía, convierte valores a texto y entrecomilla todos los campos. |
| `deserializar(cadena, delimitador=",")` | Lista de cadenas de una única fila CSV; rechaza estructuras incorrectas. |

```python
from UnicornBBDD import UnicornSerializador

serial = UnicornSerializador()
cadena = serial.serializar(["uno", "dos, tres", 4])
assert cadena == '"uno","dos, tres","4"'
assert serial.deserializar(cadena) == ["uno", "dos, tres", "4"]
```

A diferencia del ejemplo sencillo de clase, admite comas, comillas, saltos de línea dentro de un campo y espacios finales. La limitación sigue siendo el tamaño final en bytes del bloque.

## 8. Modelo de la librería y relaciones

Todas las tablas incluyen primero `id,activo`:

| Tabla | Campos de usuario, en orden |
|---|---|
| `clientes` | `nombre,apellidos,email,telefono` |
| `libros` | `isbn,titulo,autor,precio_centimos,stock` |
| `pedidos` | `cliente_id,fecha,estado` |
| `lineas_pedido` | `pedido_id,libro_id,cantidad,precio_unitario_centimos` |

Las relaciones son:

```text
clientes.id  ← pedidos.cliente_id
pedidos.id   ← lineas_pedido.pedido_id
libros.id    ← lineas_pedido.libro_id
```

Un pedido guarda el ID del cliente; no almacena otra copia de su ficha. `relaciones.json` indica dónde buscar ese ID:

```json
{
    "version": 1,
    "relaciones": [
        {"tabla": "pedidos", "campo": "cliente_id", "tabla_destino": "clientes"},
        {"tabla": "lineas_pedido", "campo": "pedido_id", "tabla_destino": "pedidos"},
        {"tabla": "lineas_pedido", "campo": "libro_id", "tabla_destino": "libros"}
    ]
}
```

El JSON del proyecto es la plantilla; el situado dentro de cada base contiene las reglas que esa base utiliza. Editar la plantilla no migra las bases existentes. La configuración rechaza sustituir un modelo no vacío por otro diferente.

Todas las referencias son obligatorias y apuntan al `id` del destino. Al insertar o cambiar una referencia, el destino debe existir y estar activo. Al mantener una referencia histórica sin cambiarla, puede apuntar a un registro inactivo, pero no desaparecido. No hay borrado en cascada, SQL ni claves compuestas.

Los nombres que muestra la consola se consultan mediante estas relaciones. Si se cambia el nombre de un cliente, la consulta del pedido muestra el nombre actual. El precio de una línea, en cambio, sí se guarda como dato histórico independiente del precio actual del catálogo.

### Referencia de `UnicornRelaciones`

| Método | Uso y resultado |
|---|---|
| `UnicornRelaciones(conexion)` | Necesita base seleccionada y queda vinculado a ella. |
| `cargar()` | Lee y valida el modelo de la base; devuelve la lista de relaciones. |
| `configurar(rutaRelaciones=None)` | Valida plantilla y datos existentes antes de guardar. Devuelve `True`. |
| `validarDatos(tabla, datos, anterior=None)` | Comprueba referencias de los campos de usuario. `anterior` es el diccionario previo que permite reconocer vínculos históricos. Devuelve `True`. |
| `validarIntegridad()` | Revisa referencias de todos los registros, también inactivos. Devuelve `True` o lanza una excepción. |
| `obtenerRelacionado(tabla, id, campo, incluirInactivos=False)` | Devuelve el destino como diccionario o `None` si el origen no es visible. El destino puede estar inactivo para consultar historial. |
| `buscarReferencias(tabla, id, incluirInactivos=True)` | Lista de diccionarios con `tabla`, `campo` y `registro` que referencian ese ID. |
| `idsProtegidos(tabla)` | Conjunto de IDs enteros que no deben perder su bloque al compactar. |

El motor llama a `validarDatos` al insertar, actualizar y reactivar; la aplicación no necesita repetir manualmente esa llamada para cada escritura.

## 9. Referencia de `UnicornLibreria`

`UnicornLibreria(conexion)` exige base seleccionada y recupera una operación pendiente si existe. No crea tablas automáticamente. Para una base recién creada se llama una vez a `prepararTablas()`.

`prepararTablas()` crea tablas totalmente ausentes, comprueba esquemas e instala relaciones; devuelve `True`. No es una herramienta de reparación: si una tabla está incompleta, falla en vez de inventar los archivos que faltan. Para abrir una base existente, no es necesario volver a ejecutarlo.

### Clientes y libros

| Método | Resultado y reglas principales |
|---|---|
| `crearCliente(nombre, apellidos="", email="", telefono="")` | ID entero; nombre obligatorio. Los demás campos pueden estar vacíos. |
| `actualizarCliente(id, nombre, apellidos="", email="", telefono="")` | `True`; sustituye la ficha de un cliente activo. Omitir campos opcionales los deja vacíos, no conserva sus valores anteriores. |
| `desactivarCliente(id)` | `True`; rechaza clientes con reservas pendientes. |
| `reactivarCliente(id)` | `True`; conserva ID e historial, sin reabrir pedidos. |
| `listarClientes(incluirInactivos=False)` | Lista de diccionarios. |
| `crearLibro(isbn, titulo, autor, precio_centimos, stock)` | ID entero; ISBN y título obligatorios, precio y stock enteros no negativos. |
| `actualizarLibro(id, isbn, titulo, autor, precio_centimos, stock)` | `True`; no admite stock inferior a lo reservado. Requiere todos los campos. |
| `desactivarLibro(id)` | `True`; rechaza libros con unidades reservadas. |
| `reactivarLibro(id)` | `True`; conserva stock, ISBN e historial. |
| `listarLibros(incluirInactivos=False)` | Lista de diccionarios. |
| `consultarStock(id)` | Diccionario con enteros: `fisico`, `reservado`, `disponible`. Exige libro activo. |

El ISBN se compara sin espacios ni guiones y en mayúsculas. Debe ser único, incluidos los libros inactivos; no se verifica su asignación editorial ni su dígito de control. Email y teléfono se tratan como texto, no se validan como direcciones o números reales.

La API recibe los precios en céntimos enteros: `1250` equivale a 12,50 EUR. No pasar `12.50` ni booleanos como cantidades. La consola convierte el precio introducido en euros a céntimos sin usar coma flotante.

### Pedidos, reservas y ventas

| Método | Resultado y reglas principales |
|---|---|
| `crearReserva(cliente_id, lineas)` | ID entero del pedido; aparta unidades disponibles sin reducir stock físico. |
| `registrarVenta(cliente_id, lineas)` | ID entero; crea pedido vendido y descuenta stock físico. |
| `venderReserva(id)` | `True`; vende una reserva pendiente al precio guardado y descuenta una sola vez. |
| `cancelarReserva(id)` | `True`; libera disponibilidad sin borrar el pedido ni cambiar stock físico. |
| `consultarPedido(id)` | Diccionario o `None`; añade `cliente`, `lineas` y `total_centimos` entero a los campos del pedido. Incluye historial. |
| `listarPedidos(estado=None)` | Lista de pedidos históricos; filtro opcional `reservado`, `vendido` o `cancelado`. |

`lineas` es una lista o tupla no vacía de pares `(libro_id, cantidad)`. La cantidad debe ser un entero mayor que cero. Si un libro aparece varias veces, sus cantidades se agrupan. Los precios proceden del catálogo y quedan guardados en las líneas.

`disponible = fisico - reservado`. No hay un campo de stock reservado: se calcula a partir de las líneas de pedidos pendientes.

Una reserva solo puede pasar de `reservado` a `vendido` o `cancelado`. No hay reapertura, devolución de ventas ni edición directa de sus líneas en la aplicación actual. Para cambiar una reserva, cancelarla y crear otra.

### Ejemplo completo y aislado

Este bloque es autónomo y temporal. Prueba reservas, historial, reactivación, conversiones y copias sin escribir en `datos/` del proyecto:

```python
import json
import tempfile
from pathlib import Path
from UnicornBBDD import UnicornBBDD
from UnicornLibreria import UnicornLibreria
from UnicornIntercambio import UnicornIntercambio
from UnicornCopias import UnicornCopias

with tempfile.TemporaryDirectory(prefix="unicorn-manual-") as temporal:
    raiz = Path(temporal)
    config = raiz / "config.json"
    config.write_text(json.dumps({"instalacion": "datos", "tamanoRegistro": 512}), encoding="utf-8")
    conexion = UnicornBBDD(config)
    conexion.creaBaseDatos("tienda")
    conexion.usaBaseDatos("tienda")
    app = UnicornLibreria(conexion)
    app.prepararTablas()

    cliente = app.crearCliente("Prueba")
    libro = app.crearLibro("PRUEBA", "Libro de prueba", "", 1250, 10)
    reserva = app.crearReserva(cliente, [(libro, 2)])
    assert app.consultarStock(libro) == {"fisico": 10, "reservado": 2, "disponible": 8}
    app.venderReserva(reserva)
    assert app.consultarStock(libro) == {"fisico": 8, "reservado": 0, "disponible": 8}
    assert app.consultarPedido(reserva)["total_centimos"] == 2500
    app.desactivarCliente(cliente)
    assert app.consultarPedido(reserva)["cliente"]["activo"] == "0"
    app.reactivarCliente(cliente)

    intercambio = UnicornIntercambio(conexion)
    for formato in ("json", "csv"):
        carpeta = raiz / ("exportacion_" + formato)
        intercambio.exportar(carpeta, formato)
        intercambio.importar(carpeta, formato, "importada_" + formato)

    copias = UnicornCopias(conexion)
    copias.crear(raiz / "copia")
    assert len(copias.comprobar(raiz / "copia")["archivos"]) == 17
    copias.restaurar(raiz / "copia", "restaurada")
    assert conexion.basededatos == "tienda"  # La sesión no cambia de base.
```

## 10. Recuperación: `UnicornOperaciones`

`UnicornOperaciones(conexion, tablas)` queda vinculado a la base seleccionada y a una lista no vacía de tablas. Copia sus cuatro archivos y el `relaciones.json` de la base.

| Método | Resultado |
|---|---|
| `ejecutar(nombre)` | Gestor de contexto para `with`; conserva el estado previo hasta confirmar. No devuelve un resultado de negocio. |
| `recuperarPendiente()` | Devuelve `True` si restaura una operación pendiente o `False` si no había ninguna. Si la copia está dañada, falla y mantiene el bloqueo. |

Secuencia de una operación comercial:

1. Valida los datos que se van a escribir y prepara una copia previa con huellas SHA-256.
2. Publica `.operacion-pendiente` antes de las escrituras.
3. Ejecuta los cambios de pedido, líneas y stock.
4. Si termina correctamente, retira el marcador y limpia la copia temporal.
5. Ante una excepción ordinaria, intenta restaurar los archivos previos y propaga el error.
6. Ante una interrupción que deje el marcador, la siguiente apertura mediante `UnicornLibreria` intenta recuperar el estado previo.

Los métodos de negocio ya usan este mecanismo. No envolver llamadas a `app.crearReserva`, por ejemplo, en otro `ejecutar`: no admite operaciones anidadas. Para una nueva operación comercial, seguir el patrón interno: validar entradas, abrir un único contexto, escribir mediante el motor y validar el estado antes de confirmar.

Las consultas de la aplicación también comprueban si hay recuperación pendiente. Abrir la aplicación puede, por tanto, restaurar datos; no es siempre una operación de solo lectura. Las copias manuales rechazan operaciones pendientes en vez de recuperarlas silenciosamente.

No equivale a transacciones ACID, no bloquea procesos concurrentes y no cubre la creación de tablas ni una compactación directa. Una copia temporal de operación tampoco sustituye una copia manual duradera.

## 11. Conversiones: `UnicornIntercambio`

| Método | Resultado |
|---|---|
| `UnicornIntercambio(conexion)` | Usa la instalación y el tamaño de bloque de la conexión. |
| `exportar(destino, formato)` | Exporta la base seleccionada; devuelve la ruta absoluta de una carpeta nueva. `formato` es `"csv"` o `"json"`. |
| `importar(origen, formato, nombre)` | Lee una carpeta exportada y crea una base nueva; devuelve su ruta. No modifica la selección ni el JSON de configuración. |

El directorio padre de la exportación y la carpeta de instalación para importar deben existir. El destino final no puede existir, ni siquiera como carpeta vacía. Las rutas relativas de intercambio parten del directorio de trabajo del proceso.

### Archivos de intercambio

```text
exportacion_json/             exportacion_csv/
└── datos.json               ├── clientes.csv
                             ├── libros.csv
                             ├── pedidos.csv
                             ├── lineas_pedido.csv
                             └── manifiesto.json
```

El formato JSON tiene `formato: "unicorn-intercambio-1"` y `tablas`. Cada una de las cuatro tablas contiene `registros` (lista de diccionarios) y `retirados` (lista de IDs en texto sin bloque tras compactación). Todos los valores de cada registro son cadenas; no convertir los IDs o cantidades a números JSON.

En CSV cada tabla tiene una cabecera con sus campos exactos y en orden. El manifiesto contiene el mismo identificador de formato y los IDs retirados de cada tabla. Debe conservarse con los cuatro CSV. No se importa un CSV aislado de cualquier programa.

Las comas, comillas y saltos internos se protegen mediante CSV estándar. Estos CSV no tienen bloques fijos ni `.idx`. Al abrirlos con hojas de cálculo, evitar conversiones automáticas de IDs/ISBN o interpretación de campos como fórmulas; no es una exportación de Excel con protección de fórmulas.

### Validación e importación

Se comprueban el formato, las cuatro tablas, campos, valores de texto, IDs positivos y únicos, `activo` y retirados. Después se reconstruyen bloques e índices en un temporal con los IDs originales, se validan las relaciones y las reglas comerciales, y solo entonces se publica la base.

No se vuelven a ejecutar ventas para importar: hacerlo descontaría stock otra vez. Se conservan estados, cantidades, precios históricos e inactivos. Las relaciones se configuran según la plantilla de la librería, no se importa un modelo arbitrario de otro negocio.

Una importación puede usar otro tamaño de bloque si todos los registros caben; eso reconstruye el formato. Las copias físicas, en cambio, no convierten tamaños. La importación no garantiza idéntica posición física o relleno al original: conserva la información y los IDs.

La conversión carga el conjunto en memoria. No está diseñada para importar archivos enormes ni para fusionar datos con una base existente.

## 12. Copias: `UnicornCopias`

| Método | Resultado |
|---|---|
| `UnicornCopias(conexion)` | Solo `crear` necesita una base seleccionada. |
| `crear(destino)` | Crea y valida una carpeta nueva fuera de la base original. Devuelve su ruta absoluta. |
| `comprobar(origen)` | Comprueba huellas y contenido sin alterar la copia; devuelve el manifiesto. Usa el tamaño declarado en la copia para verificarla. |
| `restaurar(origen, nombre)` | Restaura en una base nueva con el tamaño de la configuración destino. Devuelve la ruta y mantiene la selección actual. |

```text
copia_unicorn/
├── copia.json
└── archivos/
    ├── relaciones.json
    ├── clientes.csv
    ├── clientes.esquema
    ├── clientes.idx
    ├── clientes.meta.json
    └── ... los archivos de libros, pedidos y lineas_pedido
```

El manifiesto incluye `formato` (`unicorn-copia-1`), `base`, `fecha` en UTC, `tamanoRegistro` y `archivos` (nombre → SHA-256). Los nombres admitidos son los 17 archivos conocidos; no se toman rutas arbitrarias del manifiesto y se rechazan enlaces y desvíos de ruta.

La comprobación no se limita a comparar hashes: abre los datos para validar índices, bloques, esquema, relaciones y stock. Al restaurar se copian y verifican en un temporal antes de publicar el nuevo nombre. No se modifica una base que ya exista.

El tamaño de registro debe coincidir con la configuración de restauración. Los bytes, posiciones e IDs retirados se conservan. No se copian permisos del sistema, código, configuración global ni temporales. Para conservar todo el proyecto hay que respaldar también esos otros archivos por separado.

SHA-256 permite detectar cambios respecto al manifiesto; no autentica al autor si alguien puede alterar tanto los datos como sus huellas. La copia no está cifrada. Para protegerse de una avería del disco, guardarla también en otro dispositivo.

### Restaurar cuando la consola no puede abrir la base original

Puede usarse la API sin seleccionar esa base. Desde la carpeta del proyecto:

```powershell
py -c "from UnicornBBDD import UnicornBBDD; from UnicornCopias import UnicornCopias; print(UnicornCopias(UnicornBBDD('config.json')).restaurar('copia_unicorn', 'unicorn_restaurada'))"
py .\consola_unicorn.py --base unicorn_restaurada
```

Requiere una copia válida, instalación existente, permisos de escritura, tamaño compatible y que `unicorn_restaurada` no exista. No repara ni elimina la base original.

## 13. Instalador, consola y datos iniciales

### Instalador

| Función | Responsabilidad y retorno |
|---|---|
| `comprobarPermisos(carpeta)` | Recibe `Path`; crea la carpeta si falta, prueba escritura exclusiva y retira su archivo. Devuelve `None`; propaga errores sin reintentos al denegarse la apertura. |
| `prepararBase(conexion, nombre, ejemplos=False)` | Valida una base existente (`False`) o prepara y publica una nueva (`True`). Los 50 registros solo se ofrecen para `unicorn_demo`. |
| `instalar(ruta, consola)` | Recoge opciones y confirma; devuelve `True` si completa, `False` si se cancela mediante menú/confirmación. Otras interrupciones se propagan al punto de entrada. |
| `principal(argumentos=None)` | Analiza `--config` y `--sin-color`; devuelve 0 al completar o cancelar, 1 ante errores previstos. |

Muestra la configuración actual antes de ofrecer conservar/modificar/cancelar. Al modificar, Enter conserva los valores actuales; sin configuración válida propone `./datos` y 512. Permite rutas absolutas o relativas.

Solo guarda el JSON después de preparar o validar la base. Si falla el guardado final, puede quedar una base nueva completa para reintentar; no debe anunciarse que todo el proceso es una transacción indivisible. Las bases existentes no se rellenan ni se regeneran automáticamente.

### Consola

`ConsolaUnicorn(app=None, entrada=None, salida=None, color=None)` permite inyectar entrada y salida en las pruebas. `OperacionCancelada` representa la cancelación de un formulario. `principal(argumentos=None)` admite `--base`, `--config` y `--sin-color` y devuelve 0 al salir/cancelar o 1 ante error de apertura.

| Métodos | Función |
|---|---|
| `ancho()`, `limpiar()`, `pausa()` | Adaptación al terminal, limpieza y espera interactiva. |
| `mostrar(texto="", tono="")`, `cabecera(titulo)` | Texto seguro, colores y cabeceras. |
| `tabla(registros, columnas)`, `ficha(registro)`, `fichaRegistro(registro)` | Presentación; la última traduce campos técnicos a etiquetas legibles. |
| `leer(mensaje)`, `texto(etiqueta, obligatorio=False, actual=None)` | Entrada de texto; `!` cancela. |
| `entero(etiqueta, minimo=1, actual=None)`, `precio(actual=None)` | Validación de números; precio devuelve céntimos enteros. |
| `dinero(centimos)`, `confirmar(mensaje)` | Presentación en euros y confirmación booleana; Enter significa no. |
| `listarClientes(historial=False)`, `listarLibros(historial=False)`, `listarPedidos(estado=None)` | Tablas para selección y consulta. No confundir con los métodos homónimos de la aplicación. |
| `cliente(editar=False)`, `libro(editar=False)` | Formularios de alta o modificación. |
| `desactivar(tipo)`, `reactivar(tipo)` | Acciones confirmadas; `tipo` es `"cliente"` o `"libro"`. |
| `crearPedido(reserva=True)`, `detallePedido(id=None)`, `resolverReserva(vender)` | Formularios comerciales y detalles. |
| `exportarDatos(formato)`, `importarDatos(formato)` | Interfaz de intercambio. |
| `crearCopia()`, `comprobarCopia()`, `restaurarCopia()` | Interfaz de copias. |
| `menu(titulo, opciones, principal=False)`, `ejecutar()` | Bucle de opciones y organización de los seis menús principales. |

Los formularios presentan resultados, no son la API recomendada para automatizar el negocio. Una futura interfaz gráfica debería llamar a `UnicornLibreria` y los gestores, no simular entradas de la consola.

### Datos iniciales

`abrirDemo(conexion)` crea `unicorn_demo` si no existe y devuelve `UnicornLibreria`; si ya existe, la valida sin recargar registros. Selecciona esa base en la conexión. El nombre no impide editar o añadir datos después.

El conjunto inicial contiene 10 clientes, 12 libros, 10 pedidos y 18 líneas: 50 registros, con 4 reservas, 4 ventas y 2 pedidos cancelados. Hay un cliente y un libro inactivos y un libro sin stock. Estos números describen la creación inicial, no el estado tras usar la aplicación.

`isbnInicial(numero)` genera identificadores sintéticos con formato ISBN-13; no acredita asignación editorial. `actualizarDatosIniciales(app)` es una migración explícita de los antiguos datos iniciales, devuelve la cantidad de registros tratados y no se ejecuta al arrancar. No usarla como función de reinicio ni aplicarla indiscriminadamente a datos personalizados.

## 14. Excepciones y recuperación segura

| Excepción | Situaciones habituales |
|---|---|
| `ValueError` | Campos, nombres, IDs, relaciones, stock, esquema o tamaño incompatibles. |
| `FileNotFoundError` | Base, tabla, configuración o archivo requerido ausente. |
| `FileExistsError` | Destino ya existente; se debe elegir otro nombre, no sobrescribirlo. |
| `PermissionError` / `OSError` | Falta de permisos, fallos de lectura/escritura o publicación. |
| `RuntimeError` | Operación pendiente, compactación pendiente o cambios detectados durante una copia. |
| `csv.Error` / `json.JSONDecodeError` | Archivos de texto mal formados; la segunda deriva de `ValueError`. |

La interfaz captura errores previstos y los muestra. La API los propaga para que el programa que la use decida qué hacer. No capturar un error y continuar escribiendo como si la validación hubiese tenido éxito.

Ante una base dañada: cerrar otras sesiones, conservar los archivos y marcadores para diagnóstico y restaurar una copia válida con nombre nuevo. No borrar `.operacion-pendiente` ni `.compactacion-pendiente` para forzar la apertura. La primera puede recuperarse mediante la aplicación; la segunda requiere revisión técnica o restauración desde una copia previa.

Los métodos que empiezan por `_` son auxiliares internos: rutas, preparación de bloques, lecturas del índice, validaciones y copia temporal. Los módulos del proyecto los comparten donde es necesario, pero no constituyen una API estable para aplicaciones externas.

## 15. Pruebas, mantenimiento y límites

Desde la carpeta del proyecto:

```powershell
py -B -m unittest discover -p "pruebas_*.py"
```

Los siete archivos de pruebas cubren motor, relaciones, negocio/operaciones, consola, instalador, intercambio y copias. Usan temporales; no dependen de las bases guardadas por el alumno. Algunos fallos de permisos e interrupciones se simulan expresamente.

La batería verificada al preparar esta documentación consta de 172 pruebas. El total puede cambiar con futuras ampliaciones; la salida real de la ejecución es la referencia. No implica cobertura del 100 % ni certificación de producción.

Limitaciones que deben mantenerse visibles al ampliar el proyecto:

- Un único proceso por base; sin bloqueo concurrente ni garantías ACID generales.
- Bloques fijos y validaciones costosas; listados e intercambio utilizan memoria proporcional a los datos.
- Sin consultas SQL, migraciones automáticas de esquema, autenticación, cifrado ni permisos por usuario.
- Las reglas de relaciones no sustituyen las reglas comerciales: el motor genérico no valida todo el negocio.
- Los archivos de versiones anteriores de clase no son directamente compatibles.
- Exportar/importar y copiar/restaurar trabajan con el modelo completo de librería, no fusionan bases.
- La compactación interrumpida no tiene recuperación automática equivalente a la de las operaciones comerciales.

