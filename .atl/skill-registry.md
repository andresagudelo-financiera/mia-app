# Skill Registry - financieramente

## Project Standards (auto-resolved)

### Frontend (mia-app)
- **Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, Zod.
- **Testing**: Vitest. Ejecutar con `npm run test`.
- **Naming**: camelCase para archivos, PascalCase para componentes.
- **State Management**: Zustand para el estado global.

### Backend (mia-api-backend)
- **Stack**: NestJS, Prisma, TypeScript.
- **Testing**: Jest (Standard NestJS).
- **Database**: MySQL (via Docker).
- **ORM**: Prisma. Usar `npx prisma db push` para sincronización rápida.

## User Skills
| Skill | Trigger | Path |
|-------|---------|------|
| frontend-review | `.tsx`, `.ts` en `mia-app` | `.atl/skills/frontend-review.md` |
| backend-review | `.ts` en `mia-api-backend` | `.atl/skills/backend-review.md` |
