

// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import basicSsl from '@vitejs/plugin-basic-ssl'
// import path from 'path';
// import https from 'https';

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react(), basicSsl()],
//   resolve: {
//     alias: {
//       '@images': path.resolve(__dirname, 'src/assets/images'),
//     }
//   },
//   server: {
//     https: true,
//     host: '0.0.0.0', 
//     port: 5177,
//     proxy: { 

//       '/socket.io': {
//         target: 'https://192.168.1.112:4001',
//         changeOrigin: true,
//         secure: false,
//         ws: true,
//       },

//       '^/(api|upload|download|search|trash/|files|uploadimage)': {
//         target: 'https://192.168.1.112:4001',
//         changeOrigin: true,
//         secure: false,      
//         timeout: 0,          
//         proxyTimeout: 0,    
//         agent: new https.Agent({ 
//           keepAlive: true, 
//           maxSockets: 20    
//         })
//       }
//     },
//     watch: {
//       usePolling: true, 
//       interval: 100,    
//       ignored: ['**/node_modules/**', '**/dist/**'],
//     },
//   },
// });





import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import https from 'https';
import fs from 'fs';

export default defineConfig({
  plugins: [react()],  // removed basicSsl
  resolve: {
    alias: {
      '@images': path.resolve(__dirname, 'src/assets/images'),
    }
  },
  server: {
    https: {
      key: fs.readFileSync('./192.168.1.112+2-key.pem'),
      cert: fs.readFileSync('./192.168.1.112+2.pem'),
    },
    host: '0.0.0.0',
    port: 5177,
    proxy: {
      '/socket.io': {
        target: 'https://192.168.1.112:4001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '^/(api|files|uploadimage)': {
        target: 'https://192.168.1.112:4001',
        changeOrigin: true,
        secure: false,
        timeout: 0,
        proxyTimeout: 0,
        agent: new https.Agent({
          keepAlive: true,
          maxSockets: 20
        })
      }
    },
    watch: {
      usePolling: true,
      interval: 100,
      ignored: ['**/node_modules/**', '**/dist/**'],
    },
  },
});