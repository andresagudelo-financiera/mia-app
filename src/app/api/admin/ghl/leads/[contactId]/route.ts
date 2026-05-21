import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import {
  GhlApiError,
  GhlConfigurationError,
  extractMiaUserIdFromGhlContact,
  getGhlClientConfig,
  getGhlContact,
  getGhlContactNotes,
  getGhlContactTasks,
  resolveGhlStaffMapping,
} from '@/lib/ghl/client'

export const dynamic = 'force-dynamic'

const STAFF_PANEL_ROLES = new Set(['admin', 'coach', 'money_strategist'])

type RouteContext = {
  params: { contactId: string }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  if (!token || !STAFF_PANEL_ROLES.has(String(token.role || '')) || token.isActive !== true) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const config = getGhlClientConfig()
  const isAdmin = token.role === 'admin'
  const locationId = config.defaultLocationId

  try {
    const mapping = await resolveGhlStaffMapping(String(token.email || ''), locationId, config)

    if (!isAdmin && !mapping?.assignedTo) {
      return NextResponse.json({
        error: 'No encontramos en GHL un usuario staff con el email de esta sesión.',
        code: 'GHL_STAFF_USER_NOT_FOUND',
      }, { status: 403 })
    }

    const [contactPayload, notesPayload, tasksPayload] = await Promise.all([
      getGhlContact(context.params.contactId, config),
      getGhlContactNotes(context.params.contactId, config).catch(error => ({ error: error instanceof Error ? error.message : 'No se pudieron cargar notas' })),
      getGhlContactTasks(context.params.contactId, config).catch(error => ({ error: error instanceof Error ? error.message : 'No se pudieron cargar tareas' })),
    ])
    const contact = contactPayload?.contact || contactPayload

    if (!isAdmin && mapping?.assignedTo && contact?.assignedTo && contact.assignedTo !== mapping.assignedTo) {
      return NextResponse.json({ error: 'Este lead no está asignado a tu usuario GHL.' }, { status: 403 })
    }

    return NextResponse.json({
      contact: { ...contact, miaUserId: extractMiaUserIdFromGhlContact(contact) },
      notes: notesPayload?.notes || notesPayload?.data?.notes || [],
      tasks: tasksPayload?.tasks || tasksPayload?.data?.tasks || [],
    })
  } catch (error) {
    if (error instanceof GhlConfigurationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }
    if (error instanceof GhlApiError) {
      return NextResponse.json({ error: error.message, code: error.code, details: error.payload }, { status: error.status || 502 })
    }
    const message = error instanceof Error ? error.message : 'Error consultando detalle GHL'
    return NextResponse.json({ error: message, code: 'GHL_UNKNOWN_ERROR' }, { status: 502 })
  }
}
