import { Bell, ChevronDown } from "lucide-react";

export function AppHeader({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <header className="app-header">
      <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1></div>
      <div className="header-actions">
        <button className="icon-button" aria-label="Notifications"><Bell size={17} /></button>
        <button className="workspace-button">Rutgers Energy <ChevronDown size={15} /></button>
      </div>
    </header>
  );
}
