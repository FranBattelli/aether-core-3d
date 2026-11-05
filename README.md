# AETHER // 3D Interactive Multilayer Geometry Lab

[Español](#-español) | [English](#-english)

---

## 🇪🇸 Español

### Descripción General
**AETHER** es una experiencia web 3D interactiva desarrollada en un solo componente de React. Consiste en un laboratorio visual con una estructura geométrica abstracta de 4 capas concéntricas independientes que reaccionan en tiempo real al movimiento del cursor, eventos de interacción y desplazamiento vertical bidireccional.

### ✨ Características Principales
* **Estructura en 4 Capas Concéntricas:**
  * **Capa 1 (Núcleo):** Dodecaedro central metálico con acabado `flatShading`, baja rugosidad y un reactor octaédrico interno.
  * **Capa 2 (Corteza Cristal):** Icosaedro envolvente vítreo con refracción y aberración cromática mediante `MeshTransmissionMaterial`.
  * **Capa 3 (Jaula Geodésica):** Armazón geodésico wireframe volumétrico con brillo emisivo.
  * **Capa 4 (Anillos Giroscópicos):** 3 anillos orbitales (`TorusGeometry`) con inclinaciones y velocidades diferenciadas junto a un doble sistema de partículas `Sparkles`.
* **Físicas e Interacciones con GSAP:**
  * **Parallax Magnético:** Cada capa inclina y desplaza su eje hacia el puntero mediante interpolación suave (`THREE.MathUtils.lerp`), generando sensación de profundidad 3D.
  * **Hover (Exploded View):** Al situar el cursor sobre la figura, las capas se expanden elásticamente hacia el exterior y multiplican su velocidad de rotación.
  * **Click (Pulso 360°):** Detona un giro completo en ejes alternados por capa acompañado de una onda de choque luminosa.
  * **Desarmado Bidireccional por Scroll:** Al deslizar hacia abajo, la figura se desacopla progresivamente pieza por pieza; al subir, se reensambla con suavidad.
* **Panel UI Glassmorphism:**
  * Presets de paletas de color (*Cyberpunk, Neón, Pastel, Monocromático*) y selectores individuales por capa con transiciones vía `gsap.to(material.color, ...)`.
  * Controles en vivo para separación manual de capas, velocidad de giro base, toggle de wireframe global y disparador de pulsos.

### 🛠️ Tecnologías
* **React 18**
* **React Three Fiber (`@react-three/fiber`)**
* **Drei (`@react-three/drei`)**
* **Three.js**
* **GSAP**
* **Tailwind CSS v4**
* **Vite**

### 🚀 Instalación y Uso
```bash
# Clonar el repositorio
git clone https://github.com/FranBattelli/aether-core-3d.git

# Ingresar al directorio
cd aether-core-3d

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

---

## 🇬🇧 English

### Overview
**AETHER** is an interactive 3D web experience built within a single React component. It functions as a visual laboratory featuring a 4-layer concentric abstract geometric monolith that dynamically responds to cursor movement, pointer interactions, and bidirectional scroll choreography.

### ✨ Key Features
* **4-Layer Concentric Structure:**
  * **Layer 1 (Core):** Metallic dodecahedron with `flatShading`, high metalness, low roughness, and an internal core singularity.
  * **Layer 2 (Crystal Cortex):** Translucent glass icosahedron with realistic refraction, chromatic aberration, and thickness via `MeshTransmissionMaterial`.
  * **Layer 3 (Geometric Cage):** Volumetric geodesic wireframe shell with emissive glow.
  * **Layer 4 (Gyroscopic Rings):** 3 orbital rings (`TorusGeometry`) tilted at unique angles paired with dual-layer `Sparkles` particle fields.
* **Physics & GSAP Interactions:**
  * **Magnetic Parallax:** Soft interpolation (`THREE.MathUtils.lerp`) offsets position and rotation toward the cursor at differential speeds per layer for realistic depth.
  * **Hover (Exploded View):** Hovering over the artifact smoothly expands all layers with GSAP elastic easing and accelerates spin rates.
  * **Click (360° Pulse):** Triggers an instant multi-axis $360^\circ$ spin wave and a luminous wireframe shockwave.
  * **Bidirectional Scroll Disassembly:** Scrolling down systematically pulls the artifact apart stage-by-stage; scrolling up smoothly reassembles the monolith into its compact resting state.
* **Glassmorphism UI Control Panel:**
  * Color presets (*Cyberpunk, Neon, Pastel, Monochromatic*) and individual layer pickers animated with `gsap.to(material.color, ...)`.
  * Real-time sliders for layer separation, base rotation speed, global wireframe mode, and manual shockwave triggers.

### 🛠️ Tech Stack
* **React 18**
* **React Three Fiber (`@react-three/fiber`)**
* **Drei (`@react-three/drei`)**
* **Three.js**
* **GSAP**
* **Tailwind CSS v4**
* **Vite**

### 🚀 Getting Started
```bash
# Clone the repository
git clone https://github.com/FranBattelli/aether-core-3d.git

# Navigate into the project folder
cd aether-core-3d

# Install dependencies
npm install

# Start development server
npm run dev
```
