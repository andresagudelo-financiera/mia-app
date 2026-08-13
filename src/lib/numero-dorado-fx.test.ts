import { describe, expect, it } from 'vitest'
import { convertCurrencyWithSnapshot, incomeRangeOptions, type GoldenNumberFxSnapshot } from './numero-dorado-v2'
const snapshot:GoldenNumberFxSnapshot={requestedDate:'2026-07-31',observationDate:'2026-07-31',source:'test',version:'v1',rates:{USD:1,COP:4100,MXN:18,PEN:3.6,CLP:940,EUR:.93}}
describe('lead magnet FX snapshot',()=>{
 it('renders currency-specific, increasing income labels with trailing currency codes',()=>{const cop=incomeRangeOptions('COP',snapshot).map(x=>x.label);const usd=incomeRangeOptions('USD',snapshot).map(x=>x.label);expect(cop[0]).toBe('Menos de $ 2.100.000 COP');expect(cop[1]).toBe('Entre $ 2.100.000 y $ 4.100.000 COP');expect(usd[0]).toBe('Menos de $ 500 USD');expect(usd[1]).toBe('Entre $ 500 y $ 1.000 USD')})
 it('round trips one whole unit with its locked snapshot',()=>{const cop=convertCurrencyWithSnapshot(500,'USD','COP',snapshot);expect(convertCurrencyWithSnapshot(cop,'COP','USD',snapshot)).toBe(500)})
})
