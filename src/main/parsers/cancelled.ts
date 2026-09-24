import { amountAfter, BRL_SOURCE, brlGroupsToNumber } from './brl'

const KNOWN_METHODS =
  /(Mastercard|Visa|Elo|Amex|Nubank|diners|discover|jcb|aura|hipercard|maestro|pix|Uber Cash|Dinheiro)/i

/**
 * Uma linha de "Pagamentos": meio (curto, só letras, espaço e •, para não engolir a data colada
 * nem uma frase inteira), data e hora opcionais, valor e, no estorno, "Reembolso" logo depois.
 */
const PAYMENT = new RegExp(
  String.raw`([A-Za-zÀ-ÿ•*][A-Za-zÀ-ÿ•*. ]{0,24}?)\s*(?:(\d{1,2}/\d{1,2}/\d{4})\s*(\d{1,2}:\d{2})?)?\s*` +
    BRL_SOURCE +
    String.raw`(\s*Reembolso)?`,
  'g'
)

/** Categoria logo antes de "Viagem cancelada |" (com V maiúsculo; o corpo diz "viagem cancelada"). */
const PRODUCT =
  /(Uber\s?[A-Z][\wÀ-ÿ]*|Comfort|Black|Moto|Flash|Juntos|Prioridade|Priority)\s*Viagem cancelada/

/** O que vem depois dos pagamentos no recibo; o primeiro que aparecer fecha a seção. */
const SECTION_END =
  /Para mais informações|Mudar a forma de pagamento|Baixar o PDF|Viagem cancelada\s*\|/

/** Só o trecho entre "Pagamentos" e o rodapé: um "R$" de promoção no fim não vira pagamento. */
function paymentsSection(text: string): string | null {
  const start = text.search(/Pagamentos/)
  if (start < 0) return null
  const section = text.slice(start + 'Pagamentos'.length)
  const ends = [section.search(SECTION_END), PRODUCT.exec(section)?.index ?? -1].filter(
    (index) => index >= 0
  )
  return ends.length > 0 ? section.slice(0, Math.min(...ends)) : section
}

function parsePayments(text: string): CanceledPayment[] {
  const section = paymentsSection(text)
  if (section === null) return []
  const payments: CanceledPayment[] = []
  for (const match of section.matchAll(PAYMENT)) {
    const method = match[1].replace(/\s+/g, ' ').trim()
    // Sem data, só aceita um meio conhecido: "e ganhe R$ 20,00" não é pagamento.
    if (!method || (!match[2] && !KNOWN_METHODS.test(method))) continue
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
