<?php

    $archivo = fopen("saludo.txt", 'r');
    $lineas = fread($archivo, filesize("saludo.txt"));
    echo $lineas;
    fclose($archivo);
   
?>
