# ADR-001: Prisma Migrate como fuente única de verdad para el esquema

**Estado:** Aprobado  
**Fecha:** 2026-07-21  
**Contexto:** El proyecto tenía dos fuentes de definición del esquema: Prisma migrations y `ensureDatabase()` con DDL raw. Esto generaba deriva de esquema y fallos al desplegar.

**Decisión:** Prisma Migrate es la única fuente de verdad. `ensureDatabase()` se convirtió en una verificación de conectividad (`SELECT 1`). Todo cambio estructural se realiza mediante migraciones Prisma.

**Consecuencias:** Las migraciones deben probarse en base vacía y con datos reales antes de desplegar. No se permite DDL en código de ejecución.
