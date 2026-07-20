import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { auth, signOut } from "@/lib/auth";
import { LogOut, UserRound } from "lucide-react";

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
