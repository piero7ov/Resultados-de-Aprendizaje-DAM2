<?php
header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");

require_once __DIR__ . "/bbdd.php";
require_once __DIR__ . "/alineador-vtt.php";
require_once __DIR__ . "/importar-letras.php";

function responder($estadoHttp,$datos){
  http_response_code($estadoHttp);
  echo json_encode($datos,JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function iniciarSalidaEventos(){
  header("Content-Type: application/x-ndjson; charset=utf-8");
  header("X-Accel-Buffering: no");
  ini_set("zlib.output_compression","0");

  while(ob_get_level() > 0){
    ob_end_flush();
  }

  ob_implicit_flush(true);
}

function enviarEvento($datos,?PDO $conexion = null,?string $archivo = null){
  if($conexion !== null && $archivo !== null){
    try{
      $estado = ($datos["tipo"] ?? "") === "completado"
        ? "completado"
        : ((($datos["tipo"] ?? "") === "error") ? "error" : "en_curso");
      erinwaveActualizarTrabajoKaraoke($conexion,$archivo,[
        "estado" => $estado,
        "fase" => $datos["fase"] ?? "iniciando",
        "porcentaje" => $datos["porcentaje"] ?? 0,
        "modelo" => $datos["modelo"] ?? null,
        "idiomaDetectado" => $datos["idiomaDetectado"] ?? null,
        "codigoError" => $datos["codigo"] ?? null,
        "urlVtt" => $datos["urlKaraoke"] ?? null,
        "alineacion" => $datos["alineacion"] ?? null
      ]);
    }catch(Throwable $error){
      error_log("ERINWAVE no pudo actualizar el seguimiento del karaoke");
    }
  }

  echo json_encode($datos,JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
  flush();
}

function limpiarCarpetaTemporal($carpeta){
  if(!is_dir($carpeta)){
    return;
  }

  foreach(scandir($carpeta) as $archivo){
    if($archivo === "." || $archivo === ".."){
      continue;
    }

    $ruta = $carpeta . DIRECTORY_SEPARATOR . $archivo;

    if(is_file($ruta)){
      unlink($ruta);
    }
  }

  rmdir($carpeta);
}

function esVttValido($ruta){
  if(!is_file($ruta)){
    return false;
  }

  $contenido = file_get_contents($ruta);

  if($contenido === false){
    return false;
  }

  $contenido = preg_replace('/^\xEF\xBB\xBF/','',$contenido);

  return str_starts_with($contenido,"WEBVTT")
    && preg_match('/\d{2}:\d{2}(?::\d{2})?[\.,]\d{3}\s+-->\s+\d{2}:\d{2}(?::\d{2})?[\.,]\d{3}/',$contenido);
}

function retranscribirTramos(
  string $ejecutablePython,
  string $rutaAudio,
  string $carpetaModelos,
  string $modelo,
  string $idioma,
  array $tramos,
  PDO $conexion,
  string $archivo
): array{
  putenv("PYTHONIOENCODING=utf-8");
  $programa = <<<'PY'
import json
import math
import sys
import whisper

ruta_audio, carpeta_modelos, modelo, idioma, datos_tramos = sys.argv[1:]
tramos = json.loads(datos_tramos)
audio = whisper.load_audio(ruta_audio)
modelo_whisper = whisper.load_model(modelo, device="cpu", download_root=carpeta_modelos)
frases = []

for tramo in tramos:
    cantidad_ventanas = max(1, math.ceil((tramo["fin"] - tramo["inicio"]) / 25000))
    lineas = tramo["lineas"]

    for indice in range(cantidad_ventanas):
        desde = tramo["inicio"] + round((tramo["fin"] - tramo["inicio"]) * indice / cantidad_ventanas)
        hasta = tramo["inicio"] + round((tramo["fin"] - tramo["inicio"]) * (indice + 1) / cantidad_ventanas)
        inicio_audio = max(0, (desde - 2000) * 16)
        fin_audio = min(len(audio), (hasta + 2000) * 16)
        if fin_audio <= inicio_audio:
            continue

        primera_linea = max(0, math.floor(len(lineas) * indice / cantidad_ventanas) - 1)
        ultima_linea = min(len(lineas), math.ceil(len(lineas) * (indice + 1) / cantidad_ventanas) + 1)
        contexto = " ".join(lineas[primera_linea:ultima_linea])[:500]
        resultado = modelo_whisper.transcribe(
            audio[inicio_audio:fin_audio], language=idioma, task="transcribe",
            fp16=False, condition_on_previous_text=False, initial_prompt=contexto,
            temperature=0.0, verbose=None
        )

        for segmento in resultado["segments"]:
            if segmento.get("no_speech_prob", 0) > 0.8 or segmento.get("avg_logprob", 0) < -1.2:
                continue
            inicio_frase = round(inicio_audio / 16 + segmento["start"] * 1000)
            fin_frase = round(inicio_audio / 16 + segmento["end"] * 1000)
            medio = (inicio_frase + fin_frase) / 2
            if medio < desde or medio >= hasta:
                continue
            frases.append({
                "inicio": max(desde, inicio_frase),
                "fin": min(hasta, fin_frase),
                "texto": segmento["text"].strip()
            })

print(json.dumps(frases, ensure_ascii=False))
PY;

  $comando = [
    $ejecutablePython,"-c",$programa,$rutaAudio,$carpetaModelos,$modelo,$idioma,
    json_encode($tramos,JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
  ];
  $descriptores = [0 => ["pipe","r"],1 => ["pipe","w"],2 => ["pipe","w"]];
  $tuberias = [];
  $proceso = proc_open($comando,$descriptores,$tuberias,null,null,["bypass_shell" => true]);

  if(!is_resource($proceso)){
    return [];
  }

  fclose($tuberias[0]);
  stream_set_blocking($tuberias[1],false);
  stream_set_blocking($tuberias[2],false);
  $salida = "";
  $errores = "";
  $ultimoLatido = microtime(true);
  $codigoSalida = -1;

  while(true){
    $salida .= stream_get_contents($tuberias[1]);
    $errores .= stream_get_contents($tuberias[2]);
    $estado = proc_get_status($proceso);

    if(!$estado["running"]){
      $codigoSalida = $estado["exitcode"];
      break;
    }

    if(microtime(true) - $ultimoLatido >= 2){
      enviarEvento([
        "tipo" => "latido",
        "fase" => "corrigiendo",
        "porcentaje" => 100,
        "modelo" => $modelo
      ],$conexion,$archivo);
      $ultimoLatido = microtime(true);
    }

    usleep(250000);
  }

  $salida .= stream_get_contents($tuberias[1]);
  $errores .= stream_get_contents($tuberias[2]);
  fclose($tuberias[1]);
  fclose($tuberias[2]);
  $codigoCierre = proc_close($proceso);

  if($codigoSalida === -1){
    $codigoSalida = $codigoCierre;
  }

  $frases = $codigoSalida === 0 ? json_decode($salida,true) : null;

  if(!is_array($frases)){
    error_log(
      "ERINWAVE segunda pasada fallida (código $codigoSalida): "
      . json_last_error_msg() . " / " . substr($errores,0,300)
    );
  }

  return is_array($frases) ? $frases : [];
}

if($_SERVER["REQUEST_METHOD"] !== "POST"){
  responder(405,[
    "ok" => false,
    "codigo" => "metodo_no_permitido"
  ]);
}

$entrada = json_decode(file_get_contents("php://input"),true);
$archivo = is_array($entrada) && isset($entrada["archivo"])
  ? trim((string)$entrada["archivo"])
  : "";

if(
  $archivo === ""
  || basename($archivo) !== $archivo
  || str_contains($archivo,"/")
  || str_contains($archivo,"\\")
){
  responder(400,[
    "ok" => false,
    "codigo" => "archivo_no_valido"
  ]);
}

$carpetaAudio = realpath(__DIR__ . "/../audio");
$carpetaSubtitulos = realpath(__DIR__ . "/../subtitulos");
$carpetaLetras = realpath(__DIR__ . "/../letras");
$carpetaSubtitulosBrutos = __DIR__ . "/../subtitulos-brutos";

if($carpetaAudio === false || $carpetaSubtitulos === false || $carpetaLetras === false){
  responder(500,[
    "ok" => false,
    "codigo" => "carpetas_no_disponibles"
  ]);
}

if(
  !is_dir($carpetaSubtitulosBrutos)
  && !mkdir($carpetaSubtitulosBrutos,0775,true)
  && !is_dir($carpetaSubtitulosBrutos)
){
  responder(500,[
    "ok" => false,
    "codigo" => "carpeta_brutos_no_disponible"
  ]);
}

try{
  $conexion = erinwaveAbrirBaseDatos();
  erinwaveSincronizarCanciones($conexion,$carpetaAudio);
  erinwaveImportarLetras($conexion,$carpetaLetras);
}catch(Throwable $error){
  responder(500,[
    "ok" => false,
    "codigo" => "base_datos_no_disponible"
  ]);
}

$rutaAudio = realpath($carpetaAudio . DIRECTORY_SEPARATOR . $archivo);
$inicioPermitido = strtolower(rtrim($carpetaAudio,DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR);

if(
  $rutaAudio === false
  || !is_file($rutaAudio)
  || strtolower(pathinfo($rutaAudio,PATHINFO_EXTENSION)) !== "mp3"
  || !str_starts_with(strtolower($rutaAudio),$inicioPermitido)
){
  responder(404,[
    "ok" => false,
    "codigo" => "cancion_no_encontrada"
  ]);
}

$nombreBase = pathinfo($archivo,PATHINFO_FILENAME);
$rutaVttFinal = $carpetaSubtitulos . DIRECTORY_SEPARATOR . $nombreBase . ".vtt";
$rutaVttBruta = $carpetaSubtitulosBrutos . DIRECTORY_SEPARATOR . $nombreBase . ".vtt";
$letraRevisada = erinwaveObtenerLetra($conexion,$archivo);
$modelo = "small";

if(esVttValido($rutaVttFinal)){
  erinwaveActualizarTrabajoKaraoke($conexion,$archivo,[
    "estado" => "completado",
    "fase" => "completado",
    "porcentaje" => 100,
    "modelo" => $modelo,
    "codigoError" => null,
    "urlVtt" => "subtitulos/" . rawurlencode($nombreBase . ".vtt")
  ]);
  responder(200,[
    "ok" => true,
    "estado" => "ya_disponible",
    "urlKaraoke" => "subtitulos/" . rawurlencode($nombreBase . ".vtt")
  ]);
}

$raizProyecto = dirname(__DIR__,6);
$ejecutablePython = $raizProyecto . DIRECTORY_SEPARATOR . ".runtime" . DIRECTORY_SEPARATOR . "whisper" . DIRECTORY_SEPARATOR . "Scripts" . DIRECTORY_SEPARATOR . "python.exe";
$carpetaModelos = $raizProyecto . DIRECTORY_SEPARATOR . ".runtime" . DIRECTORY_SEPARATOR . "whisper" . DIRECTORY_SEPARATOR . "models";
$rutaModelo = $carpetaModelos . DIRECTORY_SEPARATOR . $modelo . ".pt";

if(!is_file($ejecutablePython)){
  responder(503,[
    "ok" => false,
    "codigo" => "whisper_no_disponible"
  ]);
}

if(!is_file($rutaModelo)){
  responder(503,[
    "ok" => false,
    "codigo" => "modelo_no_disponible",
    "modelo" => $modelo
  ]);
}

$rutaBloqueo = sys_get_temp_dir() . DIRECTORY_SEPARATOR . "erinwave-karaoke.lock";
$bloqueo = fopen($rutaBloqueo,"c");

if($bloqueo === false || !flock($bloqueo,LOCK_EX | LOCK_NB)){
  responder(409,[
    "ok" => false,
    "codigo" => "generacion_en_curso"
  ]);
}

$carpetaTemporal = sys_get_temp_dir() . DIRECTORY_SEPARATOR . "erinwave-" . bin2hex(random_bytes(8));

if(!mkdir($carpetaTemporal,0700,true)){
  responder(500,[
    "ok" => false,
    "codigo" => "no_se_pudo_preparar"
  ]);
}

erinwaveActualizarTrabajoKaraoke($conexion,$archivo,[
  "estado" => "en_curso",
  "fase" => "iniciando",
  "porcentaje" => 0,
  "modelo" => $modelo,
  "idiomaDetectado" => null,
  "codigoError" => null,
  "urlVtt" => null,
  "alineacion" => null,
  "reiniciar" => true
]);

set_time_limit(0);
putenv("PYTHONIOENCODING=utf-8");
ignore_user_abort(true);

$comando = [
  $ejecutablePython,
  "-m",
  "whisper",
  $rutaAudio,
  "--model",
  $modelo,
  "--device",
  "cpu",
  "--task",
  "transcribe",
  "--fp16",
  "False",
  "--verbose",
  "False",
  "--condition_on_previous_text",
  "False",
  "--output_format",
  "vtt",
  "--model_dir",
  $carpetaModelos,
  "--output_dir",
  $carpetaTemporal
];

if($letraRevisada !== null){
  $comando[] = "--language";
  $comando[] = $letraRevisada["idioma"];
}
$descriptores = [
  0 => ["pipe","r"],
  1 => ["pipe","w"],
  2 => ["pipe","w"]
];
$tuberias = [];
$proceso = proc_open($comando,$descriptores,$tuberias,null,null,["bypass_shell" => true]);

if(!is_resource($proceso)){
  limpiarCarpetaTemporal($carpetaTemporal);
  erinwaveActualizarTrabajoKaraoke($conexion,$archivo,[
    "estado" => "error",
    "fase" => "error",
    "codigoError" => "generacion_fallida"
  ]);
  responder(500,[
    "ok" => false,
    "codigo" => "generacion_fallida"
  ]);
}

fclose($tuberias[0]);
stream_set_blocking($tuberias[1],false);
stream_set_blocking($tuberias[2],false);
iniciarSalidaEventos();
enviarEvento([
  "tipo" => "estado",
  "fase" => "iniciando",
  "porcentaje" => 0,
  "modelo" => $modelo
],$conexion,$archivo);

$textoSalida = "";
$colaAnalisis = "";
$ultimoPorcentaje = -1;
$idiomaDetectado = $letraRevisada["idioma"] ?? null;
$ultimoLatido = microtime(true);
$codigoSalida = -1;

while(true){
  $fragmento = stream_get_contents($tuberias[1]) . stream_get_contents($tuberias[2]);

  if($fragmento !== ""){
    $textoSalida .= $fragmento;
    $colaAnalisis = substr($colaAnalisis . $fragmento,-2000);

    if($idiomaDetectado === null && preg_match('/Detected language:\s*([^\r\n]+)/i',$colaAnalisis,$coincidenciaIdioma)){
      $idiomaDetectado = trim($coincidenciaIdioma[1]);
    }

    if(preg_match_all('/(\d{1,3})%\|/',$colaAnalisis,$coincidenciasPorcentaje)){
      $porcentajes = array_map("intval",$coincidenciasPorcentaje[1]);
      $porcentaje = end($porcentajes);

      if($porcentaje !== $ultimoPorcentaje){
        $ultimoPorcentaje = $porcentaje;
        enviarEvento([
          "tipo" => "progreso",
          "fase" => "transcribiendo",
          "porcentaje" => $porcentaje,
          "idiomaDetectado" => $idiomaDetectado,
          "modelo" => $modelo
        ],$conexion,$archivo);
      }
    }
  }

  $estadoProceso = proc_get_status($proceso);

  if(!$estadoProceso["running"]){
    $codigoSalida = $estadoProceso["exitcode"];
    break;
  }

  if(microtime(true) - $ultimoLatido >= 1){
    enviarEvento([
      "tipo" => "latido",
      "fase" => $ultimoPorcentaje >= 0 ? "transcribiendo" : "iniciando",
      "porcentaje" => max(0,$ultimoPorcentaje),
      "idiomaDetectado" => $idiomaDetectado,
      "modelo" => $modelo
    ],$conexion,$archivo);
    $ultimoLatido = microtime(true);
  }

  usleep(250000);
}

$fragmentoFinal = stream_get_contents($tuberias[1]) . stream_get_contents($tuberias[2]);
$textoSalida .= $fragmentoFinal;
fclose($tuberias[1]);
fclose($tuberias[2]);
$codigoCierre = proc_close($proceso);

if($codigoSalida === -1){
  $codigoSalida = $codigoCierre;
}

if($idiomaDetectado === null && preg_match('/Detected language:\s*([^\r\n]+)/i',$textoSalida,$coincidenciaIdioma)){
  $idiomaDetectado = trim($coincidenciaIdioma[1]);
}

$rutaVttTemporal = $carpetaTemporal . DIRECTORY_SEPARATOR . $nombreBase . ".vtt";

if($codigoSalida !== 0 || !esVttValido($rutaVttTemporal)){
  limpiarCarpetaTemporal($carpetaTemporal);
  enviarEvento([
    "tipo" => "error",
    "fase" => "error",
    "codigo" => "generacion_fallida",
    "modelo" => $modelo
  ],$conexion,$archivo);
  exit;
}

if(!copy($rutaVttTemporal,$rutaVttBruta)){
  limpiarCarpetaTemporal($carpetaTemporal);
  enviarEvento([
    "tipo" => "error",
    "fase" => "error",
    "codigo" => "no_se_pudo_guardar_bruto",
    "modelo" => $modelo
  ],$conexion,$archivo);
  exit;
}

$alineacion = erinwaveAlinearVtt($conexion,$archivo,$rutaVttTemporal);
$rutaVttParaGuardar = $rutaVttTemporal;

if($letraRevisada !== null && ($alineacion["cobertura"] ?? 1) < 0.90){
  $tramos = $alineacion["tramosPendientes"] ?? [];
  usort($tramos,fn(array $primero,array $segundo): int =>
    $segundo["cantidadLineas"] <=> $primero["cantidadLineas"]
  );
  $tramos = array_slice($tramos,0,3);
  usort($tramos,fn(array $primero,array $segundo): int =>
    $primero["inicio"] <=> $segundo["inicio"]
  );

  if(count($tramos) > 0){
    $frasesNuevas = retranscribirTramos(
      $ejecutablePython,$rutaAudio,$carpetaModelos,$modelo,$letraRevisada["idioma"],
      $tramos,$conexion,$archivo
    );
    $alineacion["segundaPasada"] = ["tramos" => count($tramos),"aplicada" => false];

    if(count($frasesNuevas) > 0){
      $frasesCombinadas = erinwaveCombinarFrases(
        erinwaveLeerVtt($rutaVttTemporal),$frasesNuevas,$tramos
      );
      $mejorada = erinwaveAlinearSecuencias($frasesCombinadas,$letraRevisada["lineas"]);
      $alineacion["segundaPasada"]["cobertura"] = $mejorada["cobertura"];

      if(
        $mejorada["coincidencias"] > ($alineacion["coincidencias"] ?? 0)
        && $mejorada["cobertura"] >= 0.90
        && $mejorada["similitudMedia"] >= max(0.60,($alineacion["similitudMedia"] ?? 0) - 0.10)
        && $mejorada["lineasPendientes"] <= 1
      ){
        $mejorada["disponible"] = true;
        $mejorada["aplicada"] = true;
        $mejorada["idiomaLetra"] = $letraRevisada["idioma"];
        $mejorada["hashLetra"] = $letraRevisada["hash"];
        $mejorada["contenido"] = erinwaveCrearVtt($mejorada["frases"]);
        $mejorada["motivo"] = "segunda_pasada";
        $mejorada["segundaPasada"] = ["tramos" => count($tramos),"aplicada" => true];
        $alineacion = $mejorada;
      }
    }
  }
}

if($alineacion["aplicada"]){
  $rutaVttCorregida = $carpetaTemporal . DIRECTORY_SEPARATOR . $nombreBase . "-corregido.vtt";
  $escrito = file_put_contents($rutaVttCorregida,$alineacion["contenido"],LOCK_EX);

  if($escrito !== false && esVttValido($rutaVttCorregida)){
    $rutaVttParaGuardar = $rutaVttCorregida;
  }else{
    $alineacion["aplicada"] = false;
    $alineacion["suficiente"] = false;
    $alineacion["motivo"] = "no_se_pudo_crear_vtt_corregido";
  }
}

$resumenAlineacion = $alineacion;
unset(
  $resumenAlineacion["contenido"],$resumenAlineacion["frases"],
  $resumenAlineacion["hashLetra"],$resumenAlineacion["tramosPendientes"]
);

enviarEvento([
  "tipo" => "estado",
  "fase" => "corrigiendo",
  "porcentaje" => 100,
  "idiomaDetectado" => $idiomaDetectado,
  "alineacion" => $resumenAlineacion,
  "modelo" => $modelo
],$conexion,$archivo);

enviarEvento([
  "tipo" => "estado",
  "fase" => "guardando",
  "porcentaje" => 100,
  "idiomaDetectado" => $idiomaDetectado,
  "modelo" => $modelo
],$conexion,$archivo);

if(is_file($rutaVttFinal)){
  unlink($rutaVttFinal);
}

$guardado = rename($rutaVttParaGuardar,$rutaVttFinal);

if(!$guardado){
  $guardado = copy($rutaVttParaGuardar,$rutaVttFinal);
}

if(!$guardado || !esVttValido($rutaVttFinal)){
  limpiarCarpetaTemporal($carpetaTemporal);
  enviarEvento([
    "tipo" => "error",
    "fase" => "error",
    "codigo" => "no_se_pudo_guardar",
    "modelo" => $modelo
  ],$conexion,$archivo);
  exit;
}

erinwaveRegistrarGeneracion($conexion,$archivo,[
  "modelo" => $modelo,
  "estado" => $alineacion["aplicada"] ? "alineado" : "generado_revisar",
  "idiomaDetectado" => $idiomaDetectado,
  "frasesWhisper" => $alineacion["frasesWhisper"] ?? 0,
  "lineasLetra" => $alineacion["lineasLetra"] ?? 0,
  "coincidencias" => $alineacion["coincidencias"] ?? 0,
  "similitudMedia" => $alineacion["similitudMedia"] ?? 0
]);

limpiarCarpetaTemporal($carpetaTemporal);
enviarEvento([
  "tipo" => "completado",
  "fase" => "completado",
  "porcentaje" => 100,
  "estado" => $alineacion["aplicada"] ? "generado_corregido" : "generado_revisar",
  "idiomaDetectado" => $idiomaDetectado,
  "alineacion" => $resumenAlineacion,
  "modelo" => $modelo,
  "urlKaraoke" => "subtitulos/" . rawurlencode($nombreBase . ".vtt")
],$conexion,$archivo);
