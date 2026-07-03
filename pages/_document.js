/* This file is used to modify the DOM structure
of the app. */

import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* <title>VA-STATS App</title> */}
        <meta name="description" content="This page contains staff information and a form to add such information" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" />

        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />

        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;700&display=swap"
        />

        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;700&display=swap"
          media="print"
          onLoad="this.media='all'"
        />

        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
        ></link>
        <script async src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.15.0/moment.min.js"></script>

        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;700&display=swap"
          />
        </noscript>
      </Head>
      <body>
        <Main />
        <NextScript />

        {/* MODAL WRAPPER BELOW: INSERTS A DOM NODE */}
        <div id="modal-root"></div>
        <script
          defer
          src="https://analytics.c4g.dev/script.js"
          data-website-id="980eb290-5f5d-46ce-b307-c30ceca4bf7b"
        ></script>
      </body>
    </Html>
  );
}
