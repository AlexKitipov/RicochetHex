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
          if (
            id.includes("@radix-ui") ||
            id.includes("lucide-react") ||
            id.includes("sonner") ||
            id.includes("class-variance-authority") ||
            id.includes("clsx") ||
            id.includes("tailwind-merge")
          ) {
            return "ui-core";
          }
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
