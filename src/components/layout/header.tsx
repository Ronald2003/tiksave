"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { ArrowDownToLine, Menu, Moon, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
const links = [["Home", "/"], ["How It Works", "/how-it-works"], ["Features", "/features"], ["FAQ", "/faq"]];
function subscribeTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dark = useSyncExternalStore(subscribeTheme, () => document.documentElement.classList.contains("dark"), () => true);
  function toggleTheme() {
    const value = !dark;
    document.documentElement.classList.toggle("dark", value);
    try { localStorage.setItem("theme", value ? "dark" : "light"); } catch { /* A blocked preference store should not block the toggle. */ }
  }
  return <header className="header"><div className="container header-inner">
    <Link href="/" className="brand" aria-label="TikSave home"><span className="brand-icon"><ArrowDownToLine aria-hidden="true" size={21} /></span>TikSave<span className="brand-period">.</span></Link>
    <nav className="desktop-nav" aria-label="Main navigation">{links.map(([label, href]) => <Link key={href} href={href} className={pathname === href ? "nav-link active" : "nav-link"} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}</nav>
    <div className="header-actions"><Button onClick={toggleTheme} variant="ghost" size="icon" aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}>{dark ? <Sun size={19} /> : <Moon size={19} />}</Button>
      <Button variant="ghost" size="icon" className="menu-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</Button>
    </div></div>
    {open && <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation">{links.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}</nav>}
  </header>;
}
