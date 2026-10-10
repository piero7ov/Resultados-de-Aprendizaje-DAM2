<?php

set_time_limit(190);

$url = 'http://localhost:11434/api/generate';

$prompt = <<<PROMPT
Escribe un texto en español compuesto por 6 párrafos.

Cada párrafo debe expresar claramente una emoción diferente:
1. Alegría
2. Tristeza
3. Enfado
4. Miedo
5. Sorpresa
6. Calma

No escribas el nombre de la emoción.
Simplemente escribe cada párrafo de forma que la emoción se pueda deducir
por el contenido, el vocabulario y el tono.

Cada párrafo debe tener entre 3 y 5 frases.
Separa claramente los párrafos con una línea en blanco.
PROMPT;

$data = [
    'model' => 'llama3.1:8b-instruct-q4_K_M',
    'prompt' => $prompt,
    'stream' => true
];

$ch = curl_init($url);
$buffer = '';
$textoGenerado = false;
$errorOllama = '';

header('Content-Type: text/html; charset=UTF-8');
echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Sentimiento</title></head><body>';
echo '<h1>Texto generado</h1><div>';
flush();

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 180,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode($data),
    CURLOPT_WRITEFUNCTION => function ($ch, $fragmento) use (&$buffer, &$textoGenerado, &$errorOllama) {
        $buffer .= $fragmento;

        while (($posicion = strpos($buffer, "\n")) !== false) {
            $linea = substr($buffer, 0, $posicion);
            $buffer = substr($buffer, $posicion + 1);
            $parte = json_decode($linea, true);

            if (isset($parte['error'])) {
                $errorOllama = $parte['error'];
            }

            if (isset($parte['response'])) {
                echo nl2br(htmlspecialchars($parte['response'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
                $textoGenerado = true;
                flush();
            }
        }

        return strlen($fragmento);
    }
]);

$respuesta = curl_exec($ch);
$errorCurl = curl_error($ch);
curl_close($ch);

echo '</div>';

if ($respuesta === false) {
    echo '<p>Error CURL: ' . htmlspecialchars($errorCurl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</p>';
} elseif ($errorOllama !== '') {
    echo '<p>Error Ollama: ' . htmlspecialchars($errorOllama, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</p>';
} elseif (!$textoGenerado) {
    echo '<p>Ollama no ha devuelto texto.</p>';
}

echo '</body></html>';
?>
