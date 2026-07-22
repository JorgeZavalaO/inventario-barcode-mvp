# ADR-004: Compatibilidad de sesiones V1 y V2

**Estado:** Aprobado  
**Fecha:** 2026-07-21  
**Contexto:** El proyecto tiene sesiones V1 (producto + cantidad global) y necesita sesiones V2 (posición + ronda + producto). Ambas deben coexistir durante la migración.

**Decisión:** Las sesiones V1 tienen `schema_version = 1` y permanecen en modo histórico. Las sesiones V2 usan `schema_version = 2`. Los nuevos campos en `CountEvent` (positionId, countRoundId, etc.) son opcionales para compatibilidad V1. Las APIs V1 y V2 son independientes. No se permite crear nuevas sesiones V1 después de activar V2 globalmente.

**Consecuencias:** Las sesiones antiguas siguen siendo consultables. La migración es expansiva (nunca se modifican datos V1).
