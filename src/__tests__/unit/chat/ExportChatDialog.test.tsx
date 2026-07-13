import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import ExportChatDialog, {
  formatMessagesToMarkdown,
} from '../../../components/chat/ExportChatDialog';
import { ChatMessage } from '../../../types/chat';

const messages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: "what's Alex's current role?",
    timestamp: new Date('2026-01-01T12:00:00'),
  },
  {
    id: '2',
    role: 'assistant',
    content: 'Alex is a Senior AI Engineer at Perch Insights.',
    thinking: 'The CV says Perch Insights.',
    timestamp: new Date('2026-01-01T12:00:05'),
  },
];

describe('formatMessagesToMarkdown', () => {
  it('formats roles and content without thinking by default', () => {
    const md = formatMessagesToMarkdown(messages, false);
    expect(md).toContain('## User');
    expect(md).toContain("what's Alex's current role?");
    expect(md).toContain('## Assistant');
    expect(md).toContain('Senior AI Engineer at Perch Insights');
    expect(md).not.toContain('### Thinking');
    expect(md).toContain('---');
  });

  it('includes thinking blocks when requested', () => {
    const md = formatMessagesToMarkdown(messages, true);
    expect(md).toContain('### Thinking');
    expect(md).toContain('The CV says Perch Insights.');
    expect(md).toContain('### Response');
  });

  it('returns empty string for no messages', () => {
    expect(formatMessagesToMarkdown([], false)).toBe('');
  });
});

describe('ExportChatDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ExportChatDialog
        isOpen={false}
        onCancel={jest.fn()}
        messages={messages}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows message count and thinking checkbox when open', () => {
    render(
      <ExportChatDialog
        isOpen={true}
        onCancel={jest.fn()}
        messages={messages}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('include thinking blocks')).toBeInTheDocument();
  });

  it('calls onCancel when cancel is clicked', () => {
    const onCancel = jest.fn();
    render(
      <ExportChatDialog isOpen={true} onCancel={onCancel} messages={messages} />
    );
    fireEvent.click(screen.getByText('cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
