import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { signOut } from "@/app/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUserAndProfile();

  if (!session) {
    redirect("/login");
  }

  const { profile, email } = session;
  const displayName = profile?.name ?? email ?? "Unbekannt";
  const isAdmin = profile?.role === "admin";

  const tabs = [
    { href: "/filiale", label: "Filiale" },
    { href: "/meine-woche", label: "Meine Woche" },
    ...(isAdmin ? [{ href: "/admin", label: "Bearbeiten" }] : []),
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Sport Mayer
            </p>
            <p className="text-xs text-slate-500">{displayName}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs font-medium text-slate-500 underline underline-offset-2"
            >
              Abmelden
            </button>
          </form>
        </div>
        <nav className="flex px-2">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 px-3 py-2 text-center text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 px-4 py-4">{children}</main>
    </div>
  );
}
