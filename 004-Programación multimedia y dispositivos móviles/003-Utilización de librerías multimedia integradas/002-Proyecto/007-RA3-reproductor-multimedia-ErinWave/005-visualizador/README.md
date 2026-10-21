# ERINWAVE · versión 4 · Visualizador

Módulo de ERIN IU. Copia independiente de `004-karaoke`, con las canciones, la BBDD, las letras y los VTT existentes. Lo que se añada o genere aquí se guarda en esta versión; no se sincroniza con la anterior.

## Instalación manual

En una terminal situada en **esta carpeta**, con Node.js y npm disponibles:

```powershell
npm.cmd install --ignore-scripts
```

`package.json` fija Butterchurn 2.6.7 y butterchurn-presets 2.4.7. npm guardará los paquetes en `node_modules/` y generará `package-lock.json`. No hace falta compilar ni ejecutar un servidor Node. Abrir `index.html` mediante localhost/XAMPP, no como archivo local. Recargar la página después de instalar.

Si no se reconoce `npm.cmd`, comprobar `node -v` y `npm.cmd -v` y comunicar el resultado antes de instalar otra herramienta. El Node interno de Codex no implica que Node/npm estén configurados en la terminal del alumno.

El selector contiene solo efectos MilkDrop, disponibles con las bibliotecas locales y WebGL 2. Si no están disponibles, aparece un aviso discreto y el audio puede continuar. No se descargan bibliotecas desde un CDN durante la reproducción. Las dependencias ya fueron instaladas manualmente por el alumno.

## Controles

- La barra minimalista representa la forma de toda la canción con barras redondeadas, combinando los picos de sus canales. Se calcula al cargar el MP3 con decodificación local, se guarda en memoria durante la sesión y se colorea conforme avanza la reproducción. Conserva el deslizador nativo transparente para ratón, arrastre, tacto y teclado. Mientras se calcula, o si falla, se presenta una línea de progreso sencilla.
- El selector cambia de efecto; la flecha avanza al siguiente. Entre presets MilkDrop hay una mezcla de 2,4 segundos.
- La flecha vertical pliega el contenido en 440 ms conservando la cabecera. Al plegar se detiene el dibujo, no el audio, la barra ni el karaoke. Se respeta la preferencia de movimiento reducido.
- El icono de las cuatro esquinas amplía el visualizador. Escape permite salir.
- El icono de ventana abre Document Picture-in-Picture si el navegador lo admite. En otro caso intenta abrir una ventana normal: puede ser bloqueada y no garantiza permanecer encima.
- La ventana flotante incluye título, artista, transporte y volumen. Cerrarla, pulsar su icono de retorno o pulsar el botón de retorno del reproductor devuelve el mismo visualizador a su sitio.
- El audio sigue perteneciendo a la página principal: no cerrar esa página mientras se usa la ventana flotante.
- Se conserva el cambio ES/EN y la letra original del karaoke.

## Audio y rendimiento

`audio-visual.js` mantiene una única fuente Web Audio:

`audio → analizador → ganancia → salida`

El análisis anterior al volumen permite bajar el sonido sin perder movimiento. Butterchurn escucha una rama del analizador, sin una segunda salida de audio. La curva de volumen cumple `ganancia = control ^ (log(0.3) / log(0.5))`: el nuevo 50 % equivale a la ganancia del antiguo 30 %. El inicio sigue mostrando 30 %, ahora con una ganancia aproximada de 0,124; no es una medida de sonoridad percibida. El máximo sigue siendo 100 %.

El dibujo se limita a 30 fotogramas por segundo y a 1280 × 720 píxeles internos. Se detiene al pausar, plegar o al ocultar la ventana que contiene el visualizador. Al trasladarse a PiP, el bucle usa el reloj de esa ventana. El tiempo del audio y el karaoke no se modifica.

Al redimensionar se actualizan primero las dimensiones internas del canvas y después las del motor Butterchurn, manteniendo la proporción y la densidad de píxeles. Esto corrige el desajuste que dejaba una franja negra. Se vuelve a medir al cargar los estilos de PiP, al cambiar de pantalla completa y al terminar el despliegue.

## Comprobaciones

```powershell
node comprobar-audio.cjs
node comprobar-visualizador.cjs
```

La segunda prueba simula ventanas y comprueba el selector exclusivo MilkDrop, cálculo/caché de la forma de onda, plegado sin detener el audio, avance de la barra estando plegado, coincidencia canvas/motor a distintos tamaños y densidades, apertura, retorno, cierre, reapertura, errores y pausa. **No sustituye una prueba real de PiP en un navegador compatible.**

Verificado inicialmente: sintaxis JavaScript/PHP, integridad SQLite y copia de las 11 letras; coincidencia por hash de audio, VTT, letras importables, iconos y API con la versión anterior; reproducción, ES/EN y apertura del karaoke existente. En la revisión 4.1: pruebas de audio y visualizador, sintaxis JavaScript y comprobación en navegador de la nueva barra, selector de seis efectos MilkDrop y plegado con reproducción activa, sin errores en consola.

Pendiente: confirmar visualmente la corrección al redimensionar PiP y pantalla completa en el navegador del alumno. El navegador integrado vuelve a perder la pestaña durante las comprobaciones; los resultados de las pruebas simuladas no se presentan como una validación visual completa.

## Referencias

- [Butterchurn](https://github.com/jberg/butterchurn) y [presets](https://github.com/jberg/butterchurn-presets): licencias incluidas en sus paquetes.
- [Document Picture-in-Picture](https://developer.chrome.com/docs/web-platform/document-picture-in-picture).

El agente no ha instalado dependencias, lanzado Whisper ni regenerado subtítulos durante estas revisiones.
