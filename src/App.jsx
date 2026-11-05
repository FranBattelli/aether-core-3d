import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  Environment,
  MeshTransmissionMaterial,
  Sparkles,
  Float,
  ContactShadows,
} from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import {
  Sliders,
  Sparkles as SparklesIcon,
  Layers,
  Zap,
  Eye,
  RotateCcw,
  Maximize2,
  Grid,
  Palette,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
} from 'lucide-react'

// ============================================================================
// UTILIDADES MATEMÁTICAS PARA EL DESARMADO PROGRESIVO POR SCROLL
// ============================================================================
const clamp01 = (v) => Math.max(0, Math.min(1, v))

const smoothstep = (min, max, value) => {
  const x = clamp01((value - min) / (max - min))
  return x * x * (3 - 2 * x)
}

// ============================================================================
// PRESETS DE PALETAS DE COLORES (4 Capas + Luces Puntuales)
// ============================================================================
const PALETTES = {
  cyberpunk: {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    badge: 'SYNTH // 2099',
    layers: ['#ff0055', '#00f0ff', '#fcee09', '#b829ff'],
    lights: ['#ff007f', '#00f0ff'],
  },
  neon: {
    id: 'neon',
    label: 'Neón',
    badge: 'PLASMA // LUX',
    layers: ['#39ff14', '#00ffcc', '#ff00ff', '#7000ff'],
    lights: ['#39ff14', '#ff00ff'],
  },
  pastel: {
    id: 'pastel',
    label: 'Pastel',
    badge: 'AETHER // SOFT',
    layers: ['#ffafcc', '#a2d2ff', '#cdb4db', '#ffc8dd'],
    lights: ['#ffafcc', '#a2d2ff'],
  },
  monochrome: {
    id: 'monochrome',
    label: 'Monocromático',
    badge: 'OBSIDIAN // MONO',
    layers: ['#ffffff', '#d4d4d8', '#71717a', '#a1a1aa'],
    lights: ['#ffffff', '#71717a'],
  },
}

const LAYER_META = [
  { key: 0, name: 'Capa 1 · Núcleo Dodecaédrico', tag: 'CORE' },
  { key: 1, name: 'Capa 2 · Corteza Cristal', tag: 'GLASS' },
  { key: 2, name: 'Capa 3 · Jaula Geodésica', tag: 'CAGE' },
  { key: 3, name: 'Capa 4 · Anillos Giroscópicos', tag: 'RINGS' },
]

const DISASSEMBLY_STAGES = [
  {
    id: 'assembled',
    range: [0, 0.1],
    title: '00 // Ensamblaje íntegro',
    desc: 'Las 4 capas concéntricas operan en resonancia armónica central.',
  },
  {
    id: 'rings',
    range: [0.1, 0.4],
    title: '01 // Desacople de Anillos Giroscópicos',
    desc: 'Los 3 anillos orbitales (Capa 4) se separan en vectores diagonales.',
  },
  {
    id: 'cage',
    range: [0.4, 0.68],
    title: '02 // Apertura de Jaula Geodésica',
    desc: 'El armazón wireframe (Capa 3) se divide y desplaza hacia el flanco izquierdo.',
  },
  {
    id: 'cortex',
    range: [0.68, 0.88],
    title: '03 // Extracción de Corteza Cristal',
    desc: 'El icosaedro refractor (Capa 2) se desliza liberando el núcleo.',
  },
  {
    id: 'core',
    range: [0.88, 1.01],
    title: '04 // Exposición del Núcleo y Singularidad',
    desc: 'El dodecaedro central (Capa 1) avanza revelando su reactor interno.',
  },
]

// ============================================================================
// COMPONENTE ESCENA 3D (4 CAPAS CONCÉNTRICAS + DESARMADO POR SCROLL + INTERACCIONES)
// ============================================================================
function MultilayerArtifact({
  colors,
  lightColors,
  globalWireframe,
  manualExpansion,
  baseRotationSpeed,
  pulseTrigger,
  forceExploded,
  scrollProgressRef,
  onHoverChange,
  onPulseActive,
  pointerTelemetryRef,
}) {
  // Referencias independientes para cada una de las 4 capas (Parallax y Escala Hover/Pulso)
  const layer1Ref = useRef(null) // Capa 1: Núcleo
  const layer2Ref = useRef(null) // Capa 2: Corteza Cristal
  const layer3Ref = useRef(null) // Capa 3: Jaula Geométrica
  const layer4Ref = useRef(null) // Capa 4: Anillos Giroscópicos (Grupo principal)

  // Referencias para el DESARMADO PROGRESIVO POR SCROLL (desacoplado de las interacciones iniciales)
  const disLayer1Ref = useRef(null)
  const disInnerCoreRef = useRef(null)
  const disLayer2Ref = useRef(null)
  const disCageMainRef = useRef(null)
  const disCageOuterRef = useRef(null)
  const disRingARef = useRef(null)
  const disRingBRef = useRef(null)
  const disRingCRef = useRef(null)

  // Referencias internas de rotación continua y giro de 360° (Click)
  const spin1Ref = useRef(null)
  const spin2Ref = useRef(null)
  const spin3Ref = useRef(null)
  const spin4Ref = useRef(null)

  // Sub-referencias de rotación orbital de los 3 anillos giroscópicos de la Capa 4
  const ringARef = useRef(null)
  const ringBRef = useRef(null)
  const ringCRef = useRef(null)

  // Referencias de materiales para animar colores suavemente con gsap.to(material.color, ...)
  const mat1Ref = useRef(null)
  const matInnerCoreRef = useRef(null)
  const mat2Ref = useRef(null)
  const mat3Ref = useRef(null)
  const mat3InnerRef = useRef(null)
  const matRingARef = useRef(null)
  const matRingBRef = useRef(null)
  const matRingCRef = useRef(null)

  // Referencias para las 2 luces puntuales que siguen al cursor
  const pointLight1Ref = useRef(null)
  const pointLight2Ref = useRef(null)

  // Onda de choque visual al hacer clic
  const shockwaveRef = useRef(null)
  const shockwaveMatRef = useRef(null)

  // Estado reactivo/animado por GSAP para multiplicador de velocidad en hover y progreso interpolado de scroll
  const animState = useRef({
    hoverMultiplier: 1,
    isHovered: false,
    smoothScroll: 0,
  })

  // Geometría para la Capa 3 (Jaula Geométrica)
  const cageGeo = useMemo(() => new THREE.IcosahedronGeometry(1.88, 1), [])

  // --------------------------------------------------------------------------
  // Transición suave de colores en las 4 capas usando gsap.to(material.color)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const c1 = new THREE.Color(colors[0])
    const c2 = new THREE.Color(colors[1])
    const c3 = new THREE.Color(colors[2])
    const c4 = new THREE.Color(colors[3])

    if (mat1Ref.current) {
      gsap.to(mat1Ref.current.color, {
        r: c1.r,
        g: c1.g,
        b: c1.b,
        duration: 0.85,
        ease: 'power2.out',
      })
      gsap.to(mat1Ref.current.emissive, {
        r: c1.r * 0.25,
        g: c1.g * 0.25,
        b: c1.b * 0.25,
        duration: 0.85,
        ease: 'power2.out',
      })
    }

    if (matInnerCoreRef.current) {
      gsap.to(matInnerCoreRef.current.color, {
        r: c2.r,
        g: c2.g,
        b: c2.b,
        duration: 0.85,
        ease: 'power2.out',
      })
      gsap.to(matInnerCoreRef.current.emissive, {
        r: c1.r * 0.8,
        g: c1.g * 0.8,
        b: c1.b * 0.8,
        duration: 0.85,
        ease: 'power2.out',
      })
    }

    if (mat2Ref.current) {
      gsap.to(mat2Ref.current.color, {
        r: c2.r,
        g: c2.g,
        b: c2.b,
        duration: 0.85,
        ease: 'power2.out',
      })
      if (mat2Ref.current.attenuationColor) {
        gsap.to(mat2Ref.current.attenuationColor, {
          r: c2.r,
          g: c2.g,
          b: c2.b,
          duration: 0.85,
          ease: 'power2.out',
        })
      }
    }

    if (mat3Ref.current) {
      gsap.to(mat3Ref.current.color, {
        r: c3.r,
        g: c3.g,
        b: c3.b,
        duration: 0.85,
        ease: 'power2.out',
      })
      gsap.to(mat3Ref.current.emissive, {
        r: c3.r * 0.45,
        g: c3.g * 0.45,
        b: c3.b * 0.45,
        duration: 0.85,
        ease: 'power2.out',
      })
    }

    if (mat3InnerRef.current) {
      gsap.to(mat3InnerRef.current.color, {
        r: c3.r,
        g: c3.g,
        b: c3.b,
        duration: 0.85,
        ease: 'power2.out',
      })
    }

    ;[matRingARef.current, matRingBRef.current, matRingCRef.current].forEach(
      (mat) => {
        if (mat) {
          gsap.to(mat.color, {
            r: c4.r,
            g: c4.g,
            b: c4.b,
            duration: 0.85,
            ease: 'power2.out',
          })
          gsap.to(mat.emissive, {
            r: c4.r * 0.35,
            g: c4.g * 0.35,
            b: c4.b * 0.35,
            duration: 0.85,
            ease: 'power2.out',
          })
        }
      }
    )

    if (pointLight1Ref.current && lightColors?.[0]) {
      const l1 = new THREE.Color(lightColors[0])
      gsap.to(pointLight1Ref.current.color, {
        r: l1.r,
        g: l1.g,
        b: l1.b,
        duration: 1.0,
        ease: 'power2.out',
      })
    }
    if (pointLight2Ref.current && lightColors?.[1]) {
      const l2 = new THREE.Color(lightColors[1])
      gsap.to(pointLight2Ref.current.color, {
        r: l2.r,
        g: l2.g,
        b: l2.b,
        duration: 1.0,
        ease: 'power2.out',
      })
    }
  }, [colors, lightColors])

  // --------------------------------------------------------------------------
  // Expansión de Capas ("Exploded View") combinando Hover + Slider Manual con GSAP
  // --------------------------------------------------------------------------
  const updateLayerExpansion = useCallback(
    (hovered) => {
      const isExpanded = hovered || forceExploded
      const expansionFactor = manualExpansion + (isExpanded ? 0.65 : 0)

      const targetScales = [
        1 + expansionFactor * 0.08, // Capa 1: Núcleo
        1 + expansionFactor * 0.26, // Capa 2: Corteza Cristal
        1 + expansionFactor * 0.48, // Capa 3: Jaula Geométrica
        1 + expansionFactor * 0.72, // Capa 4: Anillos Giroscópicos
      ]

      const refs = [layer1Ref, layer2Ref, layer3Ref, layer4Ref]
      const easeType = isExpanded
        ? 'elastic.out(1, 0.55)'
        : 'back.out(1.6)'

      refs.forEach((ref, index) => {
        if (!ref.current) return
        gsap.to(ref.current.scale, {
          x: targetScales[index],
          y: targetScales[index],
          z: targetScales[index],
          duration: isExpanded ? 1.15 : 0.75,
          delay: index * 0.045,
          ease: easeType,
          overwrite: 'auto',
        })
      })

      gsap.to(animState.current, {
        hoverMultiplier: isExpanded ? 2.4 : 1.0,
        duration: 0.65,
        ease: 'power2.out',
      })
    },
    [manualExpansion, forceExploded]
  )

  useEffect(() => {
    updateLayerExpansion(animState.current.isHovered)
  }, [manualExpansion, forceExploded, updateLayerExpansion])

  // --------------------------------------------------------------------------
  // Eventos de Puntero: Hover (Exploded View) & Click (Onda de Choque / Pulso 360°)
  // --------------------------------------------------------------------------
  const handlePointerOver = (e) => {
    e.stopPropagation()
    if (!animState.current.isHovered) {
      animState.current.isHovered = true
      document.body.style.cursor = 'pointer'
      onHoverChange?.(true)
      updateLayerExpansion(true)
    }
  }

  const handlePointerOut = (e) => {
    e.stopPropagation()
    if (animState.current.isHovered) {
      animState.current.isHovered = false
      document.body.style.cursor = 'auto'
      onHoverChange?.(false)
      updateLayerExpansion(false)
    }
  }

  // Onda de Choque / Giro de 360 grados en ejes alternados por capa
  const triggerShockwavePulse = useCallback(() => {
    onPulseActive?.(true)
    setTimeout(() => onPulseActive?.(false), 950)

    const twoPi = Math.PI * 2
    const spinRefs = [
      { ref: spin1Ref, axis: 'y', dir: 1, delay: 0 },
      { ref: spin2Ref, axis: 'x', dir: -1, delay: 0.05 },
      { ref: spin3Ref, axis: 'z', dir: 1, delay: 0.1 },
      { ref: spin4Ref, axis: 'y', dir: -1, delay: 0.15 },
    ]

    spinRefs.forEach(({ ref, axis, dir, delay }) => {
      if (!ref.current) return
      gsap.to(ref.current.rotation, {
        [axis]: `+=${twoPi * dir}`,
        duration: 1.05,
        delay,
        ease: 'expo.out',
      })
    })

    const layerRefs = [layer1Ref, layer2Ref, layer3Ref, layer4Ref]
    const isExpanded = animState.current.isHovered || forceExploded
    const expansionFactor = manualExpansion + (isExpanded ? 0.65 : 0)
    const restScales = [
      1 + expansionFactor * 0.08,
      1 + expansionFactor * 0.26,
      1 + expansionFactor * 0.48,
      1 + expansionFactor * 0.72,
    ]

    layerRefs.forEach((ref, idx) => {
      if (!ref.current) return
      const peak = restScales[idx] * (1.22 + idx * 0.06)
      gsap.fromTo(
        ref.current.scale,
        { x: peak, y: peak, z: peak },
        {
          x: restScales[idx],
          y: restScales[idx],
          z: restScales[idx],
          duration: 1.1,
          delay: idx * 0.04,
          ease: 'elastic.out(1.1, 0.45)',
          overwrite: 'auto',
        }
      )
    })

    if (shockwaveRef.current && shockwaveMatRef.current) {
      shockwaveRef.current.scale.set(0.6, 0.6, 0.6)
      shockwaveMatRef.current.opacity = 0.85
      gsap.to(shockwaveRef.current.scale, {
        x: 5.2,
        y: 5.2,
        z: 5.2,
        duration: 0.9,
        ease: 'power3.out',
      })
      gsap.to(shockwaveMatRef.current, {
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out',
      })
    }
  }, [manualExpansion, forceExploded, onPulseActive])

  useEffect(() => {
    if (pulseTrigger > 0) {
      triggerShockwavePulse()
    }
  }, [pulseTrigger, triggerShockwavePulse])

  const handleClick = (e) => {
    e.stopPropagation()
    triggerShockwavePulse()
  }

  // --------------------------------------------------------------------------
  // Bucle de Animación: Parallax + Rotación + Desarmado por Scroll + Luces
  // --------------------------------------------------------------------------
  useFrame((state, delta) => {
    const px = state.pointer.x
    const py = state.pointer.y

    if (pointerTelemetryRef?.current) {
      pointerTelemetryRef.current.x = px
      pointerTelemetryRef.current.y = py
    }

    const speed = baseRotationSpeed * animState.current.hoverMultiplier
    const dt = Math.min(delta, 0.1)

    // Suavizado del progreso de scroll (0 = ensamblado, 1 = completamente desarmado)
    const targetScroll = scrollProgressRef?.current || 0
    animState.current.smoothScroll = THREE.MathUtils.lerp(
      animState.current.smoothScroll,
      targetScroll,
      0.085
    )
    const s = animState.current.smoothScroll

    // Alejar sutilmente la cámara al desarmar para mantener todas las piezas en cuadro
    state.camera.position.z = THREE.MathUtils.lerp(
      state.camera.position.z,
      7.6 + s * 2.1,
      0.08
    )

    // ========================================================================
    // 1. ANIMACIÓN DE DESARMADO PROGRESIVO POR SCROLL ("POCO A POCO")
    // ========================================================================
    // Fase 1 (0% -> 42%): Los 3 Anillos Giroscópicos (Capa 4) se desacoplan en distintas direcciones
    const pRingC = smoothstep(0.02, 0.32, s) // Anillo exterior sale primero
    const pRingB = smoothstep(0.08, 0.38, s) // Anillo medio sale segundo
    const pRingA = smoothstep(0.14, 0.44, s) // Anillo interior sale tercero

    // Fase 2 (28% -> 66%): La Jaula Geodésica (Capa 3) se divide y se desplaza a la izquierda
    const pCageMain = smoothstep(0.26, 0.62, s)
    const pCageOuter = smoothstep(0.32, 0.68, s)

    // Fase 3 (52% -> 86%): La Corteza de Cristal (Capa 2) se desliza hacia la derecha
    const pCortex = smoothstep(0.5, 0.84, s)

    // Fase 4 (70% -> 100%): El Núcleo Dodecaédrico (Capa 1) avanza al frente y revela la singularidad interna
    const pCore = smoothstep(0.68, 0.98, s)

    // Aplicar transformaciones de desarme a los 3 anillos de la Capa 4
    if (disRingCRef.current) {
      disRingCRef.current.position.set(
        pRingC * 2.55,
        pRingC * 1.55,
        -pRingC * 0.95
      )
      disRingCRef.current.rotation.set(
        pRingC * 0.65,
        -pRingC * 0.5,
        pRingC * 0.4
      )
    }
    if (disRingBRef.current) {
      disRingBRef.current.position.set(
        -pRingB * 2.45,
        -pRingB * 1.35,
        pRingB * 0.45
      )
      disRingBRef.current.rotation.set(
        -pRingB * 0.55,
        pRingB * 0.7,
        -pRingB * 0.35
      )
    }
    if (disRingARef.current) {
      disRingARef.current.position.set(
        pRingA * 0.2,
        -pRingA * 2.15,
        -pRingA * 0.85
      )
      disRingARef.current.rotation.set(
        pRingA * 1.05,
        0,
        pRingA * 0.5
      )
    }

    // Aplicar transformaciones de desarme a la Jaula Geodésica (Capa 3 dividida en 2 sub-armazones)
    if (disCageMainRef.current) {
      disCageMainRef.current.position.set(
        -pCageMain * 2.35,
        pCageMain * 0.95,
        -pCageMain * 0.35
      )
      disCageMainRef.current.rotation.set(
        pCageMain * 0.45,
        -pCageMain * 0.85,
        0
      )
      const cageScale = 1 - pCageMain * 0.14
      disCageMainRef.current.scale.setScalar(cageScale)
    }
    if (disCageOuterRef.current) {
      disCageOuterRef.current.position.set(
        -pCageOuter * 1.15,
        pCageOuter * 1.85,
        -pCageOuter * 1.35
      )
      disCageOuterRef.current.rotation.set(
        -pCageOuter * 0.6,
        pCageOuter * 0.9,
        pCageOuter * 0.4
      )
      const outerScale = 1.012 - pCageOuter * 0.25
      disCageOuterRef.current.scale.setScalar(outerScale)
    }

    // Aplicar transformación de desarme a la Corteza Cristal (Capa 2)
    if (disLayer2Ref.current) {
      disLayer2Ref.current.position.set(
        pCortex * 2.25,
        -pCortex * 0.35,
        pCortex * 0.55
      )
      disLayer2Ref.current.rotation.set(
        pCortex * 0.5,
        pCortex * 1.1,
        -pCortex * 0.4
      )
      const cortexScale = 1 - pCortex * 0.1
      disLayer2Ref.current.scale.setScalar(cortexScale)
    }

    // Aplicar transformación de desarme al Núcleo (Capa 1) y emerger la Singularidad Interna
    if (disLayer1Ref.current) {
      disLayer1Ref.current.position.set(
        0,
        pCore * 0.35,
        pCore * 1.25
      )
      const coreScale = 1 + pCore * 0.18
      disLayer1Ref.current.scale.setScalar(coreScale)
    }
    if (disInnerCoreRef.current) {
      disInnerCoreRef.current.position.set(
        0,
        -pCore * 0.55,
        -pCore * 0.45
      )
      const innerScale = 0.01 + pCore * 0.95
      disInnerCoreRef.current.scale.setScalar(innerScale)
      disInnerCoreRef.current.rotation.y -= dt * 1.4 * speed
      disInnerCoreRef.current.rotation.z += dt * 0.9 * speed
    }

    // ========================================================================
    // 2. PARALLAX MAGNÉTICO CON EL CURSOR (Mantenido íntegro durante el scroll)
    // ========================================================================
    const layersConfig = [
      {
        ref: layer1Ref,
        posStrength: 0.18,
        rotStrength: 0.25,
        lerpFactor: 0.035,
      },
      {
        ref: layer2Ref,
        posStrength: 0.36,
        rotStrength: 0.42,
        lerpFactor: 0.055,
      },
      {
        ref: layer3Ref,
        posStrength: 0.58,
        rotStrength: 0.62,
        lerpFactor: 0.08,
      },
      {
        ref: layer4Ref,
        posStrength: 0.88,
        rotStrength: 0.85,
        lerpFactor: 0.115,
      },
    ]

    layersConfig.forEach(({ ref, posStrength, rotStrength, lerpFactor }) => {
      if (!ref.current) return
      ref.current.position.x = THREE.MathUtils.lerp(
        ref.current.position.x,
        px * posStrength,
        lerpFactor
      )
      ref.current.position.y = THREE.MathUtils.lerp(
        ref.current.position.y,
        py * posStrength,
        lerpFactor
      )
      ref.current.rotation.x = THREE.MathUtils.lerp(
        ref.current.rotation.x,
        -py * rotStrength,
        lerpFactor
      )
      ref.current.rotation.y = THREE.MathUtils.lerp(
        ref.current.rotation.y,
        px * rotStrength,
        lerpFactor
      )
    })

    // ========================================================================
    // 3. ROTACIÓN ORBITAL AUTÓNOMA POR CAPA
    // ========================================================================
    if (spin1Ref.current) {
      spin1Ref.current.rotation.y += dt * 0.45 * speed
      spin1Ref.current.rotation.x += dt * 0.22 * speed
    }
    if (spin2Ref.current) {
      spin2Ref.current.rotation.y -= dt * 0.32 * speed
      spin2Ref.current.rotation.z += dt * 0.18 * speed
    }
    if (spin3Ref.current) {
      spin3Ref.current.rotation.y += dt * 0.25 * speed
      spin3Ref.current.rotation.x -= dt * 0.15 * speed
    }

    if (ringARef.current) {
      ringARef.current.rotation.z += dt * 0.75 * speed
      ringARef.current.rotation.x += dt * 0.25 * speed
    }
    if (ringBRef.current) {
      ringBRef.current.rotation.y -= dt * 0.65 * speed
      ringBRef.current.rotation.z += dt * 0.3 * speed
    }
    if (ringCRef.current) {
      ringCRef.current.rotation.x += dt * 0.85 * speed
      ringCRef.current.rotation.y += dt * 0.4 * speed
    }

    // ========================================================================
    // 4. LUCES PUNTUALES CROMÁTICAS QUE SIGUEN AL CURSOR
    // ========================================================================
    if (pointLight1Ref.current) {
      pointLight1Ref.current.position.x = THREE.MathUtils.lerp(
        pointLight1Ref.current.position.x,
        3.5 + px * 3.2,
        0.06
      )
      pointLight1Ref.current.position.y = THREE.MathUtils.lerp(
        pointLight1Ref.current.position.y,
        2.5 + py * 3.2,
        0.06
      )
    }
    if (pointLight2Ref.current) {
      pointLight2Ref.current.position.x = THREE.MathUtils.lerp(
        pointLight2Ref.current.position.x,
        -3.5 - px * 2.8,
        0.045
      )
      pointLight2Ref.current.position.y = THREE.MathUtils.lerp(
        pointLight2Ref.current.position.y,
        -2.5 - py * 2.8,
        0.045
      )
    }
  })

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.35} />

      {/* 2 Luces puntuales de colores que siguen sutilmente al mouse */}
      <pointLight
        ref={pointLight1Ref}
        position={[3.5, 2.5, 4]}
        intensity={45}
        distance={16}
        decay={2}
        color={lightColors[0]}
      />
      <pointLight
        ref={pointLight2Ref}
        position={[-3.5, -2.5, 3.5]}
        intensity={40}
        distance={16}
        decay={2}
        color={lightColors[1]}
      />

      <Float speed={1.6} rotationIntensity={0.12} floatIntensity={0.28}>
        <group
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        >
          {/* ================================================================
              CAPA 1 (NÚCLEO): Dodecaedro central con flatShading + Singularidad interna al desarmar
             ================================================================ */}
          <group ref={layer1Ref}>
            <group ref={disLayer1Ref}>
              <group ref={spin1Ref}>
                <mesh castShadow receiveShadow>
                  <dodecahedronGeometry args={[0.85, 0]} />
                  <meshStandardMaterial
                    ref={mat1Ref}
                    color={colors[0]}
                    flatShading={true}
                    metalness={0.94}
                    roughness={0.12}
                    wireframe={globalWireframe}
                  />
                </mesh>
              </group>
            </group>

            {/* Sub-núcleo energético que queda expuesto al desarmar la Capa 1 en el final del scroll */}
            <group ref={disInnerCoreRef} scale={0.01}>
              <mesh>
                <octahedronGeometry args={[0.52, 1]} />
                <meshStandardMaterial
                  ref={matInnerCoreRef}
                  color={colors[1]}
                  emissive={colors[0]}
                  emissiveIntensity={0.85}
                  wireframe={true}
                />
              </mesh>
            </group>
          </group>

          {/* ================================================================
              CAPA 2 (CORTEZA CRISTAL): Icosaedro envolvente con MeshTransmissionMaterial
             ================================================================ */}
          <group ref={layer2Ref}>
            <group ref={disLayer2Ref}>
              <group ref={spin2Ref}>
                <mesh>
                  <icosahedronGeometry args={[1.36, 0]} />
                  <MeshTransmissionMaterial
                    ref={mat2Ref}
                    color={colors[1]}
                    transmission={globalWireframe ? 0.2 : 0.96}
                    thickness={1.4}
                    roughness={0.08}
                    ior={1.45}
                    chromaticAberration={0.06}
                    anisotropy={0.2}
                    distortion={0.15}
                    distortionScale={0.25}
                    temporalDistortion={0.1}
                    backside={true}
                    samples={6}
                    resolution={512}
                    wireframe={globalWireframe}
                  />
                </mesh>
              </group>
            </group>
          </group>

          {/* ================================================================
              CAPA 3 (JAULA GEOMÉTRICA): Esfera geodésica en modo wireframe grueso (se divide en 2 al scrollear)
             ================================================================ */}
          <group ref={layer3Ref}>
            <group ref={spin3Ref}>
              {/* Armazón Geodésico Principal */}
              <group ref={disCageMainRef}>
                <mesh geometry={cageGeo}>
                  <meshStandardMaterial
                    ref={mat3Ref}
                    color={colors[2]}
                    emissive={colors[2]}
                    emissiveIntensity={0.45}
                    metalness={0.85}
                    roughness={0.2}
                    wireframe={true}
                    wireframeLinewidth={3}
                  />
                </mesh>
              </group>

              {/* Armazón Geodésico Secundario (se separa al hacer scroll) */}
              <group ref={disCageOuterRef} scale={1.012}>
                <mesh geometry={cageGeo}>
                  <meshBasicMaterial
                    ref={mat3InnerRef}
                    color={colors[2]}
                    wireframe={true}
                    transparent={true}
                    opacity={0.48}
                  />
                </mesh>
              </group>
            </group>
          </group>

          {/* ================================================================
              CAPA 4 (ANILLOS GIROSCÓPICOS + PARTÍCULAS): Cada anillo se desarma en su propio vector
             ================================================================ */}
          <group ref={layer4Ref}>
            <group ref={spin4Ref}>
              {/* Anillo Orbital 1 (Interior) */}
              <group ref={disRingARef}>
                <group rotation={[Math.PI * 0.22, Math.PI * 0.1, 0]}>
                  <mesh ref={ringARef}>
                    <torusGeometry args={[2.32, 0.045, 24, 120]} />
                    <meshStandardMaterial
                      ref={matRingARef}
                      color={colors[3]}
                      metalness={0.9}
                      roughness={0.15}
                      wireframe={globalWireframe}
                    />
                  </mesh>
                </group>
              </group>

              {/* Anillo Orbital 2 (Medio) */}
              <group ref={disRingBRef}>
                <group rotation={[-Math.PI * 0.3, Math.PI * 0.28, Math.PI * 0.15]}>
                  <mesh ref={ringBRef}>
                    <torusGeometry args={[2.68, 0.032, 20, 128]} />
                    <meshStandardMaterial
                      ref={matRingBRef}
                      color={colors[3]}
                      metalness={0.92}
                      roughness={0.12}
                      wireframe={globalWireframe}
                    />
                  </mesh>
                </group>
              </group>

              {/* Anillo Orbital 3 (Exterior) */}
              <group ref={disRingCRef}>
                <group rotation={[Math.PI * 0.42, -Math.PI * 0.2, -Math.PI * 0.25]}>
                  <mesh ref={ringCRef}>
                    <torusGeometry args={[3.02, 0.022, 16, 140]} />
                    <meshStandardMaterial
                      ref={matRingCRef}
                      color={colors[3]}
                      metalness={0.95}
                      roughness={0.1}
                      wireframe={globalWireframe}
                    />
                  </mesh>
                </group>
              </group>

              {/* Sistema de Partículas (Sparkles de Drei) */}
              <Sparkles
                count={110}
                scale={6.2}
                size={2.6}
                speed={0.55 * Math.max(0.3, baseRotationSpeed)}
                opacity={0.85}
                color={colors[3]}
              />
              <Sparkles
                count={55}
                scale={2.8}
                size={3.8}
                speed={0.8 * Math.max(0.3, baseRotationSpeed)}
                opacity={0.9}
                color={colors[0]}
              />
            </group>
          </group>

          {/* Onda de Choque Visual para el Click */}
          <mesh ref={shockwaveRef} scale={0.6}>
            <icosahedronGeometry args={[1.2, 2]} />
            <meshBasicMaterial
              ref={shockwaveMatRef}
              color={colors[1]}
              wireframe={true}
              transparent={true}
              opacity={0}
            />
          </mesh>
        </group>
      </Float>

      {/* Sombra de contacto sobre el piso del laboratorio */}
      <ContactShadows
        position={[0, -3.85, 0]}
        opacity={0.55}
        scale={16}
        blur={2.6}
        far={6.5}
        color={colors[1]}
      />
    </>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL (EXPERIENCIA WEB 3D + SCROLL DE DESARMADO + PANEL UI)
// ============================================================================
export default function App() {
  const [activePalette, setActivePalette] = useState('cyberpunk')
  const [layerColors, setLayerColors] = useState(PALETTES.cyberpunk.layers)
  const [lightColors, setLightColors] = useState(PALETTES.cyberpunk.lights)

  // Controles de personalización en vivo
  const [globalWireframe, setGlobalWireframe] = useState(false)
  const [manualExpansion, setManualExpansion] = useState(0)
  const [baseRotationSpeed, setBaseRotationSpeed] = useState(1.0)
  const [forceExploded, setForceExploded] = useState(false)
  const [pulseTrigger, setPulseTrigger] = useState(0)

  // Control de animación de Scroll (bajar desarma poco a poco, subir vuelve a armar poco a poco)
  const scrollProgressRef = useRef(0)
  const [scrollPercent, setScrollPercent] = useState(0)

  // Estados de feedback interactivo
  const [isHovered, setIsHovered] = useState(false)
  const [isPulsing, setIsPulsing] = useState(false)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const pointerTelemetryRef = useRef({ x: 0, y: 0 })
  const [telemetryDisplay, setTelemetryDisplay] = useState({
    x: '0.00',
    y: '0.00',
  })

  // --------------------------------------------------------------------------
  // Listener de Scroll: Bajar desarma la figura poco a poco; subir la vuelve a armar poco a poco
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      )
      const rawProgress = clamp01(scrollTop / maxScroll)
      scrollProgressRef.current = rawProgress
      setScrollPercent(Math.round(rawProgress * 100))
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Reensamblar figura rápidamente haciendo scroll suave al inicio
  const handleReassembleScroll = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Actualizar lectura de coordenadas del cursor para el HUD
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetryDisplay({
        x: pointerTelemetryRef.current.x.toFixed(2),
        y: pointerTelemetryRef.current.y.toFixed(2),
      })
    }, 90)
    return () => clearInterval(interval)
  }, [])

  // Seleccionar un preset de paleta completo
  const handleSelectPalette = (paletteKey) => {
    const preset = PALETTES[paletteKey]
    if (!preset) return
    setActivePalette(paletteKey)
    setLayerColors([...preset.layers])
    setLightColors([...preset.lights])
  }

  // Cambiar el color individual de una capa desde el color picker
  const handleLayerColorChange = (index, newHex) => {
    setActivePalette('custom')
    setLayerColors((prev) => {
      const next = [...prev]
      next[index] = newHex
      return next
    })
    if (index === 0 || index === 1) {
      setLightColors((prev) => {
        const next = [...prev]
        next[index] = newHex
        return next
      })
    }
  }

  // Resetear todos los parámetros del laboratorio + reensamblar scroll
  const handleReset = () => {
    handleSelectPalette('cyberpunk')
    setGlobalWireframe(false)
    setManualExpansion(0)
    setBaseRotationSpeed(1.0)
    setForceExploded(false)
    handleReassembleScroll()
  }

  // Etapa activa según el porcentaje de desarme
  const currentStage = useMemo(() => {
    const p = scrollPercent / 100
    return (
      DISASSEMBLY_STAGES.find((st) => p >= st.range[0] && p <= st.range[1]) ||
      DISASSEMBLY_STAGES[0]
    )
  }, [scrollPercent])

  return (
    <div className="relative w-full min-h-[450vh] bg-[#09090b] text-zinc-100 font-sans select-none">
      {/* ====================================================================
          VIEWPORT FIJO 3D: Mantiene el Canvas y las interacciones activas durante todo el scroll
         ==================================================================== */}
      <div className="fixed inset-0 w-screen h-screen overflow-hidden">
        {/* Resplandor ambiental de fondo */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25 transition-all duration-1000"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${layerColors[1]}22 0%, ${layerColors[0]}11 35%, transparent 70%)`,
          }}
        />

        {/* Lienzo 3D React Three Fiber */}
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 0, 7.6], fov: 42 }}
          gl={{ antialias: true, alpha: false }}
          onCreated={({ gl }) => {
            gl.setClearColor('#09090b')
          }}
        >
          <color attach="background" args={['#09090b']} />
          <fog attach="fog" args={['#09090b', 11, 25]} />

          <MultilayerArtifact
            colors={layerColors}
            lightColors={lightColors}
            globalWireframe={globalWireframe}
            manualExpansion={manualExpansion}
            baseRotationSpeed={baseRotationSpeed}
            pulseTrigger={pulseTrigger}
            forceExploded={forceExploded}
            scrollProgressRef={scrollProgressRef}
            onHoverChange={setIsHovered}
            onPulseActive={setIsPulsing}
            pointerTelemetryRef={pointerTelemetryRef}
          />
        </Canvas>
      </div>

      {/* ====================================================================
          HUD SUPERIOR IZQUIERDO: Identidad del Laboratorio Visual & Estado
         ==================================================================== */}
      <header className="pointer-events-none fixed top-6 left-6 z-20 flex flex-col gap-2 max-w-md">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 rounded-full animate-pulse"
            style={{
              backgroundColor: layerColors[1],
              boxShadow: `0 0 12px ${layerColors[1]}`,
            }}
          />
          <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-400">
            AETHER LAB // MULTILAYER GEOMETRY
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white/95">
          Núcleo Giroscópico Multicapa
        </h1>

        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
          Haz <span className="text-zinc-200 font-medium">scroll hacia abajo</span>{' '}
          para desarmar la figura poco a poco y{' '}
          <span className="text-zinc-200 font-medium">scroll hacia arriba</span>{' '}
          para volver a armarla. Todas las interacciones siguen activas.
        </p>

        {/* Badges de Telemetría en Tiempo Real */}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <div className="px-2.5 py-1 rounded-md bg-zinc-900/80 border border-white/10 backdrop-blur-md text-zinc-300">
            PTR X: <span className="text-white">{telemetryDisplay.x}</span> · Y:{' '}
            <span className="text-white">{telemetryDisplay.y}</span>
          </div>

          <div
            className={`px-2.5 py-1 rounded-md border backdrop-blur-md transition-colors duration-300 ${
              isHovered || forceExploded
                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                : 'bg-zinc-900/80 border-white/10 text-zinc-400'
            }`}
          >
            {isHovered || forceExploded
              ? 'HOVER: EXPLODED'
              : 'HOVER: COMPACTO'}
          </div>

          <div className="px-2.5 py-1 rounded-md bg-zinc-900/80 border border-white/10 backdrop-blur-md text-zinc-300">
            DESARMADO:{' '}
            <span
              className="font-semibold"
              style={{ color: layerColors[1] }}
            >
              {scrollPercent}%
            </span>
          </div>

          {isPulsing && (
            <div className="px-2.5 py-1 rounded-md bg-fuchsia-500/20 border border-fuchsia-400/50 text-fuchsia-200 animate-pulse">
              PULSO 360° ACTIVO
            </div>
          )}
        </div>
      </header>

      {/* ====================================================================
          HUD LATERAL IZQUIERDO INFERIOR: Progreso de Desarmado / Ensamblaje por Scroll
         ==================================================================== */}
      <div className="fixed bottom-6 left-6 z-20 flex flex-col gap-3 max-w-xs">
        <div className="p-4 rounded-2xl bg-zinc-950/75 backdrop-blur-xl border border-white/10 shadow-2xl space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-200" />
              Scroll: Bajar Desarma · Subir Arma
            </span>
            <span className="text-xs font-mono font-semibold text-white">
              {scrollPercent}%
            </span>
          </div>

          {/* Barra de progreso visual del desarme */}
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full transition-all duration-150 rounded-full"
              style={{
                width: `${scrollPercent}%`,
                background: `linear-gradient(90deg, ${layerColors[0]}, ${layerColors[1]}, ${layerColors[3]})`,
              }}
            />
          </div>

          {/* Descripción de la fase actual */}
          <div className="pt-0.5">
            <div className="text-xs font-semibold text-zinc-100">
              {currentStage.title}
            </div>
            <div className="text-[11px] text-zinc-400 leading-snug mt-0.5">
              {currentStage.desc}
            </div>
          </div>

          {scrollPercent > 0 && (
            <div className="pt-1 flex items-center">
              <button
                onClick={handleReassembleScroll}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-mono text-white transition-colors cursor-pointer"
              >
                Volver arriba (Ensamblar 0%)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ====================================================================
          PANEL UI FLOTANTE DE PERSONALIZACIÓN EN VIVO (GLASSMORPHISM OSCURO)
         ==================================================================== */}
      <aside className="
        fixed top-6 right-6 z-20
        w-[340px] sm:w-[365px] max-h-[calc(100vh-3rem)]
        flex flex-col
        rounded-2xl
        bg-zinc-950/75 backdrop-blur-xl
        border border-white/10
        shadow-[0_24px_60px_rgba(0,0,0,0.75)]
        overflow-hidden
        transition-all duration-300
      ">
        {/* Cabecera del Panel */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-200">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">
                Panel de Laboratorio
              </h2>
              <p className="text-[11px] font-mono text-zinc-400">
                {PALETTES[activePalette]?.badge || 'CUSTOM // PALETTE'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleReset}
              title="Restablecer valores y reensamblar"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPanelCollapsed((v) => !v)}
              title={isPanelCollapsed ? 'Expandir panel' : 'Minimizar panel'}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {isPanelCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Cuerpo del Panel */}
        {!isPanelCollapsed && (
          <div className="p-5 space-y-5 overflow-y-auto">
            {/* 1. Presets de Paletas (Neón, Pastel, Monocromático, Cyberpunk) */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-zinc-400" />
                  Presets de Paleta (GSAP Color)
                </span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">
                  4 Capas
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {Object.values(PALETTES).map((preset) => {
                  const isSelected = activePalette === preset.id
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPalette(preset.id)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white/12 border-white/30 text-white shadow-sm'
                          : 'bg-zinc-900/60 border-white/8 text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                      }`}
                    >
                      <span>{preset.label}</span>
                      <span className="flex items-center -space-x-1">
                        {preset.layers.map((hex, i) => (
                          <span
                            key={i}
                            className="w-3 h-3 rounded-full border border-zinc-950"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* 2. Selectores de Color Individuales por Capa */}
            <section className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" />
                  Color por Capa Concéntrica
                </span>
              </div>

              <div className="space-y-1.5">
                {LAYER_META.map((layer, idx) => (
                  <label
                    key={layer.key}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/55 border border-white/6 hover:border-white/15 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">
                        {layer.tag}
                      </span>
                      <span className="text-xs text-zinc-200">{layer.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-zinc-400 uppercase">
                        {layerColors[idx]}
                      </span>
                      <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-white/20 shadow-inner">
                        <input
                          type="color"
                          value={layerColors[idx]}
                          onChange={(e) =>
                            handleLayerColorChange(idx, e.target.value)
                          }
                          className="absolute -inset-2 w-10 h-10 cursor-pointer opacity-0"
                        />
                        <div
                          className="w-full h-full"
                          style={{ backgroundColor: layerColors[idx] }}
                        />
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* 3. Sliders de Expansión Manual y Velocidad de Rotación Base */}
            <section className="space-y-4 pt-1 border-t border-white/10">
              {/* Distancia de Separación entre Capas */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                    <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
                    Separación de Capas (Expansión)
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {Math.round(manualExpansion * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.2"
                  step="0.02"
                  value={manualExpansion}
                  onChange={(e) =>
                    setManualExpansion(parseFloat(e.target.value))
                  }
                  className="w-full"
                  style={{
                    background: `linear-gradient(to right, ${layerColors[1]} 0%, ${
                      layerColors[1]
                    } ${(manualExpansion / 1.2) * 100}%, rgba(255,255,255,0.12) ${
                      (manualExpansion / 1.2) * 100
                    }%, rgba(255,255,255,0.12) 100%)`,
                    borderRadius: '999px',
                    height: '6px',
                  }}
                />
              </div>

              {/* Velocidad de Rotación Base */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                    <SparklesIcon className="w-3.5 h-3.5 text-zinc-400" />
                    Velocidad de Rotación Base
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {baseRotationSpeed.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3.0"
                  step="0.1"
                  value={baseRotationSpeed}
                  onChange={(e) =>
                    setBaseRotationSpeed(parseFloat(e.target.value))
                  }
                  className="w-full"
                  style={{
                    background: `linear-gradient(to right, ${layerColors[0]} 0%, ${
                      layerColors[0]
                    } ${(baseRotationSpeed / 3.0) * 100}%, rgba(255,255,255,0.12) ${
                      (baseRotationSpeed / 3.0) * 100
                    }%, rgba(255,255,255,0.12) 100%)`,
                    borderRadius: '999px',
                    height: '6px',
                  }}
                />
              </div>
            </section>

            {/* 4. Toggles y Acciones Rápidas */}
            <section className="space-y-2.5 pt-1 border-t border-white/10">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setGlobalWireframe((w) => !w)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    globalWireframe
                      ? 'bg-white/15 border-white/35 text-white shadow-sm'
                      : 'bg-zinc-900/60 border-white/8 text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Wireframe {globalWireframe ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  onClick={() => setForceExploded((f) => !f)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    forceExploded
                      ? 'bg-white/15 border-white/35 text-white shadow-sm'
                      : 'bg-zinc-900/60 border-white/8 text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Exploded {forceExploded ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              <button
                onClick={() => setPulseTrigger((c) => c + 1)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-950 transition-transform active:scale-[0.98] cursor-pointer shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${layerColors[1]}, ${layerColors[0]})`,
                }}
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Disparar Onda de Choque (Pulso 360°)</span>
              </button>
            </section>
          </div>
        )}
      </aside>
    </div>
  )
}
