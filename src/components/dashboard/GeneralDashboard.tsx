import React from 'react';
import { erpStore } from '../../services/store';
import { catalogService } from '../../services/catalogService';
import { formatAOA, translations } from '../../services/i18n';
import {
  Boxes,
  AlertTriangle,
  ShoppingCart,
  Truck,
  Wrench,
  AlertOctagon,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tabId: string) => void;
}

export const GeneralDashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const currentUser = erpStore.currentUser;
  const activeWarehouse = erpStore.getActiveWarehouse();
  const t = translations[erpStore.language];

  // Calculate live statistics
  const totalCatalogSkus = catalogService.getTotalCatalogCount();

  // Pending orders in this warehouse
  const pendingOrders = erpStore.purchaseOrders.filter(
    po =>
      (currentUser?.role === 'superadmin' || po.warehouseId === activeWarehouse?.id) &&
      (po.status === 'solicitado' || po.status === 'aprovado' || po.status === 'em_transito')
  );

  // Active shipments
  const activeShipments = erpStore.shipments.filter(
    s =>
      (currentUser?.role === 'superadmin' || s.warehouseId === activeWarehouse?.id) &&
      s.status !== 'entregue' &&
      s.status !== 'cancelado'
  );

  // Active equipment
  const activeEquipment = erpStore.equipment.filter(
    e => currentUser?.role === 'superadmin' || currentUser?.role === 'gestor_frotas' || e.warehouseId === activeWarehouse?.id
  );
  const operationalCount = activeEquipment.filter(e => e.condition === 'operacional').length;
  const equipmentReadiness = activeEquipment.length > 0 ? Math.round((operationalCount / activeEquipment.length) * 100) : 100;

  // Open RNCs
  const openRncs = erpStore.rncs.filter(
    r =>
      (currentUser?.role === 'superadmin' || r.warehouseId === activeWarehouse?.id) &&
      r.status !== 'resolvida' &&
      r.status !== 'cancelada'
  );

  // Chemical & Calibrated items check
  const chemicalList = catalogService.getChemicalProducts(activeWarehouse?.id || 'wh-luanda');
  const calibratedList = catalogService.getCalibratedProducts(activeWarehouse?.id || 'wh-luanda');

  // Low stock query
  const lowStockResult = catalogService.searchProducts({
    warehouseId: activeWarehouse?.id,
    onlyLowStock: true,
    pageSize: 10,
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Context */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              <span>CATASSO ERP · {activeWarehouse?.name} ({activeWarehouse?.province})</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">
              Olá, {currentUser?.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Bem-vindo ao painel central de controle. Monitorização em tempo real de suprimentos industriais,
              posições de frotas, trâmites de fornecedores e controle de qualidade para  Angola.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-950/80 border border-slate-800 px-4 py-2 rounded text-right">
              <div className="text-[10px] text-slate-500 uppercase font-mono">Moeda Nacional</div>
              <div className="text-sm font-bold text-emerald-400 font-mono">Kwanza Angolano (AOA)</div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 px-4 py-2 rounded text-right">
              <div className="text-[10px] text-slate-500 uppercase font-mono">Nível de Acesso</div>
              <div className="text-sm font-bold text-sky-400 uppercase">{currentUser?.role.replace('_', ' ')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Catalog SKUs */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Catálogo Global</span>
            <Boxes className="w-5 h-5 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {totalCatalogSkus.toLocaleString('pt-AO')} <span className="text-xs font-normal text-slate-400">SKUs</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Sequência Única Industrial</span>
            <button
              onClick={() => onNavigate('catalog')}
              className="text-sky-400 hover:underline flex items-center gap-0.5"
            >
              Consultar <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Estoque Mínimo</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {lowStockResult.totalCount} <span className="text-xs font-normal text-amber-400">em alerta</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Abaixo da margem segura</span>
            <button
              onClick={() => onNavigate('catalog')}
              className="text-amber-400 hover:underline flex items-center gap-0.5"
            >
              Ver itens <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Pending Purchases / Dispatches */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Compras & Envios</span>
            <Truck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {pendingOrders.length} <span className="text-xs font-normal text-slate-400">pedidos ativos</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{activeShipments.length} em trânsito no país</span>
            <button
              onClick={() => onNavigate(currentUser?.role === 'fornecedor' ? 'supplierPortal' : 'purchases')}
              className="text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              Acompanhar <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Open Non-Conformances (RNC) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Não Conformidades (RNC)</span>
            <AlertOctagon className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {openRncs.length} <span className="text-xs font-normal text-red-400">abertas</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Auditoria de carga e falhas</span>
            <button
              onClick={() => onNavigate('rnc')}
              className="text-red-400 hover:underline flex items-center gap-0.5"
            >
              Gerir RNCs <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Automations & Live Triggers Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Painel de Análise e Automações de Fluxo Integradas
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Gatilho de Reposição Automática</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900">
                Ativo
              </span>
            </div>
            <p className="text-slate-400 mt-1 text-[11px] leading-relaxed">
              Dispara notificação aos Responsáveis e Gestores assim que qualquer item cruzar a marca de segurança local.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Monitor EIMES & Validades FISPQ</span>
              <span className="text-[10px] font-mono text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-900">
                Conforme
              </span>
            </div>
            <p className="text-slate-400 mt-1 text-[11px] leading-relaxed">
              Varredura periódica de certificados de calibração metrológica e datas de vencimento de produtos químicos.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Disponibilidade Operacional de Frotas</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900">
                {equipmentReadiness}% Prontidão
              </span>
            </div>
            <p className="text-slate-400 mt-1 text-[11px] leading-relaxed">
              Cálculo contínuo de depreciação contábil, custos de manutenção por equipamento e consumo médio de combustível.
            </p>
          </div>
        </div>
      </div>

      {/* Two columns: Recent Stock Movements + Active Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movements */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Últimas Movimentações no Armazém</h2>
              <p className="text-[11px] text-slate-400">Entradas, Saídas e Devoluções recentes</p>
            </div>
            <button
              onClick={() => onNavigate('movements')}
              className="text-xs text-sky-400 hover:underline font-medium"
            >
              Ver todas
            </button>
          </div>

          <div className="space-y-2">
            {erpStore.movements.slice(0, 5).map(m => {
              const isEntrada = m.type.startsWith('entrada_');
              return (
                <div
                  key={m.id}
                  className="p-3 bg-slate-950/80 border border-slate-800/80 rounded flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                        isEntrada ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                      }`}
                    >
                      {isEntrada ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 leading-tight">{m.productName}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {m.productSku} · {m.originReference || m.type}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`font-bold font-mono ${isEntrada ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isEntrada ? '+' : '-'}{m.quantity} UN
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{formatAOA(m.totalPriceAOA)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Orders & Shipments */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Trâmites de Compras & Envios</h2>
              <p className="text-[11px] text-slate-400">Status dos pedidos em andamento com fornecedores</p>
            </div>
            <button
              onClick={() => onNavigate('purchases')}
              className="text-xs text-sky-400 hover:underline font-medium"
            >
              Gestão de compras
            </button>
          </div>

          <div className="space-y-2">
            {erpStore.purchaseOrders.slice(0, 5).map(po => {
              const statusColor =
                po.status === 'comprado'
                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900'
                  : po.status === 'em_transito'
                  ? 'text-sky-400 bg-sky-950/40 border-sky-900'
                  : po.status === 'aprovado'
                  ? 'text-indigo-400 bg-indigo-950/40 border-indigo-900'
                  : 'text-amber-400 bg-amber-950/40 border-amber-900';

              return (
                <div
                  key={po.id}
                  className="p-3 bg-slate-950/80 border border-slate-800/80 rounded flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono">{po.orderNumber}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-mono ${statusColor}`}>
                        {po.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Fornecedor: <span className="text-slate-200">{po.supplierName}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {po.items.length} itens · Solicitado por: {po.requesterName}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold text-slate-200 font-mono">{formatAOA(po.totalEstimatedAOA)}</div>
                    <button
                      onClick={() => onNavigate('receiving')}
                      className="mt-1 text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-sky-300 font-medium"
                    >
                      Inspecionar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
