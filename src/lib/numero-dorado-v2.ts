export const INFLATION = .04
export const PHASE_ONE_YEARS = 5
/** Default only for a new Número Dorado plan; saved user selections are preserved. */
export const DEFAULT_GOLDEN_NUMBER_TARGET_RETURN = .08
/** The questionnaire accepts a whole-number adult age in this inclusive range. */
export const MINIMUM_GOLDEN_NUMBER_AGE = 16
export const MAXIMUM_GOLDEN_NUMBER_AGE = 85
export function isSupportedGoldenNumberAge(value: unknown): boolean {
  const age = Number(value)
  return Number.isInteger(age) && age >= MINIMUM_GOLDEN_NUMBER_AGE && age <= MAXIMUM_GOLDEN_NUMBER_AGE
}
/** Internal model assumption. This is intentionally never exposed in the UI or report. */
const INTERNAL_HORIZON_AGE = 85
export const CURRENCY_RATES: Record<string, number> = { COP: 4100, USD: 1, MXN: 17.5, PEN: 3.7, CLP: 950, EUR: .92 }
export const SUPPORTED_GOLDEN_NUMBER_CURRENCIES = Object.keys(CURRENCY_RATES)
export type GoldenNumberV2Input = Record<string, string | number | boolean>
export type GoldenNumberV2Settings = { monthlySpend:number; years:number; capital:number; targetReturn:number; phase1Contribution:number; phase1Return:number; phase2Contribution:number; phase2Return:number; indexPhase1:boolean; indexPhase2:boolean; age:number }
export type GoldenNumberValidationIssue = 'age_horizon' | 'net_rate' | null
const realRate=(gross:number)=>Math.max(0,gross-INFLATION)

/**
 * Mirrors the spreadsheet's finite-horizon formula.
 *
 * The spreadsheet calculates the target with its `F9 + 1` timing convention.
 * Therefore a person choosing a 10-year goal receives eleven inflation
 * adjustments in the target formula, which reproduces its 292,061 reference
 * case. Age at goal still remains current age + selected years.
 */
export function goldenNumber(monthlySpend:number, years:number, nominalReturn:number, currentAge:number): number {
  const annualExpense = monthlySpend * 12
  const netRate = nominalReturn - INFLATION
  const ageAtGoal = currentAge + years
  const coverageYears = INTERNAL_HORIZON_AGE - ageAtGoal
  if (!Number.isFinite(annualExpense) || !Number.isFinite(netRate) || !Number.isFinite(ageAtGoal) || netRate <= .0001 || coverageYears <= 0) return Infinity
  const spreadsheetInflationPeriods = years + 1
  const projectedAnnualExpense = annualExpense * Math.pow(1 + INFLATION, spreadsheetInflationPeriods)
  const durationFactor = 1 - Math.pow((1 + INFLATION) / (1 + nominalReturn), coverageYears)
  const target = projectedAnnualExpense / netRate * durationFactor
  return Number.isFinite(target) && target >= 0 ? target : Infinity
}

export function validationIssue(s: Pick<GoldenNumberV2Settings, 'age' | 'years' | 'targetReturn'>): GoldenNumberValidationIssue {
  if (!Number.isFinite(s.age) || !Number.isFinite(s.years) || s.age + s.years >= INTERNAL_HORIZON_AGE) return 'age_horizon'
  if (!Number.isFinite(s.targetReturn) || s.targetReturn - INFLATION <= .0001) return 'net_rate'
  return null
}
export function futureValueYears(initial:number, monthly:number, grossReturn:number, years:number, indexed:boolean) { const m=Math.pow(1+realRate(grossReturn),1/12)-1; const annual=Math.pow(1+m,12); let balance=initial; for(let y=0;y<Math.round(years);y++){ const contribution=indexed ? monthly*Math.pow(1+INFLATION,y) : monthly; const annuity=m>0 ? contribution*((annual-1)/m)*(1+m) : contribution*12; balance=balance*annual+annuity } return balance }
export function futureValue(s:GoldenNumberV2Settings, years=s.years) { const y1=Math.min(years,PHASE_ONE_YEARS); return futureValueYears(futureValueYears(s.capital,s.phase1Contribution,s.phase1Return,y1,s.indexPhase1),s.phase2Contribution,s.phase2Return,Math.max(0,years-PHASE_ONE_YEARS),s.indexPhase2) }
export function invested(s:GoldenNumberV2Settings, years=s.years) { let total=s.capital; for(let y=0;y<Math.min(years,PHASE_ONE_YEARS);y++) total += s.phase1Contribution*12*(s.indexPhase1?Math.pow(1+INFLATION,y):1); for(let y=0;y<Math.max(0,years-PHASE_ONE_YEARS);y++) total += s.phase2Contribution*12*(s.indexPhase2?Math.pow(1+INFLATION,y):1); return total }
/** Finds the first meaningful crossover, including years after the selected plan.
 * The graph may therefore extend beyond the chosen deadline, but never beyond
 * the final valid pre-horizon year (age 84 under the fixed internal assumption).
 */
export function reachedYear(s:GoldenNumberV2Settings) {
 if (validationIssue(s)) return null
 const lastEligibleYear = INTERNAL_HORIZON_AGE - s.age - 1
 for (let y=1;y<=lastEligibleYear;y++) {
  if (futureValue(s,y) >= goldenNumber(s.monthlySpend,y,s.targetReturn,s.age)) return y
 }
 return null
}
export function calculateGoldenNumberV2(s:GoldenNumberV2Settings) { const issue=validationIssue(s); const today=goldenNumber(s.monthlySpend,0,s.targetReturn,s.age), target=goldenNumber(s.monthlySpend,s.years,s.targetReturn,s.age), projected=futureValue(s), totalInvested=invested(s), year=reachedYear(s); const seriesEnd=issue ? s.years : Math.max(s.years,year ? Math.min(year+1,INTERNAL_HORIZON_AGE-s.age-1):s.years); return { today,target,projected,totalInvested,returns:Math.max(0,projected-totalInvested),year,validationIssue:issue,series:Array.from({length:Math.max(0,seriesEnd)+1},(_,y)=>({year:y,capital:futureValue(s,y),contributed:invested(s,y),target:goldenNumber(s.monthlySpend,y,s.targetReturn,s.age)})) } }
export function countryFromPhone(phone?:string) { const normalized=(phone||'').replace(/[^\d+]/g,''); return normalized.startsWith('+57')||normalized.startsWith('57') ? 'CO' : undefined }
/**
 * Presentation currency defaults for the public lead magnet. Most American
 * countries use USD until their local currency is supported by this simulator;
 * the user can always change it before seeing results.
 */
export function currencyForCountry(country?:string) {
  return ({
    CO:'COP', MX:'MXN', PE:'PEN', CL:'CLP',
    GF:'EUR', GP:'EUR', MQ:'EUR', BL:'EUR', MF:'EUR', PM:'EUR',
    US:'USD', PR:'USD', VI:'USD', AR:'USD',
  } as Record<string,string>)[country || ''] || 'USD'
}
export function convertCurrency(value:number, from:string, to:string) { return value / (CURRENCY_RATES[from] || 1) * (CURRENCY_RATES[to] || 1) }
export function incomeRanges(currency:string) { return currency==='COP' ? ['Menos de $2 millones','Entre $2 y $4 millones','Entre $4 y $8 millones','Entre $8 y $15 millones','Más de $15 millones'] : ['Menos de USD 500','Entre USD 500 y 1.000','Entre USD 1.000 y 2.000','Entre USD 2.000 y 4.000','Más de USD 4.000'] }
export function suggestedContribution(income:string,destination:string,currency:string) { const usdById:Record<string,number>={'under-500':375,'500-1000':750,'1000-2000':1500,'2000-4000':3000,'over-4000':5000}; const baseUsd=usdById[incomeRangeId(income)]||750; const base=convertCurrencyWithSnapshot(baseUsd,'USD',currency); const pct=destination.includes('nada')?.03:destination.includes('yéndose')?.08:destination.includes('banco')?.15:destination.includes('CDT')?.18:.22; const round=currency==='COP'?50000:currency==='CLP'?1000:currency==='MXN'?100:1; return Math.max(round,Math.round(base*pct/round)*round) }

/** Immutable per-session FX snapshot. Rates are units of currency per USD. */
export type GoldenNumberFxSnapshot = { requestedDate:string; observationDate:string; source:string; version:string; rates:Record<string,number> }
export const DEFAULT_GOLDEN_NUMBER_FX_SNAPSHOT: GoldenNumberFxSnapshot = {
  requestedDate: 'local', observationDate: 'local', source: 'deterministic-local-fallback', version: 'v1', rates: CURRENCY_RATES,
}
export const INCOME_RANGE_IDS = ['under-500','500-1000','1000-2000','2000-4000','over-4000'] as const
const INCOME_USD_BREAKS = [500,1000,2000,4000]
const ROUND_GRANULARITY:Record<string,number>={COP:100000,CLP:1000,MXN:100,USD:1,EUR:1,PEN:1}
export function roundCurrencyAmount(value:number,currency:string){const g=ROUND_GRANULARITY[currency]||1;return Math.round(value/g)*g}
export function convertCurrencyWithSnapshot(value:number,from:string,to:string,snapshot:GoldenNumberFxSnapshot=DEFAULT_GOLDEN_NUMBER_FX_SNAPSHOT){if(from===to)return Math.round(value);const rates=snapshot.rates||CURRENCY_RATES;return Math.round(value/(rates[from]||1)*(rates[to]||1))}
export function formatCurrencyInteger(value:number,currency:string){return new Intl.NumberFormat(currency==='COP'||currency==='CLP'?'es-CO':'en-US',{style:'currency',currency,maximumFractionDigits:0}).format(Math.round(value))}
/**
 * Formats Magned income ranges with the selected currency code after the value.
 * IDs and underlying USD-equivalent breaks stay stable for persistence/conversion.
 */
export function incomeRangeOptions(currency:string,snapshot:GoldenNumberFxSnapshot=DEFAULT_GOLDEN_NUMBER_FX_SNAPSHOT){
 const rate=snapshot.rates?.[currency]||CURRENCY_RATES[currency]||1
 const amounts=INCOME_USD_BREAKS.map(n=>roundCurrencyAmount(n*rate,currency))
 const amount=(n:number)=>`$ ${new Intl.NumberFormat('es-CO',{maximumFractionDigits:0}).format(Math.round(n))}`
 return INCOME_RANGE_IDS.map((id,index)=>({id,label:index===0?`Menos de ${amount(amounts[0])} ${currency}`:index===INCOME_RANGE_IDS.length-1?`Más de ${amount(amounts[3])} ${currency}`:`Entre ${amount(amounts[index-1])} y ${amount(amounts[index])} ${currency}`}))
}
export function incomeRangeId(value:unknown){const raw=String(value||'');if((INCOME_RANGE_IDS as readonly string[]).includes(raw))return raw;const legacy=raw.toLowerCase();if(legacy.includes('menos'))return 'under-500';if(legacy.includes('2 y $4')||legacy.includes('500 y 1'))return '500-1000';if(legacy.includes('4 y $8')||legacy.includes('1.000 y 2'))return '1000-2000';if(legacy.includes('8 y $15')||legacy.includes('2.000 y 4'))return '2000-4000';return 'over-4000'}
