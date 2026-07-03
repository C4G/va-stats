// Mobile menu
// import Navbar from '../components/Navbar';

import { SessionProvider } from "next-auth/react";
import Head from "next/head";
import "../styles/globals.css";

// Below required for NextUI components
import * as React from "react";

// AG Grid v32 them problem resolution setup
if (typeof window !== "undefined") {
  // AG Grid v32 theme related error avoidance
  window.agGrid = window.agGrid || {};
  window.agGrid.licenseManager = window.agGrid.licenseManager || {};
}

const App = ({ Component, pageProps: { session, ...pageProps } }) => (
  <SessionProvider
    session={session}
    refetchInterval={0} // Disable automatic refetch
    refetchOnWindowFocus={false} // Disable refetch on window focus
  >
    <Head>
      <meta name="theme-color" content="#ffffff" />
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/manifest.json" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
    </Head>
    <Component {...pageProps} />
  </SessionProvider>
);

export default App;
