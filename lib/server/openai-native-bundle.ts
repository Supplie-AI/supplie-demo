import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI, { toFile } from "openai";
import {
  logError,
  logInfo,
  serializeError,
} from "./app-logger.ts";
import {
  DEMO_MANUFACTURING_DEPENDENCY_BUNDLE_SHARED_FILES,
  DEMO_ORDER_MARGIN_BUNDLE_SHARED_FILES,
} from "./demo-dataset-bundle.ts";

const SHARED_BUNDLE_ID = "supplie-demo-openai-native-shared-bundle-v4";
const SHARED_VECTOR_STORE_NAME = "supplie-demo-openai-native-reference-files";

export const SHARED_OPENAI_NATIVE_FILES = [
  {
    fileName: "capability-baseline-notes.md",
    absolutePath: path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "openai-native",
      "capability-baseline-notes.md",
    ),
    description:
      "Shared baseline notes for the native OpenAI web, file, and sandbox tools available to both demo panels.",
  },
  {
    fileName: "global_freight_benchmarks.csv",
    absolutePath: path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "openai-native",
      "global_freight_benchmarks.csv",
    ),
    description:
      "A shared illustrative freight benchmark CSV available to both panels through native OpenAI file and code workflows.",
  },
  ...DEMO_ORDER_MARGIN_BUNDLE_SHARED_FILES,
  ...DEMO_MANUFACTURING_DEPENDENCY_BUNDLE_SHARED_FILES,
  {
    fileName: "demo_order_margin_reference.md",
    absolutePath: path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "openai-native",
      "demo_order_margin_reference.md",
    ),
    description:
      "Reference notes for calculating demo net margin and supplier drag from the bundled multi-table order bundle.",
  },
  {
    fileName: "demo_manufacturing_graph_reference.md",
    absolutePath: path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "openai-native",
      "demo_manufacturing_graph_reference.md",
    ),
    description:
      "Reference notes for the canonical manufacturing dependency graph and deep traceability path.",
  },
] as const;

export interface PreparedOpenAIBundle {
  fileIds: string[];
  vectorStoreId: string;
}

let openAIClient: OpenAI | null = null;
let preparedBundlePromise: Promise<PreparedOpenAIBundle> | null = null;

export function getOpenAIClient() {
  if (openAIClient) {
    return openAIClient;
  }

  openAIClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return openAIClient;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForVectorStoreReady(
  client: OpenAI,
  vectorStoreId: string,
): Promise<void> {
  logInfo("openai_bundle_vector_store_wait_started", {
    vector_store_id: vectorStoreId,
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const vectorStore = await client.vectorStores.retrieve(vectorStoreId);
    if (vectorStore.status === "completed") {
      logInfo("openai_bundle_vector_store_ready", {
        vector_store_id: vectorStoreId,
        attempts: attempt + 1,
      });
      return;
    }

    await wait(1000);
  }

  throw new Error("Timed out waiting for the OpenAI vector store to finish.");
}

async function findExistingBundle(
  client: OpenAI,
): Promise<PreparedOpenAIBundle | null> {
  logInfo("openai_bundle_lookup_started", {
    expected_bundle_id: SHARED_BUNDLE_ID,
  });
  const vectorStores = await client.vectorStores.list({ limit: 100 });
  const existing = vectorStores.data.find(
    (store) => store.metadata?.bundle_id === SHARED_BUNDLE_ID,
  );

  if (!existing) {
    return null;
  }

  if (existing.status !== "completed") {
    await waitForVectorStoreReady(client, existing.id);
  }

  const filesPage = await client.vectorStores.files.list(existing.id, {
    limit: 20,
  });
  const fileIds = filesPage.data.map((file) => file.id);

  if (
    fileIds.length === 0 ||
    fileIds.length !== SHARED_OPENAI_NATIVE_FILES.length
  ) {
    return null;
  }

  return {
    vectorStoreId: existing.id,
    fileIds,
  };
}

async function createBundledFiles(
  client: OpenAI,
): Promise<PreparedOpenAIBundle> {
  logInfo("openai_bundle_creation_started", {
    file_count: SHARED_OPENAI_NATIVE_FILES.length,
    bundle_id: SHARED_BUNDLE_ID,
  });
  const uploadedFiles = await Promise.all(
    SHARED_OPENAI_NATIVE_FILES.map(async (file) => {
      const contents = await readFile(file.absolutePath);

      logInfo("openai_bundle_file_upload_started", {
        file_name: file.fileName,
      });
      const uploaded = await client.files.create({
        file: await toFile(contents, file.fileName),
        purpose: "assistants",
      });

      await client.files.waitForProcessing(uploaded.id, {
        pollInterval: 1000,
        maxWait: 120000,
      });

      logInfo("openai_bundle_file_ready", {
        file_name: file.fileName,
        file_id: uploaded.id,
      });
      return uploaded;
    }),
  );

  const vectorStore = await client.vectorStores.create({
    name: SHARED_VECTOR_STORE_NAME,
    file_ids: uploadedFiles.map((file) => file.id),
    metadata: {
      bundle_id: SHARED_BUNDLE_ID,
      app: "supplie-demo",
      panel: "shared",
    },
  });

  await waitForVectorStoreReady(client, vectorStore.id);

  return {
    vectorStoreId: vectorStore.id,
    fileIds: uploadedFiles.map((file) => file.id),
  };
}

export async function prepareOpenAIBundle(): Promise<PreparedOpenAIBundle> {
  if (!preparedBundlePromise) {
    preparedBundlePromise = (async () => {
      const client = getOpenAIClient();
      const existing = await findExistingBundle(client);
      if (existing) {
        logInfo("openai_bundle_reused", {
          vector_store_id: existing.vectorStoreId,
          file_count: existing.fileIds.length,
        });
        return existing;
      }

      const created = await createBundledFiles(client);
      logInfo("openai_bundle_ready", {
        vector_store_id: created.vectorStoreId,
        file_count: created.fileIds.length,
      });
      return created;
    })().catch((error) => {
      preparedBundlePromise = null;
      logError("openai_bundle_failed", {
        error: serializeError(error),
      });
      throw error;
    });
  }

  return preparedBundlePromise;
}
