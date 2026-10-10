# Estado del arte en avatares para inteligencia artificial

Apuntes de la clase del 21/09/2026. El objetivo es comparar tecnologías de avatares y entender qué aporta cada una a un juego o aplicación interactiva.

## 1. ¿Qué necesita un avatar conversacional?

Un avatar es más que un modelo que habla. Para mantener una conversación puede combinar:

```text
Persona → cámara y micrófono → percepción → IA → voz y comportamiento
   ↑                                              ↓
   └──────── pantalla y altavoz ← animación y renderizado
```

- **Cara y boca:** sincronización labial y expresiones. Los apuntes las presentan como problemas bastante resueltos.
- **Conducta:** mirada, gestos, postura y movimientos relacionados con la intención y el contenido del discurso. Sigue siendo el reto principal señalado en clase.
- **Observación:** cámara, micrófono y otros datos de la interacción permiten reaccionar al usuario. Las interfaces naturales se estudiarán en otra unidad.

Por ejemplo, un gesto de enumerar debería acompañar a «hay tres posibilidades», no aparecer en un momento aleatorio. La prosodia puede influir en cejas, cabeza y expresión; el significado de las palabras puede influir en los gestos.

## 2. Enfoques existentes

| Enfoque | Representación y salida | Ventajas | Limitaciones |
| --- | --- | --- | --- |
| Avatar 3D clásico | Malla, materiales, esqueleto y *blendshapes*; renderizado en el dispositivo | Control directo de la animación y de la escena | El realismo visual depende del modelo y del trabajo artístico |
| Avatar 3D estilizado | La misma base 3D, con estética *cartoon*, anime u otra | Permite priorizar expresividad sin buscar fotorealismo | La conducta sigue necesitando diseño y coordinación |
| Avatar neural o vídeo generado | Modelo aprendido que produce o transmite la imagen animada | Puede ofrecer gran realismo visual | Suele requerir más cómputo e infraestructura; ofrece menos control directo sobre la geometría |

Los apuntes mencionan avatares estilizados «no necesariamente fotorrealistas» y también avatares neurales. Son **enfoques distintos**: «3D clásico» no significa «neural» por definición.

## 3. Tecnologías de referencia

| Tecnología | Qué aporta | Situación para un proyecto de clase |
| --- | --- | --- |
| [NVIDIA Audio2Face](https://docs.nvidia.com/nim/digital-human/a2f-3d/latest/) | Convierte audio y señales emocionales en animación facial mediante *blendshapes*. Forma parte del conjunto [NVIDIA ACE](https://docs.nvidia.com/ace/overview/2025.04.28/). | Referencia para estudiar la relación entre voz y expresión facial. |
| [Tavus](https://www.tavus.io/product/conversational-video) | Combina vídeo, voz y percepción para conversaciones en tiempo real. Distingue renderizado facial (Phoenix), percepción (Raven) y dinámica de conversación (Sparrow). | Ejemplo de servicio audiovisual completo. Su cifra de unos 500 ms de latencia es una afirmación del proveedor, no una medida realizada en clase. |
| [HeyGen LiveAvatar](https://help.heygen.com/en/articles/12758516-introducing-liveavatar) | Ofrece conversación bidireccional con vídeo de avatar, voz, expresiones y API/SDK. | Ejemplo de integración mediante un servicio de vídeo en lugar de animar directamente un GLB propio. |
| [Meta Codec Avatars](https://www.meta.com/emerging-tech/codec-avatars/) | Investiga la telepresencia fotorrealista mediante representaciones aprendidas. [Ava-256](https://www.meta.com/emerging-tech/codec-avatars/ava256/) aporta datos, modelos y código para investigación. | Referencia de investigación, no una solución sencilla para incorporar directamente a un juego. Meta comparte recursos concretos; eso no implica que toda su tecnología sea de código abierto. |

## 4. Sincronizar voz, emoción y movimiento

Un avatar convincente coordina varias señales a la vez:

```text
audio y fonemas  → boca
prosodia         → cejas, cabeza y expresión
significado      → gestos
turno de palabra → mirada y postura
usuario          → reacción e interrupciones
```

Una arquitectura posible para experimentar con un personaje 3D propio sería:

```text
Micrófono → reconocimiento de voz → IA → texto → síntesis de voz → audio
                                     ↓                         ↓
                            intención y emoción          animación facial
                                     ↓                         ↓
                             plan de conducta → mirada, gestos y postura
                                             ↓
                                      avatar 3D → pantalla
```

El **plan de conducta** expresa acciones de alto nivel, como «mirar al usuario» o «asentir». Después, los controladores del avatar las convierten en movimientos del esqueleto y de la cara. Es una propuesta de diseño de los apuntes, no una función que ya tenga implementada el proyecto.

## 5. Aplicación al análisis de juegos

Al estudiar un juego existente, conviene observar:

1. Qué representación usa para sus personajes: 3D clásico, estilizado, vídeo o técnicas neurales.
2. Si boca, voz, emociones, mirada y gestos están sincronizados.
3. Si el personaje reacciona a lo que hace o dice el jugador.
4. Qué tecnologías se pueden controlar localmente y cuáles dependen de un servicio externo.

Como posibles líneas de proyecto, el profesor menciona configuradores de muebles 3D, interiores 3D y videojuegos. Recomienda valorar su utilidad práctica antes de elegir una especialización.

## Idea principal

El realismo visual no basta por sí solo. La presencia del avatar depende también de que perciba al usuario, responda a tiempo y coordine voz, expresión y movimiento con lo que está diciendo.
