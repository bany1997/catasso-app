/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Truck,
  Ship,
  ArrowLeftRight,
  QrCode,
  LayoutDashboard,
  ShieldAlert,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Clock,
  Printer,
  UserCheck,
  ChevronDown,
  Warehouse,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  MapPin,
  DollarSign,
  BarChart3,
} from 'lucide-react';

import {
  UserRole,
  UserSession,
  WarehouseItem,
  MasterProduct,
  SupplierShipment,
  FleetVehicle,
  InterWarehouseTransfer,
  formatKz,
} from './types';

import {
  INITIAL_WAREHOUSES,
  INITIAL_PRODUCTS,
  INITIAL_SHIPMENTS,
  INITIAL_FLEET,
  INITIAL_TRANSFERS,
} from './mockData';

// --- COMPONENTE PRINCIPAL DO ERP CATASSO ---

export default function App() {
  // Estado de Sessão e Armazém Ativo
  const [session, setSession] = useState<UserSession>({
    id: 'USR-001',
    name: 'Eng. António Catasso',
    email: 'a.catasso@catasso-logistica.co.ao',
    role: 'Superadministrador',
    avatar: 'AC',
    warehouseId: 'ALL', // Global ou armazém específico
  });

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'inventory' | 'shipments' | 'fleets' | 'labels' | 'transfers'
  >('dashboard');

  // Estados dos Dados
  const [warehouses] = useState<WarehouseItem[]>(INITIAL_WAREHOUSES);
  const [products, setProducts] = useState<MasterProduct[]>(INITIAL_PRODUCTS);
  const [shipments, setShipments] = useState<SupplierShipment[]>(INITIAL_SHIPMENTS);
  const [fleet, setFleet] = useState<FleetVehicle[]>(INITIAL_FLEET);
  const [transfers, setTransfers] = useState<InterWarehouseTransfer[]>(INITIAL_TRANSFERS);

  // Modais
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isStockMovementModalOpen, setIsStockMovementModalOpen] = useState(false);
  const [selectedProductForMovement, setSelectedProductForMovement] = useState<MasterProduct | null>(null);
  const [isNewTransferModalOpen, setIsNewTransferModalOpen] = useState(false);
  const [isNewShipmentModalOpen, setIsNewShipmentModalOpen] = useState(false);
  const [isFleetMaintenanceModalOpen, setIsFleetMaintenanceModalOpen] = useState(false);
  const [selectedVehicleForMaint, setSelectedVehicleForMaint] = useState<FleetVehicle | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estados de Filtro & Busca
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Estado para Emissão de Etiqueta
  const [selectedLabelProduct, setSelectedLabelProduct] = useState<MasterProduct>(products[0]);
  const [labelWarehouseId, setLabelWarehouseId] = useState<string>('ARM-LUA-01');
  const [labelBatch, setLabelBatch] = useState<string>(products[0].batchNumber);
  const [labelQuantity, setLabelQuantity] = useState<number>(50);
  const [labelInvoiceRef, setLabelInvoiceRef] = useState<string>('FT-2026-9921');

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Armazém Ativo
  const currentWarehouse = useMemo(() => {
    if (session.warehouseId === 'ALL') return null;
    return warehouses.find((w) => w.id === session.warehouseId) || null;
  }, [session.warehouseId, warehouses]);

  // Cálculos Financeiros e Métricas Globais ou do Armazém Ativo
  const metrics = useMemo(() => {
    let totalStockValueKz = 0;
    let totalUnitsInStock = 0;
    let lowStockCount = 0;

    products.forEach((prod) => {
      prod.variants.forEach((v) => {
        let qty = 0;
        if (session.warehouseId === 'ALL') {
          qty = Object.values(v.stockByWarehouse).reduce((acc, curr) => acc + curr, 0);
        } else {
          qty = v.stockByWarehouse[session.warehouseId] || 0;
        }

        totalUnitsInStock += qty;
        totalStockValueKz += qty * prod.unitCostKz;

        if (qty <= v.reorderPoint) {
          lowStockCount += 1;
        }
      });
    });

    const activeFleetCount = fleet.filter((f) => {
      if (session.warehouseId !== 'ALL' && f.assignedWarehouseId !== session.warehouseId) return false;
      return f.status === 'Operacional' || f.status === 'Em Rota';
    }).length;

    const monthlyRentalCostKz = fleet
      .filter((f) => session.warehouseId === 'ALL' || f.assignedWarehouseId === session.warehouseId)
      .reduce((acc, curr) => acc + curr.monthlyRentalChargeKz, 0);

    const pendingCustomsTaxKz = shipments
      .filter((s) => s.status === 'alfandega')
      .reduce((acc, curr) => acc + curr.customsTaxKz, 0);

    const totalShipmentsInTransitValueKz = shipments
      .filter((s) => s.status === 'expedido' || s.status === 'alfandega')
      .reduce((acc, curr) => acc + curr.totalValueKz, 0);

    return {
      totalStockValueKz,
      totalUnitsInStock,
      lowStockCount,
      activeFleetCount,
      monthlyRentalCostKz,
      pendingCustomsTaxKz,
      totalShipmentsInTransitValueKz,
    };
  }, [products, session.warehouseId, fleet, shipments]);

  // Handlers de Ações
  const handleRoleWarehouseSwitch = (newRole: UserRole, newWarehouseId: string) => {
    setSession((prev) => ({
      ...prev,
      role: newRole,
      warehouseId: newWarehouseId,
    }));
    setIsLoginModalOpen(false);
    showToast(`Sessão alterada para perfil: ${newRole} (${newWarehouseId === 'ALL' ? 'Visão Global' : newWarehouseId})`);
  };

  const handleStockMovement = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProductForMovement) return;

    const formData = new FormData(e.currentTarget);
    const movementType = formData.get('type') as 'ENTRADA' | 'SAIDA';
    const variantId = formData.get('variantId') as string;
    const warehouseTarget = formData.get('warehouseId') as string;
    const quantity = parseInt(formData.get('quantity') as string, 10);
    const justification = formData.get('justification') as string;

    if (isNaN(quantity) || quantity <= 0) {
      alert('Por favor insira uma quantidade válida.');
      return;
    }

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== selectedProductForMovement.id) return p;
        return {
          ...p,
          variants: p.variants.map((v) => {
            if (v.id !== variantId) return v;
            const currentStock = v.stockByWarehouse[warehouseTarget] || 0;
            const newStock =
              movementType === 'ENTRADA'
                ? currentStock + quantity
                : Math.max(0, currentStock - quantity);
            return {
              ...v,
              stockByWarehouse: {
                ...v.stockByWarehouse,
                [warehouseTarget]: newStock,
              },
            };
          }),
        };
      })
    );

    setIsStockMovementModalOpen(false);
    showToast(
      `Movimento de ${movementType} de ${quantity} un efetuado com sucesso no ${warehouseTarget}! (${justification})`
    );
  };

  const handleApproveTransfer = (transferId: string) => {
    setTransfers((prev) =>
      prev.map((t) => {
        if (t.id !== transferId) return t;
        const nextStatus = t.status === 'Pendente' ? 'Em Trânsito' : 'Concluído';
        return {
          ...t,
          status: nextStatus,
          nationalGuideNumber:
            t.nationalGuideNumber === 'GTN-PENDENTE'
              ? `GTN-2026-${Math.floor(10000 + Math.random() * 90000)}-MINTRANS`
              : t.nationalGuideNumber,
        };
      })
    );
    showToast('Estado da Transferência Inter-Armazéns atualizado com sucesso!');
  };

  const handleAdvanceShipmentStep = (shipmentId: string) => {
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipmentId) return s;
        if (s.step === 1) {
          return {
            ...s,
            step: 2,
            status: 'alfandega',
            customsStatus: 'Canal Amarelo',
            inspectionNotes: 'Mercadoria atracada no porto/aeroporto. Documentos em validação pela AGT.',
          };
        } else if (s.step === 2) {
          return {
            ...s,
            step: 3,
            status: 'recebido',
            customsStatus: 'Desembaraçado',
            conformityReport: {
              approvedBy: `${session.name} (${session.role})`,
              date: '2026-10-18',
              discrepancyCount: 0,
              notes: 'Despacho alfandegário concluído. Entrada conferida física e documentalmente sem não-conformidades.',
            },
          };
        }
        return s;
      })
    );
    showToast('Envio de fornecedor avançou para a etapa seguinte com sucesso!');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* TOAST DE NOTIFICAÇÃO DO ERP */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-emerald-950 border border-emerald-500/50 text-emerald-200 px-5 py-3 rounded-xl shadow-2xl shadow-emerald-950/80 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* CABEÇALHO CORPORATIVO SUPERIOR */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Marca CATASSO */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-wider text-white">CATASSO</span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/40 px-1.5 py-0.5 rounded">
                  ERP Logística
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  🇦🇴 Angola (Kz / AOA)
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Cadeia de Abastecimento & Gestão Multi-Armazém Enterprise
              </p>
            </div>
          </div>

          {/* Seletores Centrais: Armazém Ativo & Indicador */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 shadow-inner">
              <Warehouse className="w-4 h-4 text-blue-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Armazém Ativo</span>
                <select
                  value={session.warehouseId}
                  onChange={(e) => setSession((prev) => ({ ...prev, warehouseId: e.target.value }))}
                  className="bg-transparent text-sm font-semibold text-slate-100 focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900 text-slate-200">
                    🌐 Visão Global (Todos os Armazéns)
                  </option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id} className="bg-slate-900 text-slate-200">
                      {w.code} - {w.name} ({w.province})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Perfil & Troca de Sessão */}
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg px-3 py-1.5 transition text-left group"
              title="Trocar perfil ou armazém de início de sessão"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-xs font-bold text-blue-300 group-hover:border-blue-400">
                {session.avatar}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                  {session.name}
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
                <div className="text-[10px] font-medium text-emerald-400">{session.role}</div>
              </div>
            </button>
          </div>
        </div>

        {/* Barra de Navegação dos Módulos Principais */}
        <div className="max-w-7xl mx-auto mt-3 pt-2 border-t border-slate-800/60 flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard Executivo
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Boxes className="w-4 h-4" />
            Inventário SKU Mestre
            <span className="text-[10px] bg-slate-900/60 text-slate-300 px-1.5 py-0.2 rounded-full border border-slate-700">
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('shipments')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'shipments'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Ship className="w-4 h-4" />
            Envios de Fornecedores & AGT
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full border border-amber-500/40">
              {shipments.filter((s) => s.status !== 'recebido').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('transfers')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'transfers'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Transferências Inter-Armazéns
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded-full border border-blue-500/40">
              {transfers.filter((t) => t.status === 'Em Trânsito' || t.status === 'Pendente').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('fleets')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'fleets'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Truck className="w-4 h-4" />
            Frotas & Equipamentos
          </button>

          <button
            onClick={() => setActiveTab('labels')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'labels'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Etiquetas & Rastreio QR
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DINÂMICO */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* BANNER INFORMATIVO DO ARMAZÉM SELECIONADO */}
        {currentWarehouse ? (
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">
                    {currentWarehouse.code} - {currentWarehouse.name}
                  </h2>
                  <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    {currentWarehouse.city}, {currentWarehouse.province}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Responsável: <span className="text-slate-200 font-medium">{currentWarehouse.manager}</span> •
                  Contacto: {currentWarehouse.phone} • Operadores: {currentWarehouse.activeStaff}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
              <div className="text-right">
                <div className="text-xs text-slate-400">Capacidade Operacional</div>
                <div className="text-sm font-bold text-slate-200">
                  {currentWarehouse.usedCapacityM3.toLocaleString()} / {currentWarehouse.capacityM3.toLocaleString()} m³
                </div>
              </div>
              <div className="w-24 bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
                <div
                  className={`h-full rounded-full ${
                    currentWarehouse.usedCapacityM3 / currentWarehouse.capacityM3 > 0.85
                      ? 'bg-rose-500'
                      : currentWarehouse.usedCapacityM3 / currentWarehouse.capacityM3 > 0.65
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${(currentWarehouse.usedCapacityM3 / currentWarehouse.capacityM3) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Rede Nacional de Entrepostos Logísticos (Angola)
                  <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    5 Armazéns Ativos
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Hubs em Luanda (Viana & Porto), Benguela (Lobito), Huambo e Cabinda interligados em tempo real.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsNewTransferModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Nova Transferência Inter-Armazém
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: DASHBOARD EXECUTIVO                               */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Linha de KPIs Principais em Kwanzas (Kz) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1 */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden shadow">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs uppercase font-bold tracking-wider">Valor em Stock (AOA)</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-white">
                  {formatKz(metrics.totalStockValueKz)}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+14.2% face ao trimestre anterior</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {metrics.totalUnitsInStock.toLocaleString()} unidades contabilizadas
                </div>
              </div>

              {/* KPI 2 */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden shadow">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs uppercase font-bold tracking-wider">Carga Internacional em Rota</span>
                  <Ship className="w-4 h-4 text-blue-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-white">
                  {formatKz(metrics.totalShipmentsInTransitValueKz)}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-blue-400">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Taxas AGT Estimadas: {formatKz(metrics.pendingCustomsTaxKz)}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {shipments.filter((s) => s.status !== 'recebido').length} despachos em curso
                </div>
              </div>

              {/* KPI 3 */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden shadow">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs uppercase font-bold tracking-wider">Custos Mensais de Frota</span>
                  <Truck className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-white">
                  {formatKz(metrics.monthlyRentalCostKz)}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-amber-400">
                  <span>{metrics.activeFleetCount} Viaturas & Máquinas em Atividade</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Imputação de aluguer interno & depreciação
                </div>
              </div>

              {/* KPI 4 */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden shadow">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs uppercase font-bold tracking-wider">Alertas de Stock & Risco</span>
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-white">
                  {metrics.lowStockCount}{' '}
                  <span className="text-sm font-semibold text-rose-400">Ponto de Encomenda</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Necessidade de reposição imediata</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Baseado no lead time alfandegário de Luanda
                </div>
              </div>
            </div>

            {/* Gráficos Visuais e Ocupação dos Armazéns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Ocupação e Capacidade por Armazém */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                      Capacidade & Taxa de Ocupação dos Armazéns (m³)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Monitorização volumétrica em tempo real dos entrepostos provinciais
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                    Média Nacional: 66.8%
                  </span>
                </div>

                <div className="space-y-4">
                  {warehouses.map((w) => {
                    const pct = Math.round((w.usedCapacityM3 / w.capacityM3) * 100);
                    return (
                      <div key={w.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{w.name}</span>
                            <span className="text-[10px] text-slate-400">({w.city}, {w.province})</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-slate-300">
                              {w.usedCapacityM3.toLocaleString()} / {w.capacityM3.toLocaleString()} m³
                            </span>
                            <span
                              className={`ml-2 font-bold ${
                                pct > 80 ? 'text-rose-400' : pct > 65 ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            >
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              pct > 80
                                ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                                : pct > 65
                                ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                                : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Fluxo de Entradas vs Saídas Mensais (AOA) */}
                <div className="mt-6 pt-5 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Fluxo de Mercadorias nos Últimos 4 Meses (Milhões Kz)
                  </h4>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    {[
                      { month: 'Julho', inKz: 420, outKz: 510 },
                      { month: 'Agosto', inKz: 590, outKz: 480 },
                      { month: 'Setembro', inKz: 680, outKz: 620 },
                      { month: 'Outubro (Atual)', inKz: 810, outKz: 740 },
                    ].map((m, idx) => (
                      <div key={idx} className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                        <div className="text-xs font-semibold text-slate-400">{m.month}</div>
                        <div className="flex justify-center items-end gap-2 h-20 mt-2">
                          <div className="flex flex-col items-center">
                            <div
                              className="w-4 bg-emerald-500 rounded-t"
                              style={{ height: `${(m.inKz / 900) * 100}%` }}
                              title={`Entradas: ${m.inKz}M Kz`}
                            />
                            <span className="text-[9px] text-emerald-400 mt-1">E</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div
                              className="w-4 bg-blue-500 rounded-t"
                              style={{ height: `${(m.outKz / 900) * 100}%` }}
                              title={`Saídas: ${m.outKz}M Kz`}
                            />
                            <span className="text-[9px] text-blue-400 mt-1">S</span>
                          </div>
                        </div>
                        <div className="text-[10px] font-bold text-slate-300 mt-1">
                          {m.outKz}M Kz
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Entradas / Compras Fornecedores
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Saídas Faturadas / Despachos
                    </span>
                  </div>
                </div>
              </div>

              {/* Painel Lateral: Alertas e Atividade Rápida */}
              <div className="space-y-6">
                {/* Despacho Alfandegário Rápido */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <Ship className="w-4 h-4 text-amber-400" />
                    Processos AGT em Luanda & Lobito
                  </h3>
                  <div className="space-y-3">
                    {shipments.map((shp) => (
                      <div
                        key={shp.id}
                        className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-400">{shp.shipmentNumber}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              shp.customsStatus.includes('Verde')
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : shp.customsStatus.includes('Amarelo')
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : shp.customsStatus.includes('Desembaraçado')
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {shp.customsStatus}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-200 mt-1 truncate">
                          {shp.supplierName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1.5">
                          <span>DU: {shp.duNumber}</span>
                          <span className="font-bold text-emerald-400">{formatKz(shp.totalValueKz)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setActiveTab('shipments')}
                    className="w-full mt-3 py-2 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-950/40 border border-blue-800/40 rounded-lg transition"
                  >
                    Ver Rastreio Completo em 3 Passos →
                  </button>
                </div>

                {/* Transferências Inter-Armazéns em Rota */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                    Rotas Inter-Provinciais em Trânsito
                  </h3>
                  <div className="space-y-3">
                    {transfers.slice(0, 2).map((trf) => (
                      <div key={trf.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-200">{trf.transferCode}</span>
                          <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">
                            {trf.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                          <span>{trf.sourceWarehouseId.split('-')[1]}</span>
                          <span>→</span>
                          <span className="text-white font-medium">{trf.destWarehouseId.split('-')[1]}</span>
                          <span>• {trf.productName} ({trf.quantity} un)</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Viatura: {trf.vehiclePlate} | Guia: {trf.nationalGuideNumber}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: INVENTÁRIO SKU MESTRE                             */}
        {/* ========================================================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Barra de Ações & Filtros */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-3 w-full">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar por SKU Mestre, Nome, Código de Barras, Lote..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="ALL">Todas as Categorias</option>
                    <option value="Construção & Obras">Construção & Obras</option>
                    <option value="Eletrodomésticos & Energia">Eletrodomésticos & Energia</option>
                    <option value="Alimentar & Bebidas">Alimentar & Bebidas</option>
                    <option value="Peças & Maquinaria">Peças & Maquinaria</option>
                    <option value="Químicos & Fito">Químicos & Fito</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => setIsNewProductModalOpen(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-lg shadow-blue-600/20"
                >
                  <Plus className="w-4 h-4" />
                  Novo SKU Mestre
                </button>
              </div>
            </div>

            {/* Tabela de Produtos SKU Mestre com Variantes Locais */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="p-3.5 pl-5">SKU Mestre & Produto</th>
                      <th className="p-3.5">Categoria</th>
                      <th className="p-3.5 text-right">Custo Unitário (Kz)</th>
                      <th className="p-3.5 text-right">PVP Estimado (Kz)</th>
                      <th className="p-3.5">Variantes & Stock Local</th>
                      <th className="p-3.5 text-center">Total {session.warehouseId === 'ALL' ? 'Global' : 'Armazém'}</th>
                      <th className="p-3.5 text-right pr-5">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {products
                      .filter((p) => {
                        const matchesSearch =
                          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.masterSku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
                        return matchesSearch && matchesCat;
                      })
                      .map((prod) => {
                        let totalQty = 0;
                        prod.variants.forEach((v) => {
                          if (session.warehouseId === 'ALL') {
                            totalQty += Object.values(v.stockByWarehouse).reduce((a, b) => a + b, 0);
                          } else {
                            totalQty += v.stockByWarehouse[session.warehouseId] || 0;
                          }
                        });

                        return (
                          <tr key={prod.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5 pl-5">
                              <div className="font-bold text-slate-100 flex items-center gap-2">
                                <span className="text-blue-400 font-mono text-[11px] bg-blue-950 px-2 py-0.5 rounded border border-blue-800/50">
                                  {prod.masterSku}
                                </span>
                                <span>{prod.name}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                                <span>Origem: {prod.originCountry}</span>
                                <span>• Lote: {prod.batchNumber}</span>
                                <span>• EAN: {prod.barcode}</span>
                              </div>
                            </td>

                            <td className="p-3.5">
                              <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700">
                                {prod.category}
                              </span>
                            </td>

                            <td className="p-3.5 text-right font-mono font-semibold text-slate-200">
                              {formatKz(prod.unitCostKz)}
                            </td>

                            <td className="p-3.5 text-right font-mono font-semibold text-emerald-400">
                              {formatKz(prod.unitPriceKz)}
                            </td>

                            <td className="p-3.5">
                              <div className="space-y-1">
                                {prod.variants.map((v) => {
                                  const localQty =
                                    session.warehouseId === 'ALL'
                                      ? Object.values(v.stockByWarehouse).reduce((a, b) => a + b, 0)
                                      : v.stockByWarehouse[session.warehouseId] || 0;

                                  const isLow = localQty <= v.reorderPoint;

                                  return (
                                    <div
                                      key={v.id}
                                      className="flex items-center justify-between gap-3 text-[11px] bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800"
                                    >
                                      <span className="text-slate-300 font-medium truncate max-w-[200px]">
                                        {v.spec}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className={`font-mono font-bold ${isLow ? 'text-rose-400' : 'text-slate-200'}`}>
                                          {localQty} un
                                        </span>
                                        {isLow && (
                                          <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1 rounded border border-rose-500/40">
                                            Repor
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>

                            <td className="p-3.5 text-center font-bold text-sm">
                              <span className="text-white font-mono">{totalQty.toLocaleString()}</span>
                            </td>

                            <td className="p-3.5 text-right pr-5">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedProductForMovement(prod);
                                    setIsStockMovementModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-blue-300 rounded border border-slate-700 transition"
                                  title="Dar entrada ou saída rápida"
                                >
                                  Movimento
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedLabelProduct(prod);
                                    setLabelBatch(prod.batchNumber);
                                    setActiveTab('labels');
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition"
                                  title="Gerar Etiqueta QR"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: ENVIOS DE FORNECEDORES (RASTREIO EM 3 PASSOS)      */}
        {/* ========================================================= */}
        {activeTab === 'shipments' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Ship className="w-5 h-5 text-blue-400" />
                  Rastreio & Desembaraço Alfandegário em 3 Passos (Angola)
                </h2>
                <p className="text-xs text-slate-400">
                  Fluxo regulamentado: 1. Expedição / Fatura → 2. Despacho AGT Luanda/Lobito → 3. Auto de Conformidade
                </p>
              </div>
              <button
                onClick={() => setIsNewShipmentModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow"
              >
                <Plus className="w-4 h-4" />
                Registar Novo Envio
              </button>
            </div>

            {/* Lista dos Envios com Visualizador de 3 Passos */}
            <div className="space-y-6">
              {shipments.map((shp) => {
                const destWarehouse = warehouses.find((w) => w.id === shp.destinationWarehouseId);

                return (
                  <div
                    key={shp.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4"
                  >
                    {/* Cabeçalho do Envio */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white">{shp.shipmentNumber}</span>
                          <span className="text-xs font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                            {shp.supplierName}
                          </span>
                          <span className="text-xs text-slate-400">
                            Origem: {shp.originPort} → Destino: {destWarehouse?.name} ({destWarehouse?.province})
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-4">
                          <span>Fatura Com.: <strong className="text-slate-200">{shp.invoiceNumber}</strong></span>
                          <span>B/L Guia: <strong className="text-slate-200">{shp.blNumber}</strong></span>
                          <span>DU AGT: <strong className="text-slate-200">{shp.duNumber}</strong></span>
                          <span>Chegada Estimada: <strong className="text-slate-200">{shp.estimatedArrival}</strong></span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-400">Valor da Carga (AOA)</div>
                        <div className="text-lg font-black text-emerald-400 font-mono">
                          {formatKz(shp.totalValueKz)}
                        </div>
                        <div className="text-[10px] text-amber-400">
                          Direitos / Taxas AGT: {formatKz(shp.customsTaxKz)}
                        </div>
                      </div>
                    </div>

                    {/* PIPELINE EM 3 PASSOS INTERATIVO */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      {/* PASSO 1: Expedição & Documentação */}
                      <div
                        className={`p-4 rounded-xl border relative transition ${
                          shp.step >= 1
                            ? 'bg-slate-950/80 border-blue-600/40 text-slate-200'
                            : 'bg-slate-950/30 border-slate-800/60 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-400">
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                              1
                            </span>
                            Expedição & Carga
                          </span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p className="text-xs text-slate-300">
                          Fatura comercial anexada e manifesto marítimo emitido. Em trânsito marítimo/rodoviário.
                        </p>
                        <div className="mt-2 text-[10px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
                          Manifesto B/L: {shp.blNumber}
                        </div>
                      </div>

                      {/* PASSO 2: Despacho Alfandegário AGT */}
                      <div
                        className={`p-4 rounded-xl border relative transition ${
                          shp.step >= 2
                            ? 'bg-slate-950/80 border-amber-600/40 text-slate-200'
                            : 'bg-slate-950/30 border-slate-800/60 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-400">
                            <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">
                              2
                            </span>
                            Despacho Alfandegário (AGT)
                          </span>
                          {shp.step > 2 ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                          )}
                        </div>
                        <p className="text-xs text-slate-300">
                          Canal atribuído: <strong className="text-amber-400">{shp.customsStatus}</strong>.
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">{shp.inspectionNotes}</p>
                        {shp.step === 2 && (
                          <button
                            onClick={() => handleAdvanceShipmentStep(shp.id)}
                            className="mt-3 w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-1.5 rounded text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Aprovar Desembaraço Alfandegário
                          </button>
                        )}
                      </div>

                      {/* PASSO 3: Receção & Auto de Conformidade */}
                      <div
                        className={`p-4 rounded-xl border relative transition ${
                          shp.step >= 3
                            ? 'bg-slate-950/80 border-emerald-600/40 text-slate-200'
                            : 'bg-slate-950/30 border-slate-800/60 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-400">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                              3
                            </span>
                            Receção & Auto Técnico
                          </span>
                          {shp.step === 3 ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <span className="text-[10px] text-slate-500">Pendente</span>
                          )}
                        </div>
                        {shp.conformityReport ? (
                          <div className="space-y-1 text-xs">
                            <p className="text-emerald-300 font-medium">✓ Auto de Entrada Homologado</p>
                            <p className="text-slate-400 text-[11px]">{shp.conformityReport.notes}</p>
                            <div className="text-[10px] text-slate-500 pt-1">
                              Conferido por: {shp.conformityReport.approvedBy} ({shp.conformityReport.date})
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">
                            Aguardando conclusão do desembaraço alfandegário no terminal marítimo para vistoria física.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Itens do Envio */}
                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Mercadorias neste Embarque:
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {shp.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2"
                          >
                            <span className="font-mono text-blue-400">{item.masterSku}</span>
                            <span className="text-slate-200">{item.productName}</span>
                            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: TRANSFERÊNCIAS INTER-ARMAZÉNS                      */}
        {/* ========================================================= */}
        {activeTab === 'transfers' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-blue-400" />
                  Transferências & Logística Inter-Armazéns de Angola
                </h2>
                <p className="text-xs text-slate-400">
                  Gestão de remessas entre Luanda, Benguela, Huambo e Cabinda com Guia de Transporte Nacional
                </p>
              </div>
              <button
                onClick={() => setIsNewTransferModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow"
              >
                <Plus className="w-4 h-4" />
                Criar Solicitação de Transferência
              </button>
            </div>

            {/* Tabela de Transferências */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="p-3.5 pl-5">Código & Guia Nacional</th>
                      <th className="p-3.5">Origem → Destino</th>
                      <th className="p-3.5">Artigo Transferido</th>
                      <th className="p-3.5 text-center">Quantidade</th>
                      <th className="p-3.5">Viatura Alocada</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5 text-right pr-5">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {transfers.map((trf) => {
                      const src = warehouses.find((w) => w.id === trf.sourceWarehouseId);
                      const dst = warehouses.find((w) => w.id === trf.destWarehouseId);

                      return (
                        <tr key={trf.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 pl-5">
                            <div className="font-bold text-slate-100">{trf.transferCode}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {trf.nationalGuideNumber}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Sol.: {trf.requestedBy} ({trf.requestDate})
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                              <span className="text-slate-400">{src?.code} ({src?.province})</span>
                              <span>→</span>
                              <span className="text-blue-400">{dst?.code} ({dst?.province})</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Prev. Chegada: {trf.estimatedArrival}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-medium text-slate-200">{trf.productName}</div>
                            <div className="text-[11px] text-slate-400">{trf.variantSpec}</div>
                            <div className="font-mono text-[10px] text-blue-400">{trf.masterSku}</div>
                          </td>

                          <td className="p-3.5 text-center font-bold font-mono text-sm text-white">
                            {trf.quantity} un
                          </td>

                          <td className="p-3.5">
                            <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 font-mono text-slate-300">
                              {trf.vehiclePlate}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                                trf.status === 'Concluído'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                  : trf.status === 'Em Trânsito'
                                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              }`}
                            >
                              {trf.status}
                            </span>
                          </td>

                          <td className="p-3.5 text-right pr-5">
                            {trf.status !== 'Concluído' && (
                              <button
                                onClick={() => handleApproveTransfer(trf.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow cursor-pointer"
                              >
                                {trf.status === 'Pendente' ? 'Despachar Carga' : 'Confirmar Receção'}
                              </button>
                            )}
                            {trf.status === 'Concluído' && (
                              <span className="text-[11px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Arquivado
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: FROTAS & EQUIPAMENTOS                             */}
        {/* ========================================================= */}
        {activeTab === 'fleets' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-400" />
                  Gestão de Frotas, Empilhadores & Equipamentos
                </h2>
                <p className="text-xs text-slate-400">
                  Alocação por entreposto, depreciação contabilística anual e imputação de custos em AOA
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-slate-400">Custo Mensal de Aluguer Imputado</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono">
                    {formatKz(metrics.monthlyRentalCostKz)}
                  </div>
                </div>
              </div>
            </div>

            {/* Cartões de Viaturas & Máquinas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {fleet.map((veh) => {
                const assignedWh = warehouses.find((w) => w.id === veh.assignedWarehouseId);
                const kmUntilMaintenance = veh.nextMaintenanceKm - veh.currentKm;
                const isMaintenanceClose = kmUntilMaintenance < 1500;

                return (
                  <div
                    key={veh.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-4 hover:border-slate-700 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold bg-slate-950 text-blue-400 px-2 py-0.5 rounded border border-blue-900">
                          {veh.plate}
                        </span>
                        <h3 className="text-sm font-bold text-white mt-1.5">{veh.model}</h3>
                        <p className="text-xs text-slate-400">{veh.type}</p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          veh.status === 'Operacional'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : veh.status === 'Em Rota'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        }`}
                      >
                        {veh.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Armazém Alocado:</span>
                        <span className="font-semibold text-slate-200">{assignedWh?.code} ({assignedWh?.province})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Motorista / Operador:</span>
                        <span className="font-semibold text-slate-200">{veh.driverName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Aluguer / Custo Mensal:</span>
                        <span className="font-bold text-emerald-400 font-mono">
                          {formatKz(veh.monthlyRentalChargeKz)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Valor Contabilístico:</span>
                        <span className="font-mono text-slate-300">
                          {formatKz(veh.currentBookValueKz)} (Dep. {veh.depreciationRateYear * 100}%/ano)
                        </span>
                      </div>
                    </div>

                    {/* Manutenção & Quilometragem */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          Odómetro: <strong>{veh.currentKm.toLocaleString()} km</strong>
                        </span>
                        <span className={`text-[11px] font-bold ${isMaintenanceClose ? 'text-amber-400' : 'text-slate-400'}`}>
                          Próx. Revisão: {veh.nextMaintenanceKm.toLocaleString()} km
                        </span>
                      </div>

                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full ${isMaintenanceClose ? 'bg-amber-500' : 'bg-blue-500'}`}
                          style={{
                            width: `${Math.min(100, (veh.currentKm / veh.nextMaintenanceKm) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setSelectedVehicleForMaint(veh);
                          setIsFleetMaintenanceModalOpen(true);
                        }}
                        className="w-full py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition cursor-pointer"
                      >
                        Registar Manutenção / Ocorrência
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: EMISSÃO DE ETIQUETAS & QR CODE                    */}
        {/* ========================================================= */}
        {activeTab === 'labels' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Painel Esquerdo: Configurador da Etiqueta */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-4">
              <div className="flex items-center gap-2 text-white">
                <QrCode className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold">Configurador de Etiqueta Logística</h2>
              </div>
              <p className="text-xs text-slate-400">
                Gere e imprima etiquetas normalizadas padrão Catasso com rastreabilidade de lote e armazém.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Produto (SKU Mestre)</label>
                  <select
                    value={selectedLabelProduct.id}
                    onChange={(e) => {
                      const p = products.find((x) => x.id === e.target.value);
                      if (p) {
                        setSelectedLabelProduct(p);
                        setLabelBatch(p.batchNumber);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.masterSku} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Armazém de Destino</label>
                    <select
                      value={labelWarehouseId}
                      onChange={(e) => setLabelWarehouseId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.code} - {w.province}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Qtd / Embalagem</label>
                    <input
                      type="number"
                      value={labelQuantity}
                      onChange={(e) => setLabelQuantity(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Número do Lote</label>
                    <input
                      type="text"
                      value={labelBatch}
                      onChange={(e) => setLabelBatch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Fatura / Despacho Ref.</label>
                    <input
                      type="text"
                      value={labelInvoiceRef}
                      onChange={(e) => setLabelInvoiceRef(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    window.print();
                    showToast('Comando de impressão enviado para a impressora de etiquetas térmica!');
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg text-xs transition shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Etiqueta Térmica (Zebra / GS1)
                </button>
              </div>
            </div>

            {/* Painel Direito: Pré-visualização da Etiqueta Industrial */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow flex flex-col items-center justify-center">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 self-start">
                Pré-visualização da Etiqueta (Dimensão 100mm x 150mm)
              </div>

              {/* Cartão Físico da Etiqueta (Estilo Industrial Branco com Contrastes Fortes) */}
              <div className="w-full max-w-md bg-white text-slate-950 rounded-lg p-6 shadow-2xl border-4 border-slate-900 font-sans select-none">
                {/* Header da Etiqueta */}
                <div className="flex items-center justify-between border-b-2 border-slate-950 pb-3">
                  <div>
                    <span className="text-xl font-black tracking-tighter">CATASSO ERP</span>
                    <div className="text-[10px] font-bold text-slate-600 tracking-wider">
                      LOGÍSTICA INTEGRADA ANGOLA
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black bg-slate-950 text-white px-2 py-0.5 rounded">
                      {labelWarehouseId}
                    </span>
                    <div className="text-[9px] font-semibold text-slate-500 mt-0.5">
                      {warehouses.find((w) => w.id === labelWarehouseId)?.province}
                    </div>
                  </div>
                </div>

                {/* SKU & Descrição */}
                <div className="py-3 border-b-2 border-slate-950">
                  <div className="text-[10px] uppercase font-bold text-slate-500">SKU MESTRE</div>
                  <div className="text-2xl font-black font-mono tracking-tight text-slate-950">
                    {selectedLabelProduct.masterSku}
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                    {selectedLabelProduct.name}
                  </div>
                </div>

                {/* Bloco de Dados Técnicos */}
                <div className="grid grid-cols-2 gap-2 py-3 border-b-2 border-slate-950 text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500">Lote Industrial:</span>
                    <div className="font-mono font-bold text-slate-950">{labelBatch}</div>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500">Qtd Na Embalagem:</span>
                    <div className="font-mono font-bold text-slate-950">{labelQuantity} UNIDADES</div>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500">Fatura de Entrada:</span>
                    <div className="font-mono font-bold text-slate-950">{labelInvoiceRef}</div>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500">País de Origem:</span>
                    <div className="font-semibold text-slate-950">{selectedLabelProduct.originCountry}</div>
                  </div>
                </div>

                {/* QR CODE Vetorial Nítido Simulado com Dados Reais */}
                <div className="pt-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase text-slate-500">Rastreabilidade QR</div>
                    <div className="text-[9px] text-slate-600 max-w-[200px] font-mono leading-tight">
                      CATASSO://SKU:{selectedLabelProduct.masterSku}#LOTE:{labelBatch}#WH:{labelWarehouseId}
                    </div>
                    <div className="text-[9px] font-bold text-slate-700 pt-1">
                      Data Emissão: 18/10/2026 11:30
                    </div>
                  </div>

                  {/* QR Code SVG */}
                  <div className="p-2 border-2 border-slate-950 rounded bg-white">
                    <svg className="w-24 h-24" viewBox="0 0 100 100" fill="currentColor">
                      {/* Canto Sup Esq */}
                      <rect x="5" y="5" width="30" height="30" />
                      <rect x="10" y="10" width="20" height="20" fill="white" />
                      <rect x="15" y="15" width="10" height="10" />

                      {/* Canto Sup Dir */}
                      <rect x="65" y="5" width="30" height="30" />
                      <rect x="70" y="10" width="20" height="20" fill="white" />
                      <rect x="75" y="15" width="10" height="10" />

                      {/* Canto Inf Esq */}
                      <rect x="5" y="65" width="30" height="30" />
                      <rect x="10" y="70" width="20" height="20" fill="white" />
                      <rect x="15" y="75" width="10" height="10" />

                      {/* Padrão de dados simulado */}
                      <rect x="45" y="10" width="5" height="15" />
                      <rect x="55" y="5" width="5" height="20" />
                      <rect x="40" y="35" width="20" height="5" />
                      <rect x="10" y="45" width="25" height="5" />
                      <rect x="45" y="45" width="10" height="10" />
                      <rect x="65" y="45" width="15" height="5" />
                      <rect x="45" y="65" width="15" height="5" />
                      <rect x="70" y="60" width="5" height="25" />
                      <rect x="80" y="70" width="15" height="5" />
                      <rect x="45" y="80" width="10" height="15" />
                    </svg>
                  </div>
                </div>

                {/* Código de Barras Linear no Rodapé */}
                <div className="mt-4 pt-2 border-t border-slate-400 text-center">
                  <div className="font-mono text-[9px] text-slate-700 tracking-[0.3em] font-bold">
                    |||||| | |||||||| || ||||| |||| || |||||||||| ||||
                  </div>
                  <div className="font-mono text-[10px] text-slate-900 mt-0.5">
                    {selectedLabelProduct.barcode}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: SELEÇÃO DE PERFIL / INÍCIO DE SESSÃO            */}
      {/* ========================================================= */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Sessão & Perfil de Acesso</h3>
                  <p className="text-xs text-slate-400">Selecione o perfil operacional e armazém em Angola</p>
                </div>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Perfis Disponíveis */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Perfis Predefinidos:
              </label>
              {[
                {
                  role: 'Superadministrador' as UserRole,
                  wh: 'ALL',
                  name: 'Eng. António Catasso',
                  desc: 'Acesso irrestrito a todos os armazéns, métricas financeiras globais e transferências',
                },
                {
                  role: 'Gestor de Armazém' as UserRole,
                  wh: 'ARM-LUA-01',
                  name: 'Eng. Manuel Catasso',
                  desc: 'Gestão operacional de estoque, capacidade e pessoal do Pólo de Viana',
                },
                {
                  role: 'Supervisor' as UserRole,
                  wh: 'ARM-LUA-02',
                  name: 'Dra. Esperança Panzo',
                  desc: 'Aprovação de autos de conformidade e conferência física no Porto de Luanda',
                },
                {
                  role: 'Responsável de Frotas' as UserRole,
                  wh: 'ARM-LOB-03',
                  name: 'Sr. Bartolomeu Dias',
                  desc: 'Controlo de camiões porta-contentor, empilhadores e custos de manutenção',
                },
                {
                  role: 'Atendente' as UserRole,
                  wh: 'ARM-HUA-04',
                  name: 'Eng. Domingos Tchissola',
                  desc: 'Registo de saídas no balcão e emissão rápida de etiquetas de expedição',
                },
                {
                  role: 'Fornecedor' as UserRole,
                  wh: 'ALL',
                  name: 'Perkins Power Systems Rep.',
                  desc: 'Consulta de status de despachos alfandegários e faturas pendentes',
                },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRoleWarehouseSwitch(item.role, item.wh)}
                  className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                    session.role === item.role && session.warehouseId === item.wh
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{item.name}</span>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-blue-400">
                        {item.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                  <span className="text-xs font-mono text-slate-400 font-semibold">{item.wh}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: MOVIMENTO DE STOCK (ENTRADA / SAÍDA)             */}
      {/* ========================================================= */}
      {isStockMovementModalOpen && selectedProductForMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleStockMovement}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Registar Movimento de Stock</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedProductForMovement.masterSku}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsStockMovementModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tipo de Operação</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 cursor-pointer">
                    <input type="radio" name="type" value="ENTRADA" defaultChecked className="text-emerald-500" />
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <ArrowDownLeft className="w-3.5 h-3.5" /> Entrada (Kz)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 cursor-pointer">
                    <input type="radio" name="type" value="SAIDA" className="text-rose-500" />
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Saída / Baixa
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Variante do Artigo</label>
                <select
                  name="variantId"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none"
                >
                  {selectedProductForMovement.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.spec} ({v.skuVariant})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Armazém Alvo</label>
                <select
                  name="warehouseId"
                  defaultValue={session.warehouseId === 'ALL' ? 'ARM-LUA-01' : session.warehouseId}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quantidade</label>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    defaultValue="10"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Custo / Valor Unitário</label>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-mono font-bold">
                    {formatKz(selectedProductForMovement.unitCostKz)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Justificação / Nº da Guia ou Fatura</label>
                <input
                  type="text"
                  name="justification"
                  required
                  placeholder="Ex: FT-2026-8802 ou Ajuste de Inventário Físico"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsStockMovementModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow cursor-pointer"
              >
                Confirmar Movimento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: NOVA TRANSFERÊNCIA INTER-ARMAZÉM                 */}
      {/* ========================================================= */}
      {isNewTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const source = fd.get('source') as string;
              const dest = fd.get('dest') as string;
              const productId = fd.get('productId') as string;
              const qty = parseInt(fd.get('qty') as string, 10);
              const vehicle = fd.get('vehicle') as string;

              if (source === dest) {
                alert('O armazém de origem e destino não podem ser o mesmo!');
                return;
              }

              const prod = products.find((p) => p.id === productId);

              const newTransfer: InterWarehouseTransfer = {
                id: `TRF-${Date.now().toString().slice(-4)}`,
                transferCode: `TRF-CAT-2026-${Math.floor(100 + Math.random() * 900)}`,
                sourceWarehouseId: source,
                destWarehouseId: dest,
                masterSku: prod?.masterSku || 'SKU-CAT-8801',
                productName: prod?.name || 'Artigo de Transferência',
                variantSpec: prod?.variants[0]?.spec || 'Padrão',
                quantity: qty,
                requestedBy: session.name,
                requestDate: '2026-10-18',
                vehiclePlate: vehicle,
                status: 'Pendente',
                nationalGuideNumber: 'GTN-PENDENTE',
                estimatedArrival: '2026-10-22',
              };

              setTransfers((prev) => [newTransfer, ...prev]);
              setIsNewTransferModalOpen(false);
              showToast('Nova solicitação de transferência criada com sucesso!');
            }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-400" />
                Nova Guia de Transferência Inter-Armazéns
              </h3>
              <button
                type="button"
                onClick={() => setIsNewTransferModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Armazém Origem</label>
                  <select
                    name="source"
                    defaultValue="ARM-LUA-01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} ({w.province})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Armazém Destino</label>
                  <select
                    name="dest"
                    defaultValue="ARM-HUA-04"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} ({w.province})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Produto a Transferir</label>
                <select
                  name="productId"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.masterSku} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quantidade</label>
                  <input
                    type="number"
                    name="qty"
                    min="1"
                    defaultValue="25"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Viatura da Frota</label>
                  <select
                    name="vehicle"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  >
                    {fleet.map((f) => (
                      <option key={f.id} value={f.plate}>
                        {f.plate} ({f.model.slice(0, 20)}...)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewTransferModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow cursor-pointer"
              >
                Emitir Pedido de Transferência
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: NOVO SKU MESTRE                                  */}
      {/* ========================================================= */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const name = fd.get('name') as string;
              const cat = fd.get('category') as MasterProduct['category'];
              const cost = parseFloat(fd.get('cost') as string);
              const price = parseFloat(fd.get('price') as string);
              const origin = fd.get('origin') as string;
              const spec = fd.get('spec') as string;

              const masterSku = `SKU-CAT-${Math.floor(1000 + Math.random() * 9000)}`;

              const newProd: MasterProduct = {
                id: `PRD-${Date.now().toString().slice(-4)}`,
                masterSku,
                name,
                category: cat,
                unitCostKz: cost,
                unitPriceKz: price,
                originCountry: origin || 'Angola',
                batchNumber: `LOTE-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
                barcode: `5601234${Math.floor(100000 + Math.random() * 900000)}`,
                weightKg: 25,
                variants: [
                  {
                    id: `VAR-${Date.now().toString().slice(-3)}`,
                    skuVariant: `${masterSku}-VAR1`,
                    spec: spec || 'Especificação Padrão',
                    stockByWarehouse: {
                      'ARM-LUA-01': 50,
                      'ARM-LUA-02': 20,
                    },
                    reorderPoint: 15,
                  },
                ],
              };

              setProducts((prev) => [newProd, ...prev]);
              setIsNewProductModalOpen(false);
              showToast(`Produto ${masterSku} cadastrado com sucesso no catálogo mestre!`);
            }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-400" />
                Cadastrar Novo Artigo (SKU Mestre)
              </h3>
              <button
                type="button"
                onClick={() => setIsNewProductModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Comercial do Produto</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Ex: Gerador Silencioso 60kVA ou Farinha de Trigo 25kg"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoria Logística</label>
                  <select
                    name="category"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                  >
                    <option value="Construção & Obras">Construção & Obras</option>
                    <option value="Eletrodomésticos & Energia">Eletrodomésticos & Energia</option>
                    <option value="Alimentar & Bebidas">Alimentar & Bebidas</option>
                    <option value="Peças & Maquinaria">Peças & Maquinaria</option>
                    <option value="Químicos & Fito">Químicos & Fito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">País / Fabrico de Origem</label>
                  <input
                    type="text"
                    name="origin"
                    defaultValue="Angola"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Custo Unitário em Kwanzas (Kz)</label>
                  <input
                    type="number"
                    name="cost"
                    min="1"
                    defaultValue="45000"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">PVP Estimado (Kz)</label>
                  <input
                    type="number"
                    name="price"
                    min="1"
                    defaultValue="60000"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Variante Inicial / Especificação</label>
                <input
                  type="text"
                  name="spec"
                  defaultValue="Modelo Standard / 220V"
                  placeholder="Ex: Cor Azul, Tamanho XL, 50kg, etc."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewProductModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow cursor-pointer"
              >
                Gravar SKU Mestre
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: REGISTAR NOVO ENVIO DE FORNECEDOR                */}
      {/* ========================================================= */}
      {isNewShipmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const supplier = fd.get('supplier') as string;
              const origin = fd.get('origin') as string;
              const val = parseFloat(fd.get('valueKz') as string);
              const destWh = fd.get('destWh') as string;
              const bl = fd.get('bl') as string;

              const newShp: SupplierShipment = {
                id: `SHP-${Date.now().toString().slice(-4)}`,
                shipmentNumber: `CAT-IMP-2026-${Math.floor(100 + Math.random() * 900)}`,
                supplierName: supplier,
                originPort: origin,
                destinationWarehouseId: destWh,
                invoiceNumber: `FT-${Math.floor(10000 + Math.random() * 90000)}`,
                blNumber: bl || `BL-CAT-${Math.floor(1000 + Math.random() * 9000)}`,
                duNumber: `DU-AGT-2026-${Math.floor(100000 + Math.random() * 900000)}-LUA`,
                totalValueKz: val,
                customsTaxKz: Math.round(val * 0.14),
                step: 1,
                status: 'expedido',
                estimatedArrival: '2026-11-15',
                customsStatus: 'Em Análise',
                inspectionNotes: 'Carga despachada na origem com manifesto eletrónico enviado à alfândega.',
                items: [
                  {
                    masterSku: products[0].masterSku,
                    productName: products[0].name,
                    quantity: 500,
                    unit: 'unidades',
                  },
                ],
              };

              setShipments((prev) => [newShp, ...prev]);
              setIsNewShipmentModalOpen(false);
              showToast('Novo envio de fornecedor criado com sucesso no pipeline de rastreio!');
            }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Ship className="w-5 h-5 text-blue-400" />
                Registar Envio de Fornecedor & Importação
              </h3>
              <button
                type="button"
                onClick={() => setIsNewShipmentModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome do Fornecedor</label>
                <input
                  type="text"
                  name="supplier"
                  required
                  placeholder="Ex: Scania Sweden ou Cimangola S.A."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Porto / Local de Embarque</label>
                  <input
                    type="text"
                    name="origin"
                    required
                    placeholder="Ex: Antuérpia, Lisboa ou Luanda"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Armazém de Descarga</label>
                  <select
                    name="destWh"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} - {w.province}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valor Total em Kwanzas (Kz)</label>
                  <input
                    type="number"
                    name="valueKz"
                    min="1000"
                    defaultValue="35000000"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Guia de Carga (B/L ou CMR)</label>
                  <input
                    type="text"
                    name="bl"
                    defaultValue="MSCU-LUA-2026-91"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewShipmentModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow cursor-pointer"
              >
                Iniciar Rastreio em 3 Passos
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: MANUTENÇÃO DE FROTA                             */}
      {/* ========================================================= */}
      {isFleetMaintenanceModalOpen && selectedVehicleForMaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const costKz = parseFloat(fd.get('costKz') as string);
              const notes = fd.get('notes') as string;
              const nextKm = parseInt(fd.get('nextKm') as string, 10);

              setFleet((prev) =>
                prev.map((f) => {
                  if (f.id !== selectedVehicleForMaint.id) return f;
                  return {
                    ...f,
                    status: 'Operacional',
                    lastMaintenance: '2026-10-18',
                    nextMaintenanceKm: nextKm || f.nextMaintenanceKm + 15000,
                  };
                })
              );

              setIsFleetMaintenanceModalOpen(false);
              showToast(
                `Revisão de ${formatKz(costKz)} registada para a viatura ${selectedVehicleForMaint.plate}! (${notes})`
              );
            }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Registar Manutenção</h3>
                <p className="text-xs text-blue-400 font-mono">
                  {selectedVehicleForMaint.plate} - {selectedVehicleForMaint.model}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFleetMaintenanceModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Custo da Oficina (Kz)</label>
                  <input
                    type="number"
                    name="costKz"
                    min="0"
                    defaultValue="450000"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Próx. Revisão (Km)</label>
                  <input
                    type="number"
                    name="nextKm"
                    defaultValue={selectedVehicleForMaint.nextMaintenanceKm + 15000}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Relatório Técnico / Peças Substituídas</label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue="Mudança de óleo sintético, filtros de gasóleo e pastilhas de travão."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsFleetMaintenanceModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow cursor-pointer"
              >
                Homologar Manutenção
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RODAPÉ DO CATASSO ERP */}
      <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-500 text-xs py-4 px-4 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">CATASSO ERP Logística Enterprise</span>
            <span>•</span>
            <span>República de Angola</span>
            <span>•</span>
            <span className="font-mono text-emerald-400 font-semibold">Moeda: Kwanza (AOA)</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Polo de Viana • Porto de Luanda • Corredor do Lobito • Huambo • Fútila
          </div>
        </div>
      </footer>
    </div>
  );
}
