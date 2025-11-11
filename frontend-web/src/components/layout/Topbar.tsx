import { useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";

type TopbarProps = {
  onToggleSidebar?: () => void;
};

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex min-h-16 items-center justify-between border-b border-white/10 bg-[#071933]/90 px-4 shadow-[0_8px_28px_rgba(3,10,23,0.4)] backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3 text-white">
        {onToggleSidebar ? (
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 text-white transition hover:border-white/35 lg:hidden"
            onClick={onToggleSidebar}
            aria-label="Abrir menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
            </svg>
          </button>
        ) : null}
        <div className="h-10 w-10 rounded-2xl border border-white/15 bg-white/5 text-center text-lg font-semibold leading-[2.4rem] text-primary">
          SS
        </div>
        <div>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-white/40 sm:text-xs">Administrador</p>
          <h1 className="text-base font-semibold text-white sm:text-lg">SmartSales365</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:border-white/40 hover:text-white hidden sm:inline-flex"
          onClick={() => navigate("/")}
        >
          Ver sitio web
        </button>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 text-white transition hover:border-white/35 sm:hidden"
          onClick={() => navigate("/")}
          aria-label="Ver sitio web"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm6.92 9h-3.05a14.341 14.341 0 0 0-1.28-5.09A8.012 8.012 0 0 1 18.92 11Zm-4.3 0h-5.24a12.538 12.538 0 0 1 1.12-4.36C10.83 5 11.47 4 12 4s1.17 1 1.5 2.64A12.538 12.538 0 0 1 14.62 11Zm-6.59 0H4.08a8.012 8.012 0 0 1 4.33-5.09A14.341 14.341 0 0 0 8.03 11Zm0 2a14.341 14.341 0 0 0 .62 5.09A8.012 8.012 0 0 1 4.08 13Zm1.31 0h5.24a12.538 12.538 0 0 1-1.12 4.36C13.17 19 12.53 20 12 20s-1.17-1-1.5-2.64A12.538 12.538 0 0 1 9.34 13Zm6.53 5.09a14.341 14.341 0 0 0 .62-5.09h3.05a8.012 8.012 0 0 1-4.33 5.09Z"
            />
          </svg>
        </button>
        <button
          type="button"
          className="hidden rounded-full bg-red-600 px-5 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-white shadow-lg shadow-red-600/40 transition hover:bg-red-500 active:scale-[0.98] sm:inline-flex"
          onClick={() => {
            void logout();
          }}
        >
          Salir
        </button>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/40 text-red-200 transition hover:bg-red-500/20 sm:hidden"
          onClick={() => {
            void logout();
          }}
          aria-label="Cerrar sesión"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M13 3a1 1 0 0 1 1 1v3h-2V5H6v14h6v-2h2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm4.586 7.586L16 9l-1.414 1.414L16.172 12l-1.586 1.586L16 15l1.586-1.586L19.172 15L20.586 13.586L19 12l1.586-1.586L19.172 9Z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
