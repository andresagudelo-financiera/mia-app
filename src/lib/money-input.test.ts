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

describe('large whole-number monetary input', () => {
  it('does not truncate normal high USD and COP amounts while grouping', () => {
    expect(formatMoneyDraft('1500000', 'USD')).toBe('1,500,000')
    expect(parseMoneyValue('1,500,000', 'USD')).toBe(1500000)
    expect(formatMoneyDraft('100000000000', 'COP')).toBe('100.000.000.000')
    expect(parseMoneyValue('100.000.000.000', 'COP')).toBe(100000000000)
  })
})
