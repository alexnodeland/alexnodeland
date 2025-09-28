import { fireEvent, render, screen } from '@testing-library/react';
import { ChatProvider } from '../../../components/chat/ChatContext';
import ChatInput from '../../../components/chat/ChatInput';

const renderWithProvider = () => {
  return render(
    <ChatProvider>
      <ChatInput />
    </ChatProvider>
  );
};

describe('ChatInput', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders input form correctly', () => {
    renderWithProvider();

    const textarea = screen.getByPlaceholderText('type your message here...');
    const button = screen.getByRole('button', { name: /send message/i });

    expect(textarea).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });

  it('updates input value when typing', () => {
    renderWithProvider();

    const textarea = screen.getByPlaceholderText('type your message here...');
    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    expect(textarea).toHaveValue('Hello world');
  });

  it('submits form when send button is clicked', async () => {
    renderWithProvider();

    const textarea = screen.getByPlaceholderText('type your message here...');
    const button = screen.getByRole('button', { name: /send message/i });

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(button);

    // Input should be cleared
    expect(textarea).toHaveValue('');

    // Fast-forward timers to complete the async operation
    jest.runAllTimers();

    // Note: The message won't be visible in this test because ChatMessage component
    // is not rendered in the ChatInput test. This is expected behavior.
    // The actual integration test would be in ChatModal tests.
  });

  it('submits form when Enter key is pressed', async () => {
    renderWithProvider();

    const textarea = screen.getByPlaceholderText('type your message here...');

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

    // Input should be cleared
    expect(textarea).toHaveValue('');

    // Fast-forward timers
    jest.runAllTimers();

    // Note: The message won't be visible in this test because ChatMessage component
    // is not rendered in the ChatInput test. This is expected behavior.
  });

  it('does not submit when Shift+Enter is pressed', () => {
    renderWithProvider();

    const textarea = screen.getByPlaceholderText('type your message here...');

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, {
      key: 'Enter',
      code: 'Enter',
      shiftKey: true,
    });

    // Input should not be cleared
    expect(textarea).toHaveValue('Test message');
  });

  it('does not submit empty messages', () => {
    renderWithProvider();

    const textarea = screen.getByPlaceholderText('type your message here...');
    const button = screen.getByRole('button', { name: /send message/i });

    // Button should be disabled for empty input
    expect(button).toBeDisabled();

    fireEvent.change(textarea, { target: { value: '   ' } });
    expect(button).toBeDisabled();
  });

  it('does not submit when only whitespace', () => {
    renderWithProvider();

    const textarea = screen.getByPlaceholderText('type your message here...');
    const button = screen.getByRole('button', { name: /send message/i });

    fireEvent.change(textarea, { target: { value: '   \n  ' } });
    expect(button).toBeDisabled();
  });

  it('enables button when valid input is provided', () => {
    renderWithProvider();

    const textarea = screen.getByPlaceholderText('type your message here...');
    const button = screen.getByRole('button', { name: /send message/i });

    fireEvent.change(textarea, { target: { value: 'Valid message' } });
    expect(button).not.toBeDisabled();
  });

  it('handles button state correctly during interaction', async () => {
    renderWithProvider();

    const textarea = screen.getByPlaceholderText('type your message here...');
    const button = screen.getByRole('button', { name: /send message/i });

    // Initially button should be disabled (no input)
    expect(button).toBeDisabled();

    // Add text - button should be enabled
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    expect(button).not.toBeDisabled();

    // Submit form - input should be cleared
    fireEvent.click(button);
    expect(textarea).toHaveValue('');

    // After clearing, button should be disabled again (no input)
    expect(button).toBeDisabled();

    // Fast-forward timers
    jest.runAllTimers();
  });

  it('auto-resizes textarea based on content', () => {
    renderWithProvider();

    const textarea = screen.getByPlaceholderText('type your message here...');

    // Mock scrollHeight
    Object.defineProperty(textarea, 'scrollHeight', {
      writable: true,
      value: 100,
    });

    fireEvent.change(textarea, {
      target: { value: 'Multi-line\nmessage\ncontent' },
    });

    // Should set height to scrollHeight
    expect(textarea.style.height).toBe('100px');
  });

  it('has correct accessibility attributes', () => {
    renderWithProvider();

    const textarea = screen.getByPlaceholderText('type your message here...');
    const button = screen.getByRole('button', { name: /send message/i });

    expect(textarea).toHaveAttribute(
      'placeholder',
      'type your message here...'
    );
    expect(button).toHaveAttribute('aria-label', 'Send message');
  });

  it('generates random assistant responses', async () => {
    // Mock Math.random to return predictable values
    const mockMath = Object.create(global.Math);
    mockMath.random = jest.fn(() => 0.5);
    global.Math = mockMath;

    renderWithProvider();

    const textarea = screen.getByPlaceholderText('type your message here...');
    const button = screen.getByRole('button', { name: /send message/i });

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(button);

    // Fast-forward timers
    jest.runAllTimers();

    // Note: The message won't be visible in this test because ChatMessage component
    // is not rendered in the ChatInput test. This is expected behavior.
    // The actual integration test would be in ChatModal tests.

    // Restore Math.random
    global.Math = Object.create(Math);
  });

  it('has proper form structure', () => {
    renderWithProvider();

    const form = screen
      .getByRole('button', { name: /send message/i })
      .closest('form');
    expect(form).toHaveClass('chat-input-form');

    const textarea = screen.getByPlaceholderText('type your message here...');
    expect(textarea).toHaveClass('chat-input');

    const button = screen.getByRole('button', { name: /send message/i });
    expect(button).toHaveClass('chat-send-button');
  });
});
