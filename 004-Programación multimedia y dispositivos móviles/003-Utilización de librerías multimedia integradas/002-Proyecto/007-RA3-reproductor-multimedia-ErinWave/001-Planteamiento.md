# ERINWAVE — planteamiento del RA3

## Objetivo

**ERINWAVE** será un reproductor musical local y un módulo independiente de **ERIN IU**. Permitirá gestionar canciones, reproducir audio, mostrar letras sincronizadas y generar visualizaciones en tiempo real.

La interfaz combinará una organización moderna —biblioteca, búsqueda y cola— con el aspecto de un reproductor físico de principios de los 2000. Su diseño Aero tendrá carcasa plateada, pantalla LCD azul y controles con relieve; un selector ofrecerá también Winamp Retro Chrome, Winamp Classic, Fallout Pip-Boy y MMD3. Los cinco aspectos compartirán un fondo oscuro.

El proyecto servirá para demostrar los contenidos del RA3 de 0489 · Programación multimedia y dispositivos móviles: integración, reproducción, procesamiento, animación, conversión y almacenamiento de contenido multimedia.

## Funciones principales

- Reproducción de MP3 locales con controles de reproducción, progreso, volumen, anterior, siguiente, aleatorio y repetición.
- Biblioteca automática a partir de la carpeta `audio/`, con búsqueda y cola de reproducción.
- Botón `+` para importar un MP3 validado, rechazar duplicados y guardarlo en `audio/`.
- Visualizador abstracto generado en tiempo real a partir del audio, con varios estilos y pantalla completa.
- Karaoke mediante archivos WebVTT: frase anterior, actual y siguiente, además de salto al pulsar una línea.
- Generación de VTT con Whisper cuando una canción no tenga letra sincronizada. El resultado automático se mostrará por frases y quedará pendiente de revisión cuando no alcance la calidad necesaria.
- Interfaz en español e inglés. El idioma elegido se guardará en el navegador, pero no traducirá títulos ni letras.
- Ecualizador y descarga de los primeros 10 segundos de la canción seleccionada en formato WAV.

La aplicación funcionará con archivos locales, sin cuentas ni servicios externos. Está pensada inicialmente para una colección de unas diez canciones.

## Diseño

La interfaz se dividirá en tres áreas:

1. Biblioteca y cola.
2. Pantalla y visualizador.
3. Controles, ecualizador y karaoke.

La cola podrá minimizarse y el karaoke se desplegará sin ocultar el visualizador. En MMD3, el ecualizador y el karaoke se abrirán a los lados del reproductor cuando haya espacio. El diseño se adaptará a ventanas pequeñas y mostrará estados claros de reproducción, pausa, carga, error y ausencia de letra.

El selector `ES / EN` será compacto y formará parte de la carcasa. También actualizará los textos accesibles y el atributo `lang`. Español será el idioma inicial.

Para conseguir un visualizador similar a MilkDrop se utiliza **Butterchurn**, con varios presets instalados como dependencias locales. Si WebGL 2 no está disponible, se utilizará un visualizador básico con `canvas`.

## Base técnica

- HTML, CSS y JavaScript para la interfaz.
- `HTMLAudioElement` para la reproducción y sus eventos.
- Web Audio API para analizar el sonido, crear la forma de onda, aplicar el ecualizador y alimentar el visualizador.
- `canvas` y `requestAnimationFrame()` para las animaciones propias y el modo de respaldo.
- PHP para explorar `audio/`, importar archivos y controlar la generación de karaoke.
- WebVTT para las letras sincronizadas.
- Whisper `small` en CPU para transcribir o calcular tiempos. Solo se procesarán MP3 detectados dentro del proyecto y no se ejecutarán dos trabajos simultáneos.
- SQLite para guardar el catálogo, el progreso de Whisper y las letras revisadas.
- `AudioContext.decodeAudioData()`, `DataView` y `Blob` para convertir los primeros 10 segundos de un MP3 a WAV PCM y descargar el resultado.

Las letras autorizadas se podrán colocar en `letras/` con el mismo nombre del MP3 y el sufijo `.es.txt` o `.en.txt`. La salida original de Whisper se conservará en `subtitulos-brutos/` y el VTT utilizado por la aplicación se guardará en `subtitulos/`.

El proyecto se ejecutará mediante XAMPP, ya que la exploración automática, SQLite y Whisper requieren PHP. No funcionará completamente abriendo el HTML como `file://`.

## Flujo de canciones y karaoke

1. El usuario copia o importa un MP3 en `audio/`.
2. ERINWAVE actualiza la biblioteca y registra la canción en SQLite sin interrumpir la reproducción actual.
3. Si el nombre sigue el formato `Artista - Título.mp3`, se separan ambos datos. En otro caso se muestra el nombre real sin inventar información.
4. Al seleccionar la canción se calculan su duración y forma de onda.
5. Si existe un VTT, se habilita el karaoke. Si no existe, se ofrece su generación con Whisper.
6. El VTT generado se valida antes de utilizarlo. Si hay una letra revisada, se emplea como referencia para mejorar el texto sin afirmar una precisión temporal inexistente.
7. El idioma de la interfaz y el de la canción se tratan de forma independiente. ERINWAVE no traducirá las letras.

## Cinco versiones incrementales

Cada versión tendrá una carpeta autocontenida con un `index.html` revisable y los recursos que necesite.

| Versión | Carpeta | Resultado comprobable |
| --- | --- | --- |
| **1 · Reproductor** | `002-reproductor-base/` | Diseño básico de ERINWAVE, selector `ES / EN`, lectura de `audio/`, reproducción, progreso, duración, volumen y errores. |
| **2 · Biblioteca** | `003-biblioteca-local/` | Biblioteca automática, búsqueda, cola, anterior/siguiente, aleatorio, repetición y actualización al añadir MP3. |
| **3 · Karaoke** | `004-karaoke/` | Lectura de VTT, frases sincronizadas, salto temporal y generación de karaoke con Whisper. |
| **4 · Visualizador** | `005-visualizador/` | Web Audio, presets de Butterchurn, pantalla completa y respaldo con `canvas`. |
| **5 · ERINWAVE completo** | `006-erinwave-completo/` | Integración de todas las funciones, cinco aspectos, ecualizador, conversión de 10 segundos a WAV, atajos, diseño adaptable, errores y documentación. |

Las versiones se comprobarán primero sin canciones y después con archivos aportados por el alumno. En la versión final se revisarán especialmente los cambios de pista y posición, la sincronización del karaoke, la pausa del visualizador y el respaldo cuando WebGL 2 no esté disponible.
