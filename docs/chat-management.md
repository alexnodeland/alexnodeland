# 💬 Chat Configuration Guide

This guide explains how to configure and customize the AI chat system using the new centralized configuration system. The system now follows **Hugging Face's official chat templating standards** for proper message formatting and system prompt handling.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Configuration Structure](#configuration-structure)
- [System Prompt Configuration](#system-prompt-configuration)
- [Generation Parameters](#generation-parameters)
- [Interface Customization](#interface-customization)
- [Behavior Settings](#behavior-settings)
- [Using the ChatSettings Component](#using-the-chatsettings-component)
- [Chat Templating Standards](#chat-templating-standards)
- [CV Data Integration](#cv-data-integration)
- [Best Practices](#best-practices)

## 🎯 Overview

The chat system uses a structured configuration that makes it easy to:

- **Customize the system prompt** to define AI behavior
- **Automatically include CV data** for context about Alex's background
- **Adjust generation parameters** for different use cases
- **Configure the user interface** elements
- **Control model behavior** and performance settings
- **Maintain consistency** across the chat experience

### 📄 CV Integration

The system automatically includes Alex's complete CV data in every conversation, providing the AI with detailed context about:

- **Professional experience** and career progression
- **Technical and soft skills**
- **Education and certifications**
- **Key achievements and project highlights**

This data is wrapped in `<alexs_cv>` tags and prepended to the system prompt, ensuring the AI can provide informed responses about Alex's background and expertise.

## 🚀 Quick Start

### 1. Update System Prompt

Edit `src/config/chat.ts`:

```typescript
generation: {
  systemPrompt: `You are a helpful AI assistant specialized in [your domain].

Key characteristics:
- Be concise and accurate
- Ask clarifying questions when needed
- Provide practical solutions

[Add your specific instructions here]`,
  // ... other settings
}
```

### 2. Customize Interface

```typescript
interface: {
  welcomeMessage: "Welcome! I'm your AI assistant. How can I help today?",
  samplePrompts: [
    "Tell me about your capabilities",
    "Help me with a coding problem",
    "Explain a technical concept",
  ],
  enableThinking: true,
}
```

### 3. Adjust Generation Settings

```typescript
generation: {
  temperature: {
    default: 0.7,    // More creative
    thinking: 0.6,   // Balanced for reasoning
    wasm: 0.0,      // Deterministic on CPU
  },
  maxTokens: {
    default: 512,
    thinking: 1024,  // More tokens for reasoning
  },
}
```

## 📊 Configuration Structure

### Models Configuration

Configure available models and defaults:

```typescript
models: {
  default: 'onnx-community/Qwen3-0.6B-ONNX',
  available: [
    {
      id: 'onnx-community/Qwen3-0.6B-ONNX',
      name: 'Qwen 3 0.6B',
      description: 'Fast, lightweight model',
      size: '0.6B parameters',
      contextWindow: 2048,
      supportsThinking: true,
    },
    // Add more models...
  ],
}
```

### Generation Parameters

Fine-tune AI responses:

```typescript
generation: {
  systemPrompt: "Your custom system prompt...",
  maxTokens: {
    default: 512,      // Standard responses
    thinking: 1024,    // Thinking mode responses
    wasm: 96,          // CPU-optimized responses
    wasmThinking: 192, // CPU thinking responses
  },
  temperature: {
    default: 0.7,      // Creative responses
    thinking: 0.6,     // Balanced reasoning
    wasm: 0.0,         // Deterministic CPU
  },
  topK: {
    default: 40,       // Good variety
    thinking: 20,      // More focused
    wasm: 20,          // CPU-optimized
  },
  repetitionPenalty: 1.05, // Reduce repetition
}
```

### Interface Elements

Customize user-facing text:

```typescript
interface: {
  welcomeMessage: "Your welcome message",
  placeholderText: {
    ready: 'Type your message here...',
    loading: 'Loading model...',
    idle: 'Please download the model first',
  },
  samplePrompts: [
    "Sample prompt 1",
    "Sample prompt 2",
    // Up to 5 prompts recommended
  ],
  enableThinking: true,
}
```

### Behavior Settings

Control system behavior:

```typescript
behavior: {
  contextWindow: 2048,        // Token limit for context
  enableWebGPU: true,         // Use GPU acceleration
  fallbackToWasm: true,       // CPU fallback
  persistConversation: true,  // Remember context
  autoLoadModel: false,       // Load on startup
}
```

## 🤖 System Prompt Configuration

The system prompt defines how your AI assistant behaves. Here are some templates:

### Technical Assistant

```typescript
systemPrompt: `You are an expert technical consultant with deep knowledge in software engineering, AI systems, and modern development practices.

Characteristics:
- Provide clear, actionable technical advice
- Include code examples when relevant
- Explain complex concepts in understandable terms
- Ask clarifying questions about requirements
- Focus on best practices and maintainable solutions

When helping with code:
- Use modern, idiomatic approaches
- Consider performance and security
- Explain your reasoning
- Suggest testing strategies`;
```

### Creative Writing Assistant

```typescript
systemPrompt: `You are a creative writing assistant who helps users craft compelling stories, content, and copy.

Characteristics:
- Be imaginative and inspiring
- Offer multiple creative approaches
- Help with structure and flow
- Provide specific examples
- Encourage experimentation

Focus areas:
- Storytelling techniques
- Character development
- Plot structure
- Writing style and voice
- Editing and refinement`;
```

### Educational Tutor

```typescript
systemPrompt: `You are a patient and knowledgeable tutor who helps students learn effectively.

Teaching approach:
- Break down complex topics into digestible parts
- Use analogies and examples
- Check understanding before moving forward
- Encourage questions and curiosity
- Adapt explanations to the student's level

Always:
- Ask if they want more detail or examples
- Provide practice opportunities
- Be encouraging and supportive`;
```

## ⚙️ Generation Parameters

### Temperature Settings

- **0.0**: Completely deterministic, same response every time
- **0.3-0.5**: Slightly creative, good for technical content
- **0.7**: Balanced creativity and consistency
- **0.9-1.0**: Very creative, good for brainstorming

### Token Limits

- **96-192**: Quick responses, good for simple questions
- **512**: Standard responses for most use cases
- **1024+**: Complex responses, detailed explanations

### Top-K Values

- **10-20**: More focused, consistent responses
- **40-60**: Good variety while staying on topic
- **80+**: More diverse but potentially off-topic

## 🖥️ Using the ChatSettings Component

Import and use the ChatSettings component:

```typescript
import ChatSettings from './components/chat/ChatSettings';

// In your component
<ChatSettings
  onSystemPromptChange={(prompt) => {
    // Handle system prompt changes
    console.log('New system prompt:', prompt);
  }}
  onSettingChange={(setting, value) => {
    // Handle other setting changes
    console.log(`Setting ${setting} changed to:`, value);
  }}
/>
```

The component provides:

- System prompt editor
- Thinking mode toggle
- Advanced parameter controls
- Reset to defaults functionality

## 🔄 Chat Templating Standards

The system now follows **Hugging Face's official chat templating standards** for proper message formatting and system prompt injection.

### Message Format

All messages follow the standard chat template format:

```typescript
interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
}
```

### System Prompt Injection

- **Automatic**: System prompts are automatically injected as the first message
- **Deduplication**: Multiple system messages are filtered to prevent duplication
- **Validation**: All messages are validated before applying chat templates
- **Preservation**: System messages are always preserved in rolling context windows

### Template Application

The worker uses Hugging Face's `tokenizer.apply_chat_template()` method:

```javascript
const inputs = tokenizer.apply_chat_template(processedMessages, {
  add_generation_prompt: true,
  return_dict: true,
  enable_thinking: reasonEnabled,
  add_special_tokens: false,
});
```

### Message Validation

Messages are validated to ensure they meet chat template requirements:

- Valid role (`system`, `user`, or `assistant`)
- Non-empty content
- Proper structure for tokenizer processing

### Context Window Management

The rolling context system now:

- **Preserves all system messages** regardless of token limits
- **Maintains chronological order** for conversation messages
- **System-first ordering** ensures proper template application
- **Token-aware filtering** keeps recent conversation history

### Debug Mode

Enable debug logging to see chat templating in action:

```javascript
// In browser console
window.CHAT_DEBUG = true;
```

This shows:

- Processed messages before templating
- System prompt injection status
- Template application success/failure
- Context window management decisions

## 📄 CV Data Integration

The chat system automatically includes Alex's complete CV data as context for every conversation. This provides the AI assistant with comprehensive knowledge about his background, experience, and expertise.

### How It Works

1. **Automatic Inclusion**: CV data is automatically imported from `src/config/cv.ts`
2. **Formatted Context**: The CV is formatted into a structured, readable format
3. **Tagged Placement**: CV data is wrapped in `<alexs_cv>` tags for clear delineation
4. **System Prompt Integration**: CV data is prepended to the system prompt automatically

### CV Data Structure

The integrated CV includes:

```
<alexs_cv>
**Personal Information:**
- Name: Alex Nodeland
- Title: Senior AI Engineer & Technical Consultant
- Location: Upstate, New York, USA
- Website: alexnodeland.com
- Summary: [Professional summary]

**Recent Experience:**
- Senior AI Engineer at Perch Insights (2024 - Present)
- Head of AI at Influize (2023 - 2024)
- Technical Strategy Consultant at Freelance (2022 - Present)
- [Additional recent positions...]

**Technical Skills:**
- Python, JavaScript/TypeScript, React, Node.js, AWS, GCP...

**Soft Skills:**
- Technical Leadership, Team Management, Strategic Planning...

**Education:**
- [Education details]

**Certifications:**
- [Certification details]
</alexs_cv>
```

### Benefits

- **Contextual Responses**: AI can reference specific experiences and skills
- **Accurate Information**: Responses are based on actual CV data
- **Dynamic Updates**: Changes to CV config automatically update chat context
- **Comprehensive Knowledge**: AI has access to complete professional background

### Implementation Details

The integration uses utility functions from `src/lib/utils/cvFormatter.ts`:

- `formatCVForSystemPrompt()`: Main formatting function with level support
- `formatCVConcise()`: Minimal CV context for small models
- `formatCVMedium()`: Balanced CV context for medium models
- `formatCVFull()`: Complete CV context for large models
- `createCVContextBlock()`: Wraps formatted CV in `<alexs_cv>` tags
- `combineSystemPromptWithCV()`: Combines CV data with system prompt

### CV Context Levels

The system provides three levels of CV context optimized for different model sizes:

**Concise Level** (`concise`)

- Essential personal information only
- Current role and company
- Top 5 technical skills
- Latest education entry
- No detailed achievements or personal summary
- Optimized for small models (0.5B-0.6B parameters)

**Medium Level** (`medium`)

- Brief personal information
- Recent 3 positions with limited achievements (top 2 per role)
- Top 10 technical skills and 5 leadership skills
- All education entries
- Balanced context for medium models (1B-3B parameters)

**Full Level** (`full`)

- Complete personal information including summary
- All experience positions with full achievements
- All technical and soft skills
- Education and certifications
- Maximum context for large models (7B+ parameters)

### Model Configuration

Each model in the chat config specifies its preferred CV context level:

```typescript
{
  id: 'onnx-community/Qwen3-0.6B-ONNX',
  name: 'Qwen 3 0.6B',
  cvContextLevel: 'concise', // Uses minimal CV context
}
```

### Testing

The CV integration includes comprehensive tests in `src/__tests__/unit/chat/cv-integration.test.ts`:

```bash
# Run CV integration tests
npm test src/__tests__/unit/chat/cv-integration.test.ts
```

### Updating CV Data

To update the CV information available to the chat:

1. Edit `src/config/cv.ts`
2. Update the `cvData` object with new information
3. Changes are automatically reflected in the chat system
4. No additional configuration required

### Critical Instructions & Refusal Logic

The system prompt now includes strict instructions to prevent the AI from providing information outside the CV:

- **Scope Limitation**: AI only uses information explicitly provided in CV data
- **Refusal Template**: "I don't have that information in Alex's CV. Please ask about his professional experience, skills, education, or achievements that are documented above."
- **No Speculation**: AI will not make up or infer information beyond what's in the CV
- **Accuracy Focus**: Responses must be accurate and based only on documented information

This ensures the AI stays within bounds and provides reliable, factual information about Alex's background.

## 🔧 Best Practices

### System Prompt Design

1. **Be specific** about the assistant's role and expertise
2. **Include personality traits** to make interactions consistent
3. **Set clear boundaries** about what the assistant should/shouldn't do
4. **Provide examples** of desired response format
5. **Keep it concise** but comprehensive

### Parameter Tuning

1. **Start with defaults** and adjust based on needs
2. **Lower temperature** for factual, consistent responses
3. **Higher temperature** for creative, varied responses
4. **Adjust token limits** based on typical response length needed
5. **Test on CPU/WASM** for performance optimization

### Interface Customization

1. **Write clear welcome messages** that set expectations
2. **Create relevant sample prompts** for your use case
3. **Use appropriate placeholder text** for different states
4. **Enable thinking mode** for complex reasoning tasks

### Performance Optimization

1. **Set reasonable context windows** to balance memory and performance
2. **Use WebGPU** when available for better performance
3. **Implement fallbacks** for broader device compatibility
4. **Consider token limits** for responsive interactions

## 🔄 Dynamic Configuration

For runtime configuration changes, you can modify the config object:

```typescript
import { chatConfig } from '../config/chat';

// Update system prompt at runtime
chatConfig.generation.systemPrompt = 'Updated system prompt...';

// Update interface settings
chatConfig.interface.welcomeMessage = 'New welcome message!';

// Note: Some changes may require chat context reset
```

## 🚨 Troubleshooting

### Common Issues

**System prompt not taking effect:**

- Clear chat history to reset context
- Ensure worker receives updated config
- Check for syntax errors in prompt

**Performance issues:**

- Reduce max token limits
- Lower temperature for CPU/WASM
- Disable thinking mode for simpler responses

**Interface not updating:**

- Check component imports
- Verify config exports
- Clear browser cache if needed

### Debug Mode

Enable debug logging:

```javascript
// In browser console
window.CHAT_DEBUG = true;
```

This will show:

- Context window management
- Generation parameters being used
- Worker communication details

---

💡 **Need help?** Check the existing CV and homepage configs for more examples of the configuration pattern.
