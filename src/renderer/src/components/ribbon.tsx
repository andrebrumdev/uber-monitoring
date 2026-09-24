import { REDUCED_MOTION_QUERY } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useEffect, useId, useRef } from 'react'

/**
 * A fita: um traço contínuo de luz (verde-água → lilás → violeta) que representa a corrida do mês.
 * Puramente decorativa. A crista (o ponto onde a fita torce) se curva até 12px na direção do
 * cursor; com prefers-reduced-motion ela fica parada.
 *
 * Camadas, de trás para a frente: a dobra (segunda volta, translúcida), o corpo da fita (um
 * pouco translúcido, para a dobra aparecer através dele), o verso (a face de trás que aparece
 * onde a fita vira, em violeta) e o brilho.
 */

type Orientation = 'vertical' | 'horizontal'
type Pt = readonly [number, number]
type Cubic = readonly [Pt, Pt, Pt, Pt]

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k]
const fmt = (p: Pt): string => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`

/** Divide uma cúbica em t (de Casteljau). */
function split(c: Cubic, t: number): [Cubic, Cubic] {
  const [p0, p1, p2, p3] = c
  const a = lerp(p0, p1, t)
  const b = lerp(p1, p2, t)
  const d = lerp(p2, p3, t)
  const e = lerp(a, b, t)
  const f = lerp(b, d, t)
  const m = lerp(e, f, t)
  return [
    [p0, a, e, m],
    [m, f, d, p3]
  ]
}

const curve = (c: Cubic): string => `C ${fmt(c[1])} ${fmt(c[2])} ${fmt(c[3])}`

interface Edge {
  /** As duas cúbicas da borda que passa pela virada da fita; a junção é a crista. */
  into: Cubic
  out: Cubic
}

interface Shape {
  viewBox: { width: number; height: number }
  /** Ponto da crista, em unidades do viewBox. */
  crest: { x: number; y: number }
  /** Corpo da fita, com a crista deslocada em (dx, dy). */
  band: (dx: number, dy: number) => string
  /** Verso da fita onde ela vira, com a crista deslocada em (dx, dy). */
  back: (dx: number, dy: number) => string
  /** Brilho que dá volume à face da fita. */
  sheen: (dx: number, dy: number) => string
  /** Segunda dobra, mais transparente, atrás da fita. */
  fold: string
  gradient: { x1: number; y1: number; x2: number; y2: number }
  /** Centro e raio do brilho do verso (userSpaceOnUse). */
  backGlow: { cx: number; cy: number; r: number }
}

/**
 * Lente do verso: segue a borda da fita de `into(t0)` até `out(t1)` e volta por dentro da fita,
 * afastada da borda até `depth` na junção. Como segue a mesma borda, o verso nunca vaza da fita.
 */
function backFace({ into, out }: Edge, t0: number, t1: number, depth: number, side: 1 | -1) {
  const tail = split(into, t0)[1]
  const head = split(out, t1)[0]
  const joint = into[3]
  const tx = joint[0] - into[2][0]
  const ty = joint[1] - into[2][1]
  const len = Math.hypot(tx, ty) || 1
  const n: Pt = [(-ty / len) * side, (tx / len) * side]
  return [
    `M ${fmt(tail[0])}`,
    curve(tail),
    curve(head),
    `C ${fmt(add(head[2], n, depth * 0.5))} ${fmt(add(head[1], n, depth))} ${fmt(add(joint, n, depth))}`,
    `C ${fmt(add(tail[2], n, depth))} ${fmt(add(tail[1], n, depth * 0.5))} ${fmt(tail[0])}`,
    'Z'
  ].join(' ')
}

/** Borda interna da fita vertical; a junção (a crista interna) é arredondada, sem quina. */
const verticalInner = (dx: number, dy: number): Edge => {
  const j: Pt = [260 + dx, 500 + dy]
  return {
    into: [[660, 900], [520, 760], add(j, [100, 90]), j],
    out: [j, add(j, [-100, -90]), [380, 160], [640, -60]]
  }
}

/** Borda de baixo da fita horizontal, com a mesma junção lisa. */
const horizontalLower = (dx: number, dy: number): Edge => {
  const j: Pt = [540 + dx, 95 + dy]
  return {
    into: [[1260, 60], [960, 110], add(j, [160, 17]), j],
    out: [j, add(j, [-160, -17]), [180, 80], [-60, 70]]
  }
}

const SHAPES: Record<Orientation, Shape> = {
  vertical: {
    viewBox: { width: 600, height: 1000 },
    crest: { x: 230, y: 520 },
    band: (dx, dy) => {
      const inner = verticalInner(dx, dy)
      return `M 330 -60 C 140 170 60 390 ${200 + dx} ${540 + dy} C 330 680 420 820 380 1060 L 660 1060 L 660 900 ${curve(inner.into)} ${curve(inner.out)} Z`
    },
    back: (dx, dy) => backFace(verticalInner(dx, dy), 0.55, 0.42, 38, -1),
    sheen: (dx, dy) =>
      `M 520 -60 C 330 150 180 350 ${235 + dx} ${512 + dy} C 330 640 460 800 560 1060`,
    fold: 'M 660 360 C 540 520 430 720 300 1060 L 660 1060 Z',
    gradient: { x1: 0.2, y1: 0, x2: 0.55, y2: 1 },
    backGlow: { cx: 250, cy: 500, r: 190 }
  },
  horizontal: {
    viewBox: { width: 1200, height: 160 },
    crest: { x: 550, y: 82 },
    band: (dx, dy) => {
      const lower = horizontalLower(dx, dy)
      return `M -60 10 C 200 -20 400 40 ${560 + dx} ${70 + dy} C 720 100 940 20 1260 -10 L 1260 60 ${curve(lower.into)} ${curve(lower.out)} Z`
    },
    back: (dx, dy) => backFace(horizontalLower(dx, dy), 0.5, 0.45, 12, 1),
    sheen: (dx, dy) => `M -60 30 C 200 10 400 60 ${550 + dx} ${82 + dy} C 720 110 940 50 1260 20`,
    // Fica dentro do viewBox: a faixa de 120px não corta a dobra reta na borda de baixo.
    fold: 'M 700 160 C 820 118 1000 84 1260 92 L 1260 160 Z',
    gradient: { x1: 0, y1: 0.4, x2: 1, y2: 0.6 },
    backGlow: { cx: 540, cy: 92, r: 260 }
  }
}

/** Deslocamento máximo da crista, em px de tela. */
const CREST_REACH_PX = 12
/** Distância do cursor em que a crista atinge o deslocamento máximo. */
const CREST_RANGE_PX = 420

interface RibbonProps {
  orientation?: Orientation
  /** Enquanto verdadeiro, a deriva desacelera (sem pausar). */
  slow?: boolean
  className?: string
}

export function Ribbon({ orientation = 'vertical', slow = false, className }: RibbonProps) {
  const shape = SHAPES[orientation]
  const uid = useId().replace(/:/g, '')
  const svgRef = useRef<SVGSVGElement>(null)
  const driftRef = useRef<SVGGElement>(null)
  const bandRef = useRef<SVGPathElement>(null)
  const backRef = useRef<SVGPathElement>(null)
  const sheenRef = useRef<SVGPathElement>(null)

  // Crista que segue o cursor.
  useEffect(() => {
    const motion = window.matchMedia(REDUCED_MOTION_QUERY)
    let frame = 0

    const setCrest = (dx: number, dy: number): void => {
      bandRef.current?.style.setProperty('d', `path("${shape.band(dx, dy)}")`)
      backRef.current?.style.setProperty('d', `path("${shape.back(dx, dy)}")`)
      sheenRef.current?.style.setProperty('d', `path("${shape.sheen(dx, dy)}")`)
    }

    const onMove = (event: PointerEvent): void => {
      if (motion.matches) return
      const { clientX, clientY } = event
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const svg = svgRef.current
        if (!svg) return
        const rect = svg.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return
        // preserveAspectRatio="xMidYMid slice": a escala é a maior das duas.
        const scale = Math.max(rect.width / shape.viewBox.width, rect.height / shape.viewBox.height)
        const originX = rect.left + (rect.width - shape.viewBox.width * scale) / 2
        const originY = rect.top + (rect.height - shape.viewBox.height * scale) / 2
        const crestX = originX + shape.crest.x * scale
        const crestY = originY + shape.crest.y * scale
        const vx = clientX - crestX
        const vy = clientY - crestY
        const distance = Math.hypot(vx, vy) || 1
        const reach = (Math.min(distance, CREST_RANGE_PX) / CREST_RANGE_PX) * CREST_REACH_PX
        setCrest(((vx / distance) * reach) / scale, ((vy / distance) * reach) / scale)
      })
    }

    const onMotionChange = (): void => {
      if (motion.matches) setCrest(0, 0)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    motion.addEventListener('change', onMotionChange)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      motion.removeEventListener('change', onMotionChange)
    }
  }, [shape])

  // Desacelera a deriva enquanto o app trabalha, sem saltos.
  useEffect(() => {
    const group = driftRef.current
    if (!group || typeof group.getAnimations !== 'function') return
    for (const animation of group.getAnimations()) animation.updatePlaybackRate(slow ? 0.3 : 1)
  }, [slow])

  const { width, height } = shape.viewBox
  const g = shape.gradient
  const glow = shape.backGlow

  return (
    <svg
      ref={svgRef}
      aria-hidden
      focusable="false"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      className={cn('ribbon pointer-events-none select-none', className)}
    >
      <defs>
        <linearGradient id={`${uid}-band`} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>
          <stop offset="0" style={{ stopColor: 'var(--ribbon-1)' }} />
          <stop offset="0.5" style={{ stopColor: 'var(--ribbon-2)' }} />
          <stop offset="1" style={{ stopColor: 'var(--ribbon-3)' }} />
        </linearGradient>
        <linearGradient id={`${uid}-sheen`} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-fold`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--ribbon-fold)', stopOpacity: 0 }} />
          <stop
            offset="1"
            style={{ stopColor: 'var(--ribbon-fold)', stopOpacity: 'var(--ribbon-fold-opacity)' }}
          />
        </linearGradient>
        <radialGradient
          id={`${uid}-back`}
          gradientUnits="userSpaceOnUse"
          cx={glow.cx}
          cy={glow.cy}
          r={glow.r}
        >
          <stop offset="0" style={{ stopColor: 'var(--ribbon-3)', stopOpacity: 0.5 }} />
          <stop offset="0.6" style={{ stopColor: 'var(--ribbon-3)', stopOpacity: 0.28 }} />
          <stop offset="1" style={{ stopColor: 'var(--ribbon-3)', stopOpacity: 0 }} />
        </radialGradient>
        <filter id={`${uid}-soft`} x="-20%" y="-5%" width="140%" height="110%">
          <feGaussianBlur stdDeviation={orientation === 'vertical' ? 7 : 3} />
        </filter>
      </defs>
      <g ref={driftRef} className="ribbon-drift">
        <path d={shape.fold} fill={`url(#${uid}-fold)`} />
        <path
          ref={bandRef}
          className="ribbon-crest"
          d={shape.band(0, 0)}
          fill={`url(#${uid}-band)`}
          fillOpacity={0.9}
        />
        <path
          ref={backRef}
          className="ribbon-crest"
          d={shape.back(0, 0)}
          fill={`url(#${uid}-back)`}
        />
        <path
          ref={sheenRef}
          className="ribbon-crest"
          d={shape.sheen(0, 0)}
          fill="none"
          stroke={`url(#${uid}-sheen)`}
          strokeWidth={orientation === 'vertical' ? 34 : 10}
          strokeLinecap="round"
          filter={`url(#${uid}-soft)`}
        />
      </g>
    </svg>
  )
}
