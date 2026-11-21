"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, ClipboardCheck, LayoutDashboard, FileText, Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/anomalies", label: "Anomalies", icon: BarChart3 },
  { href: "/investigations", label: "Investigations", icon: ClipboardCheck },
  { href: "/buildings", label: "Buildings", icon: Building2 },
  { href: "/reports", label: "Reports", icon: FileText },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
      {open && <button className="sidebar-overlay" onClick={() => setOpen(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><span /></div>
          <div><strong>CampusFix</strong><small>Facilities intelligence</small></div>
          <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <nav>
          <p className="nav-label">Workspace</p>
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            const Icon = link.icon;
            return <Link key={link.href} href={link.href} className={active ? "nav-link active" : "nav-link"} onClick={() => setOpen(false)}>
              <Icon size={17} strokeWidth={1.8} /><span>{link.label}</span>
            </Link>;
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="avatar">FR</div>
          <div><strong>Facilities Review</strong><small>Rutgers University</small></div>
        </div>
      </aside>
    </>
  );
}
