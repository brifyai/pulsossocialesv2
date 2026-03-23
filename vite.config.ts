import { defineConfig } from 'vite';
import { resolve } from 'path';
import type { Connect } from 'vite';
import * as fs from 'fs';
import * as path from 'path';

export default defineConfig({
  // Servir archivos estáticos desde la carpeta public/
  publicDir: 'public',
  
  server: {
    // Configurar middleware para servir archivos de datos
    fs: {
      // Permitir acceso a archivos fuera de la raíz del proyecto
      allow: ['..'],
    },
  },
  
  // Plugin para configurar middleware personalizado
  plugins: [
    {
      name: 'serve-data-files',
      configureServer(server) {
        server.middlewares.use((req: Connect.IncomingMessage, res: any, next: Connect.NextFunction) => {
          // Servir archivos desde /data/ desde la carpeta data/ del proyecto
          if (req.url?.startsWith('/data/')) {
            const filePath = path.resolve(__dirname, req.url.slice(1)); // Remove leading /
            
            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath);
              const ext = path.extname(filePath);
              
              // Set content type based on extension
              const contentTypes: Record<string, string> = {
                '.json': 'application/json',
                '.csv': 'text/csv',
                '.txt': 'text/plain',
              };
              
              res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
              res.end(content);
              return;
            }
          }
          
          next();
        });
      },
    },
  ],
  
  // Configurar alias para imports
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  
  // Optimizar dependencias
  optimizeDeps: {
    include: ['@supabase/supabase-js', 'maplibre-gl'],
  },
});
