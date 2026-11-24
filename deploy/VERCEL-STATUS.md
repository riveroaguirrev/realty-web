# Publicación de seguridad del 19 de noviembre de 2026

El frontend actualizado está publicado en el proyecto existente `realty-web`, despliegue `dpl_GrDsHSRjqeyod9fLmJx4GokRk5Qn`. El dominio de producción responde HTTP 200 en `/auth/login`.

El backend con **Next.js 16.4.6, React 19.3.1 y Node 22** está publicado en producción: despliegue `dpl_D2x6n6xJBkHwcNqmaTELuS8tMntQ`, estado `READY`, URL única https://realty-856ybhtjd-century21urbanbo-9375s-projects.vercel.app. El dominio estable sigue siendo https://realty-api-century21urbanbo-9375s-projects.vercel.app. Los logs del build remoto confirman Next.js 16.4.6 y la compilación correcta. Se publicaron los mismos 189 archivos de código que la actualización del frontend, mediante la API de Vercel; no se creó un commit ni se hizo push.

Supabase estaba pausado y fue reactivado. El proyecto y sus servicios PostgreSQL, Auth, REST y Storage están en `ACTIVE_HEALTHY`. Se comprobaron los checksums de las cinco migraciones anteriores y se aplicó `202611180001_managed_property_images` con el script de publicación. Las seis migraciones terminaron correctamente. Se verificó RLS en `PropertyImage` y la ausencia de permisos de lectura/escritura para `anon` y `authenticated`. Los conteos se conservaron: cero propiedades y un asesor; la nueva tabla de imágenes tiene cero filas.

Validación posterior: 60 pruebas locales aprobadas, cuatro de integración omitidas y revisión de tipos del backend correcta. Las siete comprobaciones HTTP iniciales en producción pasaron: salud directa y por el proxy del frontend (200 y `{"status":"ok"}`), página de acceso (200), listado público (200), similares y conversaciones sin sesión (401), y formulario de acceso vacío (400).

Se completaron además **20 comprobaciones de la API en producción** con una cuenta temporal: verificación de un código generado administrativamente, cierre e inicio de sesión con contraseña, solicitud autenticada, carga y lectura de JPEG/PNG/WebP, eliminación de EXIF, rechazo de archivos falsos, MIME incorrecto y tamaño superior a 4 MiB, guardado/recarga/edición de la galería en un inmueble archivado temporal, eliminación del inmueble, rechazo de cargas sin sesión y rechazo del token después del cierre de sesión. Se comprobaron las cookies `HttpOnly`, `Secure` y `SameSite=Lax`. Se retiraron la cuenta temporal, sus sesiones, el inmueble y las tres imágenes de Storage y de la tabla de imágenes; se verificó su ausencia y el retorno a cero propiedades, un asesor y cero imágenes.

La entrega real de correo sigue pendiente: Resend informa `not_started` para `auth.century21.bo` y las consultas DNS no encuentran el DKIM ni los dos CNAME documentados en `deploy/RESEND-DNS.md`. No se enviaron correos de prueba ni se modificó la configuración de autenticación. El código usado para probar la sesión se generó mediante la API administrativa; no acredita recepción en un buzón. Estas pruebas fueron por API y no incluyen una revisión visual del formulario ni una conversación Realtime entre usuarios. No se encontraron logs de error/fatal del nuevo despliegue en la ventana revisada. El programador de limpieza física de fotos permanece pendiente de configuración.

La copia de código cargada a Vercel excluye credenciales y tiene SHA-256 `551881d8103bd65267a31e3458cbc803667c52f78b78e7be98e36510e3e3f7e7`. Los IDs vigentes, versiones y comprobaciones están registrados en `deploy/vercel-projects.json`.

## Publicación anterior

# Realty publicado en Vercel

Verificado el 30 de octubre de 2026. Entorno: **producción**. Estado: **READY** en ambos proyectos.

| Proyecto | Framework | URL pública | Región de funciones |
| --- | --- | --- | --- |
| `realty-web` | React/Vite | https://realty-web-century21urbanbo-9375s-projects.vercel.app | Frontend estático |
| `realty-api` | Next.js, Node 22 | https://realty-api-century21urbanbo-9375s-projects.vercel.app | São Paulo (`gru1`) |

Los IDs, las URLs únicas de los despliegues y las comprobaciones están registrados en `deploy/vercel-projects.json`. Los proyectos pertenecen a `century21urbanbo-9375s-projects`, plan Hobby.

## Validación

- Ambos builds remotos terminaron correctamente. Backend: aproximadamente 79 segundos; frontend: aproximadamente 60 segundos.
- La pantalla de acceso del frontend se verificó visualmente y por sus controles en Safari antes de publicarla.
- El backend respondió `{"status":"ok"}` desde el despliegue y desde su dominio de producción, consultando PostgreSQL de Supabase.
- En el dominio público del frontend, `/` y `/auth/login` responden HTTP 200 con el documento `Realty Platform`.
- `/api/health` del frontend responde HTTP 200 y `{"status":"ok"}` a través del proxy al backend.
- Un POST vacío a `/api/auth/login`, con el origen del frontend, devuelve el error esperado `400 VALIDATION_ERROR`. La cookie del navegador tiene `HttpOnly` y `Secure`; la respuesta usa `Cache-Control: no-store`.
- Las comprobaciones públicas se hicieron sin credenciales de Vercel. La configuración de Deployment Protection se conservó.
- No se encontraron registros de nivel error/fatal para estos despliegues en la ventana de 15 minutos posterior a las pruebas. Esta es una revisión puntual, no monitoreo continuo.
- Supabase tiene Site URL y redirects apuntando al dominio publicado del frontend. La base tiene las cinco migraciones y RLS ya verificados.

## Variables y procedencia

El backend conserva sus ocho variables de aplicación de producción; `DATABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` se guardaron como secretos. La integración de Resend añadió `RESEND_API_KEY` y `RESEND_EMAIL_DOMAIN`, ambas restringidas a Production como variables sensibles. El frontend solo tiene sus cuatro variables públicas. Las credenciales se cargaron sin imprimirse y los archivos locales siguen excluidos de Git.

Se desplegó una copia de los **cambios locales actuales**, basada en el commit `728afd1b89b7a13fd2382d065cb512ad4f46e395`, con SHA-256 local del contenido `4cc8c57bb8c877cc27bdc17bb92ef2170074e32d7b0a408441165b0c6c47dbd5`. No se creó un commit ni se hizo push como parte del despliegue. La copia excluye `.git`, archivos `.env*`, dependencias y resultados de compilación locales.

El despliegue fue manual mediante Vercel CLI 65.8.0. No se configuró despliegue automático al hacer push. El enlace local de los dos workspaces está en `.vercel/repo.json`, excluido de Git. Las variables de producción no se comparten con previews.

## Correo transaccional

La integración Free de Resend `resend-email-aqua-grass` está instalada y conectada a `realty-api`. Supabase ya usa su SMTP y tiene las cinco plantillas de códigos cargadas. Queda publicar en Route 53 los tres registros de `auth.century21.bo`, esperar el estado `verified` en Resend y validar el registro/acceso completo con un correo real. No se cargaron las cuentas ni los datos demo locales en la nube.

Los avisos de deprecación de dependencias y el tamaño de los bundles de Vite no impidieron los builds. No se hicieron actualizaciones mayores de dependencias durante esta publicación.
