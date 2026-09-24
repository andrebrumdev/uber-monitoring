import { REDUCED_MOTION_QUERY } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useEffect, useId, useRef } from 'react'

/**
 * A fita: um traço contínuo de luz (verde-água → lilás → violeta) que representa a corrida do mês.
 * Puramente decorativa. A crista (o ponto onde a fita torce) se curva até 12px na direção do
 * cursor; com prefers-reduced-motion ela fica parada.
 */

type Orientation = 'vertical' | 'horizontal'

interface Shape {
  viewBox: { width: number; height: number }
  /** Ponto da crista, em unidades do viewBox. */
  crest: { x: number; y: number }
  /** Corpo da fita, com a crista deslocada em (dx, dy). */
  band: (dx: number, dy: number) => string
  /** Brilho que dá volume à face da fita. */
  sheen: (dx: number, dy: number) => string
  /** Segunda dobra, mais transparente, atrás da fita. */
  fold: string
  gradient: { x1: number; y1: number; x2: number; y2: number }
}

const SHAPES: Record<Orientation, Shape> = {
  vertical: {
    viewBox: { width: 600, height: 1000 },
    crest: { x: 230, y: 520 },
    band: (dx, dy) =>
      `M 330 -60 C 140 170 60 390 ${200 + dx} ${540 + dy} C 330 660 420 820 380 1060 L 660 1060 L 660 900 C 520 760 380 600 ${260 + dx} ${500 + dy} C 150 400 380 160 640 -60 Z`,
    sheen: (dx, dy) =>
      `M 520 -60 C 330 150 180 350 ${235 + dx} ${512 + dy} C 330 640 460 800 560 1060`,
    fold: 'M 660 360 C 540 520 430 720 300 1060 L 660 1060 Z',
    gradient: { x1: 0.2, y1: 0, x2: 0.55, y2: 1 }
  },
  horizontal: {
    viewBox: { width: 1200, height: 160 },
    crest: { x: 550, y: 82 },
    band: (dx, dy) =>
      `M -60 10 C 200 -20 400 40 ${560 + dx} ${70 + dy} C 720 100 940 20 1260 -10 L 1260 60 C 960 110 700 150 ${540 + dx} ${95 + dy} C 380 110 180 80 -60 70 Z`,
    sheen: (dx, dy) => `M -60 30 C 200 10 400 60 ${550 + dx} ${82 + dy} C 720 110 940 50 1260 20`,
    fold: 'M 700 180 C 820 120 1000 80 1260 90 L 1260 180 Z',
    gradient: { x1: 0, y1: 0.4, x2: 1, y2: 0.6 }
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
  const sheenRef = useRef<SVGPathElement>(null)

  // Crista que segue o cursor.
  useEffect(() => {
    const motion = window.matchMedia(REDUCED_MOTION_QUERY)
    let frame = 0

    const setCrest = (dx: number, dy: number): void => {
      bandRef.current?.style.setProperty('d', `path("${shape.band(dx, dy)}")`)
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
          <stop offset="0" style={{ stopColor: 'var(--ribbon-2)' }} stopOpacity="0" />
          <stop offset="1" style={{ stopColor: 'var(--ribbon-2)' }} stopOpacity="0.55" />
        </linearGradient>
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
