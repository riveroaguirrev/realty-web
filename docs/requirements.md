# Requerimientos

En el menú **Requerimientos** se publican búsquedas de clientes a nombre del asesor autenticado. Todos los asesores activos pueden consultar las búsquedas y contactar al autor desde la mensajería existente. El autor puede editar, pausar, reactivar y marcar una búsqueda como atendida.

## Campos

Operación (compra, alquiler, anticrético), tipo de inmueble, ciudad/es, zonas alternativas, presupuesto mínimo/máximo o abierto, moneda, habitaciones/baños mínimos, superficie mínima, garaje, planta baja y necesidad de admitir mascotas. Condiciones adicionales (restaurante, calle concurrida, cliente sin mascotas) van en la descripción. No se publican datos personales del cliente.

## Sugerencias

Se calculan al abrir el detalle usando propiedades disponibles. Tipo, operación, ciudad y moneda deben coincidir. No se convierten monedas. Hasta 15% fuera del presupuesto se muestra como alternativa con advertencia; por encima se excluye. Las zonas se buscan en título, descripción y región, nunca en la dirección privada. La planta baja se confirma por `features.floor = 0`, `features.groundFloor = true` o mención en la publicación. Si faltan datos, se señalan para confirmar. Condiciones de texto libre, como uso para restaurante o afluencia de gente, no se evalúan automáticamente.

La puntuación expresa compatibilidad con los campos comparados, no probabilidad de satisfacer todas las necesidades. Las sugerencias se recalculan al consultar, por lo que reflejan publicaciones y cambios posteriores.

## Instalación

Con Node 22 y las dependencias instaladas:

```sh
npm run db:generate -w @realty/backend
node --env-file=.env.local ./node_modules/prisma/build/index.js db execute --file=./prisma/sql/requirements.sql --schema=./prisma/schema.prisma
```

La migración es aditiva e idempotente. No usar `db push --accept-data-loss`.

## Push

1. Generar un par VAPID una vez: `npx web-push generate-vapid-keys --json`.
2. Configurar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` y `PUSH_DELIVERY_SECRET` en el entorno del backend (ver `.env.example`). Conservar el par VAPID entre despliegues.
3. Los usuarios activan avisos mediante el botón de Requerimientos. Requiere un navegador con Web Push y origen seguro (HTTPS o localhost). El permiso se solicita solamente al pulsar el botón.
4. Programar cada minuto un `POST /api/notifications/deliver` con `Authorization: Bearer <PUSH_DELIVERY_SECRET>` para enviar el resto de la cola y reintentar fallos temporales (máximo tres intentos). El envío inmediato procesa hasta 100 avisos por publicación.

Publicación y avisos se guardan en una misma transacción. Los avisos aparecen dentro de la app incluso sin claves VAPID o sin permiso push. El panel Avisos consulta cada 30 segundos y marca como leído al abrir un requerimiento o pulsar la marca de lectura. Un fallo del proveedor no cancela la publicación. Se eliminan suscripciones vencidas (404/410). La etiqueta del aviso evita que los reintentos creen notificaciones duplicadas visibles.

Desactivar avisos o cerrar sesión elimina la suscripción del dispositivo. Una suscripción está vinculada a una sola cuenta. La clave privada VAPID y el secreto de entrega nunca se envían al frontend.

Referencia de transporte: https://github.com/web-push-libs/web-push

## Verificación

```sh
node --test packages/backend/tests/requirements.test.cjs
npm run type-check -w @realty/backend
npm run type-check -w @realty/frontend
npm run build -w @realty/frontend
```

En este entorno se generaron claves de desarrollo en los archivos locales de entorno (ignorados por Git). El despliegue requiere configurar sus propias variables y el programador de reintentos.
