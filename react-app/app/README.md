# React App

This is the primary Vite app for the Alexander Beck Studio website.

Run commands from the repo root unless you are working on the app package directly:

```bash
npm run install:all
npm run dev
npm run build
npm run preview
```

Direct app commands:

```bash
npm run dev --prefix react-app/app
npm run lint --prefix react-app/app
npm run build --prefix react-app/app
```

Use the root `npm run build` for production because it flattens `public/config/design-system.json` into the generated runtime config files before Vite builds.
