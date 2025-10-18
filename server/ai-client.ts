import axios from 'axios';
import { dbStorage } from './db-storage';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export interface AIRequest {
  provider: 'ollama' | 'openai' | 'anthropic' | 'grok';
  model: string;
  prompt: string;
  apiKey?: string; // For external providers
}

export class AIClient {
  async generate(request: AIRequest, userId: string): Promise<string> {
    const { provider, model, prompt, apiKey } = request;

    try {
      switch (provider) {
        case 'ollama':
          return await this.generateOllama(model, prompt);

        case 'openai':
          const openaiKey = apiKey || (await this.getUserApiKey(userId, 'openai_api_key'));
          if (!openaiKey) throw new Error('OpenAI API key not configured');
          return await this.generateOpenAI(model, prompt, openaiKey);

        case 'anthropic':
          const anthropicKey = apiKey || (await this.getUserApiKey(userId, 'anthropic_api_key'));
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

  private async generateOllama(model: string, prompt: string): Promise<string> {
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model,
        prompt,
        stream: false,
      },
      {
        timeout: 120000, // 2 minute timeout
      }
    );
    return response.data.response;
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
        case 'ollama':
          const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
          return response.data.models?.map((m: any) => m.name) || [];

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
        case 'ollama':
          await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
          return true;

        case 'openai':
          if (!userId) return false;
          const apiKey = await this.getUserApiKey(userId, 'openai_api_key');
          if (!apiKey) return false;
          await axios.get('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
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
