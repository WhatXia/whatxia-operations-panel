# PROJECT_STATUS.md

**Producto:** WhatXia Operations Panel (`whatxia-operations-panel`)  
**Tipo:** Panel operativo / administrativo (lectura de dominio compartido + administración del panel)  
**Última actualización:** 27 de julio de 2026  

> Este documento refleja **únicamente** lo que existe en este repositorio. No describe el bot WhatXia Basic / Mobility MVP salvo donde el panel lo lee o documenta como integración futura.

---

# Estado General

| Indicador | Valor |
|-----------|--------|
| **Avance aproximado (MVP del panel)** | **~68%** |
| **Estado del proyecto** | MVP operativo en desarrollo activo — usable en entorno local/staging con Supabase; **no listo para producción** |
| **Versión package** | `0.1.0` |
| **Última actualización de este documento** | 27 jul 2026 |

**Criterio del porcentaje:** módulos ops + seguridad admin implementados y con UI/API reales (~55% del peso), Conversation Inspector usable pero incompleto (~8%), Bot Manager CMS admin listo sin consumo por el bot (~5%). Restan stubs admin, recuperación de contraseña, deploy, PDF binario e integraciones profundas.

---

# Arquitectura

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js **16.2.12** (App Router) |
| UI | React **19.2.4**, Tailwind CSS **4** |
| Lenguaje | TypeScript **5** |
| Auth / DB client | `@supabase/ssr`, `@supabase/supabase-js` |
| Runtime local | `next dev` / `next start` en puerto **3300** |
| Gate de acceso | `proxy.ts` (no hay `middleware.ts`) |

## Infraestructura actual

- **Supabase** (proyecto compartido con el bot): Auth, Postgres, Storage (bucket `bot-cms-media` para CMS).
- El panel lee datos operativos con **service role** (`SUPABASE_SERVICE_ROLE_KEY`).
- Tablas propias del panel (auditoría, roles, bot CMS) viven en el mismo proyecto; el dominio operativo (`trips`, `drivers`, etc.) **no** se crea en las migraciones de este repo.
- **Sin** Dockerfile, **sin** `vercel.json`, **sin** CI/CD GitHub Actions en el repositorio.
- `next.config.ts` presente con configuración vacía.
- Documentación de producto/técnica en `docs/01`–`docs/09`.

---

# Módulos Implementados

Módulos con UI real + API/lib real (no stub):

| Módulo | Ruta UI | Notas |
|--------|---------|--------|
| Login | `/login` | Supabase Auth + auditoría de login |
| Dashboard | `/dashboard` | KPIs / snapshot operativo |
| Servicios | `/servicios` | Listado y filtros de viajes/servicios |
| Conductores | `/conductores` | Listado + detalle (drawer) |
| Métricas | `/metricas` | Consulta + export API |
| Estado del sistema | `/estado-sistema` | Salud agregada / eventos recientes |
| Conversaciones | `/conversaciones`, `/conversaciones/[id]` | Lista + Conversation Inspector |
| Admin — resumen | `/admin` | Home con enlaces |
| Usuarios | `/admin/usuarios` | CRUD admin de usuarios del panel |
| Roles y permisos | `/admin/roles` | Roles configurables + matriz + asignación |
| Auditoría | `/admin/auditoria` | Consulta de `audit_logs` |
| Parámetros → Sistema → Estado del Bot | `/admin/parametros/sistema/estado-bot` | OPS-SYS-001: ACTIVE/MAINTENANCE + SYS_BOT_MAINTENANCE |
| Forbidden | `/forbidden` | Destino de 403 del proxy |

---

# Módulos en Desarrollo

| Ítem | Estado real |
|------|-------------|
| **Conversation Inspector** | Funcional sobre datos existentes; **sin** transcript bot↔usuario; gaps explícitos en UI/`docs/08` |
| **Export PDF de conversación** | `POST /api/conversations/[id]/export` prepara payload estructurado; **descarga binaria PDF pendiente** |
| **Bot Manager CMS → consumo bot** | CMS admin completo; WhatXia Basic **aún no** lee estas tablas |
| **Recuperar contraseña** | Página stub (`/recuperar-contrasena`); sin API |
| **Admin — Configuración / IA / Integraciones / Parámetros** | Rutas con `AdminStubPage` únicamente |
| **Incidentes** | Módulo existe en catálogo de permisos; **sin** ruta UI ni API |
| **Header “última actualización”** | Todavía referencia remanente de `lib/mock-data.ts` en el header |

---

# Funcionalidades Pendientes

Derivadas solo de stubs, gaps documentados y código incompleto:

1. Flujo real de recuperación / reset de contraseña.
2. Pantallas admin: Configuración, IA, Integraciones, Parámetros (hoy placeholders).
3. Módulo Incidentes (permiso definido, sin implementación).
4. Persistencia de diálogo bot ↔ usuario WhatsApp y visualización en Inspector.
5. Historial de estados FSM (hoy solo snapshot en `conversation_sessions`).
6. FK dura sesión ↔ trip (hoy soft join por teléfono).
7. Timestamps de eventos de tarifa / aceptación.
8. Recibos WhatsApp (wamid, delivered/read) y media en Inspector.
9. Generación/descarga binaria de PDF de conversación.
10. Consumo del Bot Manager CMS desde WhatXia Basic por `code` (`PUBLISHED`).
11. Empaquetado y despliegue (Docker/CI/hosting).
12. Eliminar/sustituir remanentes de mock en UI.

---

# Base de Datos

## Migraciones en este repo (`supabase/migrations/`)

| Migración | Contenido |
|-----------|-----------|
| `001_audit_logs.sql` | Tabla `audit_logs` + RLS deny anon/authenticated |
| `002_roles_permissions.sql` | `app_roles`, `app_role_permissions` + semillas SUPERADMIN / OPS_ADMIN |
| `003_audit_reauth.sql` | Columnas de reauth en `audit_logs` |
| `004_bot_manager_cms.sql` | `bot_message_categories`, `bot_messages`, `bot_message_versions`, `bot_media_assets`, `bot_message_media` + bucket `bot-cms-media` + semillas |

**Estado:** las migraciones se aplican **manualmente** en el SQL Editor de Supabase (guías en `scripts/apply-*-migration.md`). El repo no garantiza que estén aplicadas en el proyecto remoto.

## Tablas operativas leídas (no creadas aquí)

Documentadas/consumidas por queries del panel, entre otras: `trips`, `drivers`, `passengers`, `conversation_tunnels`, `tunnel_messages`, `conversation_sessions`, `trip_cancellations`, y otras según módulos (p. ej. señales usadas en estado del sistema). Fuente de verdad: bot / plataforma compartida.

---

# APIs

## Auth

| Método | Endpoint |
|--------|----------|
| POST | `/api/auth/login` |
| POST | `/api/auth/reauthenticate` |

## Operaciones

| Método | Endpoint |
|--------|----------|
| GET | `/api/dashboard` |
| GET | `/api/services` |
| GET | `/api/drivers` |
| GET | `/api/drivers/[id]` |
| GET | `/api/metrics` |
| POST | `/api/metrics/export` |
| GET | `/api/system-status` |
| GET | `/api/conversations` |
| GET | `/api/conversations/[id]` |
| POST | `/api/conversations/[id]/export` |

## Administración

| Método | Endpoint |
|--------|----------|
| GET/POST/PATCH/DELETE | `/api/admin/users` |
| GET/POST | `/api/admin/roles` |
| GET/PATCH/DELETE | `/api/admin/roles/[id]` |
| PUT | `/api/admin/roles/[id]/permissions` |
| POST | `/api/admin/roles/[id]/duplicate` |
| GET/POST/DELETE | `/api/admin/roles/[id]/users` |
| GET | `/api/admin/audit` |
| GET | `/api/admin/audit/[id]` |
| GET/POST | `/api/admin/bot/categories` |
| PATCH/DELETE | `/api/admin/bot/categories/[id]` |
| GET/POST | `/api/admin/bot/messages` |
| GET/PATCH/DELETE | `/api/admin/bot/messages/[id]` |
| GET/POST | `/api/admin/bot/messages/[id]/versions` |
| GET/POST | `/api/admin/bot/media` |
| PATCH/DELETE | `/api/admin/bot/media/[id]` |

Mutaciones admin/ops sensibles pasan por `withAuditedApi` + reautenticación (excepto login/reauthenticate).

---

# Seguridad

| Capacidad | Estado |
|-----------|--------|
| Autenticación | Supabase Auth (sesión cookie SSR) |
| Gate de rutas/APIs | `proxy.ts` — redirect login / rewrite 403 |
| Roles | Configurables en DB (`app_roles`); semillas SUPERADMIN / OPS_ADMIN; bootstrap vía `SUPERADMIN_EMAILS` |
| Permisos | Matriz por módulo/nivel en `app_role_permissions`; snapshot en `app_metadata` JWT |
| Reautenticación | Token HMAC (`x-whatxia-reauth`), TTL corto; UI `ReauthProvider` / `useSecureFetch` |
| Auditoría | Escritura centralizada a `audit_logs` (incl. resultado de reauth si migración 003 aplicada) |
| RLS tablas panel | Deny para `anon`/`authenticated`; acceso vía service role del panel |
| Recuperación de contraseña | **No implementada** (stub UI) |

---

# Integraciones

| Integración | Estado en este repo |
|-------------|---------------------|
| **Supabase Auth + Postgres** | Activa (requerida) |
| **Supabase Storage** (`bot-cms-media`) | Definida en migración 004; usada por Bot CMS |
| **Dominio operativo compartido** (trips/drivers/…) | Lectura vía service role |
| **WhatsApp Cloud API** | **No** integrada en el panel |
| **WhatXia Basic (runtime del bot)** | **No** consume Bot CMS; panel no modifica prompts/flujo del bot |
| **Proveedores IA del panel** | Stub `/admin/ia` — sin integración |
| **Deploy / hosting** | No configurado en repo |

Variables documentadas en `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_BOT_VERSION`, `SUPERADMIN_EMAILS`, `REAUTH_SECRET`.

---

# Estado de Producción

| Aspecto | Estado |
|---------|--------|
| **Build** | `npm run build` ejecutado con éxito en desarrollo reciente (Next 16 / Turbopack). Debe revalidarse tras cada cambio mayor. |
| **Deploy** | No hay pipeline ni artefactos de despliegue en el repo. |
| **Entorno** | Diseñado para puerto **3300**. README stock aún menciona 3000 (desactualizado). |
| **Migraciones remotas** | Dependencia operacional: 001–004 deben estar aplicadas en el proyecto Supabase. |

## Errores / limitaciones conocidas

- Conversation Inspector muestra gaps explícitos (sin transcript bot↔usuario).
- Export PDF de conversación no entrega archivo binario listo.
- Bot CMS no afecta mensajes reales del bot hasta integración futura.
- Páginas admin stub y recuperar contraseña incompletas.
- Si faltan migraciones, APIs de auditoría/roles/bot fallan con errores de tabla/bucket.
- Remanente de mock en header (“last updated”).

---

# Riesgos Técnicos

1. **Misma base Supabase que el bot:** un cambio de esquema operativo rompe lecturas del panel.
2. **Service role en servidor:** misconfiguración de env expone privilegios amplios.
3. **Migraciones manuales:** drift entre entornos si no se aplica 001–004 de forma disciplinada.
4. **Datos incompletos de conversación:** riesgo de interpretación operativa incorrecta si se asume transcript completo.
5. **CMS sin consumidor:** riesgo de editar contenido “publicado” creyendo que el bot ya lo usa.
6. **Sin CI/CD ni contenedor:** calidad de release depende de builds locales manuales.
7. **Next.js 16 con convenciones propias** (`proxy.ts`): documentación interna (`AGENTS.md`) advierte no asumir APIs de versiones anteriores.
8. **Módulo `incidents` / stubs admin** en navegación de permisos pueden generar expectativa de funcionalidad inexistente.

---

# Próximos Sprints Recomendados

Ordenados por prioridad para acercar el panel a producción:

1. **Hardening de producción** — checklist de migraciones 001–004, secretos (`REAUTH_SECRET`), eliminar mocks, README/puerto, healthcheck, plan de deploy (hosting + CI build).
2. **Recuperación de contraseña** — flujo real con Supabase Auth + auditoría.
3. **Conversation data foundation** (coordinado con bot) — persistir bot↔usuario; luego PDF binario y enriquecer Inspector.
4. **Cerrar stubs admin críticos** — Configuración / Parámetros mínimos operativos antes que IA/Integraciones.
5. **Integración Bot CMS → WhatXia Basic** — consumo por `code` solo `PUBLISHED` (fuera del runtime actual del panel, pero desbloquea valor del Sprint 11).
6. **Módulo Incidentes** — si el modelo operativo lo requiere en MVP; o retirar del catálogo/nav hasta implementarlo.
7. **Observabilidad** — logging/alerting de APIs admin y fallos de lectura operativa.

---

## Resumen Ejecutivo

El **WhatXia Operations Panel** es una aplicación Next.js 16 (puerto 3300) que autentica operadores con Supabase, aplica roles/permisos configurables, reautenticación en mutaciones y auditoría, y ofrece un MVP **usable** de operación: dashboard, servicios, conductores, métricas, estado del sistema y un Conversation Inspector honesto (sin inventar mensajes del bot). En administración ya existen usuarios, roles, auditoría y un **Bot Manager CMS** completo como infraestructura — **aún no consumido** por WhatXia Basic.

El avance global del MVP del panel ronda **~68%**. Lo que falta para producción no es “más pantallas ops básicas”, sino: **despliegue y disciplina de migraciones**, recuperación de contraseña, cierre de stubs admin, y —junto al bot— la capa de datos de conversación (transcript + PDF) más la conexión CMS→runtime. Hoy el repositorio **compila**, corre en local con env Supabase, y **no** incluye Docker/CI ni integración WhatsApp propia.

Cualquier stakeholder puede asumir: *panel de lectura operativa + seguridad admin casi listos; contenido del bot administrable pero no cableado; producción pendiente de infra, auth recovery y datos de conversación.*
