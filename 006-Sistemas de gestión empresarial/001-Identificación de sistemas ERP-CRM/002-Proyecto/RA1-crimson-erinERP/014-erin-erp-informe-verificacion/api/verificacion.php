<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/comprobar_entorno.php';

try {
    echo json_encode(comprobarEntorno(), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'error' => 'No se ha podido verificar el entorno.'
    ], JSON_UNESCAPED_UNICODE);
}
