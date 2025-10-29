import { NavLink } from "react-router-dom";

import styles from "./Sidebar.module.css";

const links = [
  { to: "/admin/products", label: "Productos" },
  { to: "/admin/categories", label: "Categorias" },
  { to: "/admin/users", label: "Usuarios" },
];

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>SmartSales365</div>
      <nav>
        <ul className={styles.navList}>
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.active}` : styles.navLink)}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.footer}>© {new Date().getFullYear()}</div>
    </aside>
  );
}


