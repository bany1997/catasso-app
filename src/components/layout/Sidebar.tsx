import React from 'react';
import { erpStore } from '../../services/store';
import { translations } from '../../services/i18n';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  ShoppingCart,
  Truck,
  ClipboardCheck,
  AlertOctagon,
  Wrench,
  MapPin,
  FileSpreadsheet,
  Users,
  FlaskConical,
  Gauge,
  Send,
  Building,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const currentUser = erpStore.currentUser;
  const t = translations[erpStore.language];

  if (!currentUser) return null;

  const role = currentUser.role;

  // Role visibility rules
  const menuItems = [
    {
      id: 'dashboard',
      label: t.dashboard,
      icon: LayoutDashboard,
      roles: ['superadmin', 'gestor_geral', 'responsavel_armazem', 'gestor_frotas', 'atendente', 'cliente', 'fornecedor'],
    },
    {
      id: 'catalog',
      label: 'Catálogo de Produtos (50.000)',
      icon: Boxes,
      roles: ['superadmin', 'gestor_geral', 'responsavel_armazem', 'gestor_frotas', 'atendente', 'cliente', 'fornecedor'],
    },
    {
      id: 'movements',
      label: 'Entradas & Saídas de Estoque',
      icon: ArrowLeftRight,
      roles: ['superadmin', 'gestor_geral', 'responsavel_armazem', 'atendente', 'cliente'],
    },
    {
      id: 'purchases',
      label: 'Compras & Encomendas',
      icon: ShoppingCart,
      roles: ['superadmin', 'gestor_geral', 'responsavel_armazem', 'atendente', 'cliente'],
    },
    {
      id: 'supplierPortal',
      label: 'Portal do Fornecedor',
      icon: Send,
      roles: ['fornecedor', 'superadmin', 'gestor_geral', 'responsavel_armazem'],
      badge: role === 'fornecedor' ? 'Principal' : undefined,
    },
    {
      id: 'receiving',
      label: 'Recebimento & Inspeção',
      icon: ClipboardCheck,
      roles: ['superadmin', 'gestor_geral', 'responsavel_armazem'],
    },
    {
      id: 'transfers',
      label: 'Comunicação Inter-Armazéns',
      icon: Building,
      roles: ['superadmin', 'gestor_geral', 'responsavel_armazem'],
    },
    {
      id: 'chemicals_calibration',
      label: 'Químicos & EIMES Calibráveis',
      icon: FlaskConical,
      roles: ['superadmin', 'gestor_geral', 'responsavel_armazem', 'atendente'],
    },
    {
      id: 'fleet',
      label: 'Frotas & Equipamentos',
      icon: Wrench,
      roles: ['superadmin', 'gestor_geral', 'responsavel_armazem', 'gestor_frotas', 'atendente'],
      badge: role === 'gestor_frotas' ? 'Principal' : undefined,
    },
    {
      id: 'rnc',
      label: 'Não Conformidades (RNC)',
      icon: AlertOctagon,
      roles: ['superadmin', 'gestor_geral', 'responsavel_armazem', 'fornecedor'],
    },
    {
      id: 'locations',
      label: 'Layout & Endereçamento',
      icon: MapPin,
      roles: ['superadmin', 'gestor_geral', 'responsavel_armazem', 'atendente'],
    },
    {
      id: 'reports',
      label: 'Relatórios & Auditoria',
      icon: FileSpreadsheet,
      roles: ['superadmin', 'gestor_geral', 'responsavel_armazem', 'gestor_frotas', 'cliente'],
    },
    {
      id: 'users',
      label: 'Gestão de Utilizadores',
      icon: Users,
      roles: ['superadmin', 'gestor_geral', 'responsavel_armazem'],
    },
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none min-h-[calc(100vh-4rem)]">
      <div className="py-4 px-3 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Módulos Operacionais
        </div>

        <nav className="space-y-1">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded transition-colors ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Warehouse Status Pill at bottom */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span>Unidade Local:</span>
          <span className="text-sky-400 font-mono font-semibold">
            {erpStore.getActiveWarehouse()?.code}
          </span>
        </div>
        <div className="text-slate-500 mt-1 truncate">
          {erpStore.getActiveWarehouse()?.address}
        </div>
      </div>
    </aside>
  );
};
