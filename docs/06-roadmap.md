# 06 — Roadmap

**Producto:** WhatXia Operations Panel  
**Tipo de documento:** Roadmap de producto (MVP y siguientes)  
**Audiencia:** Fundadores, producto, ingeniería, operaciones  
**Estado:** Borrador inicial  
**Horizonte:** MVP primero; post-MVP condicionado a uso real

---

## 1. Propósito

Secuenciar la construcción del Operations Panel para entregar valor operativo temprano, proteger el perímetro del bot y evitar la deriva hacia CRM/ERP.

---

## 2. Norte del roadmap

> Primero ver la operación.  
> Después medirla con confianza.  
> Solo más tarde, si hace falta, actuar desde el panel.

El roadmap privilegia observación sobre administración.

---

## 3. Fases

| Fase | Nombre | Objetivo | Resultado esperado |
|---|---|---|---|
| 0 | Fundaciones | Alinear dominio, acceso y contrato de datos | Equipo desbloqueado para construir |
| 1 | Operación visible | Ver el ahora | Home + servicios usables |
| 2 | Fuerza operativa | Ver conductores y métricas | Decisiones diarias con datos |
| 3 | Monitoreo mínimo | Detectar degradación básica | Confianza técnica operativa |
| 4 | Endurecimiento MVP | Calidad, definiciones, ritual de uso | MVP “listo para operar” |
| 5+ | Post-MVP | Solo lo validado por uso | Expansión controlada |

---

## 4. Fase 0 — Fundaciones

### Objetivo

Dejar listo el terreno sin implementar funcionalidades de producto todavía (más allá de esqueleto si aplica).

### Entregables de producto/arquitectura

- Visión y perímetro aprobados (docs 01–06).
- Diccionario de estados de `Service` y `Driver` alineado con el bot.
- Contrato de datos de lectura (tablas/vistas a consumir).
- Definición de timezone y ventana “hoy”.
- Criterio de usuarios internos autorizados.
- Lista explícita de no-alcance (CRM/ERP/admin avanzado).

### Criterio de salida

Ingeniería puede construir pantallas sin ambigüedad grave de dominio.

---

## 5. Fase 1 — Operación visible (P0)

### Objetivo

Que el equipo abra el panel y entienda el estado actual de la operación.

### Alcance

- Acceso interno (login/sesión).
- Pantalla Home: Estado de la operación.
- Listado de servicios.
- Detalle de servicio (solo lectura).
- Estados vacíos/error básicos.
- Frescura de datos visible.

### Fuera de esta fase

- Métricas avanzadas.
- Detalle rico de conductor (puede haber solo nombre en servicio).
- Acciones de escritura.
- Monitoreo sofisticado.

### Criterio de salida

En una revisión diaria, el equipo puede responder:

- ¿hay servicios activos?
- ¿hay pendientes?
- ¿qué servicio requiere atención?

sin consultar Supabase manualmente.

---

## 6. Fase 2 — Fuerza operativa y métricas

### Objetivo

Completar la foto: conductores + métricas del MVP.

### Alcance

- Listado de conductores.
- Detalle básico de conductor.
- Pantalla de métricas con rangos simples.
- Definiciones publicadas junto a cada KPI.
- Enlaces desde contadores/home hacia listados filtrados (si es viable).

### Criterio de salida

Producto y operaciones pueden discutir el MVP con números compartidos:

- volumen,
- completados vs cancelados/fallidos,
- disponibilidad de conductores.

---

## 7. Fase 3 — Monitoreo mínimo de plataforma

### Objetivo

Separar “no hay demanda” de “la plataforma está fallando / no veo datos”.

### Alcance

- Pantalla o bloque de salud de plataforma.
- Señales mínimas: frescura, error de lectura, última actividad.
- Estados: operativo / degradado / desconocido.

### Criterio de salida

Ante una sospecha de falla, el panel ayuda a clasificar el problema en minutos.

---

## 8. Fase 4 — Endurecimiento del MVP

### Objetivo

Convertir el panel en herramienta confiable de ritual operativo.

### Alcance

- Revisión de consistencia de métricas vs listados.
- Manejo robusto de inconsistencias de datos.
- Performance aceptable en ventanas típicas.
- Ajustes de UX por uso real del equipo.
- Checklist de aceptación del MVP completado.
- Decisión go/no-go de “MVP operativo”.

### Criterio de salida

El panel se usa de forma sostenida (diaria o en cada revisión de operación) y el equipo confía en lo que muestra.

---

## 9. Definición de “MVP terminado”

El MVP del Operations Panel se considera terminado cuando existen, en producción interna:

1. Login interno.
2. Home de estado operativo.
3. Servicios (listado + detalle lectura).
4. Conductores (listado + detalle básico).
5. Métricas mínimas con definiciones.
6. Señales básicas de salud/frescura.
7. Perímetro respetado: sin CRM, sin ERP, sin admin avanzado, sin reemplazo del bot.

No se exige perfección visual ni observabilidad enterprise.

---

## 10. Post-MVP (Fase 5+) — candidatos, no compromisos

Solo se priorizan si el MVP se usa y aparece dolor real.

### Candidatos de alto valor potencial

| Candidato | Condición para considerarlo |
|---|---|
| Alertas proactivas (servicios estancados) | El equipo reacciona tarde con solo mirar el home |
| Vista mapa | La operación lo necesita y hay datos geo confiables |
| Acciones operativas mínimas controladas | La lectura ya no basta y hay proceso claro |
| Vistas por zona/ciudad | Hay expansión geográfica real |
| Más métricas de tiempo (asignación, completado) | Los timestamps y definiciones son sólidos |
| Roles internos simples (ops vs read-only) | Crece el número de usuarios internos |

### Candidatos a rechazar por defecto

- CRM de clientes
- ERP financiero
- Inbox WhatsApp dentro del panel
- Onboarding documental completo de conductores
- Motor de pricing/dispatch avanzado en el panel
- Reescritura del bot dentro de este proyecto

---

## 11. Priorización (método)

Para cualquier nueva idea post-documentación:

1. ¿Ayuda a **ver** o **monitorear** la operación del MVP?
2. ¿Se puede resolver sin tocar el bot?
3. ¿Introduce escritura/admin compleja?
4. ¿Suena a CRM/ERP?
5. ¿Hay evidencia de uso/dolor real?

Si falla 1 o responde “sí” a 3/4 sin evidencia, se descarta o se aplaza.

---

## 12. Dependencias críticas

| Dependencia | Impacto si falta |
|---|---|
| Diccionario de estados alineado con bot | Métricas y pantallas engañosas |
| Acceso de lectura a datos operativos | Panel vacío o mock permanente |
| Timezone y reglas de “hoy” | Contadores contradictorios |
| Usuarios internos definidos | Bloqueo de adopción |
| Independencia de deploy del bot | Riesgo operacional cruzado |

---

## 13. Riesgos de roadmap

| Riesgo | Señal temprana | Respuesta |
|---|---|---|
| Scope creep a backoffice | Pedidos de “editar todo” | Reanclar a visión y no-alcance |
| Métricas sin definición | Debates eternos sobre números | Congelar diccionario antes de pulir UI |
| Acoplar al bot | PRs cruzadas / deploy conjunto | Mantener frontera de repos |
| Construir sin usuarios | Nadie abre el panel | Ritual de uso desde Fase 1 |
| Over-engineering de monitoreo | Stack APM prematuro | Señales mínimas primero |

---

## 14. Rituales de producto recomendados

- **Daily ops (5–10 min):** abrir Home, revisar “requiere atención”.
- **Weekly MVP review:** métricas + servicios + conductores.
- **Scope guard:** cualquier feature nueva se contrasta con docs 01 y 03 antes de estimarse.

---

## 15. Cronograma relativo (sin fechas absolutas)

Las duraciones son relativas y dependen del tamaño del equipo:

| Fase | Secuencia |
|---|---|
| Fase 0 | Primero |
| Fase 1 | Inmediatamente después |
| Fase 2 | Tras home/servicios usables |
| Fase 3 | En paralelo tardío de Fase 2 o justo después |
| Fase 4 | Cierre del MVP |
| Fase 5+ | Solo con evidencia de uso |

Se recomienda **no** fechar el post-MVP hasta completar Fase 4.

---

## 16. Métricas de adopción del propio panel

Para saber si el roadmap funciona:

- el panel se abre en el ritual diario,
- baja la cantidad de consultas ad hoc a base de datos para preguntas básicas,
- hay acuerdo sobre los números del MVP,
- el bot sigue siendo el canal de usuarios (sin presión para “meter el inbox” en el panel).

---

## 17. Checklist de arranque (inmediato)

- [ ] Aprobar `01-visión-del-producto.md`
- [ ] Aprobar perímetro de `02-arquitectura.md`
- [ ] Congelar módulos de `03-módulos-mvp.md`
- [ ] Validar entidades de `04-modelo-de-datos.md` contra esquema real del bot
- [ ] Confirmar inventario de `05-pantallas.md`
- [ ] Usar este roadmap como orden de construcción
- [ ] Nombrar un owner de producto del panel (puede ser founder/CTO en etapa temprana)
- [ ] Nombrar un owner técnico del contrato de datos con el bot

---

## 18. Conclusión

WhatXia Operations Panel se construye como una herramienta interna de observación del MVP de movilidad:

- independiente del bot,
- centrada en estado, métricas, conductores, servicios y monitoreo,
- deliberadamente ajena a CRM y ERP.

El roadmap existe para proteger ese foco hasta que el panel sea útil de verdad. Solo entonces se discute expandir.
