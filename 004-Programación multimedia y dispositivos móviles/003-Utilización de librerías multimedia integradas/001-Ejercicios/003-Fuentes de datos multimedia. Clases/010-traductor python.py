#!/usr/bin/env python3

import json
import re
import sys
import time
import urllib.request
from pathlib import Path


OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
MODELO = "mistral:instruct"
IDIOMAS = {
    "en": "English",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
}
TAMANO_BLOQUE = 2
NUM_CTX = 4096
KEEP_ALIVE = "30m"
TIMEOUT = 600
MAX_REINTENTOS = 3


def leer_vtt(ruta):
    contenido = ruta.read_text(encoding="utf-8")
    contenido = contenido.replace("\r\n", "\n").replace("\r", "\n")
    bloques = re.split(r"\n\s*\n", contenido.strip())
    subtitulos = []

    for bloque in bloques:
        lineas = bloque.strip().split("\n")

        if not lineas or lineas[0].strip().startswith("WEBVTT"):
            continue

        indice_tiempo = next(
            (i for i, linea in enumerate(lineas) if "-->" in linea),
            None,
        )

        if indice_tiempo is None:
            continue

        texto = "\n".join(lineas[indice_tiempo + 1:]).strip()

        if texto:
            subtitulos.append({
                "tiempo": lineas[indice_tiempo].strip(),
                "texto": texto,
            })

    return subtitulos


def comprobar_ollama():
    try:
        with urllib.request.urlopen(
            "http://127.0.0.1:11434/api/tags", timeout=10
        ) as respuesta:
            return respuesta.status == 200
    except Exception:
        return False


def llamar_ollama(prompt):
    datos = {
        "model": MODELO,
        "prompt": prompt,
        "stream": False,
        "keep_alive": KEEP_ALIVE,
        "options": {"temperature": 0, "num_ctx": NUM_CTX},
    }
    cuerpo = json.dumps(datos).encode("utf-8")
    peticion = urllib.request.Request(
        OLLAMA_URL,
        data=cuerpo,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(peticion, timeout=TIMEOUT) as respuesta:
        resultado = json.loads(respuesta.read().decode("utf-8"))

    if "response" not in resultado:
        raise ValueError("Ollama no devolvió el campo 'response'")

    return resultado["response"].strip()


def extraer_json(texto):
    texto = re.sub(r"^```(?:json)?\s*", "", texto.strip(), flags=re.IGNORECASE)
    texto = re.sub(r"\s*```$", "", texto)
    inicio = texto.find("[")
    final = texto.rfind("]")

    if inicio == -1 or final == -1:
        raise ValueError("Ollama no devolvió un array JSON")

    resultado = json.loads(texto[inicio:final + 1])

    if not isinstance(resultado, list):
        raise ValueError("La respuesta de Ollama no es una lista")

    return resultado


def traducir_bloque(bloque, idioma):
    elementos = [
        {"id": i, "text": subtitulo["texto"]}
        for i, subtitulo in enumerate(bloque)
    ]
    entrada_json = json.dumps(elementos, ensure_ascii=False, indent=2)
    prompt = f"""Translate these subtitles from Spanish to {idioma}.
They belong to a short educational video about Python.
Translate only each text value. Keep every id unchanged and return the same
number of elements in the same order. Preserve Python terms and code.
Use nearby subtitles as context and keep each translation concise.
Return only a valid JSON array with objects containing id and text.

Input:
{entrada_json}
"""

    resultado = extraer_json(llamar_ollama(prompt))

    if len(resultado) != len(bloque):
        raise ValueError(
            f"Se esperaban {len(bloque)} subtítulos y Ollama devolvió "
            f"{len(resultado)}"
        )

    traducciones = {}

    for elemento in resultado:
        if not isinstance(elemento, dict) or "id" not in elemento or "text" not in elemento:
            raise ValueError("Ollama devolvió un elemento sin id o text")

        identificador = int(elemento["id"])
        texto = elemento["text"]

        if identificador in traducciones or not isinstance(texto, str) or not texto.strip():
            raise ValueError("Ollama devolvió un id repetido o una traducción vacía")

        traducciones[identificador] = texto.strip()

    if set(traducciones) != set(range(len(bloque))):
        raise ValueError("Los identificadores de los subtítulos no coinciden")

    return [traducciones[i] for i in range(len(bloque))]


def traducir_bloque_con_recuperacion(bloque, idioma, inicio):
    intentos = 1 if len(bloque) > 1 else MAX_REINTENTOS

    for intento in range(1, intentos + 1):
        try:
            return traducir_bloque(bloque, idioma)
        except Exception as error:
            print(f"    Error {intento}/{intentos} en {inicio + 1}-{inicio + len(bloque)}: {error}")

            if intento < intentos:
                time.sleep(3)

    if len(bloque) > 1:
        mitad = len(bloque) // 2
        print("    Dividiendo el bloque para recuperar las traducciones")
        return (
            traducir_bloque_con_recuperacion(bloque[:mitad], idioma, inicio)
            + traducir_bloque_con_recuperacion(bloque[mitad:], idioma, inicio + mitad)
        )

    raise RuntimeError(f"No se pudo traducir el subtítulo {inicio + 1}")


def traducir_subtitulos(subtitulos, idioma):
    traducciones = []
    total = len(subtitulos)

    for inicio in range(0, total, TAMANO_BLOQUE):
        final = min(inicio + TAMANO_BLOQUE, total)
        bloque = subtitulos[inicio:final]
        print(f"    {inicio + 1:04d}-{final:04d} / {total:04d}", flush=True)
        traducciones.extend(
            traducir_bloque_con_recuperacion(bloque, idioma, inicio)
        )

    return traducciones


def guardar_vtt(ruta, subtitulos, traducciones):
    if len(subtitulos) != len(traducciones):
        raise ValueError("El número de traducciones no coincide")

    with ruta.open("x", encoding="utf-8", newline="\n") as archivo:
        archivo.write("WEBVTT\n\n")

        for subtitulo, traduccion in zip(subtitulos, traducciones):
            archivo.write(subtitulo["tiempo"] + "\n")
            archivo.write(traduccion + "\n\n")


def main():
    carpeta = Path(__file__).resolve().parent
    ruta = Path(sys.argv[1]) if len(sys.argv) > 1 else (
        carpeta / "subtitulos" / "002-python-en-1-minuto.vtt"
    )

    if not ruta.is_file():
        raise FileNotFoundError(f"No existe el VTT: {ruta}")

    if ruta.suffix.lower() != ".vtt":
        raise ValueError("El archivo debe ser .vtt")

    subtitulos = leer_vtt(ruta)

    if not subtitulos:
        raise ValueError("No se encontraron subtítulos en el VTT")

    salidas = {
        codigo: ruta.with_name(f"{ruta.stem}.{codigo}.vtt")
        for codigo in IDIOMAS
    }
    pendientes = [codigo for codigo, salida in salidas.items() if not salida.exists()]

    print(f"Archivo: {ruta}")
    print(f"Modelo: {MODELO}")
    print(f"Subtítulos: {len(subtitulos)}")

    if not pendientes:
        print("Ya existen todos los VTT traducidos; no se sobrescribe ninguno.")
        return

    if not comprobar_ollama():
        raise ConnectionError("Ollama no responde en http://127.0.0.1:11434")

    for codigo, idioma in IDIOMAS.items():
        salida = salidas[codigo]

        if salida.exists():
            print(f"{codigo.upper()}: ya existe {salida}; se omite")
            continue

        print(f"{codigo.upper()} -> {idioma}")
        traducciones = traducir_subtitulos(subtitulos, idioma)
        guardar_vtt(salida, subtitulos, traducciones)
        print(f"Guardado: {salida}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Proceso cancelado por el usuario.")
        sys.exit(130)
    except Exception as error:
        print(f"ERROR: {error}")
        sys.exit(1)
