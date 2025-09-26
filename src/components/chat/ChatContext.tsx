import React, {
  createContext,
  ReactNode,
  useContext,
  useRef,
  useState,
} from 'react';
import {
  ChatMessage,
  ChatModel,
  ModelLoadingState,
  WorkerRequest,
} from '../../types/chat';

interface ChatContextType {
  isChatOpen: boolean;
  isClosing: boolean;
  messages: ChatMessage[];
  selectedModel: string;
  availableModels: ChatModel[];
  isLoading: boolean;
  // Extended (non-breaking, safe to ignore for existing usage)
  modelState?: ModelLoadingState;
  webGPUSupported?: boolean | null;
  isGenerating?: boolean;
  setChatOpen: (isOpen: boolean) => void;
  setClosing: (isClosing: boolean) => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setSelectedModel: (modelId: string) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
  // New optional APIs (no-op by default to keep steel thread)
  loadModel?: (modelId?: string) => void;
  generateResponse?: (messages: ChatMessage[]) => void;
  interruptGeneration?: () => void;
  resetConversation?: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState('distilbert-base-uncased');
  const [isLoading, setIsLoading] = useState(false);
  // New non-breaking state additions
  const [modelState] = useState<ModelLoadingState>({
    status: 'idle',
    progress: [],
  });
  const [webGPUSupported] = useState<boolean | null>(null);
  const [isGenerating] = useState<boolean>(false);
  const workerRef = useRef<Worker | null>(null);

  const availableModels: ChatModel[] = [
    {
      id: 'distilbert-base-uncased',
      name: 'DistilBERT',
      description: 'Lightweight BERT model for text understanding',
    },
    {
      id: 'onnx-community/Qwen3-0.6B-ONNX',
      name: 'Qwen3-0.6B',
      description: 'Fast, lightweight reasoning model (WebGPU/CPU fallback)',
      size: '~600MB',
      contextWindow: 4096,
    },
  ];

  const setChatOpen = (isOpen: boolean) => {
    setIsChatOpen(isOpen);
  };

  const setClosing = (isClosing: boolean) => {
    setIsClosing(isClosing);
  };

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  // Non-breaking worker setup placeholder (disabled for now to avoid bundler issues)
  // We'll enable worker initialization in a later step once bundler config is ready.
  const USE_CHAT_WORKER = false;

  // Safe no-op methods when worker is disabled
  const loadModel = (modelId?: string) => {
    if (!USE_CHAT_WORKER || !workerRef.current) return;
    const req: WorkerRequest = {
      type: 'load',
      data: { modelId: modelId ?? selectedModel },
    } as any;
    workerRef.current.postMessage(req);
  };

  const generateResponse = (msgs: ChatMessage[]) => {
    if (!USE_CHAT_WORKER || !workerRef.current) return;
    const req: WorkerRequest = {
      type: 'generate',
      data: { messages: msgs },
    } as any;
    workerRef.current.postMessage(req);
  };

  const interruptGeneration = () => {
    if (!USE_CHAT_WORKER || !workerRef.current) return;
    const req: WorkerRequest = { type: 'interrupt' };
    workerRef.current.postMessage(req);
  };

  const resetConversation = () => {
    if (!USE_CHAT_WORKER || !workerRef.current) return;
    const req: WorkerRequest = { type: 'reset' };
    workerRef.current.postMessage(req);
  };

  return (
    <ChatContext.Provider
      value={{
        isChatOpen,
        isClosing,
        messages,
        selectedModel,
        availableModels,
        isLoading,
        modelState,
        webGPUSupported,
        isGenerating,
        setChatOpen,
        setClosing,
        addMessage,
        setSelectedModel,
        setLoading,
        clearMessages,
        loadModel,
        generateResponse,
        interruptGeneration,
        resetConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
