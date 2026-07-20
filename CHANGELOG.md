# Changelog

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
