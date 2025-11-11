import clsx from "clsx";
import { NavLink } from "react-router-dom";

import styles from "./Sidebar.module.css";

const links = [
  { to: "/admin/reports", label: "Reportes" },
  { to: "/admin/products", label: "Productos" },
  { to: "/admin/promotions", label: "Promociones" },
  { to: "/admin/orders", label: "Pedidos" },
  { to: "/admin/categories", label: "Categorias" },
  { to: "/admin/bitacora", label: "Bitacora" },
  { to: "/admin/users", label: "Usuarios" },
];

type SidebarProps = {
  isDesktop: boolean;
  isVisible: boolean;
  onClose: () => void;
};

export function Sidebar({ isDesktop, isVisible, onClose }: SidebarProps) {
  const year = new Date().getFullYear();
  return (
    <aside
      className={clsx(
        styles.sidebar,
        !isDesktop && styles.sidebarMobile,
        !isDesktop && (isVisible ? styles.sidebarOpen : styles.sidebarHidden),
      )}
    >
      <div className={styles.brandRow}>
        <div className={styles.brand}>SmartSales365</div>
        {!isDesktop ? (
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar menu">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M18.3 5.71L12 12l6.3 6.29l-1.41 1.42L10.59 13.4l-6.3 6.3l-1.42-1.42l6.3-6.3l-6.3-6.28L4.3 4.3l6.3 6.3l6.29-6.3z"
              />
            </svg>
          </button>
        ) : null}
      </div>
      <nav>
        <ul className={styles.navList}>
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.active}` : styles.navLink)}
                onClick={!isDesktop ? onClose : undefined}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.footer}>(c) {year}</div>
    </aside>
  );
}
