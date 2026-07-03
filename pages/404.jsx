import Head from "next/head";
import Link from "next/link";
import Navbar from "../components/Navbar";
import homeStyles from "../styles/Home.module.css";
import styles from "../styles/NotFound.module.css";

export default function Custom404() {
  return (
    <>
      <Head>
        <title>Page not found | Vision-Aid-STATS</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Navbar className={homeStyles.topnav} />
      <main className={`${homeStyles.main} ${styles.main}`} id="maincontent">
        <div className={styles.inner}>
          <p className={styles.code} aria-label="Error 404">
            404
          </p>
          <h1 className={styles.heading}>Page not found</h1>
          <p className={styles.message}>The page you are looking for does not exist, or the link may be incorrect.</p>
          <Link href="/" className={styles.link}>
            Back to home
          </Link>
        </div>
      </main>
    </>
  );
}
