import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ChatMessage,
  ChatModel,
  ModelLoadingState,
  WorkerRequest,
  WorkerResponse,
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
  const [selectedModel, setSelectedModelState] = useState(
    'distilbert-base-uncased'
  );
  const [isLoading, setIsLoading] = useState(false);
  // New non-breaking state additions
  const [modelState, setModelState] = useState<ModelLoadingState>({
    status: 'ready', // Start as ready since default is DistilBERT (mock)
    progress: [],
  });
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const workerRef = useRef<Worker | null>(null);
  // Queue messages to generate once model becomes ready
  const pendingGenerateRef = useRef<ChatMessage[] | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const loadFallbackTimerRef = useRef<number | null>(null);

  // Feature flag for worker connection - controllable via environment
  // Set GATSBY_CHAT_WORKER=true to enable real model
  const USE_CHAT_WORKER = typeof window !== 'undefined';
  if (typeof window !== 'undefined' && (window as any).CHAT_DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[chat] USE_CHAT_WORKER', USE_CHAT_WORKER);
  }

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

  const setSelectedModel = (modelId: string) => {
    // Don't do anything if already selected
    if (modelId === selectedModel) return;

    // Interrupt any ongoing generation
    if (isGenerating && workerRef.current) {
      workerRef.current.postMessage({ type: 'interrupt' });
      setIsGenerating(false);
    }

    // Clear any fallback timers
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (loadFallbackTimerRef.current) {
      clearTimeout(loadFallbackTimerRef.current);
      loadFallbackTimerRef.current = null;
    }

    // Reset any pending generation
    pendingGenerateRef.current = null;
    setIsLoading(false);

    // Update the selected model
    setSelectedModelState(modelId);

    // If switching to Qwen and worker is available, trigger loading
    if (
      modelId === 'onnx-community/Qwen3-0.6B-ONNX' &&
      USE_CHAT_WORKER &&
      workerRef.current
    ) {
      // Start loading the model
      setModelState({
        status: 'loading',
        progress: [],
        loadingMessage: 'Loading model...',
      });

      workerRef.current.postMessage({
        type: 'load',
        data: { modelId },
      });
    } else if (modelId === 'distilbert-base-uncased') {
      // For DistilBERT, set model state to ready (it's just mock)
      setModelState({ status: 'ready', progress: [] });
    } else {
      // For any other model, set to idle until loaded
      setModelState({ status: 'idle', progress: [] });
    }
  };

  // Safe no-op methods when worker is disabled
  const loadModel = (modelId?: string) => {
    if (USE_CHAT_WORKER && workerRef.current) {
      // Proactively show loading UI
      setModelState({
        status: 'loading',
        progress: [],
        loadingMessage: 'Loading model...',
      });
      const req: WorkerRequest = {
        type: 'load',
        data: { modelId: modelId ?? selectedModel },
      } as any;
      workerRef.current.postMessage(req);
      return;
    }

    // Simulated non-breaking behavior
    setModelState({
      status: 'loading',
      progress: [],
      loadingMessage: 'Loading model...',
    });
    // Simulate a brief loading then ready
    setTimeout(() => {
      setModelState({ status: 'ready', progress: [] });
    }, 50);
  };

  const generateResponse = (msgs: ChatMessage[]) => {
    // Route based on selected model
    if (selectedModel === 'distilbert-base-uncased') {
      // Always use mock responses for DistilBERT
      setIsLoading(true);
      setTimeout(
        () => {
          const responses = [
            "I'm DistilBERT! This is a mock response - I'm a lightweight model for text understanding, but I'm just simulated for this demo.",
            'DistilBERT here with a placeholder response. In a real implementation, I would analyze text semantically.',
            'Hello from the DistilBERT model! This is a test response while the real model integration is in progress.',
            'DistilBERT mock: I specialize in understanding text, but this is just a development placeholder.',
            'This is a simulated DistilBERT response. The real model would provide text classification and understanding.',
          ];

          const randomResponse =
            responses[Math.floor(Math.random() * responses.length)];

          addMessage({
            content: randomResponse,
            role: 'assistant',
          });

          setIsLoading(false);
        },
        300 + Math.random() * 200
      ); // Variable delay for more realistic feel
      return;
    }

    // For Qwen and other real models, use worker
    if (USE_CHAT_WORKER && workerRef.current && modelState.status === 'ready') {
      try {
        const req: WorkerRequest = {
          type: 'generate',
          data: { messages: msgs },
        } as any;
        workerRef.current.postMessage(req);

        // Start a fallback timer: if no 'start' within 6s, inject mock response
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
        fallbackTimerRef.current = window.setTimeout(() => {
          setIsGenerating(false);
          setIsLoading(false);
          setMessages((prev: ChatMessage[]) => {
            const newMessages = [...prev];
            const last = newMessages[newMessages.length - 1];
            if (!last || last.role !== 'assistant') {
              newMessages.push({
                id: Math.random().toString(36).substr(2, 9),
                role: 'assistant',
                content:
                  "I'm having trouble starting the model right now. Here's a quick reply while I recover.",
                timestamp: new Date(),
              });
            }
            return newMessages;
          });
        }, 6000);
        return;
      } catch (error) {
        console.error('Worker generation failed, falling back to mock:', error);
        // Fall through to mock behavior
      }
    }

    // If worker is available but model isn't ready, queue the request and kick off load
    // But only for non-DistilBERT models
    if (
      USE_CHAT_WORKER &&
      workerRef.current &&
      modelState.status !== 'ready' &&
      selectedModel !== 'distilbert-base-uncased'
    ) {
      pendingGenerateRef.current = msgs;
      // If we aren't already loading, trigger it
      if (modelState.status === 'idle' || modelState.status === 'error') {
        setModelState({
          status: 'loading',
          progress: [],
          loadingMessage: 'Loading model...',
        });
        workerRef.current.postMessage({
          type: 'load',
          data: { modelId: selectedModel },
        });
      }

      // Start/refresh a load fallback timer (e.g., 15s) to inject a mock if model can't load
      if (loadFallbackTimerRef.current) {
        clearTimeout(loadFallbackTimerRef.current);
        loadFallbackTimerRef.current = null;
      }
      loadFallbackTimerRef.current = window.setTimeout(() => {
        setModelState(prev => ({ ...prev, status: 'idle' }));
        setIsGenerating(false);
        setIsLoading(false);
        setMessages((prev: ChatMessage[]) => {
          const newMessages = [...prev];
          const last = newMessages[newMessages.length - 1];
          if (!last || last.role !== 'assistant') {
            newMessages.push({
              id: Math.random().toString(36).substr(2, 9),
              role: 'assistant',
              content:
                "The model is taking too long to load, so here's a quick response while I keep trying.",
              timestamp: new Date(),
            });
          }
          return newMessages;
        });
      }, 15000);
      return;
    }

    // Mock behavior (fallback or default) - only for non-DistilBERT models
    // DistilBERT already has its dedicated mock responses above
    if (selectedModel !== 'distilbert-base-uncased') {
      setIsLoading(true);
      setTimeout(
        () => {
          const responses = [
            "I'm working on integrating a real AI model! For now, here's a mock response.",
            'The AI model is being set up. This is a simulated response while we prepare the real one.',
            'Real AI coming soon! This is a placeholder response for testing.',
            "Model loading in progress. Here's a mock response while we wait.",
            'AI model integration in development. This is a test response.',
          ];

          const randomResponse =
            responses[Math.floor(Math.random() * responses.length)];

          addMessage({
            content: randomResponse,
            role: 'assistant',
          });

          setIsLoading(false);
        },
        300 + Math.random() * 200
      ); // Variable delay for more realistic feel
    }
  };

  const interruptGeneration = () => {
    if (USE_CHAT_WORKER && workerRef.current) {
      const req: WorkerRequest = { type: 'interrupt' };
      workerRef.current.postMessage(req);
      return;
    }
    // Simulated no-op
    setIsGenerating(false);
  };

  const resetConversation = () => {
    if (USE_CHAT_WORKER && workerRef.current) {
      const req: WorkerRequest = { type: 'reset' };
      workerRef.current.postMessage(req);
      return;
    }
    // Simulated no-op
    setModelState(prev => ({ ...prev, status: 'idle', progress: [] }));
  };

  // Initialize worker when feature flag is enabled
  useEffect(() => {
    if (!USE_CHAT_WORKER) return;
    if (workerRef.current) return;

    try {
      workerRef.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module',
      });

      const onMessage = (e: MessageEvent<WorkerResponse>) => {
        const data = e.data as any; // Type assertion for flexibility

        // Handle progress updates from the model loading
        if (data.status === 'progress') {
          const { file = 'model', loaded, total, progress } = data as any;
          // Update a single progress bar
          setModelState((prev: ModelLoadingState) => ({
            ...prev,
            status: 'loading',
            progress: [{ file, loaded, total, progress }],
          }));
          return;
        }
        // Handle other worker messages
        switch (data.status) {
          case 'check_complete':
            setWebGPUSupported(data.webGPUSupported ?? null);
            break;
          case 'loading': {
            const message = String(data.data ?? '');
            setModelState((prev: ModelLoadingState) => ({
              ...prev,
              status: 'loading',
              loadingMessage: message,
              // Only clear progress on the initial model download start
              progress: message === 'Loading model...' ? [] : prev.progress,
            }));
            break;
          }
          case 'ready':
            setModelState({ status: 'ready', progress: [] });
            setIsGenerating(false);
            if (loadFallbackTimerRef.current) {
              clearTimeout(loadFallbackTimerRef.current);
              loadFallbackTimerRef.current = null;
            }
            // If a request was queued while loading, flush it now
            if (
              USE_CHAT_WORKER &&
              workerRef.current &&
              pendingGenerateRef.current
            ) {
              const queued = pendingGenerateRef.current;
              pendingGenerateRef.current = null;
              try {
                workerRef.current.postMessage({
                  type: 'generate',
                  data: { messages: queued },
                });
              } catch (e) {
                console.warn('Failed to flush queued request:', e);
              }
            }
            break;
          case 'start':
            setIsGenerating(true);
            if (fallbackTimerRef.current) {
              clearTimeout(fallbackTimerRef.current);
              fallbackTimerRef.current = null;
            }
            addMessage({ role: 'assistant', content: '' });
            break;
          case 'update':
            // Update the last assistant message with streaming content
            setMessages((prev: ChatMessage[]) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant') {
                newMessages[newMessages.length - 1] = {
                  ...lastMessage,
                  content: lastMessage.content + (data.output || ''),
                };
              }
              return newMessages;
            });
            break;
          case 'complete': {
            setIsGenerating(false);
            setIsLoading(false);
            if (fallbackTimerRef.current) {
              clearTimeout(fallbackTimerRef.current);
              fallbackTimerRef.current = null;
            }
            const finalText = Array.isArray((data as any).output)
              ? (data as any).output.join('')
              : String((data as any).output || '');
            // Ensure the final output is reflected even if no streaming occurred
            setMessages((prev: ChatMessage[]) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant') {
                newMessages[newMessages.length - 1] = {
                  ...lastMessage,
                  content:
                    lastMessage.content && lastMessage.content.length > 0
                      ? lastMessage.content
                      : finalText,
                };
              } else if (finalText) {
                newMessages.push({
                  id: Math.random().toString(36).substr(2, 9),
                  role: 'assistant',
                  content: finalText,
                  timestamp: new Date(),
                });
              }
              return newMessages;
            });
            break;
          }
          case 'error': {
            const errMsg = String(data.data ?? 'Worker error');
            setModelState((prev: ModelLoadingState) => ({
              ...prev,
              status: 'error',
              error: errMsg,
            }));
            setIsGenerating(false);
            setIsLoading(false);
            if (fallbackTimerRef.current) {
              clearTimeout(fallbackTimerRef.current);
              fallbackTimerRef.current = null;
            }
            // Surface an assistant message so users see feedback even on failure
            setMessages((prev: ChatMessage[]) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              const fallbackText =
                'Sorry, I ran into an error while generating the response. Retrying on CPU may help.\n' +
                `Details: ${errMsg}`;
              if (lastMessage && lastMessage.role === 'assistant') {
                newMessages[newMessages.length - 1] = {
                  ...lastMessage,
                  content:
                    lastMessage.content && lastMessage.content.length > 0
                      ? lastMessage.content
                      : fallbackText,
                };
              } else {
                newMessages.push({
                  id: Math.random().toString(36).substr(2, 9),
                  role: 'assistant',
                  content: fallbackText,
                  timestamp: new Date(),
                });
              }
              return newMessages;
            });
            break;
          }
        }
      };

      const onError = (e: ErrorEvent) => {
        setModelState((prev: ModelLoadingState) => ({
          ...prev,
          status: 'error',
          error: String(e.message || 'Worker error'),
        }));
        setIsGenerating(false);
        setIsLoading(false);
      };

      workerRef.current.addEventListener('message', onMessage as any);
      workerRef.current.addEventListener('error', onError as any);

      // Perform WebGPU capability check
      workerRef.current.postMessage({ type: 'check' });

      // Don't auto-load any model - only load when user selects Qwen

      return () => {
        try {
          workerRef.current?.removeEventListener('message', onMessage as any);
          workerRef.current?.removeEventListener('error', onError as any);
          workerRef.current?.terminate();
          if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
        } catch (err) {
          console.warn('Error cleaning up worker:', err);
        }
        workerRef.current = null;
      };
    } catch (err) {
      console.error('Failed to initialize worker:', err);
      setModelState({
        status: 'error',
        progress: [],
        error: 'Failed to initialize worker',
      });
    }
  }, [USE_CHAT_WORKER]);

  return (
    <ChatContext.Provider
      value={{
        isChatOpen,
        isClosing,
        messages,
        selectedModel: selectedModel,
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
