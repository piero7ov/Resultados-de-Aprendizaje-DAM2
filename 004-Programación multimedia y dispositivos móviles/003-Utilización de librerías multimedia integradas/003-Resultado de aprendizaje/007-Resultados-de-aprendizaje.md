# Resultado de aprendizaje 3 — ERINWAVE

En ERINWAVE he desarrollado un reproductor musical local integrado en **ERIN IU**. La aplicación organiza canciones en una biblioteca y una cola, reproduce archivos MP3, muestra letras sincronizadas y ofrece un visualizador y un ecualizador. La he construido con tecnologías web y PHP; la biblioteca y los datos de las letras se guardan en el equipo.

## a) Entornos de desarrollo multimedia

He analizado las necesidades del reproductor y he elegido HTML, CSS y JavaScript para ejecutarlo en un navegador. XAMPP aporta Apache y PHP para explorar la biblioteca, recibir archivos y acceder a SQLite. `HTMLAudioElement` reproduce la música y Web Audio API permite analizar y procesar el sonido. Para los efectos MilkDrop utilizo Butterchurn y sus presets, cargados desde dependencias locales; requieren un navegador compatible con WebGL 2.

Node.js y npm se utilizan para instalar esas dependencias y ejecutar las pruebas locales, no para alojar el reproductor. Así, cada tecnología cumple una función concreta dentro del entorno multimedia.

## b) Captura, procesamiento y almacenamiento de datos multimedia

La biblioteca detecta archivos MP3 copiados en `audio/` y también permite importar uno desde la interfaz. PHP valida la subida y registra la canción para mostrarla en el reproductor.

Web Audio API crea una fuente para el audio, cinco filtros y un analizador. SQLite guarda el catálogo, las letras de referencia y el estado de los trabajos de karaoke. Los subtítulos utilizados y las transcripciones originales se almacenan en `subtitulos/` y `subtitulos-brutos/`, respectivamente.

## c) Conversión de datos multimedia entre formatos

He añadido un botón con el icono de descarga para convertir los primeros 10 segundos de la canción seleccionada. `AudioContext.decodeAudioData()` decodifica el MP3; `conversor-wav.js` escribe las muestras como PCM de 16 bits dentro de un archivo WAV y el navegador lo descarga. Si la canción dura menos de 10 segundos, se convierte completa.


## d) Procesamiento de datos multimedia

El ecualizador procesa el audio mediante cinco filtros, con bandas de 100 Hz, 400 Hz, 1 kHz, 4 kHz y 10 kHz. Cada banda se puede ajustar entre −6 y +6 dB; se aplica una atenuación preventiva al realzar frecuencias. El analizador obtiene información de la señal para los efectos MilkDrop y la forma de onda de progreso.

En el karaoke, Whisper genera una transcripción con tiempos aproximados. Cuando hay una letra de referencia, el programa la compara y la utiliza para orientar el texto y su alineación; el resultado puede necesitar revisión, especialmente en canciones con coros o voces superpuestas.

## e) Control de eventos, tipos de media y excepciones

El reproductor responde a los eventos de `HTMLAudioElement` para actualizar la canción, la posición y el estado de reproducción. También gestiona las acciones de los controles, la búsqueda, la cola y los atajos de teclado.

Antes de utilizar los archivos recibidos, la aplicación valida los MP3 y los WebVTT. Si faltan dependencias o permisos para generar el karaoke, o el navegador no admite WebGL 2 o una ventana flotante, informa del problema y no presenta la función como disponible.

## f) Creación y control de animaciones

Butterchurn dibuja los efectos MilkDrop y recibe el analizador de Web Audio. El selector permite cambiar de efecto; el visualizador también se puede ampliar, plegar o abrir en una ventana flotante compatible. La forma de onda y las transiciones de la interfaz complementan estas animaciones.

He incorporado cinco aspectos seleccionables —Aero, Winamp Retro Chrome, Winamp Classic, Fallout Pip-Boy y MMD3—. En MMD3, el ecualizador y el karaoke se despliegan a los lados con transiciones, y el visualizador se pliega hasta su cabecera.

El bucle de dibujo utiliza `requestAnimationFrame()` mientras se reproduce audio y se detiene al pausar, terminar la canción, ocultar la página o plegar el visualizador. La preferencia de movimiento reducido desactiva algunas transiciones CSS, pero no detiene la animación MilkDrop.

## g) Reproducción de contenidos multimedia

`HTMLAudioElement` reproduce los MP3 locales y permite iniciar, pausar, cambiar de posición y controlar el volumen. La biblioteca ofrece búsqueda y selección de pistas; la cola permite cambiar de canción, avanzar o retroceder y activar el orden aleatorio o la repetición.

El karaoke presenta las frases anterior, actual y siguiente, y permite saltar a una frase. La sincronización se realiza por frases, no por palabras, porque los subtítulos disponibles no tienen marcas temporales revisadas para cada palabra.

## h) Depuración y documentación

He documentado los requisitos, la puesta en marcha, la estructura, los controles y la resolución de problemas en el README de la versión completa. También he incluido pruebas locales para el audio, los controles y el visualizador.

Las pruebas locales cubren la curva de volumen, los filtros, sus límites y el respaldo sin Web Audio; los controles, la accesibilidad, los idiomas y los atajos; y el ciclo del visualizador, la forma de onda y la ventana flotante. El README documenta los requisitos, la puesta en marcha, la estructura, los controles y el diagnóstico. ERINWAVE se ejecuta localmente con XAMPP (Apache y PHP), y la generación de subtítulos integra Whisper en Python y FFmpeg.
