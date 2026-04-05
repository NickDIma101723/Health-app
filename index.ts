// Polyfill performance methods missing in some RN engines
if (typeof performance !== 'undefined') {
  if (typeof performance.clearMarks !== 'function') {
    performance.clearMarks = () => {};
  }
  if (typeof performance.clearMeasures !== 'function') {
    performance.clearMeasures = () => {};
  }
}

import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
