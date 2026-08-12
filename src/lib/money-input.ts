/** Formatting helpers for editable monetary fields.
 * Values stay numeric in the simulator state; only the rendered value is localized.
 */
const localeForCurrency = (currency: string) => currency === 'COP' ? 'es-CO' : 'en-US'
const decimalSeparatorFor = (currency: string) => new Intl.NumberFormat(localeForCurrency(currency)).formatToParts(1.1).find(part => part.type === 'decimal')?.value || '.'

const numericString = (value: number) => {
  if (!Number.isFinite(value)) return '0'
  return String(Math.max(0, value))
}

export function formatMoneyValue(value: number, currency: string) {
  return new Intl.NumberFormat(localeForCurrency(currency), {
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(Math.max(0, Number.isFinite(value) ? value : 0))
}

/**
 * Parses common pasted/input formats independently of the selected display locale.
 * `1.234`, `1,234`, `1.234,50` and `1,234.50` all keep their intended value.
 */
export function parseMoneyValue(value: string, currency: string) {
  const cleaned = value.replace(/[^\d.,]/g, '')
  if (!cleaned) return 0

  if (currency === 'COP') return Number(cleaned.replace(/[.,]/g, '')) || 0

  const separators = [...cleaned.matchAll(/[.,]/g)]
  const last = separators.at(-1)
  const lastIndex = last?.index ?? -1
  const fraction = lastIndex >= 0 ? cleaned.slice(lastIndex + 1) : ''
  // A final one/two digit group is a decimal; a three digit group is thousands.
  const hasDecimal = lastIndex >= 0 && fraction.length > 0 && fraction.length <= 2
  const whole = hasDecimal ? cleaned.slice(0, lastIndex).replace(/[.,]/g, '') : cleaned.replace(/[.,]/g, '')
  return Number(`${whole || '0'}${hasDecimal ? `.${fraction}` : ''}`) || 0
}

/** Preserve a trailing decimal separator while typing, while grouping the integer part. */
export function formatMoneyDraft(value: string, currency: string) {
  const cleaned = value.replace(/[^\d.,]/g, '')
  if (!cleaned) return ''
  const decimalSeparator = decimalSeparatorFor(currency)
  if (currency === 'COP') return formatMoneyValue(parseMoneyValue(cleaned, currency), currency)

  const matches = [...cleaned.matchAll(/[.,]/g)]
  const last = matches.at(-1)
  const lastIndex = last?.index ?? -1
  const fraction = lastIndex >= 0 ? cleaned.slice(lastIndex + 1).replace(/[^\d]/g, '').slice(0, 2) : ''
  const canBeDecimal = lastIndex >= 0 && fraction.length <= 2
  const wholeRaw = canBeDecimal ? cleaned.slice(0, lastIndex) : cleaned
  const whole = wholeRaw.replace(/[.,]/g, '') || '0'
  const grouped = new Intl.NumberFormat(localeForCurrency(currency), { maximumFractionDigits: 0 }).format(Number(whole))
  return canBeDecimal ? `${grouped}${decimalSeparator}${fraction}` : grouped
}

export const moneyPlaceholder = (currency: string) => formatMoneyValue(currency === 'COP' ? 1_000_000 : 10_000, currency)
