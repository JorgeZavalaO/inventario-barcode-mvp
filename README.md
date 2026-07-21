# StockScan — MVP de inventario colaborativo

Aplicación web en Next.js para cargar productos, generar etiquetas (Code 128 o QR) y realizar conteos físicos mediante cámara, lector USB o ingreso manual. Varias personas pueden participar en la misma sesión y los resultados se sincronizan cada dos segundos.

## Funcionalidades incluidas

- Autenticación con Auth.js (credenciales, JWT).
- Panel de control con métricas globales y acceso rápido.
- Sidebar colapsable con navegación por módulos.
- Catálogo de productos con código interno, barcode, descripción, unidad, categoría y stock teórico, con paginación (20–500 items por página) y búsqueda por código o descripción.
- Importación masiva desde CSV o Excel (.xlsx, .xls) — hasta 6500 filas por lote, con barra de progreso y reporte de errores por fila.
- Descarga de plantilla Excel con el formato requerido.
- Módulo de configuración con opciones de administración del sistema.
- Generación e impresión de etiquetas Code 128 o QR, con opción de impresión masiva por selección, página o catálogo completo. Selector de formato con guardado de preferencia.
- Creación de sesiones de inventario con una fotografía del stock teórico.
- Enlace compartible para que varias personas ingresen a la misma sesión.
- Escaneo con la cámara del celular usando ZXing, con confirmación de cantidad post-lectura.
- Compatibilidad con lectores USB que funcionan como teclado.
- Conteos por unidad o por cantidad.
- Sincronización multiusuario mediante PostgreSQL y actualización automática cada 2 segundos.
- Registro append-only de cada conteo: usuario, producto, cantidad, método y hora.
- Idempotencia por `operation_id` para evitar duplicados por reintentos de red.
- Deshacer el último conteo y bitácora de movimientos anulados.
- Comparación entre stock teórico, conteo físico y diferencia.
- Cierre definitivo de la sesión.
- Vista de sesión rediseñada con navegación por tabs (Resumen, Escanear, Resultados, Actividad).
- Escáner inteligente: acceso directo con selector de sesión activa.
- Progressive Web App (PWA) instalable en dispositivos móviles y escritorio.

## Stack

- Next.js 16 App Router
- React 19 y TypeScript
- Tailwind CSS 4 + shadcn/ui + @base-ui/react
- Prisma ORM 7 + Neon PostgreSQL
- Auth.js (NextAuth v5) con Credentials provider
- ZXing Browser para lectura de códigos
- JsBarcode para etiquetas Code 128
- qrcode para generación de códigos QR
- PapaParse para archivos CSV
- Zod para validación de APIs

## Requisitos previos

- Node.js 20+
- pnpm (recomendado) o npm
- Base de datos PostgreSQL (Neon, Supabase o local)

## Ejecución local

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tu conexión PostgreSQL. Para Neon:

```env
DATABASE_URL="postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=verify-full"
AUTH_SECRET="genera-un-secreto-aqui"
```

Genera `AUTH_SECRET` con:

```bash
openssl rand -base64 32
```

### 3. Iniciar PostgreSQL local (opcional)

Con Docker instalado:

```bash
docker compose up -d
```

### 4. Migrar base de datos y sembrar datos de prueba

```bash
pnpm db:migrate
pnpm db:seed
```

### 5. Iniciar el sistema

```bash
pnpm dev
```

Abre `http://localhost:3000` e inicia sesión con las credenciales de prueba:

- **Email:** `admin@stockscan.app`
- **Password:** `admin123`

## Probar el flujo completo

1. Inicia sesión con las credenciales de prueba.
2. Importa `sample-products.csv` o pulsa **Datos demo**.
3. Crea una sesión de inventario.
4. Ingresa el nombre del participante.
5. Comparte el enlace de la sesión con otros celulares.
6. Activa la cámara o escribe uno de los códigos del CSV.
7. Ajustá la cantidad en el prompt de confirmación y presioná **Registrar**.
8. Verifica que los resultados se actualicen en todos los dispositivos.

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `pnpm dev` | Inicia el servidor de desarrollo |
| `pnpm build` | Compila para producción |
| `pnpm start` | Inicia el servidor de producción |
| `pnpm lint` | Ejecuta ESLint |
| `pnpm check` | Lint + build |
| `pnpm db:generate` | Regenera Prisma Client |
| `pnpm db:migrate` | Ejecuta migraciones pendientes |
| `pnpm db:seed` | Ejecuta el seed de base de datos |
| `pnpm db:studio` | Abre Prisma Studio |
| `pnpm db:push` | Sincroniza schema sin migración |

## Cámara desde celulares

Los navegadores solo permiten acceder a la cámara en un contexto seguro:

- `https://` en una aplicación desplegada.
- `localhost` durante desarrollo.

Abrir la IP local del computador mediante HTTP puede mostrar la página, pero normalmente bloqueará la cámara. Para probar con celulares, despliega el proyecto en Vercel o utiliza un túnel HTTPS de desarrollo.

## Despliegue en Vercel

1. Sube el proyecto a GitHub.
2. Importa el repositorio en Vercel.
3. Agrega `DATABASE_URL` y `AUTH_SECRET` en las variables del proyecto.
4. Despliega.

No uses SQLite en Vercel para este caso: la concurrencia y la persistencia multiinstancia necesitan una base PostgreSQL externa.

## Formato de importación (CSV o Excel)

```csv
codigo,codigo_barra,descripcion,unidad,categoria,stock_teorico
PROD-001,7751234567890,Producto de prueba,UND,Categoría,25
```

La columna `codigo_barra` (barcode) es **opcional**. Si se deja vacía, el código de barras se generará a partir del código interno del producto usando CODE128 (soporta alfanumérico).

También se reconocen encabezados equivalentes como `code`, `barcode`, `description`, `unit`, `category` y `stock`.

Para Excel (.xlsx / .xls), la primera hoja se lee automáticamente. Las columnas deben tener los mismos nombres en la primera fila. Máximo **6500 filas** por lote.

Desde el módulo Productos podés descargar una **plantilla Excel** con el formato listo para completar.

## Modelo de concurrencia

El total de un producto nunca se modifica directamente. Cada lectura crea un evento independiente en `count_events`:

```text
Total contado = suma de eventos vigentes
```

Esto permite que varias personas registren cantidades al mismo tiempo sin sobrescribir el trabajo de otra persona. Una anulación conserva el evento original y completa `reversed_at`, manteniendo la auditoría.

## Limitaciones deliberadas del MVP

- La identificación de operadores dentro de una sesión es por nombre (independiente de la autenticación del sistema).
- Cualquier participante puede cerrar una sesión.
- La sincronización utiliza polling cada 2 segundos, no WebSockets.
- Requiere conexión a Internet; todavía no almacena lecturas offline en IndexedDB.
- No actualiza automáticamente el stock de un ERP después de cerrar el conteo.
- La impresión está orientada a etiquetas del navegador; no incluye integración directa con Zebra/ZPL.

## Siguiente etapa recomendada

Roles Administrador, Supervisor y Contador; modo offline con IndexedDB; reconteos independientes; WebSockets o Supabase Realtime; zonas/pasillos; exportación a Excel y conexión con el ERP.

## Validación realizada

```bash
pnpm run lint
pnpm run build
```

Ambos comandos se ejecutan correctamente.
