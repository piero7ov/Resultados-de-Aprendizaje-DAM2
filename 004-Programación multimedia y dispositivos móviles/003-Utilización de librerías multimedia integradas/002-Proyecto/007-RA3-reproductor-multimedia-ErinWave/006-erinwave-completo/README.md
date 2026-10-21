# ERINWAVE

ERINWAVE es un reproductor musical local de **ERIN IU**. Combina biblioteca, cola de reproducción, karaoke por frases, visualizaciones reactivas y ecualización. Su interfaz permite elegir entre cinco aspectos de reproductores clásicos sobre un fondo oscuro común.

La aplicación se ejecuta en el navegador mediante un servidor local PHP. Las canciones, letras y subtítulos se guardan en el equipo; no necesita un servicio de streaming.

## Funciones

- Biblioteca de archivos MP3 con búsqueda por canción o artista y carga desde el botón **+**.
- Reproducción, pausa, desplazamiento por la canción, orden aleatorio y repetición.
- Cola de reproducción plegable.
- Forma de onda de la canción con indicación del progreso.
- Karaoke sincronizado por frases en español e inglés, sin traducir la letra.
- Gestión de letras de referencia en SQLite y comparación con la transcripción.
- Visualizaciones MilkDrop con selección de efectos, pantalla completa y ventana flotante.
- Ecualizador de cinco bandas con restablecimiento.
- Conversión de los primeros 10 segundos de la canción seleccionada de MP3 a WAV PCM de 16 bits.
- Interfaz en español e inglés, atajos de teclado y distribución adaptable.
- Cinco aspectos seleccionables, desde Aero hasta MMD3.
- Tipografía Audiowide para la marca y los títulos de canciones.

## Aspectos del reproductor

El selector **Aspecto** ofrece **Aero** (la interfaz original de aire Frutiger Aero), **Winamp Retro Chrome** (metal azul y pantalla LCD), **Winamp Classic** (controles retro), **Fallout Pip-Boy** (terminal oscuro y verde) y **MMD3** (carcasa plateada y pantallas ámbar). El navegador recuerda la elección.

Todos comparten el mismo fondo oscuro. MMD3 organiza la pantalla y los mandos en la parte superior; en escritorios amplios, el ecualizador se despliega lentamente a la derecha y el karaoke a la izquierda, ambos con marcos cromados. En ventanas más estrechas, los paneles se colocan debajo. El visualizador puede plegarse hasta dejar visible solo su cabecera.

## Requisitos

- **Reproductor y biblioteca:** XAMPP con Apache y PHP 8.2, extensiones `pdo_sqlite` y `mbstring` habilitadas, y un navegador con Web Audio API. Apache necesita permiso de escritura en `audio/`, `datos/`, `letras/`, `subtitulos/` y `subtitulos-brutos/`.
- **Visualizaciones MilkDrop:** navegador con WebGL 2 y Node.js con npm para instalar `butterchurn` y `butterchurn-presets`. Node.js solo instala los paquetes y ejecuta las pruebas; el servidor sigue siendo Apache/PHP.
- **Generación de karaoke:** Python con el paquete `openai-whisper`, FFmpeg disponible para el proceso de Apache, el modelo `small` descargado y `proc_open` habilitada en PHP. Para reproducir subtítulos VTT ya guardados no hace falta ejecutar Whisper.

## Puesta en marcha

1. Alojar el proyecto en el directorio público de XAMPP e iniciar Apache.
2. Comprobar las extensiones de PHP con `php -m` (deben aparecer `pdo_sqlite` y `mbstring`) y los permisos de escritura de las carpetas indicadas arriba.
3. Abrir PowerShell en la carpeta `006-erinwave-completo` e instalar las dependencias fijadas en `package-lock.json`:

   ```powershell
   npm.cmd ci --ignore-scripts
   ```

4. Abrir `index.html` a través de `http://localhost/` y la ruta del proyecto. No abrirlo mediante `file://`.
5. Añadir canciones a la biblioteca. Para poder **generar** karaoke, completar también el apartado siguiente.

`package.json` declara `butterchurn` (motor MilkDrop) y `butterchurn-presets` (efectos seleccionables); `package-lock.json` fija sus versiones y las de sus dependencias secundarias. npm las instala en `node_modules/`, desde donde Apache las sirve al navegador. Esa carpeta no se guarda en Git y debe instalarse en cada copia del proyecto. Audiowide se carga desde `fuentes/` y no requiere npm.

### Instalar el entorno de karaoke en Windows

Desde la **raíz de este repositorio**, crear el entorno virtual e instalar Whisper:

```powershell
python -m venv .runtime\whisper
& .\.runtime\whisper\Scripts\python.exe -m pip install openai-whisper
```

Instalar FFmpeg por separado, añadir su carpeta `bin` al `PATH` de Windows y comprobarlo con `ffmpeg -version`. Reiniciar Apache después de modificar el `PATH` para que el proceso de PHP también pueda encontrarlo.

Descargar el modelo `small` en la ruta que utiliza ERINWAVE:

```powershell
& .\.runtime\whisper\Scripts\python.exe -c "import whisper; whisper.load_model('small', device='cpu', download_root=r'.runtime\whisper\models')"
```

`api/generar-karaoke.php` calcula la raíz del repositorio con `dirname(__DIR__,6)` y espera encontrar:

```text
.runtime/whisper/Scripts/python.exe
.runtime/whisper/models/small.pt
```

Comprobar que existen ambos archivos y que `proc_open` no está deshabilitada en la configuración de PHP. `.runtime/` es local y está excluida de Git; en otra copia hay que repetir esta instalación. Si cambia la profundidad de carpetas del proyecto o se usa otro sistema operativo, deben adaptarse las rutas de `api/generar-karaoke.php`. El proceso utiliza `small` en CPU y realiza transcripción, no traducción.

## Biblioteca y letras

### Añadir música

Pulsar **+** en Biblioteca para seleccionar un MP3 o copiarlo directamente a `audio/`. La biblioteca detecta los archivos periódicamente y registra las canciones en SQLite.

La convención `Artista - Título.mp3` permite separar artista y canción. Los nombres que no se ajustan al formato pueden aparecer con artista desconocido. La carga desde la interfaz admite MP3 de hasta 100 MiB, siempre que los límites `upload_max_filesize` y `post_max_size` de PHP lo permitan.

### Añadir una letra de referencia

Abrir `gestionar-letras.php` desde el servidor local para asociar una letra a su canción e indicar el idioma.

También se pueden colocar archivos UTF-8 en `letras/`, con el mismo nombre base que el MP3 y uno de estos sufijos:

- `.es.txt`: letra en español.
- `.en.txt`: letra en inglés.

Debe existir un solo archivo de idioma por canción. Si aparecen ambos, el importador señala el conflicto y no elige uno automáticamente. Utilizar únicamente música y letras que se tenga autorización para usar.

La carpeta `letras/` puede estar vacía aunque haya letras guardadas: la información introducida desde el gestor se almacena en `datos/erinwave.sqlite`.

## Karaoke

1. Seleccionar una canción.
2. Pulsar el micrófono con brillo para generar sus subtítulos.
3. Esperar a que termine el proceso; el indicador circular muestra que está trabajando.
4. Cuando el VTT está disponible, el micrófono permite abrir o cerrar el karaoke.

Whisper obtiene la transcripción y sus tiempos. Si existe una letra revisada, se emplea como referencia para la comparación y alineación; el idioma de esa letra guía el reconocimiento. Sin referencia, Whisper detecta el idioma.

La frase actual aparece destacada junto a la anterior y la siguiente. Pulsar una frase permite saltar a su posición. Los tiempos son aproximados: el canto, los coros, la mezcla musical o las repeticiones pueden producir errores de reconocimiento o de alineación.

El resultado se guarda en `subtitulos/` y se reutiliza al volver a seleccionar la canción. La salida original se conserva en `subtitulos-brutos/`. La generación en CPU puede tardar varios minutos y solo se admite un trabajo simultáneo. Cerrar la página no garantiza que el proceso del servidor se cancele.

## Controles de sonido

El volumen inicia al 30 % y utiliza una curva progresiva para facilitar los ajustes bajos.

El botón de deslizadores, junto al volumen, despliega el **ecualizador**:

- En Aero, se abre junto a los controles; en MMD3, aparece a la derecha de la carcasa y esta se desplaza suavemente para dejarle espacio.
- En MMD3, el karaoke se despliega a la izquierda cuando cabe junto al reproductor.
- En ventanas estrechas, los paneles se abren debajo para mantener accesibles los controles.

Las bandas corresponden a **100 Hz, 400 Hz, 1 kHz, 4 kHz y 10 kHz**, con un rango de −6 a +6 dB. Arrancan a 0 dB y se pueden restablecer con el botón circular. Los ajustes se mantienen durante la sesión. Los realces aplican una atenuación preventiva para reservar margen, por lo que pueden reducir el volumen global.

## Conversión a WAV

Selecciona una canción y pulsa **WAV**, junto al ecualizador y al karaoke. ERINWAVE decodifica el MP3 con Web Audio API, convierte sus primeros 10 segundos a PCM de 16 bits y descarga el resultado en formato WAV. Si la canción dura menos, convierte su duración completa. La reproducción actual y sus ajustes de volumen y ecualización no se modifican.

## Visualizador y ventana flotante

El selector ofrece efectos MilkDrop con nombres abreviados; el nombre completo aparece al mantener el puntero sobre la opción. La flecha lateral pasa al siguiente efecto. Butterchurn recibe el analizador de Web Audio de ERINWAVE y dibuja en el navegador mediante WebGL 2. Cada preset define sus propias formas y animaciones, por lo que cuánto se nota la reacción al sonido depende del efecto elegido.

- **Plegar:** oculta el contenido conservando la cabecera y sin detener la música.
- **Pantalla completa:** amplía el visualizador; Escape permite salir.
- **Ventana flotante:** utiliza Document Picture-in-Picture cuando está disponible. Como alternativa, intenta abrir una ventana normal, que puede ser bloqueada y no garantiza permanecer encima.

La ventana flotante conserva título, artista, transporte y volumen. El ecualizador sigue aplicándose al audio, pero su panel permanece en el reproductor principal. Cerrar la ventana o usar el control de retorno devuelve el visualizador a su lugar.

La página principal debe permanecer abierta para mantener la reproducción. El navegador controla la barra superior de la ventana flotante, incluido el origen `localhost`.

## Atajos de teclado

| Tecla | Acción |
| --- | --- |
| Espacio o K | Reproducir / pausar |
| J / L | Retroceder / avanzar 10 segundos |
| P / N | Canción anterior / siguiente |
| ↑ / ↓ | Subir / bajar el volumen 5 puntos |
| M | Silenciar / recuperar el volumen anterior |
| E | Abrir / cerrar el ecualizador en la página principal |

Los atajos también se conectan a la ventana flotante, excepto E. No actúan al escribir ni sobre botones, enlaces, selectores o deslizadores enfocados, que conservan su comportamiento de teclado. Tampoco se aplican con Ctrl, Alt, Meta o Mayús.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `index.html` | Estructura del reproductor y estilos base |
| `reproductor.js` | Biblioteca, cola, reproducción, idiomas y karaoke |
| `audio-visual.js` | Fuente de audio, filtros y volumen |
| `conversor-wav.js` | Decodificación del MP3 y creación de WAV PCM |
| `erinwave.css` / `erinwave.js` | Acabado de ERIN IU, ecualizador y atajos |
| `visualizador.css` / `visualizador.js` | Forma de onda, MilkDrop y ventana flotante |
| `skins.js` / `skin-*.css` | Selector y estilos de los cuatro aspectos alternativos a Aero |
| `api/` | Biblioteca, subida de MP3, letras, SQLite y generación de subtítulos |
| `gestionar-letras.php` | Gestión de letras de referencia |
| `audio/` | Archivos MP3 |
| `datos/erinwave.sqlite` | Canciones, letras y estado de los trabajos |
| `letras/` | Archivos de texto para importación |
| `subtitulos/` | Subtítulos utilizados por el karaoke |
| `subtitulos-brutos/` | Transcripciones originales |
| `fuentes/` / `iconos/` | Tipografía, licencia y recursos gráficos |
| `node_modules/` | Dependencias locales del visualizador |

El audio utiliza una sola fuente Web Audio. Su recorrido es: margen de entrada, cinco filtros, analizador, volumen y salida. El visualizador escucha el analizador sin duplicar la salida de sonido. La animación respeta la preferencia de movimiento reducido y se detiene cuando el visualizador no necesita dibujarse.

## Diagnóstico y pruebas

Para mostrar el panel de diagnóstico durante la generación de karaoke, abrir `index.html?debug=1`. Sin ese parámetro, permanece oculto. Este modo es una ayuda de mantenimiento, no un mecanismo de autenticación.

Pruebas locales sin reproducir música ni modificar la biblioteca:

```powershell
node comprobar-audio.cjs
node comprobar-visualizador.cjs
node comprobar-controles.cjs
```

Estas pruebas simulan Web Audio, el DOM y las ventanas. Comprueban el audio, los filtros, el ciclo del visualizador, los atajos y los estados del ecualizador. No sustituyen la comprobación de sonido, GPU o PiP real en el navegador de destino.

## Resolución de problemas

- **La biblioteca no carga:** comprobar Apache, la URL mediante localhost, las extensiones PHP y los permisos de las carpetas.
- **No se puede subir un MP3:** revisar su formato y tamaño, los límites de PHP y si ya existe un archivo con el mismo nombre.
- **No aparecen efectos:** comprobar `node_modules/` y la disponibilidad de WebGL 2. El audio puede seguir funcionando sin visualizaciones.
- **No se genera karaoke:** revisar las rutas de Python y del modelo, FFmpeg, `proc_open` y los permisos. Activar el diagnóstico para consultar el estado.
- **No se abre la ventana flotante:** comprobar la compatibilidad del navegador y el permiso de ventanas emergentes.
- **No aparecen cambios de estilo:** recargar con Ctrl + F5.

## Uso local y conservación de datos

ERINWAVE está pensado para ejecutarse en el equipo local. El gestor y las API no incorporan autenticación; no deben exponerse directamente a Internet.

Para conservar la biblioteca, guardar una copia de `audio/`, `datos/`, `letras/`, `subtitulos/` y `subtitulos-brutos/` cuando no haya escrituras ni generación en curso. La aplicación permite descargar un fragmento de audio convertido a WAV, pero no graba vídeo del visualizador.

## Créditos y licencias

- [Butterchurn](https://github.com/jberg/butterchurn) y [butterchurn-presets](https://github.com/jberg/butterchurn-presets): motor MilkDrop y efectos; licencias incluidas en sus paquetes.
- [Audiowide, de Astigmatic](https://github.com/google/fonts/tree/main/ofl/audiowide): fuente local bajo SIL Open Font License; licencia en `fuentes/OFL.txt`.
- [OpenAI Whisper](https://github.com/openai/whisper): reconocimiento de audio para generar subtítulos.
- [Document Picture-in-Picture](https://developer.chrome.com/docs/web-platform/document-picture-in-picture): documentación de la ventana flotante.

Los archivos musicales y las letras mantienen los derechos de sus respectivos titulares.
