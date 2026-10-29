<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/conectores/php/004-conector_php.php';

header('Content-Type: text/plain; charset=utf-8');
$raiz = dirname(__DIR__, 2);
$configuracionTemporal = tempnam(sys_get_temp_dir(), 'unicorn_ra2_');
if ($configuracionTemporal === false) {
    throw new RuntimeException('No se pudo preparar una configuracion temporal.');
}

try {
    $configuracion = [
        'instalacion' => str_replace('\\', '/', $raiz . '/datos'),
        'tamanoRegistro' => 512,
    ];
    if (file_put_contents($configuracionTemporal, json_encode($configuracion, JSON_THROW_ON_ERROR)) === false) {
        throw new RuntimeException('No se pudo escribir la configuracion temporal.');
    }

    $motor = new UnicornBBDD($configuracionTemporal);
    if (!$motor->usarBase('Erin-erp')) {
        throw new RuntimeException('No se pudo abrir Erin-erp.');
    }
    echo "Gestor embebido UnicornBBDD:\n";
    print_r($motor->consultar('SELECCIONAR CONTAR(*) COMO total_clientes DE clientes'));
    $motor = null;

    if (!extension_loaded('mysqli')) {
        throw new RuntimeException('Activa la extension mysqli de PHP para consultar MariaDB.');
    }
    $servidor = getenv('UNICORN_RA2_DB_HOST') ?: '127.0.0.1';
    $puerto = (int)(getenv('UNICORN_RA2_DB_PORT') ?: '3306');
    $usuario = getenv('UNICORN_RA2_DB_USER') ?: 'root';
    $clave = getenv('UNICORN_RA2_DB_PASSWORD');
    $clave = $clave === false ? '' : $clave;

    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    try {
        $conexion = new mysqli($servidor, $usuario, $clave, null, $puerto);
    } catch (mysqli_sql_exception $error) {
        throw new RuntimeException(
            'No se pudo conectar con MariaDB. Inicia MySQL en XAMPP y revisa usuario, puerto y clave.',
            0,
            $error
        );
    }
    try {
        $conexion->set_charset('utf8mb4');
        $resultado = $conexion->query(
            "SELECT ENGINE AS motor, SUPPORT AS disponible FROM information_schema.ENGINES " .
            "WHERE ENGINE IN ('InnoDB','MyISAM') ORDER BY ENGINE"
        );
        try {
            echo "Gestor independiente MariaDB de XAMPP:\n";
            print_r($resultado->fetch_all(MYSQLI_ASSOC));
        } finally {
            $resultado->free();
        }
    } finally {
        $conexion->close();
    }
} finally {
    if (isset($motor)) $motor = null;
    unlink($configuracionTemporal);
}
