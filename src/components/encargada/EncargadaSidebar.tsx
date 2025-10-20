import { 
  Calendar, 
  History, 
  Building2, 
  Users, 
  ArrowLeftRight, 
  BarChart3,
  UserSquare2,
  Receipt
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface EncargadaSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  {
    group: "Cuadres",
    items: [
      { id: "cuadre-semanal", label: "Cuadre Semanal", icon: Calendar },
      { id: "historico-semanal", label: "Histórico Semanal", icon: History },
      { id: "cuadre-agencias", label: "Por Agencias", icon: Building2 },
    ],
  },
  {
    group: "Supervisión",
    items: [
      { id: "supervision", label: "Supervisión Taquilleras", icon: Users },
      { id: "resumen-sistemas", label: "Resumen por Sistemas", icon: BarChart3 },
    ],
  },
  {
    group: "Gestión",
    items: [
      { id: "prestamos-deudas", label: "Préstamos y Deudas", icon: ArrowLeftRight },
      { id: "empleados", label: "Empleados", icon: UserSquare2 },
      { id: "nomina", label: "Nómina", icon: Receipt },
    ],
  },
];

export function EncargadaSidebar({ activeTab, onTabChange }: EncargadaSidebarProps) {
  const { open: sidebarOpen } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {menuItems.map((section) => (
          <SidebarGroup key={section.group}>
            <SidebarGroupLabel>{section.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => onTabChange(item.id)}
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <item.icon className="h-4 w-4" />
                        {sidebarOpen && <span>{item.label}</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
