
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Déclaration pour éviter l'erreur TS2580 dans l'environnement de build
declare var process: {
  env: {
    API_KEY?: string;
    [key: string]: string | undefined;
  };
};

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});
