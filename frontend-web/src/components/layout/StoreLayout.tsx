import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { getCategories } from "../../api/categories";
import { useAuth } from "../../hooks/useAuth";
import type { Category } from "../../types/api";
import styles from "./StoreLayout.module.css";

const CATEGORY_PLACEHOLDER =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=60";

export function StoreLayout() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

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
    navigate(`/categories/${categoryId}`);
  };

  const handleProfileClick = () => {
    if (isAuthenticated) {
      setProfileOpen((prev) => !prev);
    } else {
      navigate("/login", { state: { from: { pathname: "/admin/products" } } });
    }
  };

  const handleGoToPanel = () => {
    setProfileOpen(false);
    navigate("/admin/products");
  };

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandPrimary}>Smart</span>
          <span className={styles.brandAccent}>Sales</span>
          <span className={styles.brandSuffix}>365</span>
        </Link>

        <nav className={styles.nav}>
          <div className={styles.dropdown} ref={categoriesRef}>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => setCategoriesOpen((prev) => !prev)}
            >
              Categorias
              <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.188l3.71-3.956a.75.75 0 1 1 1.08 1.04l-4.24 4.52a.75.75 0 0 1-1.08 0l-4.24-4.52a.75.75 0 0 1 .02-1.06z"
                />
              </svg>
            </button>
            {categoriesOpen ? (
              <div className={styles.dropdownMenu}>
                {categories.length === 0 ? (
                  <div className={styles.dropdownEmpty}>No hay categorias disponibles.</div>
                ) : (
                  categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => handleNavigateCategory(category.id)}
                    >
                      <img
                        src={category.image_url || CATEGORY_PLACEHOLDER}
                        alt={category.name}
                        className={styles.dropdownThumb}
                      />
                      <div>
                        <span className={styles.dropdownTitle}>{category.name}</span>
                        {category.description ? (
                          <span className={styles.dropdownDescription}>{category.description}</span>
                        ) : null}
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <button type="button" className={styles.navButton} onClick={() => goToSection("promociones")}>
            Promociones
          </button>
          <button type="button" className={styles.navButton} onClick={() => goToSection("catalogo")}>
            Productos
          </button>
        </nav>

        <div className={styles.actions}>
          <button type="button" className={styles.iconButton} onClick={() => goToSection("catalogo")} aria-label="Ver catalogo">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M7 4h10l2 4v2h-2.2l-.56 4H18v2h-2.2l-.3 2.09A2 2 0 0 1 13.55 20h-3.1a2 2 0 0 1-1.96-1.91L8.2 16H6v-2h1.76l-.56-4H5V8l2-4Zm2.53 12l.3 2.09a.5.5 0 0 0 .49.41h3.1a.5.5 0 0 0 .49-.41L14.47 16Zm.31-2h4.32l.56-4H9.28Z"
              />
            </svg>
          </button>
          <div className={styles.profile} ref={profileRef}>
            <button
              type="button"
              className={styles.iconButton}
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
              <div className={styles.profileMenu}>
                {isAuthenticated ? (
                  <>
                    <button type="button" onClick={handleGoToPanel}>
                      Ir al panel
                    </button>
                    <button type="button" onClick={handleLogout}>
                      Cerrar sesion
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => navigate("/login")}>
                    Iniciar sesion
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        Copyright {new Date().getFullYear()} SmartSales365. Impulsando tu tienda con experiencias inteligentes.
      </footer>
    </div>
  );
}
