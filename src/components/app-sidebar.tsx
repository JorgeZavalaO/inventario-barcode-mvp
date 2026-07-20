"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  ScanBarcode,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/nav-user";

const navItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Productos",
    url: "/products",
    icon: Package,
  },
  {
    title: "Sesiones",
    url: "/sessions",
    icon: ClipboardList,
  },
];

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user?: { name?: string | null; email?: string | null; image?: string | null } | undefined }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-3 px-2 py-1">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-500/15 text-teal-600">
            <ScanBarcode size={20} />
          </span>
          <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight">StockScan</span>
            <span className="text-xs text-slate-500">Inventario</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Módulos</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const active = pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url));
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton isActive={active} tooltip={item.title} render={<Link href={item.url} />}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {user && <NavUser user={{ name: user.name ?? "Usuario", email: user.email ?? "", avatar: user.image ?? "" }} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
