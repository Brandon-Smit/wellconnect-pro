// jest.setup.js
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

require('@testing-library/jest-dom');

// Mock environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
process.env.HUGGING_FACE_API_KEY = 'test_api_key';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '',
      query: {},
      asPath: '',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforeHistoryChange: jest.fn(),
      isReady: true,
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Suppress specific warning messages
const originalError = console.error;
console.error = (...args) => {
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    (args[0].includes('Not implemented') || 
     args[0].includes('Warning: An update inside a test was not wrapped'))
  ) {
    return;
  }
  originalError(...args);
};
