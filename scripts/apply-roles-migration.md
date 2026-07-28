# Migración roles y permisos

Ejecutar en el SQL Editor de Supabase (mismo proyecto del bot):

1. `supabase/migrations/001_audit_logs.sql` (si aún no existe)
2. `supabase/migrations/002_roles_permissions.sql`

Verificación rápida:

```bash
node -e "const {createClient}=require('@supabase/supabase-js'); require('fs').readFileSync('.env.local','utf8').split(/\r?\n/).forEach(l=>{const i=l.indexOf('='); if(i>0&&!process.env[l.slice(0,i)]) process.env[l.slice(0,i)]=l.slice(i+1)}); const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); s.from('app_roles').select('code').then(r=>console.log(r.data||r.error));"
```

Debe listar `SUPERADMIN` y `OPS_ADMIN`.
