import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// happy-dom does not implement document.execCommand. The Bijoy keyboard
// interceptor calls it first and falls back to native value setters when it
// returns false — so we stub it to always return false.
if (typeof document !== "undefined" && typeof document.execCommand !== "function") {
  (document as Document & { execCommand: (...args: unknown[]) => boolean }).execCommand = () => false;
}

