<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ERINWAVE · Letras revisadas</title>
  <style>
    *{box-sizing:border-box}

    :root{
      color-scheme:light;
      font-family:"Courier New",monospace;
      background:#55c5e6;
      color:#21343d;
    }

    body{
      min-height:100vh;
      margin:0;
      padding:28px;
      background:
        radial-gradient(circle at 20% 15%,rgba(255,255,255,.92),transparent 27%),
        radial-gradient(circle at 18% 85%,#d8ff55 0,rgba(216,255,85,.52) 14%,transparent 32%),
        linear-gradient(180deg,#51c3e4 0 47%,#c8eef1 48%,#4db16d 100%);
    }

    main{
      width:min(1040px,100%);
      margin:auto;
      padding:22px;
      border:1px solid rgba(77,91,99,.92);
      border-radius:22px;
      background:linear-gradient(145deg,rgba(252,254,255,.97),rgba(166,179,187,.97));
      box-shadow:inset 0 1px 0 #fff,0 18px 38px rgba(24,53,63,.28);
    }

    header{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:20px;
      margin-bottom:18px;
    }

    h1{
      margin:0;
      font-size:21px;
      letter-spacing:.13em;
    }

    .volver{
      color:#075f75;
      font-size:12px;
      font-weight:700;
      text-decoration:none;
    }

    .aviso{
      margin:0 0 18px;
      padding:12px 14px;
      border:1px solid #50717c;
      border-radius:11px;
      background:#073b56;
      color:#a9eef7;
      font-size:12px;
      line-height:1.5;
      box-shadow:inset 0 0 12px rgba(0,0,0,.42);
    }

    .formulario{
      display:grid;
      grid-template-columns:minmax(230px,.72fr) minmax(380px,1.28fr);
      gap:18px;
    }

    .panel{
      padding:16px;
      border:1px solid #68767e;
      border-radius:14px;
      background:linear-gradient(160deg,#f7fafb,#bac6cc);
      box-shadow:inset 0 1px 0 #fff,0 3px 8px rgba(22,39,48,.2);
    }

    label{
      display:block;
      margin:0 0 7px;
      font-size:10px;
      font-weight:700;
      letter-spacing:.1em;
      text-transform:uppercase;
    }

    select,input,textarea,button{
      font:inherit;
    }

    select,input,textarea{
      width:100%;
      border:1px solid #65747c;
      border-radius:8px;
      background:rgba(251,253,254,.94);
      color:#20343d;
      outline:none;
      box-shadow:inset 0 1px 3px rgba(32,53,62,.14);
    }

    select,input{
      height:39px;
      padding:0 10px;
      margin-bottom:15px;
    }

    textarea{
      min-height:390px;
      padding:12px;
      resize:vertical;
      line-height:1.45;
    }

    select:focus,input:focus,textarea:focus{
      border-color:#0792aa;
      box-shadow:0 0 0 3px rgba(25,190,210,.2),inset 0 1px 3px rgba(32,53,62,.14);
    }

    .estado-cancion{
      display:grid;
      gap:8px;
      margin-top:4px;
    }

    .dato{
      display:flex;
      justify-content:space-between;
      gap:12px;
      padding:9px 10px;
      border-radius:8px;
      background:rgba(6,54,78,.9);
      color:#b9f4f8;
      font-size:10px;
    }

    .dato strong{color:#fff}

    .acciones{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:14px;
      margin-top:13px;
    }

    button{
      min-height:40px;
      padding:0 17px;
      border:1px solid #38626e;
      border-radius:10px;
      background:linear-gradient(180deg,#eaffff 0%,#52d2db 43%,#087e96 100%);
      color:#fff;
      font-weight:700;
      cursor:pointer;
      box-shadow:inset 0 1px 0 #fff,0 3px 6px rgba(22,39,48,.3);
    }

    button:disabled{cursor:wait;opacity:.62}

    .resultado{
      min-height:32px;
      margin:0;
      color:#3e535c;
      font-size:11px;
      line-height:1.4;
    }

    .resultado.error{color:#9b2633}
    .resultado.correcto{color:#076b58}

    @media(max-width:760px){
      body{padding:12px}
      main{padding:15px}
      header{align-items:flex-start;flex-direction:column}
      .formulario{grid-template-columns:1fr}
      textarea{min-height:320px}
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>ERINWAVE · LETRAS</h1>
      <a class="volver" href="index.html">VOLVER AL REPRODUCTOR</a>
    </header>

    <p class="aviso">
      Panel temporal de revisión. ERINWAVE importa automáticamente desde <strong>letras/</strong> los archivos <strong>Artista - Canción.es.txt</strong> y <strong>Artista - Canción.en.txt</strong>. También puedes introducir aquí una letra que tengas permiso para utilizar, con una frase por línea y las repeticiones en el orden real. Whisper seguirá calculando los tiempos; esta letra será la referencia textual.
    </p>

    <div class="formulario">
      <section class="panel">
        <label for="cancion">Canción</label>
        <select id="cancion"></select>

        <label for="idioma">Idioma de la letra</label>
        <select id="idioma">
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>

        <label for="fuente">Fuente o nota opcional</label>
        <input id="fuente" maxlength="500" placeholder="Referencia local o URL autorizada">

        <div class="estado-cancion">
          <div class="dato"><span>LETRA REVISADA</span><strong id="estadoLetra">NO</strong></div>
          <div class="dato"><span>VTT ACTUAL</span><strong id="estadoVtt">NO</strong></div>
          <div class="dato"><span>ÚLTIMA ALINEACIÓN</span><strong id="estadoAlineacion">—</strong></div>
        </div>
      </section>

      <section class="panel">
        <label for="letra">Letra completa y ordenada</label>
        <textarea id="letra" spellcheck="true" placeholder="Una frase por línea..."></textarea>
        <div class="acciones">
          <p id="resultado" class="resultado" aria-live="polite"></p>
          <button id="guardar" type="button">GUARDAR Y COMPARAR</button>
        </div>
      </section>
    </div>
  </main>

  <script>
    let selectorCancion = document.querySelector("#cancion")
    let selectorIdioma = document.querySelector("#idioma")
    let campoFuente = document.querySelector("#fuente")
    let campoLetra = document.querySelector("#letra")
    let estadoLetra = document.querySelector("#estadoLetra")
    let estadoVtt = document.querySelector("#estadoVtt")
    let estadoAlineacion = document.querySelector("#estadoAlineacion")
    let resultado = document.querySelector("#resultado")
    let guardar = document.querySelector("#guardar")
    let canciones = []

    function cancionSeleccionada(){
      return canciones.find(function(cancion){
        return cancion.archivo === selectorCancion.value
      })
    }

    function mostrarCancion(){
      let cancion = cancionSeleccionada()

      if(!cancion){
        return
      }

      selectorIdioma.value = cancion.idioma || "es"
      campoFuente.value = cancion.fuente || ""
      campoLetra.value = cancion.texto || ""
      estadoLetra.textContent = cancion.tieneLetra ? cancion.totalLineas + " LÍNEAS" : "NO"
      estadoVtt.textContent = cancion.tieneVtt
        ? (cancion.tieneVttBruto ? "CORREGIBLE" : "AUTOMÁTICO")
        : "NO"
      estadoAlineacion.textContent = cancion.ultimasLineas > 0
        ? cancion.ultimasCoincidencias + "/" + cancion.ultimasLineas
        : "—"
      resultado.textContent = ""
      resultado.className = "resultado"
    }

    async function cargarCanciones(archivoConservado){
      let respuesta = await fetch("api/letras.php?momento=" + Date.now())
      let datos = await respuesta.json()

      if(!respuesta.ok || !datos.ok){
        throw new Error(datos.mensaje || "No se pudo abrir la base de datos")
      }

      canciones = datos.canciones
      selectorCancion.replaceChildren()
      canciones.forEach(function(cancion){
        let artista = cancion.artista ? cancion.artista + " · " : ""
        let opcion = document.createElement("option")
        opcion.value = cancion.archivo
        opcion.textContent = artista + cancion.titulo
        selectorCancion.append(opcion)
      })

      if(archivoConservado && canciones.some(cancion => cancion.archivo === archivoConservado)){
        selectorCancion.value = archivoConservado
      }

      mostrarCancion()

      if(datos.importacionLetras.conflictos.length > 0){
        resultado.textContent = "Hay una canción con archivos .es.txt y .en.txt a la vez. Deja solamente el idioma correcto."
        resultado.className = "resultado error"
      }else if(datos.importacionLetras.importadas.length > 0){
        resultado.textContent = datos.importacionLetras.importadas.length
          + " letra(s) importada(s) automáticamente desde letras/."
        resultado.className = "resultado correcto"
      }
    }

    selectorCancion.onchange = mostrarCancion

    guardar.onclick = async function(){
      let cancion = cancionSeleccionada()

      if(!cancion || campoLetra.value.trim() === ""){
        resultado.textContent = "Añade la letra antes de guardar."
        resultado.className = "resultado error"
        return
      }

      guardar.disabled = true
      resultado.textContent = "Guardando y comparando..."
      resultado.className = "resultado"

      try{
        let respuesta = await fetch("api/letras.php",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            archivo:cancion.archivo,
            idioma:selectorIdioma.value,
            fuente:campoFuente.value,
            texto:campoLetra.value
          })
        })
        let datos = await respuesta.json()

        if(!respuesta.ok || !datos.ok){
          throw new Error(datos.mensaje || datos.codigo || "No se pudo guardar")
        }

        await cargarCanciones(cancion.archivo)

        if(datos.estado === "vtt_corregido"){
          resultado.textContent = datos.alineacion.lineasMostradas + "/" + datos.alineacion.lineasLetra
            + " líneas mostradas. " + datos.alineacion.lineasEstimadas
            + " con tiempo estimado. VTT corregido."
        }else if(datos.estado === "requiere_revision"){
          resultado.textContent = datos.alineacion.coincidencias + "/" + datos.alineacion.lineasLetra
            + " líneas reconocidas. La coincidencia no es suficiente para sustituir el VTT."
        }else{
          resultado.textContent = "Letra guardada. Se utilizará en la próxima generación."
        }

        if(datos.alineacion && datos.alineacion.detallePendientes){
          let pendientes = datos.alineacion.detallePendientes
          if(pendientes.length > 0){
            resultado.textContent += " Pendientes de ubicar: " + pendientes
              .map(linea => linea.orden + ": " + linea.texto).join(" / ")
          }
        }
        resultado.className = datos.estado === "requiere_revision" ? "resultado error" : "resultado correcto"
      }catch(error){
        resultado.textContent = error.message
        resultado.className = "resultado error"
      }finally{
        guardar.disabled = false
      }
    }

    cargarCanciones().catch(function(error){
      resultado.textContent = error.message
      resultado.className = "resultado error"
    })
  </script>
</body>
</html>
