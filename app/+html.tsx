// Plantilla HTML de la versión web (solo se usa al generar la web, no en
// iOS/Android). Aquí van las etiquetas que convierten la web en una PWA que
// se puede "Añadir a la pantalla de inicio" como una app más.
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const COLOR_FONDO = '#FCF6C8';

// Registra el service worker solo en la build de producción; en desarrollo
// (expo start --web) cachear archivos solo daría problemas con la recarga.
const registrarServiceWorker = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="description" content="Organiza tus viajes en grupo: itinerario, gastos, listas y recuerdos." />
        <meta name="theme-color" content={COLOR_FONDO} />
        <title>TripEAs</title>

        {/* PWA: manifest e iconos */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

        {/* iPhone: abrir a pantalla completa, sin la barra de Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TripEAs" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `body { background-color: ${COLOR_FONDO}; }` }} />

        {process.env.NODE_ENV === 'production' && (
          <script dangerouslySetInnerHTML={{ __html: registrarServiceWorker }} />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
