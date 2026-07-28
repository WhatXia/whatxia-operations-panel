# Migración reautenticación en auditoría

Ejecutar en SQL Editor de Supabase:

`supabase/migrations/003_audit_reauth.sql`

Agrega a `audit_logs`:

- `requires_reauthentication` (boolean)
- `reauthentication_result` (`SUCCESS` | `FAILED` | null)

Sin esta migración el panel sigue funcionando: escribe esos campos dentro de `new_values` / `message` como fallback.
