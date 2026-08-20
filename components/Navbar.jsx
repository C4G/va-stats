"use client";

import { authClient, useSession } from "@/lib/auth-client-compat";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

          {/* Keep sign-in in the collapsible navigation when there is no session. */}
          {!session && <Button text={"Sign in"} onClick={() => router.push("/auth/sign-in")} isLight={true} />}
        </div>

        {session && (
          <AccountMenu
            session={session}
            role={getRoleDisplayName(normRole)}
            email={getUserEmail(session) || "Unknown"}
            onSignOut={async () => {
              try {
                await authClient.signOut();
                await router.replace("/auth/sign-in");
              } catch (error) {
                console.error("Logout error:", error);
                window.location.replace("/auth/sign-in");
              }
            }}
          />
        )}

        {/* Mobile hamburger stays at the far right of the header. */}
        <button
          onClick={() => setNavActive(!navActive)}
          className="m-0 flex cursor-pointer flex-col gap-1.5 border-none bg-transparent p-0 pr-4 focus:outline-none min-[1165px]:hidden"
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
      </nav>
    </header>
  );
};

const AccountMenu = ({ session, role, email, onSignOut }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const itemRefs = useRef([]);
  const [imageFailed, setImageFailed] = useState(false);
  const [mobileMenuPosition, setMobileMenuPosition] = useState(null);
  const name = session?.user?.name || email;
  const image = session?.user?.image;
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "U";

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  useEffect(() => {
    if (!open) return undefined;
    const updateMobileMenuPosition = () => {
      if (window.innerWidth >= 1165) {
        setMobileMenuPosition(null);
        return;
      }
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;
      setMobileMenuPosition({
        top: buttonRect.bottom + 8,
        right: Math.max(8, window.innerWidth - buttonRect.right),
      });
    };
    const handleOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    updateMobileMenuPosition();
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updateMobileMenuPosition);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updateMobileMenuPosition);
    };
  }, [open]);

  const focusItem = (index) => {
    const items = itemRefs.current.filter(Boolean);
    if (items.length) items[(index + items.length) % items.length].focus();
  };

  const handleButtonKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
      setTimeout(() => focusItem(0), 0);
    }
  };

  const handleMenuKeyDown = (event) => {
    const items = itemRefs.current.filter(Boolean);
    const currentIndex = items.indexOf(document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem(currentIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem(currentIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusItem(items.length - 1);
    }
  };

  return (
    <div ref={menuRef} className="relative ml-auto flex-shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label={`Account menu for ${name}`}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={handleButtonKeyDown}
        className="flex min-h-11 items-center gap-2 rounded-full border border-gray-700 bg-white px-2 py-1 text-sm text-gray-900 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        {image && !imageFailed ? (
          <img
            src={image}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-green-700 font-semibold text-white"
          >
            {initials}
          </span>
        )}
        <span aria-hidden="true" className="text-base">
          ▾
        </span>
      </button>

      {open && (
        <div
          id="account-menu"
          role="menu"
          aria-label="Account options"
          onKeyDown={handleMenuKeyDown}
          style={mobileMenuPosition ?? undefined}
          className="fixed right-2 top-16 z-50 max-h-[calc(100vh-1rem)] w-72 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-md border border-gray-300 bg-white p-2 text-gray-900 shadow-lg min-[1165px]:absolute min-[1165px]:right-0 min-[1165px]:top-auto min-[1165px]:mt-2"
        >
          <div className="border-b border-gray-200 px-3 py-2" role="presentation">
            <p className="text-sm font-semibold">{role}</p>
            <p className="break-words text-sm text-gray-600">{email}</p>
          </div>
          <Link
            ref={(element) => (itemRefs.current[0] = element)}
            href="/account/security"
            role="menuitem"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="mt-1 block rounded px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
          >
            Account security
          </Link>
          <button
            ref={(element) => (itemRefs.current[1] = element)}
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={onSignOut}
            className="block w-full rounded border-0 bg-transparent px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
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
