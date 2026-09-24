import { Brand } from '@/components/brand'
import { DonutChart } from '@/components/donut'
import { Button } from '@/components/ui/button'
import type { ChartConfig } from '@/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatToBRL } from 'brazilian-values'
import { Inbox, LogOut, Search, type LucideIcon } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { AppErrorShape, ReceiptPeriod } from '../../../../shared/api'
import { ErrorBanner } from './ui/ErrorBanner'
import { RECEIPT_TYPES, TableEmail, TableEmailSkeleton } from './ui/TableEmail'

const MONTH_NAMES: Record<number, string> = {
  1: 'Janeiro',
  2: 'Fevereiro',
  3: 'Março',
  4: 'Abril',
  5: 'Maio',
  6: 'Junho',
  7: 'Julho',
  8: 'Agosto',
  9: 'Setembro',
  10: 'Outubro',
  11: 'Novembro',
  12: 'Dezembro'
}

interface FormData {
  month: string
  year: string
}

interface HomeProps {
  email: string
  onSignedOut: () => void
}

/** `id` muda a cada erro para o banner remontar e ser anunciado de novo. */
type HomeError = AppErrorShape & { id: number }

const UNKNOWN_ERROR: AppErrorShape = {
  code: 'UNKNOWN',
  message: 'Erro inesperado. Tente novamente.'
}

type ReceiptType = keyof typeof RECEIPT_TYPES

/** Cores da fita para cada tipo: violeta, lilás e teal (tokens --chart-*). */
const CHART_COLORS: Record<ReceiptType, string> = {
  viagem: 'var(--chart-1)',
  cancelada: 'var(--chart-2)',
  recarga: 'var(--chart-3)'
}

const CHART_CONFIG: ChartConfig = Object.fromEntries(
  (Object.keys(RECEIPT_TYPES) as ReceiptType[]).map((key) => [
    key,
    { label: RECEIPT_TYPES[key].label, icon: RECEIPT_TYPES[key].icon, color: CHART_COLORS[key] }
  ])
)

/** Estado vazio calmo, centrado na área de conteúdo. */
function EmptyState({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <Icon aria-hidden className="size-6 text-muted-foreground" strokeWidth={1.5} />
      <p className="max-w-[44ch] text-[15px] text-muted-foreground">{children}</p>
    </div>
  )
}

/** Tabela à esquerda, resumo por tipo à direita (abaixo em janelas estreitas). */
function ResultsGrid({ table, summary }: { table: React.ReactNode; summary: React.ReactNode }) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
      {table}
      <section aria-label="Gastos por tipo" className="flex flex-col gap-4">
        <h2 className="text-[13px] font-medium text-muted-foreground">Gastos por tipo</h2>
        {summary}
      </section>
    </div>
  )
}

const SUMMARY_LAYOUT = 'sm:flex-row sm:items-center sm:gap-10 lg:flex-col lg:items-stretch lg:gap-5'

const Home: React.FC<HomeProps> = ({ email, onSignedOut }) => {
  const { control, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: { month: '', year: '' }
  })

  const [emails, setEmails] = useState<Email[]>([])
  const [searched, setSearched] = useState<{ month: number; year: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<HomeError | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [periods, setPeriods] = useState<ReceiptPeriod[] | null>(null)
  const [periodsLoading, setPeriodsLoading] = useState(true)

  const selectedYear = watch('year')

  const showError = ({ code, message }: AppErrorShape): void =>
    setError((previous) => ({ code, message, id: (previous?.id ?? 0) + 1 }))

  const handleLogout = async (): Promise<void> => {
    setSigningOut(true)
    const result = await window.api.auth.logout()
    if (result.ok) {
      onSignedOut()
      return
    }
    setSigningOut(false)
    showError(result.error)
  }

  const fetchEmails = async (data: FormData): Promise<void> => {
    if (!data.month || !data.year) return
    setLoading(true)
    try {
      const result = await window.api.emails.fetch(Number(data.month), Number(data.year))
      if (result.ok) {
        setEmails(result.data)
        setSearched({ month: Number(data.month), year: Number(data.year) })
        setError(null)
      } else if (result.error.code === 'NOT_AUTHENTICATED') onSignedOut()
      else showError(result.error)
    } catch {
      showError(UNKNOWN_ERROR)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadPeriods = async (): Promise<void> => {
      try {
        const result = await window.api.emails.periods()
        if (cancelled) return
        if (result.ok) {
          setPeriods(result.data)
          const [latest] = result.data
          if (latest) {
            const latestMonth = latest.months[0]
            const formData: FormData = {
              year: latest.year.toString(),
              month: latestMonth.toString()
            }
            setValue('year', formData.year)
            setValue('month', formData.month)
            await fetchEmails(formData)
          }
        } else if (result.error.code === 'NOT_AUTHENTICATED') {
          onSignedOut()
        } else {
          showError(result.error)
        }
      } catch {
        if (!cancelled) showError(UNKNOWN_ERROR)
      } finally {
        if (!cancelled) setPeriodsLoading(false)
      }
    }

    loadPeriods()

    return () => {
      cancelled = true
    }
    // Executa apenas na montagem: carrega os períodos e dispara a primeira busca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const yearOptions = periods ?? []
  const monthOptions =
    periods?.find((period) => period.year.toString() === selectedYear)?.months ?? []
  const noReceipts = !periodsLoading && periods !== null && periods.length === 0
  // `periods()` falhou por outro motivo: o banner explica; os seletores ficam desabilitados.
  const periodsUnavailable = !periodsLoading && periods === null
  const selectsDisabled = periodsLoading || periodsUnavailable
  const placeholder = (fallback: string): string =>
    periodsLoading
      ? 'Carregando períodos…'
      : periodsUnavailable
        ? 'Períodos indisponíveis'
        : fallback
  const showSkeleton = loading || periodsLoading

  const chartItems = useMemo(
    () =>
      (Object.keys(RECEIPT_TYPES) as ReceiptType[])
        .map((key) => ({
          key,
          count: emails.filter((email) => email.content.type === key).length,
          value: emails
            .filter((email) => email.content.type === key)
            .reduce((acc, email) => acc + (email.content.total ?? 0), 0)
        }))
        .filter((item) => item.count > 0)
        .map(({ key, value }) => ({ key, value })),
    [emails]
  )

  const handleYearChange = (year: string, onChange: (value: string) => void): void => {
    onChange(year)
    const found = periods?.find((period) => period.year.toString() === year)
    if (found) setValue('month', found.months[0].toString())
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-6 border-b border-border bg-background px-6">
        <Brand size="sm" />
        <div className="flex min-w-0 items-center gap-6">
          <span className="max-w-[32ch] truncate text-sm text-muted-foreground" title={email}>
            {email}
          </span>
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={signingOut}
            aria-label={email ? `Sair da conta ${email}` : 'Sair da conta'}
            className="h-8 shrink-0 gap-1.5 rounded-control border-primary bg-transparent px-3 text-primary shadow-none transition-colors duration-300 ease-out-quart hover:bg-accent hover:text-primary active:bg-primary/15"
          >
            <LogOut aria-hidden className="size-3.5" />
            Sair
          </Button>
        </div>
      </header>
      <main className="animate-rise flex flex-1 flex-col px-4 pt-8 pb-10 sm:px-6">
        <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-8">
          <div className="flex flex-col gap-5">
            <h1 className="text-2xl font-medium tracking-[-0.02em] text-foreground">
              Seus recibos da Uber
            </h1>
            {!noReceipts && (
              <form
                onSubmit={handleSubmit(fetchEmails)}
                aria-label="Escolher período"
                className="flex flex-wrap items-end gap-3"
              >
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="periodo-mes" className="text-sm font-medium text-foreground">
                    Mês
                  </label>
                  <Controller
                    name="month"
                    control={control}
                    render={({ field }) => (
                      <Select
                        // O <select> escondido do Radix dispara '' enquanto as opções ainda não existem.
                        onValueChange={(month) => month && field.onChange(month)}
                        value={field.value}
                        disabled={selectsDisabled}
                      >
                        <SelectTrigger
                          id="periodo-mes"
                          className={cn('w-40', selectsDisabled && 'w-auto min-w-40')}
                        >
                          <SelectValue placeholder={placeholder('Escolha o mês')} />
                        </SelectTrigger>
                        <SelectContent>
                          {monthOptions.map((month) => (
                            <SelectItem key={month} value={month.toString()}>
                              {MONTH_NAMES[month]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="periodo-ano" className="text-sm font-medium text-foreground">
                    Ano
                  </label>
                  <Controller
                    name="year"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(year) => year && handleYearChange(year, field.onChange)}
                        value={field.value}
                        disabled={selectsDisabled}
                      >
                        <SelectTrigger
                          id="periodo-ano"
                          className={cn('w-28', selectsDisabled && 'w-auto min-w-28')}
                        >
                          <SelectValue placeholder={placeholder('Ano')} />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map((period) => (
                            <SelectItem key={period.year} value={period.year.toString()}>
                              {period.year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || selectsDisabled}
                  className="h-10 gap-2 rounded-control px-5 shadow-none transition-colors duration-300 ease-out-quart hover:bg-primary-hover active:bg-primary-active has-[>svg]:px-5"
                >
                  <Search aria-hidden className="size-4" />
                  {loading ? 'Buscando…' : 'Buscar'}
                </Button>
              </form>
            )}
          </div>
          {error && (
            <ErrorBanner
              key={error.id}
              code={error.code}
              message={error.message}
              onClose={() => setError(null)}
            />
          )}
          <section aria-label="Recibos" aria-busy={showSkeleton} className="flex flex-1 flex-col">
            {noReceipts ? (
              <EmptyState icon={Inbox}>Não encontramos recibos da Uber neste Gmail.</EmptyState>
            ) : showSkeleton ? (
              <ResultsGrid
                table={<TableEmailSkeleton />}
                summary={
                  <div className={cn('flex flex-col gap-5', SUMMARY_LAYOUT)}>
                    <Skeleton className="mx-auto aspect-square w-[200px] shrink-0 rounded-full border-[32px] border-border bg-transparent" />
                    <div className="flex flex-1 flex-col gap-4 py-2">
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3.5 w-4/5" />
                      <Skeleton className="h-3.5 w-3/5" />
                    </div>
                  </div>
                }
              />
            ) : searched && emails.length === 0 ? (
              <EmptyState icon={Inbox}>
                Nenhum recibo da Uber em {MONTH_NAMES[searched.month].toLowerCase()} de{' '}
                {searched.year}.
              </EmptyState>
            ) : emails.length > 0 ? (
              <div
                key={searched ? `${searched.month}-${searched.year}` : 'results'}
                className="animate-rise"
              >
                <ResultsGrid
                  table={<TableEmail emails={emails} />}
                  summary={
                    <DonutChart
                      items={chartItems}
                      config={CHART_CONFIG}
                      caption="Total do mês"
                      format={formatToBRL}
                      className={SUMMARY_LAYOUT}
                    />
                  }
                />
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  )
}

export default Home
