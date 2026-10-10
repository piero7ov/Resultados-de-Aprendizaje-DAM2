import test from "node:test";
import assert from "node:assert/strict";
import { Recorrido, crearPasos } from "../js/recorrido.js";

test("la pausa conserva el punto y continuar completa el mismo paquete", () => {
  const recorrido = new Recorrido();
  recorrido.iniciar();
  recorrido.actualizar(3);
  recorrido.pausar();
  const pausa = recorrido.obtenerEstado();
  recorrido.actualizar(100);
  assert.deepEqual(recorrido.obtenerEstado(), pausa);
  recorrido.iniciar();
  recorrido.actualizar(2);
  assert.equal(recorrido.obtenerEstado().paso.id, "calidad");
  assert.equal(recorrido.numero, 1);
});

test("cada tercer producto se descarta y nunca pasa por embalaje ni expedición", () => {
  for (let numero = 1; numero <= 6; numero++) {
    const ids = crearPasos(numero).map(paso => paso.id);
    assert.equal(ids.includes("descarte"), numero % 3 === 0);
    assert.equal(ids.includes("embalaje"), numero % 3 !== 0);
    assert.equal(ids.includes("expedicion"), numero % 3 !== 0);
  }
});

test("el lote termina con cuatro preparados y dos descartados, sin doble conteo", () => {
  const recorrido = new Recorrido();
  recorrido.iniciar();
  recorrido.actualizar(1000);
  const final = recorrido.obtenerEstado();
  assert.equal(final.estado, "completado");
  assert.equal(final.entregados, 4);
  assert.equal(final.descartados, 2);
  recorrido.iniciar();
  recorrido.actualizar(1000);
  assert.deepEqual(recorrido.obtenerEstado(), final);
});

test("el resultado no depende de la frecuencia de actualización", () => {
  const lento = new Recorrido();
  const rapido = new Recorrido();
  lento.iniciar();
  rapido.iniciar();
  lento.actualizar(55.125);
  for (let i = 0; i < 441; i++) rapido.actualizar(.125);
  assert.deepEqual(lento.obtenerEstado(), rapido.obtenerEstado());
});

test("reiniciar elimina contadores y vuelve a recepción sin arrancar", () => {
  const recorrido = new Recorrido();
  recorrido.iniciar();
  recorrido.actualizar(55);
  recorrido.reiniciar();
  assert.deepEqual(recorrido.obtenerEstado(), new Recorrido().obtenerEstado());
});
