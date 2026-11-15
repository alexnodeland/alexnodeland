import '@testing-library/jest-dom';
import 'jest-canvas-mock';

// Mock react-markdown and related modules before any imports
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => {},
}));

jest.mock('rehype-highlight', () => ({
  __esModule: true,
  default: () => {},
}));

// Mock Gatsby
jest.mock('gatsby', () => ({
  graphql: jest.fn(),
  withPrefix: path => path,
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

// Mock docx
jest.mock('docx', () => ({
  Document: jest.fn(),
  Packer: {
    toArrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
  },
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  Table: jest.fn(),
  TableRow: jest.fn(),
  TableCell: jest.fn(),
  AlignmentType: { CENTER: 'center', RIGHT: 'right' },
  BorderStyle: { SINGLE: 'single', NONE: 'none' },
  TableLayoutType: { FIXED: 'fixed' },
  WidthType: { DXA: 'dxa' },
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

// Mock import.meta for Jest
global.import = {
  meta: {
    url: 'file:///mock-path/test.js',
  },
};

// Enhanced Worker mock for chat functionality
global.Worker = class MockWorker {
  constructor(scriptURL, options) {
    this.scriptURL = scriptURL;
    this.options = options;
    this.onmessage = null;
    this.onerror = null;
    this.listeners = new Map();
  }

  postMessage(_data) {
    // Mock worker responses for tests - use shorter timeout and check for function
    const sendResponse = () => {
      if (this.onmessage && typeof this.onmessage === 'function') {
        try {
          this.onmessage({ data: { status: 'ready' } });
        } catch (err) {
          // Silently ignore errors in tests
        }
      }
    };

    // Send response immediately in tests to avoid timing issues
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      sendResponse();
    } else {
      setTimeout(sendResponse, 0);
    }

    // Also notify event listeners
    const messageListeners = this.listeners.get('message') || [];
    messageListeners.forEach(listener => {
      if (typeof listener === 'function') {
        try {
          listener({ data: { status: 'ready' } });
        } catch (err) {
          // Silently ignore errors in tests
        }
      }
    });
  }

  terminate() {
    // Mock termination - clean up listeners
    this.listeners.clear();
    this.onmessage = null;
    this.onerror = null;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(listener);

    // For backward compatibility - only set if it's the first listener
    if (type === 'message' && !this.onmessage) this.onmessage = listener;
    if (type === 'error' && !this.onerror) this.onerror = listener;
  }

  removeEventListener(type, listener) {
    if (this.listeners.has(type)) {
      const listeners = this.listeners.get(type);
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }

    // For backward compatibility
    if (type === 'message' && this.onmessage === listener) {
      this.onmessage = null;
    }
    if (type === 'error' && this.onerror === listener) {
      this.onerror = null;
    }
  }
};

// Enhanced URL mock to handle worker URLs properly
const OriginalURL = global.URL;
global.URL = class MockURL extends OriginalURL {
  constructor(url, base) {
    // Handle worker.js URLs specifically
    if (url === './worker.js' && base && typeof base === 'string') {
      super('file:///mock-worker.js');
    } else if (url === './worker.js' && base === 'file:///mock-path/test.js') {
      super('file:///mock-worker.js');
    } else {
      super(url, base);
    }
  }
};

// Preserve static methods
Object.setPrototypeOf(global.URL, OriginalURL);
Object.getOwnPropertyNames(OriginalURL).forEach(name => {
  if (typeof OriginalURL[name] === 'function') {
    global.URL[name] = OriginalURL[name];
  }
});

// three, with the one part of it that needs a GPU stood in for.
//
// The library itself is real here (jest.config.js points `three` at its
// module build): its maths, its geometries, its materials and its scene
// graph all run as written, so a scene under test builds real objects and a
// test can ask real questions of them. Only the renderer is a stand-in —
// jsdom has no WebGL — and it keeps just enough state to answer what the
// stage asks of it: how large the drawing buffer is, which target is bound,
// and whether a frame was drawn.
jest.mock('three', () => {
  const actual = jest.requireActual('three');

  class WebGLRenderer {
    constructor() {
      // A browser with no WebGL: three's own constructor throws.
      if (WebGLRenderer.unavailable) {
        throw new Error('Error creating WebGL context.');
      }
      this.domElement = global.document.createElement('canvas');
      this.autoClear = true;
      this.extensions = { has: () => true, get: () => null };
      this.capabilities = { isWebGL2: true, maxTextureSize: 4096 };
      this.info = { render: { calls: 0, frame: 0 }, memory: {} };
      this.render = jest.fn();
      this.dispose = jest.fn();
      this.forceContextLoss = jest.fn();
      this.pixelRatio = 1;
      this.width = 300;
      this.height = 150;
      this.target = null;
      // Every renderer made, newest last, for a test that wants to ask one
      // what it was told (WebGLRenderer.instances; clear it between tests).
      WebGLRenderer.instances.push(this);
    }

    setClearColor() {}
    setPixelRatio(ratio) {
      this.pixelRatio = ratio;
    }
    getPixelRatio() {
      return this.pixelRatio;
    }
    setSize(width, height) {
      this.width = width;
      this.height = height;
      this.domElement.width = Math.floor(width * this.pixelRatio);
      this.domElement.height = Math.floor(height * this.pixelRatio);
    }
    getSize(target) {
      return target.set(this.width, this.height);
    }
    getDrawingBufferSize(target) {
      return target.set(
        Math.floor(this.width * this.pixelRatio),
        Math.floor(this.height * this.pixelRatio)
      );
    }
    setRenderTarget(target) {
      this.target = target;
    }
    getRenderTarget() {
      return this.target;
    }
    clear() {}
    compile() {}
    compileAsync() {
      return Promise.resolve();
    }
    initTexture() {}
    // As much of a GL context as it takes to ask what is drawing: the name
    // a test set (WebGLRenderer.rendererName), or none.
    getContext() {
      return {
        RENDERER: 0x1f01,
        getExtension: () => null,
        getParameter: () => WebGLRenderer.rendererName,
      };
    }
  }
  WebGLRenderer.instances = [];
  WebGLRenderer.unavailable = false;
  WebGLRenderer.rendererName = null;

  return { ...actual, WebGLRenderer };
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
