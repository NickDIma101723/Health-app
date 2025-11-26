// Simple logger wrapper - silences debug logs outside of development
const isDev = typeof __DEV__ !== 'undefined' ? (__DEV__ as boolean) : process.env.NODE_ENV !== 'production';

const originalConsoleLog = console.log.bind(console);
const originalConsoleInfo = console.info.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);

export const debug = (...args: any[]) => {
  if (isDev) originalConsoleLog(...args);
};

export const info = (...args: any[]) => {
  if (isDev) originalConsoleInfo(...args);
};

export const warn = (...args: any[]) => {
  originalConsoleWarn(...args);
};

export const error = (...args: any[]) => {
  originalConsoleError(...args);
};

// Replace global console.log / info with guarded versions to silence logs in production
console.log = (...args: any[]) => debug(...args);
console.info = (...args: any[]) => info(...args);

export default {
  debug,
  info,
  warn,
  error,
};
