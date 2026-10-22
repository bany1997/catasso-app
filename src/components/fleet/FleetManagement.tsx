import React, { useState } from 'react';
import { erpStore } from '../../services/store';
import { formatAOA } from '../../services/i18n';
import { exportToExcel, printFormalDocument } from '../../services/exportService';
import { Equipment, EquipmentCondition, MaintenanceRecord, ServiceRequest } from '../../types';
import {
  Wrench,
  Truck,
  Gauge,
  Calendar,
  AlertTriangle,
  Plus,
  Edit2,
  FileSpreadsheet,
  Printer,
  FileText,
  UserCheck,
  Fuel,
  TrendingDown,
  Building2,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';

export const FleetManagement: React.FC = () => {
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('all');
  const [selectedConditionFilter, setSelectedConditionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState(''); // Estado para a barra de pesquisa
  
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  // New Equipment Modal
  const [isNewEquipModalOpen, setIsNewEquipModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('FRO-LUA-VEQ01');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'empilhadeira' | 'camiao' | 'grua' | 'gerador' | 'veiculo_leve'>('empilhadeira');
  const [newWarehouseId, setNewWarehouseId] = useState(erpStore.selectedWarehouseId);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newAcquisitionCost, setNewAcquisitionCost] = useState(25000000);
  const [newDepreciationRate, setNewDepreciationRate] = useState(15);
  const [newMonthlyRental, setNewMonthlyRental] = useState(1200000);
  const [newConsumption, setNewConsumption] = useState('5.0 L/hora');

  // Maintenance record modal
  const [isNewMaintModalOpen, setIsNewMaintModalOpen] = useState(false);
  const [maintType, setMaintType] = useState<'preventiva' | 'corretiva' | 'preditiva' | 'inspecao'>('preventiva');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintCostAOA, setMaintCostAOA] = useState(250000);
  const [maintParts, setMaintParts] = useState('');
  const [maintProvider, setMaintProvider] = useState('Oficina Central Viana');

  // Service Request modal
  const [isNewServiceReqOpen, setIsNewServiceReqOpen] = useState(false);
  const [srvType, setSrvType] = useState<'reparo' | 'manutencao_preventiva' | 'abastecimento' | 'peca_reposicao'>('reparo');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvPriority, setSrvPriority] = useState<'normal' | 'alta' | 'urgente'>('alta');

  const currentUser = erpStore.currentUser;
  const activeWh = erpStore.getActiveWarehouse();

  const isFleetManager = currentUser?.role === 'gestor_frotas' || currentUser?.role === 'superadmin';

  // Cross-warehouse fleet scope + filters + Search Query matching
  const visibleFleet = erpStore.equipment.filter(eq => {
    if (!isFleetManager && eq.warehouseId !== activeWh?.id) {
      return false;
    }
    if (selectedWarehouseFilter !== 'all' && eq.warehouseId !== selectedWarehouseFilter) {
      return false;
    }
    if (selectedConditionFilter !== 'all' && eq.condition !== selectedConditionFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = eq.code.toLowerCase().includes(q);
      const matchName = eq.name.toLowerCase().includes(q);
      const matchDriver = (eq.assignedDriverName || '').toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchDriver) return false;
    }
    return true;
  });

  // Calculate totals
  const totalFleetValue = visibleFleet.reduce((sum, e) => sum + e.currentValueAOA, 0);
  const totalRepairs = visibleFleet.reduce((sum, e) => sum + (e.totalRepairCostAOA || 0), 0);
  const totalMonthlyRentalPotential = visibleFleet.reduce((sum, e) => sum + (e.monthlyRentalCostAOA || 0), 0);

  // Create New Equipment Handler
  const handleCreateEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const depVal = Math.round((newAcquisitionCost * newDepreciationRate) / 100);
    const curVal = Math.max(0, newAcquisitionCost - depVal);

    erpStore.addEquipment({
      code: newCode.toUpperCase(),
      name: newName,
      type: newType,
      warehouseId: newWarehouseId,
      assignedDriverId: `dr-${Date.now()}`,
      assignedDriverName: newDriverName || 'Operador Padrão',
      driverPhone: newDriverPhone || '+244 900 000 000',
      condition: 'operacional',
      acquisitionCostAOA: newAcquisitionCost,
      depreciationRateAnnualPercent: newDepreciationRate,
      calculatedDepreciationAOA: depVal,
      currentValueAOA: curVal,
      monthlyRentalCostAOA: newMonthlyRental,
      averageConsumption: newConsumption,
      totalRepairCostAOA: 0,
      lastMaintenanceDate: new Date().toISOString().split('T')[0],
      nextMaintenanceDate: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split('T')[0],
      operatingHoursOrKm: 120,
      notes: 'Equipamento cadastrado recentemente no sistema CATASSO ERP.',
    });

    setIsNewEquipModalOpen(false);
    setNewName('');
    setNewDriverName('');
    setNewDriverPhone('');
    alert('Novo veículo / equipamento cadastrado com sucesso na frota!');
  };

  // Edit Equipment Handler
  const handleSaveEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEquipment) return;

    const depVal = Math.round(
      (editingEquipment.acquisitionCostAOA * editingEquipment.depreciationRateAnnualPercent) / 100
    );
    const curVal = Math.max(0, editingEquipment.acquisitionCostAOA - depVal);

    erpStore.updateEquipment(editingEquipment.id, {
      ...editingEquipment,
      calculatedDepreciationAOA: depVal,
      currentValueAOA: curVal,
    });

    setEditingEquipment(null);
    alert('Ficha do equipamento/veículo atualizada com sucesso!');
  };

  // Add Maintenance Record Handler
  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment) return;

    erpStore.addMaintenanceRecord({
      equipmentId: selectedEquipment.id,
      date: new Date().toISOString().split('T')[0],
      type: maintType,
      description: maintDesc,
      costAOA: maintCostAOA,
      partsReplaced: maintParts ? maintParts.split(',').map(s => s.trim()) : [],
      performedBy: maintProvider,
      nextScheduledDate: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split('T')[0],
    });

    setIsNewMaintModalOpen(false);
    setMaintDesc('');
    alert('Ordem de manutenção registrada com sucesso e custos incorporados!');
  };

  // Add Service Request Handler
  const handleAddServiceRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment) return;

    erpStore.addServiceRequest({
      warehouseId: selectedEquipment.warehouseId,
      equipmentId: selectedEquipment.id,
      equipmentName: selectedEquipment.name,
      requestedByUserId: currentUser?.id || 'sys',
      requestedByUserName: currentUser?.name || 'Solicitante',
      requestedRole: currentUser?.role || 'atendente',
      requestType: srvType,
      priority: srvPriority,
      description: srvDesc,
      status: 'pendente',
    });

    setIsNewServiceReqOpen(false);
    setSrvDesc('');
    alert('Solicitação de serviço enviada diretamente ao Gestor de Frotas!');
  };

  // Export Fleet Summary to Excel
  const handleExportFleetExcel = () => {
    const headers = [
      'Código Frota',
      'Nome do Veículo / Equipamento',
      'Tipo',
      'Armazém Alocado',
      'Motorista / Operador',
      'Condição Operacional',
      'Custo de Aquisição (AOA)',
      'Taxa Deprec. Anual (%)',
      'Depreciação Calculada (AOA)',
      'Valor Contábil Atual (AOA)',
      'Custo Aluguel Mensal (AOA)',
      'Consumo Médio',
      'Total Gasto em Reparos (AOA)',
      'Horímetro / Km',
    ];

    const rows = visibleFleet.map(e => [
      e.code,
      e.name,
      e.type.toUpperCase(),
      erpStore.warehouses.find(w => w.id === e.warehouseId)?.name || 'Central',
      e.assignedDriverName || 'Não Atribuído',
      e.condition.toUpperCase(),
      e.acquisitionCostAOA,
      e.depreciationRateAnnualPercent,
      e.calculatedDepreciationAOA,
      e.currentValueAOA,
      e.monthlyRentalCostAOA,
      e.averageConsumption,
      e.totalRepairCostAOA,
      e.operatingHoursOrKm,
    ]);

    exportToExcel('Relatorio_Frotas_Equipamentos_Geral', headers, rows);
  };

  // Export Individual Equipment Maintenance History to PDF
  const handlePrintMaintenanceHistory = (eq: Equipment) => {
    const records = erpStore.maintenanceRecords.filter(m => m.equipmentId === eq.id);
    const wh = erpStore.warehouses.find(w => w.id === eq.warehouseId);

    printFormalDocument({
      title: `Prontuário & Histórico de Manutenção: ${eq.name}`,
      documentNumber: `HIST-${eq.code}`,
      warehouseName: wh?.name || 'Armazém Central',
      warehouseProvince: wh?.province || 'Luanda',
      date: new Date().toLocaleDateString('pt-AO'),
      authorName: currentUser?.name || 'Gestor de Frotas',
      role: currentUser?.role || 'Frotas & Ativos',
      metadata: [
        { label: 'Identificador / Placa', value: eq.code },
        { label: 'Motorista / Operador Designado', value: eq.assignedDriverName || 'Operador Geral' },
        { label: 'Condição Técnica', value: eq.condition.toUpperCase() },
        { label: 'Valor de Aquisição', value: formatAOA(eq.acquisitionCostAOA) },
        { label: 'Depreciação Acumulada', value: formatAOA(eq.calculatedDepreciationAOA) },
        { label: 'Custo de Aluguel Mensal Atribuído', value: formatAOA(eq.monthlyRentalCostAOA) },
        { label: 'Consumo Médio Aferido', value: eq.averageConsumption },
        { label: 'Total Acumulado de Reparação', value: formatAOA(eq.totalRepairCostAOA) },
      ],
      tables: [
        {
          headers: ['Data Manut.', 'Tipo Intervenção', 'Descrição do Serviço', 'Custo Reparo (AOA)', 'Peças Substituídas', 'Executante'],
          rows: records.map(r => [
            r.date,
            r.type.toUpperCase(),
            r.description,
            formatAOA(r.costAOA),
            r.partsReplaced.join(', ') || 'N/A',
            r.performedBy,
          ]),
        },
      ],
      notes: eq.notes || 'Equipamento sujeito a plano de manutenção preventiva trimestral e controle de fluídos.',
      signatures: ['Gestor de Frotas & Equipamentos', 'Oficina Mecânica / Prestador de Serviços', 'Responsável do Armazém'],
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider">
              <Wrench className="w-4 h-4" />
              <span>Gestão Centralizada de Frotas, Maquinaria & Equipamentos Industriais</span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1">
              Controle de Ativos, Consumos, Motoristas e Depreciação
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Supervisão de empilhadeiras, camiões pesados, geradores industriais e gruas em todos os armazéns de Angola.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportFleetExcel}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar Frotas (Excel)</span>
            </button>

            {isFleetManager && (
              <button
                type="button"
                onClick={() => setIsNewEquipModalOpen(true)}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Veículo / Equipamento</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Financial & Fleet Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded">
            <span className="text-slate-400 text-[10px] uppercase font-mono block">Valor Contábil Atual</span>
            <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
              {formatAOA(totalFleetValue)}
            </span>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded">
            <span className="text-slate-400 text-[10px] uppercase font-mono block">Custo Total em Reparos</span>
            <span className="text-base font-bold text-amber-400 font-mono mt-0.5 block">
              {formatAOA(totalRepairs)}
            </span>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded">
            <span className="text-slate-400 text-[10px] uppercase font-mono block">Aluguel Mensal Calculado</span>
            <span className="text-base font-bold text-sky-400 font-mono mt-0.5 block">
              {formatAOA(totalMonthlyRentalPotential)}
            </span>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded">
            <span className="text-slate-400 text-[10px] uppercase font-mono block">Total de Ativos Monitorados</span>
            <span className="text-base font-bold text-white font-mono mt-0.5 block">
              {visibleFleet.length} Veículos / Maquinários
            </span>
          </div>
        </div>
      </div>

      {/* Filters Bar & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          {isFleetManager && (
            <div>
              <select
                value={selectedWarehouseFilter}
                onChange={e => setSelectedWarehouseFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded py-2 px-3 text-xs text-white"
              >
                <option value="all">Visão Geral: Todos os Armazéns</option>
                {erpStore.warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.province})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <select
              value={selectedConditionFilter}
              onChange={e => setSelectedConditionFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded py-2 px-3 text-xs text-white"
            >
              <option value="all">Todas as Condições</option>
              <option value="operacional">Operacional (100% Pronto)</option>
              <option value="em_manutencao">Em Manutenção</option>
              <option value="inativo">Inativo / Parado</option>
              <option value="critico">Crítico</option>
            </select>
          </div>
        </div>

        {/* Barra de Pesquisa */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por código, nome ou motorista..."
            className="w-full bg-slate-950 border border-slate-700 rounded pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Fleet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleFleet.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-lg">
            Nenhum veículo ou equipamento encontrado com os filtros aplicados.
          </div>
        ) : (
          visibleFleet.map(eq => {
            const wh = erpStore.warehouses.find(w => w.id === eq.warehouseId);
            const maintCount = erpStore.maintenanceRecords.filter(m => m.equipmentId === eq.id).length;

            const conditionColors: Record<string, string> = {
              operacional: 'bg-emerald-950 text-emerald-300 border-emerald-800',
              em_manutencao: 'bg-amber-950 text-amber-300 border-amber-800',
              inativo: 'bg-slate-800 text-slate-300 border-slate-700',
              critico: 'bg-red-950 text-red-300 border-red-800',
            };

            return (
              <div
                key={eq.id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sky-400 text-sm">{eq.code}</span>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                          conditionColors[eq.condition]
                        }`}
                      >
                        {eq.condition.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-base mt-1">{eq.name}</h3>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{wh?.name} ({wh?.province})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handlePrintMaintenanceHistory(eq)}
                      className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
                      title="Imprimir Prontuário de Manutenção"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {isFleetManager && (
                      <button
                        type="button"
                        onClick={() => setEditingEquipment({ ...eq })}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                        title="Editar Ativo, Depreciação e Motorista"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Data Specifications Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded border border-slate-800">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block">Motorista / Responsável:</span>
                    <span className="font-semibold text-slate-200">
                      {eq.assignedDriverName || 'Não Atribuído'}
                    </span>
                    {eq.driverPhone && (
                      <span className="text-[10px] text-slate-400 font-mono block">{eq.driverPhone}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block">Consumo Médio:</span>
                    <span className="font-semibold text-slate-200">{eq.averageConsumption}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block">Valor de Aquisição:</span>
                    <span className="font-mono text-slate-300">{formatAOA(eq.acquisitionCostAOA)}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block">Aluguel Mensal Atribuído:</span>
                    <span className="font-mono font-bold text-sky-400">
                      {formatAOA(eq.monthlyRentalCostAOA)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block">Depreciação Contábil:</span>
                    <span className="font-mono text-amber-400">
                      {formatAOA(eq.calculatedDepreciationAOA)} ({eq.depreciationRateAnnualPercent}% a.a.)
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block">Gasto Acumulado em Reparos:</span>
                    <span className="font-mono text-red-400 font-bold">
                      {formatAOA(eq.totalRepairCostAOA)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons for Service and Maintenance */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-500 font-mono text-[11px]">
                    {maintCount} intervenções mecânicas
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEquipment(eq);
                        setIsNewServiceReqOpen(true);
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold"
                    >
                      Solicitar Serviço
                    </button>

                    {isFleetManager && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEquipment(eq);
                          setIsNewMaintModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-sky-700 hover:bg-sky-600 text-white rounded text-xs font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Lançar Manutenção</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Novo Veículo / Equipamento */}
      {isNewEquipModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">Cadastrar Novo Veículo ou Maquinário</h3>
                <p className="text-xs text-slate-400">Adicionar à frota operacional do CATASSO ERP</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewEquipModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEquipment} className="py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Código / Placa *</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={e => setNewCode(e.target.value.toUpperCase())}
                    placeholder="Ex: FRO-LUA-EMP05"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo de Ativo *</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="empilhadeira">Empilhadeira</option>
                    <option value="camiao">Camião Pesado</option>
                    <option value="grua">Grua Telescópica</option>
                    <option value="gerador">Gerador Industrial</option>
                    <option value="veiculo_leve">Veículo Leve / Ligeiro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome / Modelo do Equipamento *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: Empilhadeira Toyota 4.0T Diesel"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Armazém Alocado *</label>
                  <select
                    value={newWarehouseId}
                    onChange={e => setNewWarehouseId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  >
                    {erpStore.warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.province})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Consumo Médio</label>
                  <input
                    type="text"
                    value={newConsumption}
                    onChange={e => setNewConsumption(e.target.value)}
                    placeholder="Ex: 5.5 L/hora"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Motorista / Responsável</label>
                  <input
                    type="text"
                    value={newDriverName}
                    onChange={e => setNewDriverName(e.target.value)}
                    placeholder="Nome do operador certificado"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Telefone do Condutor</label>
                  <input
                    type="text"
                    value={newDriverPhone}
                    onChange={e => setNewDriverPhone(e.target.value)}
                    placeholder="+244 9..."
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Custo Aquisição (AOA)</label>
                  <input
                    type="number"
                    min="0"
                    step="500000"
                    value={newAcquisitionCost}
                    onChange={e => setNewAcquisitionCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Taxa Deprec. (% a.a.)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newDepreciationRate}
                    onChange={e => setNewDepreciationRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Aluguel Mensal (AOA)</label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={newMonthlyRental}
                    onChange={e => setNewMonthlyRental(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewEquipModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold shadow"
                >
                  Cadastrar Ativo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Equipment Modal */}
      {editingEquipment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-sky-400 font-mono font-bold">{editingEquipment.code}</span>
                <h3 className="font-bold text-base text-white">Editar Parâmetros do Equipamento / Veículo</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingEquipment(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEquipment} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome / Modelo do Equipamento</label>
                <input
                  type="text"
                  required
                  value={editingEquipment.name}
                  onChange={e => setEditingEquipment({ ...editingEquipment, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Condição Operacional</label>
                  <select
                    value={editingEquipment.condition}
                    onChange={e =>
                      setEditingEquipment({ ...editingEquipment, condition: e.target.value as any })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="operacional">Operacional</option>
                    <option value="em_manutencao">Em Manutenção</option>
                    <option value="inativo">Inativo</option>
                    <option value="critico">Crítico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Armazém Alocado</label>
                  <select
                    value={editingEquipment.warehouseId}
                    onChange={e => setEditingEquipment({ ...editingEquipment, warehouseId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  >
                    {erpStore.warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.province})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Motorista / Responsável</label>
                  <input
                    type="text"
                    value={editingEquipment.assignedDriverName || ''}
                    onChange={e =>
                      setEditingEquipment({ ...editingEquipment, assignedDriverName: e.target.value })
                    }
                    placeholder="Nome completo do condutor"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Telefone do Motorista</label>
                  <input
                    type="text"
                    value={editingEquipment.driverPhone || ''}
                    onChange={e =>
                      setEditingEquipment({ ...editingEquipment, driverPhone: e.target.value })
                    }
                    placeholder="+244 9..."
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Custo de Aquisição (AOA)</label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={editingEquipment.acquisitionCostAOA}
                    onChange={e =>
                      setEditingEquipment({
                        ...editingEquipment,
                        acquisitionCostAOA: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Depreciação Anual (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingEquipment.depreciationRateAnnualPercent}
                    onChange={e =>
                      setEditingEquipment({
                        ...editingEquipment,
                        depreciationRateAnnualPercent: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Custo Aluguel Mensal (AOA)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={editingEquipment.monthlyRentalCostAOA}
                    onChange={e =>
                      setEditingEquipment({
                        ...editingEquipment,
                        monthlyRentalCostAOA: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Consumo Médio</label>
                  <input
                    type="text"
                    value={editingEquipment.averageConsumption}
                    onChange={e =>
                      setEditingEquipment({ ...editingEquipment, averageConsumption: e.target.value })
                    }
                    placeholder="Ex: 5.2 L/h ou 28 L/100km"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEquipment(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold"
                >
                  Salvar Modificações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lançar Manutenção Modal */}
      {isNewMaintModalOpen && selectedEquipment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-sky-400 font-mono font-bold">{selectedEquipment.code}</span>
                <h3 className="font-bold text-base text-white">Lançar Registro de Manutenção</h3>
                <p className="text-xs text-slate-400">{selectedEquipment.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewMaintModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMaintenance} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tipo de Intervenção</label>
                <select
                  value={maintType}
                  onChange={e => setMaintType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                >
                  <option value="preventiva">Preventiva Periódica</option>
                  <option value="corretiva">Corretiva / Reparo de Falha</option>
                  <option value="preditiva">Preditiva / Análise de Vibração/Óleo</option>
                  <option value="inspecao">Inspeção de Segurança</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descrição do Serviço Realizado *</label>
                <textarea
                  rows={2}
                  required
                  value={maintDesc}
                  onChange={e => setMaintDesc(e.target.value)}
                  placeholder="Ex: Troca de pastilhas de travão, filtros e óleo hidráulico..."
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Custo Total (AOA) *</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    required
                    value={maintCostAOA}
                    onChange={e => setMaintCostAOA(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Prestador / Oficina</label>
                  <input
                    type="text"
                    required
                    value={maintProvider}
                    onChange={e => setMaintProvider(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Peças Substituídas (separadas por vírgula)</label>
                <input
                  type="text"
                  value={maintParts}
                  onChange={e => setMaintParts(e.target.value)}
                  placeholder="Ex: Filtro Óleo, Correia Dentada, Retentor"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewMaintModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold"
                >
                  Registrar Manutenção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Solicitar Serviço Modal */}
      {isNewServiceReqOpen && selectedEquipment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-sky-400 font-mono font-bold">{selectedEquipment.code}</span>
                <h3 className="font-bold text-base text-white">Solicitar Serviço de Veículo / Maquinário</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewServiceReqOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddServiceRequest} className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo de Necessidade</label>
                  <select
                    value={srvType}
                    onChange={e => setSrvType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="reparo">Reparo Mecânico / Elétrico</option>
                    <option value="manutencao_preventiva">Revisão Periódica</option>
                    <option value="abastecimento">Combustível / Fluídos</option>
                    <option value="peca_reposicao">Peça de Desgaste</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Urgência</label>
                  <select
                    value={srvPriority}
                    onChange={e => setSrvPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente (Parada Operacional)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descrição do Problema / Serviço Solicitado *</label>
                <textarea
                  rows={3}
                  required
                  value={srvDesc}
                  onChange={e => setSrvDesc(e.target.value)}
                  placeholder="Descreva sintomas, ruídos ou necessidade operacional..."
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewServiceReqOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold"
                >
                  Enviar Solicitação ao Gestor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
