import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { getCategories } from "../../api/categories";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { useFavorites } from "../../hooks/useFavorites";
import type { Category } from "../../types/api";

const CATEGORY_PLACEHOLDER =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=60";

export function StoreLayout() {
  const { isAuthenticated, logout, user } = useAuth();
  const { totalItems } = useCart();
  const { favorites } = useFavorites();
  const isAdmin = user?.role === "ADMIN";
  const navigate = useNavigate();
  const location = useLocation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);

  const categoriesRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error("No se pudieron cargar las categorias.", error);
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
        setCategoriesOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
    setMobileCategoriesOpen(false);
  }, [location.pathname]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const goToSection = (sectionId: string) => {
    setCategoriesOpen(false);
    setProfileOpen(false);
    if (location.pathname !== "/") {
      navigate("/", { state: { targetSection: sectionId } });
      return;
    }
    scrollToSection(sectionId);
  };

  useEffect(() => {
    const state = (location.state ?? {}) as { targetSection?: string };
    if (location.pathname === "/" && state?.targetSection) {
      const targetSection = state.targetSection;
      const timer = window.setTimeout(() => scrollToSection(targetSection), 90);
      navigate(".", { replace: true, state: undefined });
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [location.pathname, location.state, navigate]);

  const handleNavigateCategory = (categoryId: string) => {
    setCategoriesOpen(false);
    setMobileCategoriesOpen(false);
    navigate(`/categories/${categoryId}`);
  };

  const handleProfileClick = () => {
    if (isAuthenticated) {
      setProfileOpen((prev) => !prev);
    } else {
      navigate("/login", { state: { from: location } });
    }
  };

  const handleGoToPanel = () => {
    setProfileOpen(false);
    if (isAdmin) {
      navigate("/admin/products");
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleGoToOrders = () => {
    setProfileOpen(false);
    navigate("/orders");
  };

  const handleGoToFavorites = () => {
    setProfileOpen(false);
    navigate("/favorites");
  };

  const handleLogout = async () => {
    await logout();
    setProfileOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#061327] via-[#041024] to-[#050d1f] text-slate-100">
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/60 bg-[rgba(4,12,24,0.95)] px-4 py-2.5 shadow-[0_10px_30px_rgba(3,10,23,0.6)] sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary transition hover:bg-primary/25 lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
              </svg>
            </button>
            <Link to="/" className="text-[1.45rem] font-semibold text-slate-100 flex items-baseline gap-1 lg:text-[1.6rem]">
              <span className="text-slate-50">Smart</span>
              <span className="text-primary">Sales</span>
              <span className="text-primary-dark">365</span>
            </Link>
          </div>

          <nav className="hidden flex-wrap items-center gap-5 lg:flex">
            <div className="relative" ref={categoriesRef}>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                onClick={() => setCategoriesOpen((prev) => !prev)}
              >
                Categorías
                <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.188l3.71-3.956a.75.75 0 1 1 1.08 1.04l-4.24 4.52a.75.75 0 0 1-1.08 0l-4.24-4.52a.75.75 0 0 1 .02-1.06z"
                  />
                </svg>
              </button>
              {categoriesOpen ? (
                <div className="absolute left-0 mt-3 w-72 rounded-2xl border border-primary/45 bg-[rgba(5,18,36,0.98)] p-3 shadow-xl backdrop-blur">
                  {categories.length === 0 ? (
                    <div className="rounded-xl bg-[rgba(10,28,58,0.9)] px-3 py-4 text-center text-sm text-slate-300">
                      No hay categorías disponibles.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          className="flex items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-primary/20"
                          onClick={() => handleNavigateCategory(category.id)}
                        >
                          <img
                            src={category.image_url || CATEGORY_PLACEHOLDER}
                            alt={category.name}
                            className="h-12 w-12 rounded-lg border border-primary/30 object-cover"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-100">{category.name}</span>
                            {category.description ? (
                              <span className="text-xs text-slate-300">{category.description}</span>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
              onClick={() => goToSection("promociones")}
            >
              Promociones
            </button>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
              onClick={() => goToSection("catalogo")}
            >
              Productos
            </button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="hidden h-11 w-11 items-center justify-center rounded-xl bg-primary/25 text-primary transition hover:bg-primary/35 lg:flex"
              onClick={() => goToSection("catalogo")}
              aria-label="Ver catalogo"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M7 4h10l2 4v2h-2.2l-.56 4H18v2h-2.2l-.3 2.09A2 2 0 0 1 13.55 20h-3.1a2 2 0 0 1-1.96-1.91L8.2 16H6v-2h1.76l-.56-4H5V8l2-4Zm2.53 12l.3 2.09a.5.5 0 0 0 .49.41h3.1a.5.5 0 0 0 .49-.41L14.47 16Zm.31-2h4.32l.56-4H9.28Z"
                />
              </svg>
            </button>
            <button
              type="button"
              className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-primary/25 text-primary transition hover:bg-primary/35"
              onClick={() => navigate("/cart")}
              aria-label="Ver carrito"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2s-.9-2-2-2m0 2zm12 0c0-1.1-.9-2-2-2s-2 .9-2 2s.9 2 2 2s2-.9 2-2m2-16H5.21l-.2-1.01C4.93 2.42 4.52 2 4 2H2v2h1l3.6 7.59l-1.35 2.44C4.52 14.37 5.48 16 7 16h12v-2H7l1.1-2h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48c0-.55-.45-1-1-1Z"
                />
              </svg>
              {totalItems > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white shadow-lg">
                  {totalItems > 99 ? "99+" : totalItems}
              </span>
            ) : null}
          </button>
            <button
              type="button"
              className="relative hidden h-11 w-11 items-center justify-center rounded-xl bg-primary/25 text-primary transition hover:bg-primary/35 sm:flex"
              onClick={() => navigate("/favorites")}
              aria-label="Ver favoritos"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3A5.49 5.49 0 0 0 2 8.5c0 3.57 3.4 6.46 8.55 11.22L12 21.35l1.45-1.32C18.6 14.96 22 12.07 22 8.5A5.49 5.49 0 0 0 16.5 3Z"
                />
              </svg>
              {favorites.length > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white shadow-lg">
                  {favorites.length > 99 ? "99+" : favorites.length}
                </span>
              ) : null}
            </button>
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/25 text-primary transition hover:bg-primary/35"
                onClick={handleProfileClick}
                aria-label={isAuthenticated ? "Abrir menu de perfil" : "Iniciar sesion"}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5Zm0 2c-4 0-7 2-7 5v1h14v-1c0-3-3-5-7-5Z"
                  />
                </svg>
              </button>
              {profileOpen ? (
                <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-xl border border-primary/30 bg-[rgba(5,18,36,0.98)] shadow-xl">
                  {isAuthenticated ? (
                    <>
                    <button
                      type="button"
                      className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-primary/20"
                      onClick={handleGoToOrders}
                    >
                      Mis pedidos
                    </button>
                    <button
                      type="button"
                      className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-primary/20"
                      onClick={handleGoToFavorites}
                    >
                      Favoritos
                    </button>
                    {isAdmin ? (
                      <button
                        type="button"
                          className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-primary/20"
                          onClick={handleGoToPanel}
                        >
                          Ir al panel
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-primary/20"
                        onClick={handleLogout}
                      >
                        Cerrar sesión
                      </button>
                    </>
                  ) : (
                    <>
                    <button
                      type="button"
                      className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-primary/20"
                      onClick={() => navigate("/login")}
                    >
                      Iniciar sesión
                    </button>
                    <button
                      type="button"
                      className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-primary/20"
                      onClick={() => navigate("/favorites")}
                    >
                      Ver favoritos
                    </button>
                    <button
                      type="button"
                        className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-primary/20"
                        onClick={() => navigate("/register")}
                      >
                        Crear cuenta
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            className="h-full flex-1 bg-black/60"
            aria-label="Cerrar menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="flex h-full w-[82%] max-w-sm flex-col gap-6 bg-[rgba(5,18,36,0.98)] px-5 py-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Menu principal</p>
                <p className="text-lg font-semibold text-white">Navegación</p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Cerrar menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M18.3 5.71L12 12l6.3 6.29l-1.41 1.42L10.59 13.4l-6.3 6.3l-1.42-1.42l6.3-6.3l-6.3-6.28L4.3 4.3l6.3 6.3l6.29-6.3z"
                  />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                className="rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-primary/20"
                onClick={() => {
                  goToSection("catalogo");
                  setMobileNavOpen(false);
                }}
              >
                Productos
              </button>
              <button
                type="button"
                className="rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-primary/20"
                onClick={() => {
                  goToSection("promociones");
                  setMobileNavOpen(false);
                }}
              >
                Promociones
              </button>
              <div>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-primary/20"
                  onClick={() => setMobileCategoriesOpen((prev) => !prev)}
                >
                  Categorías
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    className={mobileCategoriesOpen ? "rotate-180 transition" : "transition"}
                  >
                    <path fill="currentColor" d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6l-6-6z" />
                  </svg>
                </button>
                {mobileCategoriesOpen ? (
                  <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-2 thin-scrollbar">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-primary/10"
                        onClick={() => handleNavigateCategory(category.id)}
                      >
                        <img
                          src={category.image_url || CATEGORY_PLACEHOLDER}
                          alt={category.name}
                          className="h-11 w-11 rounded-xl object-cover"
                        />
                        <div>
                          <p className="font-semibold text-white">{category.name}</p>
                          {category.description ? <p className="text-xs text-slate-400">{category.description}</p> : null}
                        </div>
                      </button>
                    ))}
                    {categories.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-center text-xs text-white/60">
                        No hay categorías cargadas.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-auto space-y-3">
              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white shadow-lg shadow-primary/30"
                    onClick={() => {
                      handleGoToOrders();
                      setMobileNavOpen(false);
                    }}
                  >
                    Mis pedidos
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    onClick={() => {
                      navigate("/favorites");
                      setMobileNavOpen(false);
                    }}
                  >
                    Favoritos
                  </button>
                  {isAdmin ? (
                    <button
                      type="button"
                      className="w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                      onClick={() => {
                        handleGoToPanel();
                        setMobileNavOpen(false);
                      }}
                    >
                      Ir al panel
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    onClick={handleLogout}
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white shadow-lg shadow-primary/30"
                    onClick={() => navigate("/login")}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    onClick={() => {
                      navigate("/favorites");
                      setMobileNavOpen(false);
                    }}
                  >
                    Favoritos
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    onClick={() => navigate("/register")}
                  >
                    Crear cuenta
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-800/60 bg-[rgba(4,12,24,0.95)] px-4 py-6 text-center text-sm text-slate-300 sm:px-6 lg:px-8">
        Copyright {new Date().getFullYear()} SmartSales365. Impulsando tu tienda con experiencias inteligentes.
      </footer>
    </div>
  );
}
