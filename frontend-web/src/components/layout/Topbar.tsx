import { useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import styles from "./Topbar.module.css";

export function Topbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className={styles.topbar}>
      <div className={styles.breadcrumb}>Admin - SmartSales365</div>
      <div className={styles.actions}>
        <button type="button" className={styles.linkButton} onClick={() => navigate("/")}>
          Ver sitio web
        </button>
        <button type="button" className={styles.logoutButton} onClick={logout}>
          Salir
        </button>
      </div>
    </header>
  );
}

