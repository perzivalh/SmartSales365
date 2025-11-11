import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import styles from "./AdminLayout.module.css";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const DESKTOP_QUERY = "(min-width: 1024px)";

export function AdminLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia(DESKTOP_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mediaQuery = window.matchMedia(DESKTOP_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      if (event.matches) {
        setMobileSidebarOpen(false);
      }
    };
    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const sidebarVisible = isDesktop || mobileSidebarOpen;
  const showBackdrop = !isDesktop && mobileSidebarOpen;

  return (
    <div className={styles.wrapper}>
      <Sidebar isDesktop={isDesktop} isVisible={sidebarVisible} onClose={() => setMobileSidebarOpen(false)} />
      {showBackdrop ? <div className={styles.sidebarBackdrop} onClick={() => setMobileSidebarOpen(false)} /> : null}
      <div className={styles.content}>
        <Topbar onToggleSidebar={!isDesktop ? () => setMobileSidebarOpen((prev) => !prev) : undefined} />
        <main className={styles.main}>
          <div className={styles.mainInner}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
