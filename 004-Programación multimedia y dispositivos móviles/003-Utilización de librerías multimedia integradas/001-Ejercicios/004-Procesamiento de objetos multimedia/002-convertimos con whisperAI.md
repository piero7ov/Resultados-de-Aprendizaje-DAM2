# 002 - Convertimos el audio con Whisper AI

Partimos del reproductor `001-version anterior.html` y de `audio/no_me_pidas_que_no_sea_un_incosciente.mp3`. Queremos crear un archivo VTT en la misma carpeta `audio`, con el mismo nombre que el MP3, para utilizarlo después en `003-audio con subtitulos.html`.

## Pasos en PowerShell

1. Entrar en la carpeta de esta subunidad:

   ```powershell
   cd 'C:\xampp\htdocs\Resultados-de-Aprendizaje-DAM2\004-Programación multimedia y dispositivos móviles\003-Utilización de librerías multimedia integradas\001-Ejercicios\004-Procesamiento de objetos multimedia'
   ```

2. Comprobar que el audio está disponible:

   ```powershell
   Test-Path '.\audio\no_me_pidas_que_no_sea_un_incosciente.mp3'
   ```

   Debe devolver `True`.

3. Generar el VTT con el modelo `medium` instalado en `.runtime\whisper`:

   ```powershell
   $env:PYTHONIOENCODING = 'utf-8'
   & '..\..\..\..\.runtime\whisper\Scripts\whisper.exe' '.\audio\no_me_pidas_que_no_sea_un_incosciente.mp3' --model medium --device cpu --output_format vtt --model_dir '..\..\..\..\.runtime\whisper\models' --output_dir '.\audio'
   ```

   Whisper está en el entorno del proyecto, por eso no funciona llamándolo simplemente `whisper`. Usamos `cpu` porque la instalación anterior no detectaba CUDA. Al no indicar `--language`, Whisper detecta el idioma del audio. La transcripción de una canción puede contener errores; revisaremos el resultado antes de mostrarlo en el reproductor.

4. Comprobar que se ha creado el archivo:

   ```powershell
   Test-Path '.\audio\no_me_pidas_que_no_sea_un_incosciente.vtt'
   Get-Content '.\audio\no_me_pidas_que_no_sea_un_incosciente.vtt' -TotalCount 15
   ```

   El VTT debe empezar por `WEBVTT`. Conservamos el MP3 original; Whisper crea otro archivo.

Cuando el VTT esté generado, crearemos `003-audio con subtitulos.html` a partir del aspecto y los controles del `001`, con subtítulos opcionales cargados desde este VTT.

## Estado de la ejecución

El primer intento con el comando global `whisper` dio «no se reconoce», porque el ejecutable está en `.runtime\whisper`. Con la ruta del paso 3, Whisper detectó el idioma español y terminó la transcripción. Se generó `audio/no_me_pidas_que_no_sea_un_incosciente.vtt`, con la cabecera `WEBVTT` y marcas de tiempo. La letra automática puede contener errores, por lo que conviene revisarla al usarla en el reproductor `003-audio con subtitulos.html`.
