import React, { useState } from 'react';
import { erpStore } from '../../services/store';
import { RNCReport } from '../../types';
import { exportToExcel, printFormalDocument } from '../../services/exportService';
import {
  AlertOctagon,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Edit2,
  Eye,
  Check,
  Search,
} from 'lucide-react';

export const RncManagement: React.FC = () => {
  const [selectedRnc, setSelectedRnc] = useState<RNCReport | null>(null);
  const [editingRnc, setEditingRnc] = useState<RNCReport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const currentUser = erpStore.currentUser;
  const activeWh = erpStore.getActiveWarehouse();

  const isSupplier = currentUser?.role === 'fornecedor';

  const visibleRncs = erpStore.rncs.filter(rnc => {
    if (isSupplier) {
      if (rnc.supplierId !== currentUser.id) return false;
    } else if (currentUser?.role !== 'superadmin' && rnc.warehouseId !== activeWh?.id) {
      return false;
    }

    if (statusFilter !== 'all' && rnc.status !== statusFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNum = rnc.rncNumber.toLowerCase().includes(q);
      const matchSupp = rnc.supplierName?.toLowerCase().includes(q);
      const matchDesc = rnc.description.toLowerCase().includes(q);
      if (!matchNum && !matchSupp && !matchDesc) return false;
    }

    return true;
  });

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRnc) return;

    erpStore.updateRNC(editingRnc.id, editingRnc);
    setEditingRnc(null);
    alert('Relatório de Não Conformidade atualizado!');
  };

  const handleResolveRnc = (rnc: RNCReport) => {
    const action = prompt('Descreva a ação de encerramento / compensação realizada:', rnc.correctiveAction || '');
    if (action !== null) {
      erpStore.updateRNC(rnc.id, {
        status: 'resolvida',
        correctiveAction: action,
        resolutionDate: new Date().toISOString(),
        resolvedByUserName: currentUser?.name || 'Gestor de Qualidade',
      });
      alert('RNC encerrada com sucesso!');
    }
  };

  const handleExportExcel = () => {
    const headers = [
      'N° RNC',
      'Data de Abertura',
      'Armazém',
      'Fornecedor Responsável',
      'Gravidade',
      'Tipo de Falha',
      'Descrição',
      'Causa Raiz',
      'Ação Corretiva',
      'Status',
    ];

    const rows = visibleRncs.map(r => [
      r.rncNumber,
      new Date(r.openedAt).toLocaleDateString('pt-AO'),
      erpStore.warehouses.find(w => w.id === r.warehouseId)?.name || 'Central',
      r.supplierName || 'N/A',
      r.severity.toUpperCase(),
      r.issueType,
      r.description,
      r.rootCauseAnalysis || '-',
      r.correctiveAction || '-',
      r.status.toUpperCase(),
    ]);

    exportToExcel(`Relatorio_RNC_${activeWh?.code || 'Geral'}`, headers, rows);
  };

  const handlePrintRncPdf = (rnc: RNCReport) => {
    const wh = erpStore.warehouses.find(w => w.id === rnc.warehouseId);

    printFormalDocument({
      title: 'Relatório Oficial de Não Conformidade (RNC)',
      documentNumber: rnc.rncNumber,
      warehouseName: wh?.name || 'Armazém Central',
      warehouseProvince: wh?.province || 'Luanda',
      date: new Date(rnc.openedAt).toLocaleDateString('pt-AO'),
      authorName: rnc.openedByUserName,
      role: 'Inspetor de Qualidade',
      metadata: [
        { label: 'Unidade Notificadora', value: `${wh?.name} (${wh?.province})` },
        { label: 'Fornecedor Notificado', value: rnc.supplierName || 'Interno' },
        { label: 'Gravidade da Ocorrência', value: rnc.severity.toUpperCase() },
        { label: 'Classificação do Desvio', value: rnc.issueType.replace('_', ' ').toUpperCase() },
        { label: 'Situação Atual', value: rnc.status.toUpperCase() },
      ],
      tables: [
        {
          title: 'Materiais / Volumes Afetados',
          headers: ['Código SKU', 'Descrição do Material', 'Qtd. Afetada', 'Detalhamento do Defeito / Discrepância'],
          rows: rnc.affectedItems.map(i => [
            i.sku,
            i.productName,
            `${i.quantityAffected} UN`,
            i.defectDetail,
          ]),
        },
      ],
      notes: `Descrição do Fato: ${rnc.description}\nCausa Raiz: ${rnc.rootCauseAnalysis || 'Em investigação.'}\nAção Corretiva: ${rnc.correctiveAction || 'Aguardando parecer do fornecedor.'}`,
      signatures: ['Responsável pelo Armazém', 'Gestor de Qualidade & Processos', 'Ciência do Fornecedor'],
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-red-400" />
            <span>Gestão de Não Conformidades (RNC)</span>
            <span className="text-xs text-slate-400 font-mono">({activeWh?.name})</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro formal de avarias no transporte, faltas de quantidade, defeitos de fábrica e acompanhamento de reposições.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por N° RNC, fornecedor, falha..."
            className="w-full bg-slate-950 border border-slate-700 rounded py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded py-2 px-3 text-xs text-white"
          >
            <option value="all">Todos os Estados</option>
            <option value="aberta">Aberta</option>
            <option value="em_analise">Em Análise Técnica</option>
            <option value="aguardando_reposicao">Aguardando Reposição</option>
            <option value="resolvida">Resolvida / Encerrada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <th className="py-2.5 px-3">N° RNC</th>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Fornecedor</th>
                <th className="py-2.5 px-3">Tipo de Desvio</th>
                <th className="py-2.5 px-3 text-center">Gravidade</th>
                <th className="py-2.5 px-3">Itens Afetados</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {visibleRncs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Nenhum Relatório de Não Conformidade encontrado.
                  </td>
                </tr>
              ) : (
                visibleRncs.map(rnc => {
                  const severityColors: Record<string, string> = {
                    baixa: 'text-slate-400 bg-slate-800 border-slate-700',
                    media: 'text-amber-400 bg-amber-950/60 border-amber-800',
                    alta: 'text-orange-400 bg-orange-950/60 border-orange-800',
                    critica: 'text-red-400 bg-red-950/60 border-red-800',
                  };

                  const statusColors: Record<string, string> = {
                    aberta: 'text-red-400 bg-red-950/60 border-red-800',
                    em_analise: 'text-amber-400 bg-amber-950/60 border-amber-800',
                    aguardando_reposicao: 'text-sky-400 bg-sky-950/60 border-sky-800',
                    resolvida: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
                    cancelada: 'text-slate-400 bg-slate-800 border-slate-700',
                  };

                  return (
                    <tr key={rnc.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-bold text-red-400 whitespace-nowrap">
                        {rnc.rncNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(rnc.openedAt).toLocaleDateString('pt-AO')}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-200">
                        {rnc.supplierName || 'Fornecedor Local'}
                      </td>
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                        {rnc.issueType.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase border ${
                            severityColors[rnc.severity]
                          }`}
                        >
                          {rnc.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-slate-300">
                          {rnc.affectedItems.length} materiais
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase border ${
                            statusColors[rnc.status]
                          }`}
                        >
                          {rnc.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {rnc.status !== 'resolvida' && !isSupplier && (
                            <button
                              type="button"
                              onClick={() => handleResolveRnc(rnc)}
                              className="px-2 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                              title="Dar Baixa / Encerrar RNC"
                            >
                              <Check className="w-3 h-3" />
                              <span>Encerrar</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setEditingRnc({ ...rnc })}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                            title="Editar Causa Raiz e Tratativa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintRncPdf(rnc)}
                            className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded"
                            title="Imprimir Laudo Oficial em PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Investigation Modal */}
      {editingRnc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-red-400 font-mono font-bold">{editingRnc.rncNumber}</span>
                <h3 className="font-bold text-base text-white">Análise de Causa Raiz & Ação Corretiva</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRnc(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status da Ocorrência</label>
                  <select
                    value={editingRnc.status}
                    onChange={e => setEditingRnc({ ...editingRnc, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="aberta">Aberta</option>
                    <option value="em_analise">Em Análise Técnica</option>
                    <option value="aguardando_reposicao">Aguardando Reposição</option>
                    <option value="resolvida">Resolvida</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Severidade</label>
                  <select
                    value={editingRnc.severity}
                    onChange={e => setEditingRnc({ ...editingRnc, severity: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Análise de Causa Raiz (Porquê aconteceu?)</label>
                <textarea
                  rows={2}
                  value={editingRnc.rootCauseAnalysis || ''}
                  onChange={e => setEditingRnc({ ...editingRnc, rootCauseAnalysis: e.target.value })}
                  placeholder="Ex: Falha no isolamento térmico / amarração imprópria no transporte..."
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ação Corretiva & Preventiva (CAPA)</label>
                <textarea
                  rows={2}
                  value={editingRnc.correctiveAction || ''}
                  onChange={e => setEditingRnc({ ...editingRnc, correctiveAction: e.target.value })}
                  placeholder="Ex: Reposição de 10 unidades com frete pago pelo fornecedor e revisão do procedimento de embalagem..."
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRnc(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold"
                >
                  Salvar Parecer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
