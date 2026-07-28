# 05 — Pantallas

**Producto:** WhatXia Operations Panel  
**Tipo de documento:** Inventario de pantallas del MVP  
**Audiencia:** Producto, diseño, ingeniería  
**Estado:** Borrador inicial  
**Nota:** Especificación funcional de pantallas. No incluye wireframes ni código.

---

## 1. Propósito

Definir las pantallas mínimas del MVP para que el equipo pueda operar WhatXia Mobility con claridad, sin expandirse a CRM, ERP ni administración avanzada.

---

## 2. Principios de UX del panel

1. **Primero el ahora:** la pantalla inicial responde “¿cómo está la operación?”.
2. **Pocas pantallas, bien definidas.**
3. **Solo lectura** como comportamiento por defecto.
4. **Estados honestos:** carga, vacío, error y sin permiso siempre contemplados.
5. **Profundidad con propósito:** del resumen al listado, del listado al detalle.
6. **Lenguaje operativo:** estados y métricas con nombres del dominio WhatXia.
7. **Sin marketing UI:** es una herramienta interna de trabajo.

---

## 3. Mapa de navegación (MVP)

```
[Login]
   │
   ▼
[Estado de la operación]  ← home
   ├── [Métricas]
   ├── [Servicios] → [Detalle de servicio]
   ├── [Conductores] → [Detalle de conductor]
   └── [Salud de plataforma]
```

Navegación lateral o superior simple.  
Sin módulos colapsables infinitos.  
Sin “configuración avanzada” en el MVP.

---

## 4. Inventario de pantallas

| ID | Pantalla | Prioridad | Módulo |
|---|---|---|---|
| P0 | Login | P0 | Acceso interno |
| P1 | Estado de la operación (Home) | P0 | Estado de la operación |
| P2 | Métricas | P0 | Métricas |
| P3 | Servicios (listado) | P0 | Servicios |
| P4 | Detalle de servicio | P0 | Servicios |
| P5 | Conductores (listado) | P0 | Conductores |
| P6 | Detalle de conductor | P1 | Conductores |
| P7 | Salud de plataforma | P1 | Monitoreo |
| P8 | Sin acceso / sesión expirada | P0 | Acceso interno |
| P9 | Estado vacío global / error de datos | P0 | Transversal |

---

## 5. Especificación por pantalla

### P0 — Login

**Objetivo:** Autenticar usuarios internos.

**Contenido:**
- Acceso por credenciales internas (email/password u método acordado).
- Mensaje de error de autenticación.
- Sin registro público.

**Acciones:**
- Iniciar sesión.
- (Opcional MVP) recuperar acceso solo si ya existe el mecanismo; no construir un producto de identity.

**Fuera de alcance:**
- SSO complejo,
- invitación self-serve,
- página de marketing.

---

### P1 — Estado de la operación (Home)

**Objetivo:** Diagnóstico operativo en una mirada.

**Bloques de contenido:**
1. Encabezado con fecha/hora y frescura de datos (“actualizado hace X”).
2. Contadores principales:
   - servicios activos,
   - servicios pendientes de asignación,
   - completados hoy,
   - cancelados/fallidos hoy.
3. Señal de conductores:
   - disponibles,
   - ocupados,
   - offline/inactivos.
4. Lista corta de “requiere atención” (servicios estancados o anomalías).
5. Accesos rápidos a Servicios, Conductores, Métricas.

**Estados:**
- Con datos normales.
- Sin operación del día (vacío útil, no error).
- Datos parciales / degradados.
- Error de carga.

**Acciones:**
- Navegar a listados filtrados desde un contador.
- Refrescar.

**No incluir:**
- gráficos decorativos sin definición,
- feed de chat,
- KPIs financieros complejos,
- widgets de CRM.

---

### P2 — Métricas

**Objetivo:** Ver el desempeño del MVP en ventanas simples.

**Contenido:**
- Selector de rango temporal mínimo (hoy / 7 días / 30 días, o el set acordado).
- Tarjetas/indicadores:
  - servicios creados,
  - tasa de completados,
  - cancelados/fallidos,
  - conductores activos en el periodo,
  - (si aplica) tiempo promedio hasta asignación o completado — solo si hay definición y datos.
- Desglose por estado.
- Nota visible de definición cuando una métrica pueda malinterpretarse.

**Estados:**
- Rango sin datos.
- Carga.
- Error.

**Acciones:**
- Cambiar rango.
- Navegar a servicios filtrados desde un desglose (si es viable).

**Fuera de alcance:**
- cohortes,
- funnels de adquisición,
- exportación BI avanzada,
- comparación multi-ciudad compleja.

---

### P3 — Servicios (listado)

**Objetivo:** Explorar servicios operativos.

**Contenido por fila (mínimo):**
- ID o código corto,
- estado,
- conductor (o “sin asignar”),
- referencia de usuario (mínima),
- creado / actualizado,
- posible marca de “estancado”.

**Filtros MVP:**
- estado,
- rango de fechas,
- búsqueda simple por ID / referencia.

**Orden por defecto:**
- más recientes o más urgentes primero (definir una sola regla).

**Acciones:**
- Abrir detalle.
- Limpiar filtros.
- Refrescar.

**Fuera de alcance:**
- edición inline,
- reasignación masiva,
- notas de soporte estilo ticket,
- exportación masiva.

---

### P4 — Detalle de servicio

**Objetivo:** Entender un servicio concreto.

**Contenido:**
- Estado actual destacado.
- Timestamps clave del ciclo de vida.
- Conductor asignado (link a detalle si existe).
- Referencia mínima de solicitante.
- Origen/destino resumidos (si hay datos).
- Timeline de eventos (si existe `ServiceEvent`; si no, secuencia inferida por timestamps).
- Señales de anomalía (estancado, inconsistencia visible).

**Acciones:**
- Volver al listado.
- Ir al conductor.

**Fuera de alcance:**
- botones de “enviar WhatsApp”,
- edición libre de estado sin proceso,
- disputa / reembolso,
- ficha CRM del cliente.

---

### P5 — Conductores (listado)

**Objetivo:** Ver la fuerza operativa disponible.

**Contenido por fila:**
- nombre visible,
- estado,
- última actividad,
- indicador de servicio actual (si aplica),
- activo/inactivo.

**Filtros MVP:**
- estado,
- activos vs inactivos,
- búsqueda por nombre/referencia.

**Acciones:**
- Abrir detalle.
- Refrescar.

**Fuera de alcance:**
- alta/baja administrativa completa,
- carga documental,
- pagos,
- chat.

---

### P6 — Detalle de conductor

**Objetivo:** Contexto operativo de un conductor.

**Contenido:**
- Estado actual.
- Datos mínimos de identificación.
- Última actividad.
- Servicio actual (si existe).
- Lista corta de servicios recientes.

**Acciones:**
- Ir a un servicio reciente.
- Volver al listado.

**Fuera de alcance:**
- historial laboral,
- evaluación de desempeño compleja,
- gestión de turnos tipo ERP.

---

### P7 — Salud de plataforma

**Objetivo:** Confirmar si la plataforma se ve sana.

**Contenido:**
- Estado global (operativo / degradado / desconocido).
- Frescura de datos.
- Última actividad operativa detectada.
- Errores de lectura o señales básicas disponibles.
- Texto claro de interpretación (“el panel no puede leer datos” vs “no hay servicios nuevos”).

**Acciones:**
- Refrescar diagnóstico.

**Fuera de alcance:**
- consola de logs,
- configuración de alertas multi-canal,
- status page pública.

---

### P8 — Sin acceso / sesión expirada

**Objetivo:** Manejar auth de forma clara.

**Contenido:**
- Mensaje de sesión expirada o acceso denegado.
- CTA a login.

---

### P9 — Vacío / error de datos (patrón transversal)

No es una ruta permanente, sino un patrón de UI obligatorio en pantallas de datos.

**Vacío bueno:** “No hay servicios hoy” + contexto.  
**Error:** “No pudimos cargar datos” + reintentar.  
**Degradado:** “Mostrando datos parciales” cuando aplique.

---

## 6. Información que NO debe aparecer en pantallas del MVP

- Embudo comercial / leads.
- Facturación y liquidaciones.
- Configuradores de tarifas avanzadas.
- Inbox de conversaciones WhatsApp.
- Paneles de marketing.
- Administración de roles granulares.
- Widgets de vanidad sin definición operativa.

---

## 7. Jerarquía de atención visual (Home)

Orden sugerido de lectura en P1:

1. Frescura / salud mínima  
2. Contadores de servicios ahora  
3. Conductores disponibles  
4. Lista “requiere atención”  
5. Atajos a detalle  

Si el usuario solo ve el primer viewport del home, debe poder formarse un juicio operativo.

---

## 8. Criterios de aceptación transversales de pantallas

- Toda pantalla autenticada redirige a login si no hay sesión.
- Toda lista define vacío y error.
- Todo estado de dominio usa etiqueta consistente en todas las pantallas.
- Los contadores del home coinciden conceptualmente con filtros de listados.
- Ninguna pantalla del MVP requiere un módulo CRM/ERP para funcionar.

---

## 9. Backlog de pantallas post-MVP (no implementar ahora)

- Centro de alertas configurables
- Vista de mapa (si el dominio y el valor lo justifican)
- Auditoría de acciones internas
- Comparativas entre periodos personalizadas
- Vistas por ciudad/zona
- Herramientas de acción operativa controlada (reasignar, etc.)

Estas pantallas pueden evaluarse solo después de validar el uso real del MVP de observación.

---

## 10. Relación con otros documentos

| Documento | Relación |
|---|---|
| `03-módulos-mvp.md` | Origen funcional de cada pantalla |
| `04-modelo-de-datos.md` | Campos y entidades mostradas |
| `06-roadmap.md` | Orden de entrega de pantallas |
