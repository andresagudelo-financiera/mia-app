import { describe, expect, it } from 'vitest'
import { classifyProgressiveEntryError } from './progressive-entry-errors'

describe('classifyProgressiveEntryError', () => {
  it('maps an existing email with mismatched WhatsApp to email only', () => {
    expect(
      classifyProgressiveEntryError('Este correo ya existe. Ingresa con el WhatsApp registrado.'),
    ).toEqual({
      target: 'email',
      message:
        'Este correo ya está registrado. Ingresa el WhatsApp con el que creaste la cuenta para recuperar tu avance.',
    })
  })

  it('maps an already registered WhatsApp to a neutral phone-only message', () => {
    expect(classifyProgressiveEntryError('Este WhatsApp ya está registrado.')).toEqual({
      target: 'phone',
      message: 'No pudimos usar este WhatsApp. Verifica el número o usa otro para continuar.',
    })
  })

  it('does not mistake the phone collision recovery hint for an email conflict', () => {
    expect(
      classifyProgressiveEntryError(
        'Ya existe un usuario registrado con este celular. Usa el correo asociado a ese WhatsApp.',
      ),
    ).toEqual({
      target: 'phone',
      message: 'No pudimos usar este WhatsApp. Verifica el número o usa otro para continuar.',
    })
  })

  it('keeps unknown failures as one general message', () => {
    expect(classifyProgressiveEntryError('No pudimos darte acceso a la calculadora.')).toEqual({
      target: 'general',
      message: 'No pudimos darte acceso a la calculadora.',
    })
  })
})
