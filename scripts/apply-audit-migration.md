# Aplicar migración `audit_logs`

La tabla `audit_logs` debe crearse en el proyecto Supabase compartido (el mismo del bot).

## Opción recomendada (Dashboard)

1. Abrir [SQL Editor](https://supabase.com/dashboard/project/vquuizixlkqflmyiwvmy/sql) del proyecto.
2. Pegar el contenido de `supabase/migrations/001_audit_logs.sql`.
3. Ejecutar.
4. Verificar:

```bash
node scripts/check-audit-table.mjs
```

Debe responder `{"ok":true,"exists":true,...}`.

## Opción CLI

```bash
npx supabase login
npx supabase link --project-ref vquuizixlkqflmyiwvmy
npx supabase db push
```

## Variable de entorno del panel

En `.env.local` del Operations Center:

```env
SUPERADMIN_EMAILS=tu-correo@dominio.com
```

Los correos listados reciben rol `SUPERADMIN` en el primer login (o al ejecutar `ensureUserRole`). El resto recibe `OPS_ADMIN`.
