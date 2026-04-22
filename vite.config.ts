import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  /** Capacitor Android WebView: relative asset paths */
  base: "./",
  plugins: [react(), tailwindcss()],
  /** 포트가 바뀌면 origin이 달라져 localStorage가 비는 것처럼 보일 수 있음 */
  server: {
    port: 5173,
    strictPort: true,
  },
});
