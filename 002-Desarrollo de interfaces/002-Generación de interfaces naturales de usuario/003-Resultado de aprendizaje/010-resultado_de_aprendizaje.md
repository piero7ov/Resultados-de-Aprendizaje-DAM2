# Resultado de aprendizaje 2 — ERIN IU

He ampliado ERIN IU para poder utilizarla mediante texto, voz y movimientos de la mano. La interfaz gráfica sigue funcionando con sus controles habituales; la interacción natural ofrece otra forma de comunicarse con el asistente y de manejarlo cuando se activa la cámara.

## a) Herramientas relacionadas con el aprendizaje automático

He identificado Ollama para generar respuestas a partir de las peticiones del usuario y MediaPipe Hand Landmarker para localizar la mano y sus dedos en la imagen de la cámara. Ollama se ejecuta de forma local y la aplicación se comunica con él mediante un archivo PHP. MediaPipe utiliza un modelo ya preparado, por lo que no he tenido que entrenar uno propio.

Para la voz he utilizado el reconocimiento y la síntesis que ofrece el navegador. El reconocimiento convierte lo que digo en texto y la síntesis permite escuchar las respuestas.

## b) Creación de una interfaz natural

He incorporado un asistente flotante desde el que se pueden escribir o dictar peticiones. La respuesta de Ollama aparece en el espacio principal de ERIN, con el estilo de la aplicación. Si contiene una tabla, se presenta con un formato acorde con el resto de la interfaz. El asistente también se puede mover y minimizar.

En la última versión añadí un modo manos libres. Al abrirlo, aparece la cámara junto con una pequeña guía de gestos.

## c) Reconocimiento de voz para realizar acciones

He utilizado el reconocimiento de voz para ejecutar órdenes sencillas, como «volver al catálogo» o «salir». Esta última lleva a la pantalla de login de la demostración; no cierra una sesión real. Cuando la frase no coincide con una de esas órdenes, se envía como petición al asistente.

Las respuestas se pueden leer en voz alta con `speechSynthesis`. En el modo manos libres, un gesto inicia la escucha, otro permite cancelarla y otro activa o desactiva la lectura de respuestas. Al entrar en este modo, la lectura se activa y, al salir, se recupera la preferencia anterior.

## d) Detección del movimiento del cuerpo

La cámara sigue el movimiento de la mano entre fotogramas. Una pinza permite minimizar el asistente y, si se mantiene mientras se mueve la mano, desplazar el icono minimizado por la pantalla. Una pinza sin desplazamiento seguida de la apertura de los dedos lo restaura.

He limitado estas acciones para evitar que un movimiento breve o la misma pose mantenida las repita continuamente.

## e) Detección de partes del cuerpo

MediaPipe proporciona puntos de referencia de la mano. A partir de ellos distingo la distancia entre el pulgar y el índice para la pinza, el índice extendido para iniciar la escucha, dos dedos extendidos para cambiar la lectura y el puño para cancelar la escucha o detener la respuesta hablada.

La aplicación muestra qué gesto está reconociendo antes de ejecutar la acción. Esto ayuda a comprobar la detección y a entender por qué el asistente responde o no responde a un movimiento.

## f) Integración de realidad aumentada

He añadido una tarjeta sobre la imagen real de la cámara que sigue la posición detectada de la mano. La tarjeta muestra si el asistente está disponible, escuchando, preparando una respuesta o leyéndola, además de la última petición reconocida por voz.

Se trata de realidad aumentada en pantalla: información digital vinculada a una parte del cuerpo que aparece en el vídeo. También hay un minimapa que indica la posición de la mano y del asistente al mover el icono por la pantalla.