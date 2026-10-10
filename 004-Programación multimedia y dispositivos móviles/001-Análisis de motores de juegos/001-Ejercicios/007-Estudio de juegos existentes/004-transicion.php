<?php

set_time_limit(420);

// ============================================================
// CONFIGURACIÓN
// ============================================================

$modelo = 'llama3.1:8b-instruct-q4_K_M';

$urlOllama = 'http://localhost:11434/api/generate';


// ============================================================
// FUNCIÓN PARA LLAMAR A OLLAMA
// ============================================================

function ollama($prompt)
{
    global $modelo;
    global $urlOllama;

    $data = [
        'model' => $modelo,
        'prompt' => $prompt,
        'stream' => false,
        'options' => [
            'temperature' => 0.7
        ]
    ];

    $ch = curl_init($urlOllama);

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 200,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json'
        ],
        CURLOPT_POSTFIELDS => json_encode(
            $data,
            JSON_UNESCAPED_UNICODE
        )
    ]);

    $response = curl_exec($ch);

    if ($response === false) {

        $error = curl_error($ch);

        curl_close($ch);

        die(
            'Error CURL conectando con Ollama: ' .
            htmlspecialchars($error)
        );
    }

    curl_close($ch);

    $result = json_decode($response, true);

    if (!isset($result['response'])) {

        die(
            '<h2>Respuesta inesperada de Ollama</h2>' .
            '<pre>' .
            htmlspecialchars($response) .
            '</pre>'
        );
    }

    return trim($result['response']);
}


// ============================================================
// 1. GENERAR TEXTO
// ============================================================

$promptGeneracion = <<<PROMPT

Escribe un pequeño texto narrativo en español compuesto por exactamente
6 párrafos.

Cada párrafo debe expresar claramente una emoción diferente.

Las emociones posibles son:

alegria
amor
ansiedad
asco
calma
enfado
esperanza
miedo
neutral
nostalgia
sorpresa
tristeza

IMPORTANTE:

- No escribas el nombre de la emoción.
- No numeres los párrafos.
- No pongas títulos.
- Cada párrafo debe tener entre 3 y 5 frases.
- Separa cada párrafo mediante una línea en blanco.
- Intenta que exista cierta continuidad narrativa entre los párrafos.

Devuelve únicamente el texto.

PROMPT;


$texto = ollama($promptGeneracion);


// ============================================================
// 2. SEPARAR PÁRRAFOS
// ============================================================

$parrafos = preg_split(
    '/\R\s*\R/',
    trim($texto)
);


// Eliminar posibles párrafos vacíos

$parrafos = array_values(
    array_filter(
        $parrafos,
        function ($parrafo) {
            return trim($parrafo) !== '';
        }
    )
);


// ============================================================
// 3. SEGUNDA PASADA: ANÁLISIS EMOCIONAL
// ============================================================

$promptAnalisis = <<<PROMPT

Analiza emocionalmente cada uno de los párrafos del siguiente texto.

Debes seleccionar EXACTAMENTE una emoción para cada párrafo.

Las únicas emociones permitidas son:

alegria
amor
ansiedad
asco
calma
enfado
esperanza
miedo
neutral
nostalgia
sorpresa
tristeza

Para cada párrafo devuelve:

- parrafo: número del párrafo empezando en 1
- emocion: una de las emociones permitidas
- valencia: número entre -1 y 1
- intensidad: número entre 0 y 1
- activacion: número entre 0 y 1

Devuelve ÚNICAMENTE JSON válido.

Formato:

[
    {
        "parrafo": 1,
        "emocion": "alegria",
        "valencia": 0.8,
        "intensidad": 0.7,
        "activacion": 0.6
    }
]

IMPORTANTE:

- No uses markdown.
- No uses bloques ```json.
- No añadas comentarios.
- No añadas ninguna explicación antes o después del JSON.

TEXTO A ANALIZAR:

$texto

PROMPT;


$respuestaAnalisis = ollama($promptAnalisis);


// ============================================================
// 4. LIMPIAR POSIBLES ```json
// ============================================================

$respuestaAnalisis = trim($respuestaAnalisis);

$respuestaAnalisis = preg_replace(
    '/^```json\s*/i',
    '',
    $respuestaAnalisis
);

$respuestaAnalisis = preg_replace(
    '/^```\s*/',
    '',
    $respuestaAnalisis
);

$respuestaAnalisis = preg_replace(
    '/\s*```$/',
    '',
    $respuestaAnalisis
);


// ============================================================
// 5. DECODIFICAR JSON
// ============================================================

$analisis = json_decode(
    $respuestaAnalisis,
    true
);


if (!is_array($analisis)) {

    die(
        '<h2>Error interpretando el JSON de Ollama</h2>' .
        '<p>Respuesta recibida:</p>' .
        '<pre>' .
        htmlspecialchars($respuestaAnalisis) .
        '</pre>'
    );
}


// ============================================================
// 6. EMOCIONES PERMITIDAS
// ============================================================

$emocionesValidas = [
    'alegria',
    'amor',
    'ansiedad',
    'asco',
    'calma',
    'enfado',
    'esperanza',
    'miedo',
    'neutral',
    'nostalgia',
    'sorpresa',
    'tristeza'
];


// ============================================================
// 7. CONSTRUIR DATOS PARA JAVASCRIPT
// ============================================================

$datos = [];

foreach ($parrafos as $indice => $parrafo) {

    $info = $analisis[$indice] ?? [];

    $emocion = strtolower(
        trim(
            $info['emocion'] ?? 'neutral'
        )
    );


    // Protección frente a respuestas inesperadas

    if (!in_array(
        $emocion,
        $emocionesValidas,
        true
    )) {

        $emocion = 'neutral';
    }


    $datos[] = [

        'texto' => trim($parrafo),

        'emocion' => $emocion,

        'valencia' => isset($info['valencia'])
            ? (float)$info['valencia']
            : 0,

        'intensidad' => isset($info['intensidad'])
            ? (float)$info['intensidad']
            : 0,

        'activacion' => isset($info['activacion'])
            ? (float)$info['activacion']
            : 0
    ];
}

?>
<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>Avatar emocional con Ollama</title>

<style>

/* ============================================================
   GENERAL
   ============================================================ */

* {
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
}

body {
    margin: 0;
    padding: 50px;

    font-family:
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

    background: #f5f5f5;
    color: #333;
}


/* ============================================================
   CONTENEDOR DEL TEXTO
   ============================================================ */

#texto {
    max-width: 850px;

    margin:
        0
        auto;

    padding-right: 270px;
}


/* ============================================================
   PÁRRAFOS
   ============================================================ */

.parrafo {
    margin-bottom: 45px;

    font-size: 21px;
    line-height: 1.9;
}


/* ============================================================
   PALABRAS
   ============================================================ */

.palabra {
    opacity: 0.18;

    transition:
        opacity 0.15s ease,
        background 0.15s ease,
        color 0.15s ease;
}


/* palabra ya pronunciada */

.palabra.leida {
    opacity: 1;
}


/* palabra que se está pronunciando */

.palabra.actual {
    background: #222;
    color: white;

    padding:
        2px
        5px;

    border-radius: 4px;
}


/* ============================================================
   AVATAR FLOTANTE
   ============================================================ */

#avatar {
    position: fixed;

    right: 30px;
    bottom: 20px;

    width: 258px;
    height: 282px;

    z-index: 1000;

    pointer-events: none;
}


/*
Dos imágenes ocupan exactamente
la misma posición.

Esto permite hacer crossfade.
*/

.capa-avatar {
    position: absolute;

    top: 0;
    left: 0;

    width: 100%;
    height: 100%;

    object-fit: contain;

    /*
    No ponemos transición CSS.

    La opacidad se controla directamente
    mediante JavaScript palabra a palabra.
    */

    transition: none;
}


#avatarA {
    opacity: 1;
}


#avatarB {
    opacity: 0;
}


/* ============================================================
   PANEL DE INFORMACIÓN
   ============================================================ */

#estado {
    position: fixed;

    top: 25px;
    right: 25px;

    min-width: 180px;

    padding: 12px 16px;

    background:
        rgba(0, 0, 0, 0.78);

    color: white;

    border-radius: 8px;

    font-size: 13px;
    line-height: 1.6;

    z-index: 1001;

    backdrop-filter:
        blur(5px);
}


#estado .emocion {
    font-size: 16px;
    font-weight: bold;
}


/* ============================================================
   PROGRESO
   ============================================================ */

#barra {
    position: fixed;

    left: 0;
    top: 0;

    width: 100%;
    height: 4px;

    background: #ddd;

    z-index: 2000;
}


#progreso {
    width: 0%;
    height: 100%;

    background: #222;

    transition:
        width 0.1s linear;
}


/* ============================================================
   RESPONSIVE
   ============================================================ */

@media (max-width: 800px) {

    body {
        padding: 25px;
        padding-bottom: 210px;
    }

    #texto {
        padding-right: 0;
    }

    #avatar {
        width: 155px;
        height: 170px;

        right: 10px;
        bottom: 10px;
    }

    #estado {
        top: 15px;
        right: 15px;
    }
}

</style>

</head>


<body>


<!-- ==========================================================
     BARRA DE PROGRESO
     ========================================================== -->

<div id="barra">

    <div id="progreso"></div>

</div>


<!-- ==========================================================
     TEXTO
     ========================================================== -->

<div id="texto"></div>


<!-- ==========================================================
     ESTADO EMOCIONAL
     ========================================================== -->

<div id="estado">

    <div class="emocion">
        NEUTRAL
    </div>

    <div>
        Preparando...
    </div>

</div>


<!-- ==========================================================
     AVATAR

     Las dos imágenes están superpuestas.
     ========================================================== -->

<div id="avatar">

    <img
        id="avatarA"
        class="capa-avatar"
        src="expresiones/neutral.png"
        alt=""
    >

    <img
        id="avatarB"
        class="capa-avatar"
        src="expresiones/neutral.png"
        alt=""
    >

</div>


<script>

// ============================================================
// DATOS PROCEDENTES DE PHP
// ============================================================

const parrafos = <?= json_encode(
    $datos,
    JSON_UNESCAPED_UNICODE |
    JSON_UNESCAPED_SLASHES
) ?>;


// ============================================================
// CONFIGURACIÓN
// ============================================================

const velocidad = 230;

const pausaEntreParrafos = 400;


// ============================================================
// EMOCIONES VÁLIDAS
// ============================================================

const emocionesValidas = [
    "alegria",
    "amor",
    "ansiedad",
    "asco",
    "calma",
    "enfado",
    "esperanza",
    "miedo",
    "neutral",
    "nostalgia",
    "sorpresa",
    "tristeza"
];


// ============================================================
// DOM
// ============================================================

const contenedorTexto =
    document.querySelector("#texto");

const avatarA =
    document.querySelector("#avatarA");

const avatarB =
    document.querySelector("#avatarB");

const estado =
    document.querySelector("#estado");

const progreso =
    document.querySelector("#progreso");


// ============================================================
// NORMALIZAR EMOCIÓN
// ============================================================

function normalizarEmocion(emocion)
{
    if (!emocion) {
        return "neutral";
    }

    emocion =
        emocion
            .toLowerCase()
            .trim();


    if (!emocionesValidas.includes(emocion)) {

        return "neutral";
    }

    return emocion;
}


// ============================================================
// RUTA DE UNA EXPRESIÓN
// ============================================================

function imagenEmocion(emocion)
{
    emocion =
        normalizarEmocion(emocion);

    return (
        "expresiones/" +
        emocion +
        ".png"
    );
}


// ============================================================
// PRECARGAR TODAS LAS IMÁGENES
//
// Esto es importante para evitar un pequeño parpadeo
// la primera vez que aparece una emoción.
// ============================================================

const imagenesPrecargadas = {};

emocionesValidas.forEach(emocion => {

    const imagen =
        new Image();

    imagen.src =
        imagenEmocion(emocion);

    imagenesPrecargadas[emocion] =
        imagen;

});


// ============================================================
// CREAR TEXTO
// ============================================================

const elementosParrafos = [];

let totalPalabrasDocumento = 0;


parrafos.forEach(
    (parrafo, indiceParrafo) => {

        const elementoParrafo =
            document.createElement("div");

        elementoParrafo.className =
            "parrafo";


        // ----------------------------------------------------
        // PALABRAS
        // ----------------------------------------------------

        const palabras =
            parrafo.texto
                .trim()
                .split(/\s+/);


        const elementosPalabras = [];


        palabras.forEach(
            (palabra, indicePalabra) => {

                const span =
                    document.createElement(
                        "span"
                    );

                span.className =
                    "palabra";

                span.textContent =
                    palabra;

                span.dataset.parrafo =
                    indiceParrafo;

                span.dataset.palabra =
                    indicePalabra;


                elementoParrafo.appendChild(
                    span
                );


                elementoParrafo.appendChild(
                    document.createTextNode(" ")
                );


                elementosPalabras.push(
                    span
                );


                totalPalabrasDocumento++;

            }
        );


        contenedorTexto.appendChild(
            elementoParrafo
        );


        elementosParrafos.push({

            elemento:
                elementoParrafo,

            palabras:
                elementosPalabras

        });

    }
);


// ============================================================
// CROSSFADING DE DOS EMOCIONES
// ============================================================

function mezclarEmociones(
    emocionOrigen,
    emocionDestino,
    factor
)
{
    emocionOrigen =
        normalizarEmocion(
            emocionOrigen
        );

    emocionDestino =
        normalizarEmocion(
            emocionDestino
        );


    // limitar entre 0 y 1

    factor =
        Math.max(
            0,
            Math.min(
                1,
                factor
            )
        );


    // --------------------------------------------------------
    // MISMA EMOCIÓN
    // --------------------------------------------------------

    if (
        emocionOrigen ===
        emocionDestino
    ) {

        avatarA.src =
            imagenEmocion(
                emocionOrigen
            );

        avatarA.style.opacity =
            1;

        avatarB.style.opacity =
            0;

        return;
    }


    // --------------------------------------------------------
    // DOS EMOCIONES DISTINTAS
    // --------------------------------------------------------

    avatarA.src =
        imagenEmocion(
            emocionOrigen
        );

    avatarB.src =
        imagenEmocion(
            emocionDestino
        );


    avatarA.style.opacity =
        1 - factor;

    avatarB.style.opacity =
        factor;
}


// ============================================================
// ACTUALIZAR AVATAR
//
// El 50% de cada párrafo representa el punto
// máximo de la emoción.
//
// Ejemplo:
//
//       párrafo 1                 párrafo 2
//
// 0% ----- 50% ----- 100% | 0% ----- 50% ----- 100%
//           ↑                         ↑
//       alegría 100%              tristeza 100%
//
// La transición se produce continuamente entre
// ambos centros.
// ============================================================

function actualizarAvatar(
    indiceParrafo,
    indicePalabra,
    totalPalabras
)
{

    // --------------------------------------------------------
    // PROGRESO DENTRO DEL PÁRRAFO
    //
    // 0   = principio
    // 0.5 = centro
    // 1   = final
    // --------------------------------------------------------

    let posicion;


    if (totalPalabras <= 1) {

        posicion = 0.5;

    } else {

        posicion =
            indicePalabra /
            (totalPalabras - 1);

    }


    const emocionActual =
        normalizarEmocion(
            parrafos[
                indiceParrafo
            ].emocion
        );


    // ========================================================
    // PRIMERA MITAD DEL PÁRRAFO
    //
    // Estamos terminando la transición que comenzó
    // en el centro del párrafo anterior.
    // ========================================================

    if (posicion < 0.5) {

        let emocionAnterior;


        if (indiceParrafo > 0) {

            emocionAnterior =
                normalizarEmocion(
                    parrafos[
                        indiceParrafo - 1
                    ].emocion
                );

        } else {

            // Antes del primer párrafo:
            // empezamos desde neutral.

            emocionAnterior =
                "neutral";
        }


        /*
        Desde:

        centro párrafo anterior = factor 0

        hasta:

        centro párrafo actual = factor 1


        En el comienzo del párrafo actual
        ya estamos exactamente a mitad:

        factor = 0.5
        */


        const factor =
            0.5 +
            posicion;


        mezclarEmociones(
            emocionAnterior,
            emocionActual,
            factor
        );

    }


    // ========================================================
    // SEGUNDA MITAD DEL PÁRRAFO
    //
    // Empezamos a abandonar la emoción actual
    // y nos dirigimos hacia la siguiente.
    // ========================================================

    else {

        let emocionSiguiente;


        if (
            indiceParrafo <
            parrafos.length - 1
        ) {

            emocionSiguiente =
                normalizarEmocion(
                    parrafos[
                        indiceParrafo + 1
                    ].emocion
                );

        } else {

            // Después del último párrafo
            // volvemos progresivamente a neutral.

            emocionSiguiente =
                "neutral";
        }


        /*
        En el centro:

        posicion = 0.5
        factor = 0

        Al final:

        posicion = 1
        factor = 0.5

        La segunda mitad del crossfade ocurrirá
        durante la primera mitad del siguiente
        párrafo.
        */


        const factor =
            posicion -
            0.5;


        mezclarEmociones(
            emocionActual,
            emocionSiguiente,
            factor
        );

    }


    // ========================================================
    // INFORMACIÓN DE DEBUG
    // ========================================================

    const datos =
        parrafos[indiceParrafo];


    estado.innerHTML = `

        <div class="emocion">
            ${datos.emocion.toUpperCase()}
        </div>

        <div>
            Párrafo:
            ${indiceParrafo + 1}
            /
            ${parrafos.length}
        </div>

        <div>
            Posición:
            ${Math.round(posicion * 100)}%
        </div>

        <div>
            Valencia:
            ${datos.valencia}
        </div>

        <div>
            Intensidad:
            ${datos.intensidad}
        </div>

        <div>
            Activación:
            ${datos.activacion}
        </div>
    `;
}


// ============================================================
// ESPERAR
// ============================================================

function esperar(ms)
{
    return new Promise(
        resolve => {

            setTimeout(
                resolve,
                ms
            );

        }
    );
}


// ============================================================
// REPRODUCCIÓN
// ============================================================

async function reproducir()
{

    let palabrasReproducidas = 0;


    // ========================================================
    // RECORRER PÁRRAFOS
    // ========================================================

    for (
        let indiceParrafo = 0;
        indiceParrafo < parrafos.length;
        indiceParrafo++
    ) {

        const elementos =
            elementosParrafos[
                indiceParrafo
            ];


        const totalPalabras =
            elementos.palabras.length;


        // ====================================================
        // RECORRER PALABRAS
        // ====================================================

        for (
            let i = 0;
            i < totalPalabras;
            i++
        ) {

            const palabra =
                elementos.palabras[i];


            // ------------------------------------------------
            // QUITAR PALABRA ACTUAL ANTERIOR
            // ------------------------------------------------

            const anterior =
                document.querySelector(
                    ".palabra.actual"
                );

            if (anterior) {

                anterior.classList.remove(
                    "actual"
                );

            }


            // ------------------------------------------------
            // MARCAR PALABRA
            // ------------------------------------------------

            palabra.classList.add(
                "actual"
            );

            palabra.classList.add(
                "leida"
            );


            // ------------------------------------------------
            // ACTUALIZAR AVATAR
            // ------------------------------------------------

            actualizarAvatar(
                indiceParrafo,
                i,
                totalPalabras
            );


            // ------------------------------------------------
            // PROGRESO GLOBAL
            // ------------------------------------------------

            palabrasReproducidas++;


            const porcentaje =
                (
                    palabrasReproducidas /
                    totalPalabrasDocumento
                ) * 100;


            progreso.style.width =
                porcentaje + "%";


            // ------------------------------------------------
            // SCROLL
            // ------------------------------------------------

            palabra.scrollIntoView({

                behavior:
                    "smooth",

                block:
                    "center",

                inline:
                    "nearest"

            });


            // ------------------------------------------------
            // ESPERA
            // ------------------------------------------------

            await esperar(
                velocidad
            );

        }


        // ====================================================
        // FIN DEL PÁRRAFO
        // ====================================================

        const actual =
            document.querySelector(
                ".palabra.actual"
            );

        if (actual) {

            actual.classList.remove(
                "actual"
            );

        }


        await esperar(
            pausaEntreParrafos
        );

    }


    // ========================================================
    // FINAL
    // ========================================================

    avatarA.src =
        imagenEmocion(
            "neutral"
        );

    avatarA.style.opacity =
        1;

    avatarB.style.opacity =
        0;


    progreso.style.width =
        "100%";


    estado.innerHTML = `

        <div class="emocion">
            NEUTRAL
        </div>

        <div>
            Reproducción finalizada
        </div>

    `;

}


// ============================================================
// INICIAR
// ============================================================

reproducir();

</script>

</body>

</html>
