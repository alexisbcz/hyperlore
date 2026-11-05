import Link from "next/link";
import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { Aura } from "@/components/aura";
import { CommandMenu, SearchButton } from "@/components/command-menu";
import { LogoMark } from "@/components/logo";
import { MobileDock, RecentCompanies, SidebarNav } from "@/components/nav-links";
import { SidebarRail } from "@/components/sidebar-rail";
import { ThemeToggle } from "@/components/theme-toggle";

// The classic design's chrome: sidebar, phone header and dock, footer and ⌘K menu. The Twenty design
// (the default, under src/app/lab/twenty) draws its own shell, so this wraps only the (classic) routes.

function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-md py-2 font-[family-name:var(--font-display)] text-base font-bold tracking-tight text-fg focus-visible:outline-2 focus-visible:outline-accent">
      <LogoMark size={26} />
      Hyperlore
    </Link>
  );
}

export function ClassicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        Skip to content
      </a>
      <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-bg p-3 lg:flex">
        <div className="px-1.5">
          <Logo />
        </div>
        <div className="mb-3 mt-2">
          <SearchButton />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none]">
          <SidebarNav />
          <RecentCompanies />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Link href="/request" className="btn-lime flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold">
            <Plus aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">Request a company</span>
          </Link>
          <ThemeToggle />
        </div>
      </aside>
      <SidebarRail />
      <div className="app-content flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <Logo />
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <SearchButton />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="flex-1 overflow-x-clip outline-none">
          {children}
        </main>
        <footer className="border-t border-border pb-24 lg:pb-0">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-fg-subtle sm:px-6">
            <p>Every claim links to its source. Found a mistake? Every fact has a “Suggest a correction” link.</p>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-4">
              {/* A plain link: the proxy reads ?style= and drops the classic cookie. */}
              <a href="/?style=twenty" className="py-2.5 hover:text-fg sm:py-0">
                Switch to the new design
              </a>
              <Link href="/lab" className="py-2.5 hover:text-fg sm:py-0">
                Style lab
              </Link>
              <Link href="/request" className="py-2.5 hover:text-fg sm:py-0">
                Request a company
              </Link>
            </nav>
          </div>
        </footer>
      </div>
      <span aria-hidden="true" className="read-progress" />
      <Aura />
      <MobileDock />
      <CommandMenu />
    </>
  );
}
