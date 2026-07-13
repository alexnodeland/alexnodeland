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
  estimateTokens,
  ModelCache,
  parseThinkingBlocks,
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
  tokensPerSecond?: number;
  cachedModels?: string[];
  isThinkingEnabled?: boolean;
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
  retryModelLoad?: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

/** Extracts the { dtype, dtypeWasm } config a model needs at load time. */
const loadConfigFor = (modelId: string) => {
  const def = AVAILABLE_MODELS.find(m => m.id === modelId);
  return def ? { dtype: def.dtype, dtypeWasm: def.dtypeWasm } : {};
};

/** Builds the full 'load' request payload, including the warmup prompt so the
 * worker can compile WebGPU shaders at real prefill shapes during loading. */
const loadRequestDataFor = (modelId: string) => ({
  modelId,
  modelConfig: loadConfigFor(modelId),
  warmupPrompt: chatConfig.generation.getSystemPrompt(modelId),
});

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedModel, setSelectedModelState] = useState(
    chatConfig.models.default
  );
  const [modelState, setModelState] = useState<ModelLoadingState>({
    status: 'idle',
    progress: [],
  });
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [tokensPerSecond, setTokensPerSecond] = useState<number>(0);
  const [cachedModels, setCachedModels] = useState<string[]>([]);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chat-thinking-enabled');
      return saved !== null
        ? saved === 'true'
        : chatConfig.interface.enableThinking;
    }
    return chatConfig.interface.enableThinking;
  });

  // Derived loading state — avoids a separate useState that can desync
  const isLoading = isGenerating || modelState.status === 'loading';

  const [workerInitKey, setWorkerInitKey] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const generationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const isGeneratingRef = useRef(false); // Synchronous concurrent-generation guard
  const selectedModelRef = useRef(selectedModel); // Latest model for worker callbacks
  const MODEL_READY_KEY = 'chat-loaded-model';

  // Keep the ref in sync so the (model-independent) worker effect never needs
  // selectedModel in its deps — switching models must NOT recreate the worker.
  useEffect(() => {
    selectedModelRef.current = selectedModel;
  }, [selectedModel]);

  const USE_CHAT_WORKER = typeof window !== 'undefined';

  const availableModels: ChatModel[] = AVAILABLE_MODELS;

  const setChatOpen = (isOpen: boolean) => setIsChatOpen(isOpen);
  const setClosing = (closing: boolean) => setIsClosing(closing);

  // Stall watchdog, re-armed on every streamed chunk. Must NOT be a fixed cap
  // on total generation time: thinking models stream for minutes, and prefill
  // of the full-CV prompt on WASM can be slow before the first token.
  const GENERATION_STALL_TIMEOUT_MS = 60000;

  const armGenerationTimeout = () => {
    if (generationTimeoutRef.current) {
      clearTimeout(generationTimeoutRef.current);
    }
    generationTimeoutRef.current = setTimeout(() => {
      console.warn('[chat] Generation stalled: no worker activity for 60s');
      isGeneratingRef.current = false;
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'interrupt' });
      }
      setIsGenerating(false);
      setMessages(prev => {
        const newMessages = [...prev];
        const last = newMessages[newMessages.length - 1];
        if (last && last.role === 'assistant') {
          newMessages[newMessages.length - 1] = {
            ...last,
            content: last.content || 'Generation timed out. Please try again.',
          };
        } else {
          newMessages.push({
            id: Math.random().toString(36).substr(2, 9),
            role: 'assistant',
            content: 'Generation timed out. Please try again.',
            timestamp: new Date(),
          });
        }
        return newMessages;
      });
    }, GENERATION_STALL_TIMEOUT_MS);
  };

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // No-op for backward compat — isLoading is derived
  const setLoading = (_loading: boolean) => {};

  const clearMessages = () => {
    setMessages([]);

    if (isGenerating && workerRef.current) {
      workerRef.current.postMessage({ type: 'interrupt' });
      setIsGenerating(false);
    }

    if (USE_CHAT_WORKER && workerRef.current) {
      try {
        workerRef.current.postMessage({ type: 'reset' });
      } catch (error) {
        console.warn('Failed to reset worker conversation:', error);
      }
    }

    // Clear model-ready state so a reload won't auto-restore
    try {
      sessionStorage.removeItem(MODEL_READY_KEY);
    } catch {
      // sessionStorage may be unavailable
    }
  };

  const setSelectedModel = (modelId: string) => {
    if (modelId === selectedModel) return;

    if (isGenerating && workerRef.current) {
      workerRef.current.postMessage({ type: 'interrupt' });
      setIsGenerating(false);
    }

    setSelectedModelState(modelId);

    if (ModelCache.isModelCached(modelId)) {
      setModelState({ status: 'ready', progress: [] });
    } else if (modelState.status === 'idle') {
      // Nothing loaded yet (welcome screen): just switch the selection —
      // the user starts the download explicitly.
    } else if (USE_CHAT_WORKER && workerRef.current) {
      setModelState({
        status: 'loading',
        progress: [],
        loadingMessage: `Loading ${availableModels.find(m => m.id === modelId)?.name || modelId}...`,
      });
      ModelCache.setModelLoading(modelId);
      workerRef.current.postMessage({
        type: 'load',
        data: loadRequestDataFor(modelId),
      });
    } else {
      setModelState({ status: 'idle', progress: [] });
    }

    setCachedModels(ModelCache.getCachedModels().map(entry => entry.modelId));
  };

  const loadModel = (modelId?: string) => {
    const targetId = modelId ?? selectedModel;
    if (USE_CHAT_WORKER && workerRef.current) {
      setModelState({
        status: 'loading',
        progress: [],
        loadingMessage: 'Loading model...',
      });
      const req: WorkerRequest = {
        type: 'load',
        data: loadRequestDataFor(targetId),
      };
      workerRef.current.postMessage(req);
      return;
    }

    // Simulated non-breaking behavior (no worker, e.g. tests)
    setModelState({
      status: 'loading',
      progress: [],
      loadingMessage: 'Loading model...',
    });
    setTimeout(() => setModelState({ status: 'ready', progress: [] }), 50);
  };

  const generateResponse = (msgs: ChatMessage[]) => {
    if (
      !USE_CHAT_WORKER ||
      !workerRef.current ||
      modelState.status !== 'ready'
    ) {
      console.warn('Cannot generate response: model not ready');
      return;
    }

    // Prevent concurrent generations (synchronous guard)
    if (isGeneratingRef.current) {
      console.warn('Cannot generate: already generating');
      return;
    }
    isGeneratingRef.current = true;

    try {
      const modelDef = AVAILABLE_MODELS.find(m => m.id === selectedModel);
      const systemPrompt = chatConfig.generation.getSystemPrompt(selectedModel);

      // Model-aware rolling context: budget = model window − system prompt (CV)
      // tokens − tokens reserved for the model's own output.
      const modelContext =
        modelDef?.contextWindow ?? chatConfig.behavior.contextWindow;
      const reservedOutput = modelDef?.generationProfile?.maxTokens ?? 1024;
      const systemTokens = estimateTokens(systemPrompt);
      const budget = Math.max(
        512,
        modelContext - systemTokens - reservedOutput
      );
      const contextMessages = createRollingContext(msgs, budget);

      // Off-topic handling lives in the worker's topic guard (a cheap
      // CV-free classification pass), NOT in per-message prompt notes —
      // in-prompt rules stop working after a few answered turns, and
      // history rewrites would break the worker's KV prefix reuse.

      // Always-thinking models reason regardless of the toggle
      const effectiveReasonEnabled = modelDef?.alwaysThinks
        ? true
        : isThinkingEnabled;

      const req: WorkerRequest = {
        type: 'generate',
        data: {
          messages: contextMessages,
          modelId: selectedModel,
          reasonEnabled: effectiveReasonEnabled,
          systemPrompt,
          guard: {
            prompts: chatConfig.generation.guardPrompts,
            refusal: chatConfig.generation.refusalMessage,
          },
          modelConfig: modelDef
            ? {
                generationProfile: modelDef.generationProfile,
                templateOptions: modelDef.templateOptions,
                alwaysThinks: modelDef.alwaysThinks,
                supportsThinking: modelDef.supportsThinking,
                dtype: modelDef.dtype,
                dtypeWasm: modelDef.dtypeWasm,
              }
            : {},
        },
      };
      workerRef.current.postMessage(req);

      armGenerationTimeout();
    } catch (error) {
      console.error('Worker generation failed:', error);
      isGeneratingRef.current = false;
      setIsGenerating(false);
      addMessage({
        role: 'assistant',
        content:
          'Sorry, I encountered an error processing your request. Please try again.',
      });
    }
  };

  const interruptGeneration = () => {
    if (USE_CHAT_WORKER && workerRef.current) {
      workerRef.current.postMessage({ type: 'interrupt' });
      return;
    }
    setIsGenerating(false);
  };

  const resetConversation = () => {
    if (USE_CHAT_WORKER && workerRef.current) {
      workerRef.current.postMessage({ type: 'reset' });
      return;
    }
    setModelState(prev => ({ ...prev, status: 'idle', progress: [] }));
  };

  const clearChatHistory = () => {
    clearMessages();
    resetConversation();
  };

  const toggleThinking = () => {
    const newValue = !isThinkingEnabled;
    setIsThinkingEnabled(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chat-thinking-enabled', newValue.toString());
    }
  };

  const cancelModelLoading = () => {
    if (USE_CHAT_WORKER && workerRef.current) {
      try {
        workerRef.current.terminate();
        workerRef.current = null;
      } catch (err) {
        console.warn('Error terminating worker during cancel:', err);
      }
    }

    setModelState({ status: 'idle', progress: [] });
    setIsGenerating(false);
    ModelCache.removeModel(selectedModel);
    setCachedModels([]);

    try {
      sessionStorage.removeItem(MODEL_READY_KEY);
    } catch {
      // sessionStorage may be unavailable
    }

    // Force worker reinitialization
    setWorkerInitKey(prev => prev + 1);
  };

  // Retry a failed load by cleanly re-initializing the worker, then loading.
  const retryModelLoad = () => {
    cancelModelLoading();
    // The worker re-init effect runs on workerInitKey change; kick off the load
    // once it's ready. A short delay lets the new worker mount.
    setModelState({
      status: 'loading',
      progress: [],
      loadingMessage: 'Loading model...',
    });
    setTimeout(() => {
      if (workerRef.current) {
        ModelCache.setModelLoading(selectedModel);
        workerRef.current.postMessage({
          type: 'load',
          data: loadRequestDataFor(selectedModel),
        });
      }
    }, 100);
  };

  // Single deterministic worker URL (no multi-URL fallback loop)
  const createWorker = () => {
    if (typeof Worker === 'undefined' || typeof window === 'undefined')
      return null;

    try {
      // Detect subdirectory prefix for GitHub Pages deployments
      const pathPrefix = window.location.href.includes('/alexnodeland/')
        ? '/alexnodeland'
        : '';
      const workerUrl = `${window.location.origin}${pathPrefix}/worker.js`;
      return new Worker(workerUrl, { type: 'module' });
    } catch (err) {
      console.warn('[chat] Worker creation failed:', err);
      return null;
    }
  };

  // Initialize worker. Intentionally NOT dependent on selectedModel — switching
  // models sends a 'load' message to the existing worker instead of recreating
  // it, preserving the worker's in-memory model cache.
  useEffect(() => {
    if (!USE_CHAT_WORKER) {
      setModelState({ status: 'idle', progress: [] });
      return;
    }

    if (workerRef.current) {
      try {
        workerRef.current.terminate();
      } catch (err) {
        console.warn('[chat] Error terminating existing worker:', err);
      }
      workerRef.current = null;
    }

    try {
      const worker = createWorker();
      if (!worker) {
        console.warn(
          '[chat] Worker creation failed or not supported - chat will work in basic mode'
        );
        setModelState({ status: 'idle', progress: [] });
        return () => {};
      }
      workerRef.current = worker;

      const onMessage = (e: MessageEvent<WorkerResponse>) => {
        const data = e.data as any;

        if (data.status === 'progress') {
          const { file = 'model', loaded, total, progress } = data as any;
          setModelState((prev: ModelLoadingState) => ({
            ...prev,
            status: 'loading',
            progress: [{ file, loaded, total, progress }],
          }));
          return;
        }

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
              progress: message === 'Loading model...' ? [] : prev.progress,
            }));
            break;
          }
          case 'ready': {
            setModelState({ status: 'ready', progress: [] });
            setIsGenerating(false);
            // Use the modelId the worker actually loaded (B7), not the current
            // selection which may have changed during the load.
            const loadedModel = data.modelId || selectedModelRef.current;
            const deviceInfo =
              typeof data.data === 'string' ? data.data : 'unknown';
            ModelCache.setModelReady(loadedModel, deviceInfo);
            setCachedModels(
              ModelCache.getCachedModels().map(entry => entry.modelId)
            );
            // Persist model-ready state for reload recovery (mobile tab kills)
            try {
              sessionStorage.setItem(MODEL_READY_KEY, loadedModel);
            } catch {
              // sessionStorage may be unavailable
            }
            break;
          }
          case 'start':
            setIsGenerating(true);
            setTokensPerSecond(0);
            addMessage({ role: 'assistant', content: '', thinking: '' });
            break;
          case 'update': {
            // Feed the stall watchdog — tokens are flowing.
            if (isGeneratingRef.current) armGenerationTimeout();
            if (typeof data.tps === 'number') setTokensPerSecond(data.tps);
            // Worker streams tag-free text with an explicit thinking/answering
            // state (tags are filtered across chunk boundaries in the worker).
            const chunk = data.output || '';
            const workerState = data.state || 'answering';
            setMessages((prev: ChatMessage[]) => {
              const newMessages = [...prev];
              const last = newMessages[newMessages.length - 1];
              if (last && last.role === 'assistant') {
                if (workerState === 'thinking') {
                  newMessages[newMessages.length - 1] = {
                    ...last,
                    thinking: (last.thinking || '') + chunk,
                  };
                } else {
                  newMessages[newMessages.length - 1] = {
                    ...last,
                    content: (last.content || '') + chunk,
                  };
                }
              }
              return newMessages;
            });
            break;
          }
          case 'complete': {
            if (generationTimeoutRef.current) {
              clearTimeout(generationTimeoutRef.current);
              generationTimeoutRef.current = null;
            }
            isGeneratingRef.current = false;
            setIsGenerating(false);

            const finalText = Array.isArray((data as any).output)
              ? (data as any).output.join('')
              : String((data as any).output || '');

            setMessages((prev: ChatMessage[]) => {
              const newMessages = [...prev];
              const last = newMessages[newMessages.length - 1];
              if (last && last.role === 'assistant') {
                // Strip any residual think tags from streamed content
                const cleanContent = (last.content || '')
                  .replace(/<\/?think>/g, '')
                  .trim();

                if (cleanContent.length > 0) {
                  newMessages[newMessages.length - 1] = {
                    ...last,
                    content: cleanContent,
                  };
                  return newMessages;
                }

                // Fallback: streaming produced no visible content. finalText is
                // the newly generated tokens only (worker slices off the prompt),
                // so this can't echo the CV.
                const parsed = parseThinkingBlocks(finalText);
                newMessages[newMessages.length - 1] = {
                  ...last,
                  content: parsed.content,
                  thinking: parsed.thinking || last.thinking,
                };
              } else if (finalText) {
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
            if (generationTimeoutRef.current) {
              clearTimeout(generationTimeoutRef.current);
              generationTimeoutRef.current = null;
            }
            const wasGenerating = isGeneratingRef.current;
            isGeneratingRef.current = false;
            const errMsg = String(data.data ?? 'Worker error');
            // Generation errors keep the model 'ready' (it's still loaded);
            // only load failures move status to 'error'.
            setModelState((prev: ModelLoadingState) => {
              if (prev.status === 'ready' || wasGenerating) {
                return prev;
              }
              return { ...prev, status: 'error', error: errMsg };
            });
            setIsGenerating(false);

            setMessages((prev: ChatMessage[]) => {
              const newMessages = [...prev];
              const last = newMessages[newMessages.length - 1];
              const fallbackText =
                'Sorry, I ran into an error while generating the response. Retrying on CPU may help.\n' +
                `Details: ${errMsg}`;
              if (last && last.role === 'assistant') {
                newMessages[newMessages.length - 1] = {
                  ...last,
                  content:
                    last.content && last.content.length > 0
                      ? last.content
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
          case 'interrupted': {
            if (generationTimeoutRef.current) {
              clearTimeout(generationTimeoutRef.current);
              generationTimeoutRef.current = null;
            }
            isGeneratingRef.current = false;
            setIsGenerating(false);
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
      };

      workerRef.current.addEventListener('message', onMessage as any);
      workerRef.current.addEventListener('error', onError as any);

      // WebGPU capability check
      workerRef.current.postMessage({ type: 'check' });

      // Auto-restore a previously loaded model (handles mobile tab kills where
      // the JS state is lost but the browser model cache survives).
      try {
        const prevModel = sessionStorage.getItem(MODEL_READY_KEY);
        if (prevModel) {
          setModelState({
            status: 'loading',
            progress: [],
            loadingMessage: 'Restoring model from cache...',
          });
          ModelCache.setModelLoading(prevModel);
          worker.postMessage({
            type: 'load',
            data: loadRequestDataFor(prevModel),
          });
        }
      } catch {
        // sessionStorage may be unavailable
      }

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
      setModelState({ status: 'idle', progress: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [USE_CHAT_WORKER, workerInitKey]);

  // Sync cached models when the selection changes
  useEffect(() => {
    setCachedModels(ModelCache.getCachedModels().map(entry => entry.modelId));
  }, [selectedModel]);

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
        tokensPerSecond,
        cachedModels,
        isThinkingEnabled,
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
        retryModelLoad,
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
