import React, { useState } from 'react';
import { erpStore } from '../../services/store';
import { formatAOA } from '../../services/i18n';
import { exportToExcel } from '../../services/exportService';
import { PurchaseOrder, Shipment, TransportModal } from '../../types';
import {
  Send,
  Truck,
  Ship,
  Plane,
  Upload,
  Download,
  Edit2,
  XCircle,
  FileText,
  FileSpreadsheet,
  PackageCheck,
  Search,
  Filter,
  MessageSquare,
  RefreshCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
} from 'lucide-react';

export const SupplierPortal: React.FC = () => {
  const [selectedOrderToDispatch, setSelectedOrderToDispatch] = useState<PurchaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'em_transito' | 'entregue' | 'cancelado'>('todos');

  // New Shipment Form State
  const [modal, setModal] = useState<TransportModal>('rodoviario');
  const [carrierName, setCarrierName] = useState('Trans-Angola Express');
  const [driverName, setDriverName] = useState('Bernardo Costa');
  const [driverLicense, setDriverLicense] = useState('C-LA-9923841');
  const [vehiclePlate, setVehiclePlate] = useState('LD-44-89-HP');
  const [trackingNumber, setTrackingNumber] = useState(`GUIA-${Math.floor(Math.random() * 9000 + 1000)}/2026`);
  const [estimatedArrival, setEstimatedArrival] = useState('2026-04-05');
  const [observations, setObservations] = useState('Carga paletizada devidamente selada e protegida.');
  const [dispatchedQuantities, setDispatchedQuantities] = useState<Record<string, number>>({});

  // File Upload State
  const [docNameInput, setDocNameInput] = useState('');
  const [docTypeInput, setDocTypeInput] = useState<Shipment['documents'][0]['type']>('fatura');
  const [attachedFileBase64, setAttachedFileBase64] = useState<string>('');

  const currentUser = erpStore.currentUser;
  const isSupplier = currentUser?.role === 'fornecedor';

  // Approved purchase orders assigned to this supplier
// Apenas mostrar ordens atribuídas ao fornecedor E que já estejam aprovadas/ativas
  const approvedOrders = erpStore.purchaseOrders.filter(po => {
    const isApprovedOrActive = ['aprovado', 'em_preparacao', 'em_transito', 'recebido_parcial'].includes(po.status);
    if (isSupplier) {
      return (po.supplierId === currentUser.id || po.supplierEmail === currentUser.email) && isApprovedOrActive;
    }
    return isApprovedOrActive;
  });

  // Filtered shipments for tracking
  const supplierShipments = erpStore.shipments.filter(s => {
    if (isSupplier && s.supplierId !== currentUser.id) return false;

    if (statusFilter !== 'todos' && s.status !== statusFilter) return false;

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      return (
        s.shipmentNumber.toLowerCase().includes(term) ||
        s.orderNumber.toLowerCase().includes(term) ||
        (s.carrierName && s.carrierName.toLowerCase().includes(term)) ||
        (s.trackingOrWaybill && s.trackingOrWaybill.toLowerCase().includes(term)) ||
        (s.driverName && s.driverName.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const handleStartDispatch = (po: PurchaseOrder) => {
    setSelectedOrderToDispatch(po);
    const initQtys: Record<string, number> = {};
    po.items.forEach(item => {
      const remaining = Math.max(0, item.quantityRequested - (item.quantityDispatched || 0));
      initQtys[item.productId] = remaining; // Foco automático na quantidade em falta
    });
    setDispatchedQuantities(initQtys);
  };

  // Convert real uploaded file to DataURL (Base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocNameInput(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmShipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderToDispatch) return;

    const itemsToDispatch = selectedOrderToDispatch.items
      .map(item => ({
        productId: item.productId,
        sku: item.sku,
        productName: item.productName,
        quantity: dispatchedQuantities[item.productId] || 0,
      }))
      .filter(i => i.quantity > 0);

    if (itemsToDispatch.length === 0) {
      alert('Selecione ao menos um produto com quantidade maior que zero para despachar.');
      return;
    }

    erpStore.createShipment({
      orderId: selectedOrderToDispatch.id,
      orderNumber: selectedOrderToDispatch.orderNumber,
      warehouseId: selectedOrderToDispatch.warehouseId,
      supplierId: currentUser?.id || 'user-fornecedor',
      supplierName: currentUser?.supplierCompanyName || selectedOrderToDispatch.supplierName,
      status: 'em_transito',
      modal,
      carrierName,
      driverName,
      driverLicense,
      vehiclePlate,
      trackingOrWaybill: trackingNumber,
      estimatedArrival,
      dispatchedAt: new Date().toISOString(),
      itemsDispatched: itemsToDispatch,
      observations,
      documents: docNameInput ? [
        {
          id: `doc-${Date.now()}`,
          name: docNameInput,
          type: docTypeInput,
          uploadedBy: currentUser?.name || 'Fornecedor',
          uploadedAt: new Date().toISOString(),
          fileSize: '1.8 MB',
          fileDataUrl: attachedFileBase64 || undefined,
        },
      ] : [],
    });

    alert('Despacho registado com sucesso! A equipa do armazém foi notificada em tempo real.');
    setSelectedOrderToDispatch(null);
    setAttachedFileBase64('');
    setDocNameInput('');
  };

  const handleCancelShipment = (shipmentId: string) => {
    const reason = prompt('Informe o motivo do cancelamento do envio:');
    if (reason) {
      erpStore.cancelShipment(shipmentId, reason);
      alert('Envio cancelado com sucesso.');
    }
  };

  const handleAddObservation = (shipment: Shipment) => {
    const note = prompt('Adicionar observação ao envio:', shipment.observations || '');
    if (note !== null) {
      erpStore.updateShipment(shipment.id, { observations: note });
    }
  };

  const handleDownloadDoc = (doc: Shipment['documents'][0]) => {
    if (doc.fileDataUrl) {
      const link = document.createElement('a');
      link.href = doc.fileDataUrl;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const blob = new Blob([`Documento Oficial CATASSO ERP: ${doc.name}\nGerado para rastreio e conferência em Angola.`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleExportShipmentsExcel = () => {
    const headers = [
      'N° Envio',
      'N° Pedido Ref.',
      'Armazém Destino',
      'Modalidade',
      'Transportadora',
      'Motorista',
      'Matrícula',
      'N° Guia / Conhecimento',
      'Status Envio',
      'Data Despacho',
      'Previsão Chegada',
      'Observações',
    ];

    const rows = supplierShipments.map(s => [
      s.shipmentNumber,
      s.orderNumber,
      erpStore.warehouses.find(w => w.id === s.warehouseId)?.name || 'Central',
      s.modal.toUpperCase(),
      s.carrierName || '-',
      s.driverName || '-',
      s.vehiclePlate || '-',
      s.trackingOrWaybill || '-',
      s.status.toUpperCase(),
      s.dispatchedAt ? new Date(s.dispatchedAt).toLocaleDateString('pt-AO') : '-',
      s.estimatedArrival || '-',
      s.observations || '-',
    ]);

    exportToExcel('Relatorio_Envios_Fornecedor', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/50 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider">
              <Send className="w-4 h-4" />
              <span>Portal do Fornecedor · Expedição, Rastreio & Gestão de Pendências</span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1">
              {currentUser?.supplierCompanyName || 'Painel Operacional de Suprimentos'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Recebimento de encomendas aprovadas, expedição por lotes parciais, anexação de faturas/guias e monitorização de frota.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportShipmentsExcel}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Orders Received & Pending Quantities */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Ordens de Compra Aprovadas & Gestão de Pendências ({approvedOrders.length})
            </h2>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {approvedOrders.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
              Não existem novos pedidos de compra pendentes de envio.
            </div>
          ) : (
            approvedOrders.map(po => {
              const wh = erpStore.warehouses.find(w => w.id === po.warehouseId);
              const hasPending = po.items.some(
                i => (i.quantityDispatched || 0) < i.quantityRequested
              );

              return (
                <div key={po.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sky-400 text-sm">{po.orderNumber}</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {po.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-400">
                          Destino: <strong className="text-white">{wh?.name} ({wh?.province})</strong>
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Aprovado por: <strong>{po.approvedByName || 'Gestor Geral'}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasPending && (
                        <button
                          type="button"
                          onClick={() => handleStartDispatch(po)}
                          className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
                        >
                          <RefreshCcw className="w-3.5 h-3.5" />
                          <span>Despachar / Resolver Pendência</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quantities Table: Requested vs Dispatched vs Pending */}
                  <div className="border border-slate-800/80 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400">
                        <tr>
                          <th className="p-2.5">Código SKU</th>
                          <th className="p-2.5">Descrição do Material</th>
                          <th className="p-2.5 text-center">Qtd. Solicitada</th>
                          <th className="p-2.5 text-center text-emerald-400">Já Enviada</th>
                          <th className="p-2.5 text-center text-amber-400 font-bold">Pendente de Envio</th>
                          <th className="p-2.5 text-right">Preço Acordado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {po.items.map(item => {
                          const dispatched = item.quantityDispatched || 0;
                          const pending = Math.max(0, item.quantityRequested - dispatched);
                          return (
                            <tr key={item.productId} className="hover:bg-slate-900/40">
                              <td className="p-2.5 font-mono font-bold text-sky-400">{item.sku}</td>
                              <td className="p-2.5 text-slate-200">{item.productName}</td>
                              <td className="p-2.5 text-center font-mono font-bold text-slate-300">
                                {item.quantityRequested} UN
                              </td>
                              <td className="p-2.5 text-center font-mono text-emerald-400 font-bold">
                                {dispatched} UN
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold text-amber-400">
                                {pending} UN
                              </td>
                              <td className="p-2.5 text-right font-mono text-slate-300">
                                {formatAOA(item.unitPriceAOA)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Section 2: Real-Time Shipment Tracking Workbench */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Monitorização de Despachos em Tempo Real ({supplierShipments.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-1.5 focus:outline-none focus:border-sky-500"
            >
              <option value="todos">Todos os Status</option>
              <option value="em_transito">Em Trânsito</option>
              <option value="entregue">Entregues</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>
        </div>

        {/* Search Input for Shipments */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Filtrar por N° de Guia, Código de Envio, Transportadora ou Motorista..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="space-y-3 pt-2">
          {supplierShipments.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
              Nenhum despacho em trânsito encontrado com os filtros aplicados.
            </div>
          ) : (
            supplierShipments.map(s => {
              const wh = erpStore.warehouses.find(w => w.id === s.warehouseId);
              const isDelivered = s.status === 'entregue';
              const isCanceled = s.status === 'cancelado';

              const ModalIcon = s.modal === 'aereo' ? Plane : s.modal === 'maritimo' ? Ship : Truck;

              return (
                <div
                  key={s.id}
                  className={`bg-slate-950 border rounded-xl p-4 space-y-3 ${
                    isDelivered
                      ? 'border-emerald-900/60'
                      : isCanceled
                      ? 'border-red-900/60 opacity-60'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-sky-400">
                        <ModalIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-sm">{s.shipmentNumber}</span>
                          <span className="text-xs text-slate-400">Ref: {s.orderNumber}</span>
                          <span
                            className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                              isDelivered
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : isCanceled
                                ? 'bg-red-950 text-red-300 border-red-800'
                                : 'bg-sky-950 text-sky-300 border-sky-800'
                            }`}
                          >
                            {s.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Destino: <strong>{wh?.name} ({wh?.province})</strong> · Previsão:{' '}
                          <strong className="text-slate-200">{s.estimatedArrival || 'A definir'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleAddObservation(s)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs flex items-center gap-1 transition-colors"
                        title="Adicionar Observação de Envio"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                        <span>Observação</span>
                      </button>

                      {!isDelivered && !isCanceled && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const newEta = prompt('Atualizar data prevista de chegada (AAAA-MM-DD):', s.estimatedArrival);
                              if (newEta) erpStore.updateShipment(s.id, { estimatedArrival: newEta });
                            }}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs flex items-center gap-1 transition-colors"
                            title="Editar Previsão"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Editar ETA</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCancelShipment(s.id)}
                            className="px-2.5 py-1.5 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 rounded-lg text-xs flex items-center gap-1 transition-colors"
                            title="Cancelar Envio"
                          >
                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                            <span>Cancelar</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Logistics Detail Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Transportadora:</span>
                      <span className="text-slate-200 font-medium">{s.carrierName || 'Frota Própria'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Motorista / Carta:</span>
                      <span className="text-slate-200 font-medium">
                        {s.driverName || 'N/A'} {s.driverLicense ? `(${s.driverLicense})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Matrícula do Veículo:</span>
                      <span className="text-slate-200 font-mono font-medium">{s.vehiclePlate || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">N° Guia / Waybill:</span>
                      <span className="text-sky-400 font-mono font-bold">{s.trackingOrWaybill || 'S/N'}</span>
                    </div>
                  </div>

                  {s.observations && (
                    <div className="text-[11px] text-slate-400 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                      <strong>Observações:</strong> {s.observations}
                    </div>
                  )}

                  {/* Documents Section with Download */}
                  <div className="pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Documentos Anexados para Download:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {s.documents.length === 0 ? (
                        <span className="text-[11px] text-slate-500 italic">Sem documentos anexados a este envio.</span>
                      ) : (
                        s.documents.map(doc => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => handleDownloadDoc(doc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-sky-400 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-sky-400" />
                            <span>{doc.name}</span>
                            <Download className="w-3 h-3 text-slate-400 ml-1" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Dispatch Preparation & File Upload Modal */}
      {selectedOrderToDispatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-xs text-sky-400 font-mono font-bold">{selectedOrderToDispatch.orderNumber}</span>
                <h3 className="font-bold text-base text-white">Preparar Embarque & Reenviar Quantidades em Falta</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderToDispatch(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmShipment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Quantidades Prontas para Despacho (Foco na Pendência)
                </label>
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400">
                      <tr>
                        <th className="p-2">SKU</th>
                        <th className="p-2">Produto</th>
                        <th className="p-2 text-center text-amber-400 font-bold">Em Falta</th>
                        <th className="p-2 text-center text-sky-400 font-bold">Despachar Agora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedOrderToDispatch.items.map(item => {
                        const maxAllowed = Math.max(0, item.quantityRequested - (item.quantityDispatched || 0));
                        return (
                          <tr key={item.productId} className="hover:bg-slate-950/40">
                            <td className="p-2 font-mono text-sky-400">{item.sku}</td>
                            <td className="p-2 text-slate-200">{item.productName}</td>
                            <td className="p-2 text-center font-mono font-bold text-amber-400">{maxAllowed} UN</td>
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max={maxAllowed}
                                value={dispatchedQuantities[item.productId] ?? maxAllowed}
                                onChange={e =>
                                  setDispatchedQuantities({
                                    ...dispatchedQuantities,
                                    [item.productId]: Math.min(
                                      maxAllowed,
                                      Math.max(0, parseInt(e.target.value, 10) || 0)
                                    ),
                                  })
                                }
                                className="w-20 bg-slate-950 border border-slate-700 rounded-lg py-1 px-2 text-center text-white font-mono font-bold focus:border-sky-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Logistics Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Modalidade</label>
                  <select
                    value={modal}
                    onChange={e => setModal(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="rodoviario">Rodoviário (Camião / Carrinha)</option>
                    <option value="maritimo">Marítimo (Navio de Cabotagem)</option>
                    <option value="aereo">Aéreo (Carga Aérea Express)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Transportadora</label>
                  <input
                    type="text"
                    required
                    value={carrierName}
                    onChange={e => setCarrierName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome do Motorista</label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Carta de Condução</label>
                  <input
                    type="text"
                    value={driverLicense}
                    onChange={e => setDriverLicense(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Matrícula</label>
                  <input
                    type="text"
                    required
                    value={vehiclePlate}
                    onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">N° Guia / Conhecimento</label>
                  <input
                    type="text"
                    required
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Previsão de Entrega</label>
                  <input
                    type="date"
                    required
                    value={estimatedArrival}
                    onChange={e => setEstimatedArrival(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-bold"
                  />
                </div>
              </div>

              {/* Real File Upload */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Anexar Documento Digital (Fatura Comercial, Packing List ou Guia)
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.xlsx"
                  onChange={handleFileUpload}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-300 file:bg-sky-600 file:text-white file:border-0 file:rounded-lg file:px-2 file:py-1 file:text-xs"
                />
                {docNameInput && (
                  <p className="text-[11px] text-emerald-400 mt-1 font-semibold">
                    Ficheiro pronto para envio: {docNameInput}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Observações do Embarque</label>
                <textarea
                  rows={2}
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderToDispatch(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-900/40"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirmar & Despachar Carga</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
