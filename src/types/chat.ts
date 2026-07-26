// Chat types for Transformers.js integration

/** A page from Alex's site that a grounded answer drew on. Produced by
 *  retrieval in the worker and rendered under the message. */
export interface ChatSource {
  /** Bracket number the model cites this passage as, e.g. [2]. */
  n: number;
  id: string;
  title: string;
  url: string;
  kind: 'cv' | 'blog' | 'project' | 'home';
}

// Core chat types
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  // Optional thinking block content
  thinking?: string;
  isThinkingExpanded?: boolean;
  /** Attached as soon as retrieval finishes, then narrowed to the sources the
   *  finished answer actually cited. */
  sources?: ChatSource[];
  /** What it cost to produce this answer, shown under it. */
  stats?: ChatMessageStats;
}

/** Per-answer cost, measured in the worker and rendered under the message. */
export interface ChatMessageStats {
  /** Corpus search, including embedding the question. */
  retrievalMs: number;
  /** Reading the prompt — null if the cache covered all of it. */
  prefillMs: number | null;
  /** Writing the answer. */
  decodeMs: number;
  promptTokens: number;
  outputTokens: number;
  /** Whether the reusable prompt prefix was carried over for this turn. */
  systemKvHit: boolean;
  /** Tokens the cache covered, so a hit can show what it saved. */
  systemKvCovered: number;
  /** History messages folded into that prefix — 0 on the first question,
   *  growing by two per turn as the conversation amortises. */
  systemKvTurns?: number;
  device: string;
}

// Per-model generation parameters bundled in one flat object.
// WebGPU and WASM (CPU) each get their own tuned values.
export interface ModelGenerationProfile {
  maxTokens: number;
  maxTokensWasm: number;
  temperature: number;
  temperatureWasm: number;
  topK: number;
  topKWasm: number;
  topP?: number; // undefined means omit top_p from the generation call
  repetitionPenalty: number;
  // Force greedy decoding on all devices (most reliable for grounded QA).
  // When undefined, sampling is used on GPU and greedy on WASM.
  doSample?: boolean;
}

export interface ChatModel {
  id: string;
  name: string;
  description: string;
  // Extended properties for LLM models
  size?: string;
  contextWindow?: number;
  device?: 'webgpu' | 'cpu';
  dtype?: string;
  dtypeWasm?: string;
  fallbackDevice?: 'wasm' | 'cpu';
  supportsThinking?: boolean;
  // When true the model always emits <think> blocks regardless of the toggle.
  alwaysThinks?: boolean;
  // Extra options passed to tokenizer.apply_chat_template for this model.
  templateOptions?: Record<string, any>;
  // Per-model generation parameters.
  generationProfile?: ModelGenerationProfile;
}

// Model loading and progress tracking
export interface ProgressItem {
  file: string;
  progress: number;
  total?: number;
  loaded?: number;
}

export interface ModelLoadingState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  progress: ProgressItem[];
  error?: string;
  loadingMessage?: string;
}

// Worker communication types
export interface WorkerRequest {
  type: 'check' | 'load' | 'generate' | 'interrupt' | 'reset';
  data?: any;
}

export interface WorkerResponse {
  status:
    | 'loading'
    | 'initiate'
    | 'progress'
    | 'done'
    | 'ready'
    | 'start'
    | 'update'
    | 'complete'
    | 'error'
    | 'check_complete'
    | 'interrupted'
    | 'reset_complete'
    // Retrieved passages, sent before generation starts
    | 'sources'
    // The search index failed to load; the model still works, but ungrounded
    | 'retriever_error';
  data?: any;
  file?: string;
  progress?: number;
  total?: number;
  output?: string;
  tps?: number;
  numTokens?: number;
  state?: 'thinking' | 'answering';
  // modelId of the model that finished loading (attached to 'ready')
  modelId?: string;
  sources?: ChatSource[];
  /** Wall-clock milliseconds retrieval took, for the eval harness. */
  retrievalMs?: number;
}

// Generation parameters
export interface GenerationConfig {
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  doSample?: boolean;
}

// Extended chat context type for future use
export interface ExtendedChatContextType {
  // Basic chat functionality (mirrors existing ChatContext)
  isChatOpen: boolean;
  isClosing: boolean;
  messages: ChatMessage[];
  selectedModel: string;
  availableModels: ChatModel[];
  isLoading: boolean;
  setChatOpen: (isOpen: boolean) => void;
  setClosing: (isClosing: boolean) => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setSelectedModel: (modelId: string) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;

  // Extended functionality for LLM integration
  modelState: ModelLoadingState;
  webGPUSupported: boolean | null;
  isGenerating: boolean;
  generationConfig: GenerationConfig;
  loadModel: (modelId: string) => Promise<void>;
  generateResponse: (messages: ChatMessage[]) => Promise<void>;
  interruptGeneration: () => void;
  resetConversation: () => void;
}
