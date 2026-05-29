@import "tailwindcss";

/* Fontes carregadas via index.html com preload */

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Outfit", var(--font-sans);
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  --font-tech: "Space Grotesk", var(--font-sans);

  --radius-3xl: 24px;
  --radius-4xl: 32px;
  --radius-5xl: 40px;
  
  --shadow-premium: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --shadow-glass: 0 8px 32px 0 rgba(0, 0, 0, 0.05);
  --shadow-soft: 0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

@layer base {
  html {
    scroll-behavior: smooth;
    -webkit-text-size-adjust: 100%;
    touch-action: manipulation;
  }
  body {
    @apply antialiased;
    margin: 0;
    min-height: 100dvh;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeSpeed; /* mais rápido que optimizeLegibility */
    background-color: #FAFAFA;
  }
  :root.dark body {
    background-color: #050505;
    color: white;
  }
  * {
    box-sizing: border-box;
  }
  h1, h2, h3, h4, .font-display {
    @apply font-display tracking-tight;
  }
  html, body, #root {
    width: 100%;
    min-height: 100%;
    overflow-x: hidden;
    overscroll-behavior-x: none;
  }
  button, a, [role="button"] {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  input, textarea, select {
    font-size: 16px;
  }
  @supports (padding: max(0px)) {
    body {
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
    }
  }
}

@layer utilities {
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .glass-header { @apply backdrop-blur-xl border-b; }
  .text-gradient { @apply bg-clip-text text-transparent; }
  .tech-label { @apply font-tech text-[10px] font-bold uppercase tracking-[0.15em] opacity-50; }
  .inner-shadow { box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06); }

  /* Skeleton shimmer */
  .skeleton {
    background: linear-gradient(90deg, 
      rgba(255,255,255,0.04) 25%, 
      rgba(255,255,255,0.09) 50%, 
      rgba(255,255,255,0.04) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 12px;
  }
  .skeleton-light {
    background: linear-gradient(90deg,
      rgba(0,0,0,0.06) 25%,
      rgba(0,0,0,0.1) 50%,
      rgba(0,0,0,0.06) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 12px;
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Fade in suave ao montar componentes */
  .fade-in {
    animation: fadeIn 0.3s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Press feedback em botões */
  .press-scale {
    transition: transform 0.1s ease;
  }
  .press-scale:active {
    transform: scale(0.96);
  }

  /* Performance: promove nav e header para camadas compostas */
  nav.fixed {
    will-change: transform;
    transform: translateZ(0);
  }

  /* Isolamento de repaint no grid do calendário */
  .calendar-grid {
    contain: layout style;
  }

  /* Botões do calendário: só GPU transform, sem layout */
  .calendar-day-btn {
    will-change: auto;
    transform: translateZ(0);
  }
  .calendar-day-btn:active {
    transform: scale(0.93) translateZ(0);
    transition: transform 0.08s ease;
  }
}

body {
  @apply font-sans antialiased selection:bg-blue-500/20 selection:text-blue-500;
}

/* Ajustes extras de performance para iPhone/celulares */
@media (max-width: 640px) {
  .fade-in {
    animation: none !important;
  }

  .shadow-premium,
  .shadow-2xl,
  .shadow-lg {
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12) !important;
  }

  .calendar-grid {
    contain: layout paint style;
  }

  .calendar-day-btn,
  nav.fixed,
  header.sticky {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}

/* Hotfix de performance em celulares: preserva o visual, mas corta os efeitos que mais travam no iPhone */
@media (max-width: 640px) {
  [class*="backdrop-blur"] {
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }

  [class*="shadow-["],
  .shadow-2xl,
  .shadow-xl,
  .shadow-lg,
  .shadow-premium,
  .shadow-soft {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.10) !important;
  }

  .calendar-day-btn,
  .calendar-day-btn *,
  nav.fixed,
  header.sticky {
    will-change: auto !important;
  }

  .calendar-grid {
    contain: layout paint style;
  }

  * {
    scroll-behavior: auto !important;
  }
}
