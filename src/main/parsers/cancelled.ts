import { amountAfter, BRL_SOURCE, brlGroupsToNumber } from './brl'

const KNOWN_METHODS =
  /(Mastercard|Visa|Elo|Amex|Nubank|diners|discover|jcb|aura|hipercard|maestro|pix)/i

/**
 * Uma linha de "Pagamentos": meio (sem dígitos, para não engolir a data colada), data e hora
 * opcionais, valor e, no estorno, a palavra "Reembolso" logo depois.
 */
const PAYMENT = new RegExp(
  String.raw`([^\d]{1,40}?)\s*(?:(\d{1,2}/\d{1,2}/\d{4})\s*(\d{1,2}:\d{2})?)?\s*` +
    BRL_SOURCE +
    String.raw`(\s*Reembolso)?`,
  'g'
)

/** Categoria logo antes de "Viagem cancelada |" (com V maiúsculo; o corpo diz "viagem cancelada"). */
const PRODUCT =
  /(Uber\s?[A-Z][\wÀ-ÿ]*|Comfort|Black|Moto|Flash|Juntos|Prioridade|Priority)\s*Viagem cancelada/

function parsePayments(text: string): CanceledPayment[] {
  const start = text.search(/Pagamentos/)
  if (start < 0) return []
  const section = text.slice(start + 'Pagamentos'.length)
  const payments: CanceledPayment[] = []
  for (const match of section.matchAll(PAYMENT)) {
    const method = match[1].replace(/\s+/g, ' ').trim()
    if (!method) continue
    const amount = brlGroupsToNumber(match as RegExpExecArray, 3)
    const date = match[2] ? [match[2], match[3]].filter(Boolean).join(' ') : undefined
    payments.push({
      method,
      ...(date ? { date } : {}),
      amount,
      refund: Boolean(match[7]) || amount < 0
    })
  }
  return payments
}

/** Omite a chave quando o recibo não traz a linha, para a tela não inventar zeros. */
function optional<K extends string>(key: K, value: number | undefined): Partial<Record<K, number>> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, number>)
}

export function parseCancelled(text: string, html: string): CanceledType {
  const payments = parsePayments(text)
  const total =
    amountAfter(text, 'Total') ??
    amountAfter(text, 'Taxa de cancelamento') ??
    amountAfter(text, 'Total', { gap: '.*?', flags: 'i' }) ??
    0
  const product = PRODUCT.exec(text)?.[1]

  return {
    content: html,
    type: 'cancelada',
    total,
    paymentMethod: payments[0]?.method || KNOWN_METHODS.exec(text)?.[1] || 'Desconhecido',
    ...optional('subtotal', amountAfter(text, 'Subtotal')),
    ...optional('time', amountAfter(text, 'Tempo')),
    ...optional('distance', amountAfter(text, 'Dist[âa]ncia')),
    ...optional('convenienceFee', amountAfter(text, 'Taxa de conveni[êe]ncia')),
    payments,
    ...(product ? { product } : {})
  }
}
