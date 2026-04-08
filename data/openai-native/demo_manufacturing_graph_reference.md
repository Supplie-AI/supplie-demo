# Demo Manufacturing Dependency Graph Reference

This fixture is the canonical deep traceability bundle for issue `#50`.

## Intent

Represent a manufacturing dependency graph where a single shared component can
fan out across:

- customer demand in `sales_orders`
- finished-good demand in `sales_order_lines`
- multi-level subassembly work in `work_orders`
- multi-level bill of material edges in `bom_components`
- bought-component supply in `purchase_orders` and `purchase_order_lines`
- execution context in `machines` and `factories`

## Anchor Scenario

`SO-240501-01` is the escalated Zeder order. Its finished-good work order is
`WO-1001`, which depends on child work order `WO-1002` for subassembly
`ASM-COIL-PACK`. That subassembly requires BOM component `CAP-STEEL-08`, and
the supplying purchase order `PO-7712` is late.

The same component also feeds `WO-1005`, which puts `SO-240501-02` at risk.

## Expected Deep Traceability Path

`SO-240501-01 -> SOL-240501-01 -> WO-1001 -> WO-1002 -> CAP-STEEL-08 -> POL-7712-1 -> PO-7712`

Key operator implication:

- the blocker is shared-component supply, not final-kit capacity
- the shortage sits on `MC-COIL-01` at `Brisbane Assembly`
- impact propagates to another sales order because `CAP-STEEL-08` is shared
