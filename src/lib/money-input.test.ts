import { describe, expect, it } from 'vitest'
import { formatMoneyDraft, formatMoneyValue, parseMoneyValue } from './money-input'

describe('money input formatting', () => {
  it('formats Colombian amounts with thousands separators and preserves zero', () => {
    expect(formatMoneyValue(1234567, 'COP')).toBe('1.234.567')
    expect(parseMoneyValue('0', 'COP')).toBe(0)
    expect(parseMoneyValue('1.234.567', 'COP')).toBe(1234567)
  })

  it('supports grouped decimal input for non-COP currencies', () => {
    expect(parseMoneyValue('1,234.50', 'USD')).toBe(1234.5)
    expect(parseMoneyValue('1.234,50', 'USD')).toBe(1234.5)
    expect(formatMoneyDraft('1234.', 'USD')).toBe('1,234.')
  })
})
