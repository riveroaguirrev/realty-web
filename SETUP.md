# Desarrollo local

Este repositorio tiene un frontend React/Vite (`localhost:5173`), una API Next.js (`localhost:3000`) y Supabase local para PostgreSQL, Auth, Storage y Realtime.

## Requisitos

- Node.js 20.6 o superior (recomendado: 22)
- npm
- Docker Desktop abierto y en ejecución
- PowerShell en Windows

## Preparación en Windows

Desde la raíz del repositorio:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-local.ps1
npm run dev
```

El script instala las dependencias desde `package-lock.json`, inicia Supabase, crea `.env.local` para Vite y `packages/backend/.env.local` para Next.js, sincroniza Prisma y aplica las políticas de mensajería. Ambos archivos de entorno son locales y están ignorados por Git. No copies claves de otro equipo: el script obtiene las de tu instancia de Supabase.

Abre la aplicación en <http://localhost:5173>. La API responde en <http://localhost:3000> y Supabase Studio en <http://localhost:54323>.

## Arranques posteriores

Abre Docker Desktop y ejecuta:

```powershell
npx --yes supabase start
npm run dev
```

Si cambió `prisma/schema.prisma`, ejecuta `npm run db:push` y `npm run db:policies` antes de iniciar la aplicación. Para detener los servidores de desarrollo, presiona Ctrl+C. Para detener Supabase, usa `npx --yes supabase stop`.

## Comprobación

```powershell
npm run type-check
npm run lint
npm run build
```

`GET http://localhost:3000/api/properties` debe responder con `success: true`. En una base recién creada, `data` será una lista vacía.

## Notas

- `README.md`, `SETUP_STATUS.md` y `SETUP_COMPLETE.md` contienen descripciones históricas; este archivo refleja el arranque local actual.
- La base local se sincroniza con `db:push`. El repositorio todavía no versiona migraciones Prisma.
- Los proveedores externos mencionados en `.env.example` (pagos, correo y AWS) no son necesarios para los flujos locales implementados.
