# Cuentas, sesiones y cupos de sucursal

La autenticación y el hash bcrypt siguen a cargo de Supabase Auth. La aplicación almacena perfiles, autorización de sesiones, desafíos temporales y cupos; nunca almacena contraseñas ni códigos OTP.

## Configuración y despliegue

1. Instalar dependencias con `npm ci` y generar el cliente con `npm run db:generate --workspace=@realty/backend`.
2. Configurar las variables de `.env.example`. Vite lee el entorno desde la raíz; Next necesita las variables exportadas o un `.env.local` en `packages/backend`.
3. Para una base nueva, ejecutar `prisma migrate deploy --schema=prisma/schema.prisma` con `DATABASE_URL`. Para una base existente creada con `db:push`, comprobar que corresponda al esquema anterior, respaldarla y marcar **solo** `202610130000_baseline` como aplicada mediante `prisma migrate resolve --applied 202610130000_baseline --schema=prisma/schema.prisma`; luego ejecutar migrate deploy. No ejecutar la migración inicial sobre tablas existentes.
4. Aplicar `prisma/sql/realtime-messaging.sql` mediante `npm run db:policies` después de las migraciones. El rol de conexión debe poder consultar `auth.sessions`; las políticas se instalan con un rol privilegiado. Las tablas privadas no admiten acceso directo del navegador.
5. En Supabase local, reiniciar el servicio después de cambiar `supabase/config.toml`. En Supabase Cloud, activar confirmación de correo y confirmación doble de cambios, configurar contraseña mínima de 12 caracteres, OTP de 6 dígitos, caducidad de 600 segundos y reenvío mínimo de 60 segundos.
6. Copiar las plantillas de `supabase/templates` al panel de Supabase: confirmación, acceso por OTP, recuperación, cambio de correo y reautenticación. No habilitar la sesión única nativa de Supabase: la autorización de la aplicación preserva la sesión anterior mientras el navegador nuevo completa su código.
7. Configurar SMTP de SendGrid: host `smtp.sendgrid.net`, puerto `587`, usuario `apikey`, contraseña desde `SENDGRID_API_KEY` y remitente verificado desde `SENDGRID_FROM_EMAIL`. Las credenciales se introducen en Supabase y no en el frontend. Configurar Site URL, URLs permitidas y un límite de envío acorde al servicio contratado.
8. Servir frontend y API bajo el mismo sitio, preferentemente con un proxy `/api` como en Vite. La cookie de navegador es HttpOnly, Secure en producción y SameSite=Lax. Si se usan orígenes distintos, configurar CORS con orígenes exactos y credenciales; si pertenecen a sitios distintos, SameSite=None exige HTTPS y puede verse limitado por el bloqueo de cookies de terceros.

La migración conserva cuentas, roles profesionales y cupos anteriores. Las sesiones antiguas carecen de autorización de aplicación y deben volver a iniciar sesión. El primer acceso de un asesor existente solicitará código. Los compradores conservan varias sesiones autorizadas.

### Uso del entorno local

La web usa `http://localhost:5173`, Supabase Studio `http://127.0.0.1:54323` y el buzón de pruebas `http://127.0.0.1:54324`. Los códigos llegan a ese buzón; el SMTP local no entrega correos a destinatarios reales. Las credenciales locales se guardan en `.env.local` y `packages/backend/.env.local`, ignorados por Git.

Para volver a levantar los servicios, ejecutar `npx --yes supabase start -x logflare,vector,edge-runtime,imgproxy,supavisor` y luego `npm run dev`. La exclusión omite servicios auxiliares que estos flujos no necesitan; mantiene Auth, Realtime, Storage, Studio y el buzón local. Las migraciones y las políticas se conservan en la base local entre reinicios.

## Flujos y contratos

- `POST /api/auth/register`: nombres, apellidos, correo, contraseña y tipo de usuario. Devuelve `EMAIL_VERIFICATION_REQUIRED`, sin token de sesión.
- `POST /api/auth/login`: devuelve `AUTHENTICATED` con perfil y tokens de acceso/renovación, o un estado pendiente de verificación. El desafío de navegador incluye `challengeId`.
- `POST /api/auth/verify`: recibe `purpose` (signup, device, recovery, email_change), correo, código y challengeId cuando corresponda. Recuperación devuelve un permiso temporal que solo sirve para cambiar la contraseña, no para acceder a datos.
- `POST /api/auth/resend`, `/recovery`, `/reset-password`, `/password`, `/email` y `/logout` completan los flujos. Los cambios de credenciales y el cierre de sesión requieren Bearer. La recuperación exige el permiso ligado al navegador y a la sesión nativa.
- `GET/PUT /api/auth/profile`: perfil validado. La contraseña nueva admite de 12 caracteres a 72 bytes UTF-8; bcrypt no trunca contraseñas silenciosamente. El acceso admite contraseñas anteriores.
- Errores: `VALIDATION_ERROR` incluye `fieldErrors`; `SESSION_REPLACED`, `DEVICE_VERIFICATION_REQUIRED`, `INVALID_CODE`, `RATE_LIMITED` y `SEAT_LIMIT_REACHED` distinguen resultados esperados.

La API verifica el usuario con Supabase, el identificador de su sesión nativa, la autorización persistida y la cookie HttpOnly ligada a ese navegador. Realtime aplica la misma autorización mediante RLS. Sustituir una sesión retira de inmediato su acceso a nuevas solicitudes y eventos. No se puede retirar información que ya fue descargada. La cookie identifica un navegador autorizado; no es una identidad física del aparato ni impide compartir cuentas por turnos junto con el correo.

## Cupos

Cada Organization es una sucursal independiente. Cuenta cada miembro vinculado, incluido el director, aunque esté bloqueado o de licencia. También cuentan las invitaciones no usadas, no canceladas y no vencidas. Aceptar convierte la reserva en miembro sin consumir un cupo adicional.

Las invitaciones existentes para el mismo correo se reutilizan. La aceptación exige el correo verificado del destinatario, se ejecuta en una transacción y admite reintentos del mismo usuario. Retirar miembros y cancelar/vencer invitaciones libera cupos. No se traslada una cuenta automáticamente entre sucursales.

El operador asigna cupos con `npm run accounts:seats -- <sucursalId> <cupo>`. El comando rechaza un cupo menor que la ocupación y las reservas, y registra el resultado en su salida. Ninguna API pública permite ampliarlo. Cobros, precios y renovaciones quedan fuera de esta entrega.

## Comprobación

- `npm run test:auth`: validaciones, contratos HTTP y reglas de acceso; las pruebas de integración se omiten si no se activa un entorno aislado.
- `npm run test:auth:integration` inicia PostgreSQL y Supabase Auth reales, captura SMTP y elimina sus propios contenedores al terminar. Requiere Docker y los puertos 59941–59947 libres. No utiliza el DATABASE_URL del proyecto. Comprueba bcrypt, registro, verificación, recuperación, cambio de correo, cierre de sesión, RLS y carreras de cupos/sesiones.
- Para incluir las pantallas, instalar Chromium con `npx playwright install chromium` y ejecutar `npm run test:auth:e2e` (equivale a `npm run test:auth:integration -- --e2e`). Genera capturas de registro móvil y panel de cupos en test-results. Los usuarios y correos son ficticios y nunca salen del SMTP de pruebas.
- `npm run type-check --workspaces --if-present`, lint y builds por workspace completan las verificaciones.

Los contadores y desafíos caducan lógicamente. Se pueden eliminar periódicamente los AuthRateLimit vencidos y AuthChallenge consumidos/vencidos; no borrarlos mientras estén vigentes. No registrar cuerpos de autenticación, contraseñas, códigos ni tokens.
