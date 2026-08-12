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

  it('returns an unreachable target when the gross return does not beat inflation', () => {
    expect(calculateGoldenNumberV2({ ...base, monthlySpend: 1_000_000, targetReturn: .04 }).target).toBe(Infinity)
  })

  it('uses Colombia/COP from a Colombian WhatsApp number and USD otherwise', () => {
    expect(countryFromPhone('+57 320 538 9755')).toBe('CO')
    expect(currencyForCountry(countryFromPhone('+1 305 000 0000'))).toBe('USD')
  })
})
