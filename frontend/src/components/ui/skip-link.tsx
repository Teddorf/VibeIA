'use client';

/**
 * Skip to main content link para accesibilidad
 * Permite a usuarios de teclado saltar la navegación
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="
        sr-only focus:not-sr-only
        fixed top-4 left-4 z-[9999]
        px-4 py-2 bg-purple-600 text-white font-medium rounded-lg
        focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-900
        transition-transform
      "
    >
      Saltar al contenido principal
    </a>
  );
}

export default SkipLink;
