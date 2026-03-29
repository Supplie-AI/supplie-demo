export interface StreamToolStartMetadata {
  type: "tool-start";
  toolCallId: string;
  toolName: string;
  args: unknown;
}

export interface StreamToolEndMetadata {
  type: "tool-end";
  toolCallId: string;
  toolName: string;
  result: unknown;
}

export interface StreamToolErrorMetadata {
  type: "tool-error";
  toolCallId: string;
  toolName: string;
  error: string;
}

export type StreamMetadata =
  | StreamToolStartMetadata
  | StreamToolEndMetadata
  | StreamToolErrorMetadata;

const encoder = new TextEncoder();

export function encodeTextDelta(delta: string): Uint8Array {
  return encoder.encode(`0:${JSON.stringify(delta)}\n`);
}

export function encodeMetadata(metadata: StreamMetadata): Uint8Array {
  return encoder.encode(`8:${JSON.stringify(metadata)}\n`);
}

export function encodeError(message: string): Uint8Array {
  return encoder.encode(`3:${JSON.stringify(message)}\n`);
}

export function encodeDone(): Uint8Array {
  return encoder.encode(
    'd:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n',
  );
}
