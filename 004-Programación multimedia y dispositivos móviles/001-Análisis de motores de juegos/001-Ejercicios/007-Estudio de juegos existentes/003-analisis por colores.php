<?php

set_time_limit(400);

function ollama($prompt) {

    $url = 'http://localhost:11434/api/generate';

    $data = [
        'model' => 'llama3.1:8b-instruct-q4_K_M',
        'prompt' => $prompt,
        'stream' => false
    ];

    $ch = curl_init($url);

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 180,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json'
        ],
        CURLOPT_POSTFIELDS => json_encode($data)
    ]);

    $response = curl_exec($ch);

    if ($response === false) {
        die('Error CURL: ' . htmlspecialchars(curl_error($ch)));
    }

    curl_close($ch);

    $result = json_decode($response, true);

    return $result['response'] ?? '';
}


// ====================================================
// COLORES
// ====================================================

$coloresEmociones = [
    'alegria'     => '#FFD700',
    'tristeza'    => '#4169E1',
    'enfado'      => '#DC143C',
    'miedo'       => '#800080',
    'sorpresa'    => '#FF8C00',
    'calma'       => '#20B2AA',
    'amor'        => '#FF69B4',
    'asco'        => '#6B8E23',
    'ansiedad'    => '#8A2BE2',
    'esperanza'   => '#32CD32',
    'nostalgia'   => '#9370DB',
    'neutral'     => '#808080'
];

?>

<!DOCTYPE html>
<html lang="es">

<head>

<meta charset="UTF-8">

<title>Análisis emocional</title>

<style>

body {
    font-family: Arial, sans-serif;
    background: #f5f5f5;
    padding: 40px;
}

.parrafo {
    max-width: 800px;
    margin: 20px auto;
    padding: 25px;

    border-left: 12px solid;
    border-radius: 8px;

    background: white;

    box-shadow:
        0 2px 8px rgba(0,0,0,0.1);
}

.emocion {
    font-weight: bold;
    margin-bottom: 10px;
}

.datos {
    margin-top: 15px;
    font-size: 12px;
    opacity: 0.7;
}

</style>

</head>

<body>

<h1>Análisis emocional</h1>

<p id="estado">Generando texto...</p>

<?php

flush();

// ====================================================
// PASADA 1: GENERACIÓN
// ====================================================

$promptGeneracion = <<<PROMPT

Escribe un texto en español compuesto por 6 párrafos.

Cada párrafo debe expresar una emoción diferente, en este orden:
alegría, tristeza, enfado, miedo, sorpresa y calma.

No escribas el nombre de la emoción.
No numeres los párrafos.

Cada párrafo debe tener entre 3 y 5 frases.

Separa cada párrafo mediante una línea en blanco.

PROMPT;

$texto = ollama($promptGeneracion);


// ====================================================
// SEPARAR PÁRRAFOS
// ====================================================

$parrafos = preg_split(
    '/\R\s*\R/',
    trim($texto)
);

if (count($parrafos) === 0 || $parrafos[0] === '') {
    die('<p>Ollama no ha generado texto.</p></body></html>');
}

echo '<script>document.getElementById("estado").textContent = "Analizando emociones...";</script>';
flush();


// ====================================================
// PASADA 2: ANÁLISIS
// ====================================================

$promptAnalisis = <<<PROMPT

Analiza emocionalmente cada párrafo.

Las emociones permitidas son exclusivamente:

alegria
tristeza
enfado
miedo
sorpresa
calma
amor
asco
ansiedad
esperanza
nostalgia
neutral

Para cada párrafo determina:

- parrafo
- emocion
- valencia (-1 a 1)
- intensidad (0 a 1)
- activacion (0 a 1)

Devuelve ÚNICAMENTE JSON válido.

Ejemplo:

[
    {
        "parrafo": 1,
        "emocion": "alegria",
        "valencia": 0.8,
        "intensidad": 0.7,
        "activacion": 0.6
    }
]

No uses markdown.
No añadas explicaciones.

TEXTO:

$texto

PROMPT;

$respuestaAnalisis = ollama($promptAnalisis);


// ====================================================
// DECODIFICAR JSON
// ====================================================

$analisis = json_decode($respuestaAnalisis, true);

if (!is_array($analisis)) {
    die(
        "<h2>Error interpretando JSON</h2>" .
        "<pre>" .
        htmlspecialchars($respuestaAnalisis) .
        "</pre></body></html>"
    );
}

echo '<script>document.getElementById("estado").textContent = "Análisis completado";</script>';


// ====================================================
// MOSTRAR PÁRRAFOS COLOREADOS
// ====================================================

foreach ($parrafos as $indice => $parrafo) {

    $datos = $analisis[$indice] ?? [];

    $emocion = strtolower(
        $datos['emocion'] ?? 'neutral'
    );

    $color = $coloresEmociones[$emocion]
        ?? '#808080';

    $valencia = $datos['valencia'] ?? 0;
    $intensidad = $datos['intensidad'] ?? 0;
    $activacion = $datos['activacion'] ?? 0;

    ?>

    <div
        class="parrafo"
        style="border-color: <?= htmlspecialchars($color) ?>"
    >

        <div
            class="emocion"
            style="color: <?= htmlspecialchars($color) ?>"
        >
            <?= htmlspecialchars(strtoupper($emocion)) ?>
        </div>

        <div>
            <?= htmlspecialchars($parrafo) ?>
        </div>

        <div class="datos">

            Valencia:
            <?= htmlspecialchars($valencia) ?>

            · Intensidad:
            <?= htmlspecialchars($intensidad) ?>

            · Activación:
            <?= htmlspecialchars($activacion) ?>

            · Color:
            <?= htmlspecialchars($color) ?>

        </div>

    </div>

    <?php
}

?>

</body>
</html>
