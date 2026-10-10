// Condiciones iniciales
var anchura = window.innerWidth;
var altura = window.innerHeight;
var temporizador = null;
var fps = 30;

const escenario = document.querySelector("#escenario");
const contexto = escenario.getContext("2d");

escenario.width = anchura;
escenario.height = altura;

var jugador = null;
var velocidadjugador = 5; // Píxeles recorridos por cada actualización del bucle.
var teclaspulsadas = {
  arriba: false,
  abajo: false,
  izquierda: false,
  derecha: false
};

var numeroobstaculos = 10;
var obstaculos = [];

var numeroenemigos = 5;
var enemigos = [];
var duracionescudo = 3000; // Duración de la habilidad en milisegundos.
var energiaInicial = 100;
var daniocolision = 20;
var duracionproteccion = 1000; // Evita descontar energía varias veces por el mismo golpe.

var marcasviales = [];
var separacionmarcas = 100;
var numeromarcasporfila = Math.ceil(altura / separacionmarcas) + 1;
var duracionfrenado = 1000; // El escudo detiene al objeto durante un segundo.

// La partida empieza en la zona izquierda y termina en la zona derecha.
var anchurazonasegura = Math.min(120, Math.max(80, anchura * 0.15));
var iniciocarretera = anchurazonasegura;
var iniciometa = anchura - anchurazonasegura;
var salidajugador = Math.max(0, (anchurazonasegura - 80) / 2);
var partidaTerminada = false;
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
