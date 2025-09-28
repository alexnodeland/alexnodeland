import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { chatConfig } from '../../config/chat';
import {
  AVAILABLE_MODELS,
  createRollingContext,
  ModelCache,
  parseThinkingBlocks,
  updateMessageWithThinking,
} from '../../lib/utils/chat';
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
  cachedModels?: string[];
  isThinkingEnabled?: boolean;
  currentDevice?: string | null;
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
  clearChatHistory?: () => void;
  toggleThinking?: () => void;
  cancelModelLoading?: () => void;
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
    chatConfig.models.default
  );
  const [isLoading, setIsLoading] = useState(false);
  // New non-breaking state additions
  const [modelState, setModelState] = useState<ModelLoadingState>({
    status: 'idle', // Start as idle since we need to load QWEN model
    progress: [],
  });
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [cachedModels, setCachedModels] = useState<string[]>([]);
  const [currentDevice, setCurrentDevice] = useState<string | null>(null);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(() => {
    // Load thinking preference from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chat-thinking-enabled');
      return saved !== null
        ? saved === 'true'
        : chatConfig.interface.enableThinking;
    }
    return chatConfig.interface.enableThinking;
  });
  const [workerInitKey, setWorkerInitKey] = useState(0); // Force worker reinitialization
  const workerRef = useRef<Worker | null>(null);

  // Feature flag for worker connection - controllable via environment
  // Set GATSBY_CHAT_WORKER=true to enable real model
  const USE_CHAT_WORKER = typeof window !== 'undefined';
  if (typeof window !== 'undefined' && (window as any).CHAT_DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[chat] USE_CHAT_WORKER', USE_CHAT_WORKER);
  }

  const availableModels: ChatModel[] = AVAILABLE_MODELS;

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
    // Clear all messages
    setMessages([]);

    // Stop any ongoing generation
    if (isGenerating && workerRef.current) {
      workerRef.current.postMessage({ type: 'interrupt' });
      setIsGenerating(false);
    }

    // Reset loading states
    setIsLoading(false);

    // Reset conversation context in worker if available
    if (USE_CHAT_WORKER && workerRef.current) {
      try {
        workerRef.current.postMessage({ type: 'reset' });
      } catch (error) {
        console.warn('Failed to reset worker conversation:', error);
      }
    }

    // Welcome message removed - using sample pills instead

    if (typeof window !== 'undefined' && (window as any).CHAT_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[chat] Chat history cleared and conversation reset');
    }
  };

  const setSelectedModel = (modelId: string) => {
    // Don't do anything if already selected
    if (modelId === selectedModel) return;

    // Interrupt any ongoing generation
    if (isGenerating && workerRef.current) {
      workerRef.current.postMessage({ type: 'interrupt' });
      setIsGenerating(false);
    }

    // Reset loading states
    setIsLoading(false);

    // Update the selected model
    setSelectedModelState(modelId);

    // Handle model loading based on cache status
    if (ModelCache.isModelCached(modelId)) {
      // Model is already cached, switch instantly
      setModelState({ status: 'ready', progress: [] });
    } else if (USE_CHAT_WORKER && workerRef.current) {
      // Load new model via worker
      setModelState({
        status: 'loading',
        progress: [],
        loadingMessage: `Loading ${availableModels.find(m => m.id === modelId)?.name || modelId}...`,
      });

      ModelCache.setModelLoading(modelId);
      workerRef.current.postMessage({
        type: 'load',
        data: { modelId },
      });
    } else {
      // Worker not available, set to idle
      setModelState({ status: 'idle', progress: [] });
    }

    // Update cached models list
    setCachedModels(ModelCache.getCachedModels().map(entry => entry.modelId));
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
    // Only generate if model is ready
    if (
      !USE_CHAT_WORKER ||
      !workerRef.current ||
      modelState.status !== 'ready'
    ) {
      console.warn('Cannot generate response: model not ready');
      return;
    }

    // Set loading state to show animated dots during time-to-first-token
    setIsLoading(true);

    try {
      // Apply rolling context window management using config
      const contextWindow = chatConfig.behavior.contextWindow;
      const contextMessages = createRollingContext(msgs, contextWindow);

      if (typeof window !== 'undefined' && (window as any).CHAT_DEBUG) {
        // eslint-disable-next-line no-console
        console.log(`[chat] Context window: ${contextWindow} tokens`);
        // eslint-disable-next-line no-console
        console.log(
          `[chat] Original messages: ${msgs.length}, Context messages: ${contextMessages.length}`
        );
      }

      const req: WorkerRequest = {
        type: 'generate',
        data: {
          messages: contextMessages,
          modelId: selectedModel,
          reasonEnabled: isThinkingEnabled,
          systemPrompt: chatConfig.generation.systemPrompt,
          generationConfig: {
            maxTokens: chatConfig.generation.maxTokens,
            temperature: chatConfig.generation.temperature,
            topK: chatConfig.generation.topK,
            repetitionPenalty: chatConfig.generation.repetitionPenalty,
          },
        },
      } as any;
      workerRef.current.postMessage(req);
    } catch (error) {
      console.error('Worker generation failed:', error);
      setIsGenerating(false);
      setIsLoading(false);
      addMessage({
        role: 'assistant',
        content:
          'Sorry, I encountered an error processing your request. Please try again.',
      });
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

  // Enhanced clear function that combines message clearing with conversation reset
  const clearChatHistory = () => {
    clearMessages();
    resetConversation();
  };

  const toggleThinking = () => {
    const newValue = !isThinkingEnabled;
    setIsThinkingEnabled(newValue);
    // Persist thinking preference
    if (typeof window !== 'undefined') {
      localStorage.setItem('chat-thinking-enabled', newValue.toString());
    }
  };

  const cancelModelLoading = () => {
    if (USE_CHAT_WORKER && workerRef.current) {
      // Terminate the worker to cancel download
      try {
        workerRef.current.terminate();
        workerRef.current = null;
      } catch (err) {
        console.warn('Error terminating worker during cancel:', err);
      }
    }

    // Reset model state back to idle to show welcome screen
    setModelState({ status: 'idle', progress: [] });
    setIsLoading(false);
    setIsGenerating(false);

    // Clear any model loading cache state completely
    ModelCache.removeModel(selectedModel);

    // Clear the cached models list to ensure fresh state
    setCachedModels([]);

    if (typeof window !== 'undefined' && (window as any).CHAT_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[chat] Model loading cancelled, worker terminated');
    }

    // Force worker reinitialization by incrementing the key
    setWorkerInitKey(prev => prev + 1);
  };

  // Helper function to create worker (environment-safe approach)
  const createWorker = () => {
    if (typeof Worker === 'undefined') return null;

    try {
      if (typeof window !== 'undefined') {
        // Detect path prefix from the initial app base URL (navigation-independent)
        const baseUrl = window.location.origin;
        let pathPrefix = '';

        // For GitHub Pages deployment, check if we're in a subdirectory
        // Use a more reliable detection method based on the initial load location
        const href = window.location.href;
        if (href.includes('/alexnodeland/')) {
          pathPrefix = '/alexnodeland';
        }

        // Debug logging
        if ((window as any).CHAT_DEBUG) {
          // eslint-disable-next-line no-console
          console.log('[chat] Base URL:', baseUrl);
          // eslint-disable-next-line no-console
          console.log('[chat] Detected pathPrefix:', pathPrefix || '(none)');
        }

        // Try multiple strategies for worker URL resolution (navigation-independent)
        const workerPaths = [
          `${baseUrl}${pathPrefix}/worker.js`, // Full absolute URL with prefix
          `${pathPrefix}/worker.js`, // Relative path with prefix
          '/worker.js', // Root fallback
          `${baseUrl}/worker.js`, // Absolute root fallback
        ];

        if ((window as any).CHAT_DEBUG) {
          // eslint-disable-next-line no-console
          console.log('[chat] Will try worker URLs:', workerPaths);
        }

        for (const workerUrl of workerPaths) {
          try {
            if (typeof window !== 'undefined' && (window as any).CHAT_DEBUG) {
              // eslint-disable-next-line no-console
              console.log('[chat] Attempting to load worker from:', workerUrl);
            }
            const worker = new Worker(workerUrl, { type: 'module' });
            if (typeof window !== 'undefined' && (window as any).CHAT_DEBUG) {
              // eslint-disable-next-line no-console
              console.log(
                '[chat] Worker created successfully from:',
                workerUrl
              );
            }
            return worker;
          } catch (urlErr) {
            if (typeof window !== 'undefined' && (window as any).CHAT_DEBUG) {
              // eslint-disable-next-line no-console
              console.warn(
                '[chat] Worker creation failed for URL:',
                workerUrl,
                urlErr
              );
            }
            continue; // Try next URL
          }
        }
      }
      return null;
    } catch (err) {
      // This is expected in test environment
      if (typeof window !== 'undefined' && (window as any).CHAT_DEBUG) {
        // eslint-disable-next-line no-console
        console.warn(
          '[chat] Worker creation failed (expected in test environment):',
          err
        );
      }
      return null;
    }
  };

  // Initialize worker when feature flag is enabled
  useEffect(() => {
    if (!USE_CHAT_WORKER) {
      // Worker disabled by feature flag - set to idle to allow basic chat interface
      setModelState({
        status: 'idle',
        progress: [],
      });
      return;
    }

    // Clean up existing worker if any
    if (workerRef.current) {
      try {
        workerRef.current.terminate();
      } catch (err) {
        console.warn('[chat] Error terminating existing worker:', err);
      }
      workerRef.current = null;
    }

    // Initializing worker...
    try {
      const worker = createWorker();
      if (!worker) {
        console.warn(
          '[chat] Worker creation failed or not supported - chat will work in basic mode'
        );
        setModelState({
          status: 'idle',
          progress: [],
        });
        // Allow chat to work without worker
        return () => {}; // Return cleanup function
      }
      // Worker created successfully
      workerRef.current = worker;

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

            // Track device based on loading messages
            if (message.includes('Loading model on WebGPU')) {
              setCurrentDevice('webgpu');
            } else if (message.includes('Loading WASM backend')) {
              setCurrentDevice('wasm');
            } else if (
              message.includes('Compiling shaders and warming up model')
            ) {
              setCurrentDevice('webgpu');
            } else if (message.includes('Warming up WASM backend')) {
              setCurrentDevice('wasm');
            } else if (message.includes('Falling back to WASM')) {
              setCurrentDevice('wasm');
            }
            break;
          }
          case 'ready': {
            setModelState({ status: 'ready', progress: [] });
            setIsGenerating(false);
            // Mark the model as cached when it's ready
            const deviceInfo =
              typeof data.data === 'string' ? data.data : 'unknown';
            ModelCache.setModelReady(selectedModel, deviceInfo);
            // Update cached models list to reflect the change
            setCachedModels(
              ModelCache.getCachedModels().map(entry => entry.modelId)
            );
            // Model is ready - no automatic welcome message (using sample pills instead)
            break;
          }
          case 'start':
            setIsGenerating(true);
            setIsLoading(false); // Hide loading dots when streaming starts
            addMessage({ role: 'assistant', content: '' });
            break;
          case 'update':
            // Update the last assistant message with streaming content, handling thinking blocks
            setMessages((prev: ChatMessage[]) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant') {
                const updatedMessage = updateMessageWithThinking(
                  lastMessage,
                  data.output || ''
                );
                newMessages[newMessages.length - 1] = updatedMessage;
              }
              return newMessages;
            });
            break;
          case 'complete': {
            setIsGenerating(false);
            setIsLoading(false);
            const finalText = Array.isArray((data as any).output)
              ? (data as any).output.join('')
              : String((data as any).output || '');
            // Ensure the final output is reflected and thinking blocks are finalized
            setMessages((prev: ChatMessage[]) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant') {
                // If we have existing content, keep it, otherwise use final text
                const contentToProcess =
                  lastMessage.content && lastMessage.content.length > 0
                    ? lastMessage.content
                    : finalText;

                // Parse final content for any thinking blocks
                const parsed = parseThinkingBlocks(contentToProcess);
                newMessages[newMessages.length - 1] = {
                  ...lastMessage,
                  content: parsed.content,
                  thinking: parsed.thinking || lastMessage.thinking,
                };
              } else if (finalText) {
                // Create new message with thinking block parsing
                const parsed = parseThinkingBlocks(finalText);
                newMessages.push({
                  id: Math.random().toString(36).substr(2, 9),
                  role: 'assistant',
                  content: parsed.content,
                  thinking: parsed.thinking,
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
      // Checking WebGPU support...
      workerRef.current.postMessage({ type: 'check' });

      // Don't auto-load any model - only load when user selects Qwen
      // Worker initialized, modelState should be idle

      return () => {
        try {
          workerRef.current?.removeEventListener('message', onMessage as any);
          workerRef.current?.removeEventListener('error', onError as any);
          workerRef.current?.terminate();
        } catch (err) {
          console.warn('Error cleaning up worker:', err);
        }
        workerRef.current = null;
      };
    } catch (err) {
      console.error('Failed to initialize worker:', err);
      // Set to idle instead of error to allow app to continue functioning
      setModelState({
        status: 'idle',
        progress: [],
      });
      // Don't throw the error - let the app continue to work without chat
    }
  }, [USE_CHAT_WORKER, selectedModel, workerInitKey]);

  // Sync cached models state with ModelCache on mount and when selected model changes
  useEffect(() => {
    const updateCachedModels = () => {
      const currentCachedModels = ModelCache.getCachedModels().map(
        entry => entry.modelId
      );
      setCachedModels(currentCachedModels);

      if (typeof window !== 'undefined' && (window as any).CHAT_DEBUG) {
        // eslint-disable-next-line no-console
        console.log('[chat] Cached models updated:', currentCachedModels);
      }
    };

    updateCachedModels();
  }, [selectedModel]); // Sync cache when model selection changes

  // Handle navigation events to ensure worker stability
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleNavigation = () => {
      // Check if worker is still alive and responsive
      if (workerRef.current && USE_CHAT_WORKER) {
        try {
          // Send a ping to verify worker is responsive
          workerRef.current.postMessage({ type: 'check' });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(
            '[chat] Worker became unresponsive during navigation, reinitializing...',
            err
          );
          // Force worker reinitialization
          setWorkerInitKey(prev => prev + 1);
        }
      }
    };

    // Listen for Gatsby navigation events
    const handleRouteChange = () => {
      setTimeout(handleNavigation, 100); // Small delay to ensure navigation is complete
    };

    // Gatsby uses history API for navigation
    window.addEventListener('popstate', handleRouteChange);

    // Also listen for hash changes and pushstate events
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      originalPushState.apply(window.history, args);
      handleRouteChange();
    };

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(window.history, args);
      handleRouteChange();
    };

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
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
        cachedModels,
        isThinkingEnabled,
        currentDevice,
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
        clearChatHistory,
        toggleThinking,
        cancelModelLoading,
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
