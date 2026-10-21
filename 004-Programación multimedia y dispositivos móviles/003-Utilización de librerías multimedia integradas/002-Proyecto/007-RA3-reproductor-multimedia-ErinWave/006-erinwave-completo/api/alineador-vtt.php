<?php

require_once __DIR__ . "/bbdd.php";

function erinwaveLeerVtt(string $ruta): array{
  if(!is_file($ruta)){
    return [];
  }

  $contenido = file_get_contents($ruta);

  if($contenido === false){
    return [];
  }

  $contenido = preg_replace('/^\xEF\xBB\xBF/','',$contenido);
  $contenido = str_replace(["\r\n","\r"],"\n",(string)$contenido);
  $bloques = preg_split('/\n{2,}/',trim((string)$contenido)) ?: [];
  $frases = [];

  foreach($bloques as $bloque){
    $lineas = explode("\n",trim($bloque));
    $indiceTiempo = null;
    $inicio = null;
    $fin = null;

    foreach($lineas as $indice => $linea){
      if(preg_match(
        '/^((?:\d{2}:)?\d{2}:\d{2}[\.,]\d{3})\s+-->\s+((?:\d{2}:)?\d{2}:\d{2}[\.,]\d{3})/',
        trim($linea),
        $partes
      )){
        $indiceTiempo = $indice;
        $inicio = str_replace(",",".",$partes[1]);
        $fin = str_replace(",",".",$partes[2]);
        break;
      }
    }

    if($indiceTiempo === null || $inicio === null || $fin === null){
      continue;
    }

    $texto = implode(" ",array_slice($lineas,$indiceTiempo + 1));
    $texto = trim(strip_tags($texto));

    if($texto === ""){
      continue;
    }

    $frases[] = [
      "inicio" => $inicio,
      "fin" => $fin,
      "texto" => $texto,
      "normalizado" => erinwaveNormalizarTexto($texto)
    ];
  }

  return $frases;
}

function erinwaveSimilitudTexto(string $primero,string $segundo): float{
  $primero = erinwaveNormalizarTexto($primero);
  $segundo = erinwaveNormalizarTexto($segundo);

  if($primero === "" || $segundo === ""){
    return 0.0;
  }

  if($primero === $segundo){
    return 1.0;
  }

  $longitudMayor = max(strlen($primero),strlen($segundo));
  $similitudCaracteres = $longitudMayor === 0
    ? 0.0
    : max(0.0,1.0 - (levenshtein($primero,$segundo) / $longitudMayor));
  $tokensPrimero = array_values(array_unique(explode(" ",$primero)));
  $tokensSegundo = array_values(array_unique(explode(" ",$segundo)));
  $comunes = count(array_intersect($tokensPrimero,$tokensSegundo));
  $union = count(array_unique(array_merge($tokensPrimero,$tokensSegundo)));
  $jaccard = $union === 0 ? 0.0 : $comunes / $union;
  $menorCantidad = min(count($tokensPrimero),count($tokensSegundo));
  $cobertura = $menorCantidad === 0 ? 0.0 : $comunes / $menorCantidad;

  return min(1.0,
    ($similitudCaracteres * 0.45)
    + ($jaccard * 0.35)
    + ($cobertura * 0.20)
  );
}

function erinwavePuntuacionCoincidencia(float $similitud): ?float{
  if($similitud < 0.30){
    return null;
  }

  return ($similitud * 3.2) - 0.85;
}

function erinwaveActualizarCelda(
  array &$tabla,
  array &$rastro,
  int $i,
  int $j,
  float $valor,
  array $paso
): void{
  if($valor > $tabla[$i][$j] + 0.000001){
    $tabla[$i][$j] = $valor;
    $rastro[$i][$j] = $paso;
  }
}

function erinwaveMilisegundosVtt(string $marca): int{
  $partes = array_reverse(explode(":",str_replace(",",".",$marca)));
  return (int)round(((float)$partes[0] + (int)$partes[1] * 60 + (int)($partes[2] ?? 0) * 3600) * 1000);
}

function erinwaveMarcaVtt(int $milisegundos): string{
  return sprintf("%02d:%02d:%02d.%03d",
    intdiv($milisegundos,3600000),
    intdiv($milisegundos,60000) % 60,
    intdiv($milisegundos,1000) % 60,
    $milisegundos % 1000
  );
}

function erinwaveRepartirLineas(array $lineas,int $inicio,int $fin): array{
  if(count($lineas) === 0 || $fin - $inicio < count($lineas)){
    return [];
  }

  // Es una estimación por longitud, no una detección de cuándo se canta cada palabra.
  $pesos = array_map(fn(array $linea): int => max(1,mb_strlen($linea["texto_normalizado"])),$lineas);
  $pesoTotal = array_sum($pesos);
  $acumulado = 0;
  $anterior = $inicio;
  $resultado = [];

  foreach($lineas as $indice => $linea){
    $acumulado += $pesos[$indice];
    $limite = (int)round($inicio + ($fin - $inicio) * $acumulado / $pesoTotal);
    $limite = max($anterior + 1,min($fin - (count($lineas) - $indice - 1),$limite));
    $resultado[] = [
      "inicio" => erinwaveMarcaVtt($anterior),
      "fin" => erinwaveMarcaVtt($limite),
      "texto" => $linea["texto"]
    ];
    $anterior = $limite;
  }

  return $resultado;
}

function erinwaveTramosPendientes(array $lineas,array $ubicadas,array $grupos,array $frases): array{
  if(count($frases) === 0){
    return [];
  }

  $tramos = [];
  $inicioPendiente = null;
  $totalLineas = count($lineas);

  for($indice = 0;$indice <= $totalLineas;$indice++){
    if($indice < $totalLineas && !isset($ubicadas[$indice])){
      $inicioPendiente ??= $indice;
      continue;
    }

    if($inicioPendiente === null){
      continue;
    }

    $cantidad = $indice - $inicioPendiente;
    $anterior = null;
    $siguiente = null;

    foreach($grupos as $grupo){
      if($grupo["indice"] + $grupo["cantidad"] <= $inicioPendiente){
        $anterior = $grupo;
      }elseif($grupo["indice"] >= $indice){
        $siguiente = $grupo;
        break;
      }
    }

    $inicio = $anterior["fin"] ?? erinwaveMilisegundosVtt($frases[0]["inicio"]);
    $fin = $siguiente["inicio"] ?? erinwaveMilisegundosVtt($frases[count($frases) - 1]["fin"]);

    if($cantidad <= 8 && $fin - $inicio >= 2000 && $fin - $inicio <= 90000){
      $lineasTramo = array_column(array_slice($lineas,$inicioPendiente,$cantidad),"texto");
      $tramos[] = [
        "inicio" => $inicio,
        "fin" => $fin,
        "cantidadLineas" => $cantidad,
        "lineas" => $lineasTramo,
        "texto" => implode(" ",$lineasTramo)
      ];
    }

    $inicioPendiente = null;
  }

  return $tramos;
}

function erinwaveCombinarFrases(array $originales,array $nuevas,array $tramos): array{
  $resultado = [];

  foreach($originales as $frase){
    $medio = (erinwaveMilisegundosVtt($frase["inicio"]) + erinwaveMilisegundosVtt($frase["fin"])) / 2;
    $enTramo = false;

    foreach($tramos as $tramo){
      if($medio >= $tramo["inicio"] && $medio < $tramo["fin"]){
        $enTramo = true;
        break;
      }
    }

    if(!$enTramo){
      $resultado[] = $frase;
    }
  }

  foreach($nuevas as $frase){
    if(!is_array($frase) || !isset($frase["inicio"],$frase["fin"],$frase["texto"])){
      continue;
    }

    $inicio = (int)$frase["inicio"];
    $fin = (int)$frase["fin"];
    $texto = trim((string)$frase["texto"]);
    $medio = ($inicio + $fin) / 2;

    if($texto === "" || $fin <= $inicio){
      continue;
    }

    foreach($tramos as $tramo){
      if($medio >= $tramo["inicio"] && $medio < $tramo["fin"]){
        $inicio = max($inicio,$tramo["inicio"]);
        $fin = min($fin,$tramo["fin"]);

        if($fin > $inicio){
          $resultado[] = [
            "inicio" => erinwaveMarcaVtt($inicio),
            "fin" => erinwaveMarcaVtt($fin),
            "texto" => $texto,
            "normalizado" => erinwaveNormalizarTexto($texto)
          ];
        }
        break;
      }
    }
  }

  usort($resultado,fn(array $primera,array $segunda): int =>
    erinwaveMilisegundosVtt($primera["inicio"]) <=> erinwaveMilisegundosVtt($segunda["inicio"])
  );

  return $resultado;
}

function erinwaveAlinearSecuencias(array $frases,array $lineas): array{
  $totalFrases = count($frases);
  $totalLineas = count($lineas);
  $menosInfinito = -PHP_FLOAT_MAX;
  $tabla = [];
  $rastro = [];

  for($i = 0;$i <= $totalFrases;$i++){
    $tabla[$i] = array_fill(0,$totalLineas + 1,$menosInfinito);
    $rastro[$i] = array_fill(0,$totalLineas + 1,null);
  }

  $tabla[0][0] = 0.0;
  $penalizacionHueco = 0.55;

  for($i = 0;$i <= $totalFrases;$i++){
    for($j = 0;$j <= $totalLineas;$j++){
      $actual = $tabla[$i][$j];

      if($actual === $menosInfinito){
        continue;
      }

      if($i < $totalFrases){
        erinwaveActualizarCelda(
          $tabla,$rastro,$i + 1,$j,$actual - $penalizacionHueco,
          ["tipo" => "sobra_frase", "i" => $i, "j" => $j]
        );
      }

      if($j < $totalLineas){
        erinwaveActualizarCelda(
          $tabla,$rastro,$i,$j + 1,$actual - $penalizacionHueco,
          ["tipo" => "falta_linea", "i" => $i, "j" => $j]
        );
      }

      if($i < $totalFrases && $j < $totalLineas){
        $similitud = erinwaveSimilitudTexto(
          $frases[$i]["normalizado"],
          $lineas[$j]["texto_normalizado"]
        );
        $puntuacion = erinwavePuntuacionCoincidencia($similitud);

        if($puntuacion !== null){
          erinwaveActualizarCelda(
            $tabla,$rastro,$i + 1,$j + 1,$actual + $puntuacion,
            [
              "tipo" => "uno_uno",
              "i" => $i,
              "j" => $j,
              "similitud" => $similitud
            ]
          );
        }
      }

      for($cantidad = 2;$i < $totalFrases && $cantidad <= 6 && $j + $cantidad <= $totalLineas;$cantidad++){
        $textoLineas = implode(" ",array_column(array_slice($lineas,$j,$cantidad),"texto_normalizado"));
        $similitud = erinwaveSimilitudTexto($frases[$i]["normalizado"],$textoLineas);
        $puntuacion = erinwavePuntuacionCoincidencia($similitud);

        if($puntuacion !== null){
          erinwaveActualizarCelda(
            $tabla,$rastro,$i + 1,$j + $cantidad,$actual + $puntuacion + 0.08 * ($cantidad - 1),
            [
              "tipo" => "uno_varios",
              "cantidadLineas" => $cantidad,
              "i" => $i,
              "j" => $j,
              "similitud" => $similitud
            ]
          );
        }
      }

      if($i + 1 < $totalFrases && $j < $totalLineas){
        $textoFrases = $frases[$i]["normalizado"] . " " . $frases[$i + 1]["normalizado"];
        $similitud = erinwaveSimilitudTexto($textoFrases,$lineas[$j]["texto_normalizado"]);
        $puntuacion = erinwavePuntuacionCoincidencia($similitud);

        if($puntuacion !== null){
          erinwaveActualizarCelda(
            $tabla,$rastro,$i + 2,$j + 1,$actual + $puntuacion + 0.08,
            [
              "tipo" => "dos_uno",
              "i" => $i,
              "j" => $j,
              "similitud" => $similitud
            ]
          );
        }
      }
    }
  }

  $pasos = [];
  $i = $totalFrases;
  $j = $totalLineas;

  while($i > 0 || $j > 0){
    $paso = $rastro[$i][$j] ?? null;

    if($paso === null){
      if($i > 0){
        $i--;
      }elseif($j > 0){
        $j--;
      }
      continue;
    }

    $pasos[] = $paso;

    if($paso["tipo"] === "uno_uno"){
      $i--;
      $j--;
    }elseif($paso["tipo"] === "uno_varios"){
      $i--;
      $j -= $paso["cantidadLineas"];
    }elseif($paso["tipo"] === "dos_uno"){
      $i -= 2;
      $j--;
    }elseif($paso["tipo"] === "sobra_frase"){
      $i--;
    }else{
      $j--;
    }
  }

  $pasos = array_reverse($pasos);
  $frasesCorregidas = [];
  $lineasCoincidentes = 0;
  $frasesCoincidentes = 0;
  $sumaSimilitud = 0.0;
  $grupos = [];
  $lineasUbicadas = [];
  $lineasEstimadas = 0;
  $lineasRecuperadas = 0;

  foreach($pasos as $paso){
    if(!isset($paso["similitud"]) || $paso["similitud"] < 0.42){
      continue;
    }

    $indiceFrase = $paso["i"];
    $indiceLinea = $paso["j"];
    $cantidadFrases = $paso["tipo"] === "dos_uno" ? 2 : 1;
    $cantidadLineas = $paso["cantidadLineas"] ?? 1;
    $inicio = erinwaveMilisegundosVtt($frases[$indiceFrase]["inicio"]);
    $fin = erinwaveMilisegundosVtt($frases[$indiceFrase + $cantidadFrases - 1]["fin"]);
    $repartidas = erinwaveRepartirLineas(array_slice($lineas,$indiceLinea,$cantidadLineas),$inicio,$fin);

    if(count($repartidas) !== $cantidadLineas){
      continue;
    }

    $grupos[] = [
      "indice" => $indiceLinea,
      "cantidad" => $cantidadLineas,
      "inicio" => $inicio,
      "fin" => $fin
    ];
    foreach($repartidas as $desplazamiento => $frase){
      $lineasUbicadas[$indiceLinea + $desplazamiento] = $frase;
    }
    $lineasEstimadas += $cantidadLineas > 1 ? $cantidadLineas : 0;
    $lineasCoincidentes += $cantidadLineas;
    $frasesCoincidentes += $cantidadFrases;
    $sumaSimilitud += $paso["similitud"] * $cantidadLineas;
  }

  $similitudMedia = $lineasCoincidentes === 0
    ? 0.0
    : $sumaSimilitud / $lineasCoincidentes;
  $cobertura = $totalLineas === 0 ? 0.0 : $lineasCoincidentes / $totalLineas;
  $suficiente = $lineasCoincidentes > 0
    && $cobertura >= 0.60
    && $similitudMedia >= 0.50;

  // Solo recuperamos huecos cortos delimitados por dos coincidencias en orden.
  if($suficiente){
    for($indice = 1;$indice < count($grupos);$indice++){
      $anterior = $grupos[$indice - 1];
      $siguiente = $grupos[$indice];
      $primeraLinea = $anterior["indice"] + $anterior["cantidad"];
      $cantidad = $siguiente["indice"] - $primeraLinea;
      $duracion = $siguiente["inicio"] - $anterior["fin"];

      if($cantidad < 1 || $cantidad > 4 || $duracion < $cantidad * 600 || $duracion > min(20000,$cantidad * 8000)){
        continue;
      }

      $recuperadas = erinwaveRepartirLineas(
        array_slice($lineas,$primeraLinea,$cantidad),$anterior["fin"],$siguiente["inicio"]
      );
      foreach($recuperadas as $desplazamiento => $frase){
        $lineasUbicadas[$primeraLinea + $desplazamiento] = $frase;
      }
      $lineasRecuperadas += count($recuperadas);
      $lineasEstimadas += count($recuperadas);
    }
  }

  ksort($lineasUbicadas);
  $frasesCorregidas = array_values($lineasUbicadas);
  $pendientes = [];
  foreach($lineas as $indice => $linea){
    if(!isset($lineasUbicadas[$indice])){
      $pendientes[] = ["orden" => $linea["orden"] ?? $indice + 1, "texto" => $linea["texto"]];
    }
  }

  $tramosPendientes = erinwaveTramosPendientes($lineas,$lineasUbicadas,$grupos,$frases);

  return [
    "frases" => $frasesCorregidas,
    "frasesWhisper" => $totalFrases,
    "lineasLetra" => $totalLineas,
    "coincidencias" => $lineasCoincidentes,
    "frasesCoincidentes" => $frasesCoincidentes,
    "lineasPendientes" => count($pendientes),
    "detallePendientes" => $pendientes,
    "tramosPendientes" => $tramosPendientes,
    "lineasMostradas" => count($frasesCorregidas),
    "lineasEstimadas" => $lineasEstimadas,
    "lineasRecuperadas" => $lineasRecuperadas,
    "frasesSobrantes" => max(0,$totalFrases - $frasesCoincidentes),
    "similitudMedia" => round($similitudMedia,4),
    "cobertura" => round($cobertura,4),
    "suficiente" => $suficiente
  ];
}

function erinwaveCrearVtt(array $frases): string{
  $bloques = ["WEBVTT"];

  foreach($frases as $frase){
    $bloques[] = $frase["inicio"] . " --> " . $frase["fin"] . "\n" . $frase["texto"];
  }

  return implode("\n\n",$bloques) . "\n";
}

function erinwaveAlinearVtt(PDO $conexion,string $archivo,string $rutaVtt): array{
  $letra = erinwaveObtenerLetra($conexion,$archivo);
  $frases = erinwaveLeerVtt($rutaVtt);

  if($letra === null){
    return [
      "disponible" => false,
      "aplicada" => false,
      "suficiente" => false,
      "frasesWhisper" => count($frases),
      "lineasLetra" => 0,
      "coincidencias" => 0,
      "similitudMedia" => 0.0,
      "motivo" => "sin_letra_revisada"
    ];
  }

  if(count($frases) === 0){
    return [
      "disponible" => true,
      "aplicada" => false,
      "suficiente" => false,
      "frasesWhisper" => 0,
      "lineasLetra" => count($letra["lineas"]),
      "coincidencias" => 0,
      "similitudMedia" => 0.0,
      "motivo" => "vtt_sin_frases"
    ];
  }

  $resultado = erinwaveAlinearSecuencias($frases,$letra["lineas"]);
  $resultado["disponible"] = true;
  $resultado["aplicada"] = $resultado["suficiente"];
  $resultado["idiomaLetra"] = $letra["idioma"];
  $resultado["hashLetra"] = $letra["hash"];
  $resultado["contenido"] = erinwaveCrearVtt($resultado["frases"]);
  $resultado["motivo"] = $resultado["suficiente"]
    ? "alineacion_suficiente"
    : "requiere_revision";

  return $resultado;
}
