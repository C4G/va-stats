/*
To avoid inability to logout (CSRF logout errors involving a Promise object), include:
'use client', and 'code that switches buttons' section in the region below.
*/

"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useCallback, useState } from "react";
import styles from "../styles/Navbar.module.css";
import { getUserEmail } from "../utils/session-helpers";
import Button from "./Button";
import NavItem from "./NavItem";
import { CONFIGURATIONS_PAGE_ROLES } from "../utils/configurations-access";

const MENU_LIST = [
  {
    text: "Registration",
    href: "/studentregistration",
    sessionRequired: true,
    description: "Student Registration",
  },
  {
    text: "Bulk Registration",
    href: "/bulkstudentregistration",
    sessionRequired: true,
    description: "Bulk Student Registration",
    allowedRoles: ["ADMINISTRATOR", "MANAGEMENT", "STAFF"],
  },
  {
    text: "Students",
    href: "/students",
    allowedRoles: ["ADMINISTRATOR", "MANAGEMENT", "TELECALLER", "TRAINERPLUSTELECALLER"],
    sessionRequired: true,
    description: "Students",
  },
  {
    text: "Batches",
    href: "/batches",
    allowedRoles: ["ADMINISTRATOR", "MANAGEMENT", "STAFF", "TRAINER", "TRAINERPLUSTELECALLER"],
    sessionRequired: true,
    description: "Batches",
  },
  {
    text: "Reports",
    href: "/reports",
    allowedRoles: ["ADMINISTRATOR", "MANAGEMENT"],
    sessionRequired: true,
    description: "Reports",
  },
  {
    text: "Courses",
    href: "/courses",
    allowedRoles: ["ADMINISTRATOR", "MANAGEMENT"],
    sessionRequired: true,
    description: "Courses",
  },
  {
    text: "Staff",
    href: "/users",
    allowedRoles: ["ADMINISTRATOR", "MANAGEMENT"],
    sessionRequired: true,
    description: "Staff",
  },
  {
    text: "Configurations",
    href: "/configurations",
    allowedRoles: CONFIGURATIONS_PAGE_ROLES,
    sessionRequired: true,
    description: "App and dashboard settings, dropdown options",
  },
];

const Navbar = ({ user_role, className }) => {
  const [navActive, setNavActive] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const { data: session } = useSession();

  const router = useRouter();
  const isMenuActive = useCallback((href) => router.pathname === href, [router.pathname]);

  // ---- Role helpers (keep from staging)
  const normalizeRole = (role) => (role ? role.toUpperCase() : null);
  const normRole = normalizeRole(user_role ?? session?.user?.role);

  const canSee = (menu) => {
    if (menu.sessionRequired && !session) return false;
    if (menu.allowedRoles) {
      const allowedNorms = menu.allowedRoles.map((r) => normalizeRole(r));
      if (!normRole || !allowedNorms.includes(normRole)) return false;
    }
    return true;
  };

  const getRoleDisplayName = (role) => {
    if (!role) return "User";
    const roleMap = {
      ADMINISTRATOR: "Administrator",
      MANAGEMENT: "Management",
      STAFF: "Staff",
      TELECALLER: "Telecaller",
      TRAINER: "Trainer",
      TRAINERPLUSTELECALLER: "Trainer plus Telecaller",
    };
    return roleMap[role] ?? role;
  };

  const onMenuKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setNavActive((v) => !v);
    }
  };

  return (
    <header style={{ backgroundColor: "white" }}>
      <Head>
        <title>VisionAid</title>
        <meta
          name="description"
          content="A nonprofit, advocating on behalf of persons with vision issues of any type"
        />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      </Head>

      <nav className={["nav", className].filter(Boolean).join(" ")}>
        <Link href="/" className={"textlogo"} tabIndex={1}>
          VISION-AID ACADEMY
        </Link>

        {/* Mobile hamburger */}
        <button
          onClick={() => setNavActive(!navActive)}
          className="m-0 flex cursor-pointer flex-col gap-1.5 border-none bg-transparent p-0 pr-4 focus:outline-none md:hidden"
          tabIndex={0}
          aria-label="navigation dropdown menu"
          aria-expanded={navActive}
          id="hamburger-menu"
          onKeyDown={onMenuKeyDown}
        >
          <div className="h-1 w-10 rounded-sm bg-black"></div>
          <div className="h-1 w-10 rounded-sm bg-black"></div>
          <div className="h-1 w-10 rounded-sm bg-black"></div>
        </button>

        <div className={`${navActive ? "active" : "hide"} nav__menu-list`}>
          {MENU_LIST.map((menu, idx) => {
            if (!canSee(menu)) return null;
            return (
              <div key={menu.text}>
                {menu.submenu ? (
                  <DropdownMenu
                    menu={menu}
                    active={activeIdx === idx}
                    setActive={() => {
                      setActiveIdx(idx);
                      setNavActive(false);
                    }}
                    setActiveIdx={setActiveIdx}
                  />
                ) : (
                  <div
                    onClick={() => {
                      setActiveIdx(idx);
                      setNavActive(false);
                    }}
                  >
                    <NavItem active={isMenuActive(menu.href)} {...menu} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Button switching based on session (helps avoid CSRF logout issues) */}
          {!session ? (
            <Button
              text={"Sign in with Google"}
              iconSrc={"/icons/google-logo.svg"}
              onClick={() => signIn("google", { callbackUrl: "/default" })}
              isLight={true}
            />
          ) : (
            <>
              <p className={styles.topRightText}>
                Signed in as {getRoleDisplayName(normRole)} : {getUserEmail(session) || "Unknown"}
              </p>
              <Button
                text={"Logout"}
                onClick={async () => {
                  try {
                    await signOut({ callbackUrl: "/", redirect: true });
                  } catch (error) {
                    console.error("Logout error:", error);
                    window.location.href = "/";
                  }
                }}
                isLight={true}
                className={styles.btnlogout}
              />
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

const DropdownMenu = ({ menu, active, setActive, setActiveIdx }) => (
  <div className={styles.dropdownMenu} onMouseEnter={() => setActive()} onMouseLeave={() => setActiveIdx(-1)}>
    <div className={`${styles.dropdownMenuItem} ${active ? styles.active : ""}`}>
      <NavItem {...menu} />
    </div>
    {menu.submenu && active && (
      <div className={styles.dropdownMenuSubmenu}>
        {menu.submenu.map((dropdownItem) => (
          <div
            className={`${styles.dropdownMenuItem} ${active ? styles.active : ""}`}
            key={dropdownItem.text}
            onClick={() => {
              setActiveIdx(-1);
            }}
          >
            <NavItem {...dropdownItem} />
          </div>
        ))}
      </div>
    )}
  </div>
);

export default Navbar;
