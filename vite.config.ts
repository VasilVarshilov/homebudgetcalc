import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "/homebudgetcalc/",
  resolve: {
    alias: {
      "@components": path.resolve(__dirname, "components"),
    },
  },
});
