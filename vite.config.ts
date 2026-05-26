import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === "production";
  const base = isProd ? "/ouvidoria/" : "/";

  return {
    base,
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        '/ouvidoria/api': {
          target: 'http://192.168.30.9:3002',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ouvidoria/, ''),
        },
        '/api': {
          target: 'http://192.168.30.9:3002',
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: "::",
      port: 8080,
      proxy: {
        '/ouvidoria/api': {
          target: 'http://192.168.30.9:3002',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ouvidoria/, ''),
        },
        '/api': {
          target: 'http://192.168.30.9:3002',
          changeOrigin: true,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
