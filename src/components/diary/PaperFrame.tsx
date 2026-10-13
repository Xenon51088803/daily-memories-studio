"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/components/personal/data";
import { RouteGuard } from "@/components/RouteGuard";
export function PaperFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <header className="paper-header">
        <Link href="/" className="paper-brand">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M7 7h18v20H7z" stroke="currentColor" strokeWidth="1.4" />
            <path d="M4 4h18v20H4z" fill="var(--paper)" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9 10h8M9 14h8M9 18h4" stroke="currentColor" />
          </svg>
          <span>
            {site.name}<span className="brand-divider"> / </span>日常留存<small>A PERSONAL COLLECTION OF DAYS</small>
          </span>
        </Link>
        <nav aria-label="主导航">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
            首页
          </Link>
          <Link href="/#calendar">往日</Link>
          <Link href="/blog" aria-current={pathname?.startsWith("/blog") ? "page" : undefined}>
            随笔
          </Link>
          <Link href="/gallery" aria-current={pathname === "/gallery" ? "page" : undefined}>
            摄影
          </Link>
          <Link href="/about" aria-current={pathname === "/about" ? "page" : undefined}>
            关于我
          </Link>
        </nav>
        {process.env.NEXT_PUBLIC_STATIC_SITE !== "1" && (
          <Link className="private-link" href="/diary">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="4" y="9" width="12" height="9" rx="2" stroke="currentColor" />
              <path d="M6 9V6a4 4 0 0 1 8 0v3" stroke="currentColor" />
            </svg>{" "}
            私人空间 <span>↗</span>
          </Link>
        )}
      </header>
      <main className="paper-main">
        {pathname === "/" || pathname === "/diary" ? children : <RouteGuard>{children}</RouteGuard>}
      </main>
      <footer className="paper-footer">
        <div>
          <span className="footer-brand">{site.name} · 日常留存</span>
          <span>把值得记得的，留在可以回来的地方。</span>
        </div>
        <div>
          {process.env.NODE_ENV === "development" && <Link href="/studio">内容工作室</Link>}
          <Link href="/work">小小作品</Link>
          <Link href="/credits">项目说明</Link>
          <span>
            © {new Date().getFullYear()} {site.name === "Your Name" ? "我的个人空间" : site.name}
          </span>
        </div>
      </footer>
    </>
  );
}
