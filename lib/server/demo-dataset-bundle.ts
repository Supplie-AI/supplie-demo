import { readFileSync } from "node:fs";
import path from "node:path";

export type DatasetTableSource =
  | {
      type: "csv_file";
      file_name: string;
    }
  | {
      type: "workbook_sheet";
      workbook_file_name: string;
      sheet_name: string;
      exported_csv_file_name?: string;
    };

export interface DatasetTableManifest {
  name: string;
  description: string;
  primary_key: string[];
  source: DatasetTableSource;
}

export interface DatasetRelationshipManifest {
  name: string;
  description: string;
  from_table: string;
  from_columns: string[];
  to_table: string;
  to_columns: string[];
  cardinality: "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many";
}

export interface DatasetBundleManifest {
  bundle_id: string;
  snapshot_id: string;
  captured_at: string;
  disclosure: string;
  tables: DatasetTableManifest[];
  relationships: DatasetRelationshipManifest[];
}

export interface DatasetRow {
  [columnName: string]: string;
}

export interface LoadedDatasetTable {
  manifest: DatasetTableManifest;
  fileName: string;
  absolutePath: string;
  rows: DatasetRow[];
  rowsByPrimaryKey: Map<string, DatasetRow>;
}

export interface DatasetRelationshipIndex {
  manifest: DatasetRelationshipManifest;
  rowsByJoinKey: Map<string, DatasetRow[]>;
}

export interface LoadedDatasetBundle {
  manifest: DatasetBundleManifest;
  tablesByName: Map<string, LoadedDatasetTable>;
  relationshipsByName: Map<string, DatasetRelationshipIndex>;
}

export interface SharedBundleFileDescriptor {
  fileName: string;
  absolutePath: string;
  description: string;
}

const DEMO_DATASET_DIR = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "data",
  "openai-native",
);

const DEMO_ORDER_MARGIN_BUNDLE_MANIFEST_PATH = path.join(
  DEMO_DATASET_DIR,
  "demo_order_margin_bundle_manifest.json",
);

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  fields.push(current);
  return fields;
}

function parseCsv(contents: string): DatasetRow[] {
  const lines = contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: DatasetRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function serializeKey(
  row: DatasetRow,
  columns: string[],
): string {
  return columns.map((column) => row[column] ?? "").join("\u001f");
}

function resolveSourceFileName(source: DatasetTableSource): string {
  if (source.type === "csv_file") {
    return source.file_name;
  }

  if (source.exported_csv_file_name) {
    return source.exported_csv_file_name;
  }

  throw new Error(
    `Dataset source ${source.workbook_file_name}#${source.sheet_name} is missing exported_csv_file_name.`,
  );
}

const DEMO_ORDER_MARGIN_BUNDLE_MANIFEST = JSON.parse(
  readFileSync(DEMO_ORDER_MARGIN_BUNDLE_MANIFEST_PATH, "utf8"),
) as DatasetBundleManifest;

export const DEMO_ORDER_MARGIN_BUNDLE_SHARED_FILES: SharedBundleFileDescriptor[] = [
  {
    fileName: path.basename(DEMO_ORDER_MARGIN_BUNDLE_MANIFEST_PATH),
    absolutePath: DEMO_ORDER_MARGIN_BUNDLE_MANIFEST_PATH,
    description:
      "Manifest declaring the multi-table order-margin bundle, including explicit join relationships.",
  },
  ...DEMO_ORDER_MARGIN_BUNDLE_MANIFEST.tables.map((table) => {
    const fileName = resolveSourceFileName(table.source);
    return {
      fileName,
      absolutePath: path.join(DEMO_DATASET_DIR, fileName),
      description: table.description,
    };
  }),
];

let cachedDemoOrderMarginBundle: LoadedDatasetBundle | null = null;

export function getDemoOrderMarginBundle(): LoadedDatasetBundle {
  if (cachedDemoOrderMarginBundle) {
    return cachedDemoOrderMarginBundle;
  }

  const tablesByName = new Map<string, LoadedDatasetTable>();

  for (const table of DEMO_ORDER_MARGIN_BUNDLE_MANIFEST.tables) {
    const fileName = resolveSourceFileName(table.source);
    const absolutePath = path.join(DEMO_DATASET_DIR, fileName);
    const rows = parseCsv(readFileSync(absolutePath, "utf8"));
    const rowsByPrimaryKey = new Map(
      rows.map((row) => [serializeKey(row, table.primary_key), row]),
    );

    tablesByName.set(table.name, {
      manifest: table,
      fileName,
      absolutePath,
      rows,
      rowsByPrimaryKey,
    });
  }

  const relationshipsByName = new Map<string, DatasetRelationshipIndex>();

  for (const relationship of DEMO_ORDER_MARGIN_BUNDLE_MANIFEST.relationships) {
    const toTable = tablesByName.get(relationship.to_table);

    if (!toTable) {
      throw new Error(
        `Unknown to_table "${relationship.to_table}" in relationship "${relationship.name}".`,
      );
    }

    const rowsByJoinKey = new Map<string, DatasetRow[]>();

    for (const row of toTable.rows) {
      const key = serializeKey(row, relationship.to_columns);
      const relatedRows = rowsByJoinKey.get(key) ?? [];
      relatedRows.push(row);
      rowsByJoinKey.set(key, relatedRows);
    }

    relationshipsByName.set(relationship.name, {
      manifest: relationship,
      rowsByJoinKey,
    });
  }

  cachedDemoOrderMarginBundle = {
    manifest: DEMO_ORDER_MARGIN_BUNDLE_MANIFEST,
    tablesByName,
    relationshipsByName,
  };

  return cachedDemoOrderMarginBundle;
}

export function getDatasetTable(
  bundle: LoadedDatasetBundle,
  tableName: string,
): LoadedDatasetTable {
  const table = bundle.tablesByName.get(tableName);

  if (!table) {
    throw new Error(`Dataset table "${tableName}" is not available.`);
  }

  return table;
}

export function getRelatedRows(
  bundle: LoadedDatasetBundle,
  relationshipName: string,
  fromRow: DatasetRow,
): DatasetRow[] {
  const relationship = bundle.relationshipsByName.get(relationshipName);

  if (!relationship) {
    throw new Error(`Dataset relationship "${relationshipName}" is not available.`);
  }

  const key = serializeKey(fromRow, relationship.manifest.from_columns);
  return relationship.rowsByJoinKey.get(key) ?? [];
}

export function getSingleRelatedRow(
  bundle: LoadedDatasetBundle,
  relationshipName: string,
  fromRow: DatasetRow,
): DatasetRow {
  const relatedRows = getRelatedRows(bundle, relationshipName, fromRow);

  if (relatedRows.length !== 1) {
    throw new Error(
      `Expected exactly one related row for "${relationshipName}", received ${relatedRows.length}.`,
    );
  }

  return relatedRows[0];
}
