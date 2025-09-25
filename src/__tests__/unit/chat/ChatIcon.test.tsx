import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ChatProvider } from '../../../components/chat/ChatContext';
import ChatIcon from '../../../components/chat/ChatIcon';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<ChatProvider>{component}</ChatProvider>);
};

describe('ChatIcon', () => {
  it('renders chat icon button', () => {
    renderWithProvider(<ChatIcon />);

    const button = screen.getByRole('button', { name: /open chat/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('chat-icon');
  });

  it('shows chat icon when closed', () => {
    renderWithProvider(<ChatIcon />);

    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();

    // Should show chat bubble icon (not close icon)
    const path = svg?.querySelector('path');
    expect(path).toHaveAttribute(
      'd',
      expect.stringContaining('M21 15C21 15.5304')
    );
  });

  it('toggles to close icon when opened', () => {
    renderWithProvider(<ChatIcon />);

    const button = screen.getByRole('button');

    // Click to open
    fireEvent.click(button);

    // Should show close icon
    const svg = button.querySelector('svg');
    const path = svg?.querySelector('path');
    expect(path).toHaveAttribute('d', expect.stringContaining('M18 6L6 18'));
  });

  it('has correct accessibility attributes', () => {
    renderWithProvider(<ChatIcon />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Open chat');

    // After clicking, aria-label should change
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', 'Close chat');
  });

  it('applies open class when chat is open', () => {
    renderWithProvider(<ChatIcon />);

    const button = screen.getByRole('button');
    expect(button).not.toHaveClass('open');

    fireEvent.click(button);
    expect(button).toHaveClass('open');
  });

  it('handles multiple clicks correctly', async () => {
    renderWithProvider(<ChatIcon />);

    const button = screen.getByRole('button');

    // First click - open
    fireEvent.click(button);
    expect(button).toHaveClass('open');
    expect(button).toHaveAttribute('aria-label', 'Close chat');

    // Wait for the closing animation to complete
    await new Promise(resolve => setTimeout(resolve, 350));

    // Second click - close
    fireEvent.click(button);
    expect(button).not.toHaveClass('open');
    expect(button).toHaveAttribute('aria-label', 'Open chat');
  });

  it('has proper SVG structure', () => {
    renderWithProvider(<ChatIcon />);

    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');

    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('has inner container with proper class', () => {
    renderWithProvider(<ChatIcon />);

    const button = screen.getByRole('button');
    const inner = button.querySelector('.chat-icon-inner');

    expect(inner).toBeInTheDocument();
    expect(inner).toHaveClass('chat-icon-inner');
  });
});
