# Changelog

## 0.42.0 (2026-07-23)

### Added (Sesiones V2 — Zona, Persistencia, Flujo de Cajas)

- **Filtro por zona:** La creación de sesiones ahora admite alcance "Por zona" con checkboxes por zona dentro de cada piso. El backend implementa `scopeType: "zone"`.
- **Posiciones en progreso:** Las posiciones con status `IN_PROGRESS` ahora aparecen en una sección dedicada con botón "Reanudar". Al reanudar se reutiliza la ronda existente sin crear una nueva.
- **Flujo de cajas con pallet opcional:** El pallet es ahora opcional en la resolución de cajas. Si una importación no tiene pallets, se salta directamente al selector de cajas.
- **Filtro por importación:** La API de cajas ahora acepta `importId` sin `palletId` para devolver todas las cajas de una importación.
- **Destacar caja por posición:** Al resolver una caja, se muestra un badge verde "Esta posición" si el `expectedPosition` coincide con la posición activa.
- **UX móvil mejorada:** Botones con `min-h-[44px]`, selects más grandes, sticky header con nombre de sesión, barra inferior fija con acciones, `inputMode="decimal"`/`"numeric"` para teclado numérico.

### Changed

- La vista de escaneo V2 ahora muestra tres secciones: en progreso, pendientes y completadas.
- El flujo de conteo por caja ahora muestra importación → pallet (si existe) → cascada de selección.
- El backend de sesión V2 acepta `scopeType: "zone"` con handler completo.

## 0.41.0 (2026-07-23)

### Changed (Vista previa del rack)

- **Resumen operativo:** La vista de detalle ahora muestra compartimentos, posiciones activas, slots de profundidad y dimensiones del rack.
- **Vistas frontal y lateral:** Se presentan juntas antes de entrar al diseñador, con una tabla lateral que resume Frente, Centro y Fondo por compartimento.
- **Detalle desplegable:** Las posiciones se organizan por compartimento y profundidad mediante secciones expandibles, evitando saturar la pantalla.
- **Estados claros:** Se distingue visualmente entre racks listos para conteo y racks sin posiciones generadas, con acceso directo al diseñador.
- **Accesibilidad:** Se agregaron encabezados semánticos, tabla con `scope`, estados ARIA, foco visible y mensajes para estados vacíos y errores.

## 0.40.0 (2026-07-23)

### Changed (UX/UI del diseñador de racks)

- **Flujo guiado:** El diseñador ahora organiza el trabajo en tres pasos visibles: configurar, revisar y crear posiciones físicas.
- **Controles accesibles:** Campos con etiquetas asociadas, estados comunicados mediante `role=status`/`role=alert` y selección de compartimentos con mouse, `Tab`, `Enter` y `Espacio`.
- **Edición más clara:** La lista de compartimentos, la edición de nombres/códigos y la matriz física están agrupadas en un panel de revisión.
- **Vista previa mejorada:** La vista frontal y la vista lateral de profundidad tienen estados vacíos, instrucciones y una representación lateral interactiva de Frente/Centro/Fondo.
- **Aplicación segura:** Reaplicar la configuración rápida reemplaza el borrador con confirmación, bloquea la operación si existe stock o una sesión activa y evita generar compartimentos superpuestos.
- **Acciones diferenciadas:** Guardar el diseño y crear posiciones físicas son acciones separadas con mensajes claros sobre sus requisitos.

## 0.39.0 (2026-07-23)

### Changed (Vistas frontal y lateral lado a lado)

- **Canvas reducido:** El SVG frontal se redujo de 360px a 200px de alto mínimo.
- **Layout lado a lado:** La vista frontal y la vista lateral de profundidad ahora se muestran en dos columnas dentro del mismo card, ocupando cada una el 50% del ancho.
- **Vista lateral enriquecida:** Muestra barras verticales escalonadas por cada slot de profundidad (Frente/Centro/Fondo), botones para cambiar la profundidad activa, y datos del compartimento seleccionado (código, nombre, coordenadas, matriz y total de posiciones).
- **Placeholder sin selección:** Si no hay compartimento seleccionado, la vista lateral muestra un mensaje indicando que seleccione uno en la vista frontal.

## 0.38.0 (2026-07-23)

### Changed (Rediseño del diseñador de racks)

- **Configuración rápida como método principal:** La creación de compartimentos ahora se realiza principalmente desde el formulario "Configuración rápida" (niveles, columnas, filas apilado, profundidades), en lugar del dibujo manual en canvas.
- **Vista frontal simplificada:** El SVG frontal pasó de ser un editor interactivo (arrastrar, redimensionar, dibujar) a una vista representativa donde se seleccionan compartimentos con un clic para ver/editar sus propiedades.
- **Vista lateral de profundidad:** Se agregó una representación visual de los slots de profundidad (Frente/Centro/Fondo) debajo de la vista frontal, con botones para cambiar la profundidad activa.
- **Eliminadas herramientas complejas:** Se removieron los modos de dibujo, grid/snap, división, duplicación y redimensionamiento del canvas. La edición de geometría se hace exclusivamente desde la configuración rápida.
- **Mantenido:** inline editing de código/nombre, configuración de matriz interna (columnas × niveles × profundidades), undo/redo, eliminar, guardar, generar posiciones.

## 0.37.0 (2026-07-23)

### Added (Configuración rápida de compartimentos)

- **Configuración rápida en diseñador:** Nueva tarjeta "Configuración rápida" con campos Niveles, Columnas, Filas apilado y Profundidades. Al pulsar "Generar", crea compartimentos uniformes repartidos en todo el alto del rack sin necesidad de dibujar manualmente.
- **Prefijos configurables:** El código y nombre de cada compartimento se genera con prefijos editables (default `N` para código, `Nivel` para nombre).
- **Validación de límites:** Muestra el total de posiciones físicas antes de generar y rechaza matrices mayores a 1000 celdas.

## 0.36.0 (2026-07-23)

### Added (Selects cascada para conteo por cajas)

- **Selects cascada en modo caja:** Los tres campos de texto (Importación, Pallet, Caja) ahora se reemplazan por selects en cascada. Al seleccionar una importación se cargan sus pallets, al seleccionar un pallet se cargan sus cajas, y al seleccionar una caja se resuelve automáticamente.
- **Fallback manual:** Botón para alternar entre selects y escritura manual por si el usuario prefiere tipear los códigos.
- **Nuevos endpoints:** `GET /api/boxes/imports`, `GET /api/boxes/pallets?importId=X`, `GET /api/boxes/boxes?palletId=X` para alimentar los selects.
- **Renombrar compartimentos:** El diseñador de racks ahora permite editar el código y nombre de cada compartimento inline cuando está seleccionado.
- **Descripción de "Generar posiciones":** Se agregó una explicación debajo del botón indicando que crea ubicaciones físicas con código QR por cada celda de la matriz.

## 0.35.0 (2026-07-23)

### Added (Creación masiva de pisos, zonas y racks)

- **Campo "Cantidad" en formularios:** Al crear pisos, zonas o racks, ahora se puede especificar cuántos crear. Si la cantidad es mayor a 1, los campos "Código" y "Nombre" actúan como base y se generan elementos secuenciales (ej: "Rack 01", "Rack 02", "Rack 03" con códigos "R01", "R02", "R03").
- **Previsualización:** Se muestra una vista previa de los nombres que se crearán antes de confirmar.
- **Creación transaccional:** Las APIs `/api/floors`, `/api/zones` y `/api/racks` aceptan tanto un objeto individual como un array, creando todos los elementos en una sola transacción de base de datos.
- **Botón eliminar:** Cada almacén, piso, zona y rack ahora tiene un botón de eliminar (icono de papelera) que realiza un borrado lógico en cascada (desactiva el elemento y todos sus hijos).
- **APIs DELETE:** Nuevos endpoints `DELETE /api/warehouses/[id]`, `/api/floors/[id]`, `/api/zones/[id]` y `/api/racks/[id]` con confirmación y soft-delete transaccional.

## 0.34.0 (2026-07-22)

### Changed (Simplificación de códigos de posición)

- **Códigos más cortos y claros:** Se eliminó el prefijo `{almacén}-{piso}` del código de posición. El nuevo formato es `{rack}-{nivel}-{columna}-{fila}-{profundidad}`.
- **Prefijos únicos:** Cada segmento tiene un prefijo distintivo: `R` (rack), `N` (nivel/compartimento, antes `C`), `C` (columna), `F` (fila, antes `N`), `P` (profundidad, antes `D`).
- **Ejemplo:** `R003-N07-C03-F04-P01` (antes `AP-P01-R003-C07-D01-C03-N04`).
- **Unique constraint:** `code` ya no es único global; se reemplazó por `@@unique([rackId, code])`.
- **Migración automática:** Script que actualizó 12 depth slots, 6 compartimentos y 228 posiciones existentes al nuevo formato.
- **Código completo en exportación:** El prefijo de almacén/piso/zona se reconstruye al exportar, no se almacena en el código.

## 0.33.0 (2026-07-22)

### Added (Identificación por caja)

- **Modelos de caja:** Nuevas tablas `imports`, `pallets`, `boxes`, `box_products` para estructurar el contenido físico del almacén.
- **Importación de cajas:** `POST /api/boxes/import` recibe datos de importación, pallet, caja y producto desde Excel/CSV, creando registros faltantes automáticamente.
- **Resolución de caja:** `GET /api/boxes/resolve?import=X&pallet=Y&box=Z` identifica la caja y devuelve sus productos con cantidades esperadas y posición esperada.
- **Conteo por caja:** El endpoint `POST /api/sessions/v2/[id]/counts` acepta `boxIdentity` con `items` para registrar atómicamente una caja completa con hasta 3 productos.
- **Prevención de doble conteo:** La caja no puede registrarse dos veces en la misma ronda (unique constraint `countRoundId + boxId`).
- **Formulario en UI:** La página de escaneo V2 ahora tiene modo "Caja" con campos de importación, pallet y número de caja, resolución automática y registro de cantidades por producto.
- **Compatibilidad:** El modo "Producto" legacy sigue disponible mediante toggle en la misma pantalla.

### Changed

- El conteo ahora puede identificar productos por `importación + pallet + caja` en lugar de código de barras.
- Los errores de sesión, posición, ronda y caja se retornan con mensaje descriptivo y status 400.

## 0.32.1 (2026-07-22)

### Fixed

- **Diseñador:** Los errores de API o base de datos ya no se muestran incorrectamente como “Rack no encontrado”.
- **Migración de reparación:** Recupera tablas de productos y stock por ubicación cuando la migración histórica fue marcada como aplicada sin crear las tablas.

## 0.32.0 (2026-07-22)

### Fixed

- **Edición de posiciones vacías:** Una posición sin stock positivo ya no bloquea cambios de matriz, código o geometría.
- **Protección de sesiones activas:** Las posiciones usadas por sesiones de inventario abiertas siguen protegidas aunque no tengan stock.
- **Desactivación segura:** El botón maestro solo desactiva posiciones vacías y la operación es transaccional.
- **Stock inactivo:** Ya no se dejan posiciones con stock positivo archivadas silenciosamente durante la edición.
- **Stock cero:** Las relaciones con `theoreticalStock = 0` no se consideran ocupación física.

## 0.31.0 (2026-07-22)

### Added (Matriz física de posiciones)

- **Columnas y niveles por compartimiento:** Cada separación puede tener múltiples columnas, niveles verticales y profundidades Frente/Centro/Fondo.
- **Posiciones tridimensionales:** Se genera una ubicación por combinación `columna × nivel × profundidad`.
- **Códigos físicos:** Nuevas posiciones usan el formato `...-D01-C01-N01` y conservan códigos legacy existentes.
- **Editor interactivo de celdas:** La vista frontal muestra columnas y niveles, permite seleccionar una celda y configurar la profundidad activa.
- **Protección de estructura:** No se permite reducir columnas, niveles o profundidades cuando existen posiciones creadas.

### Changed

- `StoragePosition` ahora almacena `columnIndex` y `stackIndex`.
- `RackCompartment` ahora almacena `columnCount` y `stackLevels`.
- La generación de posiciones es transaccional e idempotente por celda.
- La vista de detalle del rack muestra los códigos de las posiciones físicas generadas.

## 0.30.0 (2026-07-22)

### Added (Fase 4 — Diseñador visual)

- **Canvas SVG interactivo:** Selección, movimiento con mouse/touch y redimensionado mediante ocho controles.
- **Creación visual:** Herramienta para dibujar un rectángulo en el espacio libre y completar código/nombre en el formulario.
- **Grid y snap opcionales:** Ajuste configurable a una cuadrícula de 100 unidades.
- **Undo/redo y atajos:** `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, `Ctrl/Cmd+D`, `Delete` y `Ctrl/Cmd+S`.
- **Borrador local:** Los gestos no generan peticiones durante el movimiento; el diseño se guarda como una operación transaccional.

### Changed

- **Guardado atómico del diseño:** `PUT /api/racks/[id]/design` valida todo el conjunto, controla `rack.version` y responde conflicto `409` ante cambios concurrentes.
- **Validación backend reforzada:** PATCH verifica pertenencia al rack, límites, solapamientos, esquema y códigos históricos.
- **Protección de posiciones activas:** No se permite eliminar, dividir o cambiar el código de un compartimiento con posiciones activas.
- **Escala SVG estable:** La vista utiliza las dimensiones reales del rack o el espacio lógico `10000×10000` como fallback.
- **Pruebas de geometría:** Añadidas pruebas de snap, movimiento, redimensionado y validación del conjunto completo.

## 0.29.0 (2026-07-22)

### Added

- **Botón "Añadir rack" en la página de zona:** Nuevo formulario inline para crear racks directamente desde la UI de cada zona, eliminando la necesidad de usar la importación masiva o crear racks programáticamente.
- **Flujo completo de creación de ubicaciones:** Ahora es posible crear toda la jerarquía (Almacén → Piso → Zona → Rack → Compartimentos → Posiciones) desde la interfaz de usuario.

### Changed

- Texto de ayuda actualizado: "Sin racks. Haz clic en 'Añadir rack' para crear uno nuevo."

## 0.28.0 (2026-07-21)

### Added (Fase 4 — Pruebas)

- **Vitest:** Configurado Vitest para pruebas unitarias de lógica de dominio.
- **rack-validation.ts:** Módulo con lógica pura extraíble para tests: `rectsOverlap`, `isWithinBounds`, `validateCompartment`, `splitHorizontal`, `splitVertical`, `duplicateCompartment`, `generatePositionCode`, `areCoordsValid`.
- **32 pruebas unitarias** cubriendo:
  - Validación de solapamiento de rectángulos (overlap, adjacent, containment).
  - Validación de límites del rack (bounds, negative coords, exact fit).
  - Validación de compartimento contra existentes (overlap, bounds, duplicate code, self-update).
  - División horizontal (half height, odd height, coordinate preservation).
  - División vertical (half width, odd width, coordinate preservation).
  - Duplicación (offset, clamping to bounds).
  - Generación de códigos de posición.
  - Validación de coordenadas 0–10000.
  - Escenarios del PLAN: rack 2 módulos 3 niveles, distinto ancho, niveles diferentes, sin profundidad, 3 profundidades, posición deshabilitada.
- Scripts `pnpm test` y `pnpm test:watch` funcionales.

## 0.27.0 (2026-07-21)

### Added (Fase 4 — Diseñador de racks — pendientes)

- **Herramienta dividir horizontal:** Divide un compartimento seleccionado en dos mitades verticales (A/B).
- **Herramienta dividir vertical:** Divide un compartimento seleccionado en dos mitades horizontales (Izq/Der).
- **Duplicar compartimento:** Crea una copia del compartimento seleccionado con offset de 50px y sufijo `-DUP`.
- **Eliminar (soft delete):** Botón para desactivar compartimentos (active=false) con confirmación.
- **Selección de compartimento:** Click en la lista para habilitar herramientas de edición.
- **Validación de límites del rack:** Al crear compartimentos se valida que x+width ≤ rack.widthMm y y+height ≤ rack.heightMm.
- **Auto-incremento de versión:** Cada creación, modificación o eliminación de compartimento incrementa `rack.version`.
- **PATCH/DELETE endpoints:** API actualizada con PATCH para modificar y DELETE para desactivar compartimentos.

## 0.26.0 (2026-07-21)

### Added (Fase 10 — pendientes)

- **Toggle teórico/contado:** La página "Dónde está" ahora tiene botones para filtrar por todo, solo stock teórico o solo contado.
- **Estado REVIEW en SessionStatus:** Nuevo valor `REVIEW` en enum `SessionStatus` requerido antes de `CLOSED` para sesiones V2.

### Added (Fase 11 — pendientes)

- **Flujo REVIEW → CLOSED:** La API PATCH de sesión V2 ahora requiere pasar por estado `REVIEW` antes de cerrar. Valida que todas las posiciones estén aprobadas o excluidas.
- **Bloqueo de cierre con pendientes:** Si hay posiciones sin resolver, el cierre retorna error con el conteo de pendientes.
- **Snapshot de cierre:** Al cerrar sesión V2 se registra en audit log el número de posiciones aprobadas.
- **Export mejorado:** El Excel ahora incluye dos hojas: "Detalle eventos" (con operador, método, fechas) y "Resumen por posición" (teórico, contado, diferencia, resultado).

### Added (Fase 12 — pendientes)

- **Cola offline con IndexedDB:** Nuevo hook `useOfflineQueue` que almacena operaciones en IndexedDB con estados `PENDING → SYNCING → SYNCED → ERROR`. Sincroniza automáticamente al recuperar conexión.
- **OfflineBanner:** Componente que muestra el estado de la cola offline (pendientes de sincronizar o sin conexión) con botones de sincronizar y limpiar.
- **Migración v5:** Nuevo enum value `REVIEW` en `SessionStatus`.

### Fixed

- `SessionStatus` ahora incluye `REVIEW` en schema y tipos.
- V2 session PATCH actualizado para manejar el flujo DRAFT → OPEN → PAUSED → REVIEW → CLOSED.

## 0.25.0 (2026-07-21)

### Added (Fase 10 — Vista frontal, lateral y búsqueda física)

- **DepthLateralView:** Nuevo componente que renderiza la profundidad del rack (Frente/Centro/Fondo) con productos y cantidades.
- **Página "Dónde está":** `/products/[id]/where` muestra todas las posiciones de un producto con ruta jerárquica, cantidades y enlace directo al rack.
- **Vista frontal enriquecida:** La página de detalle de rack ahora muestra datos de productos y stock teórico en cada compartimento.

### Added (Fase 11 — Conciliación, cierre, movimientos y exportación)

- **Tablero de revisión V2:** `/sessions/v2/[id]/review` con diferencias por posición, comparación teórico vs contado, estados (coincide/faltante/sobrante), y acciones aprobar/rechazar ronda.
- **API de revisión:** `GET /api/sessions/v2/[id]/review` devuelve diferencias calculadas. `POST` permite approve (→ APPROVED) o reject (→ RECOUNT_REQUIRED).
- **Exportación Excel:** `GET /api/sessions/v2/[id]/export` genera archivo .xlsx con posición, producto, cantidad, ronda y estado.
- **Movimientos entre posiciones:** `POST /api/movements` para transferir stock teórico entre posiciones con motivo (replenishment, reordering, correction, transfer). Registra log `[MOVEMENT]`.
- **Resumen automático:** Totales de posiciones completadas, coincidentes y con diferencia en la cabecera de revisión.

### Added (Fase 12 — Offline, tiempo real, observabilidad y resiliencia)

- **Service Worker:** `public/sw.js` con estrategia cache-first para assets estáticos y network-first para APIs. Instalable como PWA.
- **Health endpoint:** `GET /api/health` verifica conectividad con base de datos y retorna estado general.

### Infrastructure

- 60 rutas totales (30 páginas, 30 APIs).

## 0.22.0 (2026-07-21)

### Added (Fase 0 — Línea base, seguridad y gobernanza)

- **Protección destructiva:** Nueva variable `DISABLE_DESTRUCTIVE_API` en `.env.example` (default `true`). Cuando está activa, `DELETE /api/setup` y carga demo responden 403.
- **Auditoría de acciones destructivas:** `DELETE /api/setup` y cierre de sesión registran `[AUDIT]` log con userId y email.
- **ADR documents:** Creados `docs/adr/ADR-001` (fuente única esquema), `ADR-002` (rack irregular), `ADR-003` (eventos/rondas), `ADR-004` (compatibilidad V1/V2).
- **Scripts de prueba:** Añadidos `test` (vitest), `typecheck` (tsc --noEmit) a package.json.

### Added (Fase 2 — Usuarios, roles y control operativo)

- **Anulación con motivo:** `POST /api/counts/[id]/reverse` ahora requiere motivo (mín 5 caracteres), restringe anulación al autor dentro de ventana de 30 min o a supervisor/admin.
- **Auditoría de cierre:** Log `[AUDIT]` al cerrar sesión con userId.

### Added (Fase 4 — Diseñador de racks y posiciones)

- **Validación de solapamientos:** Al crear compartimentos se verifica que no solapen con existentes (coordenadas normalizadas).

### Added (Fase 8 — Conteo ubicación → producto → cantidad)

- **Detección LOC: vs producto:** El input de escaneo en V2 detecta si el código es de ubicación (`LOC:v1:`) o de producto, con feedback visual (etiqueta color ambar/teal).
- **Anulación en UI:** Botón "Deshacer último" en la página V2 scan con diálogo de motivo.
- **Focus automático:** El input de escaneo recupera foco después de cada registro.

### Infrastructure

- Prisma Client regenerado.
- 28 rutas de página, 26 rutas de API.

## 0.21.0 (2026-07-21)

### Added (Fase 7 — Sesiones de inventario V2 por posición)

- **Modelos V2:** `SessionPosition` (posición en sesión con estados PENDING→COMPLETED), `SessionStockSnapshot` (stock teórico congelado por producto+posición), `CountRound` (rondas de conteo con estados OPEN→APPROVED), `CountIncident` (incidencias reportadas).
- **Enums:** `PositionStatus`, `CountRoundStatus`.
- **CountEvent extendido:** Nuevos campos opcionales `positionId`, `countRoundId`, `packageCount`, `unitsPerPackage`, `looseQuantity`, `reversedById`, `reversalReason` (compatible V1).
- **API de creación V2:** `POST /api/sessions/v2` con alcance `total`, `floor`, `rack` o `positions`. Crea session_positions y congela snapshot desde `product_location_stocks`.
- **API de detalle V2:** `GET /api/sessions/v2/[id]` con posiciones, estado, rondas.
- **API de inicio de posición:** `POST /api/sessions/v2/[id]/positions/[positionId]` — inicia ronda, valida estado, devuelve snapshot.
- **Control de estado:** Sesiones V2 comienzan en `DRAFT`, se abren con PATCH.
- **Migración expansiva:** `20260721150000_v4_sessions_v2` con 4 nuevas tablas, índices y columnas en count_events.

### Added (Fase 8 — Conteo ubicación → producto → cantidad)

- **API de conteo V2:** `POST /api/sessions/v2/[id]/counts` con validación de sesión abierta, posición activa, ronda abierta, idempotencia por `operationId`. Soporta `packageCount`, `unitsPerPackage`, `looseQuantity`.
- **API de completar posición:** `POST /api/sessions/v2/[id]/positions/[positionId]/complete` — cierra ronda como SUBMITTED, marca posición COMPLETED. Soporta `emptyConfirmed` para posición vacía.
- **API de incidencias:** `POST /api/sessions/v2/[id]/positions/[positionId]/incidents` para reportar problemas.
- **Página de escaneo V2:** `/sessions/v2/[id]/scan` con flujo completo: seleccionar posición → escanear producto → registrar cantidad (cajas+sueltos o directa) → completar posición.
- **Estados de UI:** Posiciones pendientes, activa (con barra fija), completadas; formulario de cantidad con modo cajas+sueltos.

### Added (Fase 9 — Colaboración, asignaciones y reconteos)

- **Rondas de conteo:** Cada inicio de posición crea una `CountRound`. Los eventos se asocian a la ronda activa. Al completar, la ronda se envía (`SUBMITTED`).
- **Asignación de operador:** Al iniciar una posición, el usuario autenticado queda como `assignedToId` / `operatorId`. La sesión `auth.user.id` reemplaza al operador por nombre en V2.
- **Prevención de duplicidad:** Una posición completada no acepta nuevos eventos. Una ronda abierta solo acepta eventos del mismo operador.

### Infrastructure

- Prisma Client regenerado con 4 nuevos modelos y 2 enums.
- 11 nuevas rutas de API y 1 nueva página.

## 0.18.0 (2026-07-21)

### Added (Fase 5 — Etiquetas y códigos de ubicación)

- **Componente `LocationLabel`:** Etiqueta imprimible con QR + código legible + ruta jerárquica del almacén. QR usa prefijo `LOC:v1:{uuid}`.
- **API de etiquetas:** `GET /api/positions/labels` devuelve datos formateados para etiquetas, con filtros por rack, piso o posición individual.
- **Página de impresión masiva:** `/locations/labels` con grilla responsive de etiquetas, búsqueda por código y soporte `@media print`.
- **Botón "Etiquetas"** en la página principal de Ubicaciones para acceso rápido a la impresión.

### Added (Fase 6 — Productos, presentaciones y stock por ubicación)

- **Modelos de producto extendidos:** `ProductBarcode` (múltiples códigos por producto), `ProductPackage` (presentaciones con cantidad base), `ProductLocationStock` (stock teórico por posición física).
- **`barcode` opcional en `Product`:** El campo `barcode` ahora es nullable; los códigos adicionales se registran en `product_barcodes`.
- **Migración expansiva:** `20260721140000_v3_products_barcodes_packages_stock` crea las tres nuevas tablas con índices y claves foráneas.
- **API de stock por posición:** `GET/POST/DELETE /api/product-locations` para asignar, consultar y eliminar stock teórico por producto+posición.
- **Importación de stock:** `POST /api/product-locations/import` con validación de productos y posiciones existentes, upsert por lote.
- **Página de ubicaciones de producto:** `/products/[id]/locations` con tabla de posiciones asignadas, selector para agregar nuevas, indicador de posición primaria y total calculado.
- **Acceso directo:** Botón "Ubicación" en la tabla de productos que navega a la gestión de stock por posición.

### Infrastructure

- Prisma Client regenerado con 3 nuevos modelos (`ProductBarcode`, `ProductPackage`, `ProductLocationStock`).

## 0.16.0 (2026-07-21)

### Added (Fase 3 — Estructura física del almacén)

- **Modelos de ubicación:** Nuevas tablas `warehouses`, `floors`, `warehouse_zones`, `racks` con relaciones jerárquicas y códigos únicos por padre.
- **Migración expansiva:** `20260721120000_v2_locations` crea toda la estructura de ubicaciones.
- **CRUD completo de ubicaciones:** APIs REST para almacenes, pisos, zonas y racks con validación Zod y guards de permisos.
- **Árbol de ubicaciones:** Endpoint `GET /api/warehouses` que devuelve toda la jerarquía (almacén → pisos → zonas → racks).
- **Importación CSV/JSON de estructura:** `POST /api/racks/import` con upsert de almacenes, pisos, zonas y racks por lote.
- **Módulo "Ubicaciones" en sidebar:** Nueva sección en la navegación principal con vista de árbol.
- **Páginas de detalle:** Vistas para almacén (con pisos), piso (con zonas y racks), rack (con vista frontal y posiciones).
- **Alta rápida:** Formularios inline para crear almacenes, pisos y zonas desde la UI.

### Added (Fase 4 — Diseñador de racks y posiciones)

- **Modelos de compartimientos:** Tablas `rack_compartments` (coordenadas normalizadas x, y, width, height), `rack_depth_slots` (profundidad Frente/Centro/Fondo/CUSTOM), `storage_positions` (código + QR único).
- **Componente `RackFrontView`:** SVG responsive que renderiza compartimientos proporcionalmente según coordenadas normalizadas (0–10000).
- **Página diseñador de rack:** Interfaz para crear compartimentos con posición, tamaño y código. Guarda diseño como JSON en el rack.
- **Generación automática de posiciones:** Endpoint `POST /api/positions` que crea `StoragePosition` por cada combinación compartimento + slot de profundidad, con código `{WH}-{FL}-{RACK}-{COMP}-{SLOT}` y QR `LOC:v1:{uuid}`.
- **API de diseño:** `PUT/GET /api/racks/[id]/design` para guardar y recuperar el diseño del rack.
- **API de posiciones:** `GET /api/positions?rackId=` para listar posiciones activas por rack.

### Infrastructure

- Prisma Client regenerado con 7 nuevos modelos y enum `DepthKind`.
- Migración de esquema creada en `prisma/migrations/20260721120000_v2_locations/`.

## 0.14.0 (2026-07-21)

### Added (Fase 1 — Arquitectura de datos y migración segura)

- **Roles de usuario:** Nuevo enum `UserRole` (`ADMIN`, `SUPERVISOR`, `COUNTER`, `VIEWER`) añadido al esquema Prisma.
- **Nuevos campos en `User`:** `role` con valor por defecto `COUNTER` y `active` (`boolean`).
- **`schema_version` en sesiones:** Nuevo campo `schema_version` (default `1`) en `inventory_sessions` para diferenciar sesiones V1 y V2.
- **Estados `DRAFT` y `CANCELLED`:** Añadidos al enum `SessionStatus` para el flujo de creación controlada.
- **Migración expansiva:** Nueva migración `20260721100001_v1_roles_schema_version` que agrega columnas y enums sin romper datos existentes.
- **Fuente única de esquema:** `ensureDatabase()` eliminó todo DDL — ahora solo verifica conectividad (`SELECT 1`). El esquema es gestionado exclusivamente por Prisma Migrate.
- **Capa de repositorios:** Nueva carpeta `src/server/repositories/` con repositorios tipados:
  - `product-repository.ts` — consultas de productos.
  - `session-repository.ts` — consultas y creación de sesiones.
  - `count-repository.ts` — eventos de conteo, idempotencia y totales.
  - `operator-repository.ts` — operadores y participantes.
- **Feature flag:** Nueva variable `INVENTORY_LOCATION_V2_ENABLED` (default `false`) en `.env.example` y utilidad `src/lib/flags.ts`.

### Added (Fase 2 — Usuarios, roles y control operativo)

- **Roles en autenticación:** Auth.js (NextAuth) ahora incluye `role` en el JWT y en la sesión. El seed crea al usuario `admin@stockscan.app` con rol `ADMIN`.
- **Guardas de permisos:** Nueva función `requireRole(...roles)` en `src/server/guards.ts` que protege rutas de API del lado servidor.
- **Protección de acciones destructivas:**
  - `DELETE /api/setup` restringido a rol `ADMIN`.
  - `POST /api/setup` (cargar demo) restringido a rol `ADMIN`.
  - `POST /api/sessions/[id]/close` restringido a `SUPERVISOR` o `ADMIN`.
- **Vista de usuarios y roles:** Nueva sección "Usuarios y roles" en Configuración (`/settings`) que lista usuarios, su rol y estado.
- **Indicador visual de rol:** El header de la app muestra el rol del usuario autenticado (Admin, Supervisor, Contador, Visor).

### Changed

- Sesiones nuevas se crean con `schema_version = 1` para compatibilidad V1.
- El seed asigna `role: "ADMIN"` al usuario de prueba.

### Infrastructure

- Migración de esquema creada manualmente en `prisma/migrations/20260721100001_v1_roles_schema_version/`.
- Prisma Client regenerado con los nuevos tipos y enums.

## 0.13.0 (2026-07-21)

### Added
- Generación de códigos QR como alternativa a Code 128 para etiquetas pequeñas.
- Selector de formato (Código de barras / Código QR) en la página de impresión masiva y en la vista de etiqueta individual.
- Configuración de formato predeterminado en la página de Configuración (`/settings`), con persistencia en localStorage.
- Advertencia visual cuando se selecciona Code 128 con un tamaño de etiqueta menor a 40 mm de alto, sugiriendo usar QR.

### Changed
- `BarcodeLabel` ahora acepta prop `format` (`"CODE128"` | `"QR"`) para elegir el tipo de código.
- En modo compact de Code 128 se aumentó el ancho de línea (`width: 1.6`) para mejorar legibilidad en etiquetas chicas.
- Dependencia agregada: `qrcode` para generación de QR en cliente.

### Fixed
- Varios warnings de lint en componentes existentes (`app-products.tsx`, `use-mobile.ts`).

## 0.12.0 (2026-07-20)

### Fixed
- Cámara no detectaba códigos de barras: contenedor del video ahora tiene `min-h-[40vh]` y `min-h-0` en el flex container para garantizar dimensiones no-cero antes de inicializar ZXing.
- Se eliminó `disabled={!!pending}` que causaba re-renderizados innecesarios en el scanner durante la confirmación.
- Cámara arranca automáticamente al entrar al fullscreen (eliminado el paso extra de "Activar cámara" dentro del overlay).
- Estado de inicialización: spinner "Iniciando cámara..." mientras se negocian permisos.
- Manejo de errores de cámara con mensaje visible y botón "Reintentar".

### Changed
- `BarcodeScanner` ahora acepta prop `autoStart` para iniciar automáticamente al montarse.
- Vista idle rediseñada con botón "Abrir cámara" con ícono grande y texto descriptivo.

## 0.11.0 (2026-07-20)

### Added
- Selector de tamaño de etiqueta en la página de impresión masiva (100×75, 100×50, 75×50, 75×25, 50×25 mm y personalizado).
- CSS `@page` dinámico según el tamaño seleccionado para impresión térmica one-label-per-page.
- Panel de ayuda desplegable con instrucciones paso a paso para configurar la TSC TE200.

### Changed
- En impresión, cada etiqueta se renderiza con `page-break-after: always` para que el alimentador de la térmica avance correctamente.

## 0.10.0 (2026-07-20)

### Added
- Cámara en pantalla completa al escanear: overlay fijo `z-50` con video ocupando todo el viewport.
- Barra superior flotante con botón "Detener" y estado de cámara activa.
- Prompt de confirmación de cantidad sobre el feed de cámara (fondo semi-transparente).
- Botón toggle para ingreso manual directamente desde la vista de cámara completa.
- Vista idle (cámara apagada) con card de activación tipo "dashed border" y formulario manual.

### Changed
- `BarcodeScanner` ahora expone `onActiveChange` para que el padre controle el layout fullscreen.
- Botón "Activar cámara" movido dentro del componente como overlay sobre el placeholder.

## 0.9.0 (2026-07-20)

### Added
- Impresión masiva de etiquetas: checkboxes en tabla de productos + botón "Imprimir (N)".
- Página `/products/labels` que renderiza etiquetas en grilla responsive (2–4 columnas).
- Botones "Imprimir página" (lista paginada actual) e "Imprimir todo" (catálogo completo).
- Selector de productos por IDs en `GET /api/products?ids=...` para carga eficiente en la página de etiquetas.
- Estilos `@media print` para impresión de etiquetas adhesivas.

## 0.8.0 (2026-07-20)

### Fixed
- API de productos ya no tiene límite de 500 registros; ahora devuelve todos los productos.
- Importación por lote ya no causa bucle infinito al usar `useCallback`/`onComplete`.
- Barra de progreso de importación ahora muestra el porcentaje numérico visible dentro de la barra.

### Added
- Selector de items por página en la lista de productos (20, 50, 100, 250, 500).
- Contador de resultados visibles vs totales en el pie de la tabla de productos.

## 0.7.0 (2026-07-20)

### Added
- Paginación completa en la lista de productos (15 por página) con componente shadcn/ui Pagination.
- Navegación por números de página, « Anterior / Siguiente » y elipsis para rangos grandes.
- Al buscar, el paginado se resetea automáticamente a la página 1.
- Reemplazado el scroll infinito por paginación con controles visuales.

## 0.6.0 (2026-07-20)

### Added
- Modal de progreso de importación con barra de progreso, contadores en tiempo real y cancelación.
- Importación por lotes: los productos se envían al API en batches de 200 para mostrar progreso en archivos grandes.
- Vista de errores detallada al finalizar la importación con lista scrollable de errores por fila.

### Fixed
- El mensaje de error ya no se limita a 3 errores; ahora se muestran todos en la lista de resultados.

## 0.5.0 (2026-07-20)

### Added
- Nuevo flujo "Scan & Enter Quantity": al escanear un código se muestra un prompt para ingresar la cantidad real contada antes de registrar.
- Soporte para barcode opcional (`NULL` en base de datos) cuando el producto no tiene código de barras numérico.

### Changed
- El campo `barcode` en productos ya no es obligatorio. Si no se provee, se guarda como `NULL`.
- El escáner ya no registra automáticamente al detectar un código; primero pide confirmación con cantidad.
- Productos sin barcode muestran "—" en las tablas de catálogo y resultados.
- Etiqueta de código de barras: cuando no hay barcode, usa el código interno del producto como valor CODE128.

### Fixed
- Filtro de búsqueda en catálogo y resultados ahora maneja correctamente valores `null`.

## 0.4.0 (2026-07-20)

### Added
- Importación de productos desde Excel (.xlsx / .xls) además de CSV.
- Botón "Plantilla" en Productos que descarga un archivo Excel de ejemplo con las columnas requeridas.
- Módulo de Configuración (`/settings`) con acceso desde el sidebar.
- Botón "Borrar todos los datos" en Configuración con confirmación de dos pasos.
- Botón "Cargar demo" en Configuración cuando el catálogo está vacío.
- Endpoint `DELETE /api/setup` para limpiar todas las tablas del sistema.

### Changed
- Límite de importación aumentado de 5000 a 6500 productos por lote.
- Footer de importación actualizado con formato y límite visibles.

### Fixed
- Warning de consola "Base UI: expected a native `<button>`" silenciado agregando `nativeButton={false}` en todos los `Button` que usan `render` con `<Link>`.

## 0.3.0 (2026-07-20)

### Added
- Vista de sesión rediseñada con navegación por tabs (Resumen, Escanear, Resultados, Actividad).
- Ruta dedicada para escáner (`/sessions/[id]/scan`) con cámara y entrada manual.
- Ruta dedicada para resultados (`/sessions/[id]/counts`) con tabla de conteos y búsqueda.
- Ruta dedicada para actividad (`/sessions/[id]/activity`) con timeline de eventos.
- Escáner inteligente con selector de sesión: si hay 1 sesión activa va directo; si hay varias, muestra un Sheet para elegir.
- Acceso directo "Escanear" en el sidebar (sección Módulos) y en el dashboard (hero + acceso rápido).
- `SessionDataProvider` (Context) para estado compartido entre páginas y polling automático cada 2s.
- Componentes UI extraídos: `SessionHero`, `SessionMetrics`, `SessionParticipants`, `ScanView`, `CountsView`, `ActivityView`, `SessionJoinForm`, `EmptyState`, `SessionPickerSheet`.
- Estados de UI completos: skeletons durante carga, empty states, sesión cerrada, error banner, toast de éxito.
- Soporte PWA: `manifest.webmanifest`, iconos SVG 192×192 y 512×512, meta tags `apple-mobile-web-app` y `viewport-fit: cover`.

### Changed
- Vista de sesión migrada de un componente monolítico (`session-client.tsx`, 463 líneas) a 4 rutas independientes con componentes reutilizables.
- Sidebar: "Escanear" usa hook `useScanTarget` que detecta sesiones activas y redirige o muestra selector según corresponda.
- Dashboard: botón "Escanear ahora" en hero y card "Escanear" en acceso rápido con el mismo comportamiento inteligente.
- Layout `(app)/sessions/[id]/` unificado con `SessionDataProvider`, navegación por tabs, modal de identificación y toast global.
- Componentes UI instalados: Badge, Label, Table (shadcn/ui).

### Fixed
- Variables CSS de shadcn restauradas en `:root` (`--background`, `--foreground`, `--card`, `--primary`, etc.) que causaban hover y active states invisibles en el sidebar.
- Estilos globales del body (`font-family: Arial`, `background: radial-gradient`) eliminados para evitar sobrescribir componentes shadcn.
- Clases CSS custom (`.btn`, `.input`, `.label`, `.badge`, `.surface`, `.table-wrap`) migradas a componentes shadcn en 7 archivos.
- `asChild` reemplazado por `render` prop en componentes `@base-ui/react`.

### Infrastructure
- `public/manifest.webmanifest` con configuración PWA completa.
- Iconos en `public/icons/icon-192.svg` y `public/icons/icon-512.svg`.
- Hook `src/hooks/use-scan-target.ts` para detección de sesiones activas.
- Componentes organizados en `src/components/session/` con barrel export.

## 0.2.0 (2026-07-20)

### Added
- Navegación modular con sidebar colapsable (shadcn/ui Sidebar).
- Dashboard con métricas globales y acceso rápido a módulos.
- Módulo de Productos: catálogo, registro e importación CSV.
- Módulo de Sesiones: creación, listado y métricas de conteo.
- Componentes UI: Button, Input, Card, Separator, Avatar, DropdownMenu, Tooltip, Sheet, Skeleton.
- Autenticación con Auth.js (NextAuth v5) y Credentials provider.
- Página de login protegida con redirección automática.
- Sesión de usuario persistente con JWT.
- Prisma ORM 7 como capa de base de datos con driver adapter PostgreSQL.
- Esquema de base de datos versionado con migraciones Prisma.
- Seed de base de datos con usuario de prueba (`admin@stockscan.app` / `admin123`).
- 5 productos de demostración en el seed.
- Conexión a Neon PostgreSQL con SSL verify-full.
- Menú de usuario en el header con indicador de sesión y botón de cierre.
- Proxy de autenticación (Next.js 16) para proteger rutas privadas.

### Changed
- UI rediseñada con sidebar de navegación por módulos en lugar de una sola ventana.
- Layout separado en route group `(app)` para páginas autenticadas con sidebar.
- Header unificado con trigger de sidebar y menú de usuario.
- Migrado de `postgres.js` raw a Prisma ORM para schema management y migraciones.
- Actualizado `.gitignore` para excluir solo archivos `.env` específicos.
- Renombrado `middleware.ts` a `proxy.ts` por compatibilidad con Next.js 16.
- Eliminados componentes antiguos `app-shell.tsx` y `home-client.tsx`.

### Infrastructure
- shadcn/ui inicializado con Tailwind CSS v4 y `@base-ui/react`.
- Prisma Client generado en `src/generated/prisma/`.
- `prisma.config.ts` con datasource, schema y seed configuration.
- Scripts npm: `db:generate`, `db:migrate`, `db:seed`, `db:studio`, `db:push`.
- Dependencias añadidas: `@prisma/client`, `@prisma/adapter-pg`, `prisma`, `next-auth`, `@auth/prisma-adapter`, `bcryptjs`, `pg`, `tsx`, `dotenv`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`.

## 0.1.0 (MVP inicial)

- Catálogo de productos con código interno, barcode, descripción y stock teórico.
- Importación masiva desde CSV.
- Generación e impresión de etiquetas Code 128 con JsBarcode.
- Sesiones de inventario con fotografía de stock teórico.
- Escaneo por cámara con ZXing.
- Lectores USB y entrada manual.
- Conteo multiusuario con sincronización cada 2 segundos.
- Bitácora append-only con anulación de movimientos.
- Comparativa stock teórico vs físico.
- Cierre de sesión.
