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
  Search,
  History,
  FileUp,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const ReceivingInspection: React.FC = () => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'em_transito' | 'aprovado' | 'recebido_parcial'>('todos');

  // Manual document attachment state for receiving
  const [attachedDocName, setAttachedDocName] = useState('');
  const [attachedDocData, setAttachedDocData] = useState<string>('');

  // Item checklist state
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

  // Active or partially received purchase orders for this active warehouse
  const candidateOrders = erpStore.purchaseOrders.filter(po => {
    const matchesWh = po.warehouseId === activeWh?.id;
    const matchesStatus =
      po.status === 'em_transito' || po.status === 'aprovado' || po.status === 'recebido_parcial';
    
    if (!matchesWh || !matchesStatus) return false;

    if (statusFilter !== 'todos' && po.status !== statusFilter) return false;

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      return (
        po.orderNumber.toLowerCase().includes(term) ||
        po.supplierName.toLowerCase().includes(term) ||
        po.items.some(i => i.productName.toLowerCase().includes(term) || i.sku.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const selectedOrder = erpStore.purchaseOrders.find(p => p.id === selectedOrderId);
  const orderShipments = erpStore.shipments.filter(s => s.orderId === selectedOrderId);

  // Initialize checklist upon selecting an order
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
          quantityReceivedNow: pending, // Suggere por padrão a quantidade restante em falta
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

  const handleReceivingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedDocName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedDocData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Complete receiving inspection & Ingest into stock
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

    const lastShipment = orderShipments[orderShipments.length - 1];

// --- Receiving & Stock Ingestion ---
  public completeReceivingInspection(params: {
    orderId: string;
    shipmentId?: string;
    itemsChecked: {
      productId: string;
      sku: string;
      productName: string;
      quantityExpected: number;
      quantityReceived: number; // Quantidade recebida NESTA entrega
      condition: 'conforme' | 'danificado' | 'incompleto' | 'divergente';
      batchNumber?: string;
      notes?: string;
    }[];
    notes?: string;
  }): { success: boolean; rncCreated?: RNCReport; orderUpdated?: PurchaseOrder } {
    const po = this.purchaseOrders.find(p => p.id === params.orderId);
    if (!po) return { success: false };

    // 1. Atualiza as quantidades acumuladas já recebidas no Pedido de Compra
    params.itemsChecked.forEach(checkedItem => {
      const poItem = po.items.find(i => i.productId === checkedItem.productId);
      if (poItem) {
        // Soma a quantidade desta entrega com o que já tinha sido recebido anteriormente
        const currentTotalReceived = poItem.quantityReceived || 0;
        poItem.quantityReceived = currentTotalReceived + checkedItem.quantityReceived;
      }
    });

    // 2. Verifica se houve itens não conformes ou avariados
    const nonConformingItems = params.itemsChecked.filter(
      item => item.condition !== 'conforme' || item.quantityReceived < item.quantityExpected
    );

    let rncReport: RNCReport | undefined;

    if (nonConformingItems.length > 0) {
      const rncNumber = `RNC-${new Date().getFullYear()}-${String(this.rncs.length + 1).padStart(4, '0')}`;
      rncReport = {
        id: `rnc-${Date.now()}`,
        rncNumber,
        warehouseId: po.warehouseId,
        orderId: po.id,
        shipmentId: params.shipmentId,
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        openedByUserId: this.currentUser?.id || 'sys',
        openedByUserName: this.currentUser?.name || 'Responsável Armazém',
        openedAt: new Date().toISOString(),
        status: 'aberta',
        severity: 'alta',
        issueType: 'falta_quantidade',
        description: `Discrepâncias detectadas na inspeção de recebimento do pedido ${po.orderNumber}.`,
        affectedItems: nonConformingItems.map(i => ({
          sku: i.sku,
          productName: i.productName,
          quantityAffected: Math.max(1, i.quantityExpected - i.quantityReceived),
          defectDetail: `Condição: ${i.condition}. Recebido nesta entrega: ${i.quantityReceived} de ${i.quantityExpected} esperados. ${i.notes || ''}`,
        })),
      };
      this.rncs.unshift(rncReport);
    }

    // 3. Dá entrada automática no stock físico das quantidades recebidas nesta entrega
    params.itemsChecked.forEach(item => {
      if (item.quantityReceived > 0) {
        this.addStockMovement({
          warehouseId: po.warehouseId,
          productId: item.productId,
          productSku: item.sku,
          productName: item.productName,
          type: 'entrada_compra',
          quantity: item.quantityReceived,
          unitPriceAOA: po.items.find(pi => pi.productId === item.productId)?.unitPriceAOA || 0,
          totalPriceAOA:
            item.quantityReceived * (po.items.find(pi => pi.productId === item.productId)?.unitPriceAOA || 0),
          originReference: `Pedido ${po.orderNumber} (Fornecedor: ${po.supplierName})`,
          requesterOrRecipient: po.supplierName,
          executedByUserId: this.currentUser?.id || 'sys',
          executedByUserName: this.currentUser?.name || 'Responsável Armazém',
          notes: item.batchNumber ? `Lote recebido: ${item.batchNumber}` : 'Recebimento de compra',
        });
      }
    });

    // 4. Determina se o pedido foi TOTALMENTE concluído ou se continua PARCIAL
    const isFullyCompleted = po.items.every(i => (i.quantityReceived || 0) >= i.quantityRequested);

    if (isFullyCompleted) {
      po.status = 'comprado'; // Marca como 100% concluído!
    } else {
      po.status = 'recebido_parcial'; // Permanece parcial para receber a diferença restante
    }
    po.updatedAt = new Date().toISOString();

    // 5. Atualiza o estado do envio se aplicável
    if (params.shipmentId) {
      const ship = this.shipments.find(s => s.id === params.shipmentId);
      if (ship) {
        ship.status = 'entregue';
        ship.deliveredAt = new Date().toISOString();
      }
    }

    this.saveState();
    return { success: true, rncCreated: rncReport, orderUpdated: po };
  }

  // Print Labels
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

  // Download Formal Receiving Report PDF
  const handlePrintReceivingReport = () => {
    if (!selectedOrder) return;
    const lastShipment = orderShipments[orderShipments.length - 1];

    printFormalDocument({
      title: 'Relatório Oficial de Recebimento Físico, Vistoria & Ingestão de Stock',
      documentNumber: `REC-${new Date().getFullYear()}-${selectedOrder.orderNumber}`,
      warehouseName: activeWh?.name || 'Armazém Central',
      warehouseProvince: activeWh?.province || 'Luanda',
      date: new Date().toLocaleDateString('pt-AO'),
      authorName: currentUser?.name || 'Responsável pelo Recebimento',
      role: currentUser?.role || 'Controle de Qualidade',
      metadata: [
        { label: 'Unidade Receptora', value: `${activeWh?.name} (${activeWh?.province})` },
        { label: 'N° Ordem de Compra', value: selectedOrder.orderNumber },
        { label: 'Fornecedor Homologado', value: selectedOrder.supplierName },
        { label: 'Transportadora / Motorista', value: `${lastShipment?.carrierName || 'Frota Própria'} / ${lastShipment?.driverName || 'N/A'}` },
        { label: 'Guia de Remessa / Waybill', value: lastShipment?.trackingOrWaybill || 'N/A' },
      ],
      tables: [
        {
          headers: ['SKU', 'Descrição do Material', 'Solicitado', 'Já Recebido', 'Pendente', 'Recebido Agora', 'Lote', 'Condição', 'Notas'],
          rows: itemsChecklist.map(i => [
            i.sku,
            i.productName,
            `${i.quantityRequested} UN`,
            `${i.quantityAlreadyReceived} UN`,
            `${i.quantityPending} UN`,
            `${i.quantityReceivedNow} UN`,
            i.batchNumber,
            i.condition.toUpperCase(),
            i.notes || (i.condition === 'conforme' ? 'Aprovado' : 'Avaria / Falta'),
          ]),
        },
      ],
      notes: inspectionNotes || 'Inspecionado conforme protocolos industriais de segurança e conferência física volume a volume.',
      signatures: ['Fiel de Armazém / Conferente', 'Motorista / Transportador', 'Gestor de Logística'],
    });
  };

  const handleExportExcel = () => {
    if (!selectedOrder) return;
    const headers = ['SKU', 'Produto', 'Qtd Solicitada', 'Já Recebido', 'Pendente', 'Recebido Agora', 'Condição', 'Lote', 'Notas'];
    const rows = itemsChecklist.map(i => [
      i.sku,
      i.productName,
      i.quantityRequested,
      i.quantityAlreadyReceived,
      i.quantityPending,
      i.quantityReceivedNow,
      i.condition,
      i.batchNumber,
      i.notes,
    ]);
    exportToExcel(`Relatorio_Recebimento_${selectedOrder.orderNumber}`, headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-sky-400" />
              <span>Recebimento Físico, Inspeção de Carga & Histórico de Entregas</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Controlo rigoroso de entregas parciais ou totais. Gestão clara de saldos anteriores, entrada no stock e emissão de Não Conformidades (RNC).
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Pesquisar por N° de Pedido, Fornecedor ou SKU do produto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-sky-500"
            >
              <option value="todos">Todos os Estados</option>
              <option value="em_transito">Em Trânsito</option>
              <option value="aprovado">Aprovados</option>
              <option value="recebido_parcial">Recebidos Parcialmente</option>
            </select>
          </div>
        </div>

        {/* Order Cards Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {candidateOrders.length === 0 ? (
            <div className="col-span-3 text-center py-6 text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
              Nenhuma encomenda pendente ou em trânsito encontrada para este armazém com os critérios pesquisados.
            </div>
          ) : (
            candidateOrders.map(po => {
              const isSelected = selectedOrderId === po.id;
              const totalItems = po.items.length;

              return (
                <button
                  key={po.id}
                  type="button"
                  onClick={() => handleSelectOrder(po.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-sky-950/80 border-sky-500 text-white shadow-lg ring-1 ring-sky-500/50'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sky-400 text-sm">{po.orderNumber}</span>
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                      po.status === 'recebido_parcial'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-slate-900 text-slate-300 border-slate-700'
                    }`}>
                      {po.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-100 mt-2 truncate">
                    {po.supplierName}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>{totalItems} posições</span>
                    <span className="font-mono font-bold text-slate-300">{formatAOA(po.totalEstimatedAOA)}</span>
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
          {/* Order Header & Shipment Multi-Delivery History */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">
                    Vistoria do Pedido {selectedOrder.orderNumber}
                  </h3>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    {selectedOrder.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Fornecedor: <strong className="text-slate-200">{selectedOrder.supplierName}</strong> ({selectedOrder.supplierEmail})
                </p>
              </div>

              {/* Document Download Buttons attached by supplier */}
              {orderShipments.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Anexos do Despacho:</span>
                  {orderShipments.flatMap(s => s.documents).map(doc => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        if (doc.fileDataUrl) {
                          const link = document.createElement('a');
                          link.href = doc.fileDataUrl;
                          link.download = doc.name;
                          link.click();
                        } else {
                          alert(`Download de documento oficial em curso: ${doc.name}`);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-sky-400 font-medium transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-sky-400" />
                      <span>{doc.name}</span>
                      <Download className="w-3 h-3 text-slate-400 ml-1" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Historical Shipments Summary */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-4 h-4 text-sky-400" />
                <span>Histórico de Remessas / Entregas Anteriores do Fornecedor ({orderShipments.length})</span>
              </h4>
              {orderShipments.length === 0 ? (
                <p className="text-xs text-slate-500 italic bg-slate-950 p-3 rounded-lg border border-slate-800">
                  Ainda não existem remessas parciais registadas para este pedido. A receber a 1ª entrega.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {orderShipments.map((sh, idx) => (
                    <div key={sh.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between font-mono font-bold text-sky-400">
                        <span>Remessa #{idx + 1} - {sh.shipmentNumber}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-sans">{sh.modal}</span>
                      </div>
                      <div className="text-slate-300 text-[11px] flex justify-between">
                        <span>Guia: <strong>{sh.trackingOrWaybill}</strong></span>
                        <span>Transportadora: <strong>{sh.carrierName || 'Própria'}</strong></span>
                      </div>
                      <div className="text-[10px] text-slate-500 border-t border-slate-800/60 pt-1 flex justify-between">
                        <span>Motorista: {sh.driverName} ({sh.vehiclePlate})</span>
                        <span className="text-emerald-400 uppercase font-bold">{sh.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Checklist Inspection Table showing Requested, Already Received, Pending & Receiving Now */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-400" />
                <span>Conferência Detalhada de Quantidades & Inspeção Qualitativa</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {itemsChecklist.length} posições a vistoriar
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="py-3 px-3">Código SKU</th>
                    <th className="py-3 px-3">Descrição Técnica</th>
                    <th className="py-3 px-3 text-center">Total Solicitado</th>
                    <th className="py-3 px-3 text-center text-emerald-400">Já Recebido Anteriormente</th>
                    <th className="py-3 px-3 text-center text-amber-400 font-bold">Quantidade em Falta</th>
                    <th className="py-3 px-3 text-center text-sky-400 font-bold">A Receber Nesta Entrega</th>
                    <th className="py-3 px-3">Condição Física</th>
                    <th className="py-3 px-3">N° Lote Atribuído</th>
                    <th className="py-3 px-3">Observação / Defeito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {itemsChecklist.map((item, idx) => (
                    <tr key={item.productId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-sky-400 whitespace-nowrap">
                        {item.sku}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-200">
                        {item.productName}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-300 whitespace-nowrap">
                        {item.quantityRequested} UN
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {item.quantityAlreadyReceived} UN
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-amber-400 whitespace-nowrap">
                        {item.quantityPending} UN
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          max={item.quantityPending}
                          value={item.quantityReceivedNow}
                          onChange={e =>
                            handleUpdateItem(idx, 'quantityReceivedNow', parseInt(e.target.value, 10) || 0)
                          }
                          className="w-20 bg-slate-950 border border-slate-700 rounded-lg py-1 px-2 text-center text-white font-mono font-bold focus:border-sky-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <select
                          value={item.condition}
                          onChange={e => handleUpdateItem(idx, 'condition', e.target.value)}
                          className={`bg-slate-950 border rounded-lg py-1 px-2 font-semibold text-xs focus:outline-none ${
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
                          className="w-28 bg-slate-950 border border-slate-700 rounded-lg py-1 px-2 text-white font-mono text-[11px]"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder={item.condition !== 'conforme' ? 'Descreva a avaria...' : 'Opcional'}
                          value={item.notes}
                          onChange={e => handleUpdateItem(idx, 'notes', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1 px-2 text-white text-[11px]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions & Parecer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold text-xs mb-1">
                    Parecer Geral da Vistoria / Observações Finais
                  </label>
                  <textarea
                    rows={2}
                    value={inspectionNotes}
                    onChange={e => setInspectionNotes(e.target.value)}
                    placeholder="Ex: Carga descarregada na Doca 02, volumes conferidos e caixas intactas."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold text-xs mb-1">
                    Anexar Guia Assinada ou Comprovativo Digital
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleReceivingFileUpload}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-300 file:bg-slate-800 file:text-white file:border-0 file:rounded file:px-2 file:py-1 file:text-xs"
                    />
                  </div>
                  {attachedDocName && (
                    <span className="text-[11px] text-emerald-400 mt-1 block">
                      Ficheiro pronto para gravação: {attachedDocName}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handlePrintReceivedLabels}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-sky-400" />
                    <span>Imprimir Etiquetas (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintReceivingReport}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Baixar Relatório Oficial (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Excel</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCompleteInspection}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Concluir Recebimento & Ingestão no Stock</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
