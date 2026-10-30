// react-router-dom v7 uses TextEncoder, which the jsdom test environment doesn't provide.
const { TextEncoder, TextDecoder } = require("node:util");

Object.assign(globalThis, { TextEncoder, TextDecoder });
