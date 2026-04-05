import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In local dev, "vercel dev" runs on :3000 and handles /api/*.
    // If you run bare "vite dev" the analyze button will fail; use "vercel dev" instead.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
