// Chat configuration for the in-browser assistant.
//
// The system prompt used to live here, with Alex's entire CV stapled to the
// front of it — every question re-sent roughly 4,000 tokens of CV whether it
// needed them or not. That job now belongs to retrieval: the corpus is
// embedded at build time into `static/chat-index.json`, and the worker looks
// up the handful of passages a question actually needs.
//
// The prompt text itself moved to `src/lib/chat/prompt.mjs`, which the worker
// imports directly. Nothing on the main thread needs to know it, so nothing on
// the main thread carries it.

export interface ChatConfig {
  models: {
    default: string;
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
    /** Tokens set aside per turn for the retrieved SOURCES block and the
     *  instructions, so the rolling history window doesn't claim room the
     *  worker is about to need. Measured against the built index: four
     *  passages plus two pinned ones plus the system prompt. */
    groundingReserve: number;
  };
}

export const chatConfig: ChatConfig = {
  models: {
    default: 'LiquidAI/LFM2.5-1.2B-Instruct-ONNX',
  },
  interface: {
    welcomeMessage:
      "i'm chat — a small model running in your browser, no server and no api key. i search Alex's cv, writing, and projects to answer, and i'll link whatever i used.",
    placeholderText: {
      ready: 'ask about Alex...',
      loading: 'loading model...',
      idle: 'please download the model first',
    },
    // Spread across the corpus on purpose: retrieval now covers the blog and
    // the project list, and visitors only discover that if the prompts show it.
    samplePrompts: [
      "what's Alex's current role?",
      'what has he written about supercomputing?',
      'what open source projects has he built?',
    ],
    enableThinking: true,
  },
  behavior: {
    contextWindow: 16384,
    groundingReserve: 1200,
  },
};
