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
  Phone,
  UserCheck,
  Calendar,
  AlertTriangle,
  Info,
} from 'lucide-react';

export const Transfers: React.FC = () => {
  const [isNewTransferOpen, setIsNewTransferOpen] = useState(false);
  const [approvingTransfer, setApprovingTransfer] = useState<WarehouseTransfer | null>(null);

  const currentUser = erpStore.currentUser;
  const activeWh = erpStore.getActiveWarehouse();

  // Filter transfers involving active warehouse (or all for superadmin)
  const transfers = erpStore.transfers.filter(trf => {
    if (currentUser?.role === 'superadmin') return true;
    return trf.originWarehouseId === activeWh?.id || trf.destinationWarehouseId === activeWh?.id;
  });

  const handleReceive = (trfId: string) => {
    if (confirm('Confirma o recebimento e conferência física dos produtos no estoque?')) {
      erpStore.receiveTransfer(trfId);
      alert('Transferência recebida com sucesso! Os produtos deram entrada no estoque do armazém de destino.');
    }
  };

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
        { label: 'Status do Protocolo', value: trf.status.toUpperCase() },
      ],
      tables: [
        {
          headers: ['SKU', 'Designação do Material', 'Qtd. Solicitada', 'Qtd. Enviada / Despachada', 'Estado'],
          rows: trf.items.map(i => [
            i.sku,
            i.productName,
            `${i.quantity} UN`,
            `${i.quantity} UN`,
            trf.status.toUpperCase(),
          ]),
        },
      ],
      notes: `Observações da Operação: ${trf.notes || 'Transferência realizada sob rigoroso controlo de movimentação e balanço logístico regional.'}`,
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
      'Qtd Total Itens',
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
            <span>Comunicação & Logística Inter-Armazéns</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Protocolo de requisição multilinhas, validação de saldos de origem, despacho com motorista e controlo de trânsito.
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
                <th className="py-2.5 px-3">Itens Requisitados</th>
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
                        <div className="font-mono text-slate-300 font-bold">
                          {trf.items.length} {trf.items.length === 1 ? 'Produto' : 'Produtos'} ({trf.items.reduce((acc, item) => acc + item.quantity, 0)} UN)
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">
                          {trf.items.map(i => `${i.sku}: ${i.quantity} UN`).join(' | ')}
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
                          {/* Botão de Análise e Aprovação pelo Armazém de Origem */}
                          {(isOrigin || currentUser?.role === 'superadmin') && trf.status === 'solicitada' && (
                            <button
                              type="button"
                              onClick={() => setApprovingTransfer(trf)}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow"
                              title="Analisar Estoque, Ajustar Quantidades e Despachar Motorista"
                            >
                              <Send className="w-3 h-3" />
                              <span>Analisar & Despachar</span>
                            </button>
                          )}

                          {/* Confirmação de Recepção pelo Armazém de Destino */}
                          {(isDestination || currentUser?.role === 'superadmin') && trf.status === 'em_transito' && (
                            <button
                              type="button"
                              onClick={() => handleReceive(trf.id)}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow"
                              title="Confirmar Chegada e Ingerir no Estoque"
                            >
                              <Check className="w-3 h-3" />
                              <span>Confirmar Recepção</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handlePrintTransferDoc(trf)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded transition-colors"
                            title="Imprimir Guia de Transferência Oficial (PDF)"
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

      {/* Modal 1: Solicitar Vários Produtos de uma Vez */}
      {isNewTransferOpen && (
        <NewMultiTransferModal
          onClose={() => setIsNewTransferOpen(false)}
          onSuccess={() => {
            setIsNewTransferOpen(false);
            alert('Solicitação de transferência enviada com sucesso ao armazém remetente!');
          }}
        />
      )}

      {/* Modal 2: Armazém Remetente Confere Estoque e Associa Motorista/Envio */}
      {approvingTransfer && (
        <ApproveTransferModal
          transfer={approvingTransfer}
          onClose={() => setApprovingTransfer(null)}
          onSuccess={() => {
            setApprovingTransfer(null);
            alert('Transferência aprovada! Carga despachada e estoque baixado na origem.');
          }}
        />
      )}
    </div>
  );
};

// ==========================================
// MODAL 1: Solicitação Multilinhas Inter-Armazéns
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
  const [notes, setNotes] = useState('Solicitação de contingência para reposição urgente de estoque.');
  const [lines, setLines] = useState<TransferLine[]>([
    { sku: 'SKU-00001', quantity: 10 },
    { sku: 'SKU-00002', quantity: 5 },
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

    // Validar SKUs inseridos
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
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-sky-500 font-semibold"
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
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-sky-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-200">Lista de Produtos Requisitados:</span>
              <button
                type="button"
                onClick={handleAddLine}
                className="px-2.5 py-1 bg-sky-700 hover:bg-sky-600 text-white rounded text-[11px] flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3 h-3" /> Adicionar Produto
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
                    <label className="text-[10px] text-slate-400 uppercase block">Qtd. Solicitada *</label>
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
                      title="Remover produto"
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
              Enviar Pedido Inter-Armazéns
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// MODAL 2: Análise de Estoque na Origem & Expedição (Motorista / Veículo / Previsão)
// ==========================================
const ApproveTransferModal: React.FC<{
  transfer: WarehouseTransfer;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ transfer, onClose, onSuccess }) => {
  const originWh = erpStore.warehouses.find(w => w.id === transfer.originWarehouseId);
  const destWh = erpStore.warehouses.find(w => w.id === transfer.destinationWarehouseId);

  // Estado para conferir e editar as quantidades que o armazém remetente PODE efetivamente enviar
  const [itemsToShip, setItemsToShip] = useState(
    transfer.items.map(item => {
      const prod = catalogService.getProductBySku(item.sku);
      const availableStock = prod ? (prod.stockLevels[transfer.originWarehouseId] || 0) : 0;
      return {
        ...item,
        availableStock,
        approvedQty: Math.min(item.quantity, availableStock), // Por padrão sugere o que for possível
      };
    })
  );

  // Dados do transporte e motorista
  const [carrier, setCarrier] = useState('Frota Própria CATASSO ERP');
  const [driverName, setDriverName] = useState('Mateus Kitumba');
  const [driverPhone, setDriverPhone] = useState('+244 923 888 111');
  const [vehiclePlate, setVehiclePlate] = useState('LD-89-32-GZ');
  const [estimatedArrival, setEstimatedArrival] = useState('23/10/2026 às 14:00');

  const handleConfirmDespatch = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar se pelo menos 1 item será enviado
    const totalApproved = itemsToShip.reduce((acc, i) => acc + i.approvedQty, 0);
    if (totalApproved <= 0) {
      alert('A quantidade a enviar não pode ser zero para todos os produtos.');
      return;
    }

    // Atualizar no erpStore
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
            <h3 className="font-bold text-base text-white">Análise e Despacho de Transferência</h3>
            <p className="text-xs text-slate-400">Origem: {originWh?.name} ➔ Destino: {destWh?.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleConfirmDespatch} className="py-4 space-y-4 text-xs">
          {/* Conferência de Estoque na Origem */}
          <div>
            <label className="block text-slate-200 font-bold mb-2 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-sky-400" />
              <span>1. Conferência de Estoque Disponível & Quantidades a Enviar:</span>
            </label>

            <div className="space-y-2 bg-slate-950 p-3 rounded border border-slate-800">
              {itemsToShip.map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="font-mono font-bold text-white">{item.sku} - {item.productName}</div>
                    <div className="text-[10px] text-slate-400">
                      Solicitado pelo destino: <strong className="text-amber-400">{item.quantity} UN</strong> |
                      Estoque no Armazém Origem: <strong className={item.availableStock >= item.quantity ? 'text-emerald-400' : 'text-red-400'}>{item.availableStock} UN</strong>
                    </div>
                  </div>

                  <div className="w-full sm:w-36">
                    <label className="text-[10px] text-slate-400 uppercase block font-semibold">Qtd. Aprovada / Enviada</label>
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
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono font-bold focus:border-amber-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Informações do Envio e Motorista */}
          <div className="space-y-3">
            <label className="block text-slate-200 font-bold flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>2. Informações do Condutor e Previsão de Transporte:</span>
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
                <label className="block text-slate-300 font-semibold mb-1">Contacto Telefónico *</label>
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
                  placeholder="Ex: 24/10/2026 às 10:00"
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
              Aprovar, Baixar Estoque & Iniciar Trânsito
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
