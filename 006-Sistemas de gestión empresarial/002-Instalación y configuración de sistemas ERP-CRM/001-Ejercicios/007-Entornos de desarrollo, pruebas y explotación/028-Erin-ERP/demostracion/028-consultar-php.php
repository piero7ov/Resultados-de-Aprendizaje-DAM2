<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/nucleo/datos/ErinDatos.php';

$baseIndicada = PHP_SAPI === 'cli' ? ($argv[1] ?? '') : '';
$datos = $baseIndicada !== '' ? new ErinDatos($baseIndicada) : new ErinDatos();
if(!$datos->instalado()){
    fwrite(STDERR, "ERIN ERP 028 todavía no está instalado.\n");
    exit(1);
}

function mostrarRegistros(string $titulo, array $filas, array $columnas): void
{
    echo "\n$titulo\n" . str_repeat('=', strlen($titulo)) . "\n";
    echo implode(' | ', $columnas) . "\n";
    foreach($filas as $fila){
        $valores = array_map(fn($columna)=>(string)($fila[$columna] ?? 'NULL'), $columnas);
        echo implode(' | ', $valores) . "\n";
    }
    echo count($filas) . " fila(s)\n";
}

echo "ERIN ERP 028 mediante la capa PHP ErinDatos\n";
echo "Base física activa: " . $datos->baseActual() . "\n";
mostrarRegistros('Empresa', $datos->listar('empresas'), ['Identificador','nombre','cif','email']);
mostrarRegistros('Primeros clientes', array_slice($datos->listar('clientes'), 0, 5), ['Identificador','nombre','email','telefono']);
mostrarRegistros('Primeros productos', array_slice($datos->listar('productos'), 0, 5), ['Identificador','codigo','nombre','precio','stock']);
mostrarRegistros('Pedidos', $datos->listar('pedidos'), ['Identificador','cliente_id','fecha','estado','total']);
