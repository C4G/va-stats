/* SITE HOME PAGE */

import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import styles from "../styles/Home.module.css";
import { getUserEmail } from "../utils/session-helpers";
import DefaultHome from "./default";

export default function Home() {
  const { data: session, status } = useSession();
  const [userRole, setUserRole] = useState(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  const getUserData = useCallback(async () => {
    const userEmail = getUserEmail(session);
    if (status !== "authenticated" || !userEmail) {
      setUserRole(null);
      setRoleLoaded(true);
      return;
    }

    try {
      const response = await fetch("/api/getuserdata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      if (!response.ok) return;

      const res = await response.json();
      setUserRole(res?.users?.[0]?.role ?? null);
    } catch {
      setUserRole(null);
    } finally {
      setRoleLoaded(true);
    }
  }, [status, session]);

  useEffect(() => {
    if (status === "loading") return;
    getUserData();
  }, [status, getUserData]);

  if (status === "loading" || !roleLoaded) {
    return <Navbar className={styles.topnav} />;
  }

  if (userRole) {
    return <DefaultHome userRole={userRole} />;
  } else {
    return (
      <>
        <Navbar user_role={userRole ?? undefined} className={styles.topnav} />

        <Head>
          <title>Vision-Aid-STATS</title>
        </Head>

        <main className={styles.main}>
          <div className={styles.grid}>
            <Link href="/studentregistration" className={styles.card}>
              <h2>Registration &rarr;</h2>
              <p>Go to the student registration page</p>
            </Link>

            <a
              href="https://visionaid.org/about-vision-aid/mission-and-vision"
              target="_blank"
              rel="noreferrer"
              className={styles.card}
            >
              <h2>About &rarr;</h2>
              <p>Learn about our organization</p>
            </a>
          </div>
        </main>
      </>
    );
  }
}
