<?php

header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["error" => "Método no permitido"]);
    exit;
}

$entrada = json_decode(file_get_contents("php://input"), true);
$mensaje = trim($entrada["mensaje"] ?? "");

if ($mensaje === "") {
    http_response_code(400);
    echo json_encode(["error" => "Falta el mensaje"]);
    exit;
}

$mensajes = [[
    "role" => "system",
    "content" => "Eres un asistente útil. Responde en español de forma clara y breve."
]];

foreach (array_slice($entrada["historial"] ?? [], -10) as $turno) {
    if (is_array($turno)
        && in_array($turno["role"] ?? "", ["user", "assistant"], true)
        && is_string($turno["content"] ?? null)) {
        $mensajes[] = [
            "role" => $turno["role"],
            "content" => $turno["content"]
        ];
    }
}

$mensajes[] = ["role" => "user", "content" => $mensaje];

$datos = [
    "model" => "llama3.1:8b-instruct-q4_K_M",
    "messages" => $mensajes,
    "stream" => false
];

$ch = curl_init("http://localhost:11434/api/chat");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($datos));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 120);

$respuesta = curl_exec($ch);
$codigo = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($respuesta === false || $codigo !== 200) {
    http_response_code(502);
    echo json_encode(["error" => "No se pudo conectar con Ollama"]);
    exit;
}

$resultado = json_decode($respuesta, true);
$texto = trim($resultado["message"]["content"] ?? "");

if ($texto === "") {
    http_response_code(502);
    echo json_encode(["error" => "Ollama no devolvió una respuesta"]);
    exit;
}

echo json_encode(["respuesta" => $texto], JSON_UNESCAPED_UNICODE);
