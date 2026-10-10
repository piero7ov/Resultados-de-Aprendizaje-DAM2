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
var avance = 20;

var numeroobstaculos = 10;
var obstaculos = [];

var numeroenemigos = 5;
var enemigos = [];
var duracionescudo = 3000; // Duración de la habilidad en milisegundos.

var marcasviales = [];
var separacionmarcas = 100;
var numeromarcasporfila = Math.ceil(altura / separacionmarcas) + 1;
var duracionfrenado = 1000; // El escudo detiene al objeto durante un segundo.
