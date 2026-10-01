/** In web review mode, switch the art and its hit zones together. */
export const originalIllustrations =
  typeof window !== "undefined" &&
  !!window.location &&
  new URLSearchParams(window.location.search).get("illustrations") ===
    "original";
