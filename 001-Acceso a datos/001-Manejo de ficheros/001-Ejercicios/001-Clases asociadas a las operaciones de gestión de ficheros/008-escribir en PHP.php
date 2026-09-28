<?php
$archivo = fopen("saludo.txt", "w");
fwrite($archivo, "Hola soy Piero Olivares desde PHP");
fclose($archivo);
?>
