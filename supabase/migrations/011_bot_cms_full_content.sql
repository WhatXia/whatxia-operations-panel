-- BOT-CMS-002 — Migración completa del contenido conversacional
-- Fuente: scripts/bot-cms-002/catalog.json (copy real del bot, sin ejemplos).
-- Importa 100% del catálogo como PUBLISHED y elimina semillas ficticias.

-- ─── Categorías por módulo ───────────────────────────────────────────────
insert into public.bot_message_categories (code, name, description, sort_order)
values
  ('REGISTRATION', 'Registro', 'Registro pasajero/conductor', 10),
  ('PIONEERS', 'Pioneros', 'Acceso y bienvenida pioneros', 20),
  ('MOBILITY', 'Movilidad', 'Cotización, búsqueda y viajes', 30),
  ('FAVORITES', 'Favoritos', 'Recorridos favoritos', 40),
  ('DRIVER', 'Conductor', 'Menú y operación conductor', 50),
  ('LOGIN', 'Login', 'Inicio de sesión conductor', 60),
  ('RECOVERY', 'Recuperación', 'Reset de contraseña', 70),
  ('REFERRALS', 'Referidos', 'Programa de referidos', 80),
  ('INCIDENTS', 'Incidencias', 'Cancelaciones e incidencias', 90),
  ('ERRORS', 'Errores', 'Validaciones y errores', 100),
  ('ADMIN', 'Administración', 'Soporte / admin bot', 110),
  ('SYSTEM', 'Sistema', 'Túneles, audio, taxímetro, sistema', 120),
  ('PASSENGER', 'Pasajero', 'Mensajes generales pasajero', 130)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();

-- ─── Eliminar mensajes de ejemplo (004) ─────────────────────────────────
delete from public.bot_messages where code in ('WELCOME_MESSAGE', 'TRIP_CONFIRMED', 'TRIP_COMPLETED');

-- ─── Limpiar nodos/edges de ejemplo (010) y recrear con códigos reales ──

delete from public.bot_conversation_edges e
using public.bot_conversation_trees t
where e.tree_id = t.id
  and t.code in ('PASSENGER_CONVERSATIONS', 'DRIVER_CONVERSATIONS');

delete from public.bot_conversation_nodes n
using public.bot_conversation_trees t
where n.tree_id = t.id
  and t.code in ('PASSENGER_CONVERSATIONS', 'DRIVER_CONVERSATIONS');

update public.bot_conversation_trees
set root_node_id = null, status = 'DRAFT', version = greatest(version, 1) + 1, updated_at = now()
where code in ('PASSENGER_CONVERSATIONS', 'DRIVER_CONVERSATIONS');

-- ─── Upsert catálogo completo (PUBLISHED) ────────────────────────────────

insert into public.bot_messages (
  code, name, category_id, body, available_variables, status, version,
  is_active, content_type, module, environment, interactive_payload, updated_at
)
select
  m.code,
  m.name,
  c.id,
  m.body,
  m.vars::jsonb,
  'PUBLISHED',
  1,
  true,
  m.content_type,
  m.module,
  'PRODUCTION',
  m.interactive::jsonb,
  now()
from (
  values

    (
      'P_FULL_NAME_PROMPT',
      'Welcome + full name prompt',
      'REGISTRATION',
      '👋 ¡Bienvenido a WhatXia!

Estamos a pocos días de transformar la movilidad.

Conviértete en un Pionero y sé de los primeros en vivir esta nueva experiencia.

Para comenzar, cuéntame cuál es tu nombre y apellido. 😊',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'P_PREFERRED_NAME_PROMPT',
      'Preferred name prompt (with first name)',
      'REGISTRATION',
      '¡Mucho gusto, {{first_name}}! 👋

¿Cómo te gusta que te llamemos?',
      '["first_name"]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'P_PREFERRED_NAME_PROMPT_BARE',
      'Preferred name prompt (no first name)',
      'REGISTRATION',
      '¿Cómo te gusta que te llamemos?',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'P_FULL_NAME_EMPTY',
      'Full name empty retry',
      'REGISTRATION',
      'Escribe tu nombre y apellido (ej. Carlos Fernando Valencia).',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'P_FULL_NAME_BLOCKED',
      'Full name blocklist retry',
      'REGISTRATION',
      '¿Cuál es tu nombre y apellido? Escríbelos tal como quieres que aparezcan.',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'P_PREFERRED_NAME_EMPTY',
      'Preferred name empty retry',
      'REGISTRATION',
      'Escribe el nombre con el que prefieres que te llamemos (ej. Carlos).',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'P_PREFERRED_NAME_BLOCKED',
      'Preferred name blocklist retry',
      'REGISTRATION',
      '¿Cómo prefieres que te llamemos? Escribe solo ese nombre (ej. Carlos).',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'P_PIONEER_WELCOME_FALLBACK',
      'Pioneer welcome fallback (no DB template)',
      'PIONEERS',
      '¡{{nombre}}, tu registro en WhatXia quedó confirmado!',
      '["nombre"]',
      'text',
      'PIONEERS',
      '{}'
    ),
    (
      'P_ACCESS_BLOCKED',
      'Passenger account blocked',
      'PIONEERS',
      'Tu cuenta está bloqueada. Si crees que es un error, comunícate con WhatXia.',
      '[]',
      'text',
      'PIONEERS',
      '{}'
    ),
    (
      'P_ACCESS_DENIED_GENERIC',
      'Passenger access denied generic',
      'PIONEERS',
      'Aún no tienes acceso para solicitar servicios. Pronto te avisaremos.',
      '[]',
      'text',
      'PIONEERS',
      '{}'
    ),
    (
      'P_REGISTRATION_SOURCE_PROMPT',
      'How did you hear about us (exported, not currently sent)',
      'REGISTRATION',
      '¿Cómo nos conociste?

1. Instagram
2. Facebook
3. TikTok
4. Referido
5. QR
6. Orgánico
7. Otro

Responde con el número de la opción.',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'P_LAUNCH_OUTBOUND_DB',
      'Launch outbound queue body (DB-driven)',
      'SYSTEM',
      '{{body}}',
      '["body"]',
      'text',
      'SYSTEM',
      '{}'
    ),
    (
      'P_HOME_GREETING',
      'Passenger home greeting',
      'FAVORITES',
      '¡Hola, {{nombre}}! 👋

¿A dónde vamos hoy? 🚖',
      '["nombre","fav_id","fav_name"]',
      'interactive',
      'FAVORITES',
      '{"kind":"buttons","buttons":[{"id":"fav_use:{{fav_id}}","title":"{{fav_name}}","sort_order":0},{"id":"solicitar_servicio","title":"Solicitar servicio","sort_order":1}]}'
    ),
    (
      'P_FAV_NOT_FOUND',
      'Favorite not found',
      'FAVORITES',
      'No encontramos ese recorrido favorito.',
      '[]',
      'text',
      'FAVORITES',
      '{}'
    ),
    (
      'P_FAV_THANKS_MAX',
      'Thanks when favorites maxed after rating',
      'FAVORITES',
      '¡Gracias por elegir WhatXia! 🚖',
      '[]',
      'interactive',
      'FAVORITES',
      '{"kind":"buttons","buttons":[{"id":"solicitar_servicio","title":"Solicitar servicio","sort_order":0}]}'
    ),
    (
      'P_FAV_OFFER',
      'Offer save favorite',
      'FAVORITES',
      '¿Deseas guardar este recorrido como favorito?',
      '["tripId"]',
      'interactive',
      'FAVORITES',
      '{"kind":"buttons","buttons":[{"id":"fav_offer_yes:{{tripId}}","title":"✅ Sí","sort_order":0},{"id":"fav_offer_no:{{tripId}}","title":"❌ No","sort_order":1}]}'
    ),
    (
      'P_FAV_NAME_CHOICE',
      'Favorite name choice',
      'FAVORITES',
      '¿Cómo quieres llamar este recorrido favorito?',
      '["tripId"]',
      'interactive',
      'FAVORITES',
      '{"kind":"buttons","buttons":[{"id":"fav_name_home:{{tripId}}","title":"🏠 Casa","sort_order":0},{"id":"fav_name_office:{{tripId}}","title":"🏢 Oficina","sort_order":1},{"id":"fav_name_other:{{tripId}}","title":"✏️ Otro nombre","sort_order":2}]}'
    ),
    (
      'P_FAV_TRIP_MISSING',
      'Trip missing for favorite save',
      'FAVORITES',
      'No encontramos el recorrido para guardar como favorito.',
      '[]',
      'text',
      'FAVORITES',
      '{}'
    ),
    (
      'P_FAV_INCOMPLETE_ROUTE',
      'Incomplete route for favorite',
      'FAVORITES',
      'No pudimos guardar este recorrido porque faltan datos de origen o destino.',
      '[]',
      'text',
      'FAVORITES',
      '{}'
    ),
    (
      'P_FAV_MAX_REACHED',
      'Max favorites reached',
      'FAVORITES',
      'Ya tienes tus dos recorridos favoritos configurados.
Si deseas cambiar alguno, primero deberás reemplazar uno existente.',
      '[]',
      'text',
      'FAVORITES',
      '{}'
    ),
    (
      'P_FAV_SAVE_FAILED',
      'Favorite save failed',
      'FAVORITES',
      'No se pudo guardar el recorrido favorito. Intenta más adelante.',
      '[]',
      'text',
      'FAVORITES',
      '{}'
    ),
    (
      'P_FAV_SAVED',
      'Favorite saved success',
      'FAVORITES',
      '✅ ¡Listo!

Tu recorrido favorito quedó guardado con el nombre "{{fav_name}}".

La próxima vez solo tendrás que pulsar ese botón para solicitar este recorrido.

¡Gracias por elegir WhatXia! 🚖',
      '["fav_name"]',
      'interactive',
      'FAVORITES',
      '{"kind":"buttons","buttons":[{"id":"solicitar_servicio","title":"Solicitar servicio","sort_order":0}]}'
    ),
    (
      'P_FAV_TRIP_ASSOC_MISSING',
      'Trip association missing',
      'FAVORITES',
      'No encontramos el viaje asociado.',
      '[]',
      'text',
      'FAVORITES',
      '{}'
    ),
    (
      'P_FAV_CUSTOM_NAME_PROMPT',
      'Custom favorite name prompt',
      'FAVORITES',
      'Escribe el nombre que deseas darle a este recorrido.',
      '[]',
      'text',
      'FAVORITES',
      '{}'
    ),
    (
      'P_ASK_PICKUP_TEXT',
      'Ask pickup text',
      'MOBILITY',
      '¿Dónde te recogemos?',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_PICKUP_LOCATION_PROMPT',
      'Pickup location request',
      'MOBILITY',
      '📍 Comparte tu ubicación actual para encontrarte más rápido.',
      '[]',
      'interactive',
      'MOBILITY',
      '{}'
    ),
    (
      'P_PICKUP_LOCATION_WITH_LABEL',
      'Pickup location with label',
      'MOBILITY',
      'Recoger en: {{pickup_label}}

📍 Comparte tu ubicación actual para encontrarte más rápido.',
      '["pickup_label"]',
      'interactive',
      'MOBILITY',
      '{}'
    ),
    (
      'P_ASK_DESTINATION',
      'Ask destination',
      'MOBILITY',
      '🚖 Perfecto. Ahora cuéntame, ¿cuál es tu destino?',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_DROPOFF_LOCATION_PROMPT',
      'Dropoff location request',
      'MOBILITY',
      'Comparte la ubicación del destino en el mapa 📍 para continuar con tu cotización.',
      '[]',
      'interactive',
      'MOBILITY',
      '{}'
    ),
    (
      'P_DROPOFF_NOT_FOUND',
      'Dropoff not found options',
      'MOBILITY',
      'Ups, no logramos encontrar ese destino.

Puedes intentar una de estas opciones:

📍 Compartir la ubicación en el mapa.
✍️ Escribir nuevamente el destino.',
      '[]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"booking_share_dropoff","title":"Ubicación en mapa","sort_order":0},{"id":"booking_retry_dropoff","title":"Escribir destino","sort_order":1}]}'
    ),
    (
      'P_OUT_OF_CITY',
      'Out of city service',
      'MOBILITY',
      'Lo sentimos, por el momento WhatXia solo opera dentro de {{city_name}}.',
      '["city_name"]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_PLACE_CONFIRM',
      'Confirm resolved place',
      'MOBILITY',
      '📍 {{place_label}}
{{address}}

Mapa: {{maps_link}}

¿Es este el lugar correcto?',
      '["place_label","address","maps_link"]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"booking_confirm_place","title":"✅ Confirmar","sort_order":0},{"id":"booking_reject_place","title":"No es este","sort_order":1}]}'
    ),
    (
      'P_PLACE_CANDIDATES',
      'Place candidate list',
      'MOBILITY',
      'Encontramos varias opciones. Elige una:

{{candidates_list}}',
      '["candidates_list","i","name"]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"booking_cand:{{i}}","title":"{{i}}. {{name}}","sort_order":0}]}'
    ),
    (
      'P_PLACES_SEARCH_ERROR',
      'Places search error',
      'MOBILITY',
      'No pudimos buscar el lugar ahora. Intenta de nuevo en un momento.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_DROPOFF_RETRY_HINT',
      'Dropoff retry hint after out of city',
      'MOBILITY',
      'Puedes escribir otro destino dentro de la ciudad o compartir la ubicación en el mapa.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_PLACE_NOT_IN_CITY',
      'Place not found in city',
      'MOBILITY',
      'No encontramos ese lugar en {{city_name}}. Escribe una dirección o punto de referencia más claro.',
      '["city_name"]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_QUOTE_MISSING_PLACES',
      'Quote missing places',
      'MOBILITY',
      'Falta origen o destino. Escribe Hola para reiniciar.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_QUOTE_ROUTE_ERROR',
      'Quote route calculation error',
      'MOBILITY',
      'No pudimos calcular la ruta. Revisa origen/destino o intenta luego.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_QUOTE_CONFIRM',
      'Quote confirmation',
      'MOBILITY',
      '📍 {{pickup}}

🏁 {{dropoff}}

💰 Tarifa estimada: {{min}} - {{max}}

El valor final será el que marque el taxímetro, de acuerdo con la tarifa oficial vigente, más $800 por solicitud del servicio.

¿Confirmas tu solicitud?',
      '["pickup","dropoff","min","max"]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"booking_request_trip","title":"✅ Solicitar","sort_order":0},{"id":"booking_cancel_quote","title":"❌ Cancelar","sort_order":1}]}'
    ),
    (
      'P_BOOKING_CANCELLED',
      'Booking operation cancelled',
      'MOBILITY',
      'Operación cancelada.',
      '[]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"solicitar_servicio","title":"Solicitar servicio","sort_order":0}]}'
    ),
    (
      'P_QUOTE_EXPIRED',
      'Quote expired',
      'MOBILITY',
      'La cotización expiró. Escribe Hola para solicitar de nuevo.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_SEARCHING_DRIVER',
      'Searching for driver',
      'MOBILITY',
      '🚖 Estamos encontrando el mejor conductor para ti. Esto tomará solo un momento.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_QUOTE_USE_BUTTONS',
      'Use quote buttons hint',
      'MOBILITY',
      'Usa los botones para Solicitar o Cancelar el servicio.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_PICKUP_CONFIRMED_LABEL',
      'Pickup confirmed label',
      'MOBILITY',
      'Te recogeremos en {{label}}.',
      '["label"]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_RETRY_DROPOFF_TEXT',
      'Retry dropoff text',
      'MOBILITY',
      'Escribe nuevamente tu destino:',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_CANDIDATE_INVALID',
      'Invalid candidate option',
      'MOBILITY',
      'Opción inválida. Escribe el lugar de nuevo.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_CHOOSE_OR_REWRITE',
      'Choose list or rewrite destination',
      'MOBILITY',
      'Elige una opción de la lista o escribe otro destino.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_FARE_RANGE_PASSENGER_NOTE',
      'Passenger fare range taximeter note',
      'MOBILITY',
      'El valor final será el que marque el taxímetro, de acuerdo con la tarifa oficial vigente, más $800 por solicitud del servicio.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_NO_DRIVERS_AT_PUBLISH',
      'No drivers at publish time',
      'MOBILITY',
      'Por ahora no hay conductores disponibles. Intenta de nuevo en un momento.',
      '[]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"solicitar_servicio","title":"Solicitar servicio","sort_order":0}]}'
    ),
    (
      'NO_DRIVERS_AVAILABLE',
      'No drivers available (CMS wired)',
      'MOBILITY',
      'Lo sentimos.
En este momento no encontramos un vehículo disponible en tu zona.
Inténtalo nuevamente en unos minutos. Gracias por elegir WhatXia.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_SEARCH_PROMPT_WAVE_1',
      'Search continue prompt wave 1',
      'MOBILITY',
      'Aún no hemos encontrado un conductor disponible para tu solicitud.

¿Deseas que sigamos buscando?',
      '["tripId"]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"search_continue:{{tripId}}","title":"✅ Seguir buscando","sort_order":0},{"id":"search_cancel:{{tripId}}","title":"❌ Cancelar solic.","sort_order":1}]}'
    ),
    (
      'P_SEARCH_PROMPT_WAVE_2',
      'Search continue prompt wave 2',
      'MOBILITY',
      'Seguimos buscando un conductor para ti.
En este momento la disponibilidad es limitada.

¿Deseas que continuemos buscando?',
      '["tripId"]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"search_continue:{{tripId}}","title":"✅ Seguir buscando","sort_order":0},{"id":"search_cancel:{{tripId}}","title":"❌ Cancelar solic.","sort_order":1}]}'
    ),
    (
      'P_SEARCH_NOT_FOUND',
      'Search request not found',
      'MOBILITY',
      'No encontramos esa solicitud.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_SEARCH_NOT_ACTIVE',
      'Search no longer active',
      'MOBILITY',
      'Esta solicitud ya no está en búsqueda.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_SEARCH_RESTART_FAIL',
      'Search restart failed',
      'MOBILITY',
      'No se pudo reiniciar la búsqueda.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_SEARCH_CONTINUE_OK',
      'Search continue acknowledged',
      'MOBILITY',
      'Perfecto. Seguimos buscando un conductor. Un momento, por favor.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_SEARCH_CANCEL_NOT_ALLOWED',
      'Search cancel not allowed',
      'MOBILITY',
      'Esta solicitud ya no se puede cancelar.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_SEARCH_USER_CANCELLED',
      'User cancelled search',
      'MOBILITY',
      'Solicitud cancelada.',
      '[]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"solicitar_servicio","title":"Solicitar servicio","sort_order":0}]}'
    ),
    (
      'P_STILL_SEARCHING',
      'Still searching (tunnel/handler)',
      'MOBILITY',
      'Seguimos buscando un conductor para ti. Un momento, por favor.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_VEHICLE_CONFIRMED',
      'Vehicle assignment confirmation',
      'MOBILITY',
      '🚖 Confirmación del vehículo

👤 Conductor: {{driver_name}}

🚖 Placa: {{plate}}

⏱️ Llega en: {{eta_min}}–{{eta_max}} minutos

{{rating_line}}',
      '["driver_name","plate","eta_min","eta_max","rating_line","tripId"]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"cancel_servicio:{{tripId}}","title":"❌ Cancelar servicio","sort_order":0}]}'
    ),
    (
      'P_ETA_MANUAL',
      'Manual ETA to passenger (legacy)',
      'MOBILITY',
      'Tu conductor {{driver_name}} llegará aproximadamente en {{minutes}} minutos.',
      '["driver_name","minutes","tripId"]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"cancel_servicio:{{tripId}}","title":"❌ Cancelar servicio","sort_order":0}]}'
    ),
    (
      'P_DRIVER_ARRIVED',
      'Driver arrived (with preferred name)',
      'MOBILITY',
      '🎉 ¡{{preferred}}, tu WhatXia ya llegó!

Tu vehículo de placa {{plate}} ya está esperándote.

WhatXia, moviendo vidas.',
      '["preferred","plate","tripId"]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"ya_voy:{{tripId}}","title":"✅ Ya voy","sort_order":0},{"id":"cancel_servicio:{{tripId}}","title":"❌ Cancelar servicio","sort_order":1}]}'
    ),
    (
      'P_DRIVER_ARRIVED_ANON',
      'Driver arrived (no preferred name)',
      'MOBILITY',
      '🎉 ¡Tu WhatXia ya llegó!

Tu vehículo de placa {{plate}} ya está esperándote.

WhatXia, moviendo vidas.',
      '["plate","tripId"]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"ya_voy:{{tripId}}","title":"✅ Ya voy","sort_order":0},{"id":"cancel_servicio:{{tripId}}","title":"❌ Cancelar servicio","sort_order":1}]}'
    ),
    (
      'P_TRIP_COMPLETED',
      'Trip completed passenger',
      'MOBILITY',
      '✅ ¡Llegaste a tu destino!

Recuerda que el valor a cancelar es el que indique el taxímetro, de acuerdo con la tarifa oficial vigente, más $800 por solicitud del servicio.

Gracias por viajar con WhatXia. 🚖',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'D_SERVICE_ASSIGNED',
      'Service assigned to driver',
      'DRIVER',
      '✅ Servicio asignado

👤 Pasajero: {{passenger_full_name}}

📍 Dirígete al punto de recogida.',
      '["passenger_full_name","tripId"]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"ver_ubicacion:{{tripId}}","title":"📍 Ver ubicación","sort_order":0},{"id":"llegue:{{tripId}}","title":"✅ Llegué","sort_order":1},{"id":"cancel_servicio:{{tripId}}","title":"❌ Cancelar servicio","sort_order":2}]}'
    ),
    (
      'D_ARRIVED_LEGACY_PROMPT',
      'Legacy arrived prompt',
      'DRIVER',
      '🚖 Dirígete al punto de recogida.
🧭 Usa "Ver ubicación" para llegar al pasajero.
Al llegar, presiona "Llegué".',
      '["tripId"]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"ver_ubicacion:{{tripId}}","title":"📍 Ver ubicación","sort_order":0},{"id":"llegue:{{tripId}}","title":"📍 Llegué","sort_order":1},{"id":"cancel_servicio:{{tripId}}","title":"❌ Cancelar servicio","sort_order":2}]}'
    ),
    (
      'D_START_TRIP_PROMPT',
      'Start trip prompt',
      'DRIVER',
      '💰 Recuerda cobrar el valor que indique el taxímetro más $800 por solicitud del servicio.

👤 Cuando el pasajero aborde el vehículo, inicia el viaje.',
      '["tripId"]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"iniciar:{{tripId}}","title":"▶️ Iniciar viaje","sort_order":0}]}'
    ),
    (
      'D_IN_PROGRESS_SCREEN',
      'In-progress trip screen',
      'DRIVER',
      '🏁 Destino

{{dropoff_label}}',
      '["dropoff_label","tripId"]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"navegar:{{tripId}}","title":"🧭 Navegar al destino","sort_order":0},{"id":"finalizar:{{tripId}}","title":"Terminar viaje","sort_order":1}]}'
    ),
    (
      'D_TRIP_OFFER',
      'New trip offer',
      'DRIVER',
      '🚖 Nuevo servicio

📍 Origen: {{pickup}}

🏁 Destino: {{dropoff}}

💰 Tarifa estimada: {{min}} - {{max}}

{{passenger_line}}',
      '["pickup","dropoff","min","max","passenger_line","tripId"]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"aceptar:{{tripId}}","title":"✅ Aceptar","sort_order":0},{"id":"rechazar:{{tripId}}","title":"❌ Rechazar","sort_order":1}]}'
    ),
    (
      'D_TRIP_ALREADY_TAKEN',
      'Trip already taken',
      'DRIVER',
      'Este servicio ya fue tomado por otro conductor.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_NOT_REGISTERED',
      'Driver not registered (shared)',
      'ERRORS',
      'No encontramos tu registro de conductor.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_NOT_AVAILABLE',
      'Driver not available to accept',
      'DRIVER',
      'No estás disponible para aceptar servicios en este momento.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_ETA_REGISTER_FAIL',
      'ETA register failed',
      'ERRORS',
      'No se pudo registrar el tiempo de llegada.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_REJECTED',
      'Driver rejected offer',
      'DRIVER',
      'Has rechazado el servicio.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_NO_ACTIVE_SERVICE',
      'No active assigned service',
      'ERRORS',
      'No encontramos un servicio activo asignado a ti.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_ETA_ALREADY_SET',
      'ETA already informed',
      'DRIVER',
      'El tiempo de llegada ya fue informado para este servicio.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_PICKUP_MAPS_CTA',
      'Pickup Maps CTA',
      'DRIVER',
      '📍 Recoger en: {{label}}',
      '["label"]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"cta_url","title":"Abrir Google Maps","sort_order":0}]}'
    ),
    (
      'D_PICKUP_NAV_UNAVAILABLE',
      'Pickup nav unavailable',
      'DRIVER',
      'La ubicación de recogida está disponible cuando ya vas hacia el pasajero.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_NO_PICKUP_COORDS',
      'No pickup coordinates',
      'ERRORS',
      'No hay coordenadas de recogida para navegar.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_ARRIVAL_ALREADY',
      'Arrival already informed',
      'DRIVER',
      'La llegada ya fue informada para este servicio.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_ARRIVAL_NEED_ETA',
      'Need ETA before arrival',
      'DRIVER',
      'Primero informa tu tiempo de llegada.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_ARRIVAL_REGISTER_FAIL',
      'Arrival register failed',
      'ERRORS',
      'No se pudo registrar la llegada.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_TRIP_ALREADY_STARTED',
      'Trip already started',
      'DRIVER',
      'El viaje ya fue iniciado.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_NEED_ARRIVAL',
      'Need arrival before start',
      'DRIVER',
      'Primero confirma que llegaste al punto de recogida.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_START_FAIL',
      'Start trip failed',
      'ERRORS',
      'No se pudo iniciar el viaje.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_NAV_ONLY_IN_PROGRESS',
      'Nav only in progress',
      'DRIVER',
      'La navegación está disponible cuando el viaje está en curso.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_DROPOFF_MAPS_CTA',
      'Dropoff Maps CTA',
      'DRIVER',
      '🎯 Destino: {{label}}',
      '["label"]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"cta_url","title":"Abrir Google Maps","sort_order":0}]}'
    ),
    (
      'D_NO_DROPOFF_COORDS',
      'No dropoff coordinates',
      'ERRORS',
      'No hay coordenadas de destino para navegar.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_ALREADY_FINISHED',
      'Trip already finished',
      'DRIVER',
      'Este viaje ya fue finalizado.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_NEED_START',
      'Need start before finish',
      'DRIVER',
      'Primero inicia el viaje.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_FINAL_FARE_ERROR',
      'Final fare calculation error',
      'ERRORS',
      'No se pudo calcular la tarifa final. Intenta de nuevo en un momento.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_FINISH_FAIL',
      'Finish trip failed',
      'ERRORS',
      'No se pudo finalizar el viaje.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_PASSENGER_LINE_NEW',
      'Passenger new on offer',
      'DRIVER',
      '👤 Pasajero nuevo',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_PASSENGER_LINE_RATED',
      'Passenger rating on offer',
      'DRIVER',
      '👤 Pasajero: {{score}}',
      '["score"]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'P_RATING_PROMPT',
      'Passenger rating prompt',
      'MOBILITY',
      '¿Cómo calificarías tu viaje?',
      '["tripId"]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"rating:5:{{tripId}}","title":"⭐⭐⭐⭐⭐ Excelente","sort_order":0},{"id":"rating:4:{{tripId}}","title":"⭐⭐⭐⭐ Buena","sort_order":1},{"id":"rating:2:{{tripId}}","title":"⭐⭐ Regular","sort_order":2}]}'
    ),
    (
      'P_RATING_REPLY_5',
      'Rating reply 5',
      'MOBILITY',
      '¡Muchas gracias por tu calificación! 😊',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_RATING_REPLY_4',
      'Rating reply 4',
      'MOBILITY',
      'Gracias por ayudarnos a mejorar.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_RATING_REPLY_2',
      'Rating reply 2',
      'MOBILITY',
      'Lamentamos que tu experiencia no haya sido la esperada. Seguiremos mejorando.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_RATING_REPLY_DEFAULT',
      'Rating reply default',
      'MOBILITY',
      '¡Gracias por tu calificación!',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_RATING_TRIP_MISSING',
      'Rating trip missing',
      'ERRORS',
      'No encontramos el viaje para calificar.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'P_RATING_ALREADY',
      'Rating already recorded',
      'MOBILITY',
      'Ya registramos tu calificación. ¡Gracias!',
      '[]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"solicitar_servicio","title":"Solicitar servicio","sort_order":0}]}'
    ),
    (
      'P_RATING_SAVE_FAIL',
      'Rating save failed',
      'ERRORS',
      'No se pudo guardar tu calificación.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'P_POST_RATING_CTA',
      'Post rating CTA',
      'MOBILITY',
      '¿Qué deseas hacer?',
      '[]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"solicitar_servicio","title":"Solicitar servicio","sort_order":0}]}'
    ),
    (
      'P_POST_RATING_TRIP_MISSING',
      'Post rating trip missing',
      'ERRORS',
      'No encontramos el viaje asociado a esta opción.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'P_POST_RATING_CHANNEL_CLOSED',
      'Post rating channel closed',
      'MOBILITY',
      'Listo. El canal se cerró.',
      '[]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"solicitar_servicio","title":"Solicitar servicio","sort_order":0}]}'
    ),
    (
      'D_RATE_PASSENGER_PROMPT',
      'Driver rates passenger prompt',
      'DRIVER',
      '✅ Viaje finalizado

⭐ ¿Cómo fue tu experiencia con este pasajero?',
      '["tripId"]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"pax_rating:5:{{tripId}}","title":"⭐⭐⭐⭐⭐ Excelente","sort_order":0},{"id":"pax_rating:4:{{tripId}}","title":"⭐⭐⭐⭐ Buena","sort_order":1},{"id":"pax_rating:2:{{tripId}}","title":"⭐⭐⭐ Regular","sort_order":2}]}'
    ),
    (
      'D_RATE_PAX_THANKS_5',
      'Driver rates pax thanks 5',
      'DRIVER',
      '¡Gracias! Registramos tu calificación del pasajero. ⭐',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_RATE_PAX_THANKS',
      'Driver rates pax thanks 4/2',
      'DRIVER',
      'Gracias. Registramos tu calificación del pasajero.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'P_CANCEL_CAUSAL_MENU',
      'Driver cancel causal menu',
      'INCIDENTS',
      '¿Por qué deseas cancelar este servicio?',
      '["tripId"]',
      'interactive',
      'INCIDENTS',
      '{"kind":"buttons","buttons":[{"id":"cancel_causal:problema_mecanico:{{tripId}}","title":"🔧 Prob. mecánico","sort_order":0},{"id":"cancel_causal:cliente_no_recogido:{{tripId}}","title":"👤 No recogido","sort_order":1},{"id":"cancel_causal:no_puedo_llegar:{{tripId}}","title":"📍 No puedo llegar","sort_order":2}]}'
    ),
    (
      'D_CANCEL_WARNING_2',
      'Second cancellation warning',
      'INCIDENTS',
      'Esta es tu segunda cancelación registrada. Recuerda aceptar únicamente los servicios que realmente puedas atender.',
      '[]',
      'text',
      'INCIDENTS',
      '{}'
    ),
    (
      'D_CANCEL_SUSPEND_3',
      'Third cancellation suspension',
      'INCIDENTS',
      'Has acumulado 3 cancelaciones. Tu cuenta queda suspendida 8 horas y no recibirás nuevas ofertas hasta entonces.',
      '[]',
      'text',
      'INCIDENTS',
      '{}'
    ),
    (
      'P_CANCEL_NO_ACTIVE',
      'No active service to cancel',
      'MOBILITY',
      'No encontramos un servicio activo para cancelar.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_CANCEL_NOT_ALLOWED',
      'Cancel not allowed',
      'MOBILITY',
      'Este servicio ya no se puede cancelar.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_CANCEL_FAIL',
      'Cancel failed',
      'ERRORS',
      'No se pudo cancelar el servicio.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'P_CANCELLED_CHANNEL_CLOSED',
      'Passenger cancelled channel closed',
      'MOBILITY',
      'Servicio cancelado. El canal de comunicación se cerró.',
      '[]',
      'interactive',
      'MOBILITY',
      '{"kind":"buttons","buttons":[{"id":"solicitar_servicio","title":"Solicitar servicio","sort_order":0}]}'
    ),
    (
      'D_PASSENGER_CANCELLED',
      'Passenger cancelled notify driver',
      'DRIVER',
      '⚠️ El pasajero canceló el servicio. Ya puedes recibir nuevas ofertas.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_CANCEL_ALREADY_SEARCHING',
      'Already searching another driver',
      'DRIVER',
      'Este servicio ya está en búsqueda de otro conductor.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_REASSIGN_FAIL',
      'Reassign failed',
      'ERRORS',
      'No se pudo reasignar el servicio. Contacta soporte.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'P_DRIVER_CANCELLED_RESEARCH',
      'Driver cancelled — researching',
      'MOBILITY',
      'Tu conductor canceló el servicio. Estamos buscando otro conductor para ti. Un momento, por favor.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'D_CANCELLED_CAUSAL',
      'Driver cancelled with causal',
      'INCIDENTS',
      'Servicio cancelado ({{causal_label}}). Ya puedes recibir otros servicios.',
      '["causal_label"]',
      'text',
      'INCIDENTS',
      '{}'
    ),
    (
      'P_YA_VOY_OK',
      'Ya voy acknowledged',
      'MOBILITY',
      'Listo, le avisamos a tu conductor.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_YA_VOY_WRONG_STATE',
      'Ya voy wrong state',
      'MOBILITY',
      'Esta opción solo aplica cuando el conductor ya llegó.',
      '[]',
      'text',
      'MOBILITY',
      '{}'
    ),
    (
      'P_YA_VOY_TRIP_MISSING',
      'Ya voy trip missing',
      'ERRORS',
      'No encontramos ese servicio.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_PASSENGER_YA_VOY',
      'Passenger ya voy notify driver',
      'DRIVER',
      '🚶 El pasajero indicó que ya va hacia el punto de recogida.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_FIELD_NAME',
      'Driver field: name',
      'REGISTRATION',
      'Escribe tu nombre completo.',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_cancel","title":"Cancelar inscripción","sort_order":0},{"id":"driver_reg_exit","title":"🚪 Salir","sort_order":1}]}'
    ),
    (
      'D_FIELD_DOCUMENT_ID',
      'Driver field: document_id',
      'REGISTRATION',
      'Escribe tu número de cédula (solo números).',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_cancel","title":"Cancelar inscripción","sort_order":0},{"id":"driver_reg_exit","title":"🚪 Salir","sort_order":1}]}'
    ),
    (
      'D_FIELD_EMAIL',
      'Driver field: email',
      'REGISTRATION',
      'Escribe tu correo electrónico.',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_cancel","title":"Cancelar inscripción","sort_order":0},{"id":"driver_reg_exit","title":"🚪 Salir","sort_order":1}]}'
    ),
    (
      'D_FIELD_ADDRESS',
      'Driver field: address',
      'REGISTRATION',
      'Escribe tu dirección de residencia.',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_cancel","title":"Cancelar inscripción","sort_order":0},{"id":"driver_reg_exit","title":"🚪 Salir","sort_order":1}]}'
    ),
    (
      'D_FIELD_CITY',
      'Driver field: city',
      'REGISTRATION',
      'Escribe tu ciudad.',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_cancel","title":"Cancelar inscripción","sort_order":0},{"id":"driver_reg_exit","title":"🚪 Salir","sort_order":1}]}'
    ),
    (
      'D_FIELD_EMERGENCY_CONTACT_NAME',
      'Driver field: emergency_contact_name',
      'REGISTRATION',
      'Escribe el nombre de tu contacto de emergencia.',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_cancel","title":"Cancelar inscripción","sort_order":0},{"id":"driver_reg_exit","title":"🚪 Salir","sort_order":1}]}'
    ),
    (
      'D_FIELD_EMERGENCY_CONTACT_PHONE',
      'Driver field: emergency_contact_phone',
      'REGISTRATION',
      'Escribe el teléfono de tu contacto de emergencia (con indicativo).',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_cancel","title":"Cancelar inscripción","sort_order":0},{"id":"driver_reg_exit","title":"🚪 Salir","sort_order":1}]}'
    ),
    (
      'D_FIELD_PLATE',
      'Driver field: plate',
      'REGISTRATION',
      'Escribe la placa del vehículo.',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_cancel","title":"Cancelar inscripción","sort_order":0},{"id":"driver_reg_exit","title":"🚪 Salir","sort_order":1}]}'
    ),
    (
      'D_FIELD_VEHICLE_BRAND',
      'Driver field: vehicle_brand',
      'REGISTRATION',
      'Escribe la marca del vehículo.

Ayuda:
Ejemplo: Chevrolet, Renault, Kia, Hyundai, Nissan, Toyota.',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_cancel","title":"Cancelar inscripción","sort_order":0},{"id":"driver_reg_exit","title":"🚪 Salir","sort_order":1}]}'
    ),
    (
      'D_FIELD_VEHICLE_MODEL',
      'Driver field: vehicle_model',
      'REGISTRATION',
      'Escribe la línea o referencia del vehículo.

Ayuda:
No escribas el año del modelo. Escribe la línea o referencia.
Ejemplos: Grand i10, Picanto, Versa, Logan, Sandero, Spark GT.',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_cancel","title":"Cancelar inscripción","sort_order":0},{"id":"driver_reg_exit","title":"🚪 Salir","sort_order":1}]}'
    ),
    (
      'D_FIELD_VEHICLE_COLOR',
      'Driver field: vehicle_color',
      'REGISTRATION',
      'Escribe el color del vehículo.',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_cancel","title":"Cancelar inscripción","sort_order":0},{"id":"driver_reg_exit","title":"🚪 Salir","sort_order":1}]}'
    ),
    (
      'D_FIELD_VEHICLE_YEAR',
      'Driver field: vehicle_year',
      'REGISTRATION',
      'Escribe el año del vehículo (ej: 2018).',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_cancel","title":"Cancelar inscripción","sort_order":0},{"id":"driver_reg_exit","title":"🚪 Salir","sort_order":1}]}'
    ),
    (
      'D_FIELD_SOAT_EXPIRES_AT',
      'Driver field: soat_expires_at',
      'REGISTRATION',
      'Escribe la fecha de vencimiento del SOAT (DD/MM/AAAA).',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_cancel","title":"Cancelar inscripción","sort_order":0},{"id":"driver_reg_exit","title":"🚪 Salir","sort_order":1}]}'
    ),
    (
      'D_FIELD_TECHNO_EXPIRES_AT',
      'Driver field: techno_expires_at',
      'REGISTRATION',
      'Escribe la fecha de vencimiento de la revisión técnico-mecánica (DD/MM/AAAA).',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_cancel","title":"Cancelar inscripción","sort_order":0},{"id":"driver_reg_exit","title":"🚪 Salir","sort_order":1}]}'
    ),
    (
      'D_FIELD_OPERATION_EXPIRES_AT',
      'Driver field: operation_expires_at',
      'REGISTRATION',
      'Escribe la fecha de vencimiento de la tarjeta de operación (DD/MM/AAAA).',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_cancel","title":"Cancelar inscripción","sort_order":0},{"id":"driver_reg_exit","title":"🚪 Salir","sort_order":1}]}'
    ),
    (
      'D_FIELD_LICENSE_EXPIRES_AT',
      'Driver field: license_expires_at',
      'REGISTRATION',
      'Escribe la fecha de vencimiento de la licencia de tránsito (DD/MM/AAAA).',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_cancel","title":"Cancelar inscripción","sort_order":0},{"id":"driver_reg_exit","title":"🚪 Salir","sort_order":1}]}'
    ),
    (
      'D_FIELD_ERROR_REQUIRED',
      'Field required',
      'ERRORS',
      'Este campo es obligatorio. Intenta de nuevo.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_FIELD_ERROR_DATE',
      'Invalid date',
      'ERRORS',
      'Fecha inválida. Usa el formato DD/MM/AAAA.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_FIELD_ERROR_YEAR',
      'Invalid year',
      'ERRORS',
      'Año inválido. Usa un año entre 1980 y {{max_year}}.',
      '["max_year"]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_FIELD_ERROR_PHONE',
      'Invalid phone',
      'ERRORS',
      'Teléfono inválido. Incluye indicativo y número.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_FIELD_ERROR_DOCUMENT',
      'Invalid document',
      'ERRORS',
      'Número de cédula inválido.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_REG_WELCOME',
      'Registration welcome',
      'REGISTRATION',
      '👋 Bienvenido a WhatXia Mobility.

Vamos a completar tu registro como conductor.

Antes de comenzar, ten presente lo siguiente:

• Si seleccionas ✅ Continuar, iniciaremos tu registro.

• Si seleccionas ❌ Abandonar, no se iniciará el registro y no se guardará ningún dato.

Durante el registro:

• Si seleccionas ❌ Cancelar inscripción, se eliminará el progreso de tu registro y, cuando vuelvas a iniciar, deberás comenzar desde cero.

• Si seleccionas 🚪 Salir, guardaremos tu progreso y podrás continuar más adelante desde el punto donde quedaste enviando 🚖 o 🚕.',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_start","title":"✅ Continuar","sort_order":0},{"id":"driver_reg_abandon","title":"❌ Abandonar","sort_order":1}]}'
    ),
    (
      'D_REG_RESUME',
      'Resume registration',
      'REGISTRATION',
      'Tienes un registro de conductor pendiente. ¿Qué deseas hacer?',
      '[]',
      'interactive',
      'REGISTRATION',
      '{"kind":"buttons","buttons":[{"id":"driver_reg_continue","title":"▶️ Continuar","sort_order":0},{"id":"driver_reg_restart","title":"🔄 Empezar de nuevo","sort_order":1}]}'
    ),
    (
      'D_REG_ABANDONED',
      'Registration abandoned',
      'REGISTRATION',
      'Has abandonado el registro. No se guardó ningún dato.

Cuando quieras registrarte, envía 🚖 o 🚕.',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'D_REG_CANCELLED',
      'Registration cancelled',
      'REGISTRATION',
      '❌ Inscripción cancelada. Se eliminó todo el progreso.

Cuando quieras registrarte de nuevo, envía 🚖 o 🚕.',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'D_REG_EXIT_SAVED',
      'Registration exit saved',
      'REGISTRATION',
      '🚪 Progreso guardado. Puedes continuar más adelante enviando 🚖 o 🚕.',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'D_REG_NO_ACTIVE',
      'No active registration',
      'REGISTRATION',
      'No hay una inscripción en curso. Envía 🚖 o 🚕 para comenzar.',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'D_REG_CONTINUE_OK',
      'Continue registration',
      'REGISTRATION',
      'Continuamos tu registro desde donde quedaste.',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'D_REG_INTERRUPTED',
      'Registration interrupted',
      'REGISTRATION',
      'El registro se interrumpió. Envía 🚖 o 🚕 para reiniciar.',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'D_REG_ALREADY_EXISTS',
      'Already registered',
      'REGISTRATION',
      'Este conductor ya se encuentra registrado en WhatXia. Si necesitas actualizar tus datos, comunícate con un administrador.',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'D_REG_MISSING_DATA',
      'Missing registration data',
      'REGISTRATION',
      'Faltan datos del registro. Envía 🚖 o 🚕 para reiniciar.',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'D_REG_PENDING_VALIDATION',
      'Pending validation',
      'REGISTRATION',
      'Ya recibimos tu información.

Ahora nuestro equipo realizará la validación correspondiente para activar tu cuenta como conductor de WhatXia.

Una vez sea aprobada, podrás iniciar sesión enviando 🚖 o 🚕.',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'D_CLOSED_SESSION_MENU',
      'Closed session menu',
      'LOGIN',
      '👋 WhatXia Mobility — Conductores

Tu sesión está cerrada. ¿Qué deseas hacer?',
      '[]',
      'interactive',
      'LOGIN',
      '{"kind":"buttons","buttons":[{"id":"driver_login","title":"🔐 Iniciar sesión","sort_order":0},{"id":"solicitar_servicio","title":"🚕 Solicitar servicio","sort_order":1}]}'
    ),
    (
      'D_LOGIN_PASSWORD_PROMPT',
      'Login password prompt',
      'LOGIN',
      '🔐 Iniciar sesión

Escribe tu contraseña.',
      '[]',
      'interactive',
      'LOGIN',
      '{"kind":"buttons","buttons":[{"id":"driver_forgot_password","title":"Olvidé contraseña","sort_order":0}]}'
    ),
    (
      'D_LOGIN_PASSWORD_SHORT',
      'Login password short',
      'LOGIN',
      'Escribe tu contraseña.',
      '[]',
      'interactive',
      'LOGIN',
      '{"kind":"buttons","buttons":[{"id":"driver_forgot_password","title":"Olvidé contraseña","sort_order":0}]}'
    ),
    (
      'D_LOGIN_WRONG_PASSWORD',
      'Wrong password',
      'LOGIN',
      '❌ Contraseña incorrecta. Intenta de nuevo.',
      '[]',
      'text',
      'LOGIN',
      '{}'
    ),
    (
      'D_LOGIN_REQUIRED',
      'Login required',
      'LOGIN',
      'Debes iniciar sesión para usar el menú de conductor.',
      '[]',
      'text',
      'LOGIN',
      '{}'
    ),
    (
      'D_LOGOUT_OK',
      'Logout ok',
      'LOGIN',
      '✅ Tu sesión ha finalizado correctamente.

Gracias por tu apoyo el día de hoy. Te esperamos nuevamente en WhatXia Mobility.',
      '[]',
      'text',
      'LOGIN',
      '{}'
    ),
    (
      'D_NOT_FOUND_REGISTER',
      'Not found register',
      'LOGIN',
      'No encontramos tu registro de conductor. Envía 🚖 o 🚕 para registrarte.',
      '[]',
      'text',
      'LOGIN',
      '{}'
    ),
    (
      'D_NOT_FOUND_CONTINUE',
      'Not found continue',
      'ERRORS',
      'No encontramos tu registro de conductor. Envía 🚖 o 🚕 para continuar.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_NOT_FOUND_GENERIC',
      'Not found generic',
      'ERRORS',
      'No encontramos tu registro. Envía 🚖 o 🚕 para continuar.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_RESET_ASK_DOCUMENT',
      'Reset ask document',
      'RECOVERY',
      'Para verificar tu identidad necesito tu número de documento registrado en WhatXia.',
      '[]',
      'text',
      'RECOVERY',
      '{}'
    ),
    (
      'D_RESET_TIMEOUT',
      'Reset timeout',
      'RECOVERY',
      '⏱️ Se agotó el tiempo para restablecer la contraseña (10 minutos sin respuesta). Inténtalo de nuevo.',
      '[]',
      'text',
      'RECOVERY',
      '{}'
    ),
    (
      'D_RESET_DOC_MAX',
      'Reset max attempts',
      'RECOVERY',
      'Has superado el máximo de intentos de verificación. Por seguridad, el restablecimiento fue cancelado. Comunícate con un administrador si necesitas ayuda.',
      '[]',
      'text',
      'RECOVERY',
      '{}'
    ),
    (
      'D_RESET_DOC_MISMATCH',
      'Reset doc mismatch',
      'RECOVERY',
      'El documento no coincide con el registrado en tu cuenta. Inténtalo nuevamente o comunícate con un administrador.',
      '[]',
      'text',
      'RECOVERY',
      '{}'
    ),
    (
      'D_RESET_NEW_PASSWORD',
      'Reset new password',
      'RECOVERY',
      'Escribe tu nueva contraseña.',
      '[]',
      'text',
      'RECOVERY',
      '{}'
    ),
    (
      'D_RESET_CONFIRM',
      'Reset confirm',
      'RECOVERY',
      'Confirma nuevamente tu contraseña.',
      '[]',
      'text',
      'RECOVERY',
      '{}'
    ),
    (
      'D_RESET_MISMATCH',
      'Reset mismatch',
      'RECOVERY',
      'Las contraseñas no coinciden. Confirma nuevamente tu contraseña.',
      '[]',
      'text',
      'RECOVERY',
      '{}'
    ),
    (
      'D_RESET_OK',
      'Reset ok',
      'RECOVERY',
      '✅ Tu contraseña fue actualizada correctamente.

Ya puedes iniciar sesión nuevamente.',
      '[]',
      'text',
      'RECOVERY',
      '{}'
    ),
    (
      'D_PASSWORD_SETUP_EXISTING',
      'Password setup existing',
      'REGISTRATION',
      '🔐 Configuración de acceso

Para continuar, debes crear una contraseña de acceso a WhatXia.

Escribe tu contraseña (mínimo 8 caracteres).',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'D_PASSWORD_SETUP_REG',
      'Password setup registration',
      'REGISTRATION',
      '🔐 Último paso: crea tu contraseña de acceso

Escribe una contraseña (mínimo 8 caracteres).',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'D_PASSWORD_CONFIRM',
      'Password confirm',
      'REGISTRATION',
      'Confirma tu contraseña escribiéndola de nuevo.',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'D_PASSWORD_WRITE_MIN',
      'Write password min',
      'REGISTRATION',
      'Escribe tu contraseña (mínimo 8 caracteres).',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'D_PASSWORD_POLICY',
      'Password policy',
      'ERRORS',
      'La contraseña debe tener mínimo 8 caracteres. Intenta de nuevo.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_PASSWORD_MISMATCH_RESTART',
      'Password mismatch restart',
      'REGISTRATION',
      'Las contraseñas no coinciden. Escribe una nueva contraseña (mínimo 8 caracteres).',
      '[]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'D_PASSWORD_VALIDATE_FAIL',
      'Password validate fail',
      'ERRORS',
      'No pudimos validar la contraseña. Escribe una nueva (mínimo 8 caracteres).',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_CREDENTIALS_SHOWN',
      'Credentials shown',
      'REGISTRATION',
      '✅ Contraseña configurada correctamente.

Estos serán tus datos de acceso a WhatXia:

Usuario: {{document_id}}
Contraseña: {{password}}

Guárdalos en un lugar seguro. Por seguridad, no volveremos a mostrar tu contraseña.',
      '["document_id","password"]',
      'text',
      'REGISTRATION',
      '{}'
    ),
    (
      'D_PREFERRED_NAME_PROMPT',
      'Preferred name prompt',
      'DRIVER',
      '👋 Antes de continuar...

¿Cómo prefieres que te llamemos?',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_PREFERRED_NAME_SAVED',
      'Preferred name saved',
      'DRIVER',
      '✅ Gracias. Tu nombre preferido ha sido registrado.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_MAIN_WELCOME',
      'Main menu welcome',
      'DRIVER',
      '¡Hola, {{nombre}}! 👋

¿Qué deseas hacer?',
      '["nombre"]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"toggle_availability","title":"🟢 Disponible","sort_order":0},{"id":"mi_cuenta","title":"👤 Mi cuenta","sort_order":1},{"id":"logout","title":"🔒 Cerrar sesión","sort_order":2}]}'
    ),
    (
      'D_MAIN_STATUS_AVAILABLE',
      'Status available',
      'DRIVER',
      '🟢 Disponible para recibir servicios',
      '[]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"toggle_availability","title":"🔴 No disponible","sort_order":0},{"id":"mi_cuenta","title":"👤 Mi cuenta","sort_order":1},{"id":"logout","title":"🔒 Cerrar sesión","sort_order":2}]}'
    ),
    (
      'D_MAIN_STATUS_UNAVAILABLE',
      'Status unavailable',
      'DRIVER',
      '🔴 No disponible para recibir servicios',
      '[]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"toggle_availability","title":"🟢 Disponible","sort_order":0},{"id":"mi_cuenta","title":"👤 Mi cuenta","sort_order":1},{"id":"logout","title":"🔒 Cerrar sesión","sort_order":2}]}'
    ),
    (
      'D_MAIN_STATUS_DOCS_BLOCKED',
      'Status docs blocked',
      'DRIVER',
      '⛔ Bloqueado por documentos vencidos',
      '[]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"toggle_availability","title":"🟢 Disponible","sort_order":0},{"id":"mi_cuenta","title":"👤 Mi cuenta","sort_order":1},{"id":"logout","title":"🔒 Cerrar sesión","sort_order":2}]}'
    ),
    (
      'D_ACCOUNT_MENU',
      'Account menu',
      'DRIVER',
      '👤 Mi cuenta

¿Qué deseas consultar?',
      '[]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"mi_perfil","title":"📋 Mi perfil","sort_order":0},{"id":"referidos","title":"👥 Referidos","sort_order":1},{"id":"volver_principal","title":"⬅️ Volver","sort_order":2}]}'
    ),
    (
      'D_PROFILE_MENU',
      'Profile menu',
      'DRIVER',
      '📋 Mi perfil

¿Qué deseas ver?',
      '[]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"mis_datos","title":"👤 Mis datos","sort_order":0},{"id":"rendimiento","title":"📊 Mi rendimiento","sort_order":1},{"id":"volver_cuenta","title":"⬅️ Volver","sort_order":2}]}'
    ),
    (
      'D_SUPPORT_MENU',
      'Support menu',
      'ADMIN',
      '🆘 Soporte

¿Cómo podemos ayudarte?',
      '[]',
      'interactive',
      'ADMIN',
      '{"kind":"buttons","buttons":[{"id":"reportar","title":"⚠️ Reportar novedad","sort_order":0},{"id":"contactar_admin","title":"📞 Contactar admin","sort_order":1},{"id":"volver_cuenta","title":"⬅️ Volver","sort_order":2}]}'
    ),
    (
      'D_AVAILABILITY_ON',
      'Availability on',
      'DRIVER',
      '✅ Ahora estás disponible para recibir servicios.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_AVAILABILITY_OFF',
      'Availability off',
      'DRIVER',
      '✅ Ahora no estás disponible para recibir servicios.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_SUSPENDED_UNTIL',
      'Suspended until',
      'DRIVER',
      'Estás suspendido hasta {{until}}. No puedes activarte manualmente antes.',
      '["until"]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_AVAILABILITY_UPDATE_FAIL',
      'Availability update fail',
      'ERRORS',
      'No se pudo actualizar tu disponibilidad.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_PROFILE_DATA',
      'Profile data dump',
      'DRIVER',
      '👤 Mis datos

— Personales —
Nombre completo: {{full_name}} (solo lectura)
Cédula: {{document_id}} (solo lectura)
Correo: {{email}}
Dirección: {{address}}
Ciudad: {{city}}
WhatsApp: {{phone}}

— Vehículo —
Placa: {{plate}}
Marca: {{brand}}
Línea: {{model}}
Color: {{color}}

— Documentos —
SOAT: {{soat}}
Técnico-mecánica: {{techno}}
Tarjeta operación: {{operation}}
Licencia tránsito: {{license}}

Disponibilidad: {{availability}}
Cuenta: {{account_status}}
Bloqueo docs: {{blocked}}',
      '["full_name","document_id","email","address","city","phone","plate","brand","model","color","soat","techno","operation","license","availability","account_status","blocked"]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"actualizar_datos","title":"✏️ Actualizar datos","sort_order":0},{"id":"volver_perfil","title":"⬅️ Volver","sort_order":1}]}'
    ),
    (
      'D_REPORT_PLACEHOLDER',
      'Report placeholder',
      'ADMIN',
      '⚠️ Reportar una novedad

Pronto podrás reportar incidencias desde aquí.',
      '[]',
      'text',
      'ADMIN',
      '{}'
    ),
    (
      'D_CONTACT_ADMIN_PLACEHOLDER',
      'Contact admin placeholder',
      'ADMIN',
      '📞 Contactar administrador

Pronto podrás comunicarte con el equipo de WhatXia desde aquí.

Por ahora, escribe a soporte por los canales oficiales de WhatXia Mobility.',
      '[]',
      'text',
      'ADMIN',
      '{}'
    ),
    (
      'D_PERFORMANCE',
      'Performance summary',
      'DRIVER',
      'Hola, {{driver_name}}. 👋

📊 Tu rendimiento

🚕 Servicios realizados este mes: {{services_month}}
🚕 Servicios realizados este año: {{services_year}}
{{rating_line}}

{{recommendation}}',
      '["driver_name","services_month","services_year","rating_line","recommendation"]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"volver_perfil","title":"⬅️ Volver","sort_order":0}]}'
    ),
    (
      'D_PERFORMANCE_LOGIN_REQUIRED',
      'Performance login required',
      'LOGIN',
      'Debes iniciar sesión para ver tu rendimiento.',
      '[]',
      'text',
      'LOGIN',
      '{}'
    ),
    (
      'D_PERF_REC_EXCELLENT',
      'Perf recommendation excellent',
      'DRIVER',
      '🎉 ¡Excelente trabajo!
Continúa brindando un servicio de alta calidad.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_PERF_REC_IMPROVE',
      'Perf recommendation improve',
      'DRIVER',
      '⚠️ Te recomendamos mejorar tu promedio de calificación.
Nuestro objetivo es brindar un servicio de excelencia a todos los usuarios.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_PERF_REC_CRITICAL',
      'Perf recommendation critical',
      'DRIVER',
      '🚨 Tu promedio de calificación está por debajo del estándar de calidad de WhatXia.

Dispones de 30 días para mejorar tu desempeño.

Si al finalizar ese período no alcanzas el promedio mínimo requerido, tu caso será revisado por el equipo de operaciones y podrán aplicarse las medidas establecidas en el reglamento de conductores.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_UPDATE_CATEGORY',
      'Update category menu',
      'DRIVER',
      '✏️ Actualizar datos

¿Qué sección deseas modificar?',
      '[]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"update_personal","title":"👤 Datos personales","sort_order":0},{"id":"update_vehicle","title":"🚗 Vehículo","sort_order":1},{"id":"update_documents","title":"📄 Documentos","sort_order":2}]}'
    ),
    (
      'D_UPDATE_PERSONAL_LIST',
      'Personal field list',
      'DRIVER',
      '👤 Datos personales

{{lines}}

Escribe el número del dato que quieres actualizar.',
      '["lines"]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_UPDATE_SECTION_LIST',
      'Section field list',
      'DRIVER',
      'Sección seleccionada.

{{lines}}

Escribe el número del dato que quieres actualizar.',
      '["lines"]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_UPDATE_CONFIRM',
      'Update confirm',
      'DRIVER',
      'Vas a cambiar tu {{field_label}}.

Valor actual: {{current_value}}
Nuevo valor: {{new_value}}

¿Deseas confirmar?',
      '["field_label","current_value","new_value"]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"update_confirm_yes","title":"✅ Confirmar","sort_order":0},{"id":"update_confirm_no","title":"❌ Cancelar","sort_order":1}]}'
    ),
    (
      'D_UPDATE_SUCCESS',
      'Update success',
      'DRIVER',
      '✅ Tu información fue actualizada correctamente.',
      '[]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"post_another_personal","title":"Otro dato personal","sort_order":0},{"id":"post_driver_menu","title":"Menú conductor","sort_order":1},{"id":"post_main_menu","title":"Menú principal","sort_order":2}]}'
    ),
    (
      'D_UPDATE_DOCS_OK',
      'Docs ok after update',
      'DRIVER',
      '✅ Tus documentos quedaron al día. Cuando quieras, actívate como Disponible desde tu menú.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_UPDATE_INTERRUPTED',
      'Update interrupted',
      'ERRORS',
      'La actualización se interrumpió. Entra a Mis datos y vuelve a intentar.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_UPDATE_NUMBER_RANGE',
      'Update number range',
      'ERRORS',
      'Escribe un número entre 1 y {{max}}.',
      '["max"]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_UPDATE_READONLY',
      'Readonly field',
      'DRIVER',
      '🔒 {{label}} es solo lectura y no se puede modificar desde WhatsApp.',
      '["label"]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_UPDATE_EMAIL_PASSWORD',
      'Email change password gate',
      'DRIVER',
      'Por seguridad, escribe tu contraseña actual para cambiar el correo electrónico.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_UPDATE_NO_PASSWORD',
      'No password configured',
      'ERRORS',
      'No encontramos una contraseña configurada. Inicia sesión o restablécela e intenta de nuevo.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_UPDATE_EMAIL_PW_MAX',
      'Email password max attempts',
      'ERRORS',
      'Has superado el máximo de intentos de contraseña. El cambio de correo fue cancelado.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_UPDATE_EMAIL_PW_WRONG',
      'Email password wrong',
      'ERRORS',
      '❌ Contraseña incorrecta. Intento {{attempts}} de {{max}}.',
      '["attempts","max"]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_UPDATE_CONFIRM_EXPIRED',
      'Confirm expired',
      'ERRORS',
      'La confirmación expiró. Entra a Mis datos y vuelve a intentar.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_UPDATE_SAVE_FAIL',
      'Update save fail',
      'ERRORS',
      'No se pudo guardar el cambio. Intenta de nuevo.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_UPDATE_CANCELLED',
      'Update cancelled',
      'DRIVER',
      'Actualización cancelada. No se guardaron cambios.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_PHONE_COOLDOWN',
      'Phone change cooldown',
      'DRIVER',
      '⚠️ Solo puedes cambiar tu número de WhatsApp una vez cada 30 días.

Tu próximo cambio estará disponible el {{fecha}}.',
      '["fecha"]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"volver_menu","title":"🔙 Volver al menú","sort_order":0}]}'
    ),
    (
      'D_PHONE_START',
      'Phone change start',
      'DRIVER',
      '📱 Cambio de número de WhatsApp

Para verificar tu identidad necesito tu número de documento registrado en WhatXia.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_PHONE_CANCELLED',
      'Phone change cancelled',
      'DRIVER',
      'Cambio de número cancelado.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_PHONE_DOC_MISMATCH',
      'Phone doc mismatch',
      'DRIVER',
      'El documento no coincide con el registrado en tu cuenta. Inténtalo nuevamente.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_PHONE_ASK_PASSWORD',
      'Phone ask password',
      'DRIVER',
      'Escribe tu contraseña actual.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_PHONE_NO_PASSWORD',
      'Phone no password',
      'ERRORS',
      'No encontramos una contraseña configurada. Restablécela e intenta de nuevo.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_PHONE_ASK_NEW',
      'Ask new phone',
      'DRIVER',
      'Escribe tu nuevo número de WhatsApp (con indicativo de país, ejemplo: 573001234567).',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_PHONE_ASK_NEW_SHORT',
      'Ask new phone short',
      'DRIVER',
      'Escribe tu nuevo número de WhatsApp (con indicativo de país).',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_PHONE_INVALID',
      'Invalid phone number',
      'ERRORS',
      'Número inválido. Incluye indicativo y número (mínimo 10 dígitos).',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_PHONE_SAME',
      'Same phone number',
      'ERRORS',
      'El nuevo número debe ser distinto al actual.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_PHONE_TAKEN',
      'Phone already taken',
      'ERRORS',
      'Ese número ya está registrado en otra cuenta de conductor. Usa otro WhatsApp.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_PHONE_CONFIRM_NEW',
      'Confirm on new phone',
      'DRIVER',
      '📱 Confirmación de cambio de WhatsApp — WhatXia

El conductor {{driver_name}} solicitó asociar este número a su cuenta.

Si fuiste tú, confirma el cambio.',
      '["driver_name","requestId"]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"phone_confirm:{{requestId}}","title":"✅ Confirmar","sort_order":0},{"id":"phone_cancel:{{requestId}}","title":"❌ Cancelar","sort_order":1}]}'
    ),
    (
      'D_PHONE_SENT_CONFIRM',
      'Sent confirm to new WA',
      'DRIVER',
      'Enviamos una confirmación a tu nuevo WhatsApp.

Ábrelo y presiona ✅ Confirmar para completar el cambio.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_PHONE_WAITING',
      'Waiting new WA confirm',
      'DRIVER',
      'Aún estamos esperando la confirmación desde tu nuevo WhatsApp. Ábrelo y presiona ✅ Confirmar.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_PHONE_REQUEST_MISSING',
      'Phone request missing',
      'ERRORS',
      'No encontramos la solicitud de cambio de número.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_PHONE_NOT_PENDING',
      'Phone not pending',
      'ERRORS',
      'Esta solicitud ya no está pendiente.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_PHONE_EXPIRED',
      'Phone request expired',
      'ERRORS',
      'La solicitud expiró. Inicia el cambio de número nuevamente desde Mis datos.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_PHONE_WRONG_DEVICE',
      'Confirm wrong device',
      'ERRORS',
      'Esta confirmación solo puede hacerse desde el nuevo número de WhatsApp.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_PHONE_CANCELLED_FROM_NEW',
      'Cancelled from new WA',
      'DRIVER',
      'El cambio de número fue cancelado desde el nuevo WhatsApp.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_PHONE_TAKEN_LATE',
      'Taken late',
      'ERRORS',
      'Ese número ya está en uso. El cambio fue cancelado.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_PHONE_UPDATE_FAIL',
      'Phone update fail',
      'ERRORS',
      'No se pudo actualizar el número. Intenta de nuevo más tarde.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_PHONE_OK_OLD',
      'Phone ok notify old',
      'DRIVER',
      '✅ Tu número de WhatsApp fue actualizado. Continúa desde el nuevo número.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_PHONE_OK_NEW',
      'Phone ok notify new',
      'DRIVER',
      '✅ Tu número de WhatsApp fue actualizado correctamente.

Ya puedes usar WhatXia desde este teléfono.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_DOCS_EXPIRED',
      'Expired docs message',
      'DRIVER',
      'Uno o más de tus documentos están vencidos. Tu información fue guardada correctamente, pero no podrás recibir servicios hasta actualizar los documentos.',
      '[]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"actualizar_documentos","title":"📄 Actualizar docs","sort_order":0}]}'
    ),
    (
      'D_DOCS_BLOCKED_AVAILABILITY',
      'Blocked availability docs',
      'DRIVER',
      'No puedes quedar Disponible porque tienes documentos vencidos. Actualiza los documentos vencidos para continuar.',
      '[]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"actualizar_documentos","title":"📄 Actualizar docs","sort_order":0}]}'
    ),
    (
      'D_DOCS_REMINDER',
      'Doc expiry reminder',
      'DRIVER',
      '⏰ Hola {{driver_name}}, tu {{label}} vence en {{days}} días ({{display}}). Actualízala a tiempo para seguir recibiendo servicios.',
      '["driver_name","label","days","display"]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_DOCS_REMINDER_TOMORROW',
      'Doc expires tomorrow',
      'DRIVER',
      '⏰ Hola {{driver_name}}, tu {{label}} vence mañana ({{display}}). Actualízala a tiempo para seguir recibiendo servicios.',
      '["driver_name","label","display"]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_DOCS_BLOCKED',
      'Docs expired block',
      'DRIVER',
      '⛔ Uno o más documentos vencieron ({{labels}}). Quedaste inactivo y no recibirás servicios hasta actualizarlos.',
      '["labels"]',
      'interactive',
      'DRIVER',
      '{"kind":"buttons","buttons":[{"id":"actualizar_documentos","title":"📄 Actualizar docs","sort_order":0}]}'
    ),
    (
      'D_DOCS_REACTIVATED',
      'Docs reactivated',
      'DRIVER',
      '✅ Tus documentos quedaron al día. El bloqueo documental fue removido. Cuando quieras recibir servicios, actívate como Disponible desde tu menú.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_DOCS_ALREADY_OK',
      'Docs already ok',
      'DRIVER',
      '✅ Tus documentos ya están vigentes. Cuando quieras, actívate como Disponible desde tu menú.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_DOCS_UPDATE_INTRO',
      'Expired docs update intro',
      'DRIVER',
      'Vamos a actualizar solo los documentos vencidos: {{labels}}.',
      '["labels"]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_DOCS_UPDATE_INTERRUPTED',
      'Docs update interrupted',
      'ERRORS',
      'La actualización se interrumpió. Usa el botón 📄 Actualizar docs para continuar.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_DOCS_FIELD_UPDATED',
      'Doc field updated',
      'DRIVER',
      '✅ {{label}} actualizado.',
      '["label"]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_DOCS_UPDATE_DONE',
      'Docs update done',
      'DRIVER',
      '✅ Documentos actualizados. Cuando quieras recibir servicios, actívate como Disponible.',
      '[]',
      'text',
      'DRIVER',
      '{}'
    ),
    (
      'D_REF_SHARE_SUMMARY',
      'Referral share summary',
      'REFERRALS',
      '👥 Programa de Referidos

Comparte este enlace con familiares y amigos.
Al abrirlo, llegan directo al chat oficial de WhatXia.

Toda persona que se registre mediante este enlace quedará asociada a tu cuenta.

🏷️ Tu código: {{code}}

🔗 Tu enlace:
{{link}}

📊 Referidos registrados: {{total}}',
      '["code","link","total"]',
      'text',
      'REFERRALS',
      '{}'
    ),
    (
      'D_REF_COPY',
      'Referral copy message',
      'REFERRALS',
      '📋 Copia tu enlace de referidos

Mantén pulsado el enlace para copiarlo:

🏷️ Código: {{code}}
{{link}}',
      '["code","link"]',
      'text',
      'REFERRALS',
      '{}'
    ),
    (
      'D_REF_ACTIONS',
      'Referral actions',
      'REFERRALS',
      '¿Qué deseas hacer con tu enlace?',
      '[]',
      'interactive',
      'REFERRALS',
      '{"kind":"buttons","buttons":[{"id":"referidos_copy","title":"📋 Copiar enlace","sort_order":0},{"id":"referidos_share","title":"📤 Compartir","sort_order":1},{"id":"volver_cuenta","title":"⬅️ Volver","sort_order":2}]}'
    ),
    (
      'D_REF_MORE',
      'Referral more actions',
      'REFERRALS',
      '¿Algo más?',
      '[]',
      'interactive',
      'REFERRALS',
      '{"kind":"buttons","buttons":[{"id":"referidos_share","title":"📤 Compartir","sort_order":0},{"id":"referidos","title":"👥 Ver resumen","sort_order":1},{"id":"volver_cuenta","title":"⬅️ Volver","sort_order":2}]}'
    ),
    (
      'D_REF_SHARE_CTA',
      'Referral share CTA',
      'REFERRALS',
      '📤 Comparte tu enlace. Quien lo abra llegará al chat oficial de WhatXia con tu código.',
      '[]',
      'interactive',
      'REFERRALS',
      '{"kind":"buttons","buttons":[{"id":"cta_url","title":"Compartir enlace","sort_order":0}]}'
    ),
    (
      'D_REF_SHARE_TEXT',
      'Referral share text template',
      'REFERRALS',
      'Únete a WhatXia con mi enlace:
{{link}}',
      '["link"]',
      'text',
      'REFERRALS',
      '{}'
    ),
    (
      'D_REF_ERROR',
      'Referral link error',
      'ERRORS',
      'No pudimos generar tu enlace de referidos en este momento. Intenta de nuevo en unos minutos.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'D_TAX_ACTIVATION',
      'Taximeter activation',
      'SYSTEM',
      '✅ Taxímetro de prueba activado.
Comparte tu ubicación de inicio.',
      '[]',
      'interactive',
      'SYSTEM',
      '{}'
    ),
    (
      'D_TAX_END_LOCATION',
      'Taximeter end location',
      'SYSTEM',
      '📍 Comparte tu ubicación final para cerrar la medición.',
      '[]',
      'interactive',
      'SYSTEM',
      '{}'
    ),
    (
      'D_TAX_MEASURING',
      'Taximeter measuring',
      'SYSTEM',
      '✅ Ubicación de inicio registrada.',
      '[]',
      'interactive',
      'SYSTEM',
      '{"kind":"buttons","buttons":[{"id":"taximeter_finish","title":"🏁 Terminar prueba","sort_order":0}]}'
    ),
    (
      'D_TAX_MISSING_START',
      'Taximeter missing start',
      'SYSTEM',
      'Falta la ubicación de inicio. Envía 🚖 para reiniciar.',
      '[]',
      'text',
      'SYSTEM',
      '{}'
    ),
    (
      'D_TAX_FARE_FAIL',
      'Taximeter fare fail',
      'SYSTEM',
      'No pudimos calcular la tarifa WhatXia. Envía 🚖 para reiniciar.',
      '[]',
      'text',
      'SYSTEM',
      '{}'
    ),
    (
      'D_TAX_ASK_METER',
      'Ask meter value',
      'SYSTEM',
      'Valor calculado por WhatXia: {{fare}}
¿Cuál fue el valor que marcó el taxímetro?',
      '["fare"]',
      'text',
      'SYSTEM',
      '{}'
    ),
    (
      'D_TAX_INCOMPLETE',
      'Taximeter incomplete',
      'SYSTEM',
      'Datos incompletos. Envía 🚖 para reiniciar.',
      '[]',
      'text',
      'SYSTEM',
      '{}'
    ),
    (
      'D_TAX_SAVED',
      'Taximeter saved',
      'SYSTEM',
      '✅ Prueba registrada correctamente.
WhatXia: {{whatxia}}
Taxímetro: {{meter}}
Diferencia: {{diff}}{{diff_note}}
Gracias por tu tiempo.',
      '["whatxia","meter","diff","diff_note"]',
      'text',
      'SYSTEM',
      '{}'
    ),
    (
      'D_TAX_NO_ACTIVE',
      'No active taximeter',
      'SYSTEM',
      'No hay un taxímetro de prueba activo. Envía 🚖 para iniciar.',
      '[]',
      'text',
      'SYSTEM',
      '{}'
    ),
    (
      'D_TAX_ASK_METER_NUMBERS',
      'Ask meter numbers only',
      'SYSTEM',
      '¿Cuál fue el valor que marcó el taxímetro? (solo números)',
      '[]',
      'text',
      'SYSTEM',
      '{}'
    ),
    (
      'D_TAX_INVALID_METER',
      'Invalid meter value',
      'SYSTEM',
      'Envía solo el valor numérico del taxímetro (ejemplo: 14700).',
      '[]',
      'text',
      'SYSTEM',
      '{}'
    ),
    (
      'D_TAX_SESSION_EXPIRED',
      'Taximeter session expired',
      'SYSTEM',
      'Sesión expirada. Envía 🚖 para reiniciar.',
      '[]',
      'text',
      'SYSTEM',
      '{}'
    ),
    (
      'D_TAX_SESSION_INVALID',
      'Taximeter session invalid',
      'SYSTEM',
      'Sesión inválida. Envía 🚖 para reiniciar.',
      '[]',
      'text',
      'SYSTEM',
      '{}'
    ),
    (
      'SYS_TUNNEL_CLOSED',
      'Tunnel closed',
      'SYSTEM',
      'Este canal de comunicación ya no está disponible.',
      '[]',
      'text',
      'SYSTEM',
      '{}'
    ),
    (
      'SYS_TUNNEL_RELAY_PASSENGER',
      'Tunnel relay passenger',
      'SYSTEM',
      '💬 Pasajero:
{{text}}',
      '["text"]',
      'text',
      'SYSTEM',
      '{}'
    ),
    (
      'SYS_TUNNEL_RELAY_DRIVER',
      'Tunnel relay driver',
      'SYSTEM',
      '💬 Conductor:
{{text}}',
      '["text"]',
      'text',
      'SYSTEM',
      '{}'
    ),
    (
      'SYS_TUNNEL_DELIVERY_FAIL',
      'Tunnel delivery fail',
      'ERRORS',
      'No pudimos entregar tu mensaje. Intenta de nuevo en un momento.',
      '[]',
      'text',
      'ERRORS',
      '{}'
    ),
    (
      'SYS_AUDIO_FAIL',
      'Audio transcription fail',
      'SYSTEM',
      'No pude escuchar el audio. ¿Puedes escribirlo o enviar otra nota de voz?',
      '[]',
      'text',
      'SYSTEM',
      '{}'
    ),
    (
      'P_FALLBACK_HELP',
      'Fallback help',
      'PASSENGER',
      'Puedes escribir, por ejemplo: "Necesito un servicio en Jordán" o "Estoy en la 60 y voy para Multicentro". También puedes decir Hola para ver el menú.',
      '[]',
      'text',
      'PASSENGER',
      '{}'
    )
) as m(code, name, cat_code, body, vars, content_type, module, interactive)
join public.bot_message_categories c on c.code = m.cat_code
on conflict (code) do update set
  name = excluded.name,
  category_id = excluded.category_id,
  body = excluded.body,
  available_variables = excluded.available_variables,
  status = 'PUBLISHED',
  is_active = true,
  content_type = excluded.content_type,
  module = excluded.module,
  environment = 'PRODUCTION',
  interactive_payload = excluded.interactive_payload,
  version = public.bot_messages.version + 1,
  updated_at = now();

-- Nodos reales → PASSENGER_CONVERSATIONS
with tree as (select id from public.bot_conversation_trees where code = 'PASSENGER_CONVERSATIONS')
insert into public.bot_conversation_nodes (
  tree_id, code, name, stage, content_type, body, interactive_payload,
  message_code, is_entry, sort_order, position_x, position_y
)
select
  tree.id,
  n.code,
  n.name,
  n.stage,
  coalesce(msg.content_type, 'text'),
  coalesce(msg.body, ''),
  coalesce(msg.interactive_payload, '{}'::jsonb),
  n.message_code,
  n.is_entry,
  n.sort_order,
  80,
  40 + n.sort_order * 120
from tree
cross join (
  values
    ('P_FULL_NAME_PROMPT', 'Bienvenida / nombre', 'REGISTRATION', 'P_FULL_NAME_PROMPT', true, 0),
    ('P_HOME_GREETING', 'Home pasajero', 'FAVORITES', 'P_HOME_GREETING', false, 1),
    ('P_ASK_PICKUP_TEXT', 'Pedir origen', 'MOBILITY', 'P_ASK_PICKUP_TEXT', false, 2),
    ('P_ASK_DESTINATION', 'Pedir destino', 'MOBILITY', 'P_ASK_DESTINATION', false, 3),
    ('P_QUOTE_CONFIRM', 'Confirmar cotización', 'MOBILITY', 'P_QUOTE_CONFIRM', false, 4),
    ('P_SEARCHING_DRIVER', 'Buscando conductor', 'MOBILITY', 'P_SEARCHING_DRIVER', false, 5),
    ('NO_DRIVERS_AVAILABLE', 'Sin conductores', 'MOBILITY', 'NO_DRIVERS_AVAILABLE', false, 6),
    ('P_VEHICLE_CONFIRMED', 'Vehículo confirmado', 'MOBILITY', 'P_VEHICLE_CONFIRMED', false, 7),
    ('P_TRIP_COMPLETED', 'Viaje finalizado', 'MOBILITY', 'P_TRIP_COMPLETED', false, 8),
    ('P_RATING_PROMPT', 'Calificación', 'MOBILITY', 'P_RATING_PROMPT', false, 9)
) as n(code, name, stage, message_code, is_entry, sort_order)
left join public.bot_messages msg on msg.code = n.message_code
on conflict (tree_id, code) do update set
  name = excluded.name,
  stage = excluded.stage,
  content_type = excluded.content_type,
  body = excluded.body,
  interactive_payload = excluded.interactive_payload,
  message_code = excluded.message_code,
  is_entry = excluded.is_entry,
  sort_order = excluded.sort_order,
  updated_at = now();

-- Nodos reales → DRIVER_CONVERSATIONS
with tree as (select id from public.bot_conversation_trees where code = 'DRIVER_CONVERSATIONS')
insert into public.bot_conversation_nodes (
  tree_id, code, name, stage, content_type, body, interactive_payload,
  message_code, is_entry, sort_order, position_x, position_y
)
select
  tree.id,
  n.code,
  n.name,
  n.stage,
  coalesce(msg.content_type, 'text'),
  coalesce(msg.body, ''),
  coalesce(msg.interactive_payload, '{}'::jsonb),
  n.message_code,
  n.is_entry,
  n.sort_order,
  80,
  40 + n.sort_order * 120
from tree
cross join (
  values
    ('D_CLOSED_SESSION_MENU', 'Sesión cerrada', 'LOGIN', 'D_CLOSED_SESSION_MENU', true, 0),
    ('D_REG_WELCOME', 'Registro', 'REGISTRATION', 'D_REG_WELCOME', false, 1),
    ('D_MAIN_WELCOME', 'Menú principal', 'ACTIVACION', 'D_MAIN_WELCOME', false, 2),
    ('D_TRIP_OFFER', 'Oferta', 'OFERTAS', 'D_TRIP_OFFER', false, 3),
    ('D_SERVICE_ASSIGNED', 'Servicio asignado', 'VIAJES', 'D_SERVICE_ASSIGNED', false, 4),
    ('D_START_TRIP_PROMPT', 'Iniciar viaje', 'VIAJES', 'D_START_TRIP_PROMPT', false, 5),
    ('D_IN_PROGRESS_SCREEN', 'En curso', 'VIAJES', 'D_IN_PROGRESS_SCREEN', false, 6),
    ('D_RATE_PASSENGER_PROMPT', 'Calificar pasajero', 'FINALIZACION', 'D_RATE_PASSENGER_PROMPT', false, 7),
    ('D_DOCS_EXPIRED', 'Docs vencidos', 'INCIDENCIAS', 'D_DOCS_EXPIRED', false, 8),
    ('D_SUSPENDED_UNTIL', 'Suspensión', 'SUSPENSIONES', 'D_SUSPENDED_UNTIL', false, 9)
) as n(code, name, stage, message_code, is_entry, sort_order)
left join public.bot_messages msg on msg.code = n.message_code
on conflict (tree_id, code) do update set
  name = excluded.name,
  stage = excluded.stage,
  content_type = excluded.content_type,
  body = excluded.body,
  interactive_payload = excluded.interactive_payload,
  message_code = excluded.message_code,
  is_entry = excluded.is_entry,
  sort_order = excluded.sort_order,
  updated_at = now();


update public.bot_conversation_trees t
set root_node_id = n.id,
    status = 'PUBLISHED',
    is_active = true,
    environment = 'PRODUCTION',
    updated_at = now()
from public.bot_conversation_nodes n
where t.code = 'PASSENGER_CONVERSATIONS'
  and n.tree_id = t.id
  and n.code = 'P_FULL_NAME_PROMPT';

update public.bot_conversation_trees t
set root_node_id = n.id,
    status = 'PUBLISHED',
    is_active = true,
    environment = 'PRODUCTION',
    updated_at = now()
from public.bot_conversation_nodes n
where t.code = 'DRIVER_CONVERSATIONS'
  and n.tree_id = t.id
  and n.code = 'D_CLOSED_SESSION_MENU';

insert into public.bot_conversation_edges (
  tree_id, from_node_id, to_node_id, label, trigger_type, trigger_value, sort_order
)
select t.id, f.id, dest.id, e.label, e.trigger_type, e.trigger_value, e.sort_order
from public.bot_conversation_trees t
join (
  values
    ('PASSENGER_CONVERSATIONS', 'P_FULL_NAME_PROMPT', 'P_HOME_GREETING', 'Registro ok', 'default', '', 0),
    ('PASSENGER_CONVERSATIONS', 'P_HOME_GREETING', 'P_ASK_PICKUP_TEXT', 'Solicitar', 'button', 'solicitar_servicio', 0),
    ('PASSENGER_CONVERSATIONS', 'P_ASK_PICKUP_TEXT', 'P_ASK_DESTINATION', 'Origen', 'default', '', 0),
    ('PASSENGER_CONVERSATIONS', 'P_ASK_DESTINATION', 'P_QUOTE_CONFIRM', 'Destino', 'default', '', 0),
    ('PASSENGER_CONVERSATIONS', 'P_QUOTE_CONFIRM', 'P_SEARCHING_DRIVER', 'Solicitar', 'button', 'booking_request_trip', 0),
    ('PASSENGER_CONVERSATIONS', 'P_SEARCHING_DRIVER', 'P_VEHICLE_CONFIRMED', 'Asignado', 'default', '', 0),
    ('PASSENGER_CONVERSATIONS', 'P_SEARCHING_DRIVER', 'NO_DRIVERS_AVAILABLE', 'Sin oferta', 'default', 'no_drivers', 1),
    ('PASSENGER_CONVERSATIONS', 'P_VEHICLE_CONFIRMED', 'P_TRIP_COMPLETED', 'Finalizar', 'default', '', 0),
    ('PASSENGER_CONVERSATIONS', 'P_TRIP_COMPLETED', 'P_RATING_PROMPT', 'Calificar', 'default', '', 0)
) as e(tree_code, from_code, to_code, label, trigger_type, trigger_value, sort_order)
  on t.code = e.tree_code
join public.bot_conversation_nodes f on f.tree_id = t.id and f.code = e.from_code
join public.bot_conversation_nodes dest on dest.tree_id = t.id and dest.code = e.to_code;

insert into public.bot_conversation_edges (
  tree_id, from_node_id, to_node_id, label, trigger_type, trigger_value, sort_order
)
select t.id, f.id, dest.id, e.label, e.trigger_type, e.trigger_value, e.sort_order
from public.bot_conversation_trees t
join (
  values
    ('DRIVER_CONVERSATIONS', 'D_CLOSED_SESSION_MENU', 'D_REG_WELCOME', 'Registro', 'button', 'driver_reg_start', 0),
    ('DRIVER_CONVERSATIONS', 'D_CLOSED_SESSION_MENU', 'D_MAIN_WELCOME', 'Login', 'button', 'driver_login', 1),
    ('DRIVER_CONVERSATIONS', 'D_REG_WELCOME', 'D_MAIN_WELCOME', 'Activación', 'default', '', 0),
    ('DRIVER_CONVERSATIONS', 'D_MAIN_WELCOME', 'D_TRIP_OFFER', 'Oferta', 'default', 'offer', 0),
    ('DRIVER_CONVERSATIONS', 'D_TRIP_OFFER', 'D_SERVICE_ASSIGNED', 'Aceptar', 'button', 'aceptar_servicio', 0),
    ('DRIVER_CONVERSATIONS', 'D_SERVICE_ASSIGNED', 'D_START_TRIP_PROMPT', 'Llegué', 'button', 'llegue_recogida', 0),
    ('DRIVER_CONVERSATIONS', 'D_START_TRIP_PROMPT', 'D_IN_PROGRESS_SCREEN', 'Iniciar', 'button', 'iniciar_viaje', 0),
    ('DRIVER_CONVERSATIONS', 'D_IN_PROGRESS_SCREEN', 'D_RATE_PASSENGER_PROMPT', 'Finalizar', 'button', 'finalizar_viaje', 0)
) as e(tree_code, from_code, to_code, label, trigger_type, trigger_value, sort_order)
  on t.code = e.tree_code
join public.bot_conversation_nodes f on f.tree_id = t.id and f.code = e.from_code
join public.bot_conversation_nodes dest on dest.tree_id = t.id and dest.code = e.to_code;


comment on table public.bot_messages is
  'BOT-CMS-002: fuente oficial de copy del bot. Runtime consume solo PUBLISHED.';
