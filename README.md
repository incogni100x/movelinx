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

- `index.html` - Homepage
- `about.html` - About Us
- `services.html` - Services
- `contact.html` - Contact
- `team.html` - Our Team
- `track-shipment.html` - Track Shipment
- `privacy-policy.html` - Privacy Policy
- `terms-of-service.html` - Terms of Service
- `cookie-policy.html` - Cookie Policy

## Technologies

- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS processing
- **Autoprefixer** - Automatic vendor prefixes

