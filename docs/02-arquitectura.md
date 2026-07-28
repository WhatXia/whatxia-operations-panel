# 02 — Arquitectura

**Producto:** WhatXia Operations Panel  
**Tipo de documento:** Arquitectura de solución (alto nivel)  
**Audiencia:** CTO, ingeniería, producto  
**Estado:** Borrador inicial  
**Alcance:** Arquitectura conceptual del MVP — no especificación de implementación

---

## 1. Propósito de este documento

Definir los límites del sistema, sus componentes, sus dependencias y los principios de diseño que deben guiar el Operations Panel, sin prescribir código, esquemas SQL finales ni detalles de despliegue.

---

## 2. Principio rector

El Operations Panel es un **sistema de observación operativa** independiente del bot conversacional.

```
[Usuarios WhatsApp]
        │
        ▼
[Bot WhatXia] ──────────────► [WhatsApp Cloud API]
        │
        ▼
   [Supabase / datos operativos]
        ▲
        │ (lectura / consultas)
        │
[WhatXia Operations Panel] ◄── [Operaciones / Producto / Ingeniería]
```

El bot **escribe y orquesta** la operación.  
El panel **lee y visualiza** la operación.

---

## 3. Contexto del sistema

### 3.1 Sistemas existentes

| Sistema | Responsabilidad |
|---|---|
| Bot conversacional WhatXia | Interacción WhatsApp, captura de solicitudes, flujos conversacionales |
| WhatsApp Cloud API | Canal de mensajería |
| Supabase | Persistencia, autenticación (potencial), datos operativos |
| Operations Panel (este proyecto) | UI interna de monitoreo y métricas |

### 3.2 Independencia del repositorio

El panel vive en un proyecto separado (`whatxia-operations-panel`).  
No se embebe dentro del bot.  
Puede compartir:

- el mismo entorno de datos (Supabase) o vistas/lecturas acordadas,
- convenciones de dominio (servicios, conductores, estados),
- estándares de autenticación interna.

No debe compartir:

- lógica conversacional,
- handlers de webhooks de WhatsApp,
- UI del bot,
- acoplamiento de despliegue 1:1 con el bot (pueden desplegarse por separado).

---

## 4. Estilo arquitectónico del MVP

### Enfoque recomendado: Application de lectura + fuente de datos compartida

Para el MVP se adopta una arquitectura simple:

1. **Frontend / aplicación web** del panel (Next.js, alineado al stack WhatXia).
2. **Capa de acceso a datos** orientada a lectura (consultas, vistas, agregaciones).
3. **Fuente de verdad operativa** en Supabase (u origen equivalente ya usado por el bot).
4. **Autenticación interna** restringida al equipo WhatXia.

Se evita, en el MVP:

- microservicios,
- buses de eventos complejos,
- réplicas analíticas dedicadas,
- motores de BI externos como dependencia crítica,
- escritura masiva desde el panel.

---

## 5. Capas lógicas

### 5.1 Capa de presentación

Responsable de:

- dashboard operativo,
- listados y detalle de servicios,
- listados y detalle de conductores,
- métricas,
- indicadores de salud de plataforma.

Características deseadas:

- carga rápida de la vista del día,
- estados claros (loading / vacío / error),
- lenguaje operativo consistente,
- diseño sobrio orientado a trabajo interno (no marketing).

### 5.2 Capa de aplicación (panel)

Responsable de:

- orquestar consultas de lectura,
- aplicar filtros temporales y de estado,
- calcular o solicitar agregaciones de métricas,
- normalizar estados para UI,
- controlar acceso de usuarios internos.

No responsable de:

- enviar mensajes WhatsApp,
- asignar conductores de forma automática (salvo que una fase posterior lo justifique),
- modificar reglas del bot.

### 5.3 Capa de datos

Responsable de:

- entidades de dominio (servicios, conductores, eventos/estados),
- integridad proveniente del bot y de la operación real,
- posibles vistas materializadas o consultas agregadas para el panel.

### 5.4 Capa de integración (pasiva en MVP)

El panel puede, en fases posteriores, consumir señales de salud (uptime, errores, latencia).  
En el MVP, el monitoreo de plataforma se limita a señales disponibles sin construir un stack de observabilidad completo.

---

## 6. Límites del sistema (system boundaries)

### Dentro del perímetro del panel

- Visualización de estado operativo
- Métricas del MVP
- Lectura de conductores y servicios
- Monitoreo básico de plataforma
- Acceso autenticado interno

### Fuera del perímetro del panel

- Conversaciones WhatsApp
- Webhooks de Meta / WhatsApp
- CRM de clientes
- ERP / finanzas / nómina
- App móvil de conductor o pasajero
- Motor avanzado de matching / pricing
- Gestión documental o compliance avanzada

---

## 7. Modelo de interacción con el bot

| Aspecto | Dec | Panel |
|---|---|---|
| Canal usuario | WhatsApp | Web interna |
| Escritura de servicios | Sí (principal) | No / mínima (MVP: lectura) |
| Lectura de servicios | Posible | Sí (principal) |
| Mensajería | Sí | No |
| Métricas operativas | No es su foco | Sí |
| Independencia de deploy | Sí | Sí |

### Contrato implícito

El bot y el panel deben compartir un **vocabulario de dominio** estable:

- qué es un servicio,
- qué estados puede tener,
- qué es un conductor y sus estados,
- qué timestamps son fuente de verdad,
- qué significa “activo”, “disponible”, “completado”, “cancelado”, “fallido”.

Ese contrato puede materializarse como documentación de dominio + esquema/vistas, no necesariamente como API pública externa en el MVP.

---

## 8. Datos y consistencia

### Fuente de verdad

La fuente de verdad operativa permanece en la capa de datos usada por el bot (Supabase).  
El panel no introduce una segunda verdad.

### Consistencia esperada en MVP

- **Casi tiempo real o refresco frecuente** es suficiente.
- No se exige streaming de baja latencia como requisito bloqueante del MVP.
- Se acepta un desfase breve si simplifica la arquitectura (polling / refresh / suscripciones simples).

### Agregaciones

Las métricas pueden calcularse:

- en consulta (MVP aceptable),
- o mediante vistas/agregados si el volumen lo exige.

No se introduce un data warehouse en el MVP.

---

## 9. Seguridad y acceso

### Premisas

- El panel es **interno**.
- Solo usuarios autorizados del equipo WhatXia.
- No hay acceso público anónimo.

### Controles mínimos esperados

- Autenticación obligatoria.
- Sesión protegida.
- Principio de mínimo privilegio (aunque el MVP pueda iniciar con un rol único “operador interno”).
- No exposición de secretos del bot (tokens WhatsApp, webhooks) en el panel.

### Datos sensibles

El panel puede mostrar teléfonos o identificadores operativos.  
Debe tratarse como herramienta interna con cuidado de privacidad, sin construir un módulo de compliance en el MVP.

---

## 10. Disponibilidad y operación

### Objetivos de arquitectura operativa (MVP)

- El panel puede degradarse sin tumbar el bot.
- Una caída del panel **no** debe detener la operación de WhatsApp.
- Una caída del bot **sí** impacta la operación; el panel debe poder mostrar esa anomalía cuando haya señales.

### Desacoplamiento de fallos

El bot y el panel fallan de forma independiente.  
Esa independencia es un requisito de diseño, no un detalle de implementación.

---

## 11. Stack de referencia (no prescriptivo de código)

Alineado al ecosistema WhatXia ya existente:

| Capa | Tecnología de referencia |
|---|---|
| Aplicación web | Next.js |
| UI | React |
| Datos | Supabase (PostgreSQL + servicios asociados) |
| Auth interna | Supabase Auth u equivalente interno acordado |
| Hosting | A definir (independiente del bot) |

Este documento no fija librerías de gráficos, componentes ni estructura de carpetas.

---

## 12. Decisiones arquitectónicas (ADRs ligeros)

### ADR-001 — Proyecto independiente del bot

**Decisión:** Repositorio y despliegue separados.  
**Motivo:** Evitar acoplamiento, proteger el perímetro del bot y permitir evolucionar el panel sin riesgo conversacional.  
**Consecuencia:** Hay que gestionar contrato de datos y entornos con disciplina.

### ADR-002 — Panel orientado a lectura en el MVP

**Decisión:** Priorizar consultas y visualización; limitar escritura.  
**Motivo:** Reducir alcance, riesgo y complejidad.  
**Consecuencia:** Acciones administrativas avanzadas quedan fuera.

### ADR-003 — Supabase como fuente operativa compartida

**Decisión:** Leer del mismo dominio de datos del bot (o vistas derivadas).  
**Motivo:** Una sola verdad operativa.  
**Consecuencia:** Cambios de esquema del bot pueden impactar el panel; requiere gobernanza mínima de dominio.

### ADR-004 — Sin CRM/ERP en la arquitectura

**Decisión:** No modelar módulos comerciales ni financieros.  
**Motivo:** Enfoque del MVP en operación de movilidad.  
**Consecuencia:** Entidades y pantallas se limitan a operación, métricas y monitoreo.

### ADR-005 — Observabilidad de plataforma pragmática

**Decisión:** Monitoreo básico con señales disponibles; no construir stack APM completo en MVP.  
**Motivo:** Entregar valor operativo rápido.  
**Consecuencia:** Salud de plataforma será “buena suficiente”, no exhaustiva.

---

## 13. Riesgos arquitectónicos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Acoplar panel al bot en el mismo deploy | Fallos cruzados | Mantener independencia |
| Consultas pesadas sobre tablas operativas | Lentitud del panel / carga DB | Vistas, índices, agregados, límites de rango |
| Ambigüedad de estados | Métricas incorrectas | Diccionario de estados compartido |
| Scope creep a CRM/ERP | Retraso del MVP | Revisión de rechazo de features |
| Exceso de escritura desde el panel | Doble orquestación | Política “lectura primero” |

---

## 14. Criterios de aceptación arquitectónicos (MVP)

- El panel puede desplegarse sin modificar el runtime del bot.
- Una falla del panel no interrumpe WhatsApp.
- Las pantallas principales se alimentan de datos operativos reales (o contrato de datos definido).
- Existe separación clara entre dominio conversacional y dominio de observación.
- No se introducen módulos de CRM/ERP en el diseño.

---

## 15. Fuera de alcance técnico (por ahora)

- Event-sourcing completo
- Multi-tenant avanzado
- Réplica analítica / warehouse
- Motor de reglas de despacho en el panel
- Integraciones externas de BI como dependencia del MVP
- Apps nativas

---

## 16. Relación con otros documentos

| Documento | Relación |
|---|---|
| `01-visión-del-producto.md` | Define el “para qué” |
| `03-módulos-mvp.md` | Traduce arquitectura a módulos de producto |
| `04-modelo-de-datos.md` | Detalla entidades y lecturas |
| `05-pantallas.md` | Mapea arquitectura a UX |
| `06-roadmap.md` | Secuencia la construcción |
