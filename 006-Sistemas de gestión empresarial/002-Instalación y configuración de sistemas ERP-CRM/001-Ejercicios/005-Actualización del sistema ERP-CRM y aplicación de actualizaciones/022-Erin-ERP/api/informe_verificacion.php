<?php
require_once __DIR__ . '/comprobar_entorno.php';

$resultado = comprobarEntorno();
$nombreArchivo = 'informe_verificacion_' . date('Y-m-d_H-i-s') . '.md';

header('Content-Type: text/markdown; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $nombreArchivo . '"');

echo "# Informe de verificación de ERIN ERP\n\n";
echo "Fecha: " . $resultado['fecha'] . "\n\n";
echo "Versión: " . $resultado['version'] . "\n\n";
echo "Estado general: " . $resultado['estado'] . "\n\n";
echo "## Comprobaciones\n\n";
echo "| Elemento | Resultado | Estado |\n";
echo "|---|---|---|\n";

$incidencias = [];
foreach ($resultado['comprobaciones'] as $comprobacion) {
    $estado = $comprobacion['correcto'] ? 'Correcto' : 'Pendiente';
    echo '| ' . $comprobacion['nombre'] . ' | ' . $comprobacion['valor'] . ' | ' . $estado . " |\n";

    if (!$comprobacion['correcto']) {
        $incidencias[] = $comprobacion;
    }
}

echo "\n## Incidencias detectadas\n\n";
if (count($incidencias) === 0) {
    echo "No se han detectado incidencias en la configuración comprobada.\n";
} else {
    foreach ($incidencias as $incidencia) {
        echo '- ' . $incidencia['nombre'] . ': ' . $incidencia['detalle'] . "\n";
    }
}

echo "\n## Alcance\n\n";
echo "La verificación confirma la compatibilidad del entorno. No crea conexiones ni bases de datos.\n";
