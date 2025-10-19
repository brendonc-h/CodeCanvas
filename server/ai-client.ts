import axios from 'axios';
import { dbStorage } from './db-storage';

export interface AIRequest {
  provider: 'groq' | 'openai' | 'anthropic' | 'grok';
  model: string;
  prompt: string;
  apiKey?: string; // For external providers
}

export class AIClient {
  async generate(request: AIRequest, userId: string): Promise<string> {
    const { provider, model, prompt, apiKey } = request;

    try {
      switch (provider) {
        case 'groq':
          const groqKey = apiKey || (await this.getUserApiKey(userId, 'groq_api_key')) || process.env.GROQ_API_KEY;
          if (!groqKey) throw new Error('Groq API key not configured');
          return await this.generateGroq(model, prompt, groqKey);

        case 'openai':
          const openaiKey = apiKey || (await this.getUserApiKey(userId, 'openai_api_key')) || process.env.OPENAI_API_KEY;
          if (!openaiKey) throw new Error('OpenAI API key not configured');
          return await this.generateOpenAI(model, prompt, openaiKey);

        case 'anthropic':
          const anthropicKey = apiKey || (await this.getUserApiKey(userId, 'anthropic_api_key')) || process.env.ANTHROPIC_API_KEY;
          if (!anthropicKey) throw new Error('Anthropic API key not configured');
          return await this.generateAnthropic(model, prompt, anthropicKey);

        case 'grok':
          const grokKey = apiKey || (await this.getUserApiKey(userId, 'grok_api_key')) || process.env.GROK_API_KEY;
          if (!grokKey) throw new Error('Grok API key not configured');
          return await this.generateGrok(model, prompt, grokKey);

        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error: any) {
      console.error(`${provider} error:`, error.message);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  private async generateGroq(model: string, prompt: string, apiKey: string): Promise<string> {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: model || 'llama-3.3-70b-versatile', // Default to Llama 3.3 70B (FREE)
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );
    return response.data.choices[0].message.content;
  }

  private async generateOpenAI(model: string, prompt: string, apiKey: string): Promise<string> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );
    return response.data.choices[0].message.content;
  }

  private async generateAnthropic(model: string, prompt: string, apiKey: string): Promise<string> {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );
    return response.data.content[0].text;
  }

  private async generateGrok(model: string, prompt: string, apiKey: string): Promise<string> {
    const response = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        model: model || 'grok-beta',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );
    return response.data.choices[0].message.content;
  }

  private async getUserApiKey(userId: string, keyName: string): Promise<string | null> {
    const setting = await dbStorage.getUserSetting(userId, keyName);
    return setting?.value || null;
  }

  async listModels(provider: string, userId?: string): Promise<string[]> {
    try {
      switch (provider) {
        case 'groq':
          // Return available Groq models (FREE, fast inference)
          return [
            'llama-3.3-70b-versatile',    // Best quality (FREE)
            'llama-3.1-70b-versatile',    // Great quality
            'llama-3.1-8b-instant',       // Fastest
            'mixtral-8x7b-32768',         // Long context
            'gemma2-9b-it'                // Google's model
          ];

        case 'openai':
          // Return common OpenAI models
          return ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];

        case 'anthropic':
          // Return common Anthropic models
          return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];

        case 'grok':
          // Return available Grok models
          return ['grok-beta', 'grok-vision-beta'];

        default:
          return [];
      }
    } catch (error) {
      console.error(`Failed to list ${provider} models:`, error);
      return [];
    }
  }

  async checkProviderHealth(provider: string, userId?: string): Promise<boolean> {
    try {
      switch (provider) {
        case 'groq':
          const groqKey = (userId ? await this.getUserApiKey(userId, 'groq_api_key') : null) || process.env.GROQ_API_KEY;
          if (!groqKey) return false;
          try {
            await axios.get('https://api.groq.com/openai/v1/models', {
              headers: { 'Authorization': `Bearer ${groqKey}` },
              timeout: 5000,
            });
            return true;
          } catch (error) {
            return false;
          }

        case 'openai':
          const openaiKey = (userId ? await this.getUserApiKey(userId, 'openai_api_key') : null) || process.env.OPENAI_API_KEY;
          if (!openaiKey) return false;
          await axios.get('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${openaiKey}` },
            timeout: 5000,
          });
          return true;

        case 'anthropic':
          if (!userId) return false;
          const anthropicKey = await this.getUserApiKey(userId, 'anthropic_api_key');
          if (!anthropicKey) return false;
          // Simple health check - Anthropic doesn't have a models endpoint
          return true;

        case 'grok':
          if (!userId) return false;
          const grokKey = await this.getUserApiKey(userId, 'grok_api_key') || process.env.GROK_API_KEY;
          if (!grokKey) return false;
          try {
            await axios.get('https://api.x.ai/v1/models', {
              headers: { 'Authorization': `Bearer ${grokKey}` },
              timeout: 5000,
            });
            return true;
          } catch (error) {
            return false;
          }

        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }
}

export const aiClient = new AIClient();
