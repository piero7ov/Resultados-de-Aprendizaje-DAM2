<?php
function comprobarEntorno(): array
{
    $servidor = $_SERVER['SERVER_SOFTWARE'] ?? 'Servidor no identificado';
    $tieneSqlite = extension_loaded('pdo_sqlite') || extension_loaded('sqlite3');
    $tieneMysql = extension_loaded('pdo_mysql') || extension_loaded('mysqli');

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
            'nombre' => 'PDO',
            'valor' => extension_loaded('pdo') ? 'Disponible' : 'No disponible',
            'correcto' => extension_loaded('pdo'),
            'detalle' => 'Capa común prevista para las conexiones de datos.'
        ],
        [
            'nombre' => 'Compatibilidad con SQLite',
            'valor' => $tieneSqlite ? 'Disponible' : 'No disponible',
            'correcto' => $tieneSqlite,
            'detalle' => 'Se comprueba el controlador, pero todavía no se crea ninguna base de datos.'
        ],
        [
            'nombre' => 'Compatibilidad con MySQL',
            'valor' => $tieneMysql ? 'Disponible' : 'No disponible',
            'correcto' => $tieneMysql,
            'detalle' => 'Se comprueba el controlador previsto para una fase posterior.'
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
        'version' => '0.4',
        'fecha' => date('Y-m-d H:i:s'),
        'estado' => $entornoCorrecto ? 'Entorno compatible' : 'Entorno con elementos pendientes',
        'correcto' => $entornoCorrecto,
        'comprobaciones' => $comprobaciones
    ];
}
