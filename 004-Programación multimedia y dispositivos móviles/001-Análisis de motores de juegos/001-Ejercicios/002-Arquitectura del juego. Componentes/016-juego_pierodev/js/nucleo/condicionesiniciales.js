// Estado y configuración compartidos por todos los subsistemas del juego.
// Aquí se centralizan las reglas que interesa ajustar sin recorrer otros archivos.
var anchura = window.innerWidth;
var altura = window.innerHeight;
var temporizador = null;
var fps = 30;

const escenario = document.querySelector("#escenario");
const contexto = escenario.getContext("2d");

escenario.width = anchura;
escenario.height = altura;

// Movimiento y estado de las teclas del jugador.
var jugador = null;
var velocidadjugador = 5; // Píxeles recorridos por cada actualización del bucle.
var teclaspulsadas = {
  arriba: false,
  abajo: false,
  izquierda: false,
  derecha: false
};

// Entidades móviles que se crearán de nuevo al iniciar cada nivel.
var numeroobstaculos = 0;
var obstaculos = [];

var numeroenemigos = 0;
var enemigos = [];
// Reglas de energía, daño y escudo expresadas en milisegundos cuando corresponde.
var duracionescudo = 3000; // Duración de la habilidad en milisegundos.
var usosescudopornivel = 1;
var energiaInicial = 100;
var daniocolision = 20;
var duracionproteccion = 1000; // Evita descontar energía varias veces por el mismo golpe.

// Cada posición del arreglo corresponde a un nivel y aumenta su dificultad.
var nivel = 1;
var totalniveles = 3;
var configuracionniveles = [
  { obstaculos: 10, velocidadobstaculos: 2, enemigos: 5, velocidadenemigos: 3 },
  { obstaculos: 12, velocidadobstaculos: 3, enemigos: 6, velocidadenemigos: 4 },
  { obstaculos: 14, velocidadobstaculos: 4, enemigos: 7, velocidadenemigos: 5 }
];

// Datos necesarios para reciclar las líneas discontinuas de la carretera.
var marcasviales = [];
var separacionmarcas = 100;
var numeromarcasporfila = Math.ceil(altura / separacionmarcas) + 1;
var duracionfrenado = 1000; // El escudo detiene al objeto durante un segundo.

// Límites horizontales: salida segura, carretera central y meta segura.
var anchurazonasegura = Math.min(120, Math.max(80, anchura * 0.15));
var iniciocarretera = anchurazonasegura;
var iniciometa = anchura - anchurazonasegura;
var salidajugador = Math.max(0, (anchurazonasegura - 80) / 2);
// Estado de la partida y referencias a los elementos de la interfaz.
var partidaTerminada = false;
var accionresultado = "reiniciar";
const iu_nivel = document.querySelector("#estado_nivel");
const iu_barra = document.querySelector("#barra_progreso");
const iu_numero_progreso = document.querySelector("#numero_progreso");
const iu_barra_escudo = document.querySelector("#barra_escudo");
const iu_numero_escudo = document.querySelector("#numero_escudo");
const iu_barra_energia = document.querySelector("#barra_energia");
const iu_numero_energia = document.querySelector("#numero_energia");
const resultado = document.querySelector("#resultado");
const titulo_resultado = document.querySelector("#titulo_resultado");
const mensaje_resultado = document.querySelector("#mensaje_resultado");
const botonreiniciar = document.querySelector("#reiniciar");
const pantalla_inicio = document.querySelector("#pantalla_inicio");
const boton_jugar = document.querySelector("#jugar");
const boton_volver_menu = document.querySelector("#volver_menu");
const musica_juego = document.querySelector("#musica_juego");
const volumen_musica = document.querySelector("#volumen_musica");
const valor_volumen = document.querySelector("#valor_volumen");
