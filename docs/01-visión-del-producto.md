# 01 — Visión del producto

**Producto:** WhatXia Operations Panel  
**Dominio:** WhatXia Mobility MVP  
**Tipo de documento:** Visión de producto (Product Vision)  
**Audiencia:** Fundadores, producto, ingeniería, operaciones  
**Estado:** Borrador inicial

---

## 1. Resumen ejecutivo

WhatXia Operations Panel es una herramienta de operación diseñada exclusivamente para monitorear y visualizar el estado de la plataforma WhatXia Mobility en su fase MVP.

El panel **no es** el producto conversacional.  
El panel **no reemplaza** al bot de WhatsApp.  
El panel **no es** un CRM ni un ERP.

Su propósito es dar a operaciones y producto una vista clara, confiable y en tiempo casi real de:

- el estado de la operación,
- las métricas clave del MVP,
- los conductores,
- los servicios,
- la salud operativa de la plataforma.

---

## 2. Contexto del ecosistema WhatXia

WhatXia Mobility ya cuenta con un bot conversacional operativo, construido con:

- Next.js
- Supabase
- WhatsApp Cloud API

Ese bot es el canal de interacción con usuarios (pasajeros y, en su caso, conductores).  
El Operations Panel es un proyecto **independiente** que consume y presenta información de la operación para el equipo interno.

### Separación de responsabilidades

| Sistema | Rol |
|---|---|
| Bot conversacional | Interacción con usuarios vía WhatsApp; captura y orquesta solicitudes |
| Operations Panel | Visibilidad operativa interna; monitoreo y lectura del estado del MVP |
| Supabase / datos compartidos | Fuente de verdad de entidades operativas (servicios, conductores, estados) |

El panel debe respetar el perímetro del bot: no asume lógica conversacional, no gestiona plantillas de WhatsApp y no sustituye flujos de mensajería.

---

## 3. Problema que resolvemos

En la etapa actual, la operación de WhatXia Mobility depende de conocimiento fragmentado: conversaciones, consultas ad hoc a base de datos y seguimiento manual.

Eso genera fricción:

- dificultad para saber cuántos servicios hay en curso,
- poca visibilidad del estado de conductores,
- métricas del MVP poco accesibles,
- riesgo de reaccionar tarde ante fallos o cuellos de botella,
- dependencia de personas técnicas para responder preguntas operativas simples.

El Operations Panel existe para convertir la operación en algo **observable**.

---

## 4. Visión

> Que cualquier persona del equipo WhatXia pueda abrir el panel y, en menos de un minuto, entender cómo está la operación de movilidad en este momento.

La visión del MVP no es “administrar todo”.  
La visión del MVP es **ver con claridad**.

---

## 5. Objetivos del producto (MVP)

### Objetivos primarios

1. **Mostrar el estado de la operación** en una vista consolidada.
2. **Visualizar métricas** relevantes para el MVP de movilidad.
3. **Visualizar conductores** y su estado operativo.
4. **Visualizar servicios** y su ciclo de vida básico.
5. **Monitorear la plataforma** a nivel de salud y señales operativas.

### Objetivos explícitamente fuera de alcance

- Construir un CRM de clientes.
- Construir un ERP financiero o de backoffice.
- Gestión administrativa avanzada (roles complejos, facturación, nómina, flota completa, etc.).
- Sustituir o reescribir el bot conversacional.
- Automatizar despacho avanzado o pricing dinámico en este panel.

---

## 6. Usuarios objetivo

### Primarios

- **Operaciones / founder-operator:** necesita saber si la operación está sana y dónde hay fricción.
- **Producto:** necesita observar uso real del MVP para priorizar.
- **Ingeniería (on-call ligero):** necesita señales de salud y contexto cuando algo falla.

### Secundarios (futuro, no MVP)

- Supervisores de flota
- Partners / operadores locales

En el MVP, el panel asume un equipo pequeño con acceso controlado.

---

## 7. Propuesta de valor

Para el equipo WhatXia, el Operations Panel ofrece:

- **Claridad operativa** sin depender de consultas técnicas.
- **Una sola fuente visual** del estado del MVP.
- **Detección temprana** de problemas (servicios atascados, conductores inactivos, caídas de señales).
- **Base de decisión** para iterar producto y operación con datos, no intuición.

---

## 8. Principios de producto

1. **Solo lectura primero.** El MVP prioriza visualización y monitoreo sobre acciones administrativas.
2. **Independencia del bot.** El panel no acopla su UX a la conversación de WhatsApp.
3. **Perímetro estrecho.** Cada módulo debe justificar su existencia para operar el MVP.
4. **Datos accionables, no dashboards decorativos.** Cada métrica debe responder una pregunta operativa.
5. **Simplicidad operacional.** Preferir pocas pantallas claras a muchos módulos incompletos.
6. **No CRM / No ERP.** Si una función suena a gestión comercial o administrativa avanzada, queda fuera.

---

## 9. Definición de éxito del MVP

El MVP se considerará exitoso cuando el equipo pueda, de forma cotidiana:

- responder “¿cómo está la operación ahora?” sin mirar el bot ni la base de datos,
- ver volumen y estado de servicios del día,
- ver disponibilidad y estado de conductores,
- identificar anomalías básicas (servicios estancados, errores de plataforma),
- usar el panel como referencia en revisiones diarias o semanales del MVP.

### Indicadores cualitativos

- El panel se abre en la ritual diaria de operación.
- Deja de ser necesario preguntar “¿cuántos servicios hay activos?” por chat interno.
- Producto e ingeniería comparten el mismo lenguaje de estado (servicios, conductores, salud).

---

## 10. No-objetivos (anti-visión)

WhatXia Operations Panel **no** pretende ser:

- un centro de atención al cliente,
- un sistema de gestión de leads o embudo comercial,
- un backoffice contable,
- un panel de marketing,
- una app para conductores o pasajeros,
- un reemplazo del canal WhatsApp.

---

## 11. Relación con WhatXia Mobility MVP

WhatXia Mobility MVP valida la propuesta de movilidad a través del bot.  
El Operations Panel es la capa de **observabilidad operativa** de esa misma validación.

Sin panel, el MVP puede funcionar.  
Con panel, el MVP se puede operar, medir y decidir con mucho menos fricción.

---

## 12. Declaración de producto (elevator pitch)

**WhatXia Operations Panel** es el tablero operativo del MVP de movilidad de WhatXia: una herramienta interna, independiente del bot, enfocada en mostrar el estado de la operación, métricas, conductores, servicios y salud de plataforma — sin convertirse en CRM ni ERP.

---

## 13. Próximos documentos

| Documento | Contenido |
|---|---|
| `02-arquitectura.md` | Límites del sistema, stack y relación con bot/Supabase |
| `03-módulos-mvp.md` | Módulos incluidos y excluidos del MVP |
| `04-modelo-de-datos.md` | Entidades y lecturas necesarias |
| `05-pantallas.md` | Inventario de pantallas del MVP |
| `06-roadmap.md` | Fases y priorización |
