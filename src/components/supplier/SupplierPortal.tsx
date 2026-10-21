import React, { useState } from 'react';
import { erpStore } from '../../services/store';
import { formatAOA } from '../../services/i18n';
import { exportToExcel, printFormalDocument } from '../../services/exportService';
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
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  PackageCheck,
  Plus,
  MessageSquare,
} from 'lucide-react';

export const SupplierPortal: React.FC = () => {
  const [selectedOrderToDispatch, setSelectedOrderToDispatch] = useState<PurchaseOrder | null>(null);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);

  // New Shipment Form State
  const [modal, setModal] = useState<TransportModal>('rodoviario');
  const [carrierName, setCarrierName] = useState('Trans-Angola Express');
  const [driverName, setDriverName] = useState('Bernardo Costa');
  const [driverLicense, setDriverLicense] = useState('C-LA-9923841');
  const [vehiclePlate, setVehiclePlate] = useState('LD-44-89-HP');
  const [trackingNumber, setTrackingNumber] = useState(`GUIA-${Math.floor(Math.random() * 9000 + 1000)}/2026`);
  const [estimatedArrival, setEstimatedArrival] = useState('2026-03-25');
  const [observations, setObservations] = useState('Carga paletizada devidamente protegida contra intempéries.');
  const [dispatchedQuantities, setDispatchedQuantities] = useState<Record<string, number>>({});

  // Document upload simulation
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<Shipment['documents'][0]['type']>('fatura');

  const currentUser = erpStore.currentUser;
  const isSupplier = currentUser?.role === 'fornecedor';

  // Approved purchase orders assigned to this supplier (or all if manager inspecting)
  const approvedOrders = erpStore.purchaseOrders.filter(po => {
    if (isSupplier) {
      return po.supplierId === currentUser.id || po.supplierEmail === currentUser.email;
    }
    return po.status === 'aprovado' || po.status === 'em_preparacao' || po.status === 'em_transito';
  });

  // Shipments initiated by this supplier
  const supplierShipments = erpStore.shipments.filter(s => {
    if (isSupplier) {
      return s.supplierId === currentUser.id;
    }
    return true;
  });

  const handleStartDispatch = (po: PurchaseOrder) => {
    setSelectedOrderToDispatch(po);
    // Initialize quantities with remaining pending amounts
    const initQtys: Record<string, number> = {};
    po.items.forEach(item => {
      const remaining = Math.max(0, item.quantityRequested - (item.quantityDispatched || 0));
      initQtys[item.productId] = remaining; // default to remaining
    });
    setDispatchedQuantities(initQtys);
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
      documents: [
        {
          id: `doc-${Date.now()}`,
          name: `Fatura_${selectedOrderToDispatch.orderNumber}.pdf`,
          type: 'fatura',
          uploadedBy: currentUser?.name || 'Fornecedor',
          uploadedAt: new Date().toISOString(),
          fileSize: '1.2 MB',
        },
      ],
    });

    alert(
      'Despacho registrado com sucesso! O armazém destinatário foi notificado em tempo real e pode acompanhar o trânsito da carga.'
    );
    setSelectedOrderToDispatch(null);
  };

  const handleCancelShipment = (shipmentId: string) => {
    const reason = prompt('Informe a razão do cancelamento do envio:');
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

  const handleAddDocumentToShipment = (shipmentId: string) => {
    if (!docName.trim()) {
      alert('Informe o nome do arquivo.');
      return;
    }
    erpStore.addShipmentDocument(shipmentId, {
      name: docName.endsWith('.pdf') ? docName : `${docName}.pdf`,
      type: docType,
      uploadedBy: currentUser?.name || 'Fornecedor',
      fileSize: '2.4 MB',
    });
    setDocName('');
    alert('Documento anexado com sucesso ao envio!');
  };

  const handleExportShipmentsExcel = () => {
    const headers = [
      'N° Envio',
      'N° Pedido Ref.',
      'Armazém Destino',
      'Modalidade',
      'Transportadora',
      'Motorista',
      'Placa / Matrícula',
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
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/50 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider">
              <Send className="w-4 h-4" />
              <span>Portal de Despacho & Rastreamento do Fornecedor</span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1">
              {currentUser?.supplierCompanyName || 'Painel de Suprimentos & Logística'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Recebimento de ordens aprovadas pelos Gestores Gerais, expedição parcial ou total, anexação de documentos e rastreio rodoviário, aéreo e marítimo em Angola.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportShipmentsExcel}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Relatório de Envios (Excel)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Orders Received for Dispatch */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Pedidos de Compra Encaminhados & Aprovados ({approvedOrders.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Aprovados pelo Gestor Geral para atendimento
          </span>
        </div>

        <div className="p-4 space-y-4">
          {approvedOrders.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Não há novos pedidos de compra pendentes de envio no momento.
            </div>
          ) : (
            approvedOrders.map(po => {
              const wh = erpStore.warehouses.find(w => w.id === po.warehouseId);
              const allDispatched = po.items.every(
                i => (i.quantityDispatched || 0) >= i.quantityRequested
              );

              return (
                <div
                  key={po.id}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3"
                >
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
                        Aprovado por: <strong>{po.approvedByName || 'Gestor Geral'}</strong> · Data:{' '}
                        {po.approvedAt ? new Date(po.approvedAt).toLocaleDateString('pt-AO') : '-'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!allDispatched && (
                        <button
                          type="button"
                          onClick={() => handleStartDispatch(po)}
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Iniciar Envio / Despachar</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Product items table showing Requested, Dispatched and Pending */}
                  <div className="border border-slate-800/80 rounded overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400">
                        <tr>
                          <th className="p-2">Código SKU</th>
                          <th className="p-2">Descrição do Material</th>
                          <th className="p-2 text-center">Qtd. Solicitada</th>
                          <th className="p-2 text-center">Já Enviada</th>
                          <th className="p-2 text-center">Pendente de Envio</th>
                          <th className="p-2 text-right">Preço Acordado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {po.items.map(item => {
                          const dispatched = item.quantityDispatched || 0;
                          const pending = Math.max(0, item.quantityRequested - dispatched);
                          return (
                            <tr key={item.productId} className="hover:bg-slate-900/40">
                              <td className="p-2 font-mono font-bold text-sky-400">{item.sku}</td>
                              <td className="p-2 text-slate-200">{item.productName}</td>
                              <td className="p-2 text-center font-mono font-bold text-white">
                                {item.quantityRequested} UN
                              </td>
                              <td className="p-2 text-center font-mono text-emerald-400">
                                {dispatched} UN
                              </td>
                              <td className="p-2 text-center font-mono font-bold text-amber-400">
                                {pending} UN
                              </td>
                              <td className="p-2 text-right font-mono text-slate-300">
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

      {/* Section 2: Real-time Shipment Tracking & Operations */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Monitorização de Envios em Andamento ({supplierShipments.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Rastreabilidade ponto a ponto e documentos fiscais
          </span>
        </div>

        <div className="p-4 space-y-4">
          {supplierShipments.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              Nenhum despacho em trânsito registrado até ao momento.
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
                  className={`bg-slate-950 border rounded-lg p-4 space-y-3 ${
                    isDelivered
                      ? 'border-emerald-900/60'
                      : isCanceled
                      ? 'border-red-900/60 opacity-60'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-900 border border-slate-800 rounded flex items-center justify-center text-sky-400">
                        <ModalIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-sm">{s.shipmentNumber}</span>
                          <span className="text-xs text-slate-400">Ref: {s.orderNumber}</span>
                          <span
                            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
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
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded text-xs flex items-center gap-1"
                        title="Adicionar Observação de Envio"
                      >
                        <MessageSquare className="w-3 h-3 text-sky-400" />
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
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded text-xs flex items-center gap-1"
                            title="Editar Dados de Envio"
                          >
                            <Edit2 className="w-3 h-3 text-amber-400" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCancelShipment(s.id)}
                            className="px-2.5 py-1 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 rounded text-xs flex items-center gap-1"
                            title="Cancelar Envio"
                          >
                            <XCircle className="w-3 h-3 text-red-400" />
                            <span>Cancelar</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Dispatch details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-900/60 p-3 rounded border border-slate-800/80">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Transportadora:</span>
                      <span className="text-slate-200 font-medium">{s.carrierName || 'Frota Própria'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Motorista Responsável:</span>
                      <span className="text-slate-200 font-medium">
                        {s.driverName || 'N/A'} {s.driverLicense ? `(${s.driverLicense})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Matrícula / Placa:</span>
                      <span className="text-slate-200 font-mono font-medium">{s.vehiclePlate || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Guia / Conhecimento:</span>
                      <span className="text-sky-400 font-mono font-bold">{s.trackingOrWaybill || 'S/N'}</span>
                    </div>
                  </div>

                  {s.observations && (
                    <div className="text-[11px] text-slate-400 bg-slate-900/40 p-2 rounded border border-slate-800/60">
                      <strong>Observações do Envio:</strong> {s.observations}
                    </div>
                  )}

                  {/* Documents Attached Section with Upload and Download */}
                  <div className="pt-2 border-t border-slate-800/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Documentos de Embarque ({s.documents.length})
                      </span>

                      {/* Attach New Document input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Nome do doc (ex: Fatura_Comercial)"
                          value={docName}
                          onChange={e => setDocName(e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded py-1 px-2 text-[11px] text-white"
                        />
                        <select
                          value={docType}
                          onChange={e => setDocType(e.target.value as any)}
                          className="bg-slate-950 border border-slate-700 rounded py-1 px-2 text-[11px] text-white"
                        >
                          <option value="fatura">Fatura</option>
                          <option value="packing_list">Packing List</option>
                          <option value="conhecimento_embarque">Guia Remessa</option>
                          <option value="certificado_conformidade">Certificado</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAddDocumentToShipment(s.id)}
                          className="px-2.5 py-1 bg-sky-700 hover:bg-sky-600 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Anexar</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {s.documents.map(doc => (
                        <a
                          key={doc.id}
                          href="#download"
                          onClick={e => {
                            e.preventDefault();
                            alert(`Download de documento oficial: ${doc.name} (${doc.fileSize})`);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-[11px] text-sky-400 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          <span>{doc.name}</span>
                          <span className="text-slate-500 text-[10px]">({doc.fileSize})</span>
                          <Download className="w-3 h-3 text-slate-400 ml-1" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Dispatch Preparation Modal */}
      {selectedOrderToDispatch && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full p-6 text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-sky-400 font-mono font-bold">{selectedOrderToDispatch.orderNumber}</span>
                <h3 className="font-bold text-base text-white">Preparar Envio de Carga</h3>
                <p className="text-xs text-slate-400">
                  Selecione os produtos e quantidades a despachar neste embarque.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderToDispatch(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmShipment} className="py-4 space-y-4 text-xs">
              {/* Items Selection for Dispatch */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Selecione as Quantidades Prontas para Envio
                </label>
                <div className="border border-slate-800 rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400">
                      <tr>
                        <th className="p-2">SKU</th>
                        <th className="p-2">Produto</th>
                        <th className="p-2 text-center">Total Solicitado</th>
                        <th className="p-2 text-center">Já Enviado</th>
                        <th className="p-2 text-center">Despachar Agora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedOrderToDispatch.items.map(item => {
                        const maxAllowed = item.quantityRequested - (item.quantityDispatched || 0);
                        return (
                          <tr key={item.productId} className="hover:bg-slate-950/40">
                            <td className="p-2 font-mono text-sky-400">{item.sku}</td>
                            <td className="p-2 text-slate-200">{item.productName}</td>
                            <td className="p-2 text-center font-mono text-white">{item.quantityRequested}</td>
                            <td className="p-2 text-center font-mono text-emerald-400">{item.quantityDispatched || 0}</td>
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max={maxAllowed}
                                value={dispatchedQuantities[item.productId] ?? 0}
                                onChange={e =>
                                  setDispatchedQuantities({
                                    ...dispatchedQuantities,
                                    [item.productId]: Math.min(
                                      maxAllowed,
                                      Math.max(0, parseInt(e.target.value, 10) || 0)
                                    ),
                                  })
                                }
                                className="w-20 bg-slate-950 border border-slate-700 rounded py-1 px-2 text-center text-white font-mono font-bold focus:border-sky-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Transport Logistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Modalidade de Envio</label>
                  <select
                    value={modal}
                    onChange={e => setModal(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="rodoviario">Rodoviário (Camião / Carrinha)</option>
                    <option value="maritimo">Marítimo (Navio de Cabotagem / Porto)</option>
                    <option value="aereo">Aéreo (Carga Aérea Express)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Empresa Transportadora</label>
                  <input
                    type="text"
                    required
                    value={carrierName}
                    onChange={e => setCarrierName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome do Motorista / Piloto</label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Carta de Condução / Doc</label>
                  <input
                    type="text"
                    value={driverLicense}
                    onChange={e => setDriverLicense(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Matrícula do Veículo</label>
                  <input
                    type="text"
                    required
                    value={vehiclePlate}
                    onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    N° da Guia de Remessa / Conhecimento
                  </label>
                  <input
                    type="text"
                    required
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Previsão de Entrega no Destino</label>
                  <input
                    type="date"
                    required
                    value={estimatedArrival}
                    onChange={e => setEstimatedArrival(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Observações de Embarque</label>
                <textarea
                  rows={2}
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderToDispatch(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-900/40"
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
