# 🎮 Catálogo Interactivo de Productos Gaming

Simulador interactivo y catálogo web para la gestión de productos gaming (Mouse, Teclados y Auriculares). Desarrollado en JavaScript moderno (ES6+), implementa peticiones asíncronas para el consumo de datos locales (`data.json`), persistencia en `localStorage`, manipulación dinámica del DOM y una interfaz enriquecida con notificaciones y diálogos interactivos mediante librerías externas.

---

## 📌 Tabla de Contenidos
- [Descripción del Proyecto](#-descripción-del-proyecto)
- [Características Principales](#-características-principales)
- [Tecnologías y Librerías](#-tecnologías-y-librerías)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Flujo de Datos y Asincronía](#-flujo-de-datos-y-asincronía)
- [Instrucciones de Instalación y Uso](#-instrucciones-de-instalación-y-uso)
- [Criterios de Evaluación Cumplidos](#-criterios-de-evaluación-cumplidos)

---

## 📖 Descripción del Proyecto

El proyecto es una aplicación web interactiva orientada al e-commerce de periféricos gamer. Al iniciar, consume de forma asíncrona un archivo local `data.json` que simula la base de datos de productos. El usuario puede:
1. Visualizar el catálogo organizado por categorías (`Mouse`, `Teclado`, `Auriculares`).
2. Filtrar productos en tiempo real mediante un buscador dinámico.
3. Dar de alta nuevos productos con validación de campos.
4. Eliminar productos con confirmación previa.
5. Mantener los cambios sincronizados en su navegador a través de `localStorage`.

---

## ✨ Características Principales

- **Carga Asíncrona Resiliente:** Petición con `fetch`, `async/await` y control total de estados: *Cargando...* (spinner visual), *Éxito* y *Error* con opción de reintento sin recargar la página.
- **Búsqueda en Vivo:** Filtrado instantáneo por nombre en todas las categorías en simultáneo.
- **Gestión de Inventario:** Permite agregar y quitar productos, actualizando las tarjetas en el DOM de forma segura mediante `createElement` y `replaceChildren` (prevención de vulnerabilidades XSS).
- **Persistencia Inteligente:** `localStorage` registra únicamente las modificaciones locales (altas y bajas), combinándolas con el catálogo base de `data.json`.
- **Notificación Diferida:** Banner de bienvenida con cupón de descuento activado por temporizador (`setTimeout`) a los 4 segundos del ingreso.

---

## 🛠️ Tecnologías y Librerías

El proyecto utiliza tecnologías web estándar integradas mediante CDN para garantizar portabilidad y rendimiento:

### 1. Lenguajes y Maquetación
- **HTML5 Semántico:** Estructura accesible con roles ARIA, formulario y contenedores organizados.
- **CSS3:** Estilos personalizados, diseño responsive, animaciones de transición y tipografía *Roboto* vía Google Fonts.
- **Bootstrap 5.3:** Sistema de grillas (`container`, `row`, `col`) y componentes visuales (`spinner-border`, `form-control`).
- **JavaScript (ES6+):** Clases, módulos lógicos, desestructuración, funciones flecha, promesas y delegación de eventos.

### 2. Librerías Externas Integradas
- **Toastify JS (`toastify-js`):**
  - Utilizada para notificaciones tipo *toast* no intrusivas en la esquina superior derecha.
  - Informa al usuario sobre:
    - Carga exitosa del catálogo de productos (`Productos cargados con éxito`).
    - Confirmación al agregar un nuevo producto.
    - Confirmación al eliminar un producto existente.
    - Avisos de validación ante campos vacíos o precios incorrectos.
- **SweetAlert2 (`sweetalert2@11`):**
  - Utilizada para reemplazar las alertas y confirmaciones nativas del navegador (`alert()` y `confirm()`).
  - Proporciona:
    - **Modal de confirmación:** Diálogo modal con diseño oscuro al solicitar la eliminación de un producto, requiriendo confirmación explícita del usuario (`isConfirmed`).
    - **Modal de error:** Alerta descriptiva ante fallos de conexión, respuestas HTTP no satisfactorias o errores de parseo JSON.

---

## 📁 Estructura del Proyecto

```plaintext
Mi-Decimo-Script-Interactivo/
├── css/
│   └── css.css          # Estilos personalizados del simulador
├── img/
│   ├── logo.png         # Favicon y logotipo en formato PNG
│   └── logo.jpeg        # Logotipo original
├── js/
│   └── main.js          # Lógica principal, peticiones fetch, DOM y eventos
├── data.json            # Fuente de datos inicial (catálogo de periféricos)
├── index.html           # Documento principal y estructura de la aplicación
└── README.md            # Documentación técnica del proyecto
```

---

## 🔄 Flujo de Datos y Asincronía

```text
[Inicio / Carga de página]
           │
           ▼
[mostrarCargando(true)] ──► Spinner visible en el DOM ("Cargando productos…")
           │
           ▼
[fetch("./data.json")]  ──► Petición asíncrona (async/await)
      ├── Error (red o !respuesta.ok) ──► catch (SweetAlert2 + Bloque Reintentar)
      └── Éxito (status 200 OK)
           │
           ▼
[JSON.parse / Instancias] ──► Combina con cambios guardados en localStorage
           │
           ▼
[renderizarTodo()]       ──► Inserción dinámica en el DOM
           │
           ▼
[Toastify]              ──► Notificación "Productos cargados con éxito"
           │
           ▼
[finally]               ──► mostrarCargando(false) oculta el spinner
```

---

## 🚀 Instrucciones de Instalación y Uso

Debido a que el proyecto realiza peticiones `fetch` a un archivo local (`./data.json`), **los navegadores modernos restringen estas solicitudes bajo el protocolo `file:///` por políticas de seguridad (CORS)**. Por lo tanto, debe ejecutarse a través de un servidor web local:

### Opción 1: Con la extensión Live Server de VS Code (Recomendada)
1. Abre la carpeta del proyecto en **Visual Studio Code**.
2. Si no la tienes, instala la extensión **Live Server** (creada por *Ritwick Dey*).
3. Haz clic derecho sobre el archivo [index.html](c:/Users/Thomas/OneDrive/Escritorio/Mi-Decimo-Script-Interactivo-main%20-%20copia/index.html) y selecciona **"Open with Live Server"** (o presiona `Alt + L, Alt + O`).
4. El navegador se abrirá automáticamente en `http://127.0.0.1:5500/index.html`.

### Opción 2: Con Node.js (`npx serve`)
Si tienes Node.js instalado en tu equipo:
```bash
# En la raíz del proyecto:
npx serve .
```
Abre en tu navegador la dirección indicada en la consola (por ejemplo, `http://localhost:3000`).


