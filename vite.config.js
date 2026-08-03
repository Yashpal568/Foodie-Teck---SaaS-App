import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor'
            }
            if (id.includes('lucide-react')) {
              return 'icons-vendor'
            }
            if (id.includes('framer-motion')) {
              return 'framer-vendor'
            }
            if (id.includes('recharts')) {
              return 'charts-vendor'
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor'
            }
          }
        }
      }
    }
  }
})
