import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ChatProvider } from '../../../components/chat/ChatContext';
import ChatIcon from '../../../components/chat/ChatIcon';
import { SettingsPanelProvider } from '../../../components/SettingsPanelContext';

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <SettingsPanelProvider>
      <ChatProvider>{component}</ChatProvider>
    </SettingsPanelProvider>
  );
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

  it('disappears when clicked (opens chat)', () => {
    renderWithProvider(<ChatIcon />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    // Click to open chat
    fireEvent.click(button);

    // Button should disappear after opening chat
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    renderWithProvider(<ChatIcon />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Open chat');
  });

  it('maintains chat icon appearance', () => {
    renderWithProvider(<ChatIcon />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('chat-icon');
    expect(button).not.toHaveClass('open');

    // Icon always shows chat bubble (doesn't change to close icon)
    const svg = button.querySelector('svg');
    const path = svg?.querySelector('path');
    expect(path).toHaveAttribute(
      'd',
      expect.stringContaining('M21 15C21 15.5304')
    );
  });

  it('has proper SVG structure', () => {
    renderWithProvider(<ChatIcon />);

    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');

    expect(svg).toHaveAttribute('width', '20');
    expect(svg).toHaveAttribute('height', '20');
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
