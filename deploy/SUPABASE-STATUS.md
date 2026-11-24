# Supabase Cloud de Realty

Estado del proyecto y migraciones verificado el 19 de noviembre de 2026. La configuración de correo y Auth de las secciones siguientes corresponde a la verificación del 30 de octubre.

- Organización: Realty (`isxbabgpsjidwjrowciq`), plan Free.
- Proyecto: `realty` (`avstudixpieawyfowpws`), región São Paulo (`sa-east-1`).
- [Panel del proyecto](https://supabase.com/dashboard/project/avstudixpieawyfowpws).
- API: `https://avstudixpieawyfowpws.supabase.co`.
- Repositorio vinculado mediante Supabase CLI; el enlace local está en `supabase/.temp/` y no se sube a Git.
- Proyecto reactivado el 19 de noviembre tras encontrarlo en `INACTIVE`; proyecto, PostgreSQL, Auth, REST y Storage verificados en `ACTIVE_HEALTHY`.
- Seis migraciones Prisma aplicadas, incluida `202611180001_managed_property_images`. Los checksums de las cinco anteriores coinciden con el repositorio. La nueva tabla `PropertyImage` tiene RLS activado y no concede permisos a `anon` ni `authenticated`; el historial de Prisma no es accesible para los roles del navegador.
- Políticas de mensajería instaladas y `Message` publicado en Realtime. La función de comprobación de sesiones está en el esquema privado.
- Revisión de seguridad de Supabase: sin avisos de nivel WARN o ERROR.
- Las 13 pruebas de integración de acceso pasaron en una base aislada con las nuevas migraciones.

## Credenciales locales

Los archivos siguientes tienen permisos 600 y están excluidos de Git:

- `.env.production.local`: contraseña PostgreSQL, conexiones Session/Transaction pooler y claves de Supabase.
- `.env.vercel-backend.local`: valores reales de Supabase y PostgreSQL para el backend.
- `.env.vercel-frontend.local`: URL de Supabase, clave pública, `/api` y token público de Mapbox.
- `packages/backend/.env.local`: variables locales descargadas por la integración de Resend; está excluido de Git.

Las claves de administrador nunca deben copiarse al frontend ni incluirse en commits.

## Auth y almacenamiento configurados

Autorizados por la usuaria y verificados en Supabase:

- Confirmación de correo activada; confirmación segura de cambio de correo activada.
- OTP de seis dígitos, válido por 600 segundos; contraseña mínima de 12 caracteres.
- Cambio de contraseña con reautenticación segura activado.
- SMTP personalizado configurado con Resend (`smtp.resend.com:465`) y remitente `Realty <noreply@auth.century21.bo>`.
- Plantillas de registro, acceso/OTP, recuperación, reautenticación y cambio de correo cargadas con `{{ .Token }}`.
- Site URL y redirects apuntan al frontend publicado, incluida `/auth/verify`.
- Bucket `properties` público para leer fotografías, máximo 4194304 bytes, tipos JPEG/PNG/WebP.
- Lectura pública comprobada con una imagen temporal eliminada al terminar la prueba.
- Una carga con la clave `anon` fue rechazada por RLS. No se crearon políticas de escritura pública.

## Pendientes

**Verificación DNS de Resend:** la integración `resend-email-aqua-grass` está creada en Vercel, conectada a `realty-api` y restringida al entorno Production. El dominio de envío `auth.century21.bo` todavía requiere publicar en Route 53 los tres registros generados por Resend (DKIM y dos CNAME). Hasta que Resend muestre el dominio como `verified`, la entrega real de correos no está habilitada.

Los valores exactos para entregar al administrador del dominio están en [`deploy/RESEND-DNS.md`](./RESEND-DNS.md).

La API key de Resend está almacenada como secreto sensible en Vercel y como contraseña SMTP en Supabase. No se copia al frontend ni al bundle. El plan de Resend es Free (3.000 correos al mes, límite de 100 al día).

El frontend y el backend se actualizaron en Vercel el 19 de noviembre de 2026; el backend publicado usa Next.js 16.4.6. La salud de la API responde HTTP 200 tanto directamente como mediante el frontend; las comprobaciones están en `deploy/VERCEL-STATUS.md`. CORS del backend permite el origen publicado. El acceso completo por correo queda pendiente de verificar el DNS y ejecutar una prueba de registro con un buzón real. Los conteos comprobados antes y después de la migración fueron cero propiedades y un asesor.
