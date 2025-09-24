import '@testing-library/jest-dom';
import 'jest-canvas-mock';

// Mock Gatsby
jest.mock('gatsby', () => ({
  graphql: jest.fn(),
  Link: ({ children, to, ...props }) => {
    const React = require('react');
    return React.createElement('a', { href: to, ...props }, children);
  },
  useStaticQuery: jest.fn(),
  navigate: jest.fn(),
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
  }),
}));

// Mock react-helmet
jest.mock('react-helmet', () => ({
  Helmet: ({ children }) => children,
}));

// Mock file-saver
jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

// Mock jsPDF
jest.mock('jspdf', () => {
  const mockPdf = {
    setFontSize: jest.fn().mockReturnThis(),
    setFont: jest.fn().mockReturnThis(),
    splitTextToSize: jest.fn().mockReturnValue(['test line']),
    text: jest.fn().mockReturnThis(),
    line: jest.fn().mockReturnThis(),
    setLineWidth: jest.fn().mockReturnThis(),
    addPage: jest.fn().mockReturnThis(),
    save: jest.fn().mockReturnThis(),
  };
  return jest.fn(() => mockPdf);
});

// Mock docx
jest.mock('docx', () => ({
  Document: jest.fn(),
  Packer: {
    toArrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
  },
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  AlignmentType: {
    CENTER: 'center',
  },
}));

// Mock html2canvas
jest.mock('html2canvas', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    toDataURL: jest.fn().mockReturnValue('data:image/png;base64,test'),
  }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock URL.createObjectURL and URL.revokeObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: jest.fn().mockReturnValue('blob:mock-url'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: jest.fn(),
});

// Mock document.createElement for download links
const originalCreateElement = document.createElement;
document.createElement = jest.fn((tagName) => {
  if (tagName === 'a') {
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
      style: {},
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      firstChild: null,
      textContent: '',
      nodeType: 1, // ELEMENT_NODE
      parentNode: null,
      childNodes: [],
      ownerDocument: document,
    };
    // Make it behave like a real DOM element
    Object.setPrototypeOf(mockLink, HTMLElement.prototype);
    return mockLink;
  }
  return originalCreateElement.call(document, tagName);
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
