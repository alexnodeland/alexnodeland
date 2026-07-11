// Chat types for Transformers.js integration

// Core chat types
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  // Optional thinking block content
  thinking?: string;
  isThinkingExpanded?: boolean;
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
    | 'reset_complete';
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
