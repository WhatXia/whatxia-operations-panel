# Aplicar migración 008 — Programas de Lanzamiento (CFG-001)

1. SQL Editor de Supabase → pegar `supabase/migrations/008_launch_programs.sql`
2. Ejecutar
3. Verificar:
   - tabla `launch_programs` con fila `PIONEERS_USERS`
   - función `deactivate_launch_program`
4. Reiniciar bot y panel
5. Ir a **Parámetros → Programas de Lanzamiento → Pioneros**
6. Opcional: quitar `PRE_LAUNCH_MODE` del `.env` del bot (ya no se usa)

Para enviar mensajes de activación desde el panel al desactivar, agregar al panel:

```
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
```

Si no están, la cola queda en `launch_program_outbound_messages` y el bot la drena.
