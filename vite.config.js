import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  server: {
    // Handle clean URLs in development
    fs: {
      strict: false,
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        services: resolve(__dirname, 'services.html'),
        contact: resolve(__dirname, 'contact.html'),
        team: resolve(__dirname, 'team.html'),
        'track-shipment': resolve(__dirname, 'track-shipment.html'),
        'privacy-policy': resolve(__dirname, 'privacy-policy.html'),
        'terms-of-service': resolve(__dirname, 'terms-of-service.html'),
        'cookie-policy': resolve(__dirname, 'cookie-policy.html'),
        'admin-login': resolve(__dirname, 'admin/login.html'),
        'admin-shipments': resolve(__dirname, 'admin/shipments.html'),
        'admin-create': resolve(__dirname, 'admin/create.html'),
        'admin-shipment-details': resolve(__dirname, 'admin/shipment-details.html'),
      },
    },
  },
  publicDir: 'public',
  // Plugin to handle clean URLs in dev server
  plugins: [
    {
      name: 'clean-urls',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Map clean URLs to HTML files
          const urlMap = {
            '/': '/index.html',
            '/services': '/services.html',
            '/about': '/about.html',
            '/contact': '/contact.html',
            '/team': '/team.html',
            '/track-shipment': '/track-shipment.html',
            '/privacy-policy': '/privacy-policy.html',
            '/terms-of-service': '/terms-of-service.html',
            '/cookie-policy': '/cookie-policy.html',
            '/get-quote': '/get-quote.html',
            '/admin-login': '/admin/login.html',
            '/admin': '/admin/shipments.html',
            '/admin/shipments': '/admin/shipments.html',
            '/admin/create': '/admin/create.html',
          };
          
          if (urlMap[req.url] && !req.url.includes('.')) {
            req.url = urlMap[req.url];
          }
          next();
        });
      },
    },
  ],
});

