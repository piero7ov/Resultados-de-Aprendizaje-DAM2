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

    $result = json_decode(
        $response,
        true
    );

    if (!isset($result['response'])) {

        die(
            '<h2>Respuesta inesperada de Ollama</h2>' .
            '<pre>' .
            htmlspecialchars($response) .
            '</pre>'
        );
    }

    return trim(
        $result['response']
    );
}


// ============================================================
// 1. GENERAR HISTORIA
// ============================================================

$promptGeneracion = <<<PROMPT

Escribe una pequeña historia narrativa en español compuesta por exactamente
6 párrafos.

La historia debe tener continuidad narrativa. No quiero seis textos
independientes: debe ser una única historia que avance de un párrafo
al siguiente.

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
- Debe existir continuidad narrativa entre todos los párrafos.
- El personaje contará esta historia en primera persona.
- Utiliza un lenguaje natural, como si el personaje estuviera hablando.
- Los párrafos deben ser relativamente breves.

Devuelve únicamente la historia.

PROMPT;


$texto = ollama(
    $promptGeneracion
);


// ============================================================
// 2. SEPARAR PÁRRAFOS
// ============================================================

$parrafos = preg_split(
    '/\R\s*\R/',
    trim($texto)
);


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


$respuestaAnalisis = ollama(
    $promptAnalisis
);


// ============================================================
// 4. LIMPIAR POSIBLES BLOQUES MARKDOWN
// ============================================================

$respuestaAnalisis = trim(
    $respuestaAnalisis
);


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
// 7. CONSTRUIR DATOS
// ============================================================

$datos = [];


foreach ($parrafos as $indice => $parrafo) {

    $info = $analisis[$indice] ?? [];


    $emocion = strtolower(
        trim(
            $info['emocion'] ?? 'neutral'
        )
    );


    if (!in_array(
        $emocion,
        $emocionesValidas,
        true
    )) {

        $emocion = 'neutral';
    }


    $datos[] = [

        'texto' => trim(
            $parrafo
        ),

        'emocion' => $emocion,

        'valencia' => isset(
            $info['valencia']
        )
            ? (float)$info['valencia']
            : 0,

        'intensidad' => isset(
            $info['intensidad']
        )
            ? (float)$info['intensidad']
            : 0,

        'activacion' => isset(
            $info['activacion']
        )
            ? (float)$info['activacion']
            : 0
    ];
}


// ============================================================
// JSON SEGURO PARA JAVASCRIPT
// ============================================================

$jsonDatos = json_encode(
    $datos,
    JSON_UNESCAPED_UNICODE |
    JSON_UNESCAPED_SLASHES |
    JSON_HEX_TAG |
    JSON_HEX_AMP |
    JSON_HEX_APOS |
    JSON_HEX_QUOT
);

?>
<!DOCTYPE html>
<html lang="es">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>Avatar narrador emocional</title>


<style>

/* ============================================================
   GENERAL
   ============================================================ */

* {
    box-sizing: border-box;
}


html,
body {
    width: 100%;
    height: 100%;
}


body {
    margin: 0;

    overflow: hidden;

    font-family:
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

    background:
        radial-gradient(
            circle at 50% 30%,
            #ffffff 0%,
            #f5f5f5 60%,
            #e5e5e5 100%
        );

    color: #222;
}


/* ============================================================
   ESCENA
   ============================================================ */

#escena {
    position: relative;

    width: 100%;
    height: 100vh;
}


/* ============================================================
   PROGRESO
   ============================================================ */

#barra {
    position: fixed;

    left: 0;
    top: 0;

    width: 100%;
    height: 5px;

    background:
        rgba(0, 0, 0, 0.08);

    z-index: 2000;
}


#progreso {
    width: 0%;
    height: 100%;

    background: #222;

    transition:
        width 0.08s linear;
}


/* ============================================================
   AVATAR
   ============================================================ */

#avatar {
    position: absolute;

    right: 7vw;
    bottom: 0;

    width: 258px;
    height: 282px;

    z-index: 10;

    pointer-events: none;
}


.capa-avatar {
    position: absolute;

    top: 0;
    left: 0;

    width: 100%;
    height: 100%;

    object-fit: contain;

    transition: none;
}


#avatarA {
    opacity: 1;
}


#avatarB {
    opacity: 0;
}


/* ============================================================
   BOCADILLO
   ============================================================ */

#bocadillo {
    position: absolute;

    right: calc(7vw + 220px);
    bottom: 310px;

    width: min(650px, 58vw);

    min-height: 170px;

    padding:
        30px
        34px;

    background: white;

    border:
        3px solid
        #222;

    border-radius: 26px;

    box-shadow:
        0
        15px
        40px
        rgba(0, 0, 0, 0.13);

    font-size: 22px;
    line-height: 1.55;

    z-index: 20;
}


/* ============================================================
   PUNTA DEL BOCADILLO
   ============================================================ */

#bocadillo::before {
    content: "";

    position: absolute;

    right: -33px;
    bottom: 38px;

    width: 0;
    height: 0;

    border-top:
        21px solid
        transparent;

    border-bottom:
        21px solid
        transparent;

    border-left:
        34px solid
        #222;
}


#bocadillo::after {
    content: "";

    position: absolute;

    right: -27px;
    bottom: 41px;

    width: 0;
    height: 0;

    border-top:
        18px solid
        transparent;

    border-bottom:
        18px solid
        transparent;

    border-left:
        29px solid
        white;
}


/* ============================================================
   TEXTO
   ============================================================ */

#textoBocadillo {
    min-height: 100px;
}


.palabra {
    opacity: 0;

    transition:
        opacity 0.06s ease;
}


.palabra.visible {
    opacity: 1;
}


/* ============================================================
   CURSOR
   ============================================================ */

#cursor {
    display: inline-block;

    width: 3px;
    height: 1em;

    margin-left: 4px;

    vertical-align: -2px;

    background: #222;

    animation:
        parpadeo
        0.65s
        infinite;
}


@keyframes parpadeo {

    0%,
    45% {
        opacity: 1;
    }

    46%,
    100% {
        opacity: 0;
    }
}


/* ============================================================
   PANEL DEBUG
   ============================================================ */

#estado {
    position: fixed;

    top: 25px;
    right: 25px;

    min-width: 190px;

    padding:
        12px
        16px;

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
   CONTADOR
   ============================================================ */

#contador {
    position: absolute;

    left: 30px;
    bottom: 25px;

    color:
        rgba(0, 0, 0, 0.45);

    font-size: 13px;
}


/* ============================================================
   RESPONSIVE
   ============================================================ */

@media (max-width: 800px) {

    #avatar {
        width: 170px;
        height: 186px;

        right: 10px;
    }


    #bocadillo {
        left: 20px;
        right: 20px;
        bottom: 355px;

        width: auto;

        min-height: 140px;

        padding: 22px;

        font-size: 18px;
    }


    #bocadillo::before,
    #bocadillo::after {
        display: none;
    }


    #estado {
        display: none;
    }
}

</style>

</head>


<body>


<!-- ==========================================================
     PROGRESO
     ========================================================== -->

<div id="barra">

    <div id="progreso"></div>

</div>


<!-- ==========================================================
     ESCENA
     ========================================================== -->

<div id="escena">


    <!-- ======================================================
         BOCADILLO
         ====================================================== -->

    <div id="bocadillo">

        <span id="textoBocadillo"></span>

        <span id="cursor"></span>

    </div>


    <!-- ======================================================
         AVATAR
         ====================================================== -->

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


    <!-- ======================================================
         CONTADOR
         ====================================================== -->

    <div id="contador">

        Preparando historia...

    </div>

</div>


<!-- ==========================================================
     DEBUG EMOCIONAL
     ========================================================== -->

<div id="estado">

    <div class="emocion">
        NEUTRAL
    </div>

    <div>
        Preparando...
    </div>

</div>


<script>

// ============================================================
// HISTORIA EN MEMORIA
//
// PHP ya ha generado:
// - historia
// - párrafos
// - emoción
// - valencia
// - intensidad
// - activación
//
// Aquí únicamente transferimos el array PHP a JavaScript.
// ============================================================

const parrafos = <?php echo $jsonDatos; ?>;


// ============================================================
// CONFIGURACIÓN
// ============================================================

// Milisegundos entre palabras.
//
// Original:
// 230 ms
//
// Nueva velocidad:
// 60 ms
//
// Aproximadamente 3,8 veces más rápido.
// ============================================================

const velocidad = 60;


// Tiempo que permanece visible un párrafo
// una vez terminado.

const pausaEntreParrafos = 900;


// ============================================================
// EMOCIONES
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

const textoBocadillo =
    document.querySelector(
        "#textoBocadillo"
    );


const cursor =
    document.querySelector(
        "#cursor"
    );


const avatarA =
    document.querySelector(
        "#avatarA"
    );


const avatarB =
    document.querySelector(
        "#avatarB"
    );


const estado =
    document.querySelector(
        "#estado"
    );


const progreso =
    document.querySelector(
        "#progreso"
    );


const contador =
    document.querySelector(
        "#contador"
    );


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


    if (
        !emocionesValidas.includes(
            emocion
        )
    ) {

        return "neutral";
    }


    return emocion;
}


// ============================================================
// IMAGEN DE EMOCIÓN
// ============================================================

function imagenEmocion(emocion)
{
    emocion =
        normalizarEmocion(
            emocion
        );


    return (
        "expresiones/" +
        emocion +
        ".png"
    );
}


// ============================================================
// PRECARGAR TODAS LAS EXPRESIONES
// ============================================================

const imagenesPrecargadas = {};


emocionesValidas.forEach(
    emocion => {

        const imagen =
            new Image();


        imagen.src =
            imagenEmocion(
                emocion
            );


        imagenesPrecargadas[emocion] =
            imagen;
    }
);


// ============================================================
// CONTAR PALABRAS
//
// Toda la historia está en memoria.
//
// No generamos todos los párrafos en el DOM.
// ============================================================

let totalPalabrasHistoria = 0;


parrafos.forEach(
    parrafo => {

        const palabras =
            parrafo.texto
                .trim()
                .split(/\s+/);


        totalPalabrasHistoria +=
            palabras.length;
    }
);


// ============================================================
// CROSSFADING DE DOS EXPRESIONES
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


    factor =
        Math.max(
            0,
            Math.min(
                1,
                factor
            )
        );


    // ========================================================
    // MISMA EMOCIÓN
    // ========================================================

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


    // ========================================================
    // DOS EMOCIONES
    // ========================================================

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
// El centro de cada párrafo es el punto de máxima expresión.
//
//
//
//       PÁRRAFO A                 PÁRRAFO B
//
//  0% ----- 50% ----- 100% | 0% ----- 50% ----- 100%
//
//            ↑                            ↑
//
//        emoción A                    emoción B
//          100%                         100%
//
//
//
// Entre ambos centros hacemos crossfade.
// ============================================================

function actualizarAvatar(
    indiceParrafo,
    indicePalabra,
    totalPalabras
)
{

    // ========================================================
    // POSICIÓN EN EL PÁRRAFO
    // ========================================================

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
    // PRIMERA MITAD
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

            emocionAnterior =
                "neutral";
        }


        // En el inicio del párrafo estamos ya
        // a mitad de camino desde el centro
        // del párrafo anterior.

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
    // SEGUNDA MITAD
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

            emocionSiguiente =
                "neutral";
        }


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
    // INFORMACIÓN
    // ========================================================

    const datos =
        parrafos[
            indiceParrafo
        ];


    estado.innerHTML = `

        <div class="emocion">

            ${normalizarEmocion(
                datos.emocion
            ).toUpperCase()}

        </div>

        <div>

            Párrafo:
            ${indiceParrafo + 1}
            /
            ${parrafos.length}

        </div>

        <div>

            Posición:
            ${Math.round(
                posicion * 100
            )}%

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
// ESCRIBIR UNA PALABRA
// ============================================================

function escribirPalabra(
    palabra,
    primeraPalabra
)
{

    // Añadimos espacio antes de la palabra,
    // excepto si es la primera.

    if (!primeraPalabra) {

        textoBocadillo.appendChild(
            document.createTextNode(
                " "
            )
        );
    }


    const span =
        document.createElement(
            "span"
        );


    span.className =
        "palabra";


    span.textContent =
        palabra;


    textoBocadillo.appendChild(
        span
    );


    // Forzar un reflow para permitir
    // la pequeña aparición progresiva.

    void span.offsetWidth;


    span.classList.add(
        "visible"
    );
}


// ============================================================
// REPRODUCIR HISTORIA
// ============================================================

async function reproducir()
{

    // Seguridad.

    if (
        !Array.isArray(parrafos) ||
        parrafos.length === 0
    ) {

        textoBocadillo.textContent =
            "No se ha podido generar la historia.";


        cursor.style.display =
            "none";


        return;
    }


    let palabrasReproducidas = 0;


    // ========================================================
    // RECORRER PÁRRAFOS
    // ========================================================

    for (
        let indiceParrafo = 0;
        indiceParrafo < parrafos.length;
        indiceParrafo++
    ) {

        const parrafo =
            parrafos[
                indiceParrafo
            ];


        // ====================================================
        // BORRAR BOCADILLO ANTERIOR
        //
        // Ésta es la diferencia importante.
        //
        // El resto de la historia sigue existiendo
        // únicamente dentro de "parrafos".
        // ====================================================

        textoBocadillo.replaceChildren();


        // ====================================================
        // PREPARAR PALABRAS DEL PÁRRAFO ACTUAL
        // ====================================================

        const palabras =
            parrafo.texto
                .trim()
                .split(/\s+/);


        const totalPalabras =
            palabras.length;


        contador.textContent =
            "Párrafo " +
            (indiceParrafo + 1) +
            " de " +
            parrafos.length;


        // ====================================================
        // WRITE-ON
        // ====================================================

        for (
            let indicePalabra = 0;
            indicePalabra < totalPalabras;
            indicePalabra++
        ) {

            const palabra =
                palabras[
                    indicePalabra
                ];


            // ------------------------------------------------
            // MOSTRAR PALABRA
            // ------------------------------------------------

            escribirPalabra(
                palabra,
                indicePalabra === 0
            );


            // ------------------------------------------------
            // ACTUALIZAR EXPRESIÓN
            // ------------------------------------------------

            actualizarAvatar(
                indiceParrafo,
                indicePalabra,
                totalPalabras
            );


            // ------------------------------------------------
            // PROGRESO GLOBAL
            // ------------------------------------------------

            palabrasReproducidas++;


            const porcentaje =
                (
                    palabrasReproducidas /
                    totalPalabrasHistoria
                ) * 100;


            progreso.style.width =
                porcentaje + "%";


            // ------------------------------------------------
            // WRITE-ON
            // ------------------------------------------------

            await esperar(
                velocidad
            );
        }


        // ====================================================
        // PÁRRAFO TERMINADO
        // ====================================================

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


    cursor.style.display =
        "none";


    contador.textContent =
        "Historia finalizada";


    estado.innerHTML = `

        <div class="emocion">
            NEUTRAL
        </div>

        <div>
            Historia finalizada
        </div>

    `;
}


// ============================================================
// ARRANCAR
// ============================================================

reproducir();

</script>

</body>

</html>
