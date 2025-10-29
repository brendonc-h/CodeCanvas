# MiniMax-M2 Integration Guide

## Overview

MiniMax-M2 is a new agentic AI model that has been integrated into CodeCanvas as an additional AI provider. It runs via the official MiniMax API (OpenAI-compatible), providing an alternative to Groq, OpenAI, Anthropic, and Grok.

## What Was Added

### Backend Changes

1. **`server/ai-client.ts`**
   - Added `minimax` to the `AIRequest` provider union type
   - Implemented `generateMiniMax()` method that calls MiniMax OpenAI-compatible API
   - Added `MiniMax-M2` to `listModels()` for the minimax provider
   - Added health check for MiniMax in `checkProviderHealth()`
   - Uses `minimax_api_key` from user settings or `MINIMAX_API_KEY` env var

2. **`server/routes/ai.ts`**
   - Added `minimax` to all supported providers arrays
   - Updated error messages to include minimax

### Frontend Changes

1. **`client/src/components/editor/ai-panel.tsx`**
   - Added "MiniMax (HF)" option to the provider dropdown
   - Model selection automatically loads `MiniMaxAI/MiniMax-M2` when minimax is selected

2. **`client/src/pages/editor.tsx`**
   - Added Settings button (⚙️) to the toolbar
   - Implemented settings dialog with MiniMax API key configuration
   - Added state management for settings (query, mutation, local state)
   - Users can save their MiniMax API key directly in the UI

### Documentation

1. **`README.md`**
   - Updated features list to include MiniMax M2
   - Added AI provider configuration section with setup instructions
   - Updated API endpoints documentation
   - Added links to get Hugging Face API tokens

## How to Use

### 1. Get a MiniMax API Key

Visit https://platform.minimax.io and sign up for a free account. The API is **free for a limited time**.

### 2. Configure the Key

**Option A: Environment Variable**
```bash
# Add to .env
MINIMAX_API_KEY=your_minimax_api_key_here
```

**Option B: In-App Settings**
1. Open any project in the editor
2. Click the Settings button (⚙️) in the top toolbar
3. Enter your MiniMax API key in the input field
4. Click the Save button

### 3. Use MiniMax

1. Open the AI Assistant panel (right side of editor)
2. Select "MiniMax (HF)" from the provider dropdown
3. The model "MiniMaxAI/MiniMax-M2" will be automatically selected
4. Choose your mode (Explain, Refactor, Generate, Review, Test)
5. Enter your prompt and send

## Technical Details

### API Integration

MiniMax is accessed via the official MiniMax API (OpenAI-compatible):
- **Endpoint**: `https://api.minimax.io/v1/chat/completions`
- **Method**: POST
- **Authentication**: Bearer token (MiniMax API key)
- **Parameters**:
  - `model`: "MiniMax-M2"
  - `messages`: Array of chat messages
  - `max_tokens`: 2000
  - `temperature`: 0.7

### Response Handling

The API returns OpenAI-compatible responses:
- Response format: `{ choices: [{ message: { content: "..." } }] }`
- Extracts text from `response.data.choices[0].message.content`

### Error Handling

- Missing API key: "MiniMax API key not configured"
- API errors: Standard axios error handling with 60s timeout
- Network errors: Proper error propagation to frontend

## Model Information

**MiniMax-M2** is designed for agentic tasks and code generation. Key characteristics:
- Official MiniMax API (OpenAI-compatible)
- Cloud-hosted (no local download required)
- Supports chat-style interactions
- Optimized for code understanding, tool calling, and agentic workflows
- 10B activation size for fast inference

## Comparison with Other Providers

| Provider | Cost | Speed | Setup |
|----------|------|-------|-------|
| Groq | FREE | Very Fast | API key |
| MiniMax | FREE* | Fast | API key |
| OpenAI | Paid | Fast | API key |
| Anthropic | Paid | Medium | API key |
| Grok | Paid | Fast | API key |

*Free for limited time on MiniMax platform

## Troubleshooting

**"MiniMax API key not configured"**
- Ensure you've set `MINIMAX_API_KEY` in .env OR
- Configure the key via Settings in the editor UI
- Get a free key at https://platform.minimax.io

**API errors (500, 401, etc.)**
- Verify your API key is valid
- Check if you've exceeded rate limits
- Visit https://platform.minimax.io for API status

**Model not appearing in dropdown**
- Ensure you selected "MiniMax (HF)" as the provider first
- Refresh the page if models don't load
- Check browser console for errors

## Future Enhancements

Potential improvements for MiniMax integration:
- Streaming responses for real-time output
- Support for additional MiniMax models as they're released
- Fine-tuned prompts optimized for MiniMax's capabilities
- Caching layer to reduce API calls
- Usage tracking and rate limit monitoring
