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
  AlertCircle,
  RefreshCcw,
} from 'lucide-react';

export const SupplierPortal: React.FC = () => {
  const [selectedOrderToDispatch, setSelectedOrderToDispatch] = useState<PurchaseOrder | null>(null);

  // New Shipment Form State
  const [modal, setModal] = useState<TransportModal>('rodoviario');
  const [carrierName, setCarrierName] = useState('Trans-Angola Express');
  const [driverName, setDriverName] = useState('Bernardo Costa');
  const [driverLicense, setDriverLicense] = useState('C-LA-9923841');
  const [vehiclePlate, setVehiclePlate] = useState('LD-44-89-HP');
  const [trackingNumber, setTrackingNumber] = useState(`GUIA-${Math.floor(Math.random() * 9000 + 1000)}/2026`);
  const [estimatedArrival, setEstimatedArrival] = useState('2026-03-30');
  const [observations, setObservations] = useState('Reenvio de quantidades pendentes / Carga inspecionada.');
  const [dispatchedQuantities, setDispatchedQuantities] = useState<Record<string, number>>({});

  // Document management state
  const [docNameInput, setDocNameInput] = useState('');
  const [docTypeInput, setDocTypeInput] = useState<Shipment['documents'][0]['type']>('fatura');
  const [attachedFileBase64, setAttachedFileBase64] = useState<string>('');

  const currentUser = erpStore.currentUser;
  const isSupplier = currentUser?.role === 'fornecedor';

  const approvedOrders = erpStore.purchaseOrders.filter(po => {
    if (isSupplier) {
      return po.supplierId === currentUser.id || po.supplierEmail === currentUser.email;
    }
    return po.status === 'aprovado' || po.status === 'em_preparacao' || po.status === 'em_transito' || po.status === 'recebido_parcial';
  });

  const supplierShipments = erpStore.shipments.filter(s => {
    if (isSupplier) {
      return s.supplierId === currentUser.id;
    }
    return true;
  });

  const handleStartDispatch = (po: PurchaseOrder) => {
    setSelectedOrderToDispatch(po);
    const initQtys: Record<string, number> = {};
    po.items.forEach(item => {
      const remaining = Math.max(0, item.quantityRequested - (item.quantityDispatched || 0));
      initQtys[item.productId] = remaining; // Foco automático nas quantidades em falta
    });
    setDispatchedQuantities(initQtys);
  };

  // Real file upload conversion to DataURL (Base64) for secure download
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
      documents: [
        {
          id: `doc-${Date.now()}`,
          name: docNameInput || `Fatura_${selectedOrderToDispatch.orderNumber}.pdf`,
          type: docTypeInput,
          uploadedBy: currentUser?.name || 'Fornecedor',
          uploadedAt: new Date().toISOString(),
          fileSize: '1.4 MB',
          fileDataUrl: attachedFileBase64 || undefined,
        },
      ],
    });

    alert('Despacho das quantidades em falta registado com sucesso! O armazém foi notificado.');
    setSelectedOrderToDispatch(null);
    setAttachedFileBase64('');
    setDocNameInput('');
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
      // Simulação de documento oficial caso gerado pelo sistema
      const blob = new Blob([`Documento Oficial CATASSO ERP: ${doc.name}\nEmitido para fins logísticos em Angola.`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/50 border border-slate-800 rounded-lg p-5">
        <h1 className="text-xl font-bold text-white">
          Portal do Fornecedor · Gestão de Pendências & Reenvio
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Acompanhe ordens de compra pendentes, visualize quantidades em falta resultantes de entregas parciais e efetue o reenvio imediato.
        </p>
      </div>

      {/* Section 1: Orders with Pending Quantities */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-sky-400" />
            <span>Ordens Aprovadas & Pendências de Envio ({approvedOrders.length})</span>
          </h2>
        </div>

        <div className="p-4 space-y-4">
          {approvedOrders.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">Nenhuma encomenda pendente.</div>
          ) : (
            approvedOrders.map(po => {
              const wh = erpStore.warehouses.find(w => w.id === po.warehouseId);
              const hasPending = po.items.some(i => (i.quantityDispatched || 0) < i.quantityRequested);

              return (
                <div key={po.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sky-400">{po.orderNumber}</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          {po.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-400">Destino: {wh?.name}</span>
                      </div>
                    </div>

                    {hasPending && (
                      <button
                        type="button"
                        onClick={() => handleStartDispatch(po)}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow"
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        <span>Resolver Pendência / Reenviar Falta</span>
                      </button>
                    )}
                  </div>

                  {/* Items Table */}
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400">
                      <tr>
                        <th className="p-2">SKU</th>
                        <th className="p-2">Produto</th>
                        <th className="p-2 text-center">Solicitado</th>
                        <th className="p-2 text-center text-emerald-400">Enviado</th>
                        <th className="p-2 text-center text-amber-400 font-bold">Em Falta / Pendente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {po.items.map(item => {
                        const dispatched = item.quantityDispatched || 0;
                        const pending = Math.max(0, item.quantityRequested - dispatched);
                        return (
                          <tr key={item.productId} className="hover:bg-slate-900/40">
                            <td className="p-2 font-mono text-sky-400">{item.sku}</td>
                            <td className="p-2 text-slate-200">{item.productName}</td>
                            <td className="p-2 text-center font-mono">{item.quantityRequested} UN</td>
                            <td className="p-2 text-center font-mono text-emerald-400">{dispatched} UN</td>
                            <td className="p-2 text-center font-mono font-bold text-amber-400">{pending} UN</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Section 2: Active Shipments & Document Download/Upload */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 bg-slate-950 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-400" />
            <span>Histórico de Despachos & Documentação ({supplierShipments.length})</span>
          </h2>
        </div>

        <div className="p-4 space-y-4">
          {supplierShipments.map(s => (
            <div key={s.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="font-mono font-bold text-white">{s.shipmentNumber}</span>
                  <span className="text-xs text-slate-400 ml-2">Ref: {s.orderNumber}</span>
                </div>
                <span className="text-xs uppercase px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">
                  {s.status}
                </span>
              </div>

              {/* Documents with working download & upload */}
              <div className="pt-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Documentos Anexados (Download / Visualização):
                </span>
                <div className="flex flex-wrap gap-2">
                  {s.documents.map(doc => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleDownloadDoc(doc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-xs text-sky-400 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{doc.name}</span>
                      <Download className="w-3 h-3 text-slate-400 ml-1" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dispatch / Re-send Missing Modal */}
      {selectedOrderToDispatch && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full p-6 text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-xs text-sky-400 font-mono font-bold">{selectedOrderToDispatch.orderNumber}</span>
                <h3 className="font-bold text-base text-white">Reenvio de Quantidades em Falta</h3>
              </div>
              <button onClick={() => setSelectedOrderToDispatch(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleConfirmShipment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Quantidades Disponíveis para Reenvio (Foco nas Pendências)</label>
                <table className="w-full text-left text-xs border border-slate-800 rounded">
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Produto</th>
                      <th className="p-2 text-center text-amber-400">Pendente</th>
                      <th className="p-2 text-center">Enviar Agora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrderToDispatch.items.map(item => {
                      const maxAllowed = Math.max(0, item.quantityRequested - (item.quantityDispatched || 0));
                      return (
                        <tr key={item.productId} className="border-t border-slate-800">
                          <td className="p-2 font-mono text-sky-400">{item.sku}</td>
                          <td className="p-2 text-slate-200">{item.productName}</td>
                          <td className="p-2 text-center font-mono text-amber-400">{maxAllowed} UN</td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max={maxAllowed}
                              value={dispatchedQuantities[item.productId] ?? maxAllowed}
                              onChange={e =>
                                setDispatchedQuantities({
                                  ...dispatchedQuantities,
                                  [item.productId]: Math.min(maxAllowed, Math.max(0, parseInt(e.target.value, 10) || 0)),
                                })
                              }
                              className="w-20 bg-slate-950 border border-slate-700 rounded py-1 px-2 text-center text-white font-mono font-bold"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Real file upload section */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Anexar Fatura / Guia de Remessa (PDF ou Imagem)</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.xlsx"
                  onChange={handleFileUpload}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-300 file:bg-sky-600 file:text-white file:border-0 file:rounded file:px-2 file:py-1 file:text-xs"
                />
                {docNameInput && <p className="text-[11px] text-emerald-400 mt-1">Ficheiro carregado: {docNameInput}</p>}
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderToDispatch(null)}
                  className="px-4 py-2 bg-slate-800 text-white rounded text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold shadow"
                >
                  Confirmar Reenvio da Falta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
