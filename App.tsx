import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  Building2,
  Package,
  Truck,
  TrendingUp,
  AlertTriangle,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  Layers,
  DollarSign,
  FileText,
  ArrowLeftRight,
  QrCode,
  ShieldCheck,
  UserCheck,
  Wrench,
  Upload,
  CheckSquare
} from 'lucide-react';

// --- FORMATADOR MONETÁRIO AOA (KWANZA ANGOLANO) ---
const formatAOA = (amount: number) => {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    minimumFractionDigits: 2
  }).format(amount).replace('AOA', 'Kz');
};

// --- DADOS ESTRUTURAIS DE BASE (FALLBACK RESILIENTE) ---
const WAREHOUSES = [
  { id: 'wh-1', name: 'Armazém Central - Luanda (Viana)', location: 'Luanda', manager: 'Carlos Silva' },
  { id: 'wh-2', name: 'Entreposto Logístico - Lobito', location: 'Benguela', manager: 'Afonso Pedro' },
  { id: 'wh-3', name: 'Centro de Distribuição - Huambo', location: 'Huambo', manager: 'Teresa Costa' }
];

const ROLES = [
  { id: 'super_admin', label: 'Superadministrador (Global)' },
  { id: 'wh_manager', label: 'Gestor de Armazém' },
  { id: 'supervisor', label: 'Supervisor de Área / Requisitante' },
  { id: 'fleet_manager', label: 'Responsável de Frotas & Equipamentos' },
  { id: 'supplier', label: 'Fornecedor Externo' }
];

// PRODUTOS MESTRE (SKU UNIFICADO)
const MASTER_SKUS = [
  { 
    id: 'SKU-LUV-001', 
    name: 'Luva de Proteção Tipo Ninja', 
    category: 'EPI / Segurança', 
    unit: 'Par',
    variants: [
      { size: 'L', color: 'Preta', totalGlobal: 600 },
      { size: 'XL', color: 'Cinza', totalGlobal: 400 }
    ]
  },
  { 
    id: 'SKU-CIM-032', 
    name: 'Cimento CP-32 (Saco 50kg)', 
    category: 'Construção', 
    unit: 'Saco',
    variants: [
      { size: '50kg', color: 'Padrão', totalGlobal: 2500 }
    ]
  },
  { 
    id: 'SKU-OL-005', 
    name: 'Óleo Alimentar 5L', 
    category: 'Alimentar / Consumo', 
    unit: 'Bidão',
    variants: [
      { size: '5L', color: 'Amarelo', totalGlobal: 1200 }
    ]
  }
];

// INVENTÁRIO ESPECÍFICO POR ARMAZÉM
const LOCAL_INVENTORY = [
  { warehouseId: 'wh-1', skuId: 'SKU-LUV-001', variant: 'L / Preta', quantity: 450, minStock: 100, unitPriceAOA: 3500 },
  { warehouseId: 'wh-1', skuId: 'SKU-CIM-032', variant: '50kg', quantity: 200, minStock: 500, unitPriceAOA: 4800 },
  { warehouseId: 'wh-2', skuId: 'SKU-LUV-001', variant: 'XL / Cinza', quantity: 150, minStock: 50, unitPriceAOA: 3500 },
  { warehouseId: 'wh-2', skuId: 'SKU-OL-005', variant: '5L', quantity: 1200, minStock: 200, unitPriceAOA: 18500 },
  { warehouseId: 'wh-3', skuId: 'SKU-CIM-032', variant: '50kg', quantity: 2300, minStock: 300, unitPriceAOA: 4800 }
];

// ENVIOS DE FORNECEDORES (RASTREIO EM 3 ETAPAS)
const SUPPLIER_SHIPMENTS = [
  {
    id: 'ENV-2026-089',
    supplier: 'Angola Cimentos S.A.',
    targetWarehouseId: 'wh-1',
    skuId: 'SKU-CIM-032',
    quantity: 1000,
    statusStep: 2, // 1: Envio Fornecedor | 2: Alfândega/Trânsito | 3: Chegada e Receção
    invoiceNumber: 'FT-99482/2026',
    invoiceDocAttached: true,
    customsDocAttached: true,
    receiptDocAttached: false,
    discrepancyReported: false
  },
  {
    id: 'ENV-2026-092',
    supplier: 'EPI Proteção Angola',
    targetWarehouseId: 'wh-2',
    skuId: 'SKU-LUV-001',
    quantity: 300,
    statusStep: 1,
    invoiceNumber: 'FT-10293/2026',
    invoiceDocAttached: true,
    customsDocAttached: false,
    receiptDocAttached: false,
    discrepancyReported: false
  }
];

// FROTAS E EQUIPAMENTOS COM CUSTOS DE ALUGUER INTERNO
const FLEET_EQUIPMENT = [
  { id: 'EQ-01', plate: 'LD-45-89-GX', name: 'Volvo FH16 540 (30 Tons)', currentWarehouseId: 'wh-1', monthlyRentAOA: 2500000, status: 'Operacional', lastMaintenanceAOA: 450000 },
  { id: 'EQ-02', plate: 'LD-12-34-HN', name: 'Empilhadora CAT 5T', currentWarehouseId: 'wh-1', monthlyRentAOA: 850000, status: 'Operacional', lastMaintenanceAOA: 120000 },
  { id: 'EQ-03', plate: 'BG-88-21-AA', name: 'Isuzu FVR 13T', currentWarehouseId: 'wh-2', monthlyRentAOA: 1800000, status: 'Manutenção', lastMaintenanceAOA: 680000 }
];

export default function App() {
  // SESSÃO E CONTEXTO DE TRABALHO
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('wh-1'); // 'all' para SuperAdmin
  const [userRole, setUserRole] = useState<string>('wh_manager');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'shipments' | 'transfers' | 'fleet' | 'labels'>('dashboard');

  // ESTADOS DE DADOS
  const [inventory, setInventory] = useState(LOCAL_INVENTORY);
  const [shipments, setShipments] = useState(SUPPLIER_SHIPMENTS);
  const [fleet, setFleet] = useState(FLEET_EQUIPMENT);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabelSku, setSelectedLabelSku] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // ARMAZÉM ATIVO
  const currentWarehouse = useMemo(() => {
    return WAREHOUSES.find(w => w.id === selectedWarehouseId) || null;
  }, [selectedWarehouseId]);

  // FILTRAGEM DO INVENTÁRIO COM BASE NO ARMAZÉM SELECIONADO
  const visibleInventory = useMemo(() => {
    if (selectedWarehouseId === 'all') return inventory;
    return inventory.filter(item => item.warehouseId === selectedWarehouseId);
  }, [inventory, selectedWarehouseId]);

  // CÁLCULOS FINANCEIROS EM AOA
  const warehouseTotalValueAOA = useMemo(() => {
    return visibleInventory.reduce((acc, item) => acc + (item.quantity * item.unitPriceAOA), 0);
  }, [visibleInventory]);

  const criticalItems = useMemo(() => {
    return visibleInventory.filter(item => item.quantity <= item.minStock);
  }, [visibleInventory]);

  // CUSTO MENSAL DE ALUGUER DE FROTAS DO ARMAZÉM ATIVO
  const activeWarehouseFleetRentAOA = useMemo(() => {
    const activeVehicles = selectedWarehouseId === 'all' 
      ? fleet 
      : fleet.filter(eq => eq.currentWarehouseId === selectedWarehouseId);
    return activeVehicles.reduce((acc, v) => acc + v.monthlyRentAOA, 0);
  }, [fleet, selectedWarehouseId]);

  // CARREGAMENTO SUPABASE COM RESILIÊNCIA
  const syncWithSupabase = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setIsSyncing(true);
    try {
      const { data: invData } = await supabase.from('local_inventory').select('*');
      if (invData && invData.length > 0) setInventory(invData);
    } catch (err) {
      console.warn('Operando com cache local resiliente:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    syncWithSupabase();
  }, [syncWithSupabase]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* BARRA SUPERIOR DE CONTEXTO E TROCA DE ARMAZÉM */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 px-3 py-1.5 rounded-lg text-white font-black tracking-widest text-xl">
              CATASSO
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 leading-tight">ERP Logístico Enterprise</h1>
              <p className="text-xs text-blue-400">Angola Operations (AOA)</p>
            </div>
          </div>

          {/* SELEÇÃO DE ARMAZÉM E PERFIL DE ACESSO */}
          <div className="flex flex-wrap items-center gap-3">
            {/* SELETOR DE ARMAZÉM */}
            <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
              <Building2 className="w-4 h-4 text-blue-400" />
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">🌐 Todos os Armazéns (Visão Global)</option>
                {WAREHOUSES.map(w => (
                  <option key={w.id} value={w.id} className="bg-slate-900">
                    🏢 {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* SELETOR DE PERFIL DE ACESSO */}
            <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                {ROLES.map(r => (
                  <option key={r.id} value={r.id} className="bg-slate-900">{r.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={syncWithSupabase}
              disabled={isSyncing}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
              title="Sincronizar Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>

        </div>
      </header>

      {/* MENU PRINCIPAL DE NAVEGAÇÃO POR MÓDULOS */}
      <nav className="bg-slate-900/60 border-b border-slate-800 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto space-x-6 text-sm">
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-3 px-1 border-b-2 font-medium flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'dashboard' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-3 px-1 border-b-2 font-medium flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'inventory' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Inventário SKU & Stock</span>
          </button>

          <button
            onClick={() => setActiveTab('shipments')}
            className={`py-3 px-1 border-b-2 font-medium flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'shipments' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Envios de Fornecedores (3 Passos)</span>
          </button>

          <button
            onClick={() => setActiveTab('transfers')}
            className={`py-3 px-1 border-b-2 font-medium flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'transfers' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Transferências Inter-Armazéns</span>
          </button>

          <button
            onClick={() => setActiveTab('fleet')}
            className={`py-3 px-1 border-b-2 font-medium flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'fleet' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Frotas & Equipamentos</span>
          </button>

          <button
            onClick={() => setActiveTab('labels')}
            className={`py-3 px-1 border-b-2 font-medium flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'labels' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Etiquetas & QR Code</span>
          </button>

        </div>
      </nav>

      {/* ÁREA DE TRABALHO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* --- 1. DASHBOARD COMPLETO --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* CARDS KPIS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <div className="flex justify-between items-center text-slate-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Valor do Stock Local</span>
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-slate-100">{formatAOA(warehouseTotalValueAOA)}</div>
                <span className="text-xs text-slate-500 mt-1 block">
                  {selectedWarehouseId === 'all' ? 'Consolidado de Angola' : currentWarehouse?.name}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <div className="flex justify-between items-center text-slate-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Reposição Crítica</span>
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400">{criticalItems.length} SKUs</div>
                <span className="text-xs text-slate-500 mt-1 block">Abaixo do nível mínimo</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <div className="flex justify-between items-center text-slate-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Custos Frotas (Imputados)</span>
                  <Wrench className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-slate-100">{formatAOA(activeWarehouseFleetRentAOA)}</div>
                <span className="text-xs text-slate-500 mt-1 block">Aluguer/Imputação mensal</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <div className="flex justify-between items-center text-slate-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Envios em Trânsito</span>
                  <Truck className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-slate-100">
                  {shipments.filter(s => s.statusStep < 3).length} Encomendas
                </div>
                <span className="text-xs text-slate-500 mt-1 block">Aguardam confirmação no destino</span>
              </div>
            </div>

            {/* TABELA DE SEGURANÇA E ALERTAS */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Visão Geral do Armazém Ativo: {currentWarehouse?.name || 'Visão Consolidada'}</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Responsável pelo Armazém: <strong className="text-slate-200">{currentWarehouse?.manager || 'Superadministração'}</strong> | Localização: {currentWarehouse?.location || 'Angola'}
              </p>
            </div>

          </div>
        )}

        {/* --- 2. INVENTÁRIO SKU MESTRE + VARIANTES --- */}
        {activeTab === 'inventory' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Pesquisar por Código SKU, Nome do Produto, Tamanho ou Cor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg font-medium flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Dar Entrada de Material</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Código SKU Mestre</th>
                    <th className="p-3">Descrição do Produto</th>
                    <th className="p-3">Atributo / Variante</th>
                    <th className="p-3">Armazém</th>
                    <th className="p-3 text-right">Qtd. Local</th>
                    <th className="p-3 text-right">Preço Unit. (AOA)</th>
                    <th className="p-3 text-right">Subtotal (AOA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {visibleInventory.map((item, idx) => {
                    const master = MASTER_SKUS.find(m => m.id === item.skuId);
                    const warehouse = WAREHOUSES.find(w => w.id === item.warehouseId);
                    return (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-xs text-blue-400 font-semibold">{item.skuId}</td>
                        <td className="p-3 font-medium text-slate-100">{master?.name || 'Produto Mestre'}</td>
                        <td className="p-3"><span className="bg-slate-800 px-2 py-0.5 rounded text-xs text-slate-300">{item.variant}</span></td>
                        <td className="p-3 text-xs text-slate-400">{warehouse?.name}</td>
                        <td className="p-3 text-right font-bold text-slate-100">{item.quantity}</td>
                        <td className="p-3 text-right">{formatAOA(item.unitPriceAOA)}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">{formatAOA(item.quantity * item.unitPriceAOA)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 3. GESTÃO DE ENVIOS DE FORNECEDORES (3 ETAPAS) --- */}
        {activeTab === 'shipments' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-100">Rastreio de Envios de Fornecedores (3 Passos)</h3>
              <p className="text-xs text-slate-400">Acompanhamento em tempo real desde a expedição até ao auto de receção em armazém.</p>
            </div>

            <div className="space-y-4">
              {shipments.map((s) => {
                const targetWh = WAREHOUSES.find(w => w.id === s.targetWarehouseId);
                const master = MASTER_SKUS.find(m => m.id === s.skuId);

                return (
                  <div key={s.id} className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-xs font-mono text-blue-400 font-bold">{s.id}</span>
                        <h4 className="text-sm font-bold text-slate-100">{s.supplier} ➔ {targetWh?.name}</h4>
                        <p className="text-xs text-slate-400">Produto: {master?.name} | Quantidade: {s.quantity} unidades</p>
                      </div>
                      <div className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-300">
                        Nº Fatura: <strong>{s.invoiceNumber}</strong>
                      </div>
                    </div>

                    {/* INDICADOR DOS 3 PASSOS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      
                      {/* PASSO 1 */}
                      <div className={`p-3 rounded-lg border text-xs ${s.statusStep >= 1 ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                        <div className="flex items-center space-x-2 font-bold mb-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>1. Expedição (Fornecedor)</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Fatura/Guia de Envio Anexada</p>
                      </div>

                      {/* PASSO 2 */}
                      <div className={`p-3 rounded-lg border text-xs ${s.statusStep >= 2 ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                        <div className="flex items-center space-x-2 font-bold mb-1">
                          <Clock className="w-4 h-4" />
                          <span>2. Alfândega / Trânsito</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Controlo Documental Local</p>
                      </div>

                      {/* PASSO 3 */}
                      <div className={`p-3 rounded-lg border text-xs ${s.statusStep >= 3 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                        <div className="flex items-center space-x-2 font-bold mb-1">
                          <CheckSquare className="w-4 h-4" />
                          <span>3. Receção em Armazém</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Auto de Receção & Conformidade</p>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- 4. FROTAS, MANUTENÇÃO E ALUGUER INTERNO --- */}
        {activeTab === 'fleet' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">Controlo de Frotas & Imputação de Custos em AOA</h3>
              <p className="text-xs text-slate-400">Gerido pelo Responsável de Frotas com custos alocados ao Armazém utente.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {fleet.map((eq) => {
                const wh = WAREHOUSES.find(w => w.id === eq.currentWarehouseId);
                return (
                  <div key={eq.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-mono text-blue-400">{eq.id}</span>
                        <h4 className="text-sm font-bold text-slate-100">{eq.plate}</h4>
                        <p className="text-xs text-slate-400">{eq.name}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${eq.status === 'Operacional' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                        {eq.status}
                      </span>
                    </div>

                    <div className="border-t border-slate-800 pt-2 text-xs space-y-1 text-slate-400">
                      <p>Alocado a: <strong className="text-slate-200">{wh?.name}</strong></p>
                      <p>Aluguer Mensal Imputado: <strong className="text-emerald-400">{formatAOA(eq.monthlyRentAOA)}</strong></p>
                      <p>Manutenção Recente: <strong className="text-slate-300">{formatAOA(eq.lastMaintenanceAOA)}</strong></p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- 5. ETIQUETAS & GERADOR QR CODE --- */}
        {activeTab === 'labels' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-100">Geração de Etiquetas e Rastreabilidade de Origem</h3>
              <p className="text-xs text-slate-400">Emissão de etiquetas com origem de fornecedor, nº de fatura e código de rastreio.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-xs text-slate-400 font-medium">Selecione o Artigo para Gerar Etiqueta:</label>
                <select 
                  onChange={(e) => setSelectedLabelSku(visibleInventory[parseInt(e.target.value)])}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200"
                >
                  <option value="">-- Selecione um Produto --</option>
                  {visibleInventory.map((item, i) => (
                    <option key={i} value={i}>{item.skuId} - {item.variant}</option>
                  ))}
                </select>
              </div>

              {/* VISUALIZAÇÃO DA ETIQUETA */}
              {selectedLabelSku && (
                <div className="bg-white text-slate-900 p-6 rounded-xl space-y-3 font-mono shadow-2xl">
                  <div className="border-b-2 border-slate-900 pb-2 flex justify-between items-center">
                    <span className="font-black text-lg">CATASSO LOGÍSTICA</span>
                    <span className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded">ORIGEM VALIDADA</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">CÓDIGO SKU MESTRE</p>
                    <p className="text-xl font-bold">{selectedLabelSku.skuId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">VARIANTE / ATRIBUTO</p>
                    <p className="text-sm font-semibold">{selectedLabelSku.variant}</p>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-300 pt-2 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-500">ORIGEM / DOCUMENTO</p>
                      <p className="font-bold">FT-99482/2026 (Angola Cimentos)</p>
                    </div>
                    <div className="bg-slate-200 p-2 rounded">
                      <QrCode className="w-8 h-8 text-slate-900" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* RODAPÉ INSTITUCIONAL */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          CATASSO ERP © 2026 — Plataforma de Gestão Logística Enterprise | República de Angola
        </div>
      </footer>
    </div>
  );
}
