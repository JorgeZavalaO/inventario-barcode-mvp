import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { auth, signOut } from "@/lib/auth";
import { Shield, LogOut, UserRound } from "lucide-react";

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  SUPERVISOR: "Supervisor",
  COUNTER: "Contador",
  VIEWER: "Visor",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <SidebarProvider>
      <AppSidebar user={session?.user} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b bg-white px-4">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-slate-600">
              <UserRound size={15} />
              {session?.user?.name ?? session?.user?.email}
            </span>
            {session?.user?.role ? (
              <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                <Shield size={12} />
                {roleLabels[session.user.role] ?? session.user.role}
              </span>
            ) : null}
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={15} />
                Salir
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
