import React, { useState } from 'react';
import { erpStore } from '../../services/store';
import { catalogService } from '../../services/catalogService';
import { formatAOA } from '../../services/i18n';
import { exportToExcel, printFormalDocument } from '../../services/exportService';
import { PurchaseOrder, PurchaseStatus } from '../../types';
import {
  Search,
  Plus,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Printer,
  Clock,
  Eye,
  ShoppingCart,
  Send,
  Building2,
  Check,
  ChevronDown,
} from 'lucide-react';

interface PurchaseOrdersProps {
  onNavigateToInspection?: () => void;
}

export const PurchaseOrders: React.FC<PurchaseOrdersProps> = ({ onNavigateToInspection }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);

  const currentUser = erpStore.currentUser;
  const activeWh = erpStore.getActiveWarehouse();

  // Scope rules: Gestor Geral sees only their warehouse, Superadmin sees all
  const filteredOrders = erpStore.purchaseOrders.filter(po => {
    if (currentUser?.role === 'cliente') {
      if (po.requesterUserId !== currentUser.id) return false;
    } else if (currentUser?.role !== 'superadmin' && po.warehouseId !== activeWh?.id) {
      return false;
    }

    if (selectedStatus !== 'all' && po.status !== selectedStatus) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNum = po.orderNumber.toLowerCase().includes(q);
      const matchSupp = po.supplierName.toLowerCase().includes(q);
      const matchReq = po.requesterName.toLowerCase().includes(q);
      const matchItems = po.items.some(
        i => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
      );
      if (!matchNum && !matchSupp && !matchReq && !matchItems) return false;
    }

    return true;
  });

  const canApprove =
    currentUser?.role === 'gestor_geral' || currentUser?.role === 'superadmin';

  const canCreateRequest =
    currentUser?.role !== 'fornecedor'; // Anyone except supplier can request

  const handleApprove = (orderId: string) => {
    if (!currentUser) return;
    erpStore.approvePurchaseOrder(orderId, currentUser.id, currentUser.name);
    alert('Pedido aprovado com sucesso! Foi encaminhado para a conta do fornecedor.');
  };

  const handleReject = (orderId: string) => {
    const reason = prompt('Indique a justificativa da recusa deste pedido de compra:');
    if (reason) {
      erpStore.rejectPurchaseOrder(orderId, reason);
    }
  };

  const handleExportExcel = () => {
    const headers = [
      'N° Pedido',
      'Data de Abertura',
      'Armazém Solicitante',
      'Requisitante',
      'Fornecedor Homologado',
      'Valor Estimado (AOA)',
      'Status Atual',
      'Prioridade',
      'Aprovado Por',
      'Data Aprovação',
    ];

    const rows = filteredOrders.map(po => [
      po.orderNumber,
      new Date(po.createdAt).toLocaleDateString('pt-AO'),
      erpStore.warehouses.find(w => w.id === po.warehouseId)?.name || 'Geral',
      po.requesterName,
      po.supplierName,
      po.totalEstimatedAOA,
      po.status,
      po.priority,
      po.approvedByName || '-',
      po.approvedAt ? new Date(po.approvedAt).toLocaleDateString('pt-AO') : '-',
    ]);

    exportToExcel(`Pedidos_Compra_${activeWh?.code || 'Geral'}`, headers, rows);
  };

  const handlePrintOrder = (po: PurchaseOrder) => {
    printFormalDocument({
      title: 'Ordem Oficial de Compra e Fornecimento de Materiais',
      documentNumber: po.orderNumber,
      warehouseName: activeWh?.name || 'Armazém Central',
      warehouseProvince: activeWh?.province || 'Luanda',
      date: new Date(po.createdAt).toLocaleDateString('pt-AO'),
      authorName: po.requesterName,
      role: po.requesterRole,
      metadata: [
        { label: 'Unidade Requisitante', value: `${activeWh?.name} (${activeWh?.province})` },
        { label: 'Fornecedor Designado', value: po.supplierName },
        { label: 'Prioridade da Ordem', value: po.priority.toUpperCase() },
        { label: 'Situação Operacional', value: po.status.toUpperCase() },
        { label: 'Aprovador Oficial', value: po.approvedByName || 'Pendente de Avaliação do Gestor Geral' },
      ],
      tables: [
        {
          headers: ['Item / SKU', 'Descrição Técnica do Material', 'Qtd. Solicitada', 'Preço Unitário (AOA)', 'Total Estimado (AOA)', 'Situação'],
          rows: po.items.map(i => [
            i.sku,
            i.productName,
            `${i.quantityRequested} UN`,
            formatAOA(i.unitPriceAOA),
            formatAOA(i.quantityRequested * i.unitPriceAOA),
            i.status.toUpperCase(),
          ]),
        },
      ],
      notes: `Justificativa Operacional: ${po.justification}`,
      signatures: ['Requisitante', 'Gestor Geral da Unidade', 'Representante do Fornecedor'],
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Gestão de Compras & Encomendas de Suprimentos</span>
            <span className="text-xs text-slate-400 font-mono">({activeWh?.name})</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Fluxo completo: Requisição interna → Aprovação do Gestor Geral → Encaminhamento ao Fornecedor → Rastreio e Recebimento.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Excel</span>
          </button>

          {canCreateRequest && (
            <button
              type="button"
              onClick={() => setIsNewOrderModalOpen(true)}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Solicitar Compra de Materiais</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por N° pedido (ex: PED-2026), SKU, fornecedor..."
            className="w-full bg-slate-950 border border-slate-700 rounded py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500"
          >
            <option value="all">Todos os Estados</option>
            <option value="solicitado">Aguardando Aprovação (Gestor)</option>
            <option value="aprovado">Aprovado (Com Fornecedor)</option>
            <option value="em_preparacao">Em Preparação</option>
            <option value="em_transito">Em Trânsito</option>
            <option value="recebido_parcial">Recebido Parcial / Pendente</option>
            <option value="comprado">Comprado & Recebido Integral</option>
            <option value="rejeitado">Rejeitado</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <th className="py-2.5 px-3">N° Pedido</th>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Solicitante</th>
                <th className="py-2.5 px-3">Fornecedor</th>
                <th className="py-2.5 px-3">Itens</th>
                <th className="py-2.5 px-3 text-right">Valor Estimado (AOA)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Nenhum pedido de compra localizado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(po => {
                  const statusStyles: Record<string, string> = {
                    solicitado: 'bg-amber-950 text-amber-300 border-amber-800',
                    aprovado: 'bg-indigo-950 text-indigo-300 border-indigo-800',
                    em_preparacao: 'bg-blue-950 text-blue-300 border-blue-800',
                    em_transito: 'bg-sky-950 text-sky-300 border-sky-800',
                    recebido_parcial: 'bg-orange-950 text-orange-300 border-orange-800',
                    comprado: 'bg-emerald-950 text-emerald-300 border-emerald-800',
                    rejeitado: 'bg-red-950 text-red-300 border-red-800',
                  };

                  return (
                    <tr key={po.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-bold text-sky-400 whitespace-nowrap">
                        {po.orderNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(po.createdAt).toLocaleDateString('pt-AO')}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-200">{po.requesterName}</div>
                        <div className="text-[10px] text-slate-500">{po.requesterRole}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {po.supplierName}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-300 font-mono">{po.items.length} itens</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">
                          {po.items.map(i => i.sku).join(', ')}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-200 whitespace-nowrap">
                        {formatAOA(po.totalEstimatedAOA)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase border ${
                            statusStyles[po.status] || 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {po.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Gestor Geral approval buttons */}
                          {canApprove && po.status === 'solicitado' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(po.id)}
                                className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                                title="Aprovar Solicitação de Compra"
                              >
                                <Check className="w-3 h-3" />
                                <span>Aprovar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(po.id)}
                                className="px-2 py-1 bg-red-900 hover:bg-red-800 text-white rounded text-[11px] font-semibold"
                                title="Rejeitar Solicitação"
                              >
                                Rejeitar
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setViewOrder(po)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                            title="Ver Detalhes do Pedido"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintOrder(po)}
                            className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded"
                            title="Imprimir Ordem de Compra"
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

      {/* Details View Modal */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-sky-400 font-mono font-bold">{viewOrder.orderNumber}</span>
                <h3 className="font-bold text-base text-white">Detalhes do Pedido de Compra</h3>
                <p className="text-xs text-slate-400">Fornecedor: {viewOrder.supplierName}</p>
              </div>
              <button type="button" onClick={() => setViewOrder(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 border border-slate-800 rounded">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase">Requisitante</div>
                  <div className="font-semibold text-slate-200 mt-0.5">{viewOrder.requesterName}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase">Situação da Aprovação</div>
                  <div className="font-semibold text-emerald-400 mt-0.5">
                    {viewOrder.approvedByName ? `Aprovado por: ${viewOrder.approvedByName}` : 'Aguardando Aprovação do Gestor Geral'}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-slate-300 font-semibold mb-2">Lista de Materiais Solicitados</div>
                <div className="border border-slate-800 rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400">
                      <tr>
                        <th className="p-2">SKU</th>
                        <th className="p-2">Produto</th>
                        <th className="p-2 text-right">Solicitado</th>
                        <th className="p-2 text-right">Despachado</th>
                        <th className="p-2 text-right">Preço Unit.</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {viewOrder.items.map(item => (
                        <tr key={item.productId} className="hover:bg-slate-800/40">
                          <td className="p-2 font-mono text-sky-400">{item.sku}</td>
                          <td className="p-2 text-slate-200">{item.productName}</td>
                          <td className="p-2 text-right font-mono font-bold text-white">{item.quantityRequested}</td>
                          <td className="p-2 text-right font-mono text-emerald-400">{item.quantityDispatched || 0}</td>
                          <td className="p-2 text-right font-mono text-slate-400">{formatAOA(item.unitPriceAOA)}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-200">
                            {formatAOA(item.quantityRequested * item.unitPriceAOA)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded text-slate-400">
                <span className="font-semibold text-slate-200">Justificativa da Compra: </span>
                {viewOrder.justification}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => handlePrintOrder(viewOrder)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold"
              >
                Imprimir Documento Oficial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Purchase Request Modal */}
      {isNewOrderModalOpen && (
        <NewPurchaseModal
          onClose={() => setIsNewOrderModalOpen(false)}
          onSuccess={() => {
            setIsNewOrderModalOpen(false);
            alert('Solicitação de compra enviada ao Gestor Geral com sucesso!');
          }}
        />
      )}
    </div>
  );
};

// Modal for Creating Purchase Request
const NewPurchaseModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({
  onClose,
  onSuccess,
}) => {
  const [skuInput, setSkuInput] = useState('SKU-00001');
  const [quantity, setQuantity] = useState(10);
  const [priority, setPriority] = useState<'normal' | 'alta' | 'urgente'>('alta');
  const [justification, setJustification] = useState('Reposição emergencial para parada de fábrica.');

  const currentUser = erpStore.currentUser;
  const activeWh = erpStore.getActiveWarehouse();

  // Find default supplier
  const supplier = erpStore.users.find(u => u.role === 'fornecedor');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = catalogService.getProductBySku(skuInput);
    if (!prod || !activeWh || quantity <= 0) {
      alert('Produto ou quantidade inválida.');
      return;
    }

    erpStore.createPurchaseOrder({
      warehouseId: activeWh.id,
      requesterUserId: currentUser?.id || 'sys',
      requesterName: currentUser?.name || 'Requisitante',
      requesterRole: currentUser?.role || 'cliente',
      supplierId: supplier?.id || 'user-fornecedor',
      supplierName: supplier?.supplierCompanyName || 'Total Supply Angola Lda',
      supplierEmail: supplier?.email || 'comercial@totalsupply.co.ao',
      status: 'solicitado', // Needs approval from Gestor Geral
      priority,
      justification,
      totalEstimatedAOA: quantity * prod.basePriceAOA,
      items: [
        {
          productId: prod.id,
          sku: prod.sku,
          productName: prod.name,
          quantityRequested: quantity,
          quantityDispatched: 0,
          quantityReceived: 0,
          quantityDamagedOrDefective: 0,
          unitPriceAOA: prod.basePriceAOA,
          status: 'pendente',
        },
      ],
    });

    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full p-6 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-white">Nova Solicitação de Compra</h3>
            <p className="text-xs text-slate-400">Será enviada para aprovação do Gestor Geral do armazém.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleCreate} className="py-4 space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Código SKU do Material *</label>
            <input
              type="text"
              required
              value={skuInput}
              onChange={e => setSkuInput(e.target.value.toUpperCase())}
              placeholder="Ex: SKU-00001"
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Quantidade *</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Prioridade</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-sky-500"
              >
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Fornecedor Designado</label>
            <input
              type="text"
              disabled
              value={supplier?.supplierCompanyName || 'Total Supply & Equipamentos Angola Lda'}
              className="w-full bg-slate-950/70 border border-slate-800 rounded p-2 text-slate-400"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Justificativa Operacional *</label>
            <textarea
              rows={3}
              required
              value={justification}
              onChange={e => setJustification(e.target.value)}
              placeholder="Explique o destino ou urgência dos materiais..."
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-sky-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
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
  );
};
