// ==========================================================================
// SECCIÓN 1: Modelo de datos y constantes
// ==========================================================================
class Producto {
    constructor(id, nombre, precio, categoria, stock) {
        this.id = id;
        this.nombre = nombre;
        this.precio = precio;
        this.categoria = categoria;
        this.stock = stock;
    }
}

// Ruta del archivo JSON local (relativa al index.html). Es nuestra "base de datos".
const RUTA_DATOS = "./data.json";

// En localStorage ya NO guardamos el catálogo entero (eso viene del fetch),
// sino solo los CAMBIOS del usuario: qué productos agregó y cuáles eliminó.
const CLAVE_STORAGE = "cambiosProductosGaming";

const CATEGORIAS = ["mouse", "teclado", "auriculares"];

// El catálogo arranca vacío: se llena cuando el fetch termina bien.
let inventarioProductos = [];

// Cambios del usuario que sobreviven a recargar la página.
let cambiosLocales = cargarCambiosLocales();

// Colores de los popups de SweetAlert2 (el CSS global pone texto blanco, así que usamos fondo oscuro).
const ESTILO_SWAL = { background: "#1e1e1e", color: "#ffffff" };

// ==========================================================================
// SECCIÓN 2: Selección de elementos del DOM
// ==========================================================================
const elementosPorCategoria = CATEGORIAS.map(cat => ({
    categoria: cat,
    btnAgregar: document.getElementById(`btn-agregar-${cat}`),
    inputNombre: document.getElementById(`input-nombre-${cat}`),
    inputPrecio: document.getElementById(`input-precio-${cat}`),
    contenedor: document.getElementById(`contenedor-productos-${cat}`)
}));

const inputBusqueda = document.getElementById("input-busqueda");
const estadoCarga = document.getElementById("estado-carga");
const bloqueError = document.getElementById("bloque-error");
const textoError = document.getElementById("texto-error");
const btnReintentar = document.getElementById("btn-reintentar");
const estadoSync = document.getElementById("estado-sync");
const notificacionBienvenida = document.getElementById("notificacion-bienvenida");
const btnCerrarNotificacion = document.getElementById("cerrar-notificacion");

// ==========================================================================
// SECCIÓN 3: Notificaciones con librerías (Toastify + SweetAlert2)
// ==========================================================================

// Toastify: avisos cortos que se van solos (éxito, info, error leve).
// Si la librería no cargó (bloqueador de anuncios, CDN caído), hacemos fallback a console.log
// para evitar que rompa la ejecución o lance un error dentro del try/catch de carga.
function mostrarToast(texto, tipo = "exito") {
    const colores = { exito: "#2e7d32", error: "#c0392b", info: "#1565c0" };

    if (typeof Toastify === "function") {
        try {
            Toastify({
                text: texto,
                duration: 3000,
                gravity: "top",
                position: "right",
                close: true,
                stopOnFocus: true,
                style: { background: colores[tipo] ?? colores.info }
            }).showToast();
            return;
        } catch (e) {
            console.warn("No se pudo mostrar el toast con Toastify:", e);
        }
    }

    // Fallback silencioso en consola si Toastify no está disponible
    console.log(`[Toast ${tipo.toUpperCase()}]: ${texto}`);
}

// SweetAlert2: alertas importantes que requieren atención (errores de la petición).
function mostrarAlertaError(titulo, detalle) {
    if (typeof Swal !== "undefined" && typeof Swal.fire === "function") {
        Swal.fire({
            icon: "error",
            title: titulo,
            text: detalle,
            confirmButtonText: "Entendido",
            ...ESTILO_SWAL
        });
    } else {
        console.error(`[Error] ${titulo}: ${detalle}`);
    }
}

// Refleja en pantalla si el último guardado en localStorage salió bien o no.
function actualizarEstadoSync(exito) {
    if (!estadoSync) return;

    estadoSync.textContent = exito
        ? "✓ Cambios guardados en este dispositivo"
        : "⚠️ Los cambios no se guardaron: podrían perderse al recargar";
    estadoSync.className = `estado-sync ${exito ? "estado-sync-ok" : "estado-sync-error"}`;
}

// ==========================================================================
// SECCIÓN 4: Estados de la interfaz durante la petición (cargando / error)
// ==========================================================================
function mostrarCargando(visible) {
    estadoCarga.hidden = !visible;
}

function mostrarErrorEnPantalla(mensaje) {
    textoError.textContent = mensaje;
    bloqueError.hidden = false;
}

function ocultarErrorEnPantalla() {
    bloqueError.hidden = true;
}

// Mientras no hay datos, bloqueamos buscador y botones "Agregar" para evitar acciones sobre un catálogo vacío.
function habilitarControles(habilitado) {
    inputBusqueda.disabled = !habilitado;
    elementosPorCategoria.forEach(({ btnAgregar }) => {
        btnAgregar.disabled = !habilitado;
    });
}

// ==========================================================================
// SECCIÓN 5: Persistencia de los cambios del usuario (localStorage)
// ==========================================================================

// Lee los cambios guardados. Si el JSON está roto o no hay nada, arranca sin cambios.
function cargarCambiosLocales() {
    try {
        const guardado = localStorage.getItem(CLAVE_STORAGE);
        const { agregados = [], eliminadosIds = [] } = guardado ? JSON.parse(guardado) : {};
        return { agregados, eliminadosIds };
    } catch (error) {
        return { agregados: [], eliminadosIds: [] };
    }
}

// try-catch-finally: setItem puede fallar (cuota llena, modo privado, etc.).
function guardarCambiosLocales() {
    let guardadoExitoso = false;

    try {
        localStorage.setItem(CLAVE_STORAGE, JSON.stringify(cambiosLocales));
        guardadoExitoso = true;
    } catch (error) {
        mostrarToast("No se pudo guardar el cambio. Intentá de nuevo.", "error");
    } finally {
        actualizarEstadoSync(guardadoExitoso);
    }

    return guardadoExitoso;
}

// Combina el catálogo que llegó del fetch con lo que hizo el usuario:
// saca los productos que eliminó y suma los que agregó.
function aplicarCambiosLocales(catalogoBase) {
    const { agregados, eliminadosIds } = cambiosLocales;

    const vigentes = catalogoBase.filter(({ id }) => !eliminadosIds.includes(id));
    const nuevos = agregados.map(({ id, nombre, precio, categoria, stock }) =>
        new Producto(id, nombre, precio, categoria, stock ?? 0)
    );

    return [...vigentes, ...nuevos];
}

// ==========================================================================
// SECCIÓN 6: Petición asíncrona con fetch + async/await + try/catch/finally
// ==========================================================================

// Pausa opcional para poder ver el "Cargando…" cuando el JSON local responde instantáneamente.
// const pausa = ms => new Promise(resolve => setTimeout(resolve, ms));

async function cargarProductos() {
    // 1) Antes de pedir: mostramos "Cargando…" y bloqueamos los controles.
    ocultarErrorEnPantalla();
    mostrarCargando(true);
    habilitarControles(false);

    try {
        // await pausa(1000); // <- descomentar (junto con la función de arriba) para ver el loader

        // 2) Pedimos el archivo. fetch SOLO rechaza la promesa ante fallos de red;
        //    un 404 o 500 igual "resuelve", por eso hay que revisar respuesta.ok a mano.
        const respuesta = await fetch(RUTA_DATOS);
        if (!respuesta.ok) {
            throw new Error(`El servidor respondió ${respuesta.status} ${respuesta.statusText}`.trim());
        }

        // 3) Convertimos el cuerpo a objeto JS (también es asíncrono, también lleva await).
        const datos = await respuesta.json();
        if (!Array.isArray(datos)) {
            throw new Error("El archivo de datos no tiene el formato esperado (se esperaba una lista).");
        }

        // 4) Armamos instancias de Producto y aplicamos los cambios del usuario.
        const catalogoBase = datos.map(({ id, nombre, precio, categoria, stock }) =>
            new Producto(id, nombre, precio, categoria, stock ?? 0)
        );
        inventarioProductos = aplicarCambiosLocales(catalogoBase);

        // 5) Renderizamos en el DOM, habilitamos controles y avisamos con la librería.
        renderizarTodo(inputBusqueda.value);
        habilitarControles(true);
        mostrarToast(`Productos cargados con éxito (${inventarioProductos.length})`, "exito");
    } catch (error) {
        // Cualquier fallo de arriba (red, HTTP, JSON inválido, formato) termina acá.
        console.error("Error al cargar los productos:", error);
        mostrarErrorEnPantalla("No se pudieron cargar los productos.");
        mostrarAlertaError("No pudimos cargar los productos", error.message);
    } finally {
        // Corre SIEMPRE, salga bien o mal: el "Cargando…" nunca queda pegado.
        mostrarCargando(false);
    }
}

// ==========================================================================
// SECCIÓN 7: Renderizado dinámico (creación de elementos con createElement)
// ==========================================================================
function formatearPrecio(precio) {
    return precio.toLocaleString("es-AR");
}

// Arma una tarjeta con createElement + textContent.
// Usamos textContent (y no innerHTML) para que un nombre escrito por el usuario,
// por ejemplo "<img src=x onerror=...>", se muestre como texto y no se ejecute.
function crearTarjetaProducto({ id, nombre, precio, stock }) {
    const columna = document.createElement("div");
    columna.className = "col-md-4 mb-3";

    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-producto";

    const titulo = document.createElement("h3");
    titulo.textContent = nombre;

    const textoPrecio = document.createElement("p");
    textoPrecio.textContent = `$${formatearPrecio(precio)}`;

    const textoStock = document.createElement("p");
    textoStock.className = "stock-producto";
    textoStock.textContent = `Stock: ${stock}`;

    const botonEliminar = document.createElement("button");
    botonEliminar.className = "btn-eliminar";
    botonEliminar.dataset.id = id;
    botonEliminar.textContent = "Eliminar";

    tarjeta.append(titulo, textoPrecio, textoStock, botonEliminar);
    columna.append(tarjeta);
    return columna;
}

function renderizarProductos(categoriaObj, filtro = "") {
    const filtroNormalizado = filtro.trim().toLowerCase();

    const productosFiltrados = inventarioProductos.filter(item =>
        item.categoria === categoriaObj.categoria &&
        item.nombre.toLowerCase().includes(filtroNormalizado)
    );

    // replaceChildren() vacía el contenedor y pone lo nuevo en un solo paso.
    if (productosFiltrados.length === 0) {
        const sinResultados = document.createElement("p");
        sinResultados.className = "sin-resultados";
        sinResultados.textContent = "No hay productos que coincidan.";
        categoriaObj.contenedor.replaceChildren(sinResultados);
        return;
    }

    categoriaObj.contenedor.replaceChildren(...productosFiltrados.map(crearTarjetaProducto));
}

function renderizarTodo(filtro = "") {
    elementosPorCategoria.forEach(categoriaObj => renderizarProductos(categoriaObj, filtro));
}

// ==========================================================================
// SECCIÓN 8: Agregar productos (evento click sobre el botón "Agregar")
// ==========================================================================
elementosPorCategoria.forEach(categoriaObj => {
    const { btnAgregar, inputNombre, inputPrecio, categoria } = categoriaObj;
    const form = document.getElementById(`form-agregar-${categoria}`);

    // Permite agregar productos tanto al hacer click en el botón como al presionar Enter en los inputs
    [inputNombre, inputPrecio].forEach(input => {
        input?.addEventListener("keydown", function (evento) {
            if (evento.key === "Enter") {
                evento.preventDefault();
                btnAgregar.click();
            }
        });
    });

    form?.addEventListener("submit", function (evento) {
        evento.preventDefault();
    });

    btnAgregar.addEventListener("click", function () {
        const nombre = inputNombre.value.trim();
        const precio = Number(inputPrecio.value);
        const esValido = nombre !== "" && !isNaN(precio) && precio > 0;

        if (!esValido) {
            mostrarToast("Completá un nombre y un precio válido.", "error");
            return;
        }

        // Date.now() como id: es único y no depende de ids de productos que ya se eliminaron.
        const nuevoProducto = new Producto(Date.now(), nombre, precio, categoria, 10);
        inventarioProductos.push(nuevoProducto);
        cambiosLocales.agregados.push(nuevoProducto);

        const guardadoOk = guardarCambiosLocales();
        renderizarProductos(categoriaObj, inputBusqueda.value);
        if (guardadoOk) {
            mostrarToast(`"${nombre}" agregado correctamente.`, "exito");
        }

        inputNombre.value = "";
        inputPrecio.value = "";
    });
});

// ==========================================================================
// SECCIÓN 9: Eliminar productos (delegación de eventos + confirmación con SweetAlert2)
// ==========================================================================
elementosPorCategoria.forEach(categoriaObj => {
    const { contenedor } = categoriaObj;

    contenedor.addEventListener("click", async function (evento) {
        const boton = evento.target.closest(".btn-eliminar");
        if (!boton) return;

        const idAEliminar = Number(boton.dataset.id);
        const indice = inventarioProductos.findIndex(item => item.id === idAEliminar);
        if (indice === -1) return;

        const { nombre } = inventarioProductos[indice];

        // Confirmación con SweetAlert2 (reemplaza al confirm() nativo). Si Swal no está disponible, usa confirm().
        let confirmado = false;
        if (typeof Swal !== "undefined" && typeof Swal.fire === "function") {
            const resultado = await Swal.fire({
                icon: "warning",
                title: "¿Eliminar producto?",
                text: nombre,
                showCancelButton: true,
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "Cancelar",
                confirmButtonColor: "#c0392b",
                ...ESTILO_SWAL
            });
            confirmado = resultado.isConfirmed;
        } else {
            confirmado = window.confirm(`¿Seguro que deseas eliminar "${nombre}"?`);
        }
        if (!confirmado) return;

        // Volvemos a buscar el índice: durante el await la lista pudo cambiar.
        const indiceActual = inventarioProductos.findIndex(item => item.id === idAEliminar);
        if (indiceActual === -1) return;
        inventarioProductos.splice(indiceActual, 1);

        // Si lo había agregado el usuario, se borra de "agregados";
        // si venía del JSON, se anota su id en "eliminadosIds" para ocultarlo en la próxima carga.
        const eraAgregado = cambiosLocales.agregados.some(item => item.id === idAEliminar);
        if (eraAgregado) {
            cambiosLocales.agregados = cambiosLocales.agregados.filter(item => item.id !== idAEliminar);
        } else {
            cambiosLocales.eliminadosIds.push(idAEliminar);
        }

        const guardadoOk = guardarCambiosLocales();
        renderizarProductos(categoriaObj, inputBusqueda.value);
        if (guardadoOk) {
            mostrarToast(`"${nombre}" eliminado.`, "info");
        }
    });
});

// ==========================================================================
// SECCIÓN 10: Búsqueda en vivo y botón "Reintentar"
// ==========================================================================
// "input" (y no "keyup") también detecta pegar texto con el mouse o borrar con la "x".
inputBusqueda.addEventListener("input", function (evento) {
    renderizarTodo(evento.target.value);
});

btnReintentar.addEventListener("click", cargarProductos);

// ==========================================================================
// SECCIÓN 11: Notificación diferida con setTimeout (Pre-Entrega 9)
// ==========================================================================
function mostrarNotificacionBienvenida() {
    if (!notificacionBienvenida) return;

    notificacionBienvenida.hidden = false;
    requestAnimationFrame(() => notificacionBienvenida.classList.add("visible"));
}

function ocultarNotificacionBienvenida() {
    if (!notificacionBienvenida) return;

    notificacionBienvenida.classList.remove("visible");
    // Espera a que termine la transición (300ms definidos en el CSS) antes de sacarla del flujo.
    setTimeout(() => {
        notificacionBienvenida.hidden = true;
    }, 300);
}

setTimeout(mostrarNotificacionBienvenida, 4000);
btnCerrarNotificacion?.addEventListener("click", ocultarNotificacionBienvenida);

// ==========================================================================
// SECCIÓN 12: Arranque — al cargar la página se pide la información con fetch
// ==========================================================================
cargarProductos();
