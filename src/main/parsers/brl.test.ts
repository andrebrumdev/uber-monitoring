import { describe, expect, it } from 'vitest'
import { amountAfter, parseBRL } from './brl'

describe('parseBRL', () => {
  it('lê o valor no formato brasileiro', () => {
    expect(parseBRL('R$ 3,37')).toBe(3.37)
    expect(parseBRL('R$12,42')).toBe(12.42)
  })

  it('entende separador de milhar', () => {
    expect(parseBRL('R$ 1.234,56')).toBe(1234.56)
    expect(parseBRL('R$ 12.345.678,90')).toBe(12345678.9)
  })

  it('não engole o dígito colado depois dos centavos', () => {
    expect(parseBRL('R$ 0,002 de junho')).toBe(0)
    expect(parseBRL('R$ 3,379 de março de 2024')).toBe(3.37)
  })

  it('reconhece o sinal negativo antes ou depois do R$', () => {
    expect(parseBRL(' -R$ 6,65')).toBe(-6.65)
    expect(parseBRL('R$ -6,65')).toBe(-6.65)
    expect(parseBRL('−R$ 12,42')).toBe(-12.42)
  })

  it('devolve undefined quando não há valor em BRL', () => {
    expect(parseBRL('Total 3,37')).toBeUndefined()
    expect(parseBRL('R$ 3')).toBeUndefined()
    expect(parseBRL('')).toBeUndefined()
  })
})

describe('amountAfter', () => {
  it('lê o primeiro valor depois do rótulo', () => {
    expect(amountAfter('TotalR$ 0,00 SubtotalR$ 1,50', 'Subtotal')).toBe(1.5)
  })

  it('devolve undefined quando o rótulo não aparece', () => {
    expect(amountAfter('TotalR$ 0,00', 'Tempo')).toBeUndefined()
  })
})
