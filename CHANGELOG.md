# Changelog

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
