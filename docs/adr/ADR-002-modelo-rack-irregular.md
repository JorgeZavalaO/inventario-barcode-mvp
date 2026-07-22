# ADR-002: Modelo de rack irregular con compartimientos por coordenadas

**Estado:** Aprobado  
**Fecha:** 2026-07-21  
**Contextón:** Los racks de almacén tienen divisiones de anchos y altos variables. Una cuadrícula fija (filas × columnas) no representa bien todos los racks.

**Decisión:** Cada compartimiento se almacena como un rectángulo normalizado con coordenadas `x, y, width, height` en rango 0–10000. La profundidad se modela como slots independientes (`RackDepthSlot`). La vista frontal se renderiza desde estos datos en SVG responsive.

**Consecuencias:** No hay una tabla de cuadrícula rígida. Cada rack puede tener una estructura diferente. Las posiciones físicas se generan por combinación compartimiento + profundidad.
