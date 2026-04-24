import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Vite auto-emits <link rel="modulepreload"> for entry imports.
    // Consolidate tiny shared chunks so the home-route waterfall is short
    // and fully preloaded instead of fanning out into 10+ small requests.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // Keep tiny utilities together (used everywhere, ~2-3 KB total).
          if (
            id.includes("class-variance-authority") ||
            id.includes("clsx") ||
            id.includes("tailwind-merge")
          ) {
            return "ui-utils";
          }
          // Split each Radix primitive into its own chunk so routes only
          // load the primitives they actually import (avoids ~21 KB of
          // unused JS on the home route).
          if (id.includes("@radix-ui")) {
            const match = id.match(/@radix-ui\/([^/]+)/);
            return match ? `radix-${match[1]}` : "radix";
          }
          // Icons are imported per-name; let Rollup split them per route.
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("sonner")) return "sonner";
          if (
            id.includes("react-dom") ||
            id.includes("scheduler") ||
            id.includes("/react/")
          ) {
            return "react-vendor";
          }
          if (id.includes("@tanstack")) return "tanstack";
          if (id.includes("react-router")) return "router";
        },
      },
    },
  },
}));
