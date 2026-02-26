// Chat configuration for Transformers.js integration
import {
  combineSystemPromptWithCV,
  CVContextLevel,
} from '../lib/utils/cvFormatter';
import { cvData } from './cv';
export interface ChatConfig {
  models: {
    default: string;
    available: Array<{
      id: string;
      name: string;
      description: string;
      size?: string;
      contextWindow?: number;
      supportsThinking?: boolean;
      cvContextLevel?: CVContextLevel;
    }>;
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
    topP: number;
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
function getCVContextLevelForModel(_modelId: string): CVContextLevel {
  return 'medium';
}

/**
 * Generates a system prompt for a specific model using appropriate CV context level
 */
function getSystemPromptForModel(modelId: string): string {
  const cvLevel = getCVContextLevelForModel(modelId);

  const basePrompt = `You are "chat", Alex Nodeland's AI assistant on his personal website. You help visitors learn about Alex using only the CV data provided above.

Rules:
- Answer only from the CV data above. Do not invent or assume information.
- If the answer is not in the CV, say: "That's not covered in Alex's CV. Try asking about his experience, skills, or education."
- Be concise, friendly, and specific. Reference concrete details (roles, companies, dates, skills) from the CV.
- When asked who you are, say: "I'm chat, an AI assistant running entirely in your browser to help you learn about Alex Nodeland."`;

  return combineSystemPromptWithCV(basePrompt, cvData, cvLevel);
}

export const chatConfig: ChatConfig = {
  models: {
    default: 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX',
    available: [
      {
        id: 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX',
        name: 'LFM 1.2B',
        description:
          'efficient reasoning model with hybrid state-space architecture',
        size: '1.2B parameters',
        contextWindow: 32768,
        supportsThinking: true,
        cvContextLevel: 'medium',
      },
    ],
  },
  generation: {
    systemPrompt: getSystemPromptForModel('LiquidAI/LFM2.5-1.2B-Thinking-ONNX'),
    maxTokens: {
      default: 4096,
      thinking: 4096,
      wasm: 2048,
      wasmThinking: 2048,
    },
    temperature: {
      default: 0.05,
      thinking: 0.05,
      wasm: 0.0,
    },
    topK: {
      default: 40,
      thinking: 40,
      wasm: 20,
    },
    topP: 0.1,
    repetitionPenalty: 1.05,
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
    contextWindow: 16384,
    enableWebGPU: true,
    fallbackToWasm: true,
    persistConversation: true,
    autoLoadModel: false,
  },
};
