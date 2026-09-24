/**
 * Valor em reais no formato exato "R$ 1.234,56": sinal opcional antes ou depois do "R$",
 * milhar com ponto e sempre dois centavos. Parar nos dois centavos importa porque o texto
 * que sai do cheerio vem colado ("R$ 0,002 de junho" é "R$ 0,00" + "2 de junho").
 * Grupos: 1 e 2 são o sinal, 3 é o número.
 */
export const BRL_SOURCE = String.raw`(?:([-−])\s?)?R\$\s*([-−])?\s*((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})`

/** Converte os grupos de BRL_SOURCE (a partir de `offset`) em número. */
export function brlGroupsToNumber(match: RegExpExecArray, offset = 0): number {
  const negative = Boolean(match[offset + 1] || match[offset + 2])
  const value = Number(match[offset + 3].replace(/\./g, '').replace(',', '.'))
  return negative ? -value : value
}

/** Primeiro valor em reais do texto, ou undefined se não houver nenhum no formato exato. */
export function parseBRL(text: string): number | undefined {
  const match = new RegExp(BRL_SOURCE).exec(text)
  return match ? brlGroupsToNumber(match) : undefined
}

/**
 * Primeiro valor em reais logo depois de `label` (expressão regular em texto).
 * `gap` é o que pode haver entre o rótulo e o valor; por padrão, só espaço.
 */
export function amountAfter(
  text: string,
  label: string,
  { gap = String.raw`\s*`, flags = '' }: { gap?: string; flags?: string } = {}
): number | undefined {
  const match = new RegExp(`(?:${label})${gap}${BRL_SOURCE}`, flags).exec(text)
  return match ? brlGroupsToNumber(match) : undefined
}
