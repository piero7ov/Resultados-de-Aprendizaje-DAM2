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
