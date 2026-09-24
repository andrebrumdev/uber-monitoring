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
import { LogOut } from 'lucide-react'
import React, { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { AppErrorShape } from '../../../../shared/api'
import { ErrorBanner } from './ui/ErrorBanner'
import { TableEmail } from './ui/TableEmail'

function genYears(yearStart: number, yearEnd: number): string[] {
  const years: string[] = []
  for (let year = yearStart; year >= yearEnd; year--) {
    years.push(year.toString())
  }
  return years
}

const months = [
  { label: 'Janeiro', value: '1' },
  { label: 'Fevereiro', value: '2' },
  { label: 'Março', value: '3' },
  { label: 'Abril', value: '4' },
  { label: 'Maio', value: '5' },
  { label: 'Junho', value: '6' },
  { label: 'Julho', value: '7' },
  { label: 'Agosto', value: '8' },
  { label: 'Setembro', value: '9' },
  { label: 'Outubro', value: '10' },
  { label: 'Novembro', value: '11' },
  { label: 'Dezembro', value: '12' }
]

const years = genYears(new Date().getFullYear(), 2010).map((year) => ({
  label: year.toString(),
  value: year.toString()
}))

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

const Home: React.FC<HomeProps> = ({ email, onSignedOut }) => {
  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: {
      month: (new Date().getMonth() + 1).toString(),
      year: new Date().getFullYear().toString()
    }
  })

  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<HomeError | null>(null)
  const [signingOut, setSigningOut] = useState(false)

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
    setLoading(true)
    try {
      const result = await window.api.emails.fetch(Number(data.month), Number(data.year))
      if (result.ok) {
        setEmails(result.data)
        setError(null)
      } else if (result.error.code === 'NOT_AUTHENTICATED') onSignedOut()
      else showError(result.error)
    } finally {
      setLoading(false)
    }
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
          <form
            onSubmit={handleSubmit(fetchEmails)}
            className="flex gap-4 items-center justify-center mt-4"
          >
            {/* Dropdown de Mês */}
            <Controller
              name="month"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />

            {/* Botão de Buscar */}
            <Button type="submit" disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar Emails'}
            </Button>
          </form>
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
                  icon: () => '🪙',
                  color: 'var(--chart-3)'
                },
                viagem: {
                  label: 'Viagem',
                  icon: () => '🚗',
                  color: 'var(--chart-2)'
                },
                cancelada: {
                  label: 'Cancelada',
                  icon: () => '🔴',
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
