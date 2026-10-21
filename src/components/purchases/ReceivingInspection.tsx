import React, { useState } from 'react';
import { erpStore } from '../../services/store';
import { catalogService } from '../../services/catalogService';
import { formatAOA } from '../../services/i18n';
import { exportToExcel, printFormalDocument, printProductLabels } from '../../services/exportService';
import { PurchaseOrder, Shipment } from '../../types';
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
      quantityExpected: number;
      quantityReceived: number;
      condition: 'conforme' | 'danificado' | 'incompleto' | 'divergente';
      batchNumber: string;
      notes: string;
    }[]
  >([]);

  const activeWh = erpStore.getActiveWarehouse();
  const currentUser = erpStore.currentUser;

  // Active in-transit or approved purchase orders for this warehouse
  const candidateOrders = erpStore.purchaseOrders.filter(
    po =>
      po.warehouseId === activeWh?.id &&
      (po.status === 'em_transito' || po.status === 'aprovado' || po.status === 'recebido_parcial')
  );

  const selectedOrder = erpStore.purchaseOrders.find(p => p.id === selectedOrderId);
  const orderShipment = erpStore.shipments.find(s => s.orderId === selectedOrderId);

  // Initialize checklist when selecting order
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    const po = erpStore.purchaseOrders.find(p => p.id === orderId);
    if (!po) return;

    setItemsChecklist(
      po.items.map(item => ({
        productId: item.productId,
        sku: item.sku,
        productName: item.productName,
        quantityExpected: item.quantityRequested - (item.quantityReceived || 0),
        quantityReceived: item.quantityRequested - (item.quantityReceived || 0), // default to expected
        condition: 'conforme',
        batchNumber: `LOTE-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
        notes: '',
      }))
    );
  };

  const handleUpdateItem = (
    index: number,
    field: 'quantityReceived' | 'condition' | 'batchNumber' | 'notes',
    value: any
  ) => {
    const updated = [...itemsChecklist];
    updated[index] = { ...updated[index], [field]: value };
    setItemsChecklist(updated);
  };

  // Complete Receiving & Ingest into stock
  const handleCompleteInspection = () => {
    if (!selectedOrder) return;

    const result = erpStore.completeReceivingInspection({
      orderId: selectedOrder.id,
      shipmentId: orderShipment?.id,
      itemsChecked: itemsChecklist,
      notes: inspectionNotes,
    });

    if (result.success) {
      if (result.rncCreated) {
        alert(
          `Inspeção finalizada! Foram encontradas não conformidades. O relatório ${result.rncCreated.rncNumber} foi aberto automaticamente para resolução.`
        );
      } else {
        alert(
          'Inspeção 100% Conforme! Todos os produtos deram entrada automática no estoque do armazém e a ordem foi marcada como COMPRADO.'
        );
      }
      setSelectedOrderId('');
    }
  };

  // Batch Print Labels for all conforming received items
  const handlePrintReceivedLabels = () => {
    if (!selectedOrder || itemsChecklist.length === 0) return;

    const labelsToPrint = itemsChecklist
      .filter(item => item.quantityReceived > 0)
      .map(item => {
        const prod = catalogService.getProductById(item.productId);
        return {
          sku: item.sku,
          name: item.productName,
          category: prod?.category || 'Geral',
          warehouseName: activeWh?.name || 'Armazém Central',
          locationBin: prod?.warehouseData[activeWh?.id || '']?.localLocationId || 'DOCA-01',
          originRef: `PED: ${selectedOrder.orderNumber} / GUIA: ${orderShipment?.trackingOrWaybill || 'S/N'}`,
          supplierName: selectedOrder.supplierName,
          quantity: item.quantityReceived,
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

  // Download Formal Receiving Report PDF
  const handlePrintReceivingReport = () => {
    if (!selectedOrder) return;

    printFormalDocument({
      title: 'Relatório Oficial de Recebimento Físico e Inspeção de Qualidade',
      documentNumber: `REC-${new Date().getFullYear()}-${selectedOrder.orderNumber}`,
      warehouseName: activeWh?.name || 'Armazém Central',
      warehouseProvince: activeWh?.province || 'Luanda',
      date: new Date().toLocaleDateString('pt-AO'),
      authorName: currentUser?.name || 'Responsável Armazém',
      role: currentUser?.role || 'Recebimento & Vistoria',
      metadata: [
        { label: 'Unidade Receptora', value: `${activeWh?.name} (${activeWh?.province})` },
        { label: 'Ordem de Compra', value: selectedOrder.orderNumber },
        { label: 'Fornecedor', value: selectedOrder.supplierName },
        { label: 'Transportadora / Motorista', value: `${orderShipment?.carrierName || 'Próprio'} / ${orderShipment?.driverName || 'N/A'}` },
        { label: 'Guia de Remessa / Waybill', value: orderShipment?.trackingOrWaybill || 'Conforme Nota de Entrega' },
      ],
      tables: [
        {
          headers: ['Código SKU', 'Descrição Técnica', 'Qtd. Esperada', 'Qtd. Recebida', 'Lote Atribuído', 'Condição Física', 'Observações'],
          rows: itemsChecklist.map(i => [
            i.sku,
            i.productName,
            `${i.quantityExpected} UN`,
            `${i.quantityReceived} UN`,
            i.batchNumber,
            i.condition.toUpperCase(),
            i.notes || (i.condition === 'conforme' ? '100% Aprovado' : 'Avaria / Falta'),
          ]),
        },
      ],
      notes: inspectionNotes || 'Carga inspecionada volume a volume quanto à integridade física e lacres.',
      signatures: ['Conferente / Responsável do Armazém', 'Motorista / Transportador', 'Controle de Qualidade'],
    });
  };

  const handleExportExcel = () => {
    if (!selectedOrder) return;
    const headers = ['SKU', 'Produto', 'Esperado', 'Recebido', 'Condição', 'Lote', 'Notas'];
    const rows = itemsChecklist.map(i => [
      i.sku,
      i.productName,
      i.quantityExpected,
      i.quantityReceived,
      i.condition,
      i.batchNumber,
      i.notes,
    ]);
    exportToExcel(`Relatorio_Recebimento_${selectedOrder.orderNumber}`, headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-sky-400" />
          <span>Recebimento Físico, Inspeção de Carga & Ingestão no Estoque</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Conferência item a item das mercadorias enviadas pelos fornecedores. Entrada automática imediata no saldo físico e abertura de Não Conformidades (RNC).
        </p>
      </div>

      {/* Select Order to Inspect */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <label className="block text-xs font-semibold text-slate-300 mb-2">
          Selecione a Encomenda ou Carga em Trânsito para Inspecionar ({activeWh?.name}):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {candidateOrders.length === 0 ? (
            <div className="col-span-3 text-xs text-slate-500 py-3">
              Não há encomendas aprovadas ou em trânsito pendentes de recebimento neste armazém.
            </div>
          ) : (
            candidateOrders.map(po => {
              const isSelected = selectedOrderId === po.id;
              const hasShipment = erpStore.shipments.some(s => s.orderId === po.id);
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
                      {po.status}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-200 mt-1 truncate">
                    {po.supplierName}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                    <span>{po.items.length} itens</span>
                    <span>{formatAOA(po.totalEstimatedAOA)}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Inspection Workbench */}
      {selectedOrder && (
        <div className="space-y-4">
          {/* Order Details & Supplier Attached Documents */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">
                  Conferência da Encomenda {selectedOrder.orderNumber}
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  Fornecedor: <strong className="text-slate-200">{selectedOrder.supplierName}</strong> · Contato:{' '}
                  {selectedOrder.supplierEmail}
                </div>
              </div>

              {orderShipment && (
                <div className="text-xs bg-slate-950 border border-slate-800 px-3 py-1.5 rounded flex items-center gap-3">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block">Transporte:</span>
                    <span className="font-semibold text-slate-200">
                      {orderShipment.carrierName || 'Transportadora Local'} ({orderShipment.modal.toUpperCase()})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block">Motorista:</span>
                    <span className="font-semibold text-slate-200">{orderShipment.driverName || 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Attached Documents from Supplier */}
            {orderShipment && orderShipment.documents.length > 0 && (
              <div className="mt-3 pt-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Documentos Anexados pelo Fornecedor no Despacho:
                </span>
                <div className="flex flex-wrap gap-2">
                  {orderShipment.documents.map(doc => (
                    <a
                      key={doc.id}
                      href="#download"
                      onClick={e => {
                        e.preventDefault();
                        alert(`Download do arquivo simulado: ${doc.name} (${doc.fileSize})`);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded text-xs text-sky-400 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{doc.name}</span>
                      <span className="text-[10px] text-slate-500">({doc.fileSize})</span>
                      <Download className="w-3 h-3 text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Item Checklist Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Vistoria de Itens (Checar Quantidade & Condição Física)
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {itemsChecklist.length} posições a inspecionar
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="py-2.5 px-3">Código SKU</th>
                    <th className="py-2.5 px-3">Descrição Técnica</th>
                    <th className="py-2.5 px-3 text-center">Qtd. Esperada</th>
                    <th className="py-2.5 px-3 text-center">Qtd. Recebida Real</th>
                    <th className="py-2.5 px-3">Condição do Material</th>
                    <th className="py-2.5 px-3">N° Lote</th>
                    <th className="py-2.5 px-3">Observação / Defeito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {itemsChecklist.map((item, idx) => (
                    <tr key={item.productId} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-bold text-sky-400 whitespace-nowrap">
                        {item.sku}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-200">
                        {item.productName}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-white whitespace-nowrap">
                        {item.quantityExpected} UN
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          max={item.quantityExpected}
                          value={item.quantityReceived}
                          onChange={e =>
                            handleUpdateItem(idx, 'quantityReceived', parseInt(e.target.value, 10) || 0)
                          }
                          className="w-20 bg-slate-950 border border-slate-700 rounded py-1 px-2 text-center text-white font-mono font-bold focus:border-sky-500"
                        />
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <select
                          value={item.condition}
                          onChange={e => handleUpdateItem(idx, 'condition', e.target.value)}
                          className={`bg-slate-950 border rounded py-1 px-2 font-semibold text-xs focus:outline-none ${
                            item.condition === 'conforme'
                              ? 'border-emerald-700 text-emerald-400'
                              : 'border-red-700 text-red-400'
                          }`}
                        >
                          <option value="conforme">Conforme (100% OK)</option>
                          <option value="danificado">Avariado / Danificado</option>
                          <option value="incompleto">Falta de Quantidade</option>
                          <option value="divergente">Divergente do Pedido</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.batchNumber}
                          onChange={e => handleUpdateItem(idx, 'batchNumber', e.target.value)}
                          className="w-28 bg-slate-950 border border-slate-700 rounded py-1 px-2 text-white font-mono text-[11px]"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder={item.condition !== 'conforme' ? 'Descreva a irregularidade...' : 'Opcional'}
                          value={item.notes}
                          onChange={e => handleUpdateItem(idx, 'notes', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded py-1 px-2 text-white text-[11px]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-950/90 border-t border-slate-800 space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold text-xs mb-1">
                  Parecer Geral da Vistoria / Observações Finais
                </label>
                <textarea
                  rows={2}
                  value={inspectionNotes}
                  onChange={e => setInspectionNotes(e.target.value)}
                  placeholder="Ex: Carga descarregada na Doca 02, embalagens primárias verificadas e aprovadas."
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs focus:border-sky-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintReceivedLabels}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-sky-400" />
                    <span>Imprimir Todas as Etiquetas do Recebimento (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintReceivingReport}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Baixar Relatório de Recebimento (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Excel</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCompleteInspection}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-colors"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Dar Entrada Automática no Estoque</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
