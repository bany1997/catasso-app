import React, { useState } from 'react';
import { erpStore } from '../../services/store';
import { catalogService } from '../../services/catalogService';
import { formatAOA } from '../../services/i18n';
import { exportToExcel, printFormalDocument, printProductLabels } from '../../services/exportService';
import {
  ClipboardCheck,
  CheckCircle,
  AlertOctagon,
  Download,
  FileText,
  Printer,
  FileSpreadsheet,
  PackageCheck,
  Clock,
  Truck,
  ShieldCheck,
  Eye,
  History,
} from 'lucide-react';

export const ReceivingInspection: React.FC = () => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [inspectionNotes, setInspectionNotes] = useState('');

  // Checklist items
  const [itemsChecklist, setItemsChecklist] = useState<
    {
      productId: string;
      sku: string;
      productName: string;
      quantityRequested: number;
      quantityAlreadyReceived: number;
      quantityPending: number;
      quantityReceivedNow: number;
      condition: 'conforme' | 'danificado' | 'incompleto' | 'divergente';
      batchNumber: string;
      notes: string;
    }[]
  >([]);

  const activeWh = erpStore.getActiveWarehouse();
  const currentUser = erpStore.currentUser;

  // Candidate orders for receiving (approved, in transit or partially received)
  const candidateOrders = erpStore.purchaseOrders.filter(
    po =>
      po.warehouseId === activeWh?.id &&
      (po.status === 'em_transito' || po.status === 'aprovado' || po.status === 'recebido_parcial')
  );

  const selectedOrder = erpStore.purchaseOrders.find(p => p.id === selectedOrderId);
  const orderShipments = erpStore.shipments.filter(s => s.orderId === selectedOrderId);

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    const po = erpStore.purchaseOrders.find(p => p.id === orderId);
    if (!po) return;

    setItemsChecklist(
      po.items.map(item => {
        const alreadyReceived = item.quantityReceived || 0;
        const pending = Math.max(0, item.quantityRequested - alreadyReceived);
        return {
          productId: item.productId,
          sku: item.sku,
          productName: item.productName,
          quantityRequested: item.quantityRequested,
          quantityAlreadyReceived: alreadyReceived,
          quantityPending: pending,
          quantityReceivedNow: pending, // Sugere por defeito o que falta
          condition: 'conforme',
          batchNumber: `LOTE-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
          notes: '',
        };
      })
    );
  };

  const handleUpdateItem = (
    index: number,
    field: 'quantityReceivedNow' | 'condition' | 'batchNumber' | 'notes',
    value: any
  ) => {
    const updated = [...itemsChecklist];
    updated[index] = { ...updated[index], [field]: value };
    setItemsChecklist(updated);
  };

  const handleCompleteInspection = () => {
    if (!selectedOrder) return;

    const itemsCheckedFormatted = itemsChecklist.map(i => ({
      productId: i.productId,
      sku: i.sku,
      productName: i.productName,
      quantityExpected: i.quantityPending,
      quantityReceived: i.quantityReceivedNow,
      condition: i.condition,
      batchNumber: i.batchNumber,
      notes: i.notes,
    }));

    const result = erpStore.completeReceivingInspection({
      orderId: selectedOrder.id,
      shipmentId: orderShipments[orderShipments.length - 1]?.id,
      itemsChecked: itemsCheckedFormatted,
      notes: inspectionNotes,
    });

    if (result.success) {
      if (result.rncCreated) {
        alert(
          `Inspeção registada! Foram detetadas divergências/falta de quantidade. O relatório RNC ${result.rncCreated.rncNumber} foi aberto automaticamente para o fornecedor reenviar a falta.`
        );
      } else {
        alert(
          'Recebimento efetuado com sucesso! As quantidades conferidas deram entrada automática no stock.'
        );
      }
      setSelectedOrderId('');
    }
  };

  const handlePrintReceivedLabels = () => {
    if (!selectedOrder || itemsChecklist.length === 0) return;
    const labelsToPrint = itemsChecklist
      .filter(item => item.quantityReceivedNow > 0)
      .map(item => {
        const prod = catalogService.getProductById(item.productId);
        return {
          sku: item.sku,
          name: item.productName,
          category: prod?.category || 'Geral',
          warehouseName: activeWh?.name || 'Armazém Central',
          locationBin: prod?.warehouseData[activeWh?.id || '']?.localLocationId || 'DOCA-01',
          originRef: `PED: ${selectedOrder.orderNumber}`,
          supplierName: selectedOrder.supplierName,
          quantity: item.quantityReceivedNow,
          unit: prod?.unit || 'UN',
          batchNumber: item.batchNumber,
          isChemical: prod?.isChemical,
          fispqNumber: prod?.chemicalInfo?.fispqNumber,
          isCalibrated: prod?.isCalibrated,
          calibrationCert: prod?.calibrationInfo?.certificateNumber,
        };
      });
    printProductLabels(labelsToPrint);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-sky-400" />
          <span>Recebimento Físico, Inspeção de Carga & Histórico de Entregas</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Conferência de remessas parciais ou totais. Controlo rigoroso das quantidades em falta para posterior reenvio pelo fornecedor.
        </p>
      </div>

      {/* Select Order */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <label className="block text-xs font-semibold text-slate-300 mb-2">
          Selecione a Encomenda para Inspeção ({activeWh?.name}):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {candidateOrders.length === 0 ? (
            <div className="col-span-3 text-xs text-slate-500 py-3">
              Não há encomendas pendentes de recebimento neste armazém.
            </div>
          ) : (
            candidateOrders.map(po => {
              const isSelected = selectedOrderId === po.id;
              return (
                <button
                  key={po.id}
                  type="button"
                  onClick={() => handleSelectOrder(po.id)}
                  className={`text-left p-3 rounded border transition-colors ${
                    isSelected
                      ? 'bg-sky-950/80 border-sky-600 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sky-400">{po.orderNumber}</span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      {po.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-200 mt-1 truncate">
                    {po.supplierName}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {po.items.length} itens no pedido
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Inspection Workspace */}
      {selectedOrder && (
        <div className="space-y-4">
          {/* Historical Shipments Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <History className="w-4 h-4 text-sky-400" />
              <span>Histórico de Remessas Anteriores ({orderShipments.length} envios registados)</span>
            </h3>
            {orderShipments.length === 0 ? (
              <p className="text-xs text-slate-500">Este é o primeiro envio registado para esta encomenda.</p>
            ) : (
              <div className="space-y-2">
                {orderShipments.map((sh, idx) => (
                  <div key={sh.id} className="bg-slate-950 p-2.5 rounded border border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-sky-400">Remessa #{idx + 1} ({sh.shipmentNumber})</span>
                      <span className="text-slate-400 ml-2">Guia: {sh.trackingOrWaybill}</span>
                    </div>
                    <div className="text-slate-300">
                      Estado: <strong className="uppercase text-emerald-400">{sh.status}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Table with Pending and Missing quantities */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Conferência de Quantidades (Foco no que Falta / Remessa Atual)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Produto</th>
                    <th className="py-2.5 px-3 text-center">Total Solicitado</th>
                    <th className="py-2.5 px-3 text-center text-emerald-400">Já Recebido Anteriormente</th>
                    <th className="py-2.5 px-3 text-center text-amber-400">Quantidade em Falta</th>
                    <th className="py-2.5 px-3 text-center text-sky-400">Receber Agora</th>
                    <th className="py-2.5 px-3">Condição</th>
                    <th className="py-2.5 px-3">Lote</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {itemsChecklist.map((item, idx) => (
                    <tr key={item.productId} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-bold text-sky-400">{item.sku}</td>
                      <td className="py-3 px-3 font-medium text-slate-200">{item.productName}</td>
                      <td className="py-3 px-3 text-center font-mono text-white">{item.quantityRequested} UN</td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-400">{item.quantityAlreadyReceived} UN</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">{item.quantityPending} UN</td>
                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={item.quantityPending}
                          value={item.quantityReceivedNow}
                          onChange={e =>
                            handleUpdateItem(idx, 'quantityReceivedNow', parseInt(e.target.value, 10) || 0)
                          }
                          className="w-20 bg-slate-950 border border-slate-700 rounded py-1 px-2 text-center text-white font-mono font-bold focus:border-sky-500"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={item.condition}
                          onChange={e => handleUpdateItem(idx, 'condition', e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded py-1 px-2 text-xs text-emerald-400 font-semibold"
                        >
                          <option value="conforme">Conforme (OK)</option>
                          <option value="danificado">Danificado</option>
                          <option value="incompleto">Incompleto / Falta</option>
                          <option value="divergente">Divergente</option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={item.batchNumber}
                          onChange={e => handleUpdateItem(idx, 'batchNumber', e.target.value)}
                          className="w-28 bg-slate-950 border border-slate-700 rounded py-1 px-2 text-white font-mono text-[11px]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={handlePrintReceivedLabels}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-sky-400" />
                <span>Imprimir Etiquetas da Remessa</span>
              </button>

              <button
                type="button"
                onClick={handleCompleteInspection}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-2 shadow-lg"
              >
                <PackageCheck className="w-4 h-4" />
                <span>Concluir Recebimento e Gerar Pendências se necessário</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
