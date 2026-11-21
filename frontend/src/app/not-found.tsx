import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";

export default function NotFound() {
  return <div className="app-shell"><AppSidebar /><main className="main-content"><section className="not-found"><p>404</p><h1>Page not found</h1><Link href="/">Return to overview</Link></section></main></div>;
}
