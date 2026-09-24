import { Brand } from '@/components/brand'
import { PieChartTest } from '@/components/pie'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { formatToBRL } from 'brazilian-values'
import { Car, CircleX, Coins, LogOut } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { AppErrorShape, ReceiptPeriod } from '../../../../shared/api'
import { ErrorBanner } from './ui/ErrorBanner'
import { TableEmail } from './ui/TableEmail'

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

const UNKNOWN_ERROR: AppErrorShape = { code: 'UNKNOWN', message: 'Erro inesperado. Tente novamente.' }

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
  const monthOptions = periods?.find((period) => period.year.toString() === selectedYear)?.months ?? []
  const noReceipts = !periodsLoading && periods !== null && periods.length === 0

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
      <div className="animate-rise p-4 gap-4 flex flex-col flex-1">
        <div className="p-4">
          <h1 className="text-3xl font-bold text-center">Buscar Recibos da Uber</h1>
          {noReceipts ? (
            <p className="mt-4 text-center text-muted-foreground">
              Não encontramos recibos da Uber neste Gmail.
            </p>
          ) : (
            <form
              onSubmit={handleSubmit(fetchEmails)}
              className="flex gap-4 items-center justify-center mt-4"
            >
              {/* Dropdown de Mês */}
              <Controller
                name="month"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={periodsLoading}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder={periodsLoading ? 'Carregando períodos…' : 'Mês'} />
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

              {/* Dropdown de Ano */}
              <Controller
                name="year"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(year) => handleYearChange(year, field.onChange)}
                    value={field.value}
                    disabled={periodsLoading}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder={periodsLoading ? 'Carregando períodos…' : 'Ano'} />
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

              {/* Botão de Buscar */}
              <Button type="submit" disabled={loading || periodsLoading}>
                {loading ? 'Buscando...' : 'Buscar Emails'}
              </Button>
            </form>
          )}
          {error && (
            <div className="mx-auto mt-4 w-full max-w-[1180px]">
              <ErrorBanner
                key={error.id}
                code={error.code}
                message={error.message}
                onClose={() => setError(null)}
              />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-4 h-full">
          {loading ? (
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-foreground"></div>
            </div>
          ) : searched && emails.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Nenhum recibo da Uber em {MONTH_NAMES[searched.month]} de {searched.year}.
            </p>
          ) : (
            <TableEmail emails={emails} />
          )}
          <div className="">
            <PieChartTest
              data={Object.values(
                emails.reduce(
                  (acc, email) => {
                    const type = email.content.type as TypeOfViagem

                    if (!acc[type]) {
                      acc[type] = { type, total: 0 }
                    }

                    acc[type].total += email.content.total ?? 0
                    return acc
                  },
                  {} as Record<TypeOfViagem, { type: TypeOfViagem; total: number }>
                )
              )}
              dataKey="total"
              nameKey="type"
              config={{
                recarga: {
                  label: 'Recarga',
                  icon: Coins,
                  color: 'var(--chart-3)'
                },
                viagem: {
                  label: 'Viagem',
                  icon: Car,
                  color: 'var(--chart-2)'
                },
                cancelada: {
                  label: 'Cancelada',
                  icon: CircleX,
                  color: 'var(--chart-5)'
                }
              }}
              format={formatToBRL}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
