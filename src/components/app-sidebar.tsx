"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ScanBarcode,
  Settings,
  Building2,
  History,
  Layers,
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

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user?:
    | { name?: string | null; email?: string | null; image?: string | null; role?: string | null }
    | undefined;
}) {
  const pathname = usePathname();
  const { openSessions, target, hasMultiple } = useScanTarget();
  const [sheetOpen, setSheetOpen] = useState(false);

  const allItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Escanear", url: target, icon: ScanBarcode },
    { title: "Productos", url: "/products", icon: Package },
    { title: "Ubicaciones", url: "/locations", icon: Building2 },
    { title: "Sesiones V1", url: "/sessions/v1", icon: History },
    { title: "Sesiones V2", url: "/sessions/v2", icon: Layers },
    { title: "Configuración", url: "/settings", icon: Settings },
  ];

  function isActive(item: { title: string; url?: string }) {
    if (item.title === "Dashboard") return pathname === "/";
    if (item.title === "Sesiones V1") return pathname.startsWith("/sessions/v1");
    if (item.title === "Sesiones V2") return pathname.startsWith("/sessions/v2");
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
