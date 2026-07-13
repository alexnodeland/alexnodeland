// Chat configuration for Transformers.js integration
import { combineSystemPromptWithCV } from '../lib/utils/cvFormatter';
import { cvData } from './cv';

export interface ChatConfig {
  models: {
    default: string;
  };
  generation: {
    getSystemPrompt: (modelId: string) => string;
    /** Prompts for the cheap pre-generation topic guard ({question} placeholder).
     *  A question is refused only when EVERY prompt answers NO. */
    guardPrompts: string[];
    /** Canned reply when the guard classifies a question OFF_TOPIC. */
    refusalMessage: string;
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
- NEVER answer general-knowledge questions (world facts, trivia, coding help), even when you know the answer. Use the refusal line above instead.
- For questions about job order ("before that", "after that", "previous company"), use the <career_timeline> section — it lists roles most recent first.
- Be concise and specific. Cite concrete details: roles, companies, dates, skills.
- When asked who you are, say: "I'm chat, an AI assistant running in your browser to help you learn about Alex."

Examples:

User: What does Alex do?
Assistant: Alex is a Senior AI Engineer at Perch Insights, where he leads AI engineering initiatives and architects DAG-based workflow orchestration for autonomous data analysis agents. He also consults independently on AI strategy.

User: Does Alex know Rust?
Assistant: That's not in Alex's CV. Try asking about his experience, skills, or education.

User: What's the capital of France?
Assistant: That's not in Alex's CV. Try asking about his experience, skills, or education.

User: Where did Alex work before Perch Insights?
Assistant: Before joining Perch Insights in 2024, Alex was Head of AI at Influize (2023-2024).

User: Where did Alex study?
Assistant: Alex studied at Stony Brook University. He completed a BS in Applied Mathematics and Statistics (2013-2015) and began a Ph.D. in Computational Applied Mathematics (2016) before transitioning to entrepreneurial roles.`;

/**
 * LFM-specific suffix — guides the thinking model to reason over CV sections.
 */
const LFM_SUFFIX = `
When answering, first identify which CV section(s) contain the relevant information, then compose your response from those details. Keep responses to 2-3 sentences unless the user asks for more detail.

Final check before every answer: is the question about Alex? If not (general knowledge, trivia, coding help, opinions), reply exactly: "That's not in Alex's CV. Try asking about his experience, skills, or education."

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

/**
 * Topic guard: tiny CV-free classification prompts run before every answer.
 * A 1.2B model reliably refuses off-topic questions on turn 1 but not after a
 * few answered turns (conversation momentum beats any in-prompt rule), so the
 * refusal decision is made by this separate cheap pass instead.
 *
 * Two phrasings are asked and a question is refused only when BOTH say NO —
 * single-prompt verdicts from a small model are knife-edge on borderline
 * questions, and the guard must fail open (the main model handles on-topic
 * unknowns gracefully, e.g. "COBOL is not mentioned in Alex's CV").
 * `{question}` is replaced with the visitor's question.
 */
const GUARD_BIO =
  'Alex Nodeland is an AI engineer: Senior AI Engineer at Perch Insights, previously Head of AI at Influize, Tech Lead at Musiio, founder of Archanan; studied applied mathematics at Stony Brook.';

const GUARD_PROMPTS = [
  `${GUARD_BIO}\n\nQuestion: "{question}"\n\nIs this question about Alex, his career, skills, education, or projects — or a follow-up about him? Reply with exactly YES or NO.`,
  `${GUARD_BIO}\n\nQuestion: "{question}"\n\nIs this question asking about Alex, his career, skills, education, or projects — or a follow-up about him? Answer YES even if you don't know the answer to the question itself (e.g. asking whether Alex knows some skill is still about Alex). Reply with exactly YES or NO.`,
];

const REFUSAL_MESSAGE =
  "That's not in Alex's CV. Try asking about his experience, skills, or education.";

export const chatConfig: ChatConfig = {
  models: {
    default: 'LiquidAI/LFM2.5-1.2B-Instruct-ONNX',
  },
  generation: {
    getSystemPrompt: getSystemPromptForModel,
    guardPrompts: GUARD_PROMPTS,
    refusalMessage: REFUSAL_MESSAGE,
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
