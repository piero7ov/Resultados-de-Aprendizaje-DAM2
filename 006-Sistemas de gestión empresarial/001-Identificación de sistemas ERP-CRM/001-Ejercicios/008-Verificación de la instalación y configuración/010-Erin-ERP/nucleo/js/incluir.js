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

      const scripts = elemento.querySelectorAll("script");
      scripts.forEach(function(scriptViejo){
        const scriptNuevo = document.createElement("script");
        for (const atributo of scriptViejo.attributes) {
          scriptNuevo.setAttribute(atributo.name, atributo.value);
        }
        scriptNuevo.textContent = scriptViejo.textContent;
        scriptViejo.replaceWith(scriptNuevo);
      });
    } catch (error) {
      console.error("Error al cargar:", archivo, error);
      elemento.textContent = "No se puede cargar este contenido.";
    }
  }
}
cargarIncludes();
