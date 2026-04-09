'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SYSTEM_PROMPT = `Je bent de Vloer Assistent van Navisol B.V. Je helpt medewerkers op de werkvloer met praktisch advies. Vraag altijd eerst: 1) Welk project is dit? 2) In welke stap van de afbouwvolgorde zit je? Afbouwvolgorde: 1=Gronden+primer+aflak+folie, 2=Vaste componenten, 3=Bekabeling+leidingen, 4=Interieur, 5=Elektra aansluiten+testen, 6=Eindtest+oplevering. Nooit direct advies zonder context. Spreektaal, direct.`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function FloorAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleSend() {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    // Add user message
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      // Build message history for API
      const chatMessages: ChatMessage[] = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage.content },
      ];

      // Call /api/chat endpoint (Vercel serverless function in production)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          messages: chatMessages,
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2048,
          temperature: 1.0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content[0].text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Er is iets misgegaan');
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClearChat() {
    if (confirm('Weet je zeker dat je de chat wilt wissen?')) {
      setMessages([]);
      setError(null);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header - Fixed */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Vloer Assistent</h1>
                <p className="text-sm text-slate-500">Praktisch advies voor de werkvloer</p>
              </div>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="text-slate-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-teal-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Welkom bij de Vloer Assistent
              </h2>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Stel je vraag over het project waar je aan werkt. De assistent vraagt eerst naar
                context (project + afbouwstap) voordat je advies krijgt.
              </p>
              <Card className="max-w-md mx-auto">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-700">
                    Afbouwvolgorde
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 text-center">1</Badge>
                    <span className="text-slate-600">Gronden + primer + aflak + folie</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 text-center">2</Badge>
                    <span className="text-slate-600">Vaste componenten</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 text-center">3</Badge>
                    <span className="text-slate-600">Bekabeling + leidingen</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 text-center">4</Badge>
                    <span className="text-slate-600">Interieur</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 text-center">5</Badge>
                    <span className="text-slate-600">Elektra aansluiten + testen</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 text-center">6</Badge>
                    <span className="text-slate-600">Eindtest + oplevering</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-teal-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-teal-100' : 'text-slate-400'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString('nl-NL', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 text-teal-600 animate-spin" />
                      <span className="text-sm text-slate-600">Aan het denken...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Fout</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input - Fixed at bottom */}
      <div className="bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Stel je vraag..."
              className="resize-none min-h-[48px] max-h-32"
              rows={1}
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-teal-600 hover:bg-teal-700 h-12 px-6"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Druk op Enter om te verzenden, Shift+Enter voor een nieuwe regel
          </p>
        </div>
      </div>
    </div>
  );
}
