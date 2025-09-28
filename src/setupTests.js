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

// Keep default document.createElement behavior; anchor elements must be real Nodes

const createCanvasElement = () => {
  if (typeof document !== 'undefined' && document.createElement) {
    return document.createElement('canvas');
  }
  return {
    nodeType: 1,
    width: 300,
    height: 150,
    getContext: jest.fn(),
    style: {},
  };
};

// Mock Three.js
jest.mock('three', () => ({
  Scene: jest.fn(() => {
    const objects = [];
    return {
      add: jest.fn(obj => objects.push(obj)),
      remove: jest.fn(obj => {
        const idx = objects.indexOf(obj);
        if (idx !== -1) objects.splice(idx, 1);
      }),
      objects,
    };
  }),
  PerspectiveCamera: jest.fn(() => ({
    position: { set: jest.fn() },
    lookAt: jest.fn(),
  })),
  OrthographicCamera: jest.fn(() => ({
    position: { set: jest.fn() },
    lookAt: jest.fn(),
  })),
  WebGLRenderer: jest.fn(() => ({
    setSize: jest.fn(),
    render: jest.fn(),
    domElement: createCanvasElement(),
    setPixelRatio: jest.fn(),
    dispose: jest.fn(),
  })),
  Color: jest.fn(() => ({ setRGB: jest.fn() })),
  Vector3: jest.fn(() => ({ set: jest.fn(), toArray: jest.fn() })),
  Vector2: jest.fn(() => ({ set: jest.fn() })),
  BufferGeometry: jest.fn(() => {
    const attributes = new Map();
    return {
      setAttribute: jest.fn((name, attr) => attributes.set(name, attr)),
      getAttribute: jest.fn(name => attributes.get(name)),
      dispose: jest.fn(),
    };
  }),
  BufferAttribute: jest.fn(() => ({
    setXYZ: jest.fn(),
    setXY: jest.fn(),
    needsUpdate: false,
  })),
  LineDashedMaterial: jest.fn(),
  LineBasicMaterial: jest.fn(() => ({
    color: { setRGB: jest.fn() },
    opacity: 1,
    linewidth: 1,
    transparent: true,
    dispose: jest.fn(),
  })),
  Line: jest.fn((geometry, material) => ({
    geometry,
    material,
    userData: {},
    computeLineDistances: jest.fn(),
  })),
  PointsMaterial: jest.fn(() => ({
    size: 1,
    transparent: true,
    opacity: 1,
    vertexColors: true,
    dispose: jest.fn(),
  })),
  Points: jest.fn((geometry, material) => ({
    geometry,
    material,
  })),
  MeshBasicMaterial: jest.fn(() => ({ dispose: jest.fn() })),
  Mesh: jest.fn((geometry, material) => ({
    geometry,
    material,
    position: { set: jest.fn() },
    scale: { setScalar: jest.fn() },
  })),
  ShaderMaterial: jest.fn(config => ({ ...config, dispose: jest.fn() })),
  PlaneGeometry: jest.fn(() => ({ dispose: jest.fn() })),
  SphereGeometry: jest.fn(() => ({ dispose: jest.fn() })),
  DataTexture: jest.fn(() => ({ needsUpdate: false, dispose: jest.fn() })),
  AdditiveBlending: 1,
}));

// Mock three/examples postprocessing modules
jest.mock('three/examples/jsm/postprocessing/EffectComposer.js', () => ({
  EffectComposer: jest.fn(() => ({
    addPass: jest.fn(),
    setSize: jest.fn(),
    render: jest.fn(),
  })),
}));
jest.mock('three/examples/jsm/postprocessing/RenderPass.js', () => ({
  RenderPass: jest.fn(),
}));
jest.mock('three/examples/jsm/postprocessing/UnrealBloomPass.js', () => ({
  UnrealBloomPass: jest.fn(),
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
