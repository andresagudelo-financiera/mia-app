import { describe, expect, it } from 'vitest'
import { calculateGoldenNumberV2, countryFromPhone, currencyForCountry } from './numero-dorado-v2'

const base = { monthlySpend: 0, years: 10, capital: 0, targetReturn: .06, phase1Contribution: 0, phase1Return: .06, phase2Contribution: 0, phase2Return: .12, indexPhase1: false, indexPhase2: false, age: 34 }

describe('Número Dorado V2 calculation', () => {
  it('accepts zero spend and zero initial capital as valid inputs', () => {
    const result = calculateGoldenNumberV2(base)
    expect(result.today).toBe(0)
    expect(result.target).toBe(0)
    expect(result.projected).toBe(0)
  })

  it('uses the spreadsheet finite-horizon formula for the approved reference case', () => {
    const result = calculateGoldenNumberV2({ ...base, age: 50, years: 10, monthlySpend: 1_500, targetReturn: .12 })
    // 18,000 annual expense, 10-year goal, Excel F9+1 timing convention and finite coverage period.
    expect(result.target).toBeCloseTo(292_060.614, 2)
    expect(result.target).toBeLessThan(18_000 * Math.pow(1.04, 11) / .08)
  })

  it('returns no target when nominal return does not exceed inflation', () => {
    const result = calculateGoldenNumberV2({ ...base, monthlySpend: 1_000_000, targetReturn: .04 })
    expect(result.target).toBe(Infinity)
    expect(result.validationIssue).toBe('net_rate')
  })

  it('returns no target when the selected goal is outside the model horizon', () => {
    const result = calculateGoldenNumberV2({ ...base, age: 80, years: 10, targetReturn: .12 })
    expect(result.target).toBe(Infinity)
    expect(result.validationIssue).toBe('age_horizon')
  })

  it('uses Colombia/COP from a Colombian WhatsApp number and USD otherwise', () => {
    expect(countryFromPhone('+57 320 538 9755')).toBe('CO')
    expect(currencyForCountry(countryFromPhone('+1 305 000 0000'))).toBe('USD')
  })
})
