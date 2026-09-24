import { describe, expect, it } from 'vitest'
import { groupPeriods } from './periods'

describe('groupPeriods', () => {
  it('agrupa recibos por ano e mês', () => {
    const result = groupPeriods([
      { date: new Date('2025-08-10T12:00:00Z'), subject: 'Seu recibo com a Uber' },
      { date: new Date('2025-07-02T12:00:00Z'), subject: 'Sua viagem com a Uber' }
    ])
    expect(result).toEqual([
      { year: 2025, months: [8, 7] }
    ])
  })

  it('ordena anos e meses do mais recente para o mais antigo', () => {
    const result = groupPeriods([
      { date: new Date('2024-01-05T12:00:00Z'), subject: 'com a Uber' },
      { date: new Date('2025-03-05T12:00:00Z'), subject: 'com a Uber' },
      { date: new Date('2025-01-05T12:00:00Z'), subject: 'com a Uber' },
      { date: new Date('2023-12-05T12:00:00Z'), subject: 'com a Uber' }
    ])
    expect(result).toEqual([
      { year: 2025, months: [3, 1] },
      { year: 2024, months: [1] },
      { year: 2023, months: [12] }
    ])
  })

  it('ignora e-mails cujo assunto não é um recibo da Uber', () => {
    const result = groupPeriods([
      { date: new Date('2025-08-10T12:00:00Z'), subject: 'Seu recibo com a Uber' },
      { date: new Date('2025-08-11T12:00:00Z'), subject: 'Promoção Uber Eats' },
      { date: new Date('2025-08-12T12:00:00Z'), subject: 'Confirme seu e-mail' }
    ])
    expect(result).toEqual([{ year: 2025, months: [8] }])
  })

  it('não duplica meses repetidos no mesmo ano', () => {
    const result = groupPeriods([
      { date: new Date('2025-08-01T12:00:00Z'), subject: 'com a Uber' },
      { date: new Date('2025-08-15T12:00:00Z'), subject: 'com a Uber' },
      { date: new Date('2025-08-28T12:00:00Z'), subject: 'com a Uber' }
    ])
    expect(result).toEqual([{ year: 2025, months: [8] }])
  })

  it('retorna lista vazia quando não há itens', () => {
    expect(groupPeriods([])).toEqual([])
  })

  it('retorna lista vazia quando nenhum assunto é recibo da Uber', () => {
    const result = groupPeriods([
      { date: new Date('2025-08-10T12:00:00Z'), subject: 'Newsletter' }
    ])
    expect(result).toEqual([])
  })

  it('usa o ano/mês UTC da data, coerente com a busca IMAP por INTERNALDATE', () => {
    // 2025-01-01T00:30:00Z é 31/12/2024 em fusos negativos; o agrupamento deve
    // seguir o calendário UTC, que é o que o IMAP SEARCH since/before compara.
    const result = groupPeriods([
      { date: new Date('2025-01-01T00:30:00Z'), subject: 'com a Uber' }
    ])
    expect(result).toEqual([{ year: 2025, months: [1] }])
  })
})
