export type ProgressiveEntryErrorTarget = 'email' | 'phone' | 'general'

/**
 * Maps known progressive-entry conflicts to one safe, actionable field message.
 * A phone conflict deliberately does not disclose whether the number belongs to
 * another account.
 */
export function classifyProgressiveEntryError(message: string): {
  target: ProgressiveEntryErrorTarget
  message: string
} {
  const normalized = message.toLowerCase()
  const indicatesExisting =
    normalized.includes('ya existe') ||
    normalized.includes('ya tienes') ||
    normalized.includes('registrado')
  const mentionsPhone =
    normalized.includes('whatsapp') ||
    normalized.includes('teléfono') ||
    normalized.includes('telefono') ||
    normalized.includes('celular')

  const isEmailWithMismatchedPhone =
    normalized.includes('correo ya existe') ||
    normalized.includes('correo ya está registrado') ||
    normalized.includes('email already exists')

  // Only target the email when the API explicitly says that the email is the
  // conflicting identifier. A phone collision also mentions the associated
  // email in its recovery hint, so treating every message that contains
  // "correo" as an email conflict points the user to the wrong field.
  if (indicatesExisting && isEmailWithMismatchedPhone) {
    return {
      target: 'email',
      message:
        'Este correo ya está registrado. Ingresa el WhatsApp con el que creaste la cuenta para recuperar tu avance.',
    }
  }

  if (indicatesExisting && mentionsPhone) {
    return {
      target: 'phone',
      message: 'No pudimos usar este WhatsApp. Verifica el número o usa otro para continuar.',
    }
  }

  return { target: 'general', message }
}
