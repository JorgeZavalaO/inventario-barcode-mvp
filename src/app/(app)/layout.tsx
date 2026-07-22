import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Shield, LogOut, UserRound } from "lucide-react";

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  SUPERVISOR: "Supervisor",
  COUNTER: "Contador",
  VIEWER: "Visor",
};

const DEV_USER = {
  id: "dev-user",
  email: "dev@local.com",
  name: "Dev User",
  role: "ADMIN" as const,
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let session: { user: typeof DEV_USER } | null = { user: DEV_USER };
  try {
    const { auth } = await import("@/lib/auth");
    session = (await auth()) as typeof session ?? { user: DEV_USER };
  } catch {
    session = { user: DEV_USER };
  }
  const user = session?.user ?? DEV_USER;

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b bg-white px-4">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-slate-600">
              <UserRound size={15} />
              {user.name ?? user.email}
            </span>
            <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              <Shield size={12} />
              {roleLabels[user.role] ?? user.role}
            </span>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
