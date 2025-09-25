import React, { createContext, ReactNode, useContext, useState } from 'react';
import { ChatMessage, ChatModel } from '../../types/chat';

interface ChatContextType {
  isChatOpen: boolean;
  isClosing: boolean;
  messages: ChatMessage[];
  selectedModel: string;
  availableModels: ChatModel[];
  isLoading: boolean;
  setChatOpen: (isOpen: boolean) => void;
  setClosing: (isClosing: boolean) => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setSelectedModel: (modelId: string) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState('distilbert-base-uncased');
  const [isLoading, setIsLoading] = useState(false);

  const availableModels: ChatModel[] = [
    {
      id: 'distilbert-base-uncased',
      name: 'DistilBERT',
      description: 'Lightweight BERT model for text understanding',
    },
  ];

  const setChatOpen = (isOpen: boolean) => {
    setIsChatOpen(isOpen);
  };

  const setClosing = (isClosing: boolean) => {
    setIsClosing(isClosing);
  };

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <ChatContext.Provider
      value={{
        isChatOpen,
        isClosing,
        messages,
        selectedModel,
        availableModels,
        isLoading,
        setChatOpen,
        setClosing,
        addMessage,
        setSelectedModel,
        setLoading,
        clearMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
