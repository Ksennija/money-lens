// react-router-dom v7 uses TextEncoder, which the jsdom test environment doesn't provide.
const { TextEncoder, TextDecoder } = require("node:util");

Object.assign(globalThis, { TextEncoder, TextDecoder });

// jsdom does not implement <dialog>.showModal() and close(). These stand-ins open and close it and
// fire "close" as a browser does (the browser also traps focus and handles Escape; tests do not).
HTMLDialogElement.prototype.showModal = function showModal() {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function close() {
  if (!this.hasAttribute("open")) return;
  this.removeAttribute("open");
  this.dispatchEvent(new Event("close"));
};
