# 📊 Realty Platform - Database Design Analysis

**Objetivo:** Optimizar estructura de datos para máxima funcionalidad y escalabilidad

---

## 1. Organization (Oficinas Inmobiliarias)

### ✅ Campos Actuales
- `id`, `name`, `slug`, `description`, `city`, `region`, `phone`, `email`, `website`, `logo`, `createdById`, `createdAt`, `updatedAt`

### 🔍 Análisis & Mejoras

**Agregar:**
- `status` (ACTIVE, INACTIVE, SUSPENDED) → Controlar oficinas activas
- `verified` (boolean) → Para verificación de oficinas
- `tier` (FREE, PREMIUM, ENTERPRISE) → Modelo de suscripción
- `maxAdvisors` (int) → Límite según tier
- `maxProperties` (int) → Límite según tier
- `apiKeyHash` (string) → Para API integrations
- `webhookUrl` (string) → Para notificaciones externas
- `taxId` (string) → RFC/RUT para facturación
- `bankAccount` (JSON) → Información bancaria para comisiones
- `businessHours` (JSON) → Horarios de atención
- `socialLinks` (JSON) → {facebook, instagram, linkedin, etc}
- `avatar` (string) → Logo alternativo

**Razón:** Soportar modelo de negocio, integraciones, y pagos

---

## 2. Advisor (Asesores/Agentes)

### ✅ Campos Actuales
- `id`, `firstName`, `lastName`, `email`, `phone`, `profileImage`, `bio`, `organizationId`, `specializations`, `rating`, `reviewCount`, `isVerified`, `isActive`, `createdAt`, `updatedAt`

### 🔍 Análisis & Mejoras

**Agregar:**
- `role` (AGENT, MANAGER, DIRECTOR) → Jerarquía dentro de org
- `licenseNumber` (string) → Número de cédula/licencia
- `licenseExpiry` (date) → Validez de licencia
- `yearsExperience` (int) → Experiencia en inmuebles
- `language` (array) → [ES, EN, PT, etc]
- `serviceArea` (JSON) → {cities: [], regions: []} → Zona de cobertura
- `commissionRate` (float) → Porcentaje personal de comisión
- `bankAccount` (JSON) → Para pagos de comisiones
- `documentUrl` (string) → Link a documentos verificación
- `status` (ACTIVE, INACTIVE, BLOCKED, ON_LEAVE)
- `lastLoginAt` (timestamp) → Para auditoría
- `totalPropertiesListed` (int) → Contador (desnormalizado pero útil)
- `totalSalesCommission` (decimal) → Total ganado
- `averageResponseTime` (int) → En minutos (calculado)
- `acceptanceRate` (float) → % de requerimientos aceptados
- `metadata` (JSON) → Custom fields

**Razón:** Verificación legal, comisiones, performance metrics, disponibilidad

---

## 3. Property (Inmuebles)

### ✅ Campos Actuales
- `id`, `title`, `description`, `slug`, `type`, `price`, `currency`, `address`, `city`, `region`, `latitude`, `longitude`, `zipCode`, `bedrooms`, `bathrooms`, `areaSquareMeters`, `hasGarage`, `hasGarden`, `hasPool`, `yearBuilt`, `images`, `videoUrl`, `advisorId`, `organizationId`, `status`, `createdAt`, `updatedAt`, `publishedAt`

### 🔍 Análisis & Mejoras

**Agregar:**
- `propertyTax` (decimal) → Impuestos anuales
- `hoaFees` (decimal) → Cuota de condominio
- `utilities` (JSON) → {electricity, water, internet, etc} → Servicios disponibles
- `condition` (NEW, EXCELLENT, GOOD, FAIR, NEEDS_REPAIR)
- `furnished` (UNFURNISHED, PARTIALLY_FURNISHED, FULLY_FURNISHED)
- `parking` (int) → Número de estacionamientos
- `lotSize` (float) → Tamaño del lote
- `yearRenovated` (int) → Última renovación
- `features` (JSON) → {hasElevator, hasSecurityGate, hasGym, hasPool, hasSauna, etc}
- `amenities` (JSON) → {balcony, patio, terrace, etc}
- `appliances` (array) → [stove, refrigerator, washer, etc]
- `school` (string) → Escuela más cercana
- `distanceToSchool` (float) → En km
- `distanceToTransit` (float) → A transporte público
- `petPolicy` (ALLOWED, NOT_ALLOWED, RESTRICTIONS) → Mascotas
- `rentalMonthlyRate` (decimal) → Si está en arriendo
- `rentalFurnished` (boolean)
- `availableDate` (date) → Disponible desde
- `visitNotes` (text) → Notas de visita
- `viewCount` (int) → Vistas totales
- `favoritesCount` (int) → Veces guardada como favorita
- `contact` (JSON) → {name, phone, email} → Contacto de propiedad
- `documents` (JSON) → {deedUrl, taxReceipt, etc}
- `mapUrl` (string) → Link a mapa
- `virtualTourUrl` (string) → Link a tour 360
- `priceHistory` (JSON) → [{date, price}] → Para análisis de tendencias

**Razón:** Información completa para matching, búsqueda, y decisión de compra

---

## 4. Requirement (Requerimientos de Búsqueda)

### ✅ Campos Actuales
- `id`, `title`, `description`, `buyerId`, `propertyType`, `priceMin`, `priceMax`, `currency`, `cities`, `regions`, `bedroomsMin`, `bedroomsMax`, `bathroomsMin`, `bathroomsMax`, `areaMin`, `areaMax`, `requiresGarage`, `requiresGarden`, `requiresPool`, `isActive`, `priority`, `createdAt`, `updatedAt`

### 🔍 Análisis & Mejoras

**Agregar:**
- `status` (ACTIVE, PAUSED, FULFILLED, EXPIRED) → Estado del requerimiento
- `timeline` (IMMEDIATE, WITHIN_3_MONTHS, WITHIN_6_MONTHS, FLEXIBLE)
- `budget` (JSON) → {min, max, flexible, preApproved}
- `financing` (CASH, MORTGAGE, OTHER) → Tipo de financiamiento
- `downPayment` (decimal) → Entrada disponible
- `furnished` (UNFURNISHED, PARTIALLY_FURNISHED, FULLY_FURNISHED, DOESNT_MATTER)
- `petPolicy` (REQUIRED, ALLOWED, NOT_IMPORTANT)
- `schoolDistrict` (string) → Distrito escolar preferido
- `commute` (JSON) → {workplace, maxDistance, preferences}
- `dealBreakers` (array) → Condiciones no negociables
- `niceToHave` (array) → Preferencias flexibles
- `maxCommute` (float) → Máximo en km
- `preferredAmenities` (array) → Servicios deseados
- `mustHaveFeatures` (array) → Características obligatorias
- `excludeCities` (array) → Ciudades a excluir
- `contactFrequency` (DAILY, WEEKLY, MONTHLY, AS_NEEDED)
- `notificationMethod` (EMAIL, SMS, PUSH, WHATSAPP)
- `viewedProperties` (array) → IDs de propiedades vistas
- `favoritedProperties` (array) → IDs de favoritos
- `rejectedProperties` (array) → IDs rechazadas (para no re-sugerir)
- `expiryDate` (date) → Requerimineto expira
- `matchCount` (int) → Total de matches recibidos
- `responseRate` (float) → % de propiedades contactadas

**Razón:** Matching más preciso, historial de búsqueda, personalizacion

---

## 5. Match (Sugerencias/Recomendaciones)

### ✅ Campos Actuales
- `id`, `requirementId`, `propertyId`, `advisorId`, `matchScore`, `reason`, `status`, `createdAt`, `updatedAt`, `viewedAt`, `contactedAt`

### 🔍 Análisis & Mejoras

**Agregar:**
- `matchBreakdown` (JSON) → {priceMatch: 0.9, locationMatch: 0.85, featuresMatch: 0.8, ...}
- `algorithm` (EXACT, FUZZY, AI) → Qué algoritmo lo generó
- `confidence` (float) → 0-1, confianza del match
- `reasons` (array) → ["price es 5% más alto", "en zona deseada", "tiene piscina"]
- `mismatches` (array) → Qué no coincide exactamente
- `contactedBy` (ADVISOR, BUYER, SYSTEM)
- `notes` (text) → Notas del advisor
- `feedback` (INTERESTED, NOT_INTERESTED, WANT_MORE_INFO, SCHEDULED_VIEWING)
- `closedReason` (SOLD, LEASED, NO_RESPONSE, NOT_INTERESTED, OTHER)
- `communicationChannel` (EMAIL, PHONE, WHATSAPP, IN_PERSON)
- `communicationHistory` (array) → [{date, message, from}]
- `viewingDate` (date) → Cuándo se visitó
- `viewingNotes` (text) → Impresiones de la visita
- `nextFollowUpDate` (date) → Próximo follow-up
- `priority` (HIGH, MEDIUM, LOW)

**Razón:** Transparencia en matching, historial de comunicación, conversión

---

## 6. Commission (Comisiones)

### ✅ Campos Actuales
- `id`, `organizationId`, `percentage`, `description`, `createdAt`, `updatedAt`

### 🔍 Análisis & Mejoras

**Reemplazar por CommissionStructure (mejor nombre)**

**Agregar:**
- `type` (PERCENTAGE, FIXED, TIERED, REVENUE_SHARE)
- `basePercentage` (float) → Comisión base
- `bonusThreshold` (decimal) → Monto para bonificar
- `bonusPercentage` (float) → Comisión adicional por sobre threshold
- `tierStructure` (JSON) → {0-100000: 3%, 100001-500000: 4%, 500001+: 5%}
- `appliesTo` (ADVISOR, ORGANIZATION, BOTH)
- `forPropertyType` (array) → [RESIDENTIAL, COMMERCIAL, etc] o null (todas)
- `forCities` (array) → Ciudades donde aplica, o null (todas)
- `minTransactionAmount` (decimal) → Monto mínimo
- `maxPercentage` (float) → Límite máximo
- `status` (ACTIVE, ARCHIVED)
- `effectiveFrom` (date)
- `effectiveUntil` (date)
- `notes` (text)

**Razón:** Modelo de comisiones flexible y escalable

---

## 7. Notification (Notificaciones)

### ✅ Campos Actuales
- `id`, `advisorId`, `type`, `title`, `message`, `data`, `isRead`, `readAt`, `createdAt`

### 🔍 Análisis & Mejoras

**Agregar:**
- `recipientType` (ADVISOR, BUYER, ORGANIZATION, ADMIN)
- `channel` (EMAIL, SMS, PUSH, IN_APP, WHATSAPP)
- `priority` (LOW, NORMAL, HIGH, URGENT)
- `actionUrl` (string) → Link si necesita acción
- `actionLabel` (string) → Texto del botón
- `relatedEntityId` (string) → ID de property/requirement/match
- `relatedEntityType` (string) → Qué entidad es
- `sendAttempts` (int) → Intentos de envío
- `lastAttemptAt` (timestamp)
- `failureReason` (string) → Por qué falló
- `scheduledFor` (timestamp) → Enviar en futuro
- `expiresAt` (timestamp) → Notificación caduca
- `dismissedAt` (timestamp)
- `metadata` (JSON) → {source, device, ip, etc}

**Razón:** Sistema de notificaciones robusto y trackeable

---

## 8. Adicionales Recomendadas

### Transaction (Transacciones/Ventas)
```
- id, propertyId, buyerId, advisorId, organizationId
- transactionType (SALE, LEASE, RENTAL)
- price, commission, commissionPaid, status
- contractUrl, closingDate, paymentDate
- notes, metadata
```

### Review (Reseñas)
```
- id, reviewerId (buyer), advisorId, rating
- comment, propertyId (opcional)
- verification (VERIFIED_BUYER, VERIFIED_TRANSACTION)
- createdAt, updatedAt
```

### Activity Log (Auditoría)
```
- id, userId, action, entityType, entityId
- changes (JSON), ipAddress, userAgent
- timestamp
```

### SavedSearch (Búsquedas Guardadas)
```
- id, buyerId, name, filters (JSON)
- notifyOnNew (boolean)
- createdAt
```

### Favorite (Propiedades Favoritas)
```
- id, buyerId, propertyId
- notes, priority
- createdAt
```

---

## 📈 Índices Recomendados

```sql
-- Performance critical
CREATE INDEX idx_property_city_region ON property(city, region);
CREATE INDEX idx_property_advisor ON property(advisor_id);
CREATE INDEX idx_property_status ON property(status);
CREATE INDEX idx_requirement_buyer ON requirement(buyer_id);
CREATE INDEX idx_match_requirement ON match(requirement_id);
CREATE INDEX idx_match_property ON match(property_id);
CREATE INDEX idx_match_status ON match(status);
CREATE INDEX idx_advisor_organization ON advisor(organization_id);
CREATE INDEX idx_notification_advisor ON notification(advisor_id);
CREATE INDEX idx_notification_read ON notification(is_read);

-- For searching
CREATE INDEX idx_property_created ON property(created_at DESC);
CREATE INDEX idx_property_published ON property(published_at DESC);
CREATE INDEX idx_requirement_created ON requirement(created_at DESC);
```

---

## 🎯 Decisiones de Diseño Importantes

### 1. **Desnormalización Inteligente**
- `totalPropertiesListed` en Advisor (fácil de sumar, mejora performance)
- `matchCount` en Requirement (estadísticas rápidas)
- `viewCount`, `favoritesCount` en Property (popularidad)

### 2. **JSON para Flexibilidad**
- Usar JSON para campos que pueden cambiar: `features`, `amenities`, `metadata`
- Permite evolucionar sin migrar schema

### 3. **Soft Deletes**
- Usar `status` en lugar de borrar (auditoría, recuperación)

### 4. **Timestamps**
- Siempre tener `createdAt`, `updatedAt`
- Agregar `publishedAt`, `viewedAt`, `contactedAt` donde sea relevante

### 5. **Enums vs Arrays**
- Usar ENUM para valores fijos: `type`, `status`, `role`
- Usar JSON array para listas que pueden cambiar: `specializations`, `languages`

---

## ⚠️ Consideraciones de Escalabilidad

1. **Vistas (Views)** para queries complejas
   ```sql
   CREATE VIEW advisor_performance AS
   SELECT advisor_id, COUNT(*) as properties_listed,
          AVG(rating) as avg_rating
   FROM property
   GROUP BY advisor_id;
   ```

2. **Triggers** para mantener contadores
   ```sql
   CREATE TRIGGER update_property_count
   AFTER INSERT ON property
   FOR EACH ROW UPDATE advisor SET total_properties_listed = ...
   ```

3. **Search Optimization**
   - Full-text search en `title`, `description`, `address`
   - Geolocation queries con PostGIS

4. **Cache** (Redis)
   - Trending properties
   - Advisor rankings
   - Organization statistics

---

## 📋 Resumen de Cambios

| Tabla | Campos Nuevos | Razón |
|-------|---------------|-------|
| Organization | 10+ | Modelo de suscripción, integraciones, pagos |
| Advisor | 15+ | Verificación legal, comisiones, performance |
| Property | 20+ | Información completa, búsqueda avanzada |
| Requirement | 20+ | Matching preciso, historial |
| Match | 12+ | Transparencia, comunicación, conversión |
| Commission | 8+ | Flexibilidad de modelos de comisión |
| Notification | 10+ | Robustez, trazabilidad |
| + 3 nuevas | - | Transaction, Review, ActivityLog |

---

## ✅ Next Steps

1. ¿Agregar campos propuestos al schema?
2. ¿Crear las tablas adicionales (Transaction, Review, etc)?
3. ¿Revisar en base a features específicas que quieras?

**Próxima acción:** Actualizar `prisma/schema.prisma` con estos campos
