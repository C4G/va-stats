import { useSession } from "next-auth/react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect } from "react";
import styles from "@/styles/Home.module.css";

const REDIRECT = "/configurations#dashboard";

/**
 * Legacy URL: redirects to the unified Configurations page (Dashboard section).
 */
export default function DashboardConfigurationsPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated" || status === "loading") return;
    void router.replace(REDIRECT);
  }, [status, router]);

  if (status === "unauthenticated") {
    return (
      <div className="autherrorcontainer">
        <Head>
          <title>Dashboard settings - Vision-Aid-STATS</title>
        </Head>
        <p className="autherrortext">Access denied. Please sign in.</p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className={styles.overlay} role="status" aria-live="polite" aria-busy="true">
        <span className={styles.customLoader}></span>
      </div>
    );
  }

  return (
    <div className={styles.overlay} role="status" aria-live="polite" aria-busy="true">
      <span className={styles.customLoader}></span>
    </div>
  );
}
