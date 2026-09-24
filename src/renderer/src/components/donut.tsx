import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import * as React from 'react'
import { Label, Pie, PieChart } from 'recharts'

export interface DonutItem {
  /** Chave em `config`; dá cor (`--color-<key>`), rótulo e ícone. */
  key: string
  value: number
}

interface DonutChartProps {
  items: DonutItem[]
  config: ChartConfig
  /** Legenda do número no centro, ex.: "Total do mês". */
  caption: string
  format: (value: number) => string
  className?: string
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Rosca com total no centro e legenda ao lado (ícone, rótulo, valor), nas cores da fita. */
export function DonutChart({ items, config, caption, format, className }: DonutChartProps) {
  const total = items.reduce((acc, item) => acc + item.value, 0)
  const data = React.useMemo(
    () => items.map((item) => ({ ...item, fill: `var(--color-${item.key})` })),
    [items]
  )
  const animate = React.useMemo(() => !prefersReducedMotion(), [])

  return (
    <figure className={cn('flex flex-col gap-5', className)}>
      <ChartContainer
        config={config}
        className="mx-auto aspect-square w-[200px] shrink-0"
        role="img"
        aria-label={`${caption}: ${format(total)}. ${items
          .map((item) => `${config[item.key]?.label ?? item.key}: ${format(item.value)}`)
          .join('; ')}.`}
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel valueFormatter={format} />}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="key"
            innerRadius="68%"
            outerRadius="100%"
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={animate}
            animationDuration={800}
            animationEasing="ease-out"
          >
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !('cx' in viewBox) || !('cy' in viewBox)) return undefined
                const cx = viewBox.cx ?? 0
                const cy = viewBox.cy ?? 0
                return (
                  <text x={cx} y={cy} textAnchor="middle">
                    <tspan x={cx} y={cy - 8} className="fill-muted-foreground text-[13px]">
                      {caption}
                    </tspan>
                    <tspan x={cx} y={cy + 16} className="fill-foreground text-lg font-medium">
                      {format(total)}
                    </tspan>
                  </text>
                )
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="flex min-w-0 flex-1 flex-col text-sm">
        {items.map((item) => {
          const itemConfig = config[item.key]
          const Icon = itemConfig?.icon
          return (
            <li
              key={item.key}
              className="flex items-center gap-2.5 border-b border-border py-2 last:border-b-0"
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: itemConfig?.color }}
              />
              {Icon && (
                <span aria-hidden className="flex text-muted-foreground [&>svg]:size-3.5">
                  <Icon />
                </span>
              )}
              <span className="text-muted-foreground">{itemConfig?.label ?? item.key}</span>
              <span className="ml-auto text-foreground">{format(item.value)}</span>
            </li>
          )
        })}
      </ul>
    </figure>
  )
}
