# ADR-003: Eventos append-only, rondas y resultados aprobados

**Estado:** Aprobado  
**Fecha:** 2026-07-21  
**Contexto:** El conteo colaborativo requiere separar rondas para evitar que reconteos sumen sobre el total anterior.

**Decisión:** Los eventos (`CountEvent`) son append-only. Se agrupan en rondas (`CountRound`). Los eventos se suman dentro de una ronda; las rondas no se suman entre sí. El resultado aprobado se selecciona explícitamente por ronda, no por suma de todos los eventos.

**Consecuencias:** El supervisor debe aprobar una ronda por posición. No hay un campo `total` editable; todo se calcula desde eventos y rondas.
