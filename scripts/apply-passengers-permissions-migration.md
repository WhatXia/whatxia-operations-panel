# Aplicar migración 006 — Permisos usuarios finales

1. SQL Editor de Supabase → pegar `supabase/migrations/006_passengers_permissions.sql`
2. Ejecutar
3. Los usuarios con JWT de permisos deben volver a sincronizar rol (re-login o reasignar rol) para que el snapshot `passengers` aparezca en `app_metadata`.

Módulo nuevo: `passengers`  
- SUPERADMIN → `admin`  
- OPS_ADMIN → `read` (solo lectura; mutaciones requieren `edit`)
