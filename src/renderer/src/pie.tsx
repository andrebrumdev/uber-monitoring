'use client'

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart'
import * as React from 'react'
import { Label, Pie, PieChart } from 'recharts'

interface Props<T> {
  data: T[]
  dataKey: keyof T
  nameKey: keyof T
  config: ChartConfig
  format?: (value: number) => string | number
}
export function PieChartTest<T>({ data, dataKey, nameKey, config, format }: Props<T>) {
  data = data.map((d) => ({ ...d, fill: `var(--color-${d[nameKey]?.toString().toLowerCase()})` }))
  const totalVisitors = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr[dataKey] as number), 0)
  }, [data])
  return (
    <ChartContainer config={config} className="mx-auto aspect-square max-h-[250px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel shared />} />
        <Pie
          data={data}
          dataKey={dataKey.toString()}
          nameKey={nameKey.toString()}
          innerRadius={60}
          strokeWidth={5}
        >
          <Label
            content={({ viewBox }) => {
              if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-2xl font-bold"
                    >
                      {format ? format(totalVisitors) : totalVisitors.toLocaleString()}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 20}
                      className="fill-muted-foreground"
                    >
                      {dataKey.toString()}
                    </tspan>
                  </text>
                )
              }
              return undefined
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
