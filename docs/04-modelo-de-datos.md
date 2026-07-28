# 04 — Modelo de datos

**Producto:** WhatXia Operations Panel  
**Tipo de documento:** Modelo de datos conceptual (dominio operativo)  
**Audiencia:** Ingeniería, producto, operaciones  
**Estado:** Borrador inicial  
**Nota:** Este documento describe el dominio de lectura del panel. No es un esquema SQL final ni una migración.

---

## 1. Propósito

Definir las entidades, relaciones, estados y lecturas que el Operations Panel necesita para visualizar la operación de WhatXia Mobility MVP.

El panel **no inventa** un dominio paralelo al bot.  
Lee un dominio operativo compartido (o vistas derivadas del mismo).

---

## 2. Principios del modelo

1. **Una fuente de verdad:** los datos operativos nacen de la operación real (principalmente vía bot / plataforma), no del panel.
2. **Orientado a lectura:** el MVP del panel consume entidades; no las redefine administrativamente.
3. **Estados explícitos:** cada entidad crítica tiene un diccionario de estados cerrado.
4. **Mínimo suficiente:** solo entidades necesarias para operación, métricas y monitoreo.
5. **Sin CRM/ERP:** no se modelan oportunidades comerciales, facturas, nómina ni catálogos administrativos extensos.

---

## 3. Diagrama conceptual

```
[Usuario / Pasajero] 1───* [Servicio] *───0..1 [Conductor]
                              │
                              │ 1
                              ▼
                         [EventoDeServicio] (opcional / recomendado)
                              │
                              ▼
                    [SeñalDePlataforma] (lectura de salud)
```

Relaciones mínimas:

- Un **servicio** puede tener un **conductor** asignado (o ninguno aún).
- Un **servicio** pertenece a un solicitante (usuario/pasajero), representado de forma mínima.
- Un **conductor** puede tener cero o muchos servicios en el tiempo.
- Los **eventos** (si existen) explican transiciones de estado del servicio.
- Las **señales de plataforma** no son parte del dominio de movilidad; son telemetría de salud.

---

## 4. Entidades del dominio

### 4.1 Servicio (`Service`)

Representa una solicitud/viaje/operación de movilidad en el MVP.

#### Atributos conceptuales mínimos

| Campo | Descripción |
|---|---|
| `id` | Identificador único |
| `status` | Estado operativo actual |
| `created_at` | Creación |
| `updated_at` | Última actualización |
| `assigned_at` | Asignación a conductor (si aplica) |
| `started_at` | Inicio efectivo (si aplica) |
| `completed_at` | Finalización exitosa (si aplica) |
| `cancelled_at` | Cancelación (si aplica) |
| `driver_id` | Conductor asignado (nullable) |
| `user_ref` | Referencia mínima al solicitante |
| `origin_summary` | Resumen de origen (si existe) |
| `destination_summary` | Resumen de destino (si existe) |
| `source` | Origen de creación (ej. whatsapp/bot) |

Los nombres exactos pueden mapearse al esquema real del bot. Lo importante es el significado.

#### Estados sugeridos (diccionario)

El diccionario final debe alinearse con el bot. Propuesta de partida:

| Estado | Significado operativo |
|---|---|
| `requested` | Solicitado, aún no asignado |
| `assigned` | Conductor asignado |
| `in_progress` | En curso |
| `completed` | Completado |
| `cancelled` | Cancelado |
| `failed` | Fallido / no concretado por error |

Regla: el panel no muestra estados que el dominio no pueda producir.

#### Lecturas del panel

- listado del día / rango,
- detalle,
- conteos por estado,
- detección de estancados (`updated_at` antiguo en estados no terminales).

---

### 4.2 Conductor (`Driver`)

Representa a un conductor visible para la operación del MVP.

#### Atributos conceptuales mínimos

| Campo | Descripción |
|---|---|
| `id` | Identificador único |
| `display_name` | Nombre visible interno |
| `phone_ref` | Referencia telefónica operativa (si aplica) |
| `status` | Estado operativo actual |
| `is_active` | Alta/baja lógica simple |
| `last_seen_at` | Última señal de actividad |
| `created_at` | Alta en sistema |
| `updated_at` | Última actualización |

#### Estados sugeridos

| Estado | Significado operativo |
|---|---|
| `available` | Disponible para servicio |
| `busy` | En servicio / no asignable |
| `offline` | No conectado |
| `inactive` | No operativo / deshabilitado |

#### Lecturas del panel

- listado filtrable,
- detalle básico,
- conteo por estado,
- servicios recientes asociados (resumen).

#### Fuera de modelo (MVP)

- documentos KYC,
- cuentas bancarias,
- historial laboral,
- scoring complejo.

---

### 4.3 Usuario / Pasajero (`User` — vista mínima)

Solo como referencia operativa del servicio.  
**No** se construye un módulo de clientes.

#### Atributos conceptuales mínimos

| Campo | Descripción |
|---|---|
| `id` / `external_ref` | Identificador o referencia |
| `display_label` | Etiqueta interna (nombre o máscara) |
| `phone_ref` | Referencia si es necesaria operativamente |

#### Regla de producto

Mostrar lo mínimo para entender un servicio.  
No historial comercial, no segmentación, no pipeline.

---

### 4.4 Evento de servicio (`ServiceEvent`) — recomendado

Si el bot o la plataforma ya registran historial, el panel puede leerlo.  
Si no existe, el MVP puede inferir desde timestamps y estado actual, con menor riqueza.

#### Atributos conceptuales

| Campo | Descripción |
|---|---|
| `id` | Identificador |
| `service_id` | Servicio asociado |
| `event_type` | Tipo de evento / transición |
| `from_status` | Estado anterior (opcional) |
| `to_status` | Estado nuevo (opcional) |
| `created_at` | Momento del evento |
| `actor` | Origen (bot, sistema, conductor, etc.) |

#### Uso en panel

- timeline de detalle de servicio,
- diagnóstico de estancamiento,
- auditoría operativa ligera.

---

### 4.5 Señal de plataforma (`PlatformSignal`)

No es entidad de movilidad; es telemetría para el módulo de monitoreo.

#### Ejemplos de señales

| Señal | Uso |
|---|---|
| frescura de datos | ¿Hay actividad reciente? |
| error de lectura DB | ¿El panel puede ver la verdad? |
| última creación de servicio | ¿La operación está viva? |
| contador de errores recientes | ¿Hay degradación? |

Puede implementarse sin tabla propia (health checks + consultas).  
El modelo conceptual existe para no mezclar “salud técnica” con “servicio de movilidad”.

---

### 4.6 Usuario interno del panel (`OpsUser`)

Usuario que inicia sesión en el panel.

| Campo | Descripción |
|---|---|
| `id` | Identificador |
| `email` | Acceso |
| `role` | Rol simple (MVP: `operator`) |
| `is_active` | Habilitado |
| `last_login_at` | Último acceso |

No confundir con pasajero ni conductor.

---

## 5. Relaciones y cardinalidad

| Relación | Cardinalidad | Notas |
|---|---|---|
| User → Service | 1 a N | Un usuario puede generar varios servicios |
| Driver → Service | 1 a N | Un conductor atiende varios servicios en el tiempo |
| Service → Driver | N a 0..1 | Un servicio tiene como máximo un conductor asignado actual |
| Service → ServiceEvent | 1 a N | Historial opcional |
| OpsUser ⟂ dominio movilidad | — | Sin relación de negocio con servicios |

---

## 6. Agregados y lecturas analíticas (MVP)

El panel necesita lecturas agregadas, no un warehouse.

### Agregados mínimos

| Agregado | Descripción |
|---|---|
| `services_by_status` | Conteo de servicios por estado en ventana |
| `services_created_today` | Volumen del día |
| `completion_rate` | Completados / (completados + cancelados + fallidos) o definición acordada |
| `active_services` | No terminales en este momento |
| `drivers_by_status` | Conteo de conductores por estado |
| `stale_services` | No terminales con `updated_at` antiguo |
| `last_operational_activity_at` | Máxima frescura observable |

### Definiciones a cerrar antes de implementar métricas

1. ¿Qué estados son terminales?
2. ¿Qué ventana es “hoy” (timezone)?
3. ¿Un servicio reabierto cuenta doble?
4. ¿Conductor “activo” significa `available` + `busy`, o solo `available`?

Sin estas definiciones, las métricas no son confiables.

---

## 7. Reglas de integridad conceptual

1. Un servicio en estado `assigned` o `in_progress` debería tener `driver_id` (salvo excepciones documentadas).
2. Estados terminales no deberían aparecer como “activos”.
3. `completed_at`, `cancelled_at` y `failed` son mutuamente excluyentes en la práctica operativa.
4. El panel no “repara” datos inconsistentes en MVP; los deja visibles como anomalía cuando sea posible.
5. No se duplican entidades de cliente para fines CRM.

---

## 8. Privacidad y minimización

- Mostrar referencias operativas necesarias, no perfiles ricos.
- Evitar campos sensibles no indispensables en listados.
- Teléfonos y nombres se tratan como datos internos de operación.
- El modelo no incluye preferencias de marketing ni consentimientos complejos en MVP.

---

## 9. Mapeo módulo → entidades

| Módulo | Entidades principales |
|---|---|
| Estado de la operación | Service, Driver, agregados, PlatformSignal |
| Métricas | Agregados de Service y Driver |
| Conductores | Driver (+ Service resumido) |
| Servicios | Service (+ Driver/User refs, ServiceEvent) |
| Monitoreo | PlatformSignal / health reads |
| Acceso interno | OpsUser |

---

## 10. Contrato de datos con el bot

### Debe existir un acuerdo mínimo sobre:

- nombres/estados de servicio y conductor,
- campos de timestamp fuente de verdad,
- timezone de reportes,
- significado de “activo”,
- qué registros entran al MVP (filtros de entorno/prueba).

### Gobernanza sugerida

- Cambios de estado en el bot que afecten al panel se comunican antes de desplegar.
- El panel puede depender de vistas de lectura estables para aislarse del esquema interno del bot.
- Ambientes (dev/staging/prod) deben distinguirse con claridad.

---

## 11. Datos de prueba y ambientes

Para validar el panel se requieren datasets que cubran:

- servicios en cada estado,
- servicios estancados,
- conductores en cada estado,
- día sin actividad (estado vacío),
- inconsistencias leves (para ver comportamiento del UI),
- volumen suficiente para listados y métricas.

No se documentan aquí fixtures técnicas; solo el requisito de cobertura.

---

## 12. Fuera de alcance del modelo (MVP)

- Tablas de CRM (leads, deals, tickets).
- Entidades financieras (facturas, liquidaciones, comisiones detalladas).
- Inventario de vehículos como ERP de flota.
- Catálogos de marketing.
- Multi-tenant organizacional complejo.
- Data lake / hechos dimensionales.

---

## 13. Pendientes de descubrimiento (a resolver con el esquema real del bot)

Estas preguntas deben cerrarse al conectar el panel a datos reales:

1. ¿Cómo se llama hoy la entidad de servicio en Supabase?
2. ¿El conductor es tabla propia o perfil tipado?
3. ¿Existe historial de eventos o solo estado actual?
4. ¿Hay soft-deletes?
5. ¿Qué campos geográficos existen realmente?
6. ¿Hay servicios de prueba que deban excluirse del panel?

Hasta responderlas, este modelo permanece **conceptual** y válido como guía.

---

## 14. Relación con otros documentos

| Documento | Relación |
|---|---|
| `03-módulos-mvp.md` | Consumidores del modelo |
| `05-pantallas.md` | Campos visibles por pantalla |
| `02-arquitectura.md` | Límite de lectura compartida |
