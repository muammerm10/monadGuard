"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { Bars3Icon, ShieldExclamationIcon, PlusCircleIcon, MagnifyingGlassIcon, ListBulletIcon } from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Home",
    href: "/",
    icon: <ShieldExclamationIcon className="h-4 w-4" />,
  },
  {
    label: "Submit Threat",
    href: "/submit",
    icon: <PlusCircleIcon className="h-4 w-4" />,
  },
  {
    label: "Hash Lookup",
    href: "/lookup",
    icon: <MagnifyingGlassIcon className="h-4 w-4" />,
  },
  {
    label: "Threat Feed",
    href: "/feed",
    icon: <ListBulletIcon className="h-4 w-4" />,
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "bg-base-300 text-primary" : "text-base-content hover:bg-base-200"
              } py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col transition-colors duration-200`}
            >
              {icon}
              <span className="font-semibold">{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

export const Header = () => {
  const { targetNetwork } = useTargetNetwork();

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="sticky lg:static top-0 navbar bg-base-100/90 backdrop-blur-md min-h-0 shrink-0 justify-between z-20 border-b border-base-300 px-0 sm:px-4 py-2">
      <div className="navbar-start w-auto lg:w-1/2">
        <details className="dropdown" ref={burgerMenuRef}>
          <summary className="ml-1 btn btn-ghost lg:hidden hover:bg-transparent">
            <Bars3Icon className="h-1/2" />
          </summary>
          <ul
            className="menu menu-compact dropdown-content mt-3 p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-300"
            onClick={() => {
              burgerMenuRef?.current?.removeAttribute("open");
            }}
          >
            <HeaderMenuLinks />
          </ul>
        </details>
        <Link href="/" passHref className="hidden lg:flex items-center gap-3 ml-2 mr-6 shrink-0">
          <div className="flex justify-center items-center w-10 h-10 bg-primary/20 rounded-xl border border-primary/30">
            <ShieldExclamationIcon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
              MonadGuard
            </span>
            <span className="text-xs text-primary/80 font-mono tracking-widest uppercase">0-Day Threat Registry</span>
          </div>
        </Link>
        <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end grow mr-2 flex items-center gap-4">
        {/* Network Status Dot */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-base-300/50 border border-base-300">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
          <span className="text-xs font-mono text-base-content/80">Monad Testnet</span>
        </div>
        <RainbowKitCustomConnectButton />
      </div>
    </div>
  );
};
