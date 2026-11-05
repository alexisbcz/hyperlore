// Runs a small Liquid AI model in the visitor's browser (Web Worker, so the page never freezes).
// WebGPU when the device has it, otherwise CPU through WebAssembly with a smaller model. Weights come
// from Hugging Face's CDN once and are then cached by the browser.
import { AutoModelForCausalLM, AutoTokenizer, TextStreamer, type PreTrainedModel, type PreTrainedTokenizer } from "@huggingface/transformers";
import { pickModel, type WorkerIn, type WorkerOut } from "./ask-model";

let loading: Promise<{ tokenizer: PreTrainedTokenizer; model: PreTrainedModel }> | null = null;

const post = (m: WorkerOut) => self.postMessage(m);

async function load() {
  const gpu = "gpu" in navigator && !!(await (navigator as Navigator & { gpu: { requestAdapter(): Promise<unknown> } }).gpu.requestAdapter().catch(() => null));
  const spec = pickModel(gpu);
  // Sum progress across the files the model is split into.
  const files = new Map<string, { loaded: number; total: number }>();
  const progress_callback = (p: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (p.status !== "progress" || !p.file) return;
    files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 });
    let loaded = 0;
    let total = 0;
    for (const f of files.values()) {
      loaded += f.loaded;
      total += f.total;
    }
    post({ type: "progress", loaded, total: Math.max(total, spec.bytes) });
  };
  const tokenizer = await AutoTokenizer.from_pretrained(spec.id);
  const model = await AutoModelForCausalLM.from_pretrained(spec.id, {
    device: spec.device,
    dtype: spec.dtype,
    ...(spec.file && { model_file_name: spec.file }),
    progress_callback,
  });
  post({ type: "ready", device: spec.device, model: spec.label });
  return { tokenizer, model };
}

self.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const msg = e.data;
  try {
    loading ??= load();
    const { tokenizer, model } = await loading;
    if (msg.type !== "generate") return;
    const input = tokenizer.apply_chat_template(msg.messages, { add_generation_prompt: true, return_dict: true }) as Record<string, unknown>;
    const streamer = new TextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text: string) => post({ type: "token", id: msg.id, text }),
    });
    await model.generate({ ...input, max_new_tokens: 180, do_sample: false, repetition_penalty: 1.05, streamer });
    post({ type: "done", id: msg.id });
  } catch (err) {
    loading = null;
    post({ type: "error", id: msg.type === "generate" ? msg.id : undefined, message: err instanceof Error ? err.message : String(err) });
  }
};
