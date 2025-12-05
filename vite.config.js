// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "fwi883-ip-223-237-184-230.tunnelmole.net",  // paste your tunnelmole domain here
      "puf9ik-ip-27-62-2-96.tunnelmole.net"
    ],
    cors: {
      origin: true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-client-info', 'apikey']
    },
    proxy: {
      // Proxy Supabase Edge Functions to avoid CORS issues in development
      '/functions': {
        target: process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/functions/, '/functions/v1')
      }
    }
  }
});
