# Changelog

## 0.56.0 (2026-07-24)

### Changed

- **Validación de productos:** Los conflictos por códigos repetidos ahora muestran la importación, pallet y caja exactos, evitando mensajes duplicados y aclarando cuándo falta una ubicación.

## 0.55.0 (2026-07-24)

### Changed

- **Carga masiva de productos:** El procesamiento aumentó de 200 a 1,000 filas por lote para reducir solicitudes y overhead de red en archivos grandes.

## 0.54.0 (2026-07-24)

### Added

- **Validación previa de productos:** La carga CSV/Excel ahora muestra conflictos y advertencias antes de escribir en la base de datos.
- **Carga incremental:** El mismo código de producto puede aparecer en distintas cajas; se valida por ubicación y se conserva como un único producto de catálogo.

### Changed

- **Importación segura:** Se bloquean duplicados en la misma caja, barcodes asignados a otro producto, filas incompletas y cajas con más de 3 productos.
- **Relaciones existentes:** Las relaciones producto-caja ya existentes se actualizan correctamente después de confirmar la carga.

## 0.53.0 (2026-07-24)

### Changed

- **Modo offline V3:** Se almacenan también operarios y sesiones visitadas, permitiendo recargar una sesión y seleccionar el contador sin conexión.
- **Sincronización:** La actualización de datos reemplaza el cache anterior para evitar registros obsoletos.
- **Cola offline:** Los conteos que quedaron en estado `SYNCING` se recuperan al reabrir la aplicación y los errores pueden reintentarse manualmente.

## 0.52.0 (2026-07-24)

### Added

- **Catálogo V3:** Se cargaron los 13 operarios iniciales proporcionados.
- **Alta desde el selector:** Si el operario contador no aparece en la lista, se puede escribir y crear directamente desde el formulario de identificación de cajas.

## 0.51.0 (2026-07-24)

### Added

- **Operario contador V3:** El formulario de identificación de cajas permite seleccionar quién contó físicamente las unidades, separado del digitador que registra la información.
- **Auditoría V3:** Cada conteo guarda digitador y operario contador en `BoxCountEntry` y `CountEvent`; la revisión y el Excel muestran ambos.

## 0.50.0 (2026-07-24)

### Added

- **Operarios de sesión:** Los formularios de sesiones V1, V2 y V3 permiten seleccionar un operario principal y un segundo operario opcional desde el catálogo existente.
- **Catálogo de operarios:** Nuevo endpoint `GET /api/operators` para cargar la lista seleccionable.
- **Consolidación de reportes:** Las exportaciones V2 y V3 incluyen una hoja `Resumen por producto`, agrupada por código de producto.

### Changed

- **Trazabilidad por ubicación:** El detalle de reportes conserva la posición física en V2 y la ruta Importación / Pallet / Caja en V3, aunque un mismo código aparezca en varias ubicaciones.
- **Revisión V2:** El código mostrado para cada evento ahora usa el código real del producto.

## 0.49.1 (2026-07-24)

### Changed

- **Zona horaria de registros:** Las fechas y horas visibles en sesiones, actividad, participantes, cola offline y exportaciones Excel ahora se muestran en `America/Lima`.
- **Persistencia:** Los timestamps continúan almacenándose como instantes UTC; solo se convierten a hora de Lima al presentarlos.

## 0.49.0 (2026-07-24)

### Added (Revisión V3 — tabla y paginación)

- **Tabla de revisión:** La vista de revisión de sesiones V3 ahora muestra todos los registros de productos en una tabla plana con columnas: Importación, Pallet, Caja, Producto, Esperado, Contado, Diferencia, Estado y Acciones.
- **Paginación:** La tabla de revisión incluye paginación con 25 registros por página, controles Anterior/Siguiente y números de página con elipsis para rangos grandes.
- **Selects filtrables en V3:** Los tres selects del flujo de cajas (Importación, Pallet, Caja) en la página de escaneo V3 ahora usan `SearchableSelect` con búsqueda por texto.

### Fixed

- **Navegación offline V3:** El Service Worker ahora devuelve la página cacheada más cercana (`/sessions/v3`) para rutas de V3 en vez del dashboard (`/`). Versión del caché incrementada a `v3` para forzar actualización.

### Changed

- **Etiquetas sin fallback:** Las etiquetas de productos ya no generan barcode/QR a partir del código interno cuando no hay `barcode` asignado. El componente `BarcodeLabel` muestra "Sin código de barras" en su lugar.

## 0.48.8 (2026-07-24)

### Fixed

- **Conteo de invitados V3:** Los conteos ahora usan el `operatorId` generado al ingresar como invitado, evitando errores al crear `BoxCountEntry`.
- **Estructura virtual V3:** Los registros técnicos virtuales se mantienen ocultos como ubicaciones inactivas y no requieren configuración física.

## 0.48.7 (2026-07-24)

### Fixed

- **Sesiones V3 sin racks:** El registro de conteos ya no depende de que existan racks, compartimentos o posiciones físicas. Si no hay estructura física, crea automáticamente una estructura técnica virtual para mantener la relación interna de las rondas, sin pedir posiciones al usuario.

## 0.48.6 (2026-07-24)

### Changed

- **Flujo de invitados V3:** Los contadores invitados ya no envían sesiones a revisión; solo guardan la información de cada caja.
- **Guardado antes de continuar:** `Guardar y siguiente caja` registra primero la caja actual y solo después permite pasar a la siguiente.
- **Avances consolidados:** Se agregó el botón `Avances` en el listado de sesiones V3 para consultar el progreso conjunto.
- **Envío administrativo:** El administrador puede enviar la captura completa a revisión desde la vista de avances.
- **Continuidad después de revisión:** Los contadores pueden seguir registrando cajas pendientes o rechazadas; las cajas aprobadas quedan protegidas.

## 0.48.5 (2026-07-24)

### Fixed

- **Revisión V3:** Al enviar una sesión a revisión, las rondas abiertas ahora se marcan como `SUBMITTED` y aparecen correctamente para el supervisor.
- **Revisión por caja:** El tablero usa únicamente la última ronda de cada caja, evitando sumar nuevamente conteos anteriores durante un reconteo.
- **Continuar conteo:** Las sesiones en `REVIEW` pueden recibir nuevos conteos para cajas pendientes o rechazadas; las cajas aprobadas quedan bloqueadas.
- **Reingreso del contador:** Las sesiones V3 en revisión ahora muestran la opción `Continuar` para volver al flujo de conteo.
- **Registro automático:** `Enviar a revisión` registra primero los conteos actuales si aún no se había presionado `Registrar todo`.
- **División de cantidades:** Se permiten varias líneas para el mismo producto sin producir duplicados ni rechazar la caja.

## 0.48.4 (2026-07-24)

### Changed

- **Selectores ordenados:** Todos los `SearchableSelect` ahora ordenan sus opciones alfanuméricamente, respetando el orden natural de números (`CAJA-2` antes de `CAJA-10`) y sin distinguir mayúsculas o acentos.

## 0.48.3 (2026-07-24)

### Fixed

- **Dropdown de cajas:** El card del formulario V3 ahora permite que los selectores se expandan sin quedar recortados por el contenedor.
- **Formulario V3:** Se amplió el ancho máximo y el espacio vertical del card de identificación.

## 0.48.2 (2026-07-24)

### Fixed

- **Selectores completos:** Los textos largos de importaciones, pallets y cajas ya no se truncan. El valor seleccionado y las opciones ahora se muestran con ajuste de línea.

## 0.48.1 (2026-07-24)

### Fixed

- **Plantilla de productos:** Se ajustaron los anchos de las columnas Excel para mostrar completos `codigo_proveedor`, `stock_teorico` y `cantidad_esperada`.

## 0.48.0 (2026-07-24)

### Added (Auto-descarga de datos al ingresar)

- **Carga automática de datos offline:** Nuevo componente `OfflineDataLoader` que se muestra al ingresar al sistema por primera vez. Descarga automáticamente todos los productos, importaciones, pallets, cajas y productos de caja a IndexedDB.
- **Pantalla de carga con progreso:** Interfaz oscura con barra de progreso animada del 0% al 100%, mostrando el stage actual (productos, importaciones, pallets, cajas, productos de caja).
- **Detección de datos existentes:** Si los datos ya fueron descargados anteriormente, la pantalla de carga se salta automáticamente.
- **Manejo offline en carga inicial:** Si no hay internet y no hay datos cacheados, muestra error con opción de reintentar. Si hay datos cacheados, permite usar el sistema normalmente.
- **Evento `offline-data-synced`:** Se dispara cuando la descarga inicial completa, permitiendo que otros componentes se actualicen.

### Changed (Etiquetas sin generación automática de barcode/QR)

- **Sin fallback en etiquetas:** Las etiquetas de productos ya no usan el código interno del producto como fallback para generar barcode/QR. Si un producto no tiene `barcode` asignado, la etiqueta muestra "Sin código de barras" en lugar de generar uno a partir del código.
- **BarcodeLabel sin generación:** El componente `BarcodeLabel` ahora renderiza un placeholder cuando el valor es null o vacío, en vez de intentar generar el código.

## 0.47.0 (2026-07-24)

### Added (Offline completo — datos y conteos)

- **Descarga de datos offline:** Nuevo endpoint `GET /api/offline/sync` que descarga todos los productos, importaciones, pallets, cajas y productos de caja en una sola petición.
- **IndexedDB para datos:** Nuevo módulo `offline-store.ts` con stores dedicados para productos, imports, pallets, boxes y boxProducts. Soporta búsqueda por código y filtros por relación.
- **Hook `useOfflineData`:** Nuevo hook que gestiona la descarga, almacenamiento y acceso a datos offline. Proporciona funciones como `resolveBox()`, `getImports()`, `getPalletsByImport()`, `getBoxesByPallet()` que funcionan 100% desde IndexedDB.
- **Flujo V3 completamente offline:** La página de escaneo V3 ahora usa datos cacheados cuando están disponibles. Selección de importación, pallet, caja y resolución de productos funciona sin internet.
- **Botón de sincronización de datos:** El botón flotante ahora incluye panel para descargar/actualizar datos offline con contadores de productos y cajas descargados.
- **Indicadores de estado:** Badge "Offline" cuando no hay conexión, badge "Datos locales" cuando se usan datos cacheados. Banner informativo cuando no hay datos descargados.
- **Resolución offline de cajas:** `resolveBox()` en `useOfflineData` busca la caja por importación + número (con o sin pallet) y devuelve productos con cantidades esperadas desde IndexedDB.

### Changed

- `OfflineBanner` rediseñado con dos secciones: datos offline (descarga/actualización) y cola de sincronización (conteos pendientes).
- V3 scan page prioriza datos offline sobre API cuando están disponibles.
- Versión 0.47.0.

## 0.46.0 (2026-07-24)

### Added (Sesiones V3 + Modo Offline)

- **Sesiones V3 — Inventario por cajas sin posiciones físicas:** Nuevo módulo de sesiones con `schemaVersion=3` que permite contar productos por caja (Importación → Pallet → Caja) sin necesidad de asignar posiciones físicas.
- **Flujo simplificado de 3 pasos:** IDENTIFY (seleccionar importación/pallet/caja) → CONFIRM (corroborar cantidades con división de líneas) → SUMMARY (registrar y enviar a revisión).
- **División de líneas de cantidad:** Cada producto puede tener múltiples líneas de cantidad (ej: 10 und = 5 + 3 + 2) para control de calidad o distribución.
- **API V3 completa:** CRUD sesiones (`/api/sessions/v3`), conteos por caja, revisión con aprobación/rechazo, y exportación a Excel.
- **Páginas V3:** Listado, creación, escaneo y revisión en `/sessions/v3`.
- **Service Worker registrado:** Componente `ServiceWorkerRegister` que registra el SW en el layout raíz. El SW ahora precachea páginas principales y usa estrategia network-first para páginas de sesión.
- **Modo offline para V3:** Los conteos se encolan automáticamente en IndexedDB cuando no hay conexión. Al recuperar internet, se sincronizan automáticamente.
- **`apiFetchOffline`:** Nueva función en `lib/client.ts` que detecta estado de conexión y encola operaciones en IndexedDB cuando está offline.
- **Botón flotante de sincronización:** `OfflineBanner` rediseñado como botón flotante (esquina inferior derecha) con badge numérico de items pendientes, panel desplegable con detalle de la cola, y botón "Sincronizar ahora".
- **Banner de sin conexión:** Barra inferior roja visible cuando no hay internet.
- **Evento `offline-queue-changed`:** Custom event para sincronizar el estado de la cola entre el módulo `client.ts` y el hook `useOfflineQueue`.
- **BoxCountEntry.positionId nullable:** Campo `positionId` en `BoxCountEntry` ahora es opcional para soportar sesiones V3 sin posiciones físicas.

### Changed

- `OfflineBanner` migrado de banner inline a botón flotante con panel desplegable.
- `useOfflineQueue` ahora escucha el evento `offline-queue-changed` para actualizaciones en tiempo real.
- `public/sw.js` actualizado a v2 con precache de páginas V3, limpieza de caches antiguos y fallback offline para páginas.
- Página principal de sesiones ahora muestra botón "Nueva sesión V3" además del existente V2.

## 0.45.0 (2026-07-24)

### Added (Selects con búsqueda/filtrado)

- **Componente `SearchableSelect`:** Nuevo componente reutilizable que reemplaza los `<select>` nativos por un input con dropdown filtrable. Al escribir al menos 1 letra se filtran las opciones; si no hay texto se muestran todas.
- **Selector de posiciones filtrable:** El selector de posiciones en la asignación de stock por ubicación ahora permite buscar por código mientras se tipea.
- **Selects cascada filtrables:** Los tres selects del flujo de cajas (Importación, Pallet, Caja) ahora soportan búsqueda por texto para localizar opciones rápidamente.

## 0.44.0 (2026-07-24)

### Added (Código proveedor + flujo anónimo V2 + logout)

- **Código proveedor:** Nuevo campo `supplierCode` en Productos (columna `codigo_proveedor` en Excel). Se muestra en la lista de productos, en la resolución de cajas y en el flujo de confirmación.
- **Flujo anónimo V2:** Las sesiones V2 ahora permiten participar sin login, solo ingresando el nombre (como V1). El nombre se guarda en localStorage y en BD como Operator.
- **Logout funcional:** El botón "Log out" del menú de usuario ahora llama a `signOut()` y redirige a `/login`.
- **Plantilla Excel actualizada:** Incluye `codigo_proveedor`, `importacion`, `pallet`, `caja` y `cantidad_esperada`.

## 0.43.0 (2026-07-23)

### Changed (Flujo producto → ubicación)

- **Nuevo flujo de sesión:** La vista de escaneo V2 ahora es product-centric en vez de position-centric. Al entrar a la sesión, se va directo al formulario de importación/caja sin lista de posiciones.
- **Confirmación de producto:** Por cada producto de la caja, se muestra código, descripción, unidad y cantidad esperada. El usuario confirma si es correcto o incorrecto con observación opcional.
- **Asignación de ubicación:** Después de confirmar productos, se asignan a posiciones de la sesión. Se puede seleccionar de la lista o escribir/escanear código de posición. Cada producto puede ubicarse en varias posiciones con cantidades distintas.
- **Resumen por caja:** Muestra todos los productos confirmados con sus ubicaciones asignadas. Opción de siguiente caja o finalizar sesión.
- **Campo notes en CountEvent:** Los conteos ahora aceptan una observación opcional (producto dañado, oxidado, equivocado, etc.).
- **Round automático:** Al registrar un conteo sin `countRoundId`, se crea automáticamente una ronda OPEN para la posición.
- **Pallet opcional:** El pallet no es requerido para resolver cajas. Si una importación no tiene pallets, se salta directamente al selector de cajas.

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
