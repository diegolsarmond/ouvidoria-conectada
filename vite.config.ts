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
    proxy: {
      '/auth': {
        target: 'https://apiouvidoria.quantumtecnologia.com.br',
        changeOrigin: true,
        secure: false,
      },
      '/rest': {
        target: 'https://apiouvidoria.quantumtecnologia.com.br',
        changeOrigin: true,
        secure: false,
      },
      '/storage': {
        target: 'https://apiouvidoria.quantumtecnologia.com.br',
        changeOrigin: true,
        secure: false,
      },
      '/realtime': {
        target: 'https://apiouvidoria.quantumtecnologia.com.br',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/functions': {
        target: 'https://apiouvidoria.quantumtecnologia.com.br',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
