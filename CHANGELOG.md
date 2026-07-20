# Changelog

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
