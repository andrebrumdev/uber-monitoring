import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatToBRL } from 'brazilian-values'
import { Car, ChevronDown, CircleX, Coins, type LucideIcon } from 'lucide-react'
import React, { useId, useState } from 'react'
import { TableDetails } from './TableDetails'

type ReceiptType = Email['content']['type']

/** Rótulo, plural e ícone de cada tipo de recibo; a mesma ordem vale para a tabela e o gráfico. */
export const RECEIPT_TYPES: Record<
  ReceiptType,
  { label: string; singular: string; plural: string; icon: LucideIcon }
> = {
  viagem: { label: 'Viagem', singular: 'viagem', plural: 'viagens', icon: Car },
  recarga: { label: 'Recarga', singular: 'recarga', plural: 'recargas', icon: Coins },
  cancelada: { label: 'Cancelada', singular: 'cancelada', plural: 'canceladas', icon: CircleX }
}

const MONTHS_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez'
]

const plural = (count: number, singular: string, many: string): string =>
  `${count} ${count === 1 ? singular : many}`

/** O main manda a data como "dd/mm/aaaa" ou "dd/mm/aaaa, hh:mm:ss" (pt-BR). */
function ReceiptDate({ value }: { value: string }) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})(?:,?\s+(\d{2}):(\d{2}))?/.exec(value)
  if (!match) return <span>{value}</span>
  const [, day, month, year, hour, minute] = match
  const monthName = MONTHS_SHORT[Number(month) - 1]
  const iso = `${year}-${month}-${day}${hour ? `T${hour}:${minute}` : ''}`
  return (
    <time dateTime={iso} title={value}>
      {Number(day)} de {monthName}.
      {hour && <span className="text-muted-foreground">, {`${hour}:${minute}`}</span>}
    </time>
  )
}

const COLUMN_COUNT = 5

function ReceiptRow({ email }: { email: Email }) {
  const [open, setOpen] = useState(false)
  const detailsId = useId()
  const type = RECEIPT_TYPES[email.content.type]
  const Icon = type?.icon

  return (
    <>
      <TableRow data-state={open ? 'open' : 'closed'} className="data-[state=open]:border-b-0">
        <TableCell className="max-w-0 w-full truncate text-foreground" title={email.subject}>
          {email.subject}
        </TableCell>
        <TableCell className="text-foreground">
          <ReceiptDate value={email.date} />
        </TableCell>
        <TableCell>
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            {Icon && <Icon aria-hidden className="size-4" />}
            {type?.label ?? email.content.type}
          </span>
        </TableCell>
        <TableCell className="text-right text-foreground">
          {formatToBRL(email.content.total ?? 0)}
        </TableCell>
        <TableCell className="pr-3 text-right">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailsId}
            aria-label={open ? 'Ocultar detalhes' : 'Mostrar detalhes'}
            title={open ? 'Ocultar detalhes' : 'Mostrar detalhes'}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex size-8 items-center justify-center rounded-control text-muted-foreground outline-none transition-colors duration-300 ease-out-quart hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <ChevronDown
              aria-hidden
              className={cn(
                'size-4 transition-transform duration-300 ease-out-quart motion-reduce:transition-none',
                open && 'rotate-180'
              )}
            />
          </button>
        </TableCell>
      </TableRow>
      {open && (
        <TableRow id={detailsId} className="bg-background hover:bg-background">
          <TableCell colSpan={COLUMN_COUNT} className="whitespace-normal px-4 pt-2 pb-6">
            <div className="animate-reveal">
              <TableDetails details={email.content} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-panel border border-border bg-card">{children}</div>
  )
}

function Head() {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead>Assunto</TableHead>
        <TableHead>Data</TableHead>
        <TableHead>Tipo</TableHead>
        <TableHead className="text-right">Total</TableHead>
        <TableHead className="w-14">
          <span className="sr-only">Detalhes</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  )
}

export const TableEmail: React.FC<{ emails?: Email[] }> = ({ emails }) => {
  if (!emails || emails.length === 0) return null

  const total = emails.reduce((acc, e) => (e.content.total ?? 0) + acc, 0)
  const counts = (Object.keys(RECEIPT_TYPES) as ReceiptType[])
    .map((key) => ({ key, count: emails.filter((e) => e.content.type === key).length }))
    .filter(({ count }) => count > 0)

  return (
    <Frame>
      <Table>
        <Head />
        <TableBody>
          {emails.map((email, index) => (
            <ReceiptRow key={`${email.date}-${index}`} email={email} />
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={3} className="text-muted-foreground">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <span className="text-foreground">
                  {plural(emails.length, 'recibo', 'recibos')}
                </span>
                {counts.map(({ key, count }) => {
                  const { icon: Icon, singular, plural: many } = RECEIPT_TYPES[key]
                  return (
                    <span key={key} className="inline-flex items-center gap-1.5">
                      <Icon aria-hidden className="size-3.5" />
                      {plural(count, singular, many)}
                    </span>
                  )
                })}
              </div>
            </TableCell>
            <TableCell className="text-right text-foreground">
              <span className="sr-only">Total do mês: </span>
              {formatToBRL(total)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </Frame>
  )
}

/** Mesma moldura, cabeçalho e altura de linha da tabela, para a troca não empurrar nada. */
export function TableEmailSkeleton({ rows = 4 }: { rows?: number }) {
  const widths = ['w-56', 'w-44', 'w-64', 'w-48']
  return (
    <Frame>
      <Table aria-busy="true" aria-label="Carregando recibos">
        <Head />
        <TableBody>
          {Array.from({ length: rows }, (_, index) => (
            <TableRow key={index} className="hover:bg-transparent">
              <TableCell className="max-w-0 w-full">
                <Skeleton className={cn('h-3.5', widths[index % widths.length])} />
              </TableCell>
              <TableCell>
                <Skeleton className="h-3.5 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-3.5 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-3.5 w-16" />
              </TableCell>
              <TableCell className="pr-3">
                <div className="ml-auto flex size-8 items-center justify-center">
                  <Skeleton className="size-4" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Frame>
  )
}
