<?php
require_once dirname(__DIR__) . '/nucleo/autenticacion.php';
function comprobarEntorno(): array
{
    $servidor = $_SERVER['SERVER_SOFTWARE'] ?? 'Servidor no identificado';
    $tieneFfi = extension_loaded('FFI');
    $biblioteca = dirname(__DIR__) . '/nucleo/datos/unicornbbdd/unicornbbdd.dll';

    $comprobaciones = [
        [
            'nombre' => 'Sistema operativo',
            'valor' => PHP_OS_FAMILY . ' (' . PHP_OS . ')',
            'correcto' => true,
            'detalle' => 'Sistema detectado por PHP.'
        ],
        [
            'nombre' => 'Servidor web',
            'valor' => $servidor,
            'correcto' => isset($_SERVER['SERVER_SOFTWARE']),
            'detalle' => 'ERIN necesita ejecutarse mediante un servidor HTTP con PHP.'
        ],
        [
            'nombre' => 'PHP',
            'valor' => PHP_VERSION,
            'correcto' => true,
            'detalle' => 'Versión de PHP utilizada por el servidor.'
        ],
        [
            'nombre' => 'JSON',
            'valor' => extension_loaded('json') ? 'Disponible' : 'No disponible',
            'correcto' => extension_loaded('json'),
            'detalle' => 'Necesario para comunicar la interfaz con la API.'
        ],
        [
            'nombre' => 'FFI',
            'valor' => $tieneFfi ? 'Disponible' : 'No disponible',
            'correcto' => $tieneFfi,
            'detalle' => 'Permite que el conector PHP se comunique con el motor nativo.'
        ],
        [
            'nombre' => 'Motor UnicornBBDD',
            'valor' => is_file($biblioteca) ? 'Disponible' : 'No disponible',
            'correcto' => is_file($biblioteca),
            'detalle' => 'Biblioteca nativa incluida con ERIN ERP.'
        ],
        [
            'nombre' => 'Capa de datos',
            'valor' => is_file(dirname(__DIR__) . '/nucleo/datos/ErinDatos.php') ? 'Disponible' : 'No disponible',
            'correcto' => is_file(dirname(__DIR__) . '/nucleo/datos/ErinDatos.php'),
            'detalle' => 'Único acceso del ERP a UnicornBBDD.'
        ]
    ];

    $entornoCorrecto = true;
    foreach ($comprobaciones as $comprobacion) {
        if (!$comprobacion['correcto']) {
            $entornoCorrecto = false;
        }
    }

    return [
        'aplicacion' => 'ERIN ERP',
        'version' => versionActualErin(),
        'fecha' => date('Y-m-d H:i:s'),
        'estado' => $entornoCorrecto ? 'Entorno compatible' : 'Entorno con elementos pendientes',
        'correcto' => $entornoCorrecto,
        'comprobaciones' => $comprobaciones
    ];
}
