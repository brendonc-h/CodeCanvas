import axios from 'axios';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
}

export interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

export class OllamaClient {
  async generate(request: OllamaRequest): Promise<string> {
    try {
      const response = await axios.post<OllamaResponse>(
        `${OLLAMA_BASE_URL}/api/generate`,
        {
          ...request,
          stream: false,
        },
        {
          timeout: 120000, // 2 minute timeout
        }
      );

      return response.data.response;
    } catch (error: any) {
      console.error('Ollama error:', error.message);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
      return response.data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const ollamaClient = new OllamaClient();
