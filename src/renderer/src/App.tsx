import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { formatToBRL } from 'brazilian-values'
import React, { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { TableEmail } from './TableEmail'
import { PieChartTest } from './pie'

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

const App: React.FC = () => {
  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: {
      month: (new Date().getMonth() + 1).toString(),
      year: new Date().getFullYear().toString()
    }
  })

  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(false)

  const fetchEmails = async (data: FormData): Promise<void> => {
    setLoading(true)
    try {
      const response = await window.electron.ipcRenderer.invoke(
        'fetchEmails',
        Number(data.month),
        Number(data.year)
      )
      if (response.error) throw new Error(response.error)
      setEmails(response)
    } catch (error) {
      console.error('Erro ao buscar emails:', error)
    }
    setLoading(false)
  }

  return (
    <div className="p-4 gap-4 flex flex-col min-h-screen">
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
      </div>
      <div className="flex flex-1 flex-col gap-4 h-full">
        {loading ? (
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
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
  )
}

export default App
