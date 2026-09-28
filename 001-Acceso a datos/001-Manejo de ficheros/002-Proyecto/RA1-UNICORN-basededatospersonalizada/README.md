# UNICORN — Base de datos personalizada

Proyecto del RA1 de **0486 · Acceso a datos**, unidad de Manejo de ficheros. UNICORN gestiona una librería con clientes, libros, reservas y ventas mediante archivos y clases Python, sin SQLite ni otro servidor de bases de datos. Se plantea como una herramienta del entorno ERIN.

Este README contiene la guía de uso y la revisión de los criterios del RA1. Para clases, métodos, formatos internos y ejemplos de programación, consulta [Documentación para desarrolladores](DOCUMENTACION_DESARROLLADORES.md).

## 1. Qué incluye

- Consola con ASCII, colores, formularios y tablas legibles.
- Altas, consultas, modificaciones, desactivación y reactivación de clientes y libros.
- Reservas, ventas, cancelaciones y control de existencias.
- Relaciones por ID e historial, aunque un cliente o libro esté inactivo.
- Instalador/configurador y conjunto inicial opcional de 50 registros.
- Importación y exportación CSV/JSON.
- Copias de seguridad completas, comprobación y restauración.
- Recuperación de operaciones interrumpidas y pruebas automatizadas.

## 2. Requisitos y preparación

Entorno verificado: **Windows con Python 3.13.7**. Se utiliza la biblioteca estándar; no es necesario instalar paquetes con `pip`, ejecutar XAMPP ni iniciar un servidor web.

Abre una terminal en esta carpeta del proyecto, donde están `instalador.py` y `consola_unicorn.py`. Los comandos siguientes parten de ella. Comprueba Python:

```powershell
py --version
```

Si tu sistema utiliza `python` en vez de `py`, sustituye el comando. No se han verificado todas las combinaciones de sistema operativo y versión.

Necesitas permisos de lectura y escritura en las carpetas utilizadas. Mantén una sola sesión por base: cierra la consola antes de volver a configurar su instalación y no ejecutes otra sesión sobre esa base durante una copia o exportación.

## 3. Instalación y configuración

```powershell
py .\instalador.py
```

El instalador prepara las carpetas, la configuración y la base. **No instala Python ni copia el programa a otra ubicación.**

### Si existe `config.json`

Primero muestra la ruta guardada, su ubicación absoluta y el tamaño del registro. Después ofrece:

| Opción | Acción |
|---|---|
| **1 · Conservar configuración** | No modifica el JSON. |
| **2 · Modificar** | Permite cambiar ruta y tamaño. Enter conserva cada valor actual. |
| **0 · Cancelar** | Sale sin guardar la configuración. |

Si el JSON es inválido, se puede elegir modificar o cancelar; conservarlo no permite continuar.

### Si no existe o se elige modificar

Introduce la carpeta de datos. En una instalación nueva se propone `./datos`, relativa a la carpeta del JSON. También puedes escribir una ruta absoluta, por ejemplo `C:\UnicornDatos`: el instalador crea la carpeta si falta y hay permisos.

Se propone un tamaño de registro de **512 bytes**. Consérvalo salvo que estés preparando deliberadamente otra configuración: cambiarlo no convierte las tablas existentes.

Después pide el nombre de base. Enter propone `unicorn_demo`. Si esa base no existe, permite elegir entre cargar los 50 registros iniciales o crearla vacía. Para otros nombres crea una base vacía. Si ya existe, la comprueba sin recargar datos.

Revisa el resumen y confirma con **s**. Verás los pasos de comprobación de permisos, preparación de base y guardado de configuración. Si no confirmas, no se inicia esa fase.

Configuración inicial de referencia:

```json
{
    "instalacion": "./datos",
    "tamanoRegistro": 512
}
```

Cambiar `instalacion` **no mueve los datos antiguos**. La aplicación buscará las bases en la nueva carpeta. Si falla el guardado final del JSON, puede quedar una base nueva completa para reintentar; no borres bases por tu cuenta para resolverlo.

## 4. Abrir la consola y elegir la base

```powershell
py .\consola_unicorn.py
```

Sin argumentos abre **`unicorn_demo`**. Si no existe, pide confirmación para crearla con los registros iniciales. Si ya existe, la abre tal como está, sin añadirlos otra vez. Una `unicorn_demo` creada vacía seguirá vacía.

`config.json` indica dónde están las bases, pero **no cuál se selecciona**:

```text
datos/
├── unicorn_demo/
├── basenuevaimportacion/
└── unicorn_restaurada/
```

Para abrir otra:

```powershell
py .\consola_unicorn.py --base basenuevaimportacion
```

Para una configuración diferente o para desactivar los colores:

```powershell
py .\consola_unicorn.py --config otra_config.json --base basenuevaimportacion
py .\consola_unicorn.py --sin-color
```
Importar y restaurar **no cambia la base de la sesión abierta**. Sal y vuelve a ejecutar la consola con `--base` para trabajar con la nueva.

## 5. Menús y controles

| Menú principal | Funciones |
|---|---|
| **1 · Clientes** | Listar activos, ver historial, crear, modificar, desactivar y reactivar. |
| **2 · Libros** | Catálogo y stock, ver también inactivos, crear, modificar, desactivar y reactivar. |
| **3 · Reservas** | Listar pendientes, crear, vender o cancelar una reserva. |
| **4 · Ventas e historial** | Venta directa, historial y detalle de pedido. |
| **5 · Importar y exportar** | Exportar JSON/CSV e importar a una base nueva. |
| **6 · Copias de seguridad** | Crear copia, comprobarla y restaurar en base nueva. |

- **0** vuelve al menú principal desde un submenú; en el principal, sale.
- **!** cancela el formulario antes de confirmar.
- **s** confirma; Enter en una pregunta `[s/N]` significa **no**.
- Al editar, Enter conserva el valor; **-** vacía campos opcionales.
- Los precios se escriben en euros, por ejemplo `12,50` o `12.50`, con un máximo de dos decimales.
- Cuando se pida una referencia, usa el número de la columna **Ref.** o **Pedido**, no el número de posición de la fila.

Las tablas muestran nombres de clientes y títulos de libros en lugar de dejar solo sus IDs. Las referencias numéricas siguen existiendo para identificar qué registro se selecciona.

## 6. Clientes y libros

Para crear un cliente entra en **Clientes → 3 · Crear**. El nombre es obligatorio; apellidos, email y teléfono pueden quedar vacíos. Para modificarlo usa la opción 4 y confirma los cambios.

Para crear un libro entra en **Libros → 3 · Crear**. Introduce ISBN, título, autor, precio y stock. ISBN y título son obligatorios. El ISBN no puede repetirse, ni siquiera en un libro inactivo. Precio y stock no pueden ser negativos.

### Desactivar y reactivar

La opción **5 · Desactivar** realiza una baja lógica: oculta el registro de las operaciones nuevas, pero conserva su historial. Se rechaza si el cliente o libro tiene reservas pendientes.

La opción **6 · Reactivar** muestra los inactivos y permite recuperar uno tras confirmarlo. Conserva el ID, los datos y el stock; no reabre pedidos cancelados. Si un registro se retiró físicamente mediante compactación, ya no puede reactivarse. La consola no ofrece compactación como acción de usuario.

## 7. Reservas, ventas y stock

Al crear una reserva o venta, selecciona un cliente activo y los libros con sus cantidades. Revisa las líneas y confirma. Cada pedido necesita al menos una línea.

| Acción | Qué ocurre |
|---|---|
| Crear reserva | Aparta unidades disponibles; no reduce las existencias físicas. |
| Vender reserva | Descuenta unidades físicas y deja de contarlas como reservadas. |
| Cancelar reserva | Libera las unidades apartadas sin modificar las existencias físicas. |
| Venta directa | Descuenta unidades disponibles sin utilizar las apartadas para otras reservas. |

**Disponible = físico − reservado.** Por ejemplo, si hay 10 unidades y reservas 2, quedan 10 físicas, 2 reservadas y 8 disponibles. Al vender esa reserva quedan 8 físicas, 0 reservadas y 8 disponibles.

Una reserva vendida o cancelada no puede venderse/cancelarse otra vez. Para cambiar una reserva confirmada, cancélala y crea otra. No hay devoluciones ni reapertura de ventas implementadas.

El precio de cada línea se conserva aunque cambie el del catálogo. En **Ventas e historial → 3 · Detalle de pedido** puedes consultar cliente, libros, cantidades, precios y total.

## 8. Exportar e importar

Son archivos de intercambio, no los CSV internos que hay en `datos/`. Se exportan las cuatro tablas, los registros inactivos y el historial.

### Prueba con JSON

1. Entra en **5 · Importar y exportar → 1 · Exportar JSON**.
2. Como carpeta escribe `exportacion_json`. Debe ser nueva; su carpeta padre debe existir.
3. Confirma con **s**. Dentro se creará `datos.json`.
4. Elige **3 · Importar JSON a base nueva**.
5. Como carpeta de origen escribe `exportacion_json`.
6. Como base nueva escribe `unicorn_prueba`, sin extensión, y confirma.

Para comprobar la importada, sal y ejecuta:

```powershell
py .\consola_unicorn.py --base unicorn_prueba
```

La base original queda intacta. Si el nombre ya existe, usa uno distinto: no se sobrescribe.

### Prueba con CSV

Repite con **2 · Exportar CSV** y **4 · Importar CSV**, utilizando `exportacion_csv` y `unicorn_prueba_csv`.

La carpeta debe conservar juntos estos cinco archivos:

```text
exportacion_csv/
├── clientes.csv
├── libros.csv
├── pedidos.csv
├── lineas_pedido.csv
└── manifiesto.json
```

Se pide **la carpeta**, no un CSV individual. Una carpeta llamada `exportacion.csv` también puede servir si contiene el conjunto completo, pero usar nombres como `exportacion_csv` evita confundir carpetas con archivos.

El manifiesto conserva los IDs retirados para no reutilizarlos. No eliminarlo. La importación comprueba campos, IDs, relaciones, tamaño y reglas comerciales antes de publicar la nueva base. No vuelve a ejecutar las ventas ni descuenta stock de nuevo.

Las rutas relativas de exportación/importación parten de la carpeta desde la que ejecutas la terminal, no de `instalacion` en el JSON.

## 9. Copias de seguridad y restauración

Una copia conserva los 17 archivos internos de la librería byte por byte: datos, índices, esquemas, metadatos y relaciones. **No incluye el programa ni `config.json`.**

### Crear y comprobar

1. Entra en **6 · Copias de seguridad → 1 · Crear copia de seguridad**.
2. Comprueba el nombre de la base que se copiará.
3. Escribe una carpeta nueva, por ejemplo `copia_unicorn`, fuera de la carpeta de esa base y dentro de una carpeta existente.
4. Confirma. Se creará `copia.json` junto a la carpeta `archivos/`.
5. Usa **2 · Comprobar copia** e indica `copia_unicorn` para verificarla sin restaurar nada.

Conserva juntos el manifiesto y los archivos. Las huellas SHA-256 permiten detectar cambios; también se comprueba la validez de los datos y las relaciones. La copia no está cifrada. Guarda otra copia en un dispositivo distinto para protegerte de fallos del disco.

### Restaurar

1. Elige **3 · Restaurar en base nueva**.
2. Indica `copia_unicorn` como carpeta de origen.
3. Escribe `unicorn_restaurada` como nombre nuevo, sin extensión.
4. Revisa el destino y confirma.

El tamaño de registro de la copia debe coincidir con el de la configuración. No se sobrescribe ninguna base ni se cambia el JSON. Para abrir la restaurada:

```powershell
py .\consola_unicorn.py --base unicorn_restaurada
```

Si la consola no puede arrancar porque la base original está dañada, se puede restaurar sin abrirla mediante la API; consulta el procedimiento en la sección 12 de [Documentación para desarrolladores](DOCUMENTACION_DESARROLLADORES.md).

### Tres mecanismos diferentes

| Mecanismo | Finalidad |
|---|---|
| Exportación CSV/JSON | Intercambiar información y reconstruir una base nueva. No conserva necesariamente las mismas posiciones físicas. |
| Copia de seguridad | Conservar los archivos internos exactos y restaurarlos con el mismo tamaño de bloque. |
| Recuperación de operaciones | Deshacer una operación comercial interrumpida mediante su copia temporal. No conserva una colección de copias históricas. |

## 10. Errores habituales

| Mensaje o situación | Qué revisar |
|---|---|
| «Usa letras sin tildes, números y guion bajo; no rutas» | Has escrito un nombre de base inválido. Usa `basenueva`, no `basenueva.csv`. |
| La carpeta de exportación/copia ya existe | Elige otro nombre, por ejemplo `exportacion_json_2`; no la borres si quieres conservar su contenido. |
| Falta `datos.json`, `manifiesto.json` o un CSV | Indica la carpeta correcta y conserva la exportación completa del formato elegido. |
| Falta un archivo de tabla | Comprueba que seleccionaste la base y ruta correctas. Si está incompleta, no crees archivos vacíos para forzar su apertura; utiliza una copia válida. |
| Acceso denegado | Comprueba permisos y elige una carpeta en la que puedas escribir. No es necesario guardar directamente en `C:\`. |
| Parece tardar tras confirmar | Espera al mensaje final; validar y copiar requiere trabajo de disco. Si necesitas interrumpir, Ctrl+C. No lances otra instancia sobre la misma base. |
| Tamaño incompatible | Cambiar el número del JSON no convierte archivos. Restaura el tamaño correcto o usa una configuración compatible. |
| No hay unidades disponibles | Revisa físico, reservado y disponible; las reservas de otros pedidos también cuentan. |
| No se puede desactivar | Resuelve las reservas pendientes de ese cliente/libro antes de darlo de baja. |
| Operación pendiente | Reabrir mediante la aplicación intenta recuperar el estado previo; no borres el marcador. Si falla, conserva los archivos para revisión. |
| Compactación pendiente | Requiere revisión técnica o restaurar una copia previa a otra base; no quitar el marcador manualmente. |
| Importé/restauré pero sigo viendo otra base | La sesión no cambia automáticamente. Reinicia con `--base nombre`. |
| Colores o caracteres extraños | Prueba `--sin-color` y una terminal compatible. |

## 11. Pruebas

Ejecuta desde la carpeta del proyecto:

```powershell
py -B -m unittest discover -p "pruebas_*.py"
```

Las pruebas generan sus datos en directorios temporales. No prueban sobre tus bases personales. La batería verificada al elaborar estos documentos contiene **172 pruebas**; en futuras versiones el número puede cambiar. La ejecución puede tardar por las escrituras y sincronizaciones de disco.

Para ejecutar un área concreta:

```powershell
py -B -m unittest pruebas_unicorn_intercambio
py -B -m unittest pruebas_unicorn_copias
```

| Archivo | Qué comprueba |
|---|---|
| [pruebas_unicorn_bbdd.py](pruebas_unicorn_bbdd.py) | Serialización, bloques, índices, CRUD y validaciones del motor. |
| [pruebas_unicorn_relaciones.py](pruebas_unicorn_relaciones.py) | Referencias válidas/rotas, historial y compactación protegida. |
| [pruebas_unicorn_libreria.py](pruebas_unicorn_libreria.py) | Reservas, stock, estados, precios históricos, reactivación y recuperación de operaciones. |
| [pruebas_unicorn_consola.py](pruebas_unicorn_consola.py) | Formularios, representación legible y datos iniciales. |
| [pruebas_unicorn_instalador.py](pruebas_unicorn_instalador.py) | Configuración, cancelación, rutas, permisos y conservación de bases. |
| [pruebas_unicorn_intercambio.py](pruebas_unicorn_intercambio.py) | Conversiones en ambos formatos, igualdad de datos y rechazo de conjuntos inválidos. |
| [pruebas_unicorn_copias.py](pruebas_unicorn_copias.py) | Igualdad de bytes, huellas, corrupción, restauración y fallos controlados. |

## 12. Revisión del RA1

Resultado de aprendizaje: **desarrollar aplicaciones que gestionen información almacenada en ficheros, identificando su campo de aplicación y utilizando clases específicas.**

| Criterio | Evidencia en UNICORN | Cómo comprobarlo |
|---|---|---|
| **a) Clases para gestionar ficheros y directorios** | `UnicornBBDD` organiza bases/tablas; `UnicornCopias` administra copias. Se utilizan `Path`, archivos abiertos y directorios temporales. | Revisar [motor](UnicornBBDD.py), [copias](UnicornCopias.py) y pruebas de creación/conservación del [instalador](pruebas_unicorn_instalador.py). |
| **b) Valorar ventajas e inconvenientes de las formas de acceso** | Comparación de acceso secuencial, directo con `seek` e índice. Se documentan relleno, límites y recorridos adicionales. | Leer sección 4 del [manual técnico](DOCUMENTACION_DESARROLLADORES.md); contrastar `buscarPosicion`, `leerRegistro`, `listarTodo` y `actualizar`. No se afirma que todo sea de coste constante. |
| **c) Clases para recuperar información** | Lectura de bloques, selección/listados y recuperación de datos relacionados. | [UnicornRelaciones.py](UnicornRelaciones.py) y `test_insertar_y_consultar_relaciones` en [sus pruebas](pruebas_unicorn_relaciones.py). Consultar un pedido desde la consola. |
| **d) Clases para almacenar información** | Altas, modificaciones, bajas lógicas y escrituras de pedidos/líneas/stock. | `test_crud_clientes`, `test_crud_libros` y `test_filtros_y_persistencia` en [pruebas de librería](pruebas_unicorn_libreria.py). Cerrar y reabrir una base de prueba. |
| **e) Conversiones entre formatos** | Conversión entre bloques internos, CSV estándar y JSON; importación validada a una base nueva. | [UnicornIntercambio.py](UnicornIntercambio.py), `test_ida_vuelta_json_y_csv` y `test_50_registros_ambos_formatos` en [sus pruebas](pruebas_unicorn_intercambio.py). |
| **f) Previsión y gestión de excepciones** | Rechazo de datos/referencias inválidos, control de permisos, mensajes y recuperación ante escrituras interrumpidas. | `test_permiso_denegado_no_reintenta` en [instalador](pruebas_unicorn_instalador.py), `test_fallo_entre_lineas_restaura_todo` en [librería](pruebas_unicorn_libreria.py) y rechazos de [copias](pruebas_unicorn_copias.py). |
| **g) Pruebas y documentación** | Siete módulos de pruebas, esta guía y referencia técnica con ejemplos. | Ejecutar la batería y revisar [DOCUMENTACION_DESARROLLADORES.md](DOCUMENTACION_DESARROLLADORES.md). Guardar el resultado real de la ejecución para la entrega. |

