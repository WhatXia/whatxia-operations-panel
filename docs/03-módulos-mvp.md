# 03 — Módulos del MVP

**Producto:** WhatXia Operations Panel  
**Tipo de documento:** Alcance funcional por módulos  
**Audiencia:** Producto, ingeniería, operaciones  
**Estado:** Borrador inicial

---

## 1. Propósito

Definir qué módulos componen el MVP del Operations Panel, qué problema resuelve cada uno, qué queda dentro y qué queda explícitamente fuera.

El principio de corte es:

> Si no ayuda a **ver** o **monitorear** la operación de WhatXia Mobility MVP, no entra.

---

## 2. Mapa de módulos del MVP

| # | Módulo | Prioridad | Tipo |
|---|---|---|---|
| M1 | Estado de la operación | P0 | Core |
| M2 | Métricas | P0 | Core |
| M3 | Conductores | P0 | Core |
| M4 | Servicios | P0 | Core |
| M5 | Monitoreo de plataforma | P1 | Core ligero |
| M6 | Acceso interno | P0 | Transversal |

Ningún módulo de CRM, ERP, atención al cliente avanzada o administración compleja forma parte del MVP.

---

## 3. M1 — Estado de la operación

### Propósito

Responder en una sola vista: **“¿Cómo está la operación ahora?”**

### Capacidades incluidas

- Resumen del día / momento actual.
- Contadores clave: servicios activos, pendientes, completados, cancelados.
- Señal de conductores disponibles vs no disponibles.
- Indicadores de atención (por ejemplo, servicios estancados o sin actualización reciente).
- Timestamp de última actualización de datos.

### Capacidades excluidas

- Edición de la operación.
- Despacho manual avanzado.
- Configuración de reglas de negocio.
- Chat interno o inbox de WhatsApp.

### Preguntas que debe responder

- ¿Hay operación en curso?
- ¿Está sana o hay fricción visible?
- ¿Qué requiere atención ahora?

### Dependencias

- M2 (métricas resumidas)
- M3 (señal de conductores)
- M4 (señal de servicios)
- M5 (señal de salud, si está disponible)

---

## 4. M2 — Métricas

### Propósito

Visualizar las métricas mínimas para operar y evaluar el MVP de movilidad.

### Capacidades incluidas

- Volumen de servicios (hoy / rango simple).
- Distribución por estado.
- Tasa de completados vs cancelados (u equivalentes del dominio).
- Actividad de conductores (activos en periodo).
- Tendencia básica (día actual vs periodo reciente, si es viable sin complejidad).

### Capacidades excluidas

- BI avanzado / cohortes / funnels de marketing.
- Atribución comercial.
- Finanzas (GMV detallado, comisiones, liquidaciones) como módulo propio.
- Exportadores complejos y reportes regulatorios.

### Preguntas que debe responder

- ¿Cuánta demanda estamos moviendo?
- ¿Qué proporción se completa?
- ¿La operación crece, se estanca o se degrada?

### Notas de producto

Cada métrica debe tener:

- nombre claro,
- definición,
- ventana temporal,
- fuente de datos.

Sin definición, la métrica no se publica en el panel.

---

## 5. M3 — Conductores

### Propósito

Visualizar a los conductores relevantes para la operación del MVP y su estado.

### Capacidades incluidas

- Listado de conductores.
- Estado operativo (ej.: disponible, ocupado, offline, inactivo — según diccionario de dominio).
- Datos mínimos de identificación operativa.
- Filtros simples por estado.
- Vista de detalle básica (estado actual, actividad reciente resumida).

### Capacidades excluidas

- Onboarding completo de conductores (KYC, documentos, contratos).
- Gestión de nómina o pagos.
- Scoring avanzado / gamificación.
- Chat con conductores desde el panel.
- Asignación masiva o herramientas de flota tipo ERP.

### Preguntas que debe responder

- ¿Quién está disponible?
- ¿Quién está en servicio?
- ¿Hay conductores inactivos o problemáticos a simple vista?

---

## 6. M4 — Servicios

### Propósito

Visualizar los servicios de movilidad y su ciclo de vida operativo básico.

### Capacidades incluidas

- Listado de servicios recientes / del día.
- Estado del servicio.
- Referencias a conductor y/o usuario según datos disponibles (sin convertirlo en CRM).
- Timestamps clave (creado, asignado, iniciado, completado/cancelado).
- Filtros por estado y rango temporal simple.
- Detalle de servicio de solo lectura.

### Capacidades excluidas

- Reasignación compleja y herramientas de dispatch center.
- Recálculo de tarifas.
- Gestión de disputas / tickets de soporte.
- Historial comercial del cliente.
- Edición libre de campos operativos (salvo acciones mínimas futuras justificadas).

### Preguntas que debe responder

- ¿Qué servicios hay ahora?
- ¿Cuáles están atascados?
- ¿Qué pasó con un servicio concreto?

---

## 7. M5 — Monitoreo de plataforma

### Propósito

Dar señales básicas de que la plataforma está operativa, sin construir un centro de observabilidad enterprise.

### Capacidades incluidas

- Estado general: operativo / degradado / sin datos.
- Señales simples disponibles (por ejemplo: última actividad registrada, errores recientes visibles, frescura de datos).
- Aviso cuando el panel no puede leer la fuente de datos.
- Indicadores mínimos acordados con ingeniería.

### Capacidades excluidas

- APM completo.
- Tracing distribuido.
- Alerting multi-canal sofisticado.
- Gestión de incidentes tipo Statuspage pública.
- Logs crudos como producto para operaciones no técnicas.

### Preguntas que debe responder

- ¿La plataforma parece sana?
- ¿El panel está viendo datos frescos?
- ¿Hay una señal evidente de fallo?

### Criterio de corte

Si una señal no se puede obtener con esfuerzo razonable en el MVP, se documenta como “no disponible” y no se inventa.

---

## 8. M6 — Acceso interno (transversal)

### Propósito

Asegurar que solo el equipo WhatXia use el panel.

### Capacidades incluidas

- Autenticación interna.
- Sesión protegida.
- Acceso denegado a no autenticados.
- Un perfil de usuario interno suficiente para el MVP (rol único aceptable).

### Capacidades excluidas

- Matriz compleja de permisos por módulo.
- SSO corporativo multi-organización (salvo que ya exista y sea trivial).
- Auditoría forense completa.
- Gestión avanzada de usuarios tipo admin console.

---

## 9. Módulos explícitamente fuera del MVP

| Módulo tentador | Por qué no entra |
|---|---|
| CRM de clientes | No es el objetivo; el panel no gestiona relación comercial |
| ERP / finanzas | Fuera de perímetro del MVP operativo |
| Inbox WhatsApp | Pertenece al dominio del bot / soporte, no al panel |
| Marketing / campañas | No es operación de movilidad |
| Admin de tarifas avanzado | Administración compleja |
| Gestión documental de conductores | Onboarding/admin avanzado |
| App de conductor | Producto distinto |
| Multi-ciudad / multi-tenant avanzado | Prematuro para MVP |
| Reportes regulatorios | No bloquea operar el MVP |

Cualquier solicitud que caiga en esta tabla debe rechazarse o moverse a roadmap post-MVP con justificación.

---

## 10. Flujos de valor por módulo

### Flujo diario de operaciones

1. Abrir **Estado de la operación**.
2. Revisar alertas o contadores anormales.
3. Profundizar en **Servicios** o **Conductores** según la señal.
4. Revisar **Métricas** para contexto del día.
5. Verificar **Monitoreo** si hay sospecha de fallo técnico.

### Flujo de producto / revisión de MVP

1. Abrir **Métricas**.
2. Contrastar con listados de **Servicios**.
3. Observar participación de **Conductores**.
4. Decidir siguientes experimentos del MVP.

---

## 11. Criterios de “módulo listo” (Definition of Ready / Done)

Un módulo del MVP está listo cuando:

1. Responde al menos una pregunta operativa real del equipo.
2. Tiene estados de UI para vacío, carga y error.
3. Usa definiciones de dominio documentadas.
4. No introduce escritura administrativa no aprobada.
5. No depende de un módulo fuera de alcance (CRM/ERP).

---

## 12. Prioridad de entrega sugerida

1. Acceso interno + Estado de la operación (esqueleto con datos reales)
2. Servicios
3. Conductores
4. Métricas
5. Monitoreo de plataforma (mínimo viable)

Esta secuencia maximiza utilidad operativa temprana.

---

## 13. Relación con otros documentos

| Documento | Relación |
|---|---|
| `04-modelo-de-datos.md` | Entidades que alimentan cada módulo |
| `05-pantallas.md` | Traducción a pantallas concretas |
| `06-roadmap.md` | Orden temporal de construcción |
