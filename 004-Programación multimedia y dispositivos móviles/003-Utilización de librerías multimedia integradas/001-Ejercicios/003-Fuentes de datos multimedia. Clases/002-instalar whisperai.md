# Instalar Whisper AI

Whisper transcribe la voz de un vídeo y genera subtítulos con marcas de tiempo. Para la prueba usaremos `video\python-en-1-minuto.mp4`.

## Ubuntu (apuntes de clase)

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip ffmpeg
python3 -m pip install -U openai-whisper --break-system-packages

whisper video.mp4 \
  --model medium \
  --language Spanish \
  --output_format srt
```

`video.mp4` representa el archivo que se quiere transcribir. `medium` indica el modelo, `Spanish` el idioma hablado y `srt` el formato de los subtítulos.

## Windows (nuestro equipo)

Desde la raíz de `Resultados-de-Aprendizaje-DAM2`, en PowerShell:

```powershell
winget install --id Gyan.FFmpeg --exact --source winget
py -3.13 -m venv .runtime\whisper
.\.runtime\whisper\Scripts\python.exe -m pip install -U openai-whisper
```

Después de instalar FFmpeg, abre una terminal nueva para que `ffmpeg` esté disponible en `PATH`. Whisper queda dentro de `.runtime\whisper`, separado del Python general del equipo.

Desde esta carpeta (`003-Fuentes de datos multimedia. Clases`):

```powershell
ffmpeg -n -i 'video\python-en-1-minuto.mp4' -c:v libvpx-vp9 -b:v 0 -crf 32 -c:a libopus '002-python-en-1-minuto.webm'
$env:PYTHONIOENCODING = 'utf-8'
& '..\..\..\..\.runtime\whisper\Scripts\whisper.exe' '002-python-en-1-minuto.webm' --model medium --language Spanish --output_format srt --model_dir '..\..\..\..\.runtime\whisper\models' --output_dir '.'
```

Los resultados serán `002-python-en-1-minuto.webm` y `002-python-en-1-minuto.srt` en esta carpeta. El modelo se descarga una vez en `.runtime\whisper\models`. Para los subtítulos del reproductor HTML, se puede generar un archivo WebVTT con el mismo comando y `--output_format vtt`. El modelo `medium` puede tardar bastante si se ejecuta sin GPU.

## Subtítulos para vídeo con líneas ajustadas

El vídeo `002-python-en-1-minuto.webm` y el primer SRT ya están creados. Esta segunda ejecución genera otro SRT en la subcarpeta `subtitulos`, con marcas por palabra, un máximo de 42 caracteres por línea y dos líneas por subtítulo.

Desde esta carpeta, en PowerShell:

```powershell
New-Item -ItemType Directory -Path '.\subtitulos' -Force | Out-Null
$env:PYTHONIOENCODING = 'utf-8'
& '..\..\..\..\.runtime\whisper\Scripts\whisper.exe' '002-python-en-1-minuto.webm' --model medium --language Spanish --device cpu --word_timestamps True --max_line_width 42 --max_line_count 2 --output_format srt --model_dir '..\..\..\..\.runtime\whisper\models' --output_dir '.\subtitulos'
```

El resultado queda en `subtitulos\002-python-en-1-minuto.srt`. Se usa `cpu` porque la instalación actual de PyTorch no detecta CUDA. El SRT anterior de la carpeta principal no se modifica.

## Subtítulos WebVTT para el reproductor HTML

Desde esta misma carpeta, ejecuta Whisper con los mismos ajustes y cambia el formato a `vtt`:

```powershell
$env:PYTHONIOENCODING = 'utf-8'
& '..\..\..\..\.runtime\whisper\Scripts\whisper.exe' '002-python-en-1-minuto.webm' --model medium --language Spanish --device cpu --word_timestamps True --max_line_width 42 --max_line_count 2 --output_format vtt --model_dir '..\..\..\..\.runtime\whisper\models' --output_dir '.\subtitulos'
```

El resultado será `subtitulos\002-python-en-1-minuto.vtt`. Para comprobarlo:

```powershell
Get-Content '.\subtitulos\002-python-en-1-minuto.vtt' -TotalCount 12
```
