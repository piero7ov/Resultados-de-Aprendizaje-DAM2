// Cargamos los sprites antes de habilitar Jugar para evitar una partida sin gráficos.
function cargarImagen(ruta){
  return new Promise(function(resolver, rechazar) {
    const imagen = new Image();
    imagen.addEventListener("load", function() {
      resolver(imagen);
    }, { once: true });
    imagen.addEventListener("error", function() {
      rechazar(new Error("No se pudo cargar " + ruta));
    }, { once: true });
    imagen.src = ruta;
  });
}

const imagenes = {};
let recursoslistos = false;
const cargaRecursos = Promise.all([
  cargarImagen("recursos/barco.png"),
  cargarImagen("recursos/isla.png"),
  cargarImagen("recursos/puerto.png"),
  cargarImagen("recursos/menu.png")
]).then(function(recursos) {
  imagenes.barco = recursos[0];
  imagenes.isla = recursos[1];
  imagenes.puerto = recursos[2];
  recursoslistos = true;
});
