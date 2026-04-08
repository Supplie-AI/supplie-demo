import {
  getDatasetTable,
  getDemoManufacturingDependencyBundle,
  type DatasetRow,
  type LoadedDatasetBundle,
} from "./demo-dataset-bundle.ts";

export type DependencyEntityType =
  | "customer"
  | "factory"
  | "machine"
  | "part"
  | "sales_order"
  | "sales_order_line"
  | "work_order"
  | "purchase_order"
  | "purchase_order_line";

export interface DependencyGraphNode {
  key: string;
  entityType: DependencyEntityType;
  entityId: string;
  label: string;
  status: string | null;
  metadata: Record<string, string | number | boolean | null>;
}

export interface DependencyGraphEdge {
  from: string;
  to: string;
  relationship: string;
}

export interface DependencyGraphPathStep {
  entity_type: DependencyEntityType;
  entity_id: string;
  label: string;
  status: string | null;
  relationship_from_previous: string | null;
}

export interface DependencyGraphTrace {
  bundle_id: string;
  snapshot_id: string;
  disclosure: string;
  root_entity_type: DependencyEntityType;
  root_entity_id: string;
  blocker_category: "shared_component_supply" | "work_order" | "unresolved";
  blocker_part_id: string | null;
  blocker_purchase_order_id: string | null;
  blocker_purchase_order_line_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  factory_id: string | null;
  factory_name: string | null;
  machine_id: string | null;
  machine_name: string | null;
  path_hops: number;
  critical_path: DependencyGraphPathStep[];
  explanation: string;
}

export interface DependencyGraphImpact {
  bundle_id: string;
  snapshot_id: string;
  disclosure: string;
  source_entity_type: DependencyEntityType;
  source_entity_id: string;
  shared_component_part_id: string | null;
  impacted_sales_orders: Array<{
    sales_order_id: string;
    status: string | null;
  }>;
  impacted_work_orders: Array<{
    work_order_id: string;
    status: string | null;
  }>;
  explanation: string;
}

interface DependencyGraph {
  bundle: LoadedDatasetBundle;
  nodes: Map<string, DependencyGraphNode>;
  edges: DependencyGraphEdge[];
  adjacency: Map<string, DependencyGraphEdge[]>;
  reverseAdjacency: Map<string, DependencyGraphEdge[]>;
}

const TABLE_NODE_CONFIG: Record<
  string,
  {
    entityType: DependencyEntityType;
    idColumn: string;
    labelColumn: string;
    statusColumn?: string;
    metadataColumns: string[];
  }
> = {
  customers: {
    entityType: "customer",
    idColumn: "customer_id",
    labelColumn: "customer_name",
    metadataColumns: ["priority_tier", "region"],
  },
  factories: {
    entityType: "factory",
    idColumn: "factory_id",
    labelColumn: "factory_name",
    metadataColumns: ["region"],
  },
  machines: {
    entityType: "machine",
    idColumn: "machine_id",
    labelColumn: "machine_name",
    metadataColumns: ["factory_id", "workcenter"],
  },
  parts: {
    entityType: "part",
    idColumn: "part_id",
    labelColumn: "part_name",
    metadataColumns: [
      "part_kind",
      "make_buy",
      "supplier_name",
      "shared_component_group",
    ],
  },
  sales_orders: {
    entityType: "sales_order",
    idColumn: "sales_order_id",
    labelColumn: "sales_order_id",
    statusColumn: "status",
    metadataColumns: ["customer_id", "factory_id", "requested_ship_date", "promise_date"],
  },
  sales_order_lines: {
    entityType: "sales_order_line",
    idColumn: "sales_order_line_id",
    labelColumn: "sales_order_line_id",
    metadataColumns: ["sales_order_id", "part_id", "qty_ordered", "root_work_order_id"],
  },
  work_orders: {
    entityType: "work_order",
    idColumn: "work_order_id",
    labelColumn: "work_order_id",
    statusColumn: "status",
    metadataColumns: [
      "part_id",
      "sales_order_line_id",
      "parent_work_order_id",
      "factory_id",
      "machine_id",
      "qty_required",
      "qty_completed",
      "blocking_reason",
    ],
  },
  purchase_orders: {
    entityType: "purchase_order",
    idColumn: "purchase_order_id",
    labelColumn: "purchase_order_id",
    statusColumn: "status",
    metadataColumns: ["supplier_name", "factory_id", "eta_date", "expedite_available"],
  },
  purchase_order_lines: {
    entityType: "purchase_order_line",
    idColumn: "purchase_order_line_id",
    labelColumn: "purchase_order_line_id",
    statusColumn: "status",
    metadataColumns: [
      "purchase_order_id",
      "part_id",
      "work_order_id",
      "qty_ordered",
      "qty_received",
      "qty_open",
    ],
  },
};

let cachedGraph: DependencyGraph | null = null;

function makeNodeKey(
  entityType: DependencyEntityType,
  entityId: string,
): string {
  return `${entityType}:${entityId}`;
}

function rowValue(row: DatasetRow, key: string) {
  return row[key] ?? "";
}

function addEdge(
  graph: Pick<DependencyGraph, "edges" | "adjacency" | "reverseAdjacency">,
  from: string,
  to: string,
  relationship: string,
) {
  const edge = {
    from,
    to,
    relationship,
  } satisfies DependencyGraphEdge;

  graph.edges.push(edge);
  const outgoing = graph.adjacency.get(from) ?? [];
  outgoing.push(edge);
  graph.adjacency.set(from, outgoing);

  const incoming = graph.reverseAdjacency.get(to) ?? [];
  incoming.push(edge);
  graph.reverseAdjacency.set(to, incoming);
}

function getNode(
  graph: DependencyGraph,
  entityType: DependencyEntityType,
  entityId: string | undefined,
) {
  if (!entityId) {
    return null;
  }

  return graph.nodes.get(makeNodeKey(entityType, entityId)) ?? null;
}

function buildNodeMap(bundle: LoadedDatasetBundle) {
  const purchaseOrderLines = getDatasetTable(bundle, "purchase_order_lines").rows;
  const lateParts = new Set(
    purchaseOrderLines
      .filter((row) => row.status === "late" && Number(row.qty_open ?? "0") > 0)
      .map((row) => row.part_id),
  );

  const nodes = new Map<string, DependencyGraphNode>();

  for (const [tableName, config] of Object.entries(TABLE_NODE_CONFIG)) {
    const table = getDatasetTable(bundle, tableName);

    for (const row of table.rows) {
      const entityId = rowValue(row, config.idColumn);
      const key = makeNodeKey(config.entityType, entityId);
      const metadata = Object.fromEntries(
        config.metadataColumns.map((column) => [column, row[column] ?? null]),
      );
      const status =
        config.entityType === "part" && lateParts.has(entityId)
          ? "shortage"
          : config.statusColumn
            ? rowValue(row, config.statusColumn) || null
            : null;

      nodes.set(key, {
        key,
        entityType: config.entityType,
        entityId,
        label: rowValue(row, config.labelColumn),
        status,
        metadata,
      });
    }
  }

  return nodes;
}

function buildDependencyGraph(): DependencyGraph {
  if (cachedGraph) {
    return cachedGraph;
  }

  const bundle = getDemoManufacturingDependencyBundle();
  const nodes = buildNodeMap(bundle);
  const graph: DependencyGraph = {
    bundle,
    nodes,
    edges: [],
    adjacency: new Map(),
    reverseAdjacency: new Map(),
  };

  const salesOrders = getDatasetTable(bundle, "sales_orders").rows;
  const salesOrderLines = getDatasetTable(bundle, "sales_order_lines").rows;
  const bomComponents = getDatasetTable(bundle, "bom_components").rows;
  const workOrders = getDatasetTable(bundle, "work_orders").rows;
  const purchaseOrders = getDatasetTable(bundle, "purchase_orders").rows;
  const purchaseOrderLines = getDatasetTable(bundle, "purchase_order_lines").rows;

  const workOrdersByParentId = new Map<string, DatasetRow[]>();
  for (const workOrder of workOrders) {
    const parentId = workOrder.parent_work_order_id;
    if (!parentId) {
      continue;
    }

    const children = workOrdersByParentId.get(parentId) ?? [];
    children.push(workOrder);
    workOrdersByParentId.set(parentId, children);
  }

  for (const salesOrder of salesOrders) {
    const salesOrderKey = makeNodeKey("sales_order", salesOrder.sales_order_id);

    addEdge(
      graph,
      salesOrderKey,
      makeNodeKey("customer", salesOrder.customer_id),
      "belongs_to_customer",
    );
    addEdge(
      graph,
      salesOrderKey,
      makeNodeKey("factory", salesOrder.factory_id),
      "planned_for_factory",
    );
  }

  for (const salesOrderLine of salesOrderLines) {
    const salesOrderLineKey = makeNodeKey(
      "sales_order_line",
      salesOrderLine.sales_order_line_id,
    );

    addEdge(
      graph,
      makeNodeKey("sales_order", salesOrderLine.sales_order_id),
      salesOrderLineKey,
      "has_demand_line",
    );
    addEdge(
      graph,
      salesOrderLineKey,
      makeNodeKey("work_order", salesOrderLine.root_work_order_id),
      "drives_root_work_order",
    );
  }

  for (const workOrder of workOrders) {
    const workOrderKey = makeNodeKey("work_order", workOrder.work_order_id);

    const childWorkOrders = workOrdersByParentId.get(workOrder.work_order_id) ?? [];
    for (const childWorkOrder of childWorkOrders) {
      addEdge(
        graph,
        workOrderKey,
        makeNodeKey("work_order", childWorkOrder.work_order_id),
        "depends_on_child_work_order",
      );
    }

    const bomChildren = bomComponents.filter(
      (row) => row.parent_part_id === workOrder.part_id,
    );
    for (const bomChild of bomChildren) {
      addEdge(
        graph,
        workOrderKey,
        makeNodeKey("part", bomChild.child_part_id),
        `requires_bom_component_level_${bomChild.bom_level}_qty_${bomChild.qty_per}`,
      );
    }

    addEdge(
      graph,
      workOrderKey,
      makeNodeKey("machine", workOrder.machine_id),
      "scheduled_on_machine",
    );
    addEdge(
      graph,
      workOrderKey,
      makeNodeKey("factory", workOrder.factory_id),
      "scheduled_in_factory",
    );
    addEdge(
      graph,
      workOrderKey,
      makeNodeKey("part", workOrder.part_id),
      "builds_part",
    );
  }

  for (const bomComponent of bomComponents) {
    addEdge(
      graph,
      makeNodeKey("part", bomComponent.parent_part_id),
      makeNodeKey("part", bomComponent.child_part_id),
      `decomposes_to_bom_level_${bomComponent.bom_level}_qty_${bomComponent.qty_per}`,
    );
  }

  for (const purchaseOrderLine of purchaseOrderLines) {
    const purchaseOrderLineKey = makeNodeKey(
      "purchase_order_line",
      purchaseOrderLine.purchase_order_line_id,
    );

    addEdge(
      graph,
      makeNodeKey("part", purchaseOrderLine.part_id),
      purchaseOrderLineKey,
      "supplied_by_purchase_order_line",
    );
    addEdge(
      graph,
      purchaseOrderLineKey,
      makeNodeKey("purchase_order", purchaseOrderLine.purchase_order_id),
      "belongs_to_purchase_order",
    );
  }

  for (const purchaseOrder of purchaseOrders) {
    addEdge(
      graph,
      makeNodeKey("purchase_order", purchaseOrder.purchase_order_id),
      makeNodeKey("factory", purchaseOrder.factory_id),
      "feeds_factory",
    );
  }

  cachedGraph = graph;
  return graph;
}

function breadthFirstPath(
  graph: DependencyGraph,
  startKey: string,
  isTarget: (node: DependencyGraphNode) => boolean,
  maxHops: number,
) {
  const queue = [startKey];
  const visited = new Set([startKey]);
  const previous = new Map<string, DependencyGraphEdge | null>([[startKey, null]]);

  while (queue.length > 0) {
    const currentKey = queue.shift()!;
    const currentNode = graph.nodes.get(currentKey);
    if (!currentNode) {
      continue;
    }

    const pathDepth = reconstructPath(graph, previous, currentKey).length - 1;
    if (pathDepth > maxHops) {
      continue;
    }

    if (currentKey !== startKey && isTarget(currentNode)) {
      return reconstructPath(graph, previous, currentKey);
    }

    for (const edge of graph.adjacency.get(currentKey) ?? []) {
      if (visited.has(edge.to)) {
        continue;
      }

      visited.add(edge.to);
      previous.set(edge.to, edge);
      queue.push(edge.to);
    }
  }

  return null;
}

function reconstructPath(
  graph: DependencyGraph,
  previous: Map<string, DependencyGraphEdge | null>,
  endKey: string,
) {
  const path: Array<{
    node: DependencyGraphNode;
    relationshipFromPrevious: string | null;
  }> = [];
  let cursor: string | null = endKey;

  while (cursor) {
    const node = graph.nodes.get(cursor);
    if (!node) {
      break;
    }

    const previousEdge: DependencyGraphEdge | null = previous.get(cursor) ?? null;
    path.push({
      node,
      relationshipFromPrevious: previousEdge?.relationship ?? null,
    });
    cursor = previousEdge?.from ?? null;
  }

  return path.reverse();
}

function toPathSteps(
  path: Array<{
    node: DependencyGraphNode;
    relationshipFromPrevious: string | null;
  }>,
) {
  return path.map((step) => ({
    entity_type: step.node.entityType,
    entity_id: step.node.entityId,
    label: step.node.label,
    status: step.node.status,
    relationship_from_previous: step.relationshipFromPrevious,
  })) satisfies DependencyGraphPathStep[];
}

function uniqueSorted<T extends { [key: string]: string | null }>(
  items: T[],
  key: keyof T,
) {
  return [...items]
    .reduce<T[]>((accumulator, item) => {
      if (!accumulator.some((existing) => existing[key] === item[key])) {
        accumulator.push(item);
      }
      return accumulator;
    }, [])
    .sort((left, right) =>
      String(left[key] ?? "").localeCompare(String(right[key] ?? "")),
    );
}

function pathNodeByType(
  path: Array<{
    node: DependencyGraphNode;
    relationshipFromPrevious: string | null;
  }>,
  entityType: DependencyEntityType,
) {
  return path.find((step) => step.node.entityType === entityType)?.node ?? null;
}

function lastPathNodeByType(
  path: Array<{
    node: DependencyGraphNode;
    relationshipFromPrevious: string | null;
  }>,
  entityType: DependencyEntityType,
) {
  return [...path].reverse().find((step) => step.node.entityType === entityType)?.node ?? null;
}

export function traceManufacturingGraphDependencies({
  root_entity_type,
  root_entity_id,
  max_hops,
}: {
  root_entity_type?: DependencyEntityType;
  root_entity_id?: string;
  max_hops?: number;
}): DependencyGraphTrace {
  const graph = buildDependencyGraph();
  const rootEntityType = root_entity_type ?? "sales_order";
  const rootEntityId = root_entity_id ?? "SO-240501-01";
  const rootKey = makeNodeKey(rootEntityType, rootEntityId);
  const rootNode = graph.nodes.get(rootKey);

  if (!rootNode) {
    throw new Error(`Unknown dependency root "${rootEntityType}:${rootEntityId}".`);
  }

  const path =
    breadthFirstPath(
      graph,
      rootKey,
      (node) => node.entityType === "purchase_order" && node.status === "late",
      max_hops ?? 10,
    ) ??
    breadthFirstPath(
      graph,
      rootKey,
      (node) => node.entityType === "purchase_order_line" && node.status === "late",
      max_hops ?? 10,
    );

  if (!path) {
    return {
      bundle_id: graph.bundle.manifest.bundle_id,
      snapshot_id: graph.bundle.manifest.snapshot_id,
      disclosure: graph.bundle.manifest.disclosure,
      root_entity_type: rootEntityType,
      root_entity_id: rootEntityId,
      blocker_category: "unresolved",
      blocker_part_id: null,
      blocker_purchase_order_id: null,
      blocker_purchase_order_line_id: null,
      customer_id: null,
      customer_name: null,
      factory_id: null,
      factory_name: null,
      machine_id: null,
      machine_name: null,
      path_hops: 0,
      critical_path: toPathSteps([{ node: rootNode, relationshipFromPrevious: null }]),
      explanation: "No late upstream dependency was found in the canonical manufacturing graph fixture.",
    };
  }

  const workOrderInPath = lastPathNodeByType(path, "work_order");
  const rootCustomerId =
    typeof rootNode.metadata.customer_id === "string"
      ? rootNode.metadata.customer_id
      : undefined;
  const customer =
    pathNodeByType(path, "customer") ?? getNode(graph, "customer", rootCustomerId);
  const workOrderFactoryId =
    typeof workOrderInPath?.metadata.factory_id === "string"
      ? workOrderInPath.metadata.factory_id
      : undefined;
  const workOrderMachineId =
    typeof workOrderInPath?.metadata.machine_id === "string"
      ? workOrderInPath.metadata.machine_id
      : undefined;
  const factory =
    pathNodeByType(path, "factory") ?? getNode(graph, "factory", workOrderFactoryId);
  const machine =
    pathNodeByType(path, "machine") ?? getNode(graph, "machine", workOrderMachineId);
  const blockerPurchaseOrder = pathNodeByType(path, "purchase_order");
  const blockerPurchaseOrderLine = pathNodeByType(path, "purchase_order_line");

  const blockerPartCandidateIndex = [...path]
    .reverse()
    .findIndex((step) => step.node.entityType === "part");
  const blockerPart =
    blockerPartCandidateIndex === -1
      ? null
      : path[path.length - 1 - blockerPartCandidateIndex].node;

  return {
    bundle_id: graph.bundle.manifest.bundle_id,
    snapshot_id: graph.bundle.manifest.snapshot_id,
    disclosure: graph.bundle.manifest.disclosure,
    root_entity_type: rootEntityType,
    root_entity_id: rootEntityId,
    blocker_category: blockerPurchaseOrder ? "shared_component_supply" : "work_order",
    blocker_part_id: blockerPart?.entityId ?? null,
    blocker_purchase_order_id: blockerPurchaseOrder?.entityId ?? null,
    blocker_purchase_order_line_id: blockerPurchaseOrderLine?.entityId ?? null,
    customer_id: customer?.entityId ?? null,
    customer_name: customer?.label ?? null,
    factory_id: factory?.entityId ?? null,
    factory_name: factory?.label ?? null,
    machine_id: machine?.entityId ?? null,
    machine_name: machine?.label ?? null,
    path_hops: Math.max(0, path.length - 1),
    critical_path: toPathSteps(path),
    explanation:
      blockerPart && blockerPurchaseOrder
        ? `${rootEntityId} is blocked by shared component ${blockerPart.entityId} because ${blockerPurchaseOrder.entityId} is late upstream of the dependent work order chain.`
        : `${rootEntityId} is blocked somewhere in the upstream work-order chain, but the canonical blocker could not be reduced to a purchase-order path.`,
  };
}

export function propagateManufacturingGraphImpact({
  source_entity_type,
  source_entity_id,
  max_hops,
}: {
  source_entity_type?: DependencyEntityType;
  source_entity_id?: string;
  max_hops?: number;
}): DependencyGraphImpact {
  const graph = buildDependencyGraph();
  const sourceEntityType = source_entity_type ?? "purchase_order";
  const sourceEntityId = source_entity_id ?? "PO-7712";
  const sourceKey = makeNodeKey(sourceEntityType, sourceEntityId);

  if (!graph.nodes.has(sourceKey)) {
    throw new Error(
      `Unknown dependency impact source "${sourceEntityType}:${sourceEntityId}".`,
    );
  }

  const queue: Array<{ key: string; depth: number }> = [{ key: sourceKey, depth: 0 }];
  const visited = new Set([sourceKey]);
  const impactedSalesOrders: Array<{
    sales_order_id: string;
    status: string | null;
  }> = [];
  const impactedWorkOrders: Array<{
    work_order_id: string;
    status: string | null;
  }> = [];
  let sharedComponentPartId: string | null = null;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth > (max_hops ?? 10)) {
      continue;
    }

    const node = graph.nodes.get(current.key);
    if (!node) {
      continue;
    }

    if (node.entityType === "part" && node.status === "shortage" && !sharedComponentPartId) {
      sharedComponentPartId = node.entityId;
    }

    if (node.entityType === "sales_order") {
      impactedSalesOrders.push({
        sales_order_id: node.entityId,
        status: node.status,
      });
    }

    if (node.entityType === "work_order") {
      impactedWorkOrders.push({
        work_order_id: node.entityId,
        status: node.status,
      });
    }

    for (const edge of graph.reverseAdjacency.get(current.key) ?? []) {
      if (visited.has(edge.from)) {
        continue;
      }

      visited.add(edge.from);
      queue.push({
        key: edge.from,
        depth: current.depth + 1,
      });
    }
  }

  return {
    bundle_id: graph.bundle.manifest.bundle_id,
    snapshot_id: graph.bundle.manifest.snapshot_id,
    disclosure: graph.bundle.manifest.disclosure,
    source_entity_type: sourceEntityType,
    source_entity_id: sourceEntityId,
    shared_component_part_id: sharedComponentPartId,
    impacted_sales_orders: uniqueSorted(impactedSalesOrders, "sales_order_id"),
    impacted_work_orders: uniqueSorted(impactedWorkOrders, "work_order_id"),
    explanation:
      sharedComponentPartId
        ? `${sourceEntityId} propagates through shared component ${sharedComponentPartId} into multiple work orders and sales orders in the canonical graph fixture.`
        : `${sourceEntityId} propagates into downstream work orders and sales orders in the canonical graph fixture.`,
  };
}
