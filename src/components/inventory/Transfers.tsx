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
  Trash2,
  XCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';

export const Transfers: React.FC = () => {
  const [isNewTransferOpen, setIsNewTransferOpen] = useState(false);
  const [approvingTransfer, setApprovingTransfer] = useState<WarehouseTransfer | null>(null);
  const [receivingTransfer, setReceivingTransfer] = useState<WarehouseTransfer | null>(null);
  const [rejectingTransfer, setRejectingTransfer] = useState<WarehouseTransfer | null>(null);

  const currentUser = erpStore.currentUser;
  const activeWh = erpStore.getActiveWarehouse();

  // Filter transfers involving active warehouse (or all for superadmin)
  const transfers = erpStore.transfers.filter(trf => {
    if (currentUser?.role === 'superadmin') return true;
    return trf.originWarehouseId === activeWh?.id || trf.destinationWarehouseId === activeWh?.id;
  });

  const handlePrintTransferDoc = (trf: WarehouseTransfer) => {
    const origin = erpStore.warehouses.find(w => w.id === trf.originWarehouseId);
    const dest = erpStore.warehouses.find(w => w.id === trf.destinationWarehouseId);

    printFormalDocument({
      title: 'Guia Oficial de Remessa & Transferência Inter-Armazéns',
      documentNumber: trf.transferCode,
      warehouseName: origin?.name || 'Armazém Origem',
      warehouseProvince: origin?.province || 'Luanda',
      date: new Date(trf.requestDate).toLocaleDateString('pt-AO'),
      authorName: trf.requestedByUserName,
      role: 'Responsável de Armazém',
      metadata: [
        { label: 'Unidade Remetente (Origem)', value: `${origin?.name} (${origin?.province})` },
        { label: 'Unidade Destinatária (Destino)', value: `${dest?.name} (${dest?.province})` },
        { label: 'Data / Hora da Guia', value: new Date(trf.requestDate).toLocaleString('pt-AO') },
        { label: 'Transportadora / Frota', value: trf.transportDetails?.carrier || 'Frota Interna' },
        { label: 'Motorista / Condutor', value: `${trf.transportDetails?.driverName || 'N/A'} (${trf.transportDetails?.driverPhone || 'S/Contacto'})` },
        { label: 'Matrícula do Veículo', value: trf.transportDetails?.vehiclePlate || 'N/A' },
        { label: 'Previsão de Chegada', value: trf.transportDetails?.estimatedArrival || 'A definir' },
        { label: 'Status da Guia', value: trf.status.toUpperCase() },
      ],
      tables: [
        {
          headers: ['SKU', 'Designação do Material', 'Qtd. Solicitada', 'Qtd. Enviada / Recebida', 'Estado'],
          rows: trf.items.map(i => [
            i.sku,
            i.productName,
            `${i.quantity} UN`,
            `${i.quantity} UN`,
            trf.status.toUpperCase(),
          ]),
        },
      ],
      notes: `Observações da Operação: ${trf.notes || 'Transferência realizada sob controlo e balanço logístico regional.'}`,
      signatures: ['Responsável Armazém Origem (Expedição)', 'Motorista / Transportador (Trânsito)', 'Responsável Armazém Destino (Recepção)'],
    });
  };

  const handleExportExcel = () => {
    const headers = [
      'N° Guia',
      'Data Solicitação',
      'Origem',
      'Destino',
      'Solicitante',
      'Motorista / Veículo',
      'Previsão Chegada',
      'Status',
      'Detalhes dos Itens',
    ];

    const rows = transfers.map(t => [
      t.transferCode,
      new Date(t.requestDate).toLocaleDateString('pt-AO'),
      erpStore.warehouses.find(w => w.id === t.originWarehouseId)?.name || 'Origem',
      erpStore.warehouses.find(w => w.id === t.destinationWarehouseId)?.name || 'Destino',
      t.requestedByUserName,
      `${t.transportDetails?.driverName || 'N/A'} (${t.transportDetails?.vehiclePlate || 'N/A'})`,
      t.transportDetails?.estimatedArrival || 'N/A',
      t.status.toUpperCase(),
      t.items.map(i => `${i.productName}: ${i.quantity}`).join('; '),
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
            <span>Comunicação & Logística Inter-Armazéns</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Protocolo de requisição multilinhas, validação de saldos na origem, despacho e conferência discriminada item a item no destino.
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
            <span>Solicitar Vários Produtos</span>
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
                <th className="py-2.5 px-3">Remetente (Origem)</th>
                <th className="py-2.5 px-3">Destinatário</th>
                <th className="py-2.5 px-3">Discriminação dos Produtos</th>
                <th className="py-2.5 px-3">Motorista & Transporte</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Ações Operacionais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Nenhuma transferência inter-armazém registrada até ao momento.
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
                        {/* Exibição Discriminada de cada Item com seu Nome e Quantidade */}
                        <div className="space-y-1">
                          {trf.items.map((i, idx) => (
                            <div key={idx} className="text-[11px] text-slate-200 font-mono flex items-center gap-1.5">
                              <span className="text-sky-400 font-bold">•</span>
                              <span className="font-semibold">{i.productName}:</span>
                              <span className="text-amber-300 font-bold">{i.quantity} UN</span>
                              <span className="text-slate-500 text-[10px]">({i.sku})</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {trf.transportDetails?.driverName ? (
                          <div>
                            <div className="font-semibold text-slate-200 flex items-center gap-1">
                              <Truck className="w-3 h-3 text-sky-400" />
                              <span>{trf.transportDetails.driverName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Placa: {trf.transportDetails.vehiclePlate || 'N/A'} | Tel: {trf.transportDetails.driverPhone || 'N/A'}
                            </div>
                            {trf.transportDetails.estimatedArrival && (
                              <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                <span>Chegada: {trf.transportDetails.estimatedArrival}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Aguardando Expedição</span>
                        )}
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
                          {/* Análise e Aprovação pelo Armazém de Origem */}
                          {(isOrigin || currentUser?.role === 'superadmin') && trf.status === 'solicitada' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setApprovingTransfer(trf)}
                                className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow"
                                title="Analisar Estoque, Ajustar e Despachar Motorista"
                              >
                                <Send className="w-3 h-3" />
                                <span>Analisar & Despachar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectingTransfer(trf)}
                                className="px-2 py-1 bg-red-900 hover:bg-red-800 text-red-200 rounded text-[11px] font-semibold flex items-center gap-1"
                                title="Reprovar/Rejeitar Pedido"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Reprovar</span>
                              </button>
                            </>
                          )}

                          {/* Conferência Física Item por Item no Armazém de Destino */}
                          {(isDestination || currentUser?.role === 'superadmin') && trf.status === 'em_transito' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setReceivingTransfer(trf)}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow"
                                title="Conferir Entrada de Cada Item no Estoque"
                              >
                                <Check className="w-3 h-3" />
                                <span>Conferir & Receber</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectingTransfer(trf)}
                                className="px-2 py-1 bg-red-900 hover:bg-red-800 text-red-200 rounded text-[11px] font-semibold flex items-center gap-1"
                                title="Rejeitar Carga Recebida"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Rejeitar</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => handlePrintTransferDoc(trf)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded transition-colors"
                            title="Imprimir Guia Oficial (PDF)"
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

      {/* MODAL 1: Solicitar Vários Produtos */}
      {isNewTransferOpen && (
        <NewMultiTransferModal
          onClose={() => setIsNewTransferOpen(false)}
          onSuccess={() => {
            setIsNewTransferOpen(false);
            alert('Solicitação de transferência enviada com sucesso ao armazém remetente!');
          }}
        />
      )}

      {/* MODAL 2: Armazém Remetente Analisa Estoque e Associa Motorista */}
      {approvingTransfer && (
        <ApproveTransferModal
          transfer={approvingTransfer}
          onClose={() => setApprovingTransfer(null)}
          onSuccess={() => {
            setApprovingTransfer(null);
            alert('Transferência aprovada! Carga despachada com os valores reais definidos.');
          }}
        />
      )}

      {/* MODAL 3: Conferência Discriminada de Entrada Item por Item na Recepção */}
      {receivingTransfer && (
        <ReceiveCheckModal
          transfer={receivingTransfer}
          onClose={() => setReceivingTransfer(null)}
          onSuccess={() => {
            setReceivingTransfer(null);
            alert('Conferência concluída! Os produtos deram entrada discriminada com sucesso no estoque do armazém.');
          }}
        />
      )}

      {/* MODAL 4: Reprovar / Rejeitar Transferência (com justificativa) */}
      {rejectingTransfer && (
        <RejectTransferModal
          transfer={rejectingTransfer}
          onClose={() => setRejectingTransfer(null)}
          onSuccess={() => {
            setRejectingTransfer(null);
            alert('Transferência reprovada/rejeitada e registada no histórico do ERP.');
          }}
        />
      )}
    </div>
  );
};

// ==========================================
// MODAL 1: Solicitação Multilinhas
// ==========================================
interface TransferLine {
  sku: string;
  quantity: number;
}

const NewMultiTransferModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({
  onClose,
  onSuccess,
}) => {
  const activeWh = erpStore.getActiveWarehouse();
  const otherWhs = erpStore.warehouses.filter(w => w.id !== activeWh?.id);

  const [originWhId, setOriginWhId] = useState(otherWhs[0]?.id || '');
  const [notes, setNotes] = useState('Solicitação de contingência para reposição de estoque.');
  const [lines, setLines] = useState<TransferLine[]>([
    { sku: 'SKU-00001', quantity: 4 },
    { sku: 'SKU-00002', quantity: 3 },
  ]);

  const handleAddLine = () => {
    setLines([...lines, { sku: '', quantity: 1 }]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originWhId) {
      alert('Selecione o armazém fornecedor de origem.');
      return;
    }
    if (lines.length === 0) {
      alert('Adicione pelo menos um produto na solicitação.');
      return;
    }

    const validItems = [];
    for (const line of lines) {
      const prod = catalogService.getProductBySku(line.sku.trim().toUpperCase());
      if (!prod) {
        alert(`SKU não encontrado no catálogo do sistema: ${line.sku}`);
        return;
      }
      if (line.quantity <= 0) {
        alert(`Quantidade inválida para o SKU ${prod.sku}`);
        return;
      }
      validItems.push({
        productId: prod.id,
        sku: prod.sku,
        productName: prod.name,
        quantity: line.quantity,
      });
    }

    erpStore.requestTransfer({
      originWarehouseId: originWhId,
      destinationWarehouseId: activeWh?.id || 'wh-luanda',
      requestedByUserId: erpStore.currentUser?.id || 'sys',
      requestedByUserName: erpStore.currentUser?.name || 'Responsável Armazém',
      items: validItems,
      notes,
    });

    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full p-6 text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-white">Solicitação de Produtos Inter-Armazéns</h3>
            <p className="text-xs text-slate-400">Armazém Solicitante (Destino): <strong className="text-sky-400">{activeWh?.name}</strong></p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleCreate} className="py-4 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Armazém Remetente (Fornecedor) *</label>
            <select
              value={originWhId}
              onChange={e => setOriginWhId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-semibold"
            >
              {otherWhs.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.province})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Justificativa / Motivo da Transferência</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-200">Produtos a Requisitar:</span>
              <button
                type="button"
                onClick={handleAddLine}
                className="px-2.5 py-1 bg-sky-700 hover:bg-sky-600 text-white rounded text-[11px] flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3 h-3" /> Adicionar Item
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-950 p-2 rounded border border-slate-800">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 uppercase block">Código SKU *</label>
                    <input
                      type="text"
                      required
                      value={line.sku}
                      onChange={e => {
                        const newLines = [...lines];
                        newLines[idx].sku = e.target.value.toUpperCase();
                        setLines(newLines);
                      }}
                      placeholder="Ex: SKU-00001"
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono"
                    />
                  </div>

                  <div className="w-32">
                    <label className="text-[10px] text-slate-400 uppercase block">Qtd. Pretendida *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={line.quantity}
                      onChange={e => {
                        const newLines = [...lines];
                        newLines[idx].quantity = parseInt(e.target.value, 10) || 1;
                        setLines(newLines);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono"
                    />
                  </div>

                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="mt-4 p-1.5 bg-red-950 hover:bg-red-900 text-red-300 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
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
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold shadow"
            >
              Enviar Pedido
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// MODAL 2: Análise de Estoque na Origem & Expedição
// ==========================================
const ApproveTransferModal: React.FC<{
  transfer: WarehouseTransfer;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ transfer, onClose, onSuccess }) => {
  const originWh = erpStore.warehouses.find(w => w.id === transfer.originWarehouseId);
  const destWh = erpStore.warehouses.find(w => w.id === transfer.destinationWarehouseId);

  const [itemsToShip, setItemsToShip] = useState(
    transfer.items.map(item => {
      const prod = catalogService.getProductBySku(item.sku);
      const availableStock = prod ? (prod.stockLevels[transfer.originWarehouseId] || 0) : 0;
      return {
        ...item,
        availableStock,
        approvedQty: Math.min(item.quantity, availableStock),
      };
    })
  );

  const [carrier, setCarrier] = useState('Frota Própria CATASSO ERP');
  const [driverName, setDriverName] = useState('Mateus Kitumba');
  const [driverPhone, setDriverPhone] = useState('+244 923 888 111');
  const [vehiclePlate, setVehiclePlate] = useState('LD-89-32-GZ');
  const [estimatedArrival, setEstimatedArrival] = useState('23/10/2026 às 14:00');

  const handleConfirmDespatch = (e: React.FormEvent) => {
    e.preventDefault();

    const totalApproved = itemsToShip.reduce((acc, i) => acc + i.approvedQty, 0);
    if (totalApproved <= 0) {
      alert('A quantidade a enviar não pode ser zero para todos os produtos.');
      return;
    }

    erpStore.approveTransfer(transfer.id, {
      items: itemsToShip.map(i => ({
        productId: i.productId,
        sku: i.sku,
        productName: i.productName,
        quantity: i.approvedQty,
      })),
      transportDetails: {
        carrier,
        driverName,
        driverPhone,
        vehiclePlate,
        estimatedArrival,
      },
    });

    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full p-6 text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-xs text-amber-400 font-mono font-bold">{transfer.transferCode}</span>
            <h3 className="font-bold text-base text-white">Análise de Estoque e Despacho de Carga</h3>
            <p className="text-xs text-slate-400">Origem: {originWh?.name} ➔ Destino: {destWh?.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleConfirmDespatch} className="py-4 space-y-4 text-xs">
          <div>
            <label className="block text-slate-200 font-bold mb-2 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-sky-400" />
              <span>1. Definição de Quantidade Real a Enviar Por Item:</span>
            </label>

            <div className="space-y-2 bg-slate-950 p-3 rounded border border-slate-800">
              {itemsToShip.map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="font-mono font-bold text-white">{item.productName} ({item.sku})</div>
                    <div className="text-[10px] text-slate-400">
                      Pedido do Destino: <strong className="text-amber-400">{item.quantity} UN</strong> |
                      Estoque Físico na Origem: <strong className={item.availableStock >= item.quantity ? 'text-emerald-400' : 'text-red-400'}>{item.availableStock} UN</strong>
                    </div>
                  </div>

                  <div className="w-full sm:w-36">
                    <label className="text-[10px] text-emerald-400 uppercase block font-semibold">Qtd. Efetiva Aprovada</label>
                    <input
                      type="number"
                      min="0"
                      max={item.availableStock}
                      value={item.approvedQty}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10) || 0;
                        const newItems = [...itemsToShip];
                        newItems[idx].approvedQty = Math.min(val, item.availableStock);
                        setItemsToShip(newItems);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-emerald-400 font-mono font-bold focus:border-amber-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-slate-200 font-bold flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>2. Dados do Transporte e Motorista Responsável:</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Empresa / Transportadora *</label>
                <input
                  type="text"
                  required
                  value={carrier}
                  onChange={e => setCarrier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome do Motorista *</label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={e => setDriverName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Telefone *</label>
                <input
                  type="text"
                  required
                  value={driverPhone}
                  onChange={e => setDriverPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Matrícula do Veículo *</label>
                <input
                  type="text"
                  required
                  value={vehiclePlate}
                  onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Previsão de Chegada *</label>
                <input
                  type="text"
                  required
                  value={estimatedArrival}
                  onChange={e => setEstimatedArrival(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-emerald-400 font-mono font-semibold"
                />
              </div>
            </div>
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow"
            >
              Aprovar, Despachar & Iniciar Trânsito
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// MODAL 3: Conferência Discriminada na Recepção (Item por Item)
// ==========================================
const ReceiveCheckModal: React.FC<{
  transfer: WarehouseTransfer;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ transfer, onClose, onSuccess }) => {
  const [receivedItems, setReceivedItems] = useState(
    transfer.items.map(item => ({
      ...item,
      receivedQuantity: item.quantity, // Por padrão sugere a quantidade enviada pelo motorista
    }))
  );

  const handleConfirmReceipt = (e: React.FormEvent) => {
    e.preventDefault();

    // Atualiza o recebimento no store com as quantidades confirmadas
    erpStore.receiveTransfer(transfer.id, {
      receivedItems: receivedItems.map(i => ({
        productId: i.productId,
        sku: i.sku,
        productName: i.productName,
        quantity: i.receivedQuantity,
      })),
    });

    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full p-6 text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-xs text-emerald-400 font-mono font-bold">{transfer.transferCode}</span>
            <h3 className="font-bold text-base text-white">Conferência Física de Entrada Discriminada</h3>
            <p className="text-xs text-slate-400">Verifique a quantidade real entregue pelo motorista para cada produto individualmente.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleConfirmReceipt} className="py-4 space-y-4 text-xs">
          <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-3">
            <div className="text-[11px] font-semibold text-slate-300">Discriminação das Mercadorias Recebidas:</div>

            {receivedItems.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-slate-900 rounded border border-slate-800">
                <div className="flex-1">
                  <div className="font-semibold text-white text-xs">{item.productName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    SKU: {item.sku} | Quantidade Despachada na Guia: <strong className="text-amber-400">{item.quantity} UN</strong>
                  </div>
                </div>

                <div className="w-full sm:w-40">
                  <label className="text-[10px] text-emerald-400 uppercase block font-semibold">Qtd. Real Recebida</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={item.receivedQuantity}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10) || 0;
                      const newItems = [...receivedItems];
                      newItems[idx].receivedQuantity = val;
                      setReceivedItems(newItems);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-emerald-400 font-mono font-bold focus:border-emerald-500"
                  />
                </div>
              </div>
            ))}
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow"
            >
              Confirmar Entrada Exata no Estoque
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// MODAL 4: Reprovar / Rejeitar Transferência
// ==========================================
const RejectTransferModal: React.FC<{
  transfer: WarehouseTransfer;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ transfer, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Por favor, informe o motivo da reprovação/rejeição.');
      return;
    }

    erpStore.rejectTransfer(transfer.id, reason.trim());
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full p-6 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-xs text-red-400 font-mono font-bold">{transfer.transferCode}</span>
            <h3 className="font-bold text-base text-white">Reprovar / Rejeitar Transferência</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleReject} className="py-4 space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Motivo / Justificativa da Reprovação *</label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex: Falta de estoque físico na origem / Material danificado durante o transporte..."
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-red-500"
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
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded text-xs font-semibold shadow"
            >
              Confirmar Reprovação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
