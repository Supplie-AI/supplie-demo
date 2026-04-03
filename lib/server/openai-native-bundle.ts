import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI, { toFile } from "openai";

const SHARED_BUNDLE_ID = "supplie-demo-openai-native-shared-bundle-v1";
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
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const vectorStore = await client.vectorStores.retrieve(vectorStoreId);
    if (vectorStore.status === "completed") {
      return;
    }

    await wait(1000);
  }

  throw new Error("Timed out waiting for the OpenAI vector store to finish.");
}

async function findExistingBundle(
  client: OpenAI,
): Promise<PreparedOpenAIBundle | null> {
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

  if (fileIds.length === 0) {
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
  const uploadedFiles = await Promise.all(
    SHARED_OPENAI_NATIVE_FILES.map(async (file) => {
      const contents = await readFile(file.absolutePath);

      const uploaded = await client.files.create({
        file: await toFile(contents, file.fileName),
        purpose: "assistants",
      });

      await client.files.waitForProcessing(uploaded.id, {
        pollInterval: 1000,
        maxWait: 120000,
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
        return existing;
      }

      return createBundledFiles(client);
    })().catch((error) => {
      preparedBundlePromise = null;
      throw error;
    });
  }

  return preparedBundlePromise;
}
