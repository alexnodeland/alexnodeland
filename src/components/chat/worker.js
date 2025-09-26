import {
  AutoModelForCausalLM,
  AutoTokenizer,
  InterruptableStoppingCriteria,
  TextStreamer,
} from '@huggingface/transformers';

/**
 * Helper function to perform feature detection for WebGPU
 * Falls back gracefully to CPU if WebGPU is not available
 */
async function checkWebGPUSupport() {
  try {
    if (!navigator.gpu) {
      return false;
    }
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch (error) {
    console.warn('WebGPU detection failed:', error);
    return false;
  }
}

/**
 * Text Generation Pipeline using Singleton pattern
 * Enables lazy-loading of the model for better performance
 * Based on Transformers.js examples but adapted for our chat system
 */
class TextGenerationPipeline {
  static model_id = 'onnx-community/Qwen3-0.6B-ONNX';
  static tokenizer = null;
  static model = null;

  static async getInstance(progress_callback = null) {
    // Initialize tokenizer if not already done
    if (!this.tokenizer) {
      this.tokenizer = AutoTokenizer.from_pretrained(this.model_id, {
        progress_callback,
      });
    }

    // Initialize model if not already done
    if (!this.model) {
      // Check WebGPU support and fallback to CPU if needed
      const supportsWebGPU = await checkWebGPUSupport();

      this.model = AutoModelForCausalLM.from_pretrained(this.model_id, {
        dtype: supportsWebGPU ? 'q4f16' : 'q4', // Use appropriate dtype
        device: supportsWebGPU ? 'webgpu' : 'cpu',
        progress_callback,
      });

      // Optionally log device when debugging
      // console.debug(`Loading model on: ${supportsWebGPU ? 'WebGPU' : 'CPU'}`);
    }

    return Promise.all([this.tokenizer, this.model]);
  }

  // Reset the pipeline (useful for switching models or debugging)
  static reset() {
    this.tokenizer = null;
    this.model = null;
  }
}

// Global stopping criteria for interrupting generation
const stopping_criteria = new InterruptableStoppingCriteria();

// Cache for past key values to enable conversation context
let past_key_values_cache = null;

/**
 * Generate text using the loaded model
 * Handles streaming output and context management
 */
async function generate({ messages }) {
  try {
    // Retrieve the text-generation pipeline
    const [tokenizer, model] = await TextGenerationPipeline.getInstance();

    // Apply chat template to format messages correctly
    const inputs = tokenizer.apply_chat_template(messages, {
      add_generation_prompt: true,
      return_dict: true,
    });

    let startTime;
    let numTokens = 0;
    let tps = 0;

    // Token callback for performance tracking
    const token_callback_function = () => {
      startTime ??= performance.now();

      if (numTokens++ > 0) {
        tps = (numTokens / (performance.now() - startTime)) * 1000;
      }
    };

    // Stream callback to send partial results to main thread
    const callback_function = output => {
      self.postMessage({
        status: 'update',
        output,
        tps,
        numTokens,
      });
    };

    // Create text streamer for real-time output
    const streamer = new TextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function,
      token_callback_function,
    });

    // Tell main thread we're starting generation
    self.postMessage({ status: 'start' });

    // Generate response with the model
    const { past_key_values, sequences } = await model.generate({
      ...inputs,
      past_key_values: past_key_values_cache,

      // Generation parameters optimized for chat
      do_sample: true,
      top_k: 40,
      temperature: 0.7,
      repetition_penalty: 1.1,

      max_new_tokens: 512, // Reasonable limit for chat responses
      streamer,
      stopping_criteria,
      return_dict_in_generate: true,
    });

    // Cache the key values for context continuity
    past_key_values_cache = past_key_values;

    // Decode the final sequences
    const decoded = tokenizer.batch_decode(sequences, {
      skip_special_tokens: true,
    });

    // Send completion message to main thread
    self.postMessage({
      status: 'complete',
      output: decoded,
    });
  } catch (error) {
    // console.error('Generation error:', error);
    self.postMessage({
      status: 'error',
      data: error.message || 'Generation failed',
    });
  }
}

/**
 * Load the model and notify main thread of progress
 */
async function load() {
  try {
    self.postMessage({
      status: 'loading',
      data: 'Loading model...',
    });

    // Load the pipeline with progress tracking
    const [tokenizer, model] = await TextGenerationPipeline.getInstance(
      progress => {
        // Forward progress updates to main thread
        self.postMessage(progress);
      }
    );

    self.postMessage({
      status: 'loading',
      data: 'Compiling shaders and warming up model...',
    });

    // Run dummy generation to compile shaders
    const inputs = tokenizer('Hello');
    await model.generate({
      ...inputs,
      max_new_tokens: 1,
      do_sample: false, // Deterministic for warmup
    });

    // Model is ready for use
    self.postMessage({ status: 'ready' });
  } catch (error) {
    // console.error('Model loading error:', error);
    self.postMessage({
      status: 'error',
      data: error.message || 'Failed to load model',
    });
  }
}

/**
 * Reset conversation context and stopping criteria
 */
function reset() {
  past_key_values_cache = null;
  stopping_criteria.reset();
  self.postMessage({ status: 'reset_complete' });
}

/**
 * Main worker event listener
 * Handles all communication between main thread and worker
 */
self.addEventListener('message', async event => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'check': {
        // Perform WebGPU capability check
        const supportsWebGPU = await checkWebGPUSupport();
        self.postMessage({
          status: 'check_complete',
          webGPUSupported: supportsWebGPU,
        });
        break;
      }

      case 'load': {
        // Load the model
        await load();
        break;
      }

      case 'generate': {
        // Generate text from messages
        stopping_criteria.reset();
        await generate(data);
        break;
      }

      case 'interrupt': {
        // Stop current generation
        stopping_criteria.interrupt();
        self.postMessage({ status: 'interrupted' });
        break;
      }

      case 'reset': {
        // Reset conversation context
        reset();
        break;
      }

      default: {
        // console.warn('Unknown message type:', type);
        self.postMessage({
          status: 'error',
          data: `Unknown message type: ${type}`,
        });
      }
    }
  } catch (error) {
    // console.error('Worker error:', error);
    self.postMessage({
      status: 'error',
      data: error.message || 'Worker operation failed',
    });
  }
});

// Handle uncaught errors in the worker
self.addEventListener('error', event => {
  // console.error('Worker uncaught error:', event.error);
  self.postMessage({
    status: 'error',
    data: event.error?.message || 'Worker encountered an error',
  });
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', event => {
  // console.error('Worker unhandled rejection:', event.reason);
  self.postMessage({
    status: 'error',
    data: event.reason?.message || 'Worker promise rejection',
  });

  // Prevent the default browser behavior
  event.preventDefault();
});

// Log that worker is ready (debug only)
// console.debug('Chat worker initialized and ready for messages');
