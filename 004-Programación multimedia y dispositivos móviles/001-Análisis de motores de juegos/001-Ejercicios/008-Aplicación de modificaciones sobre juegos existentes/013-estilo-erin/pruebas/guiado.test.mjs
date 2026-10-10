import test from "node:test";
import assert from "node:assert/strict";
import { Recorrido } from "../js/recorrido.js";

test("el modo guiado espera en cada puesto y no permite saltarlos", () => {
  const motor = new Recorrido("guiado");
  motor.actualizar(100);
  motor.iniciar();
  assert.equal(motor.estado, "listo");
  for (const accion of ["Recibir", "Inspeccionar", "Embalar", "Expedir"]) {
    assert.equal(motor.obtenerEstado().accion, accion);
    motor.avanzar();
    motor.avanzar();
    motor.actualizar(100);
    assert.equal(motor.estado, "esperando");
    const detenido = motor.obtenerEstado();
    motor.actualizar(100);
    motor.iniciar();
    assert.deepEqual(motor.obtenerEstado(), detenido);
  }
  assert.equal(motor.numero, 2);
  assert.equal(motor.entregados, 1);
});

test("la inspección fallida exige descartar y ambos modos terminan igual", () => {
  const guiado = new Recorrido("guiado");
  const acciones = [];
  while (guiado.estado !== "completado") {
    acciones.push([guiado.numero, guiado.obtenerEstado().accion]);
    guiado.avanzar();
    guiado.actualizar(100);
    assert.ok(acciones.length <= 24);
  }
  assert.deepEqual(acciones.filter(([n]) => n === 3).map(([, a]) => a), ["Recibir", "Inspeccionar", "Descartar"]);
  const automatico = new Recorrido();
  automatico.iniciar();
  automatico.actualizar(1000);
  assert.equal(guiado.entregados, automatico.entregados);
  assert.equal(guiado.descartados, automatico.descartados);
  assert.equal(guiado.entregados, 4);
  assert.equal(guiado.descartados, 2);
});

test("pausar conserva la acción en curso y continuar respeta la siguiente espera", () => {
  const motor = new Recorrido("guiado");
  motor.avanzar();
  motor.actualizar(1);
  motor.pausar();
  const detenido = motor.obtenerEstado();
  motor.avanzar();
  motor.actualizar(50);
  assert.deepEqual(motor.obtenerEstado(), detenido);
  motor.iniciar();
  motor.actualizar(50);
  assert.equal(motor.estado, "esperando");
  assert.equal(motor.obtenerEstado().accion, "Inspeccionar");
});

test("cambiar modo reinicia el lote y reiniciar conserva el modo elegido", () => {
  const motor = new Recorrido();
  motor.iniciar();
  motor.actualizar(50);
  motor.cambiarModo("guiado");
  assert.deepEqual(motor.obtenerEstado(), new Recorrido("guiado").obtenerEstado());
  motor.avanzar();
  motor.actualizar(3);
  motor.reiniciar();
  assert.deepEqual(motor.obtenerEstado(), new Recorrido("guiado").obtenerEstado());
  motor.cambiarModo("automatico");
  assert.deepEqual(motor.obtenerEstado(), new Recorrido().obtenerEstado());
});
