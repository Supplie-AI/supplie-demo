export interface Order {
  order_id: string;
  date: string;
  customer_name: string;
  sku_id: string;
  sku_name: string;
  category: string;
  supplier_country: string;
  quantity: number;
  unit_price: number;
  freight_cost: number;
  rebate_pct: number;
  warehouse: string;
  current_stock: number;
  avg_lead_days: number;
  order_status: string;
}

export const CSV_STRING = `order_id,date,customer_name,sku_id,sku_name,category,supplier_country,quantity,unit_price,freight_cost,rebate_pct,warehouse,current_stock,avg_lead_days,order_status
ORD-001,2026-01-23,Suspension King Pty Ltd,ZDR-006,Complete Suspension Kit (4WD),Suspension Kits,Vietnam,2,890,72,12,Melbourne,12,55,delivered
ORD-002,2026-01-25,Suspension King Pty Ltd,ZDR-001,Rear Damper Assembly,Dampers,Vietnam,5,89,68,12,Melbourne,145,52,delivered
ORD-003,2026-01-27,Offroad Warehouse,ZDR-003,Rear Coil Spring Set,Springs,China,4,124,58,5,Sydney,87,38,delivered
ORD-004,2026-01-29,Rocky Mountain Offroad,ZDR-005,Heavy Duty Shock Absorber,Dampers,United States,3,210,245,2,Perth,62,21,delivered
ORD-005,2026-01-31,AllTerrain Parts Ltd,ZDR-008,Strut Mount Kit,Mounts,United Kingdom,6,67,195,0,Brisbane,103,28,delivered
ORD-006,2026-02-02,Suspension King Pty Ltd,ZDR-002,Front Strut Kit (pair),Struts,Vietnam,3,185,85,12,Melbourne,18,48,delivered
ORD-007,2026-02-04,4WD Supacentre,ZDR-004,Lower Control Arm Bush Kit,Bushings,Australia,8,45,52,3,Sydney,210,7,delivered
ORD-008,2026-02-05,Suspension King Pty Ltd,ZDR-006,Complete Suspension Kit (4WD),Suspension Kits,Vietnam,1,890,78,12,Melbourne,12,55,delivered
ORD-009,2026-02-07,Rocky Mountain Offroad,ZDR-002,Front Strut Kit (pair),Struts,Vietnam,4,185,265,2,Perth,18,48,delivered
ORD-010,2026-02-08,Offroad Warehouse,ZDR-007,Sway Bar Link Set,Linkages,Australia,10,38,48,5,Melbourne,312,5,delivered
ORD-011,2026-02-10,Suspension King Pty Ltd,ZDR-003,Rear Coil Spring Set,Springs,China,6,124,65,12,Melbourne,87,38,delivered
ORD-012,2026-02-11,AllTerrain Parts Ltd,ZDR-005,Heavy Duty Shock Absorber,Dampers,United States,2,210,178,0,Brisbane,62,21,delivered
ORD-013,2026-02-13,Suspension King Pty Ltd,ZDR-001,Rear Damper Assembly,Dampers,Vietnam,8,89,72,12,Sydney,145,52,delivered
ORD-014,2026-02-14,4WD Supacentre,ZDR-006,Complete Suspension Kit (4WD),Suspension Kits,Vietnam,1,890,68,3,Melbourne,12,55,delivered
ORD-015,2026-02-16,Rocky Mountain Offroad,ZDR-003,Rear Coil Spring Set,Springs,China,5,124,225,2,Perth,87,38,delivered
ORD-016,2026-02-17,Suspension King Pty Ltd,ZDR-005,Heavy Duty Shock Absorber,Dampers,United States,4,210,88,12,Melbourne,62,21,delivered
ORD-017,2026-02-19,Offroad Warehouse,ZDR-002,Front Strut Kit (pair),Struts,Vietnam,3,185,62,5,Sydney,18,48,delivered
ORD-018,2026-02-20,AllTerrain Parts Ltd,ZDR-001,Rear Damper Assembly,Dampers,Vietnam,4,67,188,0,Brisbane,145,52,delivered
ORD-019,2026-02-21,Suspension King Pty Ltd,ZDR-006,Complete Suspension Kit (4WD),Suspension Kits,Vietnam,1,890,75,12,Melbourne,12,55,delivered
ORD-020,2026-02-23,4WD Supacentre,ZDR-007,Sway Bar Link Set,Linkages,Australia,12,38,55,3,Sydney,312,5,delivered
ORD-021,2026-02-24,Rocky Mountain Offroad,ZDR-008,Strut Mount Kit,Mounts,United Kingdom,3,67,210,2,Perth,103,28,delivered
ORD-022,2026-02-25,Suspension King Pty Ltd,ZDR-004,Lower Control Arm Bush Kit,Bushings,Australia,10,45,58,12,Melbourne,210,7,delivered
ORD-023,2026-02-26,Offroad Warehouse,ZDR-006,Complete Suspension Kit (4WD),Suspension Kits,Vietnam,1,890,70,5,Sydney,12,55,delivered
ORD-024,2026-02-27,AllTerrain Parts Ltd,ZDR-003,Rear Coil Spring Set,Springs,China,3,124,172,0,Brisbane,87,38,delivered
ORD-025,2026-02-28,Suspension King Pty Ltd,ZDR-002,Front Strut Kit (pair),Struts,Vietnam,2,185,80,12,Melbourne,18,48,delivered
ORD-026,2026-03-01,4WD Supacentre,ZDR-005,Heavy Duty Shock Absorber,Dampers,United States,2,210,62,3,Sydney,62,21,delivered
ORD-027,2026-03-02,Rocky Mountain Offroad,ZDR-001,Rear Damper Assembly,Dampers,Vietnam,6,89,238,2,Perth,145,52,delivered
ORD-028,2026-03-03,Suspension King Pty Ltd,ZDR-007,Sway Bar Link Set,Linkages,Australia,15,38,65,12,Melbourne,312,5,delivered
ORD-029,2026-03-04,Offroad Warehouse,ZDR-004,Lower Control Arm Bush Kit,Bushings,Australia,6,45,50,5,Sydney,210,7,delivered
ORD-030,2026-03-05,AllTerrain Parts Ltd,ZDR-002,Front Strut Kit (pair),Struts,Vietnam,2,185,162,0,Brisbane,18,48,shipped
ORD-031,2026-03-06,Suspension King Pty Ltd,ZDR-006,Complete Suspension Kit (4WD),Suspension Kits,Vietnam,1,890,82,12,Melbourne,12,55,shipped
ORD-032,2026-03-07,Rocky Mountain Offroad,ZDR-007,Sway Bar Link Set,Linkages,Australia,8,38,195,2,Perth,312,5,shipped
ORD-033,2026-03-08,4WD Supacentre,ZDR-003,Rear Coil Spring Set,Springs,China,5,124,58,3,Melbourne,87,38,shipped
ORD-034,2026-03-09,Suspension King Pty Ltd,ZDR-001,Rear Damper Assembly,Dampers,Vietnam,10,89,75,12,Sydney,145,52,shipped
ORD-035,2026-03-10,Offroad Warehouse,ZDR-008,Strut Mount Kit,Mounts,United Kingdom,4,67,55,5,Melbourne,103,28,shipped
ORD-036,2026-03-11,AllTerrain Parts Ltd,ZDR-004,Lower Control Arm Bush Kit,Bushings,Australia,5,45,168,0,Brisbane,210,7,shipped
ORD-037,2026-03-12,Suspension King Pty Ltd,ZDR-003,Rear Coil Spring Set,Springs,China,8,124,72,12,Melbourne,87,38,processing
ORD-038,2026-03-13,Rocky Mountain Offroad,ZDR-006,Complete Suspension Kit (4WD),Suspension Kits,Vietnam,1,890,270,2,Perth,12,55,processing
ORD-039,2026-03-14,4WD Supacentre,ZDR-002,Front Strut Kit (pair),Struts,Vietnam,2,185,65,3,Sydney,18,48,processing
ORD-040,2026-03-15,Suspension King Pty Ltd,ZDR-005,Heavy Duty Shock Absorber,Dampers,United States,5,210,90,12,Melbourne,62,21,processing
ORD-041,2026-03-16,Offroad Warehouse,ZDR-001,Rear Damper Assembly,Dampers,Vietnam,4,89,62,5,Sydney,145,52,processing
ORD-042,2026-03-17,AllTerrain Parts Ltd,ZDR-007,Sway Bar Link Set,Linkages,Australia,8,38,185,0,Brisbane,312,5,processing
ORD-043,2026-03-18,Suspension King Pty Ltd,ZDR-008,Strut Mount Kit,Mounts,United Kingdom,3,67,70,12,Melbourne,103,28,processing
ORD-044,2026-03-19,4WD Supacentre,ZDR-001,Rear Damper Assembly,Dampers,Vietnam,5,89,55,3,Sydney,145,52,processing
ORD-045,2026-03-20,Rocky Mountain Offroad,ZDR-004,Lower Control Arm Bush Kit,Bushings,Australia,4,45,215,2,Perth,210,7,processing
ORD-046,2026-03-20,Suspension King Pty Ltd,ZDR-006,Complete Suspension Kit (4WD),Suspension Kits,Vietnam,1,890,88,12,Melbourne,12,55,processing
ORD-047,2026-03-21,Offroad Warehouse,ZDR-005,Heavy Duty Shock Absorber,Dampers,United States,3,210,68,5,Sydney,62,21,processing
ORD-048,2026-03-21,Suspension King Pty Ltd,ZDR-002,Front Strut Kit (pair),Struts,Vietnam,2,185,85,12,Melbourne,18,48,processing
ORD-049,2026-03-22,AllTerrain Parts Ltd,ZDR-006,Complete Suspension Kit (4WD),Suspension Kits,Vietnam,1,890,198,0,Brisbane,12,55,processing
ORD-050,2026-03-23,Suspension King Pty Ltd,ZDR-004,Lower Control Arm Bush Kit,Bushings,Australia,12,45,62,12,Melbourne,210,7,processing`;

export const ORDERS: Order[] = CSV_STRING.split("\n")
  .slice(1)
  .filter(Boolean)
  .map((line) => {
    const [
      order_id,
      date,
      customer_name,
      sku_id,
      sku_name,
      category,
      supplier_country,
      quantity,
      unit_price,
      freight_cost,
      rebate_pct,
      warehouse,
      current_stock,
      avg_lead_days,
      order_status,
    ] = line.split(",");
    return {
      order_id,
      date,
      customer_name,
      sku_id,
      sku_name,
      category,
      supplier_country,
      quantity: Number(quantity),
      unit_price: Number(unit_price),
      freight_cost: Number(freight_cost),
      rebate_pct: Number(rebate_pct),
      warehouse,
      current_stock: Number(current_stock),
      avg_lead_days: Number(avg_lead_days),
      order_status,
    };
  });
