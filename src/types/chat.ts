// Chat types for Transformers.js integration

// Core chat types
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
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
    | 'error';
  data?: any;
  file?: string;
  progress?: number;
  total?: number;
  output?: string;
  tps?: number;
  numTokens?: number;
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
