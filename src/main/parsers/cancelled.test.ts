import { describe, expect, it } from 'vitest'
import { parseCancelled } from './cancelled'

/** Recibo de cancelamento com cobrança parcial e reembolso, como o e-mail aparece renderizado. */
const SPACED = `Taxa de cancelamento R$ 3,37
9 de março de 2024
Vamos nos conectar outra hora, Fulano
Aqui está o recibo da viagem cancelada.
Total    R$ 3,37
Tempo    R$ 1,20
Distância    R$ 2,01
Taxa de conveniência    R$ 0,16
Subtotal    R$ 3,37
Pagamentos
Nubank
9/3/2024 14:37
R$ 10,02
Nubank
9/3/2024 14:50
 -R$ 6,65
Reembolso
Visite a página de viagens para mais detalhes.
UberX
Viagem cancelada |
14:37
Solicitação aceita
14:37
Solicitação cancelada`

/** O mesmo recibo como o cheerio entrega: células coladas, sem espaço entre elas. */
const GLUED =
  'Taxa de cancelamento R$ 3,379 de março de 2024Vamos nos conectar outra hora, Fulano' +
  'Aqui está o recibo da viagem cancelada. TotalR$ 3,37TempoR$ 1,20DistânciaR$ 2,01' +
  'Taxa de conveniênciaR$ 0,16SubtotalR$ 3,37PagamentosNubank9/3/2024 14:37R$ 10,02' +
  'Nubank9/3/2024 14:50 -R$ 6,65ReembolsoVisite a página de viagens para mais detalhes.' +
  'UberXViagem cancelada |14:37Solicitação aceita14:37Solicitação cancelada'

/** Taxa cobrada e estornada por inteiro (trecho real, colado). */
const REFUNDED_GLUED =
  'Taxa de cancelamento R$ 0,002 de junho de 2024Vamos nos conectar outra hora, Fulano' +
  'Aqui está o recibo da viagem cancelada. TotalR$ 0,00 SubtotalR$ 0,00 Pagamentos ' +
  'Nubank2/6/2024 21:36R$ 12,42Nubank2/6/2024 21:36 -R$ 12,42Reembolso'

const HTML = '<html><body>recibo</body></html>'

describe.each([
  ['com espaços', SPACED],
  ['colado', GLUED]
])('parseCancelled — recibo %s', (_label, text) => {
  const data = parseCancelled(text, HTML)

  it('mantém o tipo e o HTML original', () => {
    expect(data.type).toBe('cancelada')
    expect(data.content).toBe(HTML)
  })

  it('lê total e subtotal', () => {
    expect(data.total).toBe(3.37)
    expect(data.subtotal).toBe(3.37)
  })

  it('lê a composição da taxa', () => {
    expect(data.time).toBe(1.2)
    expect(data.distance).toBe(2.01)
    expect(data.convenienceFee).toBe(0.16)
  })

  it('lê cobrança e reembolso na ordem', () => {
    expect(data.payments).toEqual([
      { method: 'Nubank', date: '9/3/2024 14:37', amount: 10.02, refund: false },
      { method: 'Nubank', date: '9/3/2024 14:50', amount: -6.65, refund: true }
    ])
  })

  it('usa o primeiro meio de pagamento', () => {
    expect(data.paymentMethod).toBe('Nubank')
  })

  it('lê a categoria da viagem', () => {
    expect(data.product).toBe('UberX')
  })
})

describe('parseCancelled — taxa estornada', () => {
  const data = parseCancelled(REFUNDED_GLUED, HTML)

  it('total zero, sem engolir o dia colado', () => {
    expect(data.total).toBe(0)
    expect(data.subtotal).toBe(0)
  })

  it('lista a cobrança e o estorno integral', () => {
    expect(data.payments).toEqual([
      { method: 'Nubank', date: '2/6/2024 21:36', amount: 12.42, refund: false },
      { method: 'Nubank', date: '2/6/2024 21:36', amount: -12.42, refund: true }
    ])
  })

  it('omite o que o recibo não traz', () => {
    expect(data.time).toBeUndefined()
    expect(data.distance).toBeUndefined()
    expect(data.convenienceFee).toBeUndefined()
    expect(data.product).toBeUndefined()
  })
})

describe('parseCancelled — recibo sem dados', () => {
  it('cai no padrão de antes', () => {
    const data = parseCancelled('Sua viagem foi cancelada.', HTML)
    expect(data.total).toBe(0)
    expect(data.paymentMethod).toBe('Desconhecido')
    expect(data.payments).toEqual([])
  })

  it('usa a taxa de cancelamento quando falta a linha Total', () => {
    const data = parseCancelled('Taxa de cancelamento R$ 5,002 de junho cancelada', HTML)
    expect(data.total).toBe(5)
  })

  it('valores com milhar', () => {
    const data = parseCancelled('viagem cancelada TotalR$ 1.234,56SubtotalR$ 1.234,56', HTML)
    expect(data.total).toBe(1234.56)
  })
})

describe('extractEmailData — ramo de cancelada', () => {
  it('usa o parser de cancelada', async () => {
    const { extractEmailData } = await import('../emailHandler')
    const data = extractEmailData(REFUNDED_GLUED, HTML)
    expect(data.type).toBe('cancelada')
    expect(data.total).toBe(0)
    expect(data.type === 'cancelada' && data.payments).toHaveLength(2)
  })
})

describe('extractEmailData — valores dos outros tipos', () => {
  it('viagem: total colado na data não vira milésimo', async () => {
    const { extractEmailData } = await import('../emailHandler')
    const data = extractEmailData('TotalR$ 19,002 de setembroSubtotalR$ 1.018,50', HTML)
    expect(data.type).toBe('viagem')
    expect(data.total).toBe(19)
    expect(data.type === 'viagem' && data.subtotal).toBe(1018.5)
  })

  it('recarga: lê o valor adicionado', async () => {
    const { extractEmailData } = await import('../emailHandler')
    const data = extractEmailData('Uber Cash Você adicionou R$ 1.050,009 de março', HTML)
    expect(data.type).toBe('recarga')
    expect(data.total).toBe(1050)
  })
})
