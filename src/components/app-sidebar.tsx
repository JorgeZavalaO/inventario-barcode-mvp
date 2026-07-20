"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  ScanBarcode,
  Settings,
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
import { useScanTarget } from "@/hooks/use-scan-target";
import { SessionPickerSheet } from "@/components/session/session-picker-sheet";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Productos", url: "/products", icon: Package },
  { title: "Sesiones", url: "/sessions", icon: ClipboardList },
];

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user?:
    | { name?: string | null; email?: string | null; image?: string | null }
    | undefined;
}) {
  const pathname = usePathname();
  const { openSessions, target, hasMultiple } = useScanTarget();
  const [sheetOpen, setSheetOpen] = useState(false);

  const allItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Escanear", url: target, icon: ScanBarcode },
    { title: "Productos", url: "/products", icon: Package },
    { title: "Sesiones", url: "/sessions", icon: ClipboardList },
    { title: "Configuración", url: "/settings", icon: Settings },
  ];

  function isActive(item: { title: string; url?: string }) {
    if (item.title === "Dashboard") return pathname === "/";
    if (item.title === "Sesiones") return pathname.startsWith("/sessions");
    if (item.title === "Escanear") return pathname.includes("/scan");
    if (item.url) return pathname.startsWith(item.url);
    return false;
  }

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
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            Módulos
          </SidebarGroupLabel>
          <SidebarMenu>
            {allItems.map((item) => {
              if (item.title === "Escanear") {
                return (
                  <SidebarMenuItem key="Escanear">
                    <SidebarMenuButton
                      isActive={isActive(item)}
                      tooltip="Escanear"
                      onClick={
                        hasMultiple ? () => setSheetOpen(true) : undefined
                      }
                      render={!hasMultiple ? <Link href={target} /> : undefined}
                    >
                      <ScanBarcode />
                      <span>Escanear</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              }

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive(item)}
                    tooltip={item.title}
                    render={<Link href={item.url!} />}
                  >
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
        {user && (
          <NavUser
            user={{
              name: user.name ?? "Usuario",
              email: user.email ?? "",
              avatar: user.image ?? "",
            }}
          />
        )}
      </SidebarFooter>
      <SidebarRail />
      <SessionPickerSheet
        sessions={openSessions}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </Sidebar>
  );
}
