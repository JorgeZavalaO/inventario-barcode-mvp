# Plan maestro para digitalización de ubicaciones e inventario por rack

> **Proyecto:** `JorgeZavalaO/inventario-barcode-mvp`  
> **Documento:** Plan funcional, técnico, de migración, pruebas y puesta en producción  
> **Versión del documento:** 1.0  
> **Fecha de revisión:** 2026-07-21  
> **Versión revisada del proyecto:** 0.16.0  
> **Estado:** Propuesto para ejecución por fases  
> **Objetivo final:** poder determinar, demostrar y auditar **en qué parte exacta del almacén y del rack se encuentra cada producto y cuánto existe en esa posición**.

---

## 1. Cómo usar este documento

Este archivo está diseñado para mantenerse dentro del repositorio, por ejemplo en:

```text
docs/PLAN_COMPLETO_DIGITALIZACION_ALMACEN.md
```

Convenciones:

- `[ ]` pendiente.
- `[x]` terminado y validado.
- `[~]` iniciado o parcialmente terminado.
- `[!]` bloqueado o requiere una decisión.
- Una fase solo se considera terminada cuando se cumplen sus **criterios de salida**.
- No marcar una tarea como terminada únicamente porque el código compila; debe verificarse su criterio funcional, técnico y de datos.

### Estado general

| Fase | Nombre | Estado | Dependencia principal |
|---|---:|---:|---:|
| 0 | Línea base, seguridad y gobernanza | [~] | Ninguna |
| 1 | Arquitectura de datos y migración segura | [x] | Fase 0 |
| 2 | Usuarios, roles y control operativo | [x] | Fase 1 |
| 3 | Estructura física del almacén | [x] | Fases 1 y 2 |
| 4 | Diseñador de racks y posiciones | [x] | Fase 3 |
| 5 | Etiquetas y códigos de ubicación | [ ] | Fase 4 |
| 6 | Productos, presentaciones y stock por ubicación | [ ] | Fases 3 a 5 |
| 7 | Sesiones de inventario V2 por posición | [ ] | Fase 6 |
| 8 | Conteo ubicación → producto → cantidad | [ ] | Fase 7 |
| 9 | Colaboración, asignaciones y reconteos | [ ] | Fase 8 |
| 10 | Vista frontal, lateral y búsqueda física | [ ] | Fases 4, 6, 8 y 9 |
| 11 | Conciliación, cierre, movimientos y exportación | [ ] | Fases 8 a 10 |
| 12 | Offline, tiempo real, observabilidad y resiliencia | [ ] | Fases 8 a 11 |
| 13 | Auditoría final, piloto y puesta en producción | [ ] | Todas las anteriores |

---

## 2. Resumen ejecutivo

El proyecto ya resuelve correctamente una parte importante del problema:

- Catálogo de productos.
- Importación desde CSV y Excel.
- Generación de etiquetas Code 128 y QR.
- Sesiones colaborativas de inventario.
- Escaneo por cámara, lector USB o ingreso manual.
- Eventos de conteo append-only.
- Idempotencia mediante `operation_id`.
- Anulación conservando trazabilidad.
- Comparación entre stock teórico y conteo físico.
- Sincronización periódica multiusuario.

Sin embargo, el modelo actual contabiliza principalmente:

```text
sesión + producto + cantidad
```

El modelo objetivo debe contabilizar:

```text
sesión + ronda + posición física + producto + presentación + cantidad + operador
```

La ubicación no debe ser solamente un texto como “Almacén principal”. Debe convertirse en una entidad verificable, etiquetable y auditable, capaz de representar:

```text
Almacén
└── Piso
    └── Zona o pasillo
        └── Rack
            └── Compartimiento frontal
                └── Profundidad: frente / centro / fondo
```

La estructura debe aceptar racks irregulares: distintos anchos, divisiones, niveles y profundidades. No se debe asumir una cuadrícula uniforme para todos los racks.

---

## 3. Definición de éxito del producto

El proyecto se considera funcionalmente culminado cuando una persona puede:

1. Buscar un producto y obtener todas sus posiciones físicas activas.
2. Abrir un piso y visualizar sus racks.
3. Abrir un rack y ver su estructura frontal.
4. Seleccionar un compartimiento y revisar su profundidad.
5. Escanear el QR de una posición física.
6. Escanear uno o varios productos dentro de esa posición.
7. Registrar cajas completas, unidades por caja y unidades sueltas.
8. Finalizar explícitamente una posición, incluso cuando está vacía.
9. Evitar que dos operadores sumen accidentalmente dos conteos independientes.
10. Ejecutar un reconteo sin sumar la ronda anterior.
11. Comparar stock teórico y físico por posición y por producto.
12. Detectar productos inesperados o encontrados en otra ubicación.
13. Aprobar diferencias y cerrar la sesión con trazabilidad.
14. Visualizar en vista frontal y lateral dónde está el producto y cuánto existe.
15. Exportar resultados detallados para auditoría o integración con el ERP.

### Indicadores mínimos de aceptación

- [ ] El 100 % de los eventos nuevos de conteo pertenece a una posición válida.
- [ ] El 100 % de las posiciones incluidas en una sesión termina como completada, excluida o pendiente justificada.
- [ ] Ningún reintento de red duplica una operación.
- [ ] Los reconteos no se suman entre rondas.
- [ ] El total global coincide con la suma de los resultados aprobados por posición.
- [ ] Se puede registrar y demostrar un conteo de cero.
- [ ] Se puede encontrar un mismo producto en varias posiciones.
- [ ] Se puede encontrar varios productos en una misma posición.
- [ ] La vista frontal y lateral proviene del mismo modelo de datos; no son dibujos independientes.
- [ ] Las sesiones antiguas siguen siendo consultables después de la migración.

---

## 4. Auditoría del estado actual

### 4.1 Fortalezas que deben conservarse

| Fortaleza | Decisión |
|---|---|
| Eventos append-only | Conservar. Los totales no deben editarse directamente. |
| `operation_id` único | Conservar y reutilizar para modo offline y reintentos. |
| PostgreSQL | Conservar. Es adecuado para concurrencia y auditoría. |
| Zod en APIs | Conservar y ampliar a todos los nuevos contratos. |
| Cámara + USB + manual | Conservar como tres métodos equivalentes. |
| Snapshot al crear sesión | Conservar, pero cambiar de producto global a producto por posición. |
| PWA | Ampliar con cola offline, caché y recuperación. |
| QR disponible | Usarlo como formato preferido para ubicaciones. |

### 4.2 Hallazgos y riesgos

| ID | Severidad | Hallazgo | Riesgo | Acción requerida |
|---|---:|---|---|---|
| A-01 | Crítica funcional | `CountEvent` no contiene ubicación | No se puede demostrar dónde fue contado un producto | Fases 1, 7 y 8 |
| A-02 | Alta | El stock teórico vive principalmente en `Product` | Un producto no puede distribuirse correctamente entre posiciones | Fase 6 |
| A-03 | Alta | `SessionProduct` usa sesión + producto | El snapshot pierde la dimensión física | Fase 7 |
| A-04 | Alta | Todos los conteos vigentes del producto se suman | Dos rondas o dos operadores pueden duplicar el total | Fase 9 |
| A-05 | Alta | El operador de la sesión se identifica por nombre y `localStorage` | Identidad débil y auditoría incompleta | Fase 2 |
| A-06 | Alta | No existe RBAC explícito | Acciones sensibles pueden quedar disponibles a cualquier usuario autenticado | Fase 2 |
| A-07 | Alta | Existe borrado total desde `/api/setup` | Riesgo de pérdida irreversible de información | Fase 0 |
| A-08 | Alta técnica | Prisma migrations y `ensureDatabase()` definen el esquema en paralelo | Deriva de esquema, fallos al desplegar y migraciones difíciles de auditar | Fase 1 |
| A-09 | Alta | No hay pruebas automatizadas declaradas en scripts | Regresiones durante la ampliación del dominio | Fase 0 |
| A-10 | Media | Polling completo cada dos segundos | Carga creciente en consultas y ancho de banda | Fase 12 |
| A-11 | Media | La importación ejecuta operaciones fila por fila | Rendimiento bajo y resultados parciales difíciles de revertir | Fase 6 |
| A-12 | Media | El código de barras es único y directo en `Product` | Limita presentaciones, empaques o múltiples códigos | Fase 6 |
| A-13 | Media | El conteo exige cantidad positiva | No existe un registro explícito de posición revisada y vacía | Fases 7 y 8 |
| A-14 | Media | No hay modo offline | Una pérdida de señal puede detener o poner en riesgo el trabajo | Fase 12 |
| A-15 | Media | Cierre definitivo sin flujo de aprobación formal | Diferencias pueden cerrarse sin revisión | Fases 9 y 11 |
| A-16 | Media | No existe historial formal de movimientos entre posiciones | El sistema conoce conteos, pero no reubicaciones | Fase 11 |

### 4.3 Decisiones de auditoría

- [ ] Prisma Migrate será la única fuente de verdad para cambios estructurales.
- [ ] `ensureDatabase()` dejará de crear o alterar tablas en tiempo de ejecución.
- [ ] Las consultas SQL complejas podrán mantenerse, pero dentro de repositorios tipados y con pruebas.
- [ ] El conteo continuará siendo append-only.
- [ ] Los resultados aprobados se calcularán desde eventos y rondas, no desde un campo total editable.
- [ ] La posición física será obligatoria para toda sesión V2.
- [ ] Las sesiones V1 permanecerán en modo histórico y no se reescribirán artificialmente.

---

## 5. Alcance funcional completo

### 5.1 Administración maestra

- Almacenes.
- Pisos.
- Zonas y pasillos.
- Racks.
- Compartimientos irregulares del rack.
- Profundidades por compartimiento.
- Posiciones físicas contables.
- Productos.
- Múltiples códigos de producto.
- Presentaciones y contenido por empaque.
- Stock teórico por posición.
- Etiquetas de ubicación.
- Usuarios, roles y permisos.

### 5.2 Operación de inventario

- Crear sesión total o parcial.
- Elegir pisos, racks o posiciones a inventariar.
- Congelar snapshot teórico por posición.
- Asignar posiciones a operadores.
- Escanear ubicación antes de productos.
- Contar unidades, cajas y sueltos.
- Completar posición vacía.
- Pausar y reanudar.
- Registrar incidencias.
- Reconteo independiente.
- Aprobación de diferencias.
- Cierre controlado.
- Exportación.

### 5.3 Consulta física

- Buscar producto → posiciones.
- Buscar posición → productos.
- Ver plano por piso.
- Ver rack frontal.
- Ver profundidad lateral.
- Ver cantidad teórica, contada y aprobada.
- Ver última fecha y responsable del conteo.
- Ver historial de movimientos.

---

## 6. Modelo de dominio objetivo

### 6.1 Principio de modelado

La fuente de verdad de ubicación será una **posición física contable**. El dibujo es una representación de esa posición, no una base de datos separada.

### 6.2 Entidades principales

```text
Warehouse
└── Floor
    └── WarehouseZone
        └── Rack
            └── RackCompartment
                └── RackDepthSlot
                    └── StoragePosition
```

Además:

```text
Product
├── ProductBarcode
├── ProductPackage
└── ProductLocationStock → StoragePosition

InventorySession
├── SessionScope
├── SessionPosition
├── SessionStockSnapshot
├── CountAssignment
├── CountRound
├── CountEvent
├── CountIncident
└── ApprovedResult
```

### 6.3 Modelo recomendado

> Los nombres son una propuesta. Antes de migrar se debe aprobar un ADR con los nombres finales.

```prisma
enum UserRole {
  ADMIN
  SUPERVISOR
  COUNTER
  VIEWER
}

enum SessionStatus {
  DRAFT
  OPEN
  PAUSED
  REVIEW
  CLOSED
  CANCELLED
}

enum PositionStatus {
  PENDING
  ASSIGNED
  IN_PROGRESS
  COMPLETED
  RECOUNT_REQUIRED
  APPROVED
  EXCLUDED
}

enum CountRoundStatus {
  OPEN
  SUBMITTED
  REJECTED
  APPROVED
  CANCELLED
}

enum DepthKind {
  FRONT
  MIDDLE
  BACK
  CUSTOM
}

model Warehouse {
  id        String   @id @default(uuid())
  code      String   @unique
  name      String
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Floor {
  id          String   @id @default(uuid())
  warehouseId String
  code        String
  name        String
  orderIndex  Int
  active      Boolean  @default(true)

  @@unique([warehouseId, code])
}

model WarehouseZone {
  id         String   @id @default(uuid())
  floorId    String
  code       String
  name       String
  type       String?
  orderIndex Int
  active     Boolean  @default(true)

  @@unique([floorId, code])
}

model Rack {
  id          String   @id @default(uuid())
  zoneId      String
  code        String
  name        String
  widthMm     Int?
  heightMm    Int?
  depthMm     Int?
  orderIndex  Int
  active      Boolean  @default(true)
  version     Int      @default(1)

  @@unique([zoneId, code])
}

model RackCompartment {
  id          String   @id @default(uuid())
  rackId      String
  code        String
  name        String
  x           Int      // coordenada normalizada 0..10000
  y           Int      // coordenada normalizada 0..10000
  width       Int      // tamaño normalizado 0..10000
  height      Int      // tamaño normalizado 0..10000
  moduleLabel String?
  levelLabel  String?
  orderIndex  Int
  active      Boolean  @default(true)

  @@unique([rackId, code])
}

model RackDepthSlot {
  id            String    @id @default(uuid())
  compartmentId String
  code          String
  name          String
  kind          DepthKind
  depthIndex    Int
  startZ        Int?
  depthSize     Int?
  active        Boolean   @default(true)

  @@unique([compartmentId, code])
}

model StoragePosition {
  id          String   @id @default(uuid())
  rackId      String
  compartmentId String
  depthSlotId String
  code        String   @unique
  qrValue     String   @unique
  capacityQty Decimal?
  capacityUnit String?
  active      Boolean  @default(true)
  countable   Boolean  @default(true)
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 6.4 Por qué usar compartimientos con coordenadas

La vista dibujada contiene divisiones de anchos variables. Una tabla fija de filas y columnas no representa bien todos los racks. Cada compartimiento debe almacenarse como un rectángulo normalizado:

```text
x, y, width, height
```

Ventajas:

- Permite columnas de anchos diferentes.
- Permite niveles de alturas diferentes.
- Permite estructuras distintas en cada rack.
- La vista frontal puede escalarse a celular, tablet o escritorio.
- No obliga a guardar píxeles dependientes de una pantalla.

### 6.5 Profundidad y vista lateral

Cada compartimiento frontal podrá tener uno o varios segmentos de profundidad:

```text
D01 = Frente
D02 = Centro
D03 = Fondo
```

No todos los compartimientos requieren tres profundidades. Puede existir uno, dos, tres o más segmentos personalizados.

### 6.6 Código de ubicación

Formato recomendado:

```text
{ALMACEN}-{PISO}-{RACK}-{COMPARTIMIENTO}-{PROFUNDIDAD}
```

Ejemplo:

```text
AP-P01-R003-C07-D02
```

Contenido QR recomendado:

```text
LOC:v1:550e8400-e29b-41d4-a716-446655440000
```

Reglas:

- [ ] El UUID es la identidad técnica.
- [ ] El código visible es modificable bajo reglas y auditoría.
- [ ] El QR incluye prefijo y versión para diferenciarlo de un producto.
- [ ] El escáner detecta si el valor es una ubicación o un producto.
- [ ] Siempre existe ingreso manual como contingencia.

### 6.7 Producto, códigos y presentaciones

```prisma
model ProductBarcode {
  id        String  @id @default(uuid())
  productId String
  value     String  @unique
  type      String
  active    Boolean @default(true)
}

model ProductPackage {
  id             String  @id @default(uuid())
  productId      String
  code           String
  name           String
  baseQuantity   Decimal
  barcodeId      String?
  active         Boolean @default(true)

  @@unique([productId, code])
}

model ProductLocationStock {
  id               String   @id @default(uuid())
  productId        String
  positionId       String
  theoreticalStock Decimal  @db.Decimal(14, 3)
  minimumStock     Decimal? @db.Decimal(14, 3)
  isPrimary        Boolean  @default(false)
  source            String?
  sourceUpdatedAt   DateTime?
  updatedAt         DateTime @updatedAt

  @@unique([productId, positionId])
  @@index([positionId])
}
```

### 6.8 Conteo por cajas y unidades

Cada evento conservará el detalle capturado:

```text
Cantidad base = cajas × unidades por caja + unidades sueltas
```

Ejemplo:

```text
4 cajas × 20 unidades + 3 sueltas = 83 unidades
```

El evento debe guardar:

- Cantidad base calculada.
- Cantidad de empaques.
- Factor del empaque usado en ese momento.
- Cantidad suelta.
- Presentación seleccionada.

El factor debe copiarse al evento. No debe recalcularse desde la presentación actual porque esa presentación podría cambiar en el futuro.

### 6.9 Sesión, posición, ronda y eventos

```prisma
model SessionPosition {
  id          String         @id @default(uuid())
  sessionId   String
  positionId  String
  status      PositionStatus @default(PENDING)
  assignedToId String?
  startedAt   DateTime?
  completedAt DateTime?
  approvedAt  DateTime?
  approvedById String?

  @@unique([sessionId, positionId])
}

model SessionStockSnapshot {
  id               String   @id @default(uuid())
  sessionId        String
  positionId       String
  productId        String
  theoreticalStock Decimal  @db.Decimal(14, 3)
  source            String?
  capturedAt        DateTime @default(now())

  @@unique([sessionId, positionId, productId])
}

model CountRound {
  id                String           @id @default(uuid())
  sessionPositionId String
  roundNumber       Int
  operatorId        String
  status            CountRoundStatus @default(OPEN)
  startedAt         DateTime         @default(now())
  submittedAt       DateTime?
  reviewedById      String?
  reviewedAt        DateTime?

  @@unique([sessionPositionId, roundNumber])
}

model CountEvent {
  id              String      @id @default(uuid())
  operationId     String      @unique
  sessionId       String
  positionId      String
  countRoundId    String
  productId       String
  operatorId      String
  packageId       String?
  packageCount    Decimal?
  unitsPerPackage Decimal?
  looseQuantity   Decimal?
  quantity        Decimal     @db.Decimal(14, 3)
  inputMethod     InputMethod
  createdAt       DateTime    @default(now())
  reversedAt      DateTime?
  reversedById    String?
  reversalReason  String?

  @@index([sessionId, positionId, productId])
  @@index([countRoundId, createdAt])
}
```

### 6.10 Registro de una posición vacía

No se debe crear un evento con cantidad negativa o ficticia. Una posición vacía se representa así:

```text
SessionPosition = COMPLETED
CountRound = SUBMITTED o APPROVED
CountEvent vigente = ninguno
Resultado físico = 0
```

Esto demuestra que la posición fue revisada y no simplemente olvidada.

---

# 7. Plan de implementación por fases

---

## Fase 0 — Línea base, seguridad y gobernanza

### Objetivo

Reducir el riesgo de pérdida de datos y crear una base verificable antes de modificar el dominio.

### Entregables

- Documento de decisiones técnicas.
- Suite mínima de pruebas.
- Protección de acciones destructivas.
- Pipeline de validación.
- Copia de seguridad y estrategia de recuperación.

### Tareas

#### Seguridad inmediata

- [ ] Deshabilitar `DELETE /api/setup` en producción mediante variable de entorno.
- [x] Restringir carga demo y borrado total a rol `ADMIN`.
- [x] Solicitar confirmación tipada (confirmación de dos pasos en UI).
- [ ] Registrar quién, cuándo y desde dónde ejecutó una acción destructiva.
- [ ] Crear una copia de seguridad antes de cualquier limpieza autorizada.
- [ ] Cambiar o eliminar las credenciales demo en ambientes no locales.

#### Pruebas y calidad

- [ ] Añadir Vitest para lógica y servicios.
- [ ] Añadir Playwright para flujos críticos.
- [ ] Añadir base PostgreSQL efímera para pruebas de integración.
- [ ] Crear scripts `test`, `test:integration`, `test:e2e` y `check`.
- [ ] Configurar CI con lint, typecheck, test, migration-check y build.
- [ ] Definir cobertura mínima inicial de lógica de dominio: 70 %.

#### Gobernanza técnica

- [ ] Crear `docs/adr/`.
- [ ] ADR-001: fuente única de verdad para esquema.
- [ ] ADR-002: modelo de rack irregular y profundidad.
- [ ] ADR-003: eventos, rondas y resultados aprobados.
- [ ] ADR-004: compatibilidad de sesiones V1 y V2.
- [ ] ADR-005: estrategia offline.
- [ ] Crear checklist obligatorio de revisión de migraciones.

### Pruebas mínimas

- [ ] Un usuario sin permisos no puede borrar datos.
- [ ] En producción el endpoint destructivo responde como no disponible.
- [ ] El pipeline bloquea una migración inválida.
- [ ] Se puede restaurar una copia de prueba.

### Criterio de salida

- [ ] CI verde.
- [ ] Backup verificado.
- [ ] Acciones destructivas protegidas.
- [ ] ADR principales aprobados.

---

## Fase 1 — Arquitectura de datos y migración segura

### Objetivo

Preparar el proyecto para crecer sin duplicar definiciones de esquema ni romper sesiones históricas.

### Tareas

#### Fuente única de esquema

- [x] Inventariar tablas creadas por Prisma migrations.
- [x] Inventariar tablas creadas por `ensureDatabase()`.
- [x] Crear migración que deje ambas representaciones alineadas.
- [x] Eliminar DDL de `ensureDatabase()`.
- [x] Convertir `ensureDatabase()` en verificación de conectividad.
- [x] Ejecutar migraciones solamente en despliegue controlado.

#### Capa de acceso a datos

- [x] Crear `src/server/repositories/`.
- [x] Crear repositorios para productos, sesiones, conteos y ubicaciones.
- [~] Centralizar transacciones de conteo.
- [x] Tipar resultados de SQL sin `unknown` ni conversiones dispersas.
- [ ] Definir aislamiento y bloqueo para asignación de posiciones.

#### Compatibilidad

- [x] Añadir `inventory_sessions.schema_version` con valores `1` y `2`.
- [x] Mantener lectura histórica de sesiones V1.
- [ ] Crear ubicación técnica `LEGACY-UNASSIGNED` solo para reportes heredados, sin fingir precisión física.
- [ ] No permitir nuevos conteos V1 después de activar V2.
- [x] Crear feature flag `INVENTORY_LOCATION_V2_ENABLED`.

### Migraciones

- [ ] Migración expansiva: nuevas tablas y columnas opcionales.
- [ ] Despliegue de código compatible con V1 y V2.
- [ ] Migración de datos maestros.
- [ ] Activación gradual por feature flag.
- [ ] Migración contractiva después del piloto.

### Criterio de salida

- [x] Ningún `CREATE TABLE` se ejecuta por una petición web.
- [x] Las sesiones antiguas cargan y muestran sus resultados.
- [~] Las nuevas migraciones se prueban desde una base vacía y una copia con datos.

---

## Fase 2 — Usuarios, roles y control operativo

### Objetivo

Asegurar que cada acción tenga identidad y permisos verificables.

### Roles

| Rol | Capacidades principales |
|---|---|
| ADMIN | Configuración, usuarios, almacenes, borrado controlado, migraciones operativas |
| SUPERVISOR | Crear/abrir/pausar/cerrar sesiones, asignar, revisar y aprobar |
| COUNTER | Tomar asignaciones, contar, completar y reportar incidencias |
| VIEWER | Consultar productos, ubicaciones, sesiones y reportes |

### Tareas

- [x] Añadir `role` y `active` a usuario.
- [x] Implementar guardas de servidor por permiso, no solo ocultamiento visual.
- [ ] Sustituir operador por nombre por usuario autenticado en sesiones V2.
- [x] Mantener `Operator` únicamente para compatibilidad V1.
- [ ] Registrar auditoría de apertura, pausa, reasignación, aprobación y cierre.
- [ ] Restringir anulación al autor durante una ventana configurable o al supervisor.
- [ ] Exigir motivo de anulación fuera de la ventana.
- [x] Restringir cierre a supervisor o administrador.
- [x] Añadir vista de usuarios y roles.

### Pruebas

- [ ] COUNTER no puede cerrar sesión.
- [ ] VIEWER no puede contar.
- [ ] SUPERVISOR no puede ejecutar borrado total si no es ADMIN.
- [ ] Toda operación sensible registra actor y fecha.

### Criterio de salida

- [x] No existe una acción operativa V2 sin usuario autenticado.
- [~] La matriz de permisos tiene pruebas de integración.

---

## Fase 3 — Estructura física del almacén

### Objetivo

Digitalizar almacenes, pisos, zonas y racks antes de modelar su interior.

### Funcionalidades

- CRUD de almacenes.
- CRUD de pisos.
- CRUD de zonas/pasillos.
- CRUD de racks.
- Orden visual.
- Activación y desactivación.
- Fotografías y observaciones opcionales.

### Tareas de base de datos

- [x] Crear `warehouses`.
- [x] Crear `floors`.
- [x] Crear `warehouse_zones`.
- [x] Crear `racks`.
- [x] Añadir índices y restricciones de códigos únicos por padre.
- [ ] Añadir auditoría de cambios.
- [x] Impedir borrado físico (ON DELETE RESTRICT); usar desactivación.

### Tareas de API

- [x] `GET/POST /api/warehouses`.
- [x] `GET/PATCH /api/warehouses/:id`.
- [x] Endpoints equivalentes para pisos, zonas y racks.
- [x] Endpoint de árbol del almacén (`GET /api/warehouses` con includes).
- [x] Validar ciclos y relaciones inválidas (claves foráneas + Zod).

### Tareas de UI

- [x] Módulo **Ubicaciones** en sidebar.
- [x] Navegación por árbol.
- [x] Vista por tarjetas de los tres pisos.
- [x] Alta rápida de varios racks (importación CSV).
- [ ] Reordenamiento controlado.
- [x] Estados vacío, cargando, error y sin permisos.

### Importación

Plantilla propuesta:

```csv
almacen,piso,zona,rack,nombre_rack,ancho_mm,alto_mm,profundidad_mm
AP,P01,ZA,R001,Rack principal izquierdo,6000,2400,1200
```

- [x] Previsualizar importación (respuesta con resultados por fila).
- [x] Validar duplicados (upsert por código).
- [x] Modo crear, actualizar o ignorar (upsert automático).
- [x] Informe de errores por fila.

### Criterio de salida

- [x] Los tres pisos y todos los racks reales pueden registrarse sin crear posiciones todavía.
- [ ] Un rack puede moverse de zona conservando historial (requiere migración de datos).

---

## Fase 4 — Diseñador de racks y posiciones

### Objetivo

Representar racks irregulares como el dibujo frontal y su profundidad lateral.

### Decisión de diseño

No usar una cuadrícula rígida como fuente de verdad. El diseñador trabajará con compartimientos rectangulares y cortes.

### Flujo del diseñador

1. Seleccionar rack.
2. Definir dimensiones físicas opcionales.
3. Crear compartimiento inicial que ocupa todo el frente.
4. Dividir vertical u horizontalmente.
5. Ajustar proporciones.
6. Nombrar módulos y niveles.
7. Definir profundidad por compartimiento.
8. Generar posiciones físicas.
9. Previsualizar códigos y etiquetas.
10. Publicar una versión del diseño.

### Tareas de base de datos

- [x] Crear `rack_compartments`.
- [x] Crear `rack_depth_slots`.
- [x] Crear `storage_positions`.
- [x] Guardar coordenadas normalizadas (x, y, width, height 0–10000).
- [x] Añadir versión del diseño del rack (campo `version` + `design` JSON).
- [ ] Prohibir solapamientos inválidos al publicar (validación backend).
- [x] Permitir borrador antes de publicar (diseño guardado como JSON).
- [x] Mantener posiciones activas; desactivación en lugar de borrado.

### Tareas de UI

- [x] Canvas/SVG responsive para vista frontal.
- [ ] Herramienta de división horizontal.
- [ ] Herramienta de división vertical.
- [x] Ajuste de tamaño con validación (coordenadas 0–10000).
- [ ] Duplicar compartimiento o estructura.
- [x] Añadir profundidad Frente/Centro/Fondo (DepthKind enum).
- [x] Añadir profundidades personalizadas (CUSTOM).
- [x] Desactivar espacios no utilizables (campo `active`).
- [x] Vista previa móvil (SVG responsive).
- [ ] Vista previa de impresión de etiquetas.

### Reglas

- [ ] Coordenadas entre 0 y 10000.
- [ ] Ningún compartimiento publicado se sale del rack.
- [ ] Los compartimientos publicados no se solapan.
- [ ] Cada posición tiene código único.
- [ ] Una posición con historial no se elimina físicamente.
- [ ] Los cambios estructurales mayores crean una nueva versión.

### Pruebas

- [ ] Rack de dos módulos y tres niveles.
- [ ] Rack con módulos de distinto ancho.
- [ ] Rack con niveles diferentes por módulo.
- [ ] Rack sin división de profundidad.
- [ ] Rack con tres profundidades.
- [ ] Rack con una posición deshabilitada.

### Criterio de salida

- [x] El rack dibujado por el usuario puede reproducirse de forma razonable en la vista frontal (SVG con coordenadas normalizadas).
- [x] Cada área contable tiene una posición y profundidad identificable (StoragePosition + RackDepthSlot).

---

## Fase 5 — Etiquetas y códigos de ubicación

### Objetivo

Conectar inequívocamente el espacio físico con su registro digital.

### Tareas

- [ ] Crear componente `LocationLabel` separado de `BarcodeLabel` de productos.
- [ ] Usar QR como formato predeterminado para posiciones.
- [ ] Mostrar almacén, piso, rack, compartimiento y profundidad.
- [ ] Añadir código legible grande.
- [ ] Generar etiquetas individuales y masivas.
- [ ] Filtrar impresión por piso, rack y posiciones.
- [ ] Registrar fecha y versión de la etiqueta.
- [ ] Añadir acción “reemplazar etiqueta dañada”.
- [ ] Añadir validación de lectura antes de imprimir masivamente.
- [ ] Permitir descargar PDF o imprimir desde navegador.

### Reglas de escaneo

- [ ] `LOC:v1:` identifica ubicación.
- [ ] Producto y ubicación nunca comparten el mismo espacio de código lógico.
- [ ] Un QR de ubicación desactivada muestra advertencia y no inicia conteo.
- [ ] Un código manual puede resolver la ubicación si el QR no funciona.

### Prueba física

- [ ] Imprimir lote piloto.
- [ ] Leer cada etiqueta desde distancia operativa.
- [ ] Probar iluminación real.
- [ ] Probar celulares de gama media.
- [ ] Confirmar adhesión y durabilidad.

### Criterio de salida

- [ ] Todas las posiciones del rack piloto tienen etiquetas legibles y coinciden con el sistema.

---

## Fase 6 — Productos, presentaciones y stock por ubicación

### Objetivo

Separar el producto del lugar donde se almacena y registrar stock teórico por posición.

### Tareas de modelo

- [ ] Crear `product_barcodes`.
- [ ] Migrar barcode actual como código principal.
- [ ] Crear `product_packages`.
- [ ] Crear `product_location_stocks`.
- [ ] Mantener `Product.theoreticalStock` como derivado temporal o retirarlo de forma gradual.
- [ ] Definir unidad base por producto.
- [ ] Definir precisión decimal por unidad.

### Funcionalidades

- [ ] Producto con varias posiciones.
- [ ] Posición con varios productos.
- [ ] Posición primaria opcional.
- [ ] Presentación “Caja x 20”, “Paquete x 10”, etc.
- [ ] Búsqueda producto → ubicaciones.
- [ ] Búsqueda ubicación → productos.
- [ ] Asignación y transferencia masiva.
- [ ] Productos sin posición en bandeja de pendientes.

### Importación de stock por posición

```csv
codigo_producto,codigo_ubicacion,stock_teorico,presentacion,es_principal
PROD-001,AP-P01-R003-C07-D01,25,UND,true
PROD-001,AP-P02-R010-C02-D03,40,UND,false
```

- [ ] Validar productos inexistentes.
- [ ] Validar ubicaciones inexistentes.
- [ ] Previsualizar cambios.
- [ ] Evitar reemplazo accidental de todo el stock.
- [ ] Ofrecer modos `MERGE`, `REPLACE_SCOPE` y `VALIDATE_ONLY`.
- [ ] Ejecutar upsert por lotes y transacción por lote.
- [ ] Registrar fuente y fecha del stock.

### Rendimiento

- [ ] Sustituir bucle individual por inserción masiva o lotes eficientes.
- [ ] Probar 6,500 productos y al menos 20,000 relaciones producto-posición.
- [ ] Indexar búsqueda por producto, posición y código.

### Criterio de salida

- [ ] El stock global de un producto es igual a la suma de sus posiciones.
- [ ] Ningún producto activo queda silenciosamente sin ubicación; aparece en pendientes.

---

## Fase 7 — Sesiones de inventario V2 por posición

### Objetivo

Crear sesiones cuyo alcance y snapshot estén definidos por posiciones físicas.

### Creación de sesión

Campos:

- Nombre.
- Almacén.
- Alcance: total, piso, zona, rack o posiciones seleccionadas.
- Tipo: inventario general, cíclico, verificación o reconteo.
- Política de conteo ciego.
- Fecha programada.
- Supervisor.

### Tareas

- [ ] Añadir estado `DRAFT`.
- [ ] Añadir `schema_version = 2`.
- [ ] Crear selector de alcance.
- [ ] Crear `session_positions` desde el alcance.
- [ ] Crear snapshot producto + posición.
- [ ] Congelar diseño/versiones de rack usados por la sesión.
- [ ] Definir qué ocurre con productos sin posición.
- [ ] Impedir cambios del alcance una vez abierta, salvo operación auditada.
- [ ] Mostrar cantidad de posiciones y productos antes de abrir.

### Conteo ciego

Opciones:

- El contador no ve stock teórico.
- El contador ve productos esperados, pero no cantidad.
- El contador ve toda la información.

- [ ] Configuración por sesión.
- [ ] El supervisor siempre puede revisar snapshot.

### Posiciones vacías

- [ ] Permitir completar una posición sin eventos.
- [ ] Mostrar confirmación “posición revisada y vacía”.
- [ ] Diferenciar posición vacía de posición no revisada.

### Criterio de salida

- [ ] Una sesión puede cubrir solo el Piso 2 o un conjunto de racks.
- [ ] El snapshot no cambia si luego se modifica el stock maestro.

---

## Fase 8 — Conteo ubicación → producto → cantidad

### Objetivo

Implementar el flujo operativo principal y obligatorio.

### Flujo móvil objetivo

```text
1. Identificarse
2. Tomar o recibir una posición
3. Escanear ubicación
4. Confirmar ubicación activa
5. Escanear producto
6. Elegir presentación
7. Registrar cajas y/o unidades
8. Repetir productos
9. Revisar resumen de posición
10. Finalizar posición
```

### Estados de UI

- Sin posición activa.
- Posición activa.
- Producto pendiente de confirmación.
- Guardando.
- Guardado local pendiente de sincronización.
- Error recuperable.
- Posición completada.
- Ubicación incorrecta.
- Producto no registrado.

### Tareas de API

- [ ] `POST /api/sessions/:id/positions/:positionId/start`.
- [ ] `POST /api/sessions/:id/counts` con `positionId` y `countRoundId`.
- [ ] Validar que la ronda pertenece a la posición y sesión.
- [ ] Validar que el usuario tiene la asignación.
- [ ] Validar que la posición está abierta.
- [ ] Conservar idempotencia.
- [ ] Registrar detalle de empaque.
- [ ] Añadir anulación con motivo.
- [ ] `POST /complete` para terminar posición.

### Tareas de UI

- [ ] Escáner capaz de distinguir `LOC:` y producto.
- [ ] Barra fija con ubicación activa.
- [ ] Botón para cambiar ubicación con confirmación.
- [ ] Formulario cajas × contenido + sueltos.
- [ ] Cantidad directa como alternativa.
- [ ] Historial de la posición actual.
- [ ] Deshacer último evento permitido.
- [ ] Resumen antes de completar.
- [ ] Vibración y sonido distintos para éxito/error.
- [ ] Diseño usable con una mano.

### Reglas de negocio

- [ ] No se registra producto sin posición activa.
- [ ] No se acepta cantidad cero como evento; el cero se representa completando sin eventos.
- [ ] No se acepta cantidad negativa.
- [ ] El factor de empaque se copia al evento.
- [ ] Un producto inesperado se permite, pero se marca.
- [ ] Escanear otra ubicación no cambia silenciosamente la posición activa.
- [ ] Una posición finalizada no recibe más eventos sin reapertura autorizada.

### Casos de prueba críticos

- [ ] Mismo producto en frente y fondo.
- [ ] Mismo producto en dos racks.
- [ ] Varias cajas más unidades sueltas.
- [ ] Producto inesperado.
- [ ] Posición vacía.
- [ ] Doble toque o reintento de red.
- [ ] Cambio accidental de QR.
- [ ] Anulación y nuevo registro.

### Criterio de salida

- [ ] Todo conteo V2 tiene posición, ronda, operador y método.
- [ ] El flujo funciona en celular con cámara y en PC con lector USB.

---

## Fase 9 — Colaboración, asignaciones y reconteos

### Objetivo

Evitar duplicidad operacional y separar conteos independientes.

### Asignaciones

- [ ] Asignación manual por supervisor.
- [ ] Autoasignación “tomar siguiente posición”.
- [ ] Reserva transaccional con bloqueo.
- [ ] Expiración configurable por inactividad.
- [ ] Liberación manual auditada.
- [ ] Vista de operadores activos y posiciones en curso.

### Rondas

Regla principal:

```text
Los eventos se suman dentro de una ronda.
Las rondas no se suman entre sí.
```

- [ ] Ronda 1 como conteo inicial.
- [ ] Ronda 2 o superior como reconteo.
- [ ] Posibilidad de reconteo ciego por otro operador.
- [ ] Comparación entre rondas para supervisor.
- [ ] Selección explícita de ronda aprobada.
- [ ] Registro del motivo del reconteo.

### Conflictos

- [ ] Dos operadores no pueden iniciar la misma posición y ronda.
- [ ] Un supervisor puede forzar liberación con motivo.
- [ ] Si una reserva expira, los eventos guardados permanecen.
- [ ] Una ronda enviada es inmutable salvo anulación auditada.

### Criterio de salida

- [ ] Dos conteos independientes nunca inflan el resultado.
- [ ] Se conoce quién contó, quién recontó y quién aprobó.

---

## Fase 10 — Vista frontal, lateral y búsqueda física

### Objetivo

Culminar la representación digital del rack y convertirla en una herramienta operativa.

### Vista por piso

- [ ] Mostrar zonas y racks.
- [ ] Estado por rack: pendiente, en curso, completado, diferencia.
- [ ] Avance porcentual por posiciones, no solo por productos.
- [ ] Filtros por operador y estado.

### Vista frontal del rack

- [ ] Renderizar compartimientos según coordenadas.
- [ ] Mostrar código y estado.
- [ ] Mostrar cantidad de productos y unidades.
- [ ] Colorear por estado de inventario.
- [ ] Seleccionar un compartimiento.
- [ ] Mostrar productos en esa área.
- [ ] Indicar si existe contenido detrás.

### Vista lateral

- [ ] Mostrar Frente/Centro/Fondo o profundidades personalizadas.
- [ ] Mostrar producto y cantidad por profundidad.
- [ ] Cambiar entre cantidades teóricas, contadas y aprobadas.
- [ ] Señalar ubicaciones inesperadas.

### Búsqueda física

Resultado de búsqueda de un producto:

```text
Producto: PROD-001
Total aprobado: 155 UND

Piso 1 · Rack R003 · Compartimiento C07 · Frente: 20
Piso 1 · Rack R003 · Compartimiento C07 · Fondo: 35
Piso 3 · Zona pallets · Posición P04: 100
```

- [ ] Ruta o modal “Dónde está”.
- [ ] Navegar desde producto hasta el rack.
- [ ] Resaltar la posición en el rack.
- [ ] Mostrar una ruta textual clara.
- [ ] Imprimir o compartir la ubicación.

### Posición visual aproximada de pilas — opcional controlado

La fuente de verdad seguirá siendo la posición. Como mejora visual se puede añadir `PlacementGroup`:

- Producto.
- Posición.
- Orden visual.
- Coordenadas aproximadas dentro del compartimiento.
- Número de cajas.
- Dimensiones opcionales.

- [ ] No bloquear la salida a producción por no tener dibujo exacto de cada caja.
- [ ] No usar el dibujo aproximado para calcular stock.

### Criterio de salida

- [ ] Desde la vista frontal y lateral se identifica dónde está el producto.
- [ ] La cantidad mostrada coincide con el resultado aprobado de la posición.
- [ ] La búsqueda de producto navega hasta el compartimiento y profundidad correctos.

---

## Fase 11 — Conciliación, cierre, movimientos y exportación

### Objetivo

Convertir el conteo en un resultado aprobado, explicable y utilizable.

### Conciliación

Estados de resultado:

- Coincide.
- Faltante.
- Sobrante.
- Producto inesperado.
- Producto esperado no encontrado.
- Encontrado en otra posición.
- Pendiente de revisión.

### Tareas

- [ ] Tablero de diferencias por posición y producto.
- [ ] Filtros por piso, rack, categoría y magnitud.
- [ ] Comentarios y evidencias.
- [ ] Crear reconteo desde una diferencia.
- [ ] Aprobar ronda por posición.
- [ ] Resolver producto encontrado en otra posición.
- [ ] Registrar causa de ajuste.
- [ ] Bloquear cierre si existen posiciones sin resolver, salvo excepción autorizada.

### Cierre

- [ ] Estado `REVIEW` antes de `CLOSED`.
- [ ] Resumen final previo al cierre.
- [ ] Firma lógica del supervisor.
- [ ] Snapshot de resultados aprobados.
- [ ] Cierre transaccional e idempotente.
- [ ] Sesión cerrada solo lectura.
- [ ] Reapertura excepcional con auditoría administrativa.

### Movimientos

- [ ] Movimiento de producto entre posiciones.
- [ ] Motivo: reposición, ordenamiento, corrección o traslado.
- [ ] Origen, destino, producto y cantidad.
- [ ] Estado pendiente/aplicado/cancelado.
- [ ] Evitar stock negativo salvo política explícita.
- [ ] Historial de ubicación del producto.

### Exportaciones

- [ ] Excel resumen por producto.
- [ ] Excel detallado por posición.
- [ ] Eventos y anulaciones.
- [ ] Diferencias y decisiones.
- [ ] Operadores y tiempos.
- [ ] Formato compatible con futura integración ERP.

### Criterio de salida

- [ ] El cierre puede reconstruirse desde datos auditables.
- [ ] El archivo exportado indica exactamente posición, producto, teórico, físico, diferencia y aprobación.

---

## Fase 12 — Offline, tiempo real, observabilidad y resiliencia

### Objetivo

Asegurar continuidad en los tres pisos y evitar pérdida o duplicidad por problemas de señal.

### Modo offline

- [ ] IndexedDB para catálogo mínimo, posiciones asignadas y cola de eventos.
- [ ] `operation_id` generado antes de guardar localmente.
- [ ] Estado `PENDING`, `SYNCING`, `SYNCED`, `ERROR`.
- [ ] Reintento con backoff.
- [ ] Sincronización al recuperar conexión.
- [ ] Pantalla de operaciones pendientes.
- [ ] No permitir cerrar posición si existen errores no resueltos, salvo política definida.
- [ ] Detectar sesión cerrada durante desconexión y enviar a revisión.

### Sincronización

- [ ] Reemplazar refresco completo por consultas incrementales con cursor, SSE o Realtime.
- [ ] Mantener fallback de polling más espaciado.
- [ ] Evitar recargar todos los productos y eventos cada dos segundos.
- [ ] Actualizar solo métricas y cambios recientes.

### Observabilidad

- [ ] Logs estructurados con request ID.
- [ ] Métricas de latencia y errores.
- [ ] Métricas de cola offline.
- [ ] Alertas de fallos de base de datos.
- [ ] Auditoría de acciones sensibles.
- [ ] Seguimiento de migraciones.

### Objetivos no funcionales iniciales

- [ ] Registro online p95 menor a 1.5 segundos bajo carga objetivo.
- [ ] Soportar al menos 20 operadores concurrentes en prueba.
- [ ] Cero duplicados en prueba de 10,000 reintentos idempotentes.
- [ ] Recuperar eventos offline después de reiniciar la PWA.
- [ ] Consultar producto por código en menos de 500 ms p95 en carga objetivo.

### Criterio de salida

- [ ] Un corte de Internet no pierde conteos confirmados localmente.
- [ ] La recuperación no duplica eventos.

---

## Fase 13 — Auditoría final, piloto y puesta en producción

### Objetivo

Validar en el almacén real que el sistema representa correctamente posición y cantidad.

### Preparación del piloto

- [ ] Seleccionar un piso y entre dos y cinco racks representativos.
- [ ] Incluir racks regulares e irregulares.
- [ ] Incluir productos en frente, centro y fondo.
- [ ] Incluir productos con cajas y unidades sueltas.
- [ ] Etiquetar el 100 % de posiciones piloto.
- [ ] Capacitar supervisor y contadores.
- [ ] Preparar procedimiento de contingencia manual.

### Auditoría funcional

- [ ] Buscar 30 productos y verificar físicamente sus ubicaciones.
- [ ] Seleccionar 30 posiciones y verificar todos sus productos.
- [ ] Ejecutar una sesión con varios operadores.
- [ ] Provocar un doble escaneo y comprobar idempotencia.
- [ ] Provocar pérdida de señal y comprobar sincronización.
- [ ] Ejecutar un reconteo por operador diferente.
- [ ] Completar una posición vacía.
- [ ] Registrar producto inesperado.
- [ ] Mover producto y revisar historial.
- [ ] Cerrar y exportar sesión.

### Auditoría de datos

- [ ] Total por producto = suma de posiciones aprobadas.
- [ ] Total por posición = suma de productos aprobados.
- [ ] Resultado aprobado corresponde a una ronda válida.
- [ ] Todo evento posee usuario, posición, ronda y fecha.
- [ ] Toda anulación posee actor y motivo cuando aplica.
- [ ] Ninguna posición desaparece por cambio de diseño.

### Criterios de aceptación del piloto

- [ ] 100 % de posiciones piloto identificadas con código único.
- [ ] Al menos 99 % de lecturas de ubicación exitosas sin ingreso manual.
- [ ] 100 % de eventos sincronizados o explicados.
- [ ] 0 duplicados por reintentos.
- [ ] 100 % de diferencias cerradas con decisión registrada.
- [ ] La ubicación indicada por el sistema coincide con la ubicación física en la muestra auditada.
- [ ] Las cantidades calculadas desde cajas y unidades coinciden con el conteo manual de control.

### Despliegue gradual

- [ ] Piloto en un conjunto de racks.
- [ ] Corrección de hallazgos.
- [ ] Despliegue al piso completo.
- [ ] Despliegue al segundo piso.
- [ ] Despliegue al tercer piso.
- [ ] Desactivar creación de sesiones V1.
- [ ] Documentar operación y soporte.
- [ ] Crear plan de mantenimiento de etiquetas y ubicaciones.

### Criterio de culminación

El proyecto se considera culminado cuando, para cualquier producto activo dentro del alcance digitalizado, el sistema puede responder de manera auditada:

```text
¿Qué producto es?
¿En qué almacén y piso está?
¿En qué rack está?
¿En qué compartimiento frontal está?
¿En qué profundidad está?
¿Cuánto stock teórico había?
¿Cuánto se contó?
¿Qué cantidad fue aprobada?
¿Quién lo contó y cuándo?
¿Qué ronda fue aprobada?
```

---

# 8. Mapa de cambios esperado en el repositorio

## Base de datos

```text
prisma/schema.prisma
prisma/migrations/*
prisma/seed.ts
```

## Dominio y acceso a datos

```text
src/server/domain/locations/*
src/server/domain/inventory/*
src/server/repositories/*
src/server/services/inventory/*
src/lib/types.ts
```

## APIs nuevas

```text
src/app/api/warehouses/*
src/app/api/floors/*
src/app/api/zones/*
src/app/api/racks/*
src/app/api/positions/*
src/app/api/product-locations/*
src/app/api/sessions/[id]/positions/*
src/app/api/sessions/[id]/rounds/*
src/app/api/sessions/[id]/review/*
src/app/api/movements/*
```

## UI nueva

```text
src/app/(app)/locations/*
src/app/(app)/racks/[id]/designer/*
src/app/(app)/racks/[id]/view/*
src/app/(app)/products/[id]/locations/*
src/components/locations/*
src/components/rack-designer/*
src/components/inventory-v2/*
```

## Infraestructura y pruebas

```text
src/**/*.test.ts
tests/integration/*
tests/e2e/*
.github/workflows/ci.yml
docs/adr/*
```

---

# 9. Contratos principales de API

## Iniciar una posición

```json
POST /api/sessions/{sessionId}/positions/{positionId}/start
{
  "operationId": "uuid"
}
```

Respuesta:

```json
{
  "sessionPositionId": "uuid",
  "round": {
    "id": "uuid",
    "number": 1,
    "status": "OPEN"
  },
  "position": {
    "code": "AP-P01-R003-C07-D01",
    "path": "Piso 1 / Rack R003 / C07 / Frente"
  }
}
```

## Registrar conteo

```json
POST /api/sessions/{sessionId}/counts
{
  "operationId": "uuid",
  "positionId": "uuid",
  "countRoundId": "uuid",
  "productCode": "PROD-001",
  "packageId": "uuid",
  "packageCount": 4,
  "unitsPerPackage": 20,
  "looseQuantity": 3,
  "quantity": 83,
  "inputMethod": "CAMERA"
}
```

Validaciones:

- `quantity = packageCount × unitsPerPackage + looseQuantity`.
- La ronda pertenece a la posición.
- La posición pertenece a la sesión.
- El usuario puede operar la ronda.
- La sesión, posición y ronda están abiertas.
- `operationId` evita duplicidad.

## Completar posición

```json
POST /api/sessions/{sessionId}/positions/{positionId}/complete
{
  "roundId": "uuid",
  "operationId": "uuid",
  "emptyConfirmed": false,
  "notes": ""
}
```

---

# 10. Matriz de pruebas obligatorias

| Área | Caso | Tipo |
|---|---|---|
| Ubicación | Código de posición único | Integración |
| Rack | Compartimientos sin solapamiento | Unidad/propiedad |
| Rack | Vista frontal responsive | E2E/visual |
| Profundidad | Frente, centro y fondo independientes | Integración |
| Producto | Múltiples posiciones | Integración |
| Presentación | Cajas × factor + sueltos | Unidad |
| Sesión | Snapshot inmutable | Integración |
| Conteo | Idempotencia | Concurrencia |
| Conteo | Posición obligatoria | Integración |
| Conteo | Posición vacía | E2E |
| Asignación | Dos operadores compiten por posición | Concurrencia |
| Rondas | Reconteo no se suma | Integración |
| Cierre | Pendientes bloquean cierre | E2E |
| Seguridad | Matriz RBAC | Integración |
| Offline | Reintento después de reconexión | E2E |
| Migración | Base V1 → V2 | Integración |
| Exportación | Totales y detalle consistentes | Integración |

---

# 11. Riesgos de implementación y mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---:|---:|---|
| Intentar dibujar cada caja desde el inicio | Alta | Alta | Usar posición física como fuente de verdad; dibujo detallado opcional |
| Crear una cuadrícula rígida | Alta | Alta | Compartimientos con coordenadas normalizadas |
| Cambiar el esquema directamente en producción | Media | Crítica | Migraciones expansivas, backup y piloto |
| Duplicar conteos por rondas | Alta | Alta | `CountRound` y resultado aprobado explícito |
| Etiquetas ilegibles | Media | Alta | Piloto físico y QR versionado |
| Mala señal entre pisos | Alta | Alta | Cola offline e idempotencia |
| Datos maestros incompletos | Alta | Alta | Bandeja de productos sin posición y validación de importación |
| Diseños de rack cambian | Media | Alta | Versionado y desactivación, no borrado |
| Usuarios evitan escanear ubicación | Media | Alta | Posición obligatoria y UX rápida |
| Conteo demasiado lento | Media | Alta | Presentaciones, ubicación persistente y lector USB |
| Sobrecargar interfaz móvil | Media | Media | Flujo por pasos y vista operativa simplificada |

---

# 12. Elementos explícitamente fuera del primer alcance productivo

Estos elementos pueden añadirse después de cumplir el objetivo principal:

- Gemelo digital 3D fotorealista.
- Reconocimiento automático de cajas por visión artificial.
- Cálculo volumétrico automático.
- Rutas óptimas de picking avanzadas.
- Integración directa con impresoras Zebra mediante ZPL.
- RFID.
- Gestión completa de compras, ventas y despacho tipo WMS/ERP.
- Ubicación milimétrica exacta de cada caja individual.

No deben retrasar la capacidad principal de saber **posición física y cantidad**.

---

# 13. Checklist de revisión de cada Pull Request

- [ ] La tarea pertenece a una fase y criterio de aceptación.
- [ ] Incluye migración reversible o estrategia de rollback.
- [ ] No añade DDL en rutas de ejecución.
- [ ] Valida permisos en servidor.
- [ ] Valida entrada con Zod.
- [ ] Conserva idempotencia cuando corresponde.
- [ ] Añade o actualiza pruebas.
- [ ] No rompe sesiones V1.
- [ ] Incluye estados de carga, vacío y error.
- [ ] Es usable desde celular.
- [ ] Registra auditoría para acciones sensibles.
- [ ] Actualiza este documento y el changelog.

---

# 14. Registro de decisiones y avances

## Decisiones pendientes

| ID | Decisión | Opciones | Estado |
|---|---|---|---|
| D-01 | Nombre final de compartimiento | Compartimiento / módulo-nivel / celda | [ ] |
| D-02 | Profundidad estándar | 1, 2, 3 o libre por compartimiento | [ ] |
| D-03 | Conteo ciego por defecto | Ocultar cantidad / ocultar producto / mostrar todo | [ ] |
| D-04 | Fuente del stock teórico | Importación / ERP / manual | [ ] |
| D-05 | Política de asignación | Manual / autoasignación / mixta | [ ] |
| D-06 | Política de reconteo | Toda diferencia / umbral / decisión supervisor | [ ] |
| D-07 | Actualización al cerrar | Solo reporte / actualizar maestro / enviar ERP | [ ] |

## Historial de ejecución

| Fecha | Fase | Cambio realizado | Responsable | Evidencia |
|---|---|---|---|---|
| 2026-07-21 | 1 | Schema: UserRole enum, role/active en User, schema_version, DRAFT/CANCELLED. Migración expansiva. ensureDatabase() sin DDL. Repositorios creados. Feature flag. | Sistema | `prisma/schema.prisma`, `src/lib/db.ts`, `src/server/repositories/`, `src/lib/flags.ts` |
| 2026-07-21 | 2 | Roles en JWT/session. Guardas de permisos. Protección close/setup por rol. Vista usuarios en settings. Badge de rol en header. | Sistema | `src/lib/auth.ts`, `src/server/guards.ts`, `src/app/api/setup/route.ts`, `src/app/(app)/settings/page.tsx` |
| 2026-07-21 | 3 | Modelos Warehouse/Floor/Zone/Rack. CRUD APIs. Árbol de ubicaciones. Módulo en sidebar. Páginas de detalle. Importación CSV. | Sistema | `prisma/schema.prisma`, `src/server/repositories/location-repository.ts`, `src/app/api/warehouses/*`, `src/app/api/floors/*`, `src/app/api/zones/*`, `src/app/api/racks/*` |
| 2026-07-21 | 4 | Modelos RackCompartment/RackDepthSlot/StoragePosition. Diseñador de rack. RackFrontView SVG. Generación de posiciones. Códigos y QR de ubicación. | Sistema | `src/app/api/racks/[id]/design/*`, `src/app/api/racks/[id]/compartments/*`, `src/app/api/positions/*`, `src/components/locations/rack-front-view.tsx`, `src/app/(app)/locations/racks/[id]/designer/page.tsx` |

---

# 15. Próximo bloque recomendado

El primer bloque de trabajo debe abarcar únicamente:

1. Fase 0 completa.
2. ADR del modelo físico.
3. Migración base de Fase 1.
4. Roles mínimos de Fase 2.
5. CRUD de almacén, pisos, zonas y racks de Fase 3.

No se debe construir el diseñador visual antes de estabilizar esquema, seguridad y compatibilidad de datos.

