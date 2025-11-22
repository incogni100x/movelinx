# Movelinx Security and Delivery

A modern logistics and transportation website built with Vite and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

### Development

Start the development server:
```bash
npm run dev
```

The site will be available at `http://localhost:5173`

### Building for Production

Build the project for production:
```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

Preview the production build locally:
```bash
npm run preview
```

## Project Structure

```
movelinx/
├── public/          # Static assets (images, SVGs)
├── src/
│   └── main.css     # Main stylesheet with Tailwind directives
├── *.html           # HTML pages (multi-page app)
├── vite.config.js   # Vite configuration
├── tailwind.config.js # Tailwind CSS configuration
├── postcss.config.js # PostCSS configuration
└── package.json     # Project dependencies
```

## Pages

The site uses clean URLs (without `.html` extensions):

- `/` - Homepage
- `/about` - About Us
- `/services` - Services
- `/contact` - Contact
- `/team` - Our Team
- `/track-shipment` - Track Shipment
- `/privacy-policy` - Privacy Policy
- `/terms-of-service` - Terms of Service
- `/cookie-policy` - Cookie Policy

**Note:** For production deployment, you'll need a web server configured to rewrite clean URLs to the corresponding HTML files (e.g., `/services` → `services.html`). The Vite dev server handles this automatically during development.

## Technologies

- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS processing
- **Autoprefixer** - Automatic vendor prefixes

