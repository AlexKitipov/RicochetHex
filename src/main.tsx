import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Dev-only: auto-recover from React Fast Refresh hook-order desync.
// React throws "Should have a queue" deep in its internals when HMR swaps
// a component whose hook signature changed. A single reload fixes it.
// Guarded with sessionStorage so we never loop.
if (import.meta.env.DEV) {
  const RELOAD_KEY = "__hmr_hook_reload__";
  const isHookQueueError = (msg: unknown) =>
    typeof msg === "string" && msg.includes("Should have a queue");

  const tryReload = (msg: unknown, source: string, raw: unknown) => {
    if (!isHookQueueError(msg)) return;
    if (sessionStorage.getItem(RELOAD_KEY)) {
      console.warn(
        `[HMR recovery] Hook-order error detected again from ${source}; skipping reload to avoid a loop.`,
        raw
      );
      return;
    }
    sessionStorage.setItem(RELOAD_KEY, "1");
    console.warn(
      `[HMR recovery] Fast Refresh hook-order desync detected from ${source}. Reloading once to recover. Reason:`,
      msg,
      raw
    );
    setTimeout(() => window.location.reload(), 50);
  };

  window.addEventListener("error", (e) => tryReload(e.message, "window.error", e.error ?? e));
  window.addEventListener("unhandledrejection", (e) => {
    const reason = (e.reason && (e.reason.message ?? e.reason)) as unknown;
    tryReload(reason, "unhandledrejection", e.reason);
  });

  // Clear the guard once the app successfully mounts a new build.
  window.addEventListener("load", () => {
    setTimeout(() => sessionStorage.removeItem(RELOAD_KEY), 1000);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
