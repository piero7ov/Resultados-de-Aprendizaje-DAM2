async function cargarIncludes() {
  const elementos = document.querySelectorAll("[data-include]");
  for (const elemento of elementos) {
    const archivo = elemento.dataset.include;
    try {
      const respuesta = await fetch(archivo);
      if (!respuesta.ok) {
        console.error("No se puede cargar:", archivo);
        elemento.textContent = "No se puede cargar este contenido.";
        continue;
      }
      elemento.innerHTML = await respuesta.text();
    } catch (error) {
      console.error("Error al cargar:", archivo, error);
      elemento.textContent = "No se puede cargar este contenido.";
    }
  }
}
cargarIncludes();
