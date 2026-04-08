/**
 * Anthropic API Client (Client-Side)
 *
 * Uses the Next.js API proxy route at /api/chat to make server-side
 * requests to the Anthropic API, solving CORS issues.
 *
 * This can be used by:
 * - Vloer Assistent (Floor Assistant)
 * - Director Agent
 * - Any other AI-powered features in the app
 */

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnthropicRequest {
  system?: string;
  messages: AnthropicMessage[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface AnthropicError {
  error: string;
  message?: string;
  details?: any;
}

/**
 * Call Claude via the Next.js API proxy route
 *
 * @example
 * const response = await callClaude({
 *   system: 'You are a helpful boat configuration assistant',
 *   messages: [
 *     { role: 'user', content: 'What propulsion system should I choose?' }
 *   ],
 *   model: 'claude-3-5-sonnet-20241022',
 * });
 *
 * if (response.ok) {
 *   console.log(response.data.content[0].text);
 * } else {
 *   console.error(response.error);
 * }
 */
export async function callClaude(
  request: AnthropicRequest
): Promise<{ ok: true; data: AnthropicResponse } | { ok: false; error: string }> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system: request.system,
        messages: request.messages,
        model: request.model || 'claude-3-5-sonnet-20241022',
        max_tokens: request.max_tokens || 4096,
        temperature: request.temperature ?? 1.0,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error calling Claude',
    };
  }
}

/**
 * Stream responses from Claude (for real-time chat interfaces)
 * Note: Requires the API route to support streaming (not yet implemented)
 */
export async function streamClaude(
  request: AnthropicRequest,
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> {
  // TODO: Implement streaming support in /api/chat route
  // For now, fall back to regular call
  const response = await callClaude(request);

  if (response.ok) {
    onChunk(response.data.content[0].text);
    onComplete();
  } else {
    onError(response.error);
  }
}

/**
 * Helper to build a conversation with Claude
 * Maintains message history and provides a simple interface
 */
export class ClaudeConversation {
  private messages: AnthropicMessage[] = [];
  private systemPrompt?: string;
  private model: string;

  constructor(options?: {
    system?: string;
    model?: string;
  }) {
    this.systemPrompt = options?.system;
    this.model = options?.model || 'claude-3-5-sonnet-20241022';
  }

  /**
   * Add a user message and get Claude's response
   */
  async send(userMessage: string): Promise<{ ok: true; response: string } | { ok: false; error: string }> {
    // Add user message to history
    this.messages.push({
      role: 'user',
      content: userMessage,
    });

    // Call Claude
    const result = await callClaude({
      system: this.systemPrompt,
      messages: this.messages,
      model: this.model,
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    // Extract response text
    const responseText = result.data.content[0].text;

    // Add assistant response to history
    this.messages.push({
      role: 'assistant',
      content: responseText,
    });

    return { ok: true, response: responseText };
  }

  /**
   * Get the full conversation history
   */
  getHistory(): AnthropicMessage[] {
    return [...this.messages];
  }

  /**
   * Clear the conversation history
   */
  clear(): void {
    this.messages = [];
  }

  /**
   * Get the number of messages in the conversation
   */
  getMessageCount(): number {
    return this.messages.length;
  }
}

/**
 * Example usage for Vloer Assistent (Floor Assistant)
 */
export async function askFloorAssistant(question: string): Promise<string> {
  const response = await callClaude({
    system: `You are a helpful floor assistant for a boat manufacturing facility.
You help production workers with:
- Finding parts and materials
- Understanding work instructions
- Answering questions about boat assembly
- Providing safety information

Be concise, practical, and friendly.`,
    messages: [
      {
        role: 'user',
        content: question,
      },
    ],
  });

  if (response.ok) {
    return response.data.content[0].text;
  } else {
    throw new Error(`Floor Assistant error: ${response.error}`);
  }
}

/**
 * Example usage for Director Agent
 */
export async function askDirectorAgent(
  context: {
    projectTitle: string;
    projectType: string;
    currentStatus: string;
    openTasks: number;
  },
  question: string
): Promise<string> {
  const response = await callClaude({
    system: `You are a Director Agent helping manage boat manufacturing projects.

Current Project Context:
- Title: ${context.projectTitle}
- Type: ${context.projectType}
- Status: ${context.currentStatus}
- Open Tasks: ${context.openTasks}

You provide:
- Project management insights
- Risk analysis
- Schedule recommendations
- Resource allocation suggestions

Be strategic, data-driven, and actionable.`,
    messages: [
      {
        role: 'user',
        content: question,
      },
    ],
  });

  if (response.ok) {
    return response.data.content[0].text;
  } else {
    throw new Error(`Director Agent error: ${response.error}`);
  }
}
