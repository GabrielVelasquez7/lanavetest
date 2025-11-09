import { Building2, Users, Settings, Home, LogOut, Calculator, Percent, FileSpreadsheet } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

type AdminView = 'agencies' | 'users' | 'systems' | 'cuadres' | 'system-commissions' | 'weekly-cuadre-complete' | 'dashboard';

const menuItems = [
  { title: "Dashboard", key: "dashboard" as AdminView, icon: Home },
  { title: "Agencias", key: "agencies" as AdminView, icon: Building2 },
  { title: "Usuarios", key: "users" as AdminView, icon: Users },
  { title: "Sistemas", key: "systems" as AdminView, icon: Settings },
  { title: "Cuadres", key: "cuadres" as AdminView, icon: Calculator },
  { title: "Comisiones", key: "system-commissions" as AdminView, icon: Percent },
  { title: "Cuadre Semanal", key: "weekly-cuadre-complete" as AdminView, icon: FileSpreadsheet },
];

interface AdminSidebarProps {
  currentView: AdminView;
  onViewChange: (view: AdminView) => void;
}

export function AdminSidebar({ currentView, onViewChange }: AdminSidebarProps) {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const collapsed = state === "collapsed";

  return (
    <Sidebar
      className={collapsed ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <div className="p-4 border-b bg-primary">
        <h2 className={`font-bold text-primary-foreground ${collapsed ? 'text-sm' : 'text-lg'}`}>
          {collapsed ? 'Admin' : 'Panel Admin'}
        </h2>
      </div>

      {/* Trigger del sidebar visible solo en desktop */}
      <div className="hidden lg:block">
        <SidebarTrigger className="m-2 self-end" />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton 
                    onClick={() => onViewChange(item.key)}
                    className={currentView === item.key ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={signOut}
                  className="hover:bg-destructive/10 text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {!collapsed && <span>Cerrar Sesión</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}