// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "fwi883-ip-223-237-184-230.tunnelmole.net",  // paste your tunnelmole domain here
      "puf9ik-ip-27-62-2-96.tunnelmole.net"
    ]
  }
});
