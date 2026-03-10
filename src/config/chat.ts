// Chat configuration for Transformers.js integration
import {
  combineSystemPromptWithCV,
  CVContextLevel,
} from '../lib/utils/cvFormatter';
import { ChatModel } from '../types/chat';
import { cvData } from './cv';
export interface ChatConfig {
  models: {
    default: string;
    available: ChatModel[];
  };
  generation: {
    systemPrompt: string;
    maxTokens: {
      default: number;
      thinking: number;
      wasm: number;
      wasmThinking: number;
    };
    temperature: {
      default: number;
      thinking: number;
      wasm: number;
    };
    topK: {
      default: number;
      thinking: number;
      wasm: number;
    };
    repetitionPenalty: number;
  };
  interface: {
    welcomeMessage: string;
    placeholderText: {
      ready: string;
      loading: string;
      idle: string;
    };
    samplePrompts: string[];
    enableThinking: boolean;
  };
  behavior: {
    contextWindow: number;
    enableWebGPU: boolean;
    fallbackToWasm: boolean;
    persistConversation: boolean;
    autoLoadModel: boolean;
  };
}

/**
 * Gets the appropriate CV context level for a given model
 */
function getCVContextLevelForModel(modelId: string): CVContextLevel {
  // Define available models inline to avoid circular reference
  const availableModels = [
    {
      id: 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX',
      cvContextLevel: 'full' as CVContextLevel,
    },
    {
      id: 'onnx-community/Qwen2.5-0.5B-Instruct',
      cvContextLevel: 'concise' as CVContextLevel,
    },
  ];

  // First, try to find the model in the available models
  const model = availableModels.find(m => m.id === modelId);
  if (model?.cvContextLevel) {
    return model.cvContextLevel;
  }

  // Fallback based on model ID patterns
  if (modelId.includes('0.5B') || modelId.includes('0.6B')) {
    return 'concise';
  } else if (
    modelId.includes('1B') ||
    modelId.includes('1.5B') ||
    modelId.includes('3B')
  ) {
    return 'medium';
  } else {
    return 'full';
  }
}

/**
 * Generates a system prompt for a specific model using appropriate CV context level
 */
function getSystemPromptForModel(modelId: string): string {
  const cvLevel = getCVContextLevelForModel(modelId);

  const basePrompt = `You are "chat", Alex Nodeland's AI assistant designed to help visitors to his personal website get to know him better.

CRITICAL INSTRUCTIONS:
- You ONLY have access to information provided in the CV data above
- If asked about information NOT in the CV, respond: "I don't have that information in Alex's CV. Please ask about his professional experience, skills, education, or achievements that are documented above."
- Do NOT make up or infer information beyond what's explicitly stated in the CV
- Be accurate and concise in your responses

Key characteristics:
- Help visitors understand Alex's background, experience, and expertise based ONLY on the CV information provided
- Provide insights into his technical skills and career journey as documented
- Answer questions about his work in AI engineering, technical leadership, and startups using only CV data
- Reference specific experiences and achievements from the CV when relevant
- Be knowledgeable about his documented projects, roles, and technical capabilities

If someone asks who you are or what this is, say: "I'm chat, an AI assistant running entirely in your browser designed to help you get to know Alex Nodeland."

Use ONLY the CV information above to provide concise, accurate responses about Alex's professional background, skills, and achievements. Do not speculate or provide information not explicitly contained in the CV.`;

  return combineSystemPromptWithCV(basePrompt, cvData, cvLevel);
}

export const chatConfig: ChatConfig = {
  models: {
    default: 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX',
    available: [
      {
        id: 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX',
        name: 'LFM2.5 1.2B',
        description: 'fast reasoning model optimized for in-browser inference',
        size: '1.2B parameters',
        contextWindow: 32768,
        device: 'webgpu',
        dtype: 'q4f16',
        fallbackDevice: 'wasm',
        supportsThinking: true,
        cvContextLevel: 'full',
      },
      {
        id: 'onnx-community/Qwen2.5-0.5B-Instruct',
        name: 'Qwen 2.5 0.5B',
        description: 'Optimized instruction-following model',
        size: '0.5B parameters',
        contextWindow: 2048,
        device: 'webgpu',
        dtype: 'q4f16',
        fallbackDevice: 'wasm',
        supportsThinking: false,
        cvContextLevel: 'concise',
      },
    ],
  },
  generation: {
    systemPrompt: getSystemPromptForModel('LiquidAI/LFM2.5-1.2B-Thinking-ONNX'),
    maxTokens: {
      default: 4096,
      thinking: 8192,
      wasm: 2048,
      wasmThinking: 4096,
    },
    temperature: {
      default: 0.6,
      thinking: 0.6,
      wasm: 0.3,
    },
    topK: {
      default: 50,
      thinking: 50,
      wasm: 40,
    },
    repetitionPenalty: 1.1,
  },
  interface: {
    welcomeMessage:
      "Hi! I'm chat, Alex's AI assistant. I can help you with technical questions, discuss AI engineering topics, or chat about anything else you're curious about. What would you like to explore?",
    placeholderText: {
      ready: 'type your message here...',
      loading: 'loading model...',
      idle: 'please download the model first',
    },
    samplePrompts: [
      'what is this?',
      "explain alex's roles in startups",
      "what is alex's experience with hpc?",
    ],
    enableThinking: true,
  },
  behavior: {
    contextWindow: 32768,
    enableWebGPU: true,
    fallbackToWasm: true,
    persistConversation: true,
    autoLoadModel: false,
  },
};

/** Single source of truth for available models — re-exported by lib/utils/chat */
export const AVAILABLE_MODELS: ChatModel[] = chatConfig.models.available;
