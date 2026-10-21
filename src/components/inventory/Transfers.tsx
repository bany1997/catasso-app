import React, { useState } from 'react';
import { erpStore } from '../../services/store';
import { catalogService } from '../../services/catalogService';
import { exportToExcel, printFormalDocument } from '../../services/exportService';
import { WarehouseTransfer } from '../../types';
import {
  Building,
  ArrowRightLeft,
  CheckCircle,
  Truck,
  Plus,
  Printer,
  FileSpreadsheet,
  Clock,
  Check,
  Send,
  Boxes,
} from 'lucide-react';

export const Transfers: React.FC = () => {
  const [isNewTransferOpen, setIsNewTransferOpen] = useState(false);

  const currentUser = erpStore.currentUser;
  const activeWh = erpStore.getActiveWarehouse();

  // Filter transfers involving active warehouse (or all for superadmin)
  const transfers = erpStore.transfers.filter(trf => {
    if (currentUser?.role === 'superadmin') return true;
    return trf.originWarehouseId === activeWh?.id || trf.destinationWarehouseId === activeWh?.id;
  });

  const handleApprove = (trfId: string) => {
    erpStore.approveTransfer(trfId);
    alert('Transferência aprovada e despachada! O estoque foi baixado no armazém de origem.');
  };

  const handleReceive = (trfId: string) => {
    erpStore.receiveTransfer(trfId);
    alert('Transferência recebida com sucesso! Os produtos deram entrada no armazém de destino.');
  };

  const handlePrintTransferDoc = (trf: WarehouseTransfer) => {
    const origin = erpStore.warehouses.find(w => w.id === trf.originWarehouseId);
    const dest = erpStore.warehouses.find(w => w.id === trf.destinationWarehouseId);

    printFormalDocument({
      title: 'Guia Oficial de Transferência e Comunicação Inter-Armazéns',
      documentNumber: trf.transferCode,
      warehouseName: origin?.name || 'Armazém Origem',
      warehouseProvince: origin?.province || 'Luanda',
      date: new Date(trf.requestDate).toLocaleDateString('pt-AO'),
      authorName: trf.requestedByUserName,
      role: 'Responsável de Armazém',
      metadata: [
        { label: 'Armazém de Origem (Remetente)', value: `${origin?.name} (${origin?.province})` },
        { label: 'Armazém de Destino (Receptor)', value: `${dest?.name} (${dest?.province})` },
        { label: 'Data da Solicitação', value: new Date(trf.requestDate).toLocaleString('pt-AO') },
        { label: 'Transporte Designado', value: `${trf.transportDetails?.carrier || 'Frota Interna'} / Matrícula: ${trf.transportDetails?.vehiclePlate || 'N/A'}` },
        { label: 'Situação da Guia', value: trf.status.toUpperCase() },
      ],
      tables: [
        {
          headers: ['Código SKU', 'Descrição Técnica do Material', 'Qtd. a Transferir', 'Status Item'],
          rows: trf.items.map(i => [
            i.sku,
            i.productName,
            `${i.quantity} UN`,
            trf.status.toUpperCase(),
          ]),
        },
      ],
      notes: `Observações Operacionais: ${trf.notes || 'Transferência realizada sob protocolo de contingência e balanceamento de estoque industrial.'}`,
      signatures: ['Responsável Armazém Origem', 'Condutor / Transportador', 'Responsável Armazém Destino'],
    });
  };

  const handleExportExcel = () => {
    const headers = [
      'N° Guia',
      'Data Solicitação',
      'Origem',
      'Destino',
      'Solicitante',
      'Status',
      'Qtd Itens',
    ];

    const rows = transfers.map(t => [
      t.transferCode,
      new Date(t.requestDate).toLocaleDateString('pt-AO'),
      erpStore.warehouses.find(w => w.id === t.originWarehouseId)?.name || 'Origem',
      erpStore.warehouses.find(w => w.id === t.destinationWarehouseId)?.name || 'Destino',
      t.requestedByUserName,
      t.status.toUpperCase(),
      t.items.reduce((s, i) => s + i.quantity, 0),
    ]);

    exportToExcel('Relatorio_Transferencias_Inter_Armazens', headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-sky-400" />
            <span>Comunicação & Transferência Entre Armazéns</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Intercâmbio de materiais entre unidades (Luanda, Lobito, Soyo, Huambo) com controle bilateral de estoques e guias de remessa.
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
          <button
            type="button"
            onClick={() => setIsNewTransferOpen(true)}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Transferência</span>
          </button>
        </div>
      </div>

      {/* Transfers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <th className="py-2.5 px-3">Código Guia</th>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Armazém Origem</th>
                <th className="py-2.5 px-3">Armazém Destino</th>
                <th className="py-2.5 px-3">Itens / Quantidades</th>
                <th className="py-2.5 px-3">Solicitante</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Nenhuma transferência inter-armazém registrada.
                  </td>
                </tr>
              ) : (
                transfers.map(trf => {
                  const origin = erpStore.warehouses.find(w => w.id === trf.originWarehouseId);
                  const dest = erpStore.warehouses.find(w => w.id === trf.destinationWarehouseId);

                  const isOrigin = activeWh?.id === trf.originWarehouseId;
                  const isDestination = activeWh?.id === trf.destinationWarehouseId;

                  const statusColors: Record<string, string> = {
                    solicitada: 'bg-amber-950 text-amber-300 border-amber-800',
                    aprovada: 'bg-indigo-950 text-indigo-300 border-indigo-800',
                    em_transito: 'bg-sky-950 text-sky-300 border-sky-800',
                    recebida: 'bg-emerald-950 text-emerald-300 border-emerald-800',
                    rejeitada: 'bg-red-950 text-red-300 border-red-800',
                  };

                  return (
                    <tr key={trf.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-bold text-sky-400 whitespace-nowrap">
                        {trf.transferCode}
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(trf.requestDate).toLocaleDateString('pt-AO')}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-200">{origin?.name}</span>
                        <span className="text-[10px] text-slate-500 block font-mono">{origin?.province}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-200">{dest?.name}</span>
                        <span className="text-[10px] text-slate-500 block font-mono">{dest?.province}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-slate-300">
                          {trf.items.map(i => `${i.sku} (${i.quantity} UN)`).join(', ')}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">
                          {trf.items.map(i => i.productName).join(', ')}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {trf.requestedByUserName}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase border ${
                            statusColors[trf.status]
                          }`}
                        >
                          {trf.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Approval by origin warehouse manager */}
                          {(isOrigin || currentUser?.role === 'superadmin') && trf.status === 'solicitada' && (
                            <button
                              type="button"
                              onClick={() => handleApprove(trf.id)}
                              className="px-2 py-1 bg-sky-700 hover:bg-sky-600 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                              title="Aprovar e Despachar Carga"
                            >
                              <Send className="w-3 h-3" />
                              <span>Aprovar & Despachar</span>
                            </button>
                          )}

                          {/* Confirmation of arrival at destination warehouse */}
                          {(isDestination || currentUser?.role === 'superadmin') && trf.status === 'em_transito' && (
                            <button
                              type="button"
                              onClick={() => handleReceive(trf.id)}
                              className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                              title="Confirmar Chegada e Ingerir no Estoque"
                            >
                              <Check className="w-3 h-3" />
                              <span>Receber no Estoque</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handlePrintTransferDoc(trf)}
                            className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded"
                            title="Imprimir Guia de Transferência Oficial"
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

      {/* New Transfer Request Modal */}
      {isNewTransferOpen && (
        <NewTransferModal
          onClose={() => setIsNewTransferOpen(false)}
          onSuccess={() => {
            setIsNewTransferOpen(false);
            alert('Transferência solicitada com sucesso!');
          }}
        />
      )}
    </div>
  );
};

// Modal for creating transfer
const NewTransferModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({
  onClose,
  onSuccess,
}) => {
  const activeWh = erpStore.getActiveWarehouse();
  const otherWhs = erpStore.warehouses.filter(w => w.id !== activeWh?.id);

  const [originWhId, setOriginWhId] = useState(otherWhs[0]?.id || '');
  const [sku, setSku] = useState('SKU-00003');
  const [quantity, setQuantity] = useState(5);
  const [notes, setNotes] = useState('Contingência para suporte operacional.');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = catalogService.getProductBySku(sku);
    if (!prod || !activeWh || quantity <= 0) {
      alert('Produto ou quantidade inválida.');
      return;
    }

    erpStore.requestTransfer({
      originWarehouseId: originWhId,
      destinationWarehouseId: activeWh.id,
      requestedByUserId: erpStore.currentUser?.id || 'sys',
      requestedByUserName: erpStore.currentUser?.name || 'Responsável Armazém',
      items: [
        {
          productId: prod.id,
          sku: prod.sku,
          productName: prod.name,
          quantity,
        },
      ],
      transportDetails: {
        carrier: 'Frota Interna CATASSO',
        vehiclePlate: 'LD-44-89-HP',
      },
      notes,
    });

    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full p-6 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-white">Solicitar Transferência de Armazém</h3>
            <p className="text-xs text-slate-400">Destino: {activeWh?.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleCreate} className="py-4 space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Armazém Fornecedor (Origem) *</label>
            <select
              value={originWhId}
              onChange={e => setOriginWhId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-sky-500"
            >
              {otherWhs.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.province})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Código SKU do Material *</label>
            <input
              type="text"
              required
              value={sku}
              onChange={e => setSku(e.target.value.toUpperCase())}
              placeholder="Ex: SKU-00003"
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Quantidade Requisitada *</label>
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
            <label className="block text-slate-300 font-semibold mb-1">Justificativa da Transferência</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
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
              Enviar Pedido de Transferência
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
