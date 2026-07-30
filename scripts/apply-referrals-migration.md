# Referidos — esquema correcto (REF-006)

**No aplicar** `007_driver_referrals.sql` para métricas nuevas.

Las tablas reales viven en el bot:

1. `whatxia-mobility-mvp/supabase/migrations/040_driver_referrals.sql`
2. `whatxia-mobility-mvp/supabase/migrations/041_referral_events_ref004.sql`

Si aún no están en Supabase, ejecutarlas allí (mismo proyecto que el panel).

El Operations Center lee:

- `drivers.referral_code`
- `referral_events` (`link_opened`, `passenger_registered`, `conversion`)
- `referral_attributions` (`referrer_driver_id`)

Opcional en `.env.local` (mismo número que el bot):

```
WHATSAPP_BUSINESS_PHONE=573193455555
# o
NEXT_PUBLIC_WHATSAPP_PHONE=573193455555
```
