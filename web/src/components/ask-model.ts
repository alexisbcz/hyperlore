// Shared by the Ask UI and its worker: which model runs where, and the messages between them.

export type ModelSpec = {
  id: string;
  label: string;
  device: "webgpu" | "wasm";
  dtype: "q4f16" | "fp32";
  /** ONNX file to load when transformers.js has no dtype for it. */
  file?: string;
  bytes: number;
};

/** LFM2.5 (Liquid AI): 1.2B on WebGPU, 350M on CPU, where every token costs more. */
export function pickModel(webgpu: boolean): ModelSpec {
  return webgpu
    ? { id: "LiquidAI/LFM2.5-1.2B-Instruct-ONNX", label: "LFM2.5 1.2B", device: "webgpu", dtype: "q4f16", bytes: 760e6 }
    : // model_q4f32: the other builds quantise the embeddings with GatherBlockQuantized, which the WebAssembly
      // backend can't run. transformers.js has no "q4f32" dtype, so the file is named and "fp32" adds no suffix.
      { id: "LiquidAI/LFM2.5-350M-ONNX", label: "LFM2.5 350M", device: "wasm", dtype: "fp32", file: "model_q4f32", bytes: 481e6 };
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type WorkerIn = { type: "load" } | { type: "generate"; id: number; messages: ChatMessage[] };

export type WorkerOut =
  | { type: "progress"; loaded: number; total: number }
  | { type: "ready"; device: string; model: string }
  | { type: "token"; id: number; text: string }
  | { type: "done"; id: number }
  | { type: "error"; id?: number; message: string };
