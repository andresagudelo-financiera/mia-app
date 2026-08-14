import { describe, expect, it } from 'vitest'
import { createGoldenNumberV2Pdf } from './numero-dorado-pdf'

describe('Número Dorado PDF plan', () => {
  it('includes the same plan sections and copy as the download modal', () => {
    const pdf = createGoldenNumberV2Pdf({
      input: {
        currency: 'COP',
        answers: {
          nombre: 'andres', edad: 32, ocupacion: 'Independiente o freelance', sector: 'Educación', dependientes: '1',
          destino: 'No me queda nada, el mes cierra justo', experiencia: 'Lo intenté y no me fue bien',
          deuda: 'Tengo, pero las manejo bien', objetivo: 'No depender de una pensión que no sé si va a llegar', urgencia: 'En los próximos tres meses', esperaAnios: 2,
        },
        calculation: {
          monthlyExpense: 2_000_000, targetYears: 10, initialCapital: 0, targetGrossReturn: .08,
          phaseOneMonthlyContribution: 1_000_000, phaseOneGrossReturn: .08, phaseTwoMonthlyContribution: 1_000_000, phaseTwoGrossReturn: .08,
          phaseOneIndexed: false, phaseTwoIndexed: false,
        },
      },
    })
    const contents = Buffer.from(pdf).toString('latin1')

    expect(contents).toContain('TU RETRATO')
    expect(contents).toContain('TU NÚMERO DORADO')
    expect(contents).toContain('Calculado para que tu dinero te alcance hasta los 85 años')
    expect(contents).toContain('DÓNDE ESTÁS HOY')
    expect(contents).toContain('PATRIMONIO PROYECTADO')
    expect(contents).toContain('LO PONEN LOS RENDIMIENTOS')
    expect(contents).toContain('COSTO DE ESPERAR')
    expect(contents).toContain('Lo que te cuesta esperar')
    expect(contents).toContain('TUS TRES PALANCAS')
    expect(contents).toContain('POR DÓNDE EMPEZAR TÚ')
    expect(contents).toContain('Lunes 7 de septiembre')
  })

  it('uses saved session inputs when the lead-magnet endpoint also returns a summary', () => {
    const pdf = createGoldenNumberV2Pdf({
      // The upstream summary omits editable settings and used to produce zeros.
      pdfData: { summary: { futureCapital: 0 } },
      session: {
        input: {
          currency: 'COP',
          answers: {
            nombre: 'andres', edad: 32, ocupacion: 'Independiente o freelance', sector: 'Educación', dependientes: '1',
            destino: 'No me queda nada, el mes cierra justo', experiencia: 'Lo intenté y no me fue bien',
            deuda: 'Tengo, pero las manejo bien', objetivo: 'No depender de una pensión que no sé si va a llegar', urgencia: 'En los próximos tres meses', esperaAnios: 2,
          },
          calculation: {
            monthlyExpense: 2_000_000, targetYears: 10, initialCapital: 100_000_000, targetGrossReturn: .08,
            phaseOneMonthlyContribution: 1_000_000, phaseOneGrossReturn: .08, phaseTwoMonthlyContribution: 1_250_000, phaseTwoGrossReturn: .12,
            phaseOneIndexed: false, phaseTwoIndexed: false,
          },
        },
      },
    })
    const contents = Buffer.from(pdf).toString('latin1')

    expect(contents).toContain('andres, 32 años, Independiente o freelance en Educación')
    expect(contents).toContain('No me queda nada, el mes cierra justo')
    expect(contents).toContain('$\xa0741.396.183')
    expect(contents).toContain('Esperar 2 años')
    expect(contents).toContain('Cada año que esperás es un año que no vuelve.')
    expect(contents).not.toContain('$\xa00')
  })
})

  it('uses the exact live modal values instead of a stale server summary', () => {
    const pdf = createGoldenNumberV2Pdf({
      // This deliberately conflicts with the open modal, reproducing the stale
      // backend payload that previously yielded 1.622 and 231 in the PDF.
      session: { input: { currency: 'COP', answers: { nombre: 'andres', edad: 32, esperaAnios: 2 }, calculation: { monthlyExpense: 2_000_000, targetYears: 10, capital: 0, phaseOneContribution: 0 } } },
      plan: {
        currency: 'COP',
        settings: { monthlySpend: 2_000_000, years: 10, capital: 0, targetReturn: .08, phase1Contribution: 1_000_000, phase1Return: .08, phase2Contribution: 1_250_000, phase2Return: .12, indexPhase1: false, indexPhase2: false, age: 32 },
        calculation: { target: 741_396_183, projected: 210_568_173, returns: 70_568_173, year: 29 },
        waitImpact: { waitYears: 2, cost: 41_197_690 },
      },
    })
    const contents = Buffer.from(pdf).toString('latin1')

    expect(contents).toContain('$\xa0210.568.173')
    expect(contents).toContain('$\xa070.568.173')
    expect(contents).toContain('$ 41 Millones')
    expect(contents).toContain('$\xa041.197.690')
    expect(contents).not.toContain('$\xa01.622')
    expect(contents).not.toContain('$ 231 Millones')
  })
