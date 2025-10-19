import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AiPanel } from '../ai-panel';

// Mock the query client
const mockQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Mock API request
const mockApiRequest = jest.fn();
jest.mock('../../../lib/queryClient', () => ({
  apiRequest: mockApiRequest,
}));

const mockToast = jest.fn();
jest.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Wrapper component with providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={mockQueryClient}>
    {children}
  </QueryClientProvider>
);

describe('AiPanel', () => {
  const defaultProps = {
    projectId: 'project-1',
    currentFile: 'test.js',
    currentContent: 'console.log("hello");',
    onApplyPatch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiRequest.mockResolvedValue({
      json: () => Promise.resolve({ models: [
        { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' }
      ]})
    });
  });

  it('renders AI assistant title', () => {
    render(
      <TestWrapper>
        <AiPanel {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('loads models for default provider', async () => {
    render(
      <TestWrapper>
        <AiPanel {...defaultProps} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/ai/models?provider=groq');
    });
  });

  it('displays mode tabs', () => {
    render(
      <TestWrapper>
        <AiPanel {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByTestId('tab-explain')).toBeInTheDocument();
    expect(screen.getByTestId('tab-refactor')).toBeInTheDocument();
    expect(screen.getByTestId('tab-generate')).toBeInTheDocument();
    expect(screen.getByTestId('tab-review')).toBeInTheDocument();
    expect(screen.getByTestId('tab-test')).toBeInTheDocument();
  });

  it('shows empty state initially', () => {
    render(
      <TestWrapper>
        <AiPanel {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Ask AI to help with your code')).toBeInTheDocument();
  });

  it('allows input and send', async () => {
    mockApiRequest.mockResolvedValue({
      json: () => Promise.resolve({ response: 'This is a test response' })
    });

    render(
      <TestWrapper>
        <AiPanel {...defaultProps} />
      </TestWrapper>
    );

    const input = screen.getByTestId('textarea-ai-input');
    const sendButton = screen.getByTestId('button-send-ai');

    fireEvent.change(input, { target: { value: 'Explain this code' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/ai/complete', expect.any(Object));
    });
  });
});
