# Aplicar migración 007 — Referidos de conductores

1. SQL Editor de Supabase → pegar `supabase/migrations/007_driver_referrals.sql`
2. Ejecutar
3. Verificar tablas:
   - `driver_referral_links`
   - `driver_referrals`
4. REF-001 debe escribir en estas tablas; el panel (REF-002) solo lee.

Opcional en `.env.local`:

```
NEXT_PUBLIC_REFERRAL_INVITE_BASE_URL=https://tu-dominio/invite
```

Se usa solo si `invite_url` viene vacío.
