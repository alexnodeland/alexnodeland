// Chat configuration for Transformers.js integration
import { combineSystemPromptWithCV } from '../lib/utils/cvFormatter';
import { cvData } from './cv';

export interface ChatConfig {
  models: {
    default: string;
  };
  generation: {
    getSystemPrompt: (modelId: string) => string;
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
  };
}

/**
 * Base instructions shared across all models.
 * CV data is prepended by combineSystemPromptWithCV, so "above" refers to it.
 */
const SHARED_INSTRUCTIONS = `You are "chat", Alex Nodeland's AI assistant on his personal website.

Rules:
- Answer ONLY from the <alexs_cv> data above. Never invent or assume facts.
- If the answer is not in the CV, say: "That's not in Alex's CV. Try asking about his experience, skills, or education."
- Be concise and specific. Cite concrete details: roles, companies, dates, skills.
- When asked who you are, say: "I'm chat, an AI assistant running in your browser to help you learn about Alex."

Examples:

User: What does Alex do?
Assistant: Alex is a Senior AI Engineer at Perch Insights, where he leads AI engineering initiatives and architects DAG-based workflow orchestration for autonomous data analysis agents. He also consults independently on AI strategy.

User: Does Alex know Rust?
Assistant: That's not in Alex's CV. Try asking about his experience, skills, or education.

User: Where did Alex study?
Assistant: Alex studied at Stony Brook University. He completed a BS in Applied Mathematics and Statistics (2013-2015) and began a Ph.D. in Computational Applied Mathematics (2016) before transitioning to entrepreneurial roles.`;

/**
 * LFM-specific suffix — guides the thinking model to reason over CV sections.
 */
const LFM_SUFFIX = `
When answering, first identify which CV section(s) contain the relevant information, then compose your response from those details. Keep responses to 2-3 sentences unless the user asks for more detail.

Remember: answer ONLY from the CV data above.`;

/**
 * Qwen-specific suffix — tighter constraints for the smaller model.
 */
const QWEN_SUFFIX = `
Keep responses to 1-3 sentences. Stick strictly to facts from the CV above.

Remember: answer ONLY from the CV data above.`;

/**
 * Generates the system prompt with full CV context.
 * Uses model-specific suffixes for optimal behavior per architecture.
 */
export function getSystemPromptForModel(modelId: string): string {
  const isLFM = modelId.includes('LFM');
  const suffix = isLFM ? LFM_SUFFIX : QWEN_SUFFIX;
  return combineSystemPromptWithCV(SHARED_INSTRUCTIONS + suffix, cvData);
}

export const chatConfig: ChatConfig = {
  models: {
    default: 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX',
  },
  generation: {
    getSystemPrompt: getSystemPromptForModel,
  },
  interface: {
    welcomeMessage:
      "Hi! I'm chat, Alex's AI assistant running in your browser. Ask me about his experience, skills, education, or career background.",
    placeholderText: {
      ready: 'ask about Alex...',
      loading: 'loading model...',
      idle: 'please download the model first',
    },
    samplePrompts: [
      "what's Alex's current role?",
      'what AI/ML experience does he have?',
      'where did Alex study?',
    ],
    enableThinking: true,
  },
  behavior: {
    contextWindow: 16384,
  },
};
