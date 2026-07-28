# 07 — Modelo Operativo del Panel

**Producto:** WhatXia Operations Panel  
**Tipo de documento:** Modelo operativo (responsabilidades, roles y catálogo de acciones)  
**Audiencia:** Operaciones, producto, CTO, ingeniería  
**Estado:** Borrador actualizado  
**Alcance:** Define cómo se opera WhatXia Mobility usando el Panel y el Bot, sin modificar la arquitectura existente ni introducir implementación.

---

## 1. Propósito

Este documento establece el **Modelo Operativo** del Panel de Operación de WhatXia:

1. qué es responsabilidad del **Panel**,
2. qué es responsabilidad del **Bot**,
3. qué puede **hacer** un operador desde el panel,
4. qué es **solo consulta**,
5. qué queda **prohibido** o fuera de perímetro.

### Principio rector

> **El Panel no conversa con pasajeros ni conductores, pero sí administra la operación del Bot.**  
> El Bot conversa.  
> El Panel opera y supervisa.

Implicaciones:

- El Panel **nunca** es canal de mensajería con usuarios finales.
- El Panel **sí** es la consola interna para supervisar y administrar la operación del Bot (estado, errores, cola de eventos, controles operativos autorizados).
- Separar “conversar” de “operar/supervisar” evita confundir inbox de WhatsApp con panel de operación.

---

## 2. Definiciones

| Término | Definición |
|---|---|
| **Operador** | Persona interna de WhatXia autorizada a usar el Panel |
| **Consulta** | Acción que lee, filtra, navega o refresca información sin mutar el dominio ni los controles del Bot |
| **Ejecución operativa** | Acción autorizada que cambia un control o estado operativo del Bot / de la operación (sin conversar con usuarios) |
| **Dominio de movilidad** | Servicios, conductores, estados y eventos de la operación |
| **Operación del Bot** | Capacidad del Bot de recibir, procesar y avanzar la operación (estado, errores, cola, recepción de nuevos servicios) |
| **Cola de eventos** | Cola o registro consultable de eventos operativos/técnicos asociados al Bot y a la operación |
| **Recepción de nuevos servicios** | Capacidad de aceptar nuevas solicitudes de servicio en el sistema |
| **Canal conversacional** | WhatsApp; el Bot habla con usuarios por este canal |
| **Fuente de verdad operativa** | Datos operativos compartidos (Supabase / dominio del bot) |

### Clasificación de acciones en este documento

| Clase | Significado |
|---|---|
| **C — Solo consulta** | Permitida en MVP; lectura, filtro, navegación, monitoreo |
| **E — Ejecución operativa autorizada** | Permitida en MVP si está expresamente autorizada; administra la operación del Bot sin conversar |
| **X — Prohibida en panel** | No se ofrece en el Panel (conversación con usuarios, CRM/ERP, admin ajena al perímetro) |
| **F — Futuro condicionado** | No MVP; solo si hay evidencia de dolor operativo real |

---

## 3. Separación de responsabilidades

### 3.1 Fórmula de separación

| Sistema | Verbo | Perímetro |
|---|---|---|
| **Bot** | **Conversar** | Habla con pasajeros y conductores; captura y avanza flujos por WhatsApp |
| **Panel** | **Operar y supervisar** | Monitorea el Bot, consulta errores y cola de eventos, aplica controles operativos autorizados, visualiza la operación |

El Panel no reemplaza al Bot como canal.  
El Panel sí administra la **operación** del Bot.

### 3.2 Matriz Panel vs Bot

| Ámbito | Bot | Panel |
|---|---|---|
| Conversar con pasajeros | **Responsable** | Prohibido |
| Conversar con conductores vía WhatsApp | **Responsable** | Prohibido |
| Orquestación de diálogos / plantillas / inbox | **Responsable** | Prohibido |
| Envío de mensajes WhatsApp | **Responsable** | Prohibido |
| Captura conversacional de solicitudes | **Responsable** | No conversa; puede supervisar el resultado |
| Crear/avanzar servicios por flujo de usuario | **Responsable** | No conversa; puede supervisar y aplicar controles operativos autorizados |
| **Estado del Bot** (salud / modo operativo) | Emite señales / ejecuta runtime | **Responsable de monitorear y presentar** |
| **Errores del Bot** | Los produce / registra | **Responsable de consultar y supervisar** |
| **Cola de eventos** | Genera / procesa eventos | **Responsable de consultar** en el MVP |
| **Pausar / reanudar recepción de nuevos servicios** | Respeta el control en runtime (si existe) | **Responsable de ejecutar el control** (si la capacidad existe) |
| **Acciones operativas autorizadas** | Aplica efectos en dominio/runtime según contrato | **Responsable de dispararlas** desde la consola interna |
| Visualización de servicios, conductores y métricas | No es su foco | **Responsable** |
| Autenticación de usuarios finales WhatsApp | **Responsable** | No participa |
| Autenticación de operadores internos | No participa | **Responsable** |
| CRM / ERP / admin avanzada ajena a operación | Fuera de ambos | Fuera de ambos |

### 3.3 Responsabilidades del Bot (exclusivas de conversación y ejecución en canal)

El Bot es el sistema de **conversación y ejecución en el canal** de WhatXia Mobility.

Es responsable de:

1. Recibir y entender mensajes de WhatsApp.
2. Guiar al pasajero (y conductor, si aplica) en el flujo conversacional.
3. Crear y avanzar servicios según la interacción en el canal y las reglas del producto.
4. Notificar por WhatsApp cambios relevantes al usuario.
5. Mantener continuidad de conversación y contexto de sesión.
6. Ser el único punto de contacto conversacional con WhatsApp Cloud API.
7. Respetar controles operativos definidos por el Panel (por ejemplo, no aceptar nuevos servicios si la recepción está pausada), cuando esa capacidad exista.

El Bot **no** es responsable de:

- ser la consola de supervisión del equipo WhatXia,
- ofrecer el dashboard interno de métricas y monitoreo,
- reemplazar el ritual operativo del Panel.

### 3.4 Responsabilidades del Panel (operación y supervisión)

El Panel es el sistema de **operación y supervisión interna** del MVP.

Es responsable de:

1. Mostrar el estado actual de la operación (servicios, conductores, métricas).
2. **Monitorear el estado del Bot.**
3. **Consultar y visualizar errores** del Bot / de la operación.
4. **Consultar la cola de eventos.**
5. **Pausar o reanudar la recepción de nuevos servicios**, si esa capacidad existe en la plataforma.
6. **Ejecutar acciones operativas autorizadas** (catálogo E-*), sin conversar con usuarios.
7. Señalar anomalías (servicios estancados, falta de frescura, degradación).
8. Controlar el acceso de operadores internos.

El Panel **no** es responsable de:

- hablar con pasajeros o conductores,
- gestionar inbox, plantillas o hilos de WhatsApp,
- convertirse en CRM, ERP o consola administrativa avanzada ajena a la operación del Bot.

### 3.5 Qué significa “administrar la operación del Bot”

Administrar la operación del Bot **incluye**:

- ver si el Bot está operativo, degradado o detenido en recepción,
- ver errores recientes,
- inspeccionar la cola de eventos,
- aplicar controles de admisión (pausa/reanudación de nuevos servicios, si existe),
- disparar acciones operativas expresamente autorizadas.

Administrar la operación del Bot **no incluye**:

- tomar el lugar del Bot en la conversación,
- escribir mensajes a usuarios,
- editar el guion conversacional como inbox,
- convertir el Panel en herramienta de atención al cliente conversacional.

### 3.6 Contrato compartido de dominio

Ambos sistemas dependen de un **contrato de dominio** compartido:

- mismos significados de estado de servicio y conductor,
- mismos timestamps fuente de verdad,
- misma ventana temporal (“hoy” / timezone),
- mismos criterios de “activo”, “disponible”, “completado”, “cancelado”, “fallido”,
- mismo significado de controles operativos (p. ej. recepción pausada vs activa),
- mismo contrato para estado del Bot, errores y cola de eventos.

Compartir dominio y controles **no** significa compartir la responsabilidad de conversar.

---

## 4. Rol del operador

### 4.1 Misión del operador en el MVP

El operador usa el Panel para:

1. **Supervisar** el estado de la operación y del Bot.
2. **Diagnosticar** con errores, cola de eventos y vistas de servicios/conductores.
3. **Operar** controles autorizados (p. ej. pausar/reanudar recepción de nuevos servicios, si existe).
4. **Ejecutar** solo acciones operativas autorizadas del catálogo E-*.
5. **No** conversar con pasajeros ni conductores desde el Panel.

### 4.2 Lo que el operador NO es (en el Panel)

- No es agente de inbox WhatsApp.
- No es interlocutor de pasajeros/conductores.
- No es administrador financiero ni gestor CRM.
- No es editor libre del dominio sin autorización (solo acciones E-* aprobadas).

---

## 5. Principio de acción del MVP

### Regla

1. **El Bot conversa; el Panel opera y supervisa.**
2. Toda lectura de estado, errores, cola, métricas, servicios y conductores es **consulta autorizada**.
3. Toda mutación requiere estar en el catálogo **E — ejecución operativa autorizada**.
4. Toda interacción conversacional con usuarios es **prohibida en el Panel (X)**.

### Controles y dependencia de capacidad

Algunas ejecuciones (en especial **pausar/reanudar recepción de nuevos servicios**) se autorizan en el modelo operativo **condicional a que la capacidad exista** en la plataforma/Bot.

| Situación | Comportamiento del Panel |
|---|---|
| La capacidad existe | El Panel la expone como acción E autorizada |
| La capacidad no existe aún | El Panel no inventa el control; documenta el vacío y lo trata como pendiente de plataforma |
| La capacidad falla | El Panel muestra error operativo y no simula éxito |

---

## 6. Catálogo de acciones del operador

### 6.1 Acciones de consulta (permitidas — clase C)

Estas acciones **sí** puede ejecutarlas el operador desde el Panel.  
No envían mensajes ni abren conversaciones.

#### Acceso y sesión

| ID | Acción | Efecto |
|---|---|---|
| C-01 | Iniciar sesión | Accede al Panel |
| C-02 | Cerrar sesión | Termina sesión del operador |
| C-03 | Ver sesión expirada / sin permiso | Informa estado de acceso |

#### Estado de la operación

| ID | Acción | Efecto |
|---|---|---|
| C-10 | Ver resumen operativo actual | Consulta |
| C-11 | Ver contadores de servicios | Consulta |
| C-12 | Ver señal de conductores | Consulta |
| C-13 | Ver lista “requiere atención” | Consulta |
| C-14 | Ver frescura de datos | Consulta |
| C-15 | Refrescar datos del home | Relee datos |
| C-16 | Navegar desde un contador al listado filtrado | Consulta |

#### Métricas

| ID | Acción | Efecto |
|---|---|---|
| C-20 | Ver métricas del MVP | Consulta |
| C-21 | Cambiar rango temporal | Consulta |
| C-22 | Ver desglose por estado | Consulta |
| C-23 | Ver definiciones de métricas | Consulta |
| C-24 | Refrescar métricas | Relee datos |

#### Servicios y conductores

| ID | Acción | Efecto |
|---|---|---|
| C-30 | Ver / filtrar / buscar servicios | Consulta |
| C-35 | Abrir detalle de servicio | Consulta |
| C-38 | Ver timeline de un servicio (si existe) | Consulta |
| C-50 | Ver / filtrar / buscar conductores | Consulta |
| C-54 | Abrir detalle de conductor | Consulta |
| C-57 | Navegar entre conductor y servicio | Consulta |

#### Supervisión del Bot (consulta)

| ID | Acción | Efecto |
|---|---|---|
| C-60 | Monitorear estado del Bot (operativo / degradado / no disponible / recepción pausada, etc.) | Consulta de supervisión |
| C-61 | Ver errores del Bot / de la operación | Consulta de supervisión |
| C-62 | Consultar la cola de eventos | Consulta de supervisión |
| C-63 | Filtrar cola de eventos (tipo, severidad, tiempo, correlacionar con servicio) | Consulta |
| C-64 | Ver frescura de procesamiento / última actividad del Bot | Consulta |
| C-65 | Distinguir “sin demanda” vs “Bot degradado / con errores / recepción pausada” | Consulta |
| C-66 | Refrescar vista de estado del Bot, errores y cola | Relee datos |

#### Navegación general

| ID | Acción | Efecto |
|---|---|---|
| C-70 | Navegar entre módulos del Panel | Consulta |
| C-71 | Volver de un detalle al listado | Consulta |

---

### 6.2 Acciones de ejecución operativa autorizadas (clase E)

Mutaciones o controles que el operador **puede ejecutar desde el Panel** en el MVP, porque administran la operación del Bot **sin conversar** con usuarios.

| ID | Acción | Condición | Efecto esperado |
|---|---|---|---|
| E-01 | Iniciar sesión de operador | Siempre (MVP) | Acceso al Panel |
| E-02 | Cerrar sesión de operador | Siempre (MVP) | Cierre de acceso |
| E-03 | Refrescar datos / diagnóstico | Siempre (MVP) | Relectura |
| E-10 | **Pausar recepción de nuevos servicios** | **Solo si la capacidad existe** | El Bot/plataforma deja de admitir nuevas solicitudes; no implica enviar mensajes |
| E-11 | **Reanudar recepción de nuevos servicios** | **Solo si la capacidad existe** | Se restablece la admisión de nuevas solicitudes |
| E-20 | Ejecutar **acción operativa autorizada** del catálogo vigente | Solo acciones explícitamente aprobadas para el MVP | Cambia un control o estado operativo permitido; nunca envía WhatsApp |

#### Reglas de E-20 (acciones operativas autorizadas)

Una acción entra en E-20 solo si cumple todas:

1. Está nombrada y aprobada en el catálogo operativo vigente.
2. No implica conversar con pasajero ni conductor.
3. No abre inbox ni envía WhatsApp.
4. Tiene efecto observable en supervisión (estado, error, cola o dominio).
5. Tiene criterio de autorización (quién puede ejecutarla) y resultado de éxito/error visible en el Panel.

Ejemplos de lo que E-20 **puede** llegar a cubrir (solo si se autorizan uno a uno):

- reintentar procesamiento de un evento fallido de la cola,
- marcar un error como reconocido / en revisión interna,
- aplicar un control operativo de emergencia ya definido por producto.

E-20 **no** es un comodín para editar libremente la operación.

#### Controles de recepción (E-10 / E-11)

- Pausar recepción **no** cierra conversaciones existentes por sí solo (salvo que el contrato de plataforma lo defina explícitamente).
- Pausar recepción **no** autoriza al Panel a mensajear usuarios.
- El Panel debe mostrar con claridad si la recepción está activa o pausada.
- Si la capacidad no existe, no se muestra como disponible o se muestra como “no soportada”.

---

### 6.3 Acciones prohibidas en el Panel (clase X)

#### Conversación y canal (línea roja)

| ID | Acción | Responsable |
|---|---|---|
| X-20 | Enviar mensaje WhatsApp a pasajero | Bot |
| X-21 | Enviar mensaje WhatsApp a conductor | Bot |
| X-22 | Abrir o gestionar inbox de conversaciones | Bot |
| X-23 | Editar plantillas / guiones conversacionales como atención | Bot / proceso de producto del canal |
| X-24 | Impersonar al Bot en un chat con usuario | Prohibido |
| X-25 | Tomar el control de una conversación activa desde el Panel | Prohibido |

#### Fuera de perímetro operativo del Panel

| ID | Acción | Motivo |
|---|---|---|
| X-01 | Crear servicio “como si fuera el pasajero” desde el Panel | El alta conversacional es del Bot |
| X-14 | Gestionar documentos KYC / onboarding completo | Admin avanzada — fuera |
| X-15 | Gestionar pagos / liquidaciones | ERP — fuera |
| X-30 | Gestionar clientes como CRM | Fuera de visión |
| X-31 | Helpdesk / tickets conversacionales | Fuera de MVP |
| X-32 | Facturar / cobrar / conciliar | ERP — fuera |
| X-33 | Configurar tarifas dinámicas | Admin avanzada — fuera |
| X-35 | Matriz compleja de roles enterprise | Fuera de MVP |
| X-36 | Impersonar usuarios finales | Prohibido |

#### Acciones de dominio no autorizadas (no están en E-*)

Si una mutación de servicio/conductor **no** está en el catálogo E autorizado, está prohibida en el Panel aunque sea “operativa” en sentido amplio.

| ID | Acción | Estado |
|---|---|---|
| X-02 | Cambiar estado de servicio sin autorización E | Prohibida |
| X-03 | Asignar / reasignar conductor sin autorización E | Prohibida |
| X-05 | Cancelar servicio sin autorización E | Prohibida |
| X-12 | Forzar estado de conductor sin autorización E | Prohibida |

> Matiz importante: el Panel **sí administra la operación del Bot**; eso no equivale a edición libre del dominio ni a conversar con usuarios.

---

### 6.4 Acciones futuras condicionadas (clase F — no MVP)

| ID | Acción candidata | Condición | Riesgo |
|---|---|---|---|
| F-01 | Nota interna no visible al usuario | Coordinación entre turnos | Medio (no CRM) |
| F-02 | Reasignar conductor con auditoría | Dolor real + proceso claro | Alto |
| F-03 | Cancelación operativa con motivo | Procedimiento y ownership | Alto |
| F-04 | Alertas proactivas (Slack/email) por errores o estancados | Reacción tardía solo con monitoreo manual | Medio |
| F-05 | Reprocesamiento masivo de cola | Incidentes recurrentes de cola | Alto |

Regla: ninguna acción F se asume aprobada por estar listada.

---

## 7. Matriz resumida de decisión operativa

```
¿Hay que hablar con pasajero o conductor?
    → Bot (WhatsApp). Prohibido en Panel (X-20..X-25).

¿Hay que supervisar estado del Bot, ver errores o consultar la cola de eventos?
    → Panel (consulta C-60..C-66).

¿Hay que pausar o reanudar la recepción de nuevos servicios?
    → Panel (E-10 / E-11), solo si la capacidad existe.

¿Hay que ejecutar una acción operativa ya autorizada en el catálogo E?
    → Panel (E-20 u otra E-* aprobada).

¿La acción implica CRM, ERP, inbox o admin avanzada?
    → Fuera de perímetro.

¿La acción muta dominio pero no está en E-*?
    → Prohibida en Panel hasta autorización explícita.
```

---

## 8. Modelo de colaboración Bot ↔ Panel en incidentes

### Ejemplo A — Errores del Bot / cola saturada

1. **Panel (C-60 / C-61 / C-62):** el operador ve estado degradado, errores y cola de eventos.
2. **Panel (E-10, si existe):** puede pausar recepción de nuevos servicios para contener el incidente.
3. **Panel (E-20, si está autorizado):** ejecuta acción operativa permitida (p. ej. reintento de evento).
4. **Bot:** sigue siendo quien conversaría con usuarios; el Panel no envía mensajes.
5. **Panel (E-11, si existe):** reanuda recepción cuando la operación está contenida.

### Ejemplo B — Servicio estancado

1. **Panel:** detecta el servicio en “requiere atención” y revisa detalle + eventos correlacionados.
2. **Panel:** ejecuta solo acciones E autorizadas relacionadas (si las hay).
3. Si hace falta hablar con el usuario → **Bot / canal**, no Panel.
4. **Panel:** refresca y verifica normalización.

### Ejemplo C — Pico de demanda sin capacidad

1. **Panel:** métricas y home muestran pendientes altos / conductores insuficientes.
2. **Panel (E-10, si existe):** pausa recepción de nuevos servicios como control operativo.
3. El Bot respeta el control y no admite nuevas solicitudes según contrato.
4. El Panel no mensaja a usuarios para explicar la pausa (salvo que un proceso externo/Bot lo haga por su lado).

---

## 9. Límites de autoridad del operador en el Panel

| Puede | No puede |
|---|---|
| Supervisar estado del Bot | Conversar con pasajeros o conductores |
| Ver errores y cola de eventos | Gestionar inbox / plantillas WhatsApp |
| Pausar/reanudar recepción de nuevos servicios (si existe) | Inventar controles que la plataforma no soporta |
| Ejecutar acciones operativas autorizadas (E-*) | Mutar dominio fuera del catálogo E |
| Ver servicios, conductores y métricas | Convertir el Panel en CRM/ERP |
| Administrar la **operación** del Bot | Reemplazar al Bot como canal conversacional |

---

## 10. Relación con el resto de la documentación

Este documento actualiza el modelo operativo del Panel en la dimensión de **autoridad de supervisión y control operativo del Bot**.

- Mantiene la separación: **Bot conversa; Panel opera y supervisa**.
- No modifica los demás documentos (`01`–`06`) ni la arquitectura existente.
- Si hubiera tensión con formulaciones previas de “solo lectura absoluta”, **prevalece este documento (07)** para responsabilidades y acciones del operador.

---

## 11. Criterios de aceptación del Modelo Operativo

El modelo se considera adoptado cuando:

1. El equipo distingue sin ambigüedad: Bot = conversación; Panel = operación y supervisión.
2. Queda explícito que el Panel **no conversa**, pero **sí administra la operación del Bot**.
3. El MVP contempla consulta de: estado del Bot, errores y cola de eventos.
4. El MVP contempla pausa/reanudación de recepción de nuevos servicios **si la capacidad existe**.
5. Toda ejecución está en el catálogo E; lo demás es consulta (C) o prohibición (X).
6. Ninguna pantalla del Panel envía WhatsApp ni abre inbox.

---

## 12. Checklist de guardrail (uso diario)

Antes de pedir o usar una capacidad del Panel:

- [ ] ¿Implica hablar con un usuario? → Bot (rechazar en Panel)
- [ ] ¿Es monitorear estado del Bot, errores o cola? → Panel (consulta)
- [ ] ¿Es pausar/reanudar recepción de nuevos servicios? → Panel, si existe la capacidad
- [ ] ¿Es una acción operativa autorizada (E-*)? → Panel
- [ ] ¿Suena a CRM/ERP/inbox? → Rechazar
- [ ] ¿Mutación no listada en E-*? → Prohibida hasta autorización explícita

---

## 13. Resumen ejecutivo

| Sistema | Verbo operativo |
|---|---|
| **Bot** | Conversar con pasajeros y conductores; ejecutar el canal |
| **Panel** | Operar y supervisar la operación del Bot; visualizar la operación |

| Principio | Enunciado |
|---|---|
| Línea roja | El Panel no conversa con pasajeros ni conductores |
| Autoridad | El Panel sí administra la operación del Bot |
| MVP supervisión | Estado del Bot, errores, cola de eventos |
| MVP control | Pausar/reanudar recepción de nuevos servicios (si existe) |
| MVP ejecución | Acciones operativas autorizadas (catálogo E) |

| Tipo de acción | Estado en MVP |
|---|---|
| Consulta (C-*), incl. Bot/errores/cola | **Autorizada** |
| Ejecución operativa (E-10, E-11, E-20, sesión/refresco) | **Autorizada con condiciones** |
| Conversación / inbox / WhatsApp (X-20..) | **Prohibida** |
| CRM / ERP / admin avanzada | **Prohibida** |
| Futuro (F-*) | **No comprometido** |

El operador del Panel es un **supervisor-operador de la plataforma**: diagnostica y controla la operación del Bot; no es agente conversacional.
