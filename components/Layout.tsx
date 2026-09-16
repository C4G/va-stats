import Head from "next/head";
import Navbar from "./Navbar";

export default function Layout({
  children,
  title = "Vision-Aid-STATS",
  description = "A nonprofit, advocating on behalf of persons with vision issues of any type",
  userRole,
  // allowedRoles = [],
  // userActive = null
}) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>

      <header className="page-header">
        <div className="navbar-container">
          <a href="#maincontent" className="skip" onClick={() => document.getElementById("maincontent")?.focus()}>
            Skip to main content
          </a>
          <Navbar user_role={userRole} />
        </div>
      </header>

      <main id="maincontent" className="page-main">
        {children}
      </main>
    </>
  );
}
