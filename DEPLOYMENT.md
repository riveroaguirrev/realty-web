# Publicar Realty en Vercel y Supabase

La aplicación se publica como dos proyectos de Vercel del mismo repositorio. Supabase Cloud aloja PostgreSQL, Auth, Realtime y Storage. El navegador llama a `/api` en el dominio del frontend; Vercel reenvía esas solicitudes al backend y conserva la cookie de autorización del navegador.

El proyecto cloud ya creado y sus tareas pendientes están registrados en [deploy/SUPABASE-STATUS.md](./deploy/SUPABASE-STATUS.md). Usa ese estado antes de crear otro proyecto o repetir la configuración inicial.

El frontend y el backend ya están publicados. Consulta las URLs y las comprobaciones de producción en [deploy/VERCEL-STATUS.md](./deploy/VERCEL-STATUS.md).

## 1. Preparar el repositorio

Usa Node 22 (`nvm install && nvm use`) y ejecuta `npm ci` desde la raíz. Ambos proyectos tienen configuración de Vercel y el backend genera Prisma antes de compilar. Sube el repositorio a GitHub sin incluir archivos `.env*.local` ni credenciales.

## 2. Crear Supabase Cloud

Crea un proyecto independiente para producción. En **Connect**, copia las conexiones de PostgreSQL. En la configuración de API, copia la URL, la clave `anon` y la clave `service_role` (claves JWT legacy compatibles con este cliente).

Las plantillas de variables están en `deploy/`. Sustituye todos los ejemplos; no copies las claves del Supabase local. La clave `service_role` y las conexiones PostgreSQL van exclusivamente en el backend o en tu equipo para aplicar migraciones. Nunca uses el prefijo `VITE_` para secretos.

### Base de datos

1. Copia `deploy/database.env.example` a `.env.production.local` en la raíz.
2. Completa `DIRECT_URL` con la conexión **Session pooler, puerto 5432**. También puedes usar la conexión directa si tu red admite IPv6. Codifica los caracteres especiales de la contraseña en la URL.
3. Ejecuta desde la raíz:

```sh
node --env-file=.env.production.local scripts/deploy-database.cjs
```

Este comando ejecuta `prisma migrate deploy` sobre la conexión indicada. Aplica las migraciones existentes y las políticas RLS de mensajería y Realtime, sin iniciar sesión ni cargar datos demo. No usa `db push` ni `migrate dev`. Las migraciones se ejecutan como paso explícito de publicación, fuera del build de Vercel.

Estas instrucciones presuponen un proyecto nuevo. Si ya tiene tablas o datos de Realty, revisa el historial de migraciones antes de aplicar el comando; no resetees esa base de datos.

El backend utilizará otra conexión: **Transaction pooler, puerto 6543**, con `pgbouncer=true&connection_limit=1&sslmode=require` en `DATABASE_URL`. El esquema usa `DATABASE_URL`; el script de publicación la sustituye por `DIRECT_URL` solo durante las migraciones.

### Correos y acceso

En **Authentication**:

- Mantén activada la confirmación de correo y configura SMTP propio con un remitente verificado. Producción usa Resend sobre `smtp.resend.com:465` y `noreply@auth.century21.bo`.
- Usa `supabase/templates/code.html` para Confirm signup, Magic Link, Reset password y Reauthentication. Usa `supabase/templates/email-change.html` para Change email address.
- Configura códigos de 6 dígitos con vencimiento de 600 segundos. Conserva la confirmación segura de cambios de correo.
- Configura Site URL y las Redirect URLs con la URL HTTPS del frontend, incluida `/auth/verify`.

La pantalla de Realty solicita un código, por eso el correo debe incluir `{{ .Token }}`. Las cuentas `@demo.realty.test` son locales; en producción registra una cuenta con un correo que puedas recibir.

El estado actual de SMTP, plantillas y verificación DNS está documentado en `deploy/SUPABASE-STATUS.md`. No envíes pruebas hasta que Resend muestre `auth.century21.bo` como `verified`.

### Fotografías

Crea en Storage un bucket llamado `properties`, público, con límite de **4194304 bytes (4 MiB)** y tipos `image/jpeg`, `image/png`, `image/webp`. Las escrituras pasan por el backend con permisos de administrador y validación del asesor; no crees políticas de escritura pública. Si el bucket no existe, el backend intenta crearlo en la primera carga. Aplica la migración `202611180001_managed_property_images` antes de publicar el backend que registra las cargas. Las galerías anteriores conservan sus URLs, y los objetos sin procedencia verificada quedan fuera de la limpieza física. Una URL de foto publicada puede seguir siendo legible aunque se archive la ficha.

Para habilitar la limpieza de objetos gestionados, usa una clave propia en `PROPERTY_IMAGE_CLEANUP_SECRET` y programa un `POST /api/properties/images/cleanup` con el encabezado `Authorization: Bearer <clave>`. Habilítalo después de verificar galería y permisos en una preview, y cuando todas las versiones activas del backend usen el registro seguro de cargas. La limpieza incluye cargas gestionadas sin vincular de más de siete días. Para pausarla, detén ese trabajo; las galerías siguen funcionando.

La aplicación admite hasta 4 MiB por fotografía, enviada individualmente en multipart. Esto deja margen para los encabezados dentro del límite de 4.5 MB de las funciones de Vercel. Las fotos antiguas de 5 MB pueden seguir leyéndose.

## 3. Publicar el backend

Importa el repositorio en Vercel y crea el proyecto del backend:

| Ajuste | Valor |
| --- | --- |
| Framework | Next.js |
| Root Directory | `packages/backend` |
| Include source files outside of the Root Directory in the Build Step | Activado |
| Node.js | 22.x |
| Build Command | `npm run build` (definido en `vercel.json`) |
| Output Directory | Predeterminado de Next.js |

Mantén la instalación automática de npm del monorepo; no instales solo el workspace, porque Prisma, el lockfile y los tipos compartidos están fuera de esa carpeta.

Carga las variables de `deploy/backend.env.example`. Elige desde ahora el nombre del proyecto frontend y utiliza su URL estable en `NEXT_PUBLIC_APP_URL` y `CORS_ALLOWED_ORIGINS`. Si después cambia, actualiza ambas y vuelve a desplegar el backend.

No establezcas `NODE_ENV` manualmente. No hacen falta Stripe, S3, Redis ni SendGrid para las funcionalidades actuales; SMTP se configura en Supabase. `TRUST_PROXY` queda desactivado hasta confirmar cómo el proxy entrega la IP del cliente.

Publica y conserva la URL estable HTTPS del backend. Tras aplicar las migraciones, `/api/health` debe responder HTTP 200 con `{"status":"ok"}`. Un 503 indica que no pudo consultar PostgreSQL.

El frontend necesita llamar al backend a través del proxy. La protección de despliegues de Vercel no debe interponer una página de acceso en el dominio de producción de la API. Puedes mantener las previews protegidas.

## 4. Conectar y publicar el frontend

Antes de desplegarlo, configura el proxy desde la raíz con la URL real obtenida en el paso anterior:

```sh
npm run deploy:configure -- https://TU-BACKEND.vercel.app
```

Este comando actualiza `packages/frontend/vercel.json`. Incluye ese cambio en el commit que subas. Inicialmente el destino es `backend.example.invalid` para evitar enviar credenciales a un proyecto ajeno; el build en Vercel se detiene hasta configurarlo. El proxy se configura antes del build porque Vercel procesa las rutas antes de compilar.

Importa el mismo repositorio como segundo proyecto:

| Ajuste | Valor |
| --- | --- |
| Framework | Vite |
| Root Directory | `packages/frontend` |
| Include source files outside of the Root Directory in the Build Step | Activado |
| Node.js | 22.x |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Carga las variables de `deploy/frontend.env.example` y publica. `VITE_API_URL` debe ser `/api`; no pongas la URL del backend allí. El proxy mantiene las cookies bajo el dominio del frontend y la segunda regla permite recargar rutas como `/dashboard` sin recibir 404.

En Mapbox, permite la URL HTTPS del frontend en las restricciones del token público. Actualiza las URLs en Supabase y el backend si difieren del nombre elegido.

## 5. Comprobar el despliegue

1. Abre `https://TU-FRONTEND.vercel.app/api/health`: debe devolver el mismo estado que el backend, no HTML.
2. Recarga `/auth/login` y `/dashboard` directamente para comprobar las rutas del frontend.
3. Registra una cuenta real, recibe el código y verifica el acceso. Cambia de navegador para comprobar la autorización por código.
4. Publica una propiedad con una foto de menos de 4 MiB y comprueba que se muestra desde Supabase Storage.
5. Prueba el mapa, favoritos y una conversación entre dos cuentas; confirma que llegan mensajes en Realtime.

No uses el procedimiento administrativo de acceso de la cuenta demo local en producción.

### Orden de actualización para similares y fotografías

1. En la preview, aplica primero la migración de imágenes y comprueba crear, editar, recortar y quitar fotos con un asesor y un director de su oficina. Incluye una propiedad antigua.
2. Publica el frontend que envía la sesión para consultar propiedades similares. Es compatible con la API anterior. Después de validar el cliente, publica el backend que exige la sesión. Las pestañas abiertas con la versión anterior pueden requerir una recarga.
3. Habilita el programador de limpieza después de actualizar los procesos del backend. Durante una reversión, pausa la limpieza y conserva la migración aditiva.

### Previews y notificaciones

Para previews, utiliza otro Supabase de pruebas y un backend de preview estable. Configura su origen exacto en el proxy y en `CORS_ALLOWED_ORIGINS`; no mezcles la base de pruebas con producción. Las variables `VITE_*` quedan incorporadas al bundle y requieren un nuevo build si cambian.

Las notificaciones dentro de la aplicación no requieren un trabajador persistente. Para habilitar Web Push configura las claves VAPID y programa un servicio externo que haga POST a `/api/notifications/deliver` con `Authorization: Bearer PUSH_DELIVERY_SECRET`. No hay un cron automático incluido: el endpoint usa POST y autenticación propia. Una vez verificado que el despachador consume la cola regularmente, configura `PUSH_DELIVERY_SCHEDULED=true` para sacar el envío de la ruta de publicación y mantener la entrega en segundo plano.

## Referencias

- [Monorepos en Vercel](https://vercel.com/docs/monorepos)
- [Archivos fuera del Root Directory](https://vercel.com/docs/monorepos/monorepo-faq)
- [Rewrites de Vercel](https://vercel.com/docs/routing/rewrites)
- [Límite de carga de funciones](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions)
- [Prisma con Supabase](https://supabase.com/docs/guides/database/prisma)
- [SMTP de Supabase](https://supabase.com/docs/guides/auth/auth-smtp)
