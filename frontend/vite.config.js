import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom/')) {
              return 'vendor';
            }
            if (id.includes('@heroui') || id.includes('lucide-react')) {
              return 'heroui';
            }
            if (id.includes('@clerk')) {
              return 'clerk';
            }
            if (id.includes('socket.io-client')) {
              return 'socket';
            }
          }
        },
      },
    },
  },
})
