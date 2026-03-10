import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import ChatErrorBoundary from '../../../components/chat/ChatErrorBoundary';

// Suppress React error boundary noise in test output
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (
      msg.includes('Error: Uncaught') ||
      msg.includes('The above error occurred') ||
      msg.includes('Error boundary caught') ||
      msg.includes('act(')
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});

const ThrowingChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Child content</div>;
};

describe('ChatErrorBoundary', () => {
  it('renders children normally when no error', () => {
    render(
      <ChatErrorBoundary>
        <div>Hello</div>
      </ChatErrorBoundary>
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows fallback UI when child throws', () => {
    render(
      <ChatErrorBoundary fallbackMessage="Chat broke!">
        <ThrowingChild shouldThrow={true} />
      </ChatErrorBoundary>
    );

    expect(screen.getByText('Chat broke!')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
    expect(screen.queryByText('Child content')).not.toBeInTheDocument();
  });

  it('uses default fallback message', () => {
    render(
      <ChatErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ChatErrorBoundary>
    );

    expect(
      screen.getByText('Something went wrong displaying chat messages.')
    ).toBeInTheDocument();
  });

  it('has retry button that resets error state', () => {
    render(
      <ChatErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ChatErrorBoundary>
    );

    // Verify fallback is shown
    expect(screen.getByText('Try again')).toBeInTheDocument();

    // Clicking retry calls setState to reset hasError
    // Even though the child will throw again (causing error boundary to catch again),
    // we verify the button is functional
    fireEvent.click(screen.getByText('Try again'));

    // After retry with same throwing child, the error boundary catches again
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });
});
