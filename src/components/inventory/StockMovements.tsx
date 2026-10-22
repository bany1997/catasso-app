import React, { useState } from 'react';
import { erpStore } from '../../services/store';
import { catalogService } from '../../services/catalogService';
import { formatAOA } from '../../services/i18n';
import { exportToExcel, printFormalDocument } from '../../services/exportService';
import { StockMovement } from '../../types';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  PlusCircle,
  Search,
  FileSpreadsheet,
  Printer,
  Calendar,
  UserCheck,
  CheckCircle2,
  PackagePlus,
  Send,
  Trash2,
  Plus,
} from 'lucide-react';

export const StockMovements: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'entradas' | 'saidas'>('entradas');
  const [searchEntradas, setSearchEntradas] = useState('');
  const [searchSaidas, setSearchSaidas] = useState('');

  // Modals
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const currentUser = erpStore.currentUser;
  const activeWh = erpStore.getActiveWarehouse();

  // Check roles
  const isCliente = currentUser?.role === 'cliente';
  const isAtendente = currentUser?.role === 'atendente';
  const isResponsavelOrAbove =
    currentUser?.role === 'responsavel_armazem' ||
    currentUser?.role === 'gestor_geral' ||
    currentUser?.role === 'superadmin';

  // Filter movements for this warehouse
  const allMovements = erpStore.movements.filter(m => {
    if (isCliente) {
      return (
        m.requesterOrRecipient?.toLowerCase().includes(currentUser.name.toLowerCase()) ||
        m.executedByUserId === currentUser.id
      );
    }
    if (currentUser?.role === 'superadmin') {
      return m.warehouseId === activeWh?.id || activeWh?.id === 'all';
    }
    return m.warehouseId === activeWh?.id;
  });

  const entradasList = allMovements.filter(m => {
    const isEntrada = m.type.startsWith('entrada_') || m.type === 'ajuste_inventario';
    if (!isEntrada) return false;
    if (searchEntradas) {
      const q = searchEntradas.toLowerCase();
      return (
        m.productSku.toLowerCase().includes(q) ||
        m.productName.toLowerCase().includes(q) ||
        m.movementCode.toLowerCase().includes(q) ||
        (m.originReference && m.originReference.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const saidasList = allMovements.filter(m => {
    const isSaida = m.type.startsWith('saida_');
    if (!isSaida) return false;
    if (searchSaidas) {
      const q = searchSaidas.toLowerCase();
      return (
        m.productSku.toLowerCase().includes(q) ||
        m.productName.toLowerCase().includes(q) ||
        m.movementCode.toLowerCase().includes(q) ||
        (m.requesterOrRecipient && m.requesterOrRecipient.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Export handlers
  const handleExportExcel = (type: 'entradas' | 'saidas') => {
    const list = type === 'entradas' ? entradasList : saidasList;
    const headers = [
      'Código Movimento',
      'Data / Hora',
      'Código SKU',
      'Descrição do Produto',
      'Tipo Movimentação',
      'Quantidade',
      'Preço Unitário (AOA)',
      'Valor Total (AOA)',
      'Documento / Origem',
      'Destinatário / Solicitante',
      'Operador Responsável',
      'Observações',
    ];

    const rows = list.map(m => [
      m.movementCode,
      new Date(m.createdAt).toLocaleString('pt-AO'),
      m.productSku,
      m.productName,
      m.type,
      m.quantity,
      m.unitPriceAOA,
      m.totalPriceAOA,
      m.originReference || '',
      m.requesterOrRecipient || '',
      m.executedByUserName,
      m.notes || '',
    ]);

    exportToExcel(`Movimentacoes_${type.toUpperCase()}_${activeWh?.code}`, headers, rows);
  };

  const handlePrintFormalReport = (type: 'entradas' | 'saidas') => {
    const list = type === 'entradas' ? entradasList : saidasList;
    const isEntrada = type === 'entradas';

    printFormalDocument({
      title: isEntrada ? 'Relatório Oficial de Entradas no Estoque' : 'Relatório Oficial de Saídas do Estoque',
      documentNumber: `REL-MOV-${type.toUpperCase()}-${new Date().getFullYear()}`,
      warehouseName: activeWh?.name || 'Armazém Central',
      warehouseProvince: activeWh?.province || 'Luanda',
      date: new Date().toLocaleDateString('pt-AO'),
      authorName: currentUser?.name || 'Administrador',
      role: currentUser?.role || 'Auditor',
      metadata: [
        { label: 'Unidade Operacional', value: `${activeWh?.name} (${activeWh?.code})` },
        { label: 'Total de Movimentos', value: `${list.length} registros` },
        { label: 'Emissão do Sistema', value: new Date().toLocaleString('pt-AO') },
        { label: 'Critério', value: isEntrada ? 'Entradas, Devoluções e Inventários' : 'Saídas e Requisições' },
      ],
      tables: [
        {
          headers: ['N° Movimento', 'Data', 'SKU', 'Produto', 'Qtd', 'Total (AOA)', 'Origem / Destino'],
          rows: list.map(m => [
            m.movementCode,
            new Date(m.createdAt).toLocaleDateString('pt-AO'),
            m.productSku,
            m.productName,
            m.quantity,
            formatAOA(m.totalPriceAOA),
            m.originReference || m.requesterOrRecipient || 'Padrão',
          ]),
        },
      ],
      notes: 'Documento oficial para prestação de contas, auditoria interna e balanço patrimonial.',
      signatures: ['Responsável de Armazém', 'Gestor Geral da Unidade', 'Conferência de Estoque'],
    });
  };

  // Imprimir Comprovativo Individual de Saída (Guia de Remessa)
  const handlePrintIndividualCheckout = (m: StockMovement) => {
    printFormalDocument({
      title: `Guia de Remessa & Saída de Estoque: ${m.productName}`,
      documentNumber: m.originReference || m.movementCode,
      warehouseName: activeWh?.name || 'Armazém Central',
      warehouseProvince: activeWh?.province || 'Luanda',
      date: new Date(m.createdAt).toLocaleDateString('pt-AO'),
      authorName: m.executedByUserName,
      role: 'Atendente / Operador de Armazém',
      metadata: [
        { label: 'Código da Requisição', value: m.originReference || 'REQ-BALCAO' },
        { label: 'Código do Movimento', value: m.movementCode },
        { label: 'Código SKU do Material', value: m.productSku },
        { label: 'Descrição do Produto', value: m.productName },
        { label: 'Quantidade Retirada', value: `${m.quantity} UN` },
        { label: 'Preço Unitário', value: formatAOA(m.unitPriceAOA) },
        { label: 'Valor Total da Saída', value: formatAOA(m.totalPriceAOA) },
        { label: 'Cliente / Requisitante Destino', value: m.requesterOrRecipient || 'Cliente Geral' },
      ],
      tables: [
        {
          headers: ['Item SKU', 'Designação do Material', 'Quantidade', 'Preço Unit. (AOA)', 'Total (AOA)'],
          rows: [
            [
              m.productSku,
              m.productName,
              `${m.quantity} UN`,
              formatAOA(m.unitPriceAOA),
              formatAOA(m.totalPriceAOA),
            ],
          ],
        },
      ],
      notes: m.notes || 'Material entregue em conformidade. O recebedor confere as quantidades e assume total responsabilidade pelo uso e guarda do ativo.',
      signatures: ['Atendente / Expedidor', 'Cliente / Requisitante (Recebedor)', 'Conferência de Segurança'],
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Movimentações de Estoque</span>
            <span className="text-xs text-slate-400 font-mono">({activeWh?.name})</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Histórico separado de entradas e saídas físicas, conferência de saldos e controle de devoluções de clientes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {(isCliente || isAtendente || isResponsavelOrAbove) && (
            <button
              type="button"
              onClick={() => setIsCheckoutModalOpen(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{isCliente ? 'Solicitar Saída de Vários Produtos' : 'Saída Multilinhas (Cliente)'}</span>
            </button>
          )}

          {isResponsavelOrAbove && (
            <button
              type="button"
              onClick={() => setIsReturnModalOpen(true)}
              className="px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Devolver ao Estoque (Cliente)</span>
            </button>
          )}

          {isResponsavelOrAbove && (
            <button
              type="button"
              onClick={() => setIsInventoryModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>Inventário Multilinhas / Rápido</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('entradas')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'entradas'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
          <span>Histórico de Entradas ({entradasList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('saidas')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'saidas'
              ? 'bg-amber-950 text-amber-300 border border-amber-800 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
          <span>Histórico de Saídas ({saidasList.length})</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'entradas' ? (
        <div className="space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchEntradas}
                onChange={e => setSearchEntradas(e.target.value)}
                placeholder="Pesquisar entradas por SKU, produto, fatura..."
                className="w-full bg-slate-950 border border-slate-700 rounded py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleExportExcel('entradas')}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded text-xs flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exportar Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handlePrintFormalReport('entradas')}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-sky-400" />
                <span>Imprimir PDF Oficial</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="py-2.5 px-3">Código Mov.</th>
                    <th className="py-2.5 px-3">Data / Hora</th>
                    <th className="py-2.5 px-3">Código SKU</th>
                    <th className="py-2.5 px-3">Descrição do Material</th>
                    <th className="py-2.5 px-3">Tipo Entrada</th>
                    <th className="py-2.5 px-3 text-right">Qtd. Entrada</th>
                    <th className="py-2.5 px-3 text-right">Total (AOA)</th>
                    <th className="py-2.5 px-3">Origem / Fornecedor</th>
                    <th className="py-2.5 px-3">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {entradasList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        Nenhuma entrada localizada com os termos pesquisados.
                      </td>
                    </tr>
                  ) : (
                    entradasList.map(m => (
                      <tr key={m.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {m.movementCode}
                        </td>
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleDateString('pt-AO')}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-white whitespace-nowrap">
                          {m.productSku}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-200">
                          {m.productName}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-emerald-950/60 text-emerald-300 border border-emerald-900">
                            {m.type.replace('entrada_', '')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                          +{m.quantity} UN
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300 whitespace-nowrap">
                          {formatAOA(m.totalPriceAOA)}
                        </td>
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                          {m.originReference || m.requesterOrRecipient || 'Recepção Matriz'}
                        </td>
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                          {m.executedByUserName}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchSaidas}
                onChange={e => setSearchSaidas(e.target.value)}
                placeholder="Pesquisar saídas por SKU, cliente, requisição..."
                className="w-full bg-slate-950 border border-slate-700 rounded py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleExportExcel('saidas')}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded text-xs flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exportar Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handlePrintFormalReport('saidas')}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-sky-400" />
                <span>Imprimir PDF Oficial</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="py-2.5 px-3">Código Mov.</th>
                    <th className="py-2.5 px-3">Data / Hora</th>
                    <th className="py-2.5 px-3">Código SKU</th>
                    <th className="py-2.5 px-3">Descrição do Material</th>
                    <th className="py-2.5 px-3">Destinatário / Cliente</th>
                    <th className="py-2.5 px-3 text-right">Qtd. Saída</th>
                    <th className="py-2.5 px-3 text-right">Total (AOA)</th>
                    <th className="py-2.5 px-3">N° Requisição</th>
                    <th className="py-2.5 px-3">Atendente</th>
                    <th className="py-2.5 px-3 text-center">Guia PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {saidasList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500">
                        Nenhuma saída registrada ou encontrada.
                      </td>
                    </tr>
                  ) : (
                    saidasList.map(m => (
                      <tr key={m.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                          {m.movementCode}
                        </td>
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleDateString('pt-AO')}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-white whitespace-nowrap">
                          {m.productSku}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-200">
                          {m.productName}
                        </td>
                        <td className="py-3 px-3 font-semibold text-sky-300 whitespace-nowrap">
                          {m.requesterOrRecipient || 'Cliente Geral'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                          -{m.quantity} UN
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300 whitespace-nowrap">
                          {formatAOA(m.totalPriceAOA)}
                        </td>
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap font-mono">
                          {m.originReference || 'REQ-BALCAO'}
                        </td>
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                          {m.executedByUserName}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handlePrintIndividualCheckout(m)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded transition-colors inline-flex items-center gap-1"
                            title="Imprimir Guia de Remessa PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Guia PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isReturnModalOpen && (
        <ReturnProductModal
          onClose={() => setIsReturnModalOpen(false)}
          onSuccess={() => {
            setIsReturnModalOpen(false);
            alert('Material devolvido com sucesso ao estoque!');
          }}
        />
      )}

      {isInventoryModalOpen && (
        <QuickInventoryModal
          onClose={() => setIsInventoryModalOpen(false)}
          onSuccess={() => {
            setIsInventoryModalOpen(false);
            alert('Inventário multilinha registrado com sucesso!');
          }}
        />
      )}

      {isCheckoutModalOpen && (
        <CheckoutMaterialModal
          onClose={() => setIsCheckoutModalOpen(false)}
          onSuccess={() => {
            setIsCheckoutModalOpen(false);
            alert('Saída multilinha efetuada e Guia de Remessa gerada com sucesso!');
          }}
        />
      )}
    </div>
  );
};

// Modal: Devolver Material ao Estoque
const ReturnProductModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({
  onClose,
  onSuccess,
}) => {
  const [sku, setSku] = useState('SKU-00001');
  const [quantity, setQuantity] = useState(1);
  const [clientName, setClientName] = useState('Sebastião Afonso (Operações Campo)');
  const [notes, setNotes] = useState('Devolução por sobra de material em campo.');

  const activeWh = erpStore.getActiveWarehouse();

  const handleReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = catalogService.getProductBySku(sku);
    if (!prod || !activeWh || quantity <= 0) {
      alert('Produto ou quantidade inválida.');
      return;
    }

    erpStore.returnProductToStock({
      productId: prod.id,
      productSku: prod.sku,
      productName: prod.name,
      warehouseId: activeWh.id,
      quantity,
      unitPriceAOA: prod.basePriceAOA,
      clientName,
      notes,
    });

    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full p-6 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-white">Devolver Material ao Estoque</h3>
            <p className="text-xs text-slate-400">Reintegração de materiais devolvidos por clientes.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleReturn} className="py-4 space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Código SKU do Material *</label>
            <input
              type="text"
              required
              value={sku}
              onChange={e => setSku(e.target.value.toUpperCase())}
              placeholder="Ex: SKU-00001"
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Quantidade Devolvida *</label>
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
            <label className="block text-slate-300 font-semibold mb-1">Cliente / Solicitante da Devolução *</label>
            <input
              type="text"
              required
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Motivo / Condição do Material</label>
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
              Confirmar Devolução
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// MODAL: Inventário Rápido Multilinha
// ==========================================
interface InventoryLine {
  sku: string;
  newQuantity: number;
}

const QuickInventoryModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({
  onClose,
  onSuccess,
}) => {
  const activeWh = erpStore.getActiveWarehouse();
  const [notes, setNotes] = useState('Contagem física periódica de inventário multilinha.');
  const [lines, setLines] = useState<InventoryLine[]>([
    { sku: 'SKU-00001', newQuantity: 50 },
    { sku: 'SKU-00002', newQuantity: 30 },
  ]);

  const handleAddLine = () => {
    setLines([...lines, { sku: '', newQuantity: 10 }]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSaveInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWh || lines.length === 0) {
      alert('Adicione pelo menos um item ao inventário.');
      return;
    }

    const inventoryTableRows: string[][] = [];
    let totalItemsCount = 0;

    for (const line of lines) {
      const prod = catalogService.getProductBySku(line.sku.trim().toUpperCase());
      if (!prod) {
        alert(`SKU inválido ou não encontrado: ${line.sku}`);
        return;
      }
      if (line.newQuantity < 0) {
        alert(`Quantidade não pode ser negativa para o SKU ${prod.sku}`);
        return;
      }

      const previousQty = prod.stockLevels[activeWh.id] || 0;
      const diff = line.newQuantity - previousQty;

      // Grava o movimento no store
      erpStore.addStockMovement({
        warehouseId: activeWh.id,
        productId: prod.id,
        productSku: prod.sku,
        productName: prod.name,
        type: 'ajuste_inventario',
        quantity: line.newQuantity,
        unitPriceAOA: prod.basePriceAOA,
        totalPriceAOA: Math.abs(diff) * prod.basePriceAOA,
        originReference: 'BALANÇO INVENTÁRIO MULTILINHA',
        requesterOrRecipient: 'Auditoria de Armazém',
        executedByUserId: erpStore.currentUser?.id || 'sys',
        executedByUserName: erpStore.currentUser?.name || 'Responsável Armazém',
        notes: `${notes} (Anterior: ${previousQty} -> Novo: ${line.newQuantity})`,
      });

      inventoryTableRows.push([
        prod.sku,
        prod.name,
        previousQty.toString(),
        line.newQuantity.toString(),
        formatAOA(line.newQuantity * prod.basePriceAOA),
      ]);
      totalItemsCount += line.newQuantity;
    }

    // Imprimir o Comprovativo / Prova de Inventário Oficial
    printFormalDocument({
      title: 'Comprovativo de Inventário Físico Multilinha',
      documentNumber: `INV-${activeWh.code}-${Date.now().toString().slice(-6)}`,
      warehouseName: activeWh.name,
      warehouseProvince: activeWh.province,
      date: new Date().toLocaleDateString('pt-AO'),
      authorName: erpStore.currentUser?.name || 'Responsável Armazém',
      role: 'Auditoria & Estoque',
      metadata: [
        { label: 'Unidade Operacional', value: `${activeWh.name} (${activeWh.code})` },
        { label: 'Total de SKUs Contados', value: `${lines.length} itens` },
        { label: 'Volume Total Contabilizado', value: `${totalItemsCount} Unidades` },
        { label: 'Observação Geral', value: notes },
      ],
      tables: [
        {
          headers: ['SKU', 'Designação do Produto', 'Estoque Anterior', 'Qtd. Física Contada', 'Valor Total (AOA)'],
          rows: inventoryTableRows,
        },
      ],
      notes: 'Contagem física realizada com auditoria e reajuste automático de saldos no sistema CATASSO ERP.',
      signatures: ['Responsável de Armazém', 'Auditor de Estoque', 'Gestor Geral'],
    });

    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full p-6 text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-white">Inventário Rápido Multilinha / Balanço de Vários Produtos</h3>
            <p className="text-xs text-slate-400">Atualize o saldo de vários SKUs em simultâneo e gere a prova de inventário.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSaveInventory} className="py-4 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Observações do Balanço / Inventário</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-200">Itens e Quantidades Físicas Contadas:</span>
              <button
                type="button"
                onClick={handleAddLine}
                className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded text-[11px] flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3 h-3" /> Adicionar Produto
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-950 p-2 rounded border border-slate-800">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 uppercase block">SKU</label>
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
                    <label className="text-[10px] text-slate-400 uppercase block">Nova Qtd. Física</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={line.newQuantity}
                      onChange={e => {
                        const newLines = [...lines];
                        newLines[idx].newQuantity = parseInt(e.target.value, 10) || 0;
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
                      title="Remover linha"
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow"
            >
              Gravar e Imprimir Prova de Inventário (PDF)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// MODAL: Saída de Material Multilinha (Guia de Remessa)
// ==========================================
interface CheckoutLine {
  sku: string;
  quantity: number;
}

const CheckoutMaterialModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({
  onClose,
  onSuccess,
}) => {
  const activeWh = erpStore.getActiveWarehouse();

  // Geração automática e sequencial do número de requisição por armazém
  const warehouseMovementsCount = erpStore.movements.filter(
    m => m.warehouseId === activeWh?.id && m.type.startsWith('saida_')
  ).length;
  const nextSeq = warehouseMovementsCount + 1;
  const autoReqCode = `REQ-${activeWh?.code || 'CENTRAL'}-${new Date().getFullYear()}-${String(nextSeq).padStart(4, '0')}`;

  const allSystemUsers = erpStore.users || [];
  const defaultUser = allSystemUsers[0]?.name || 'Sebastião Afonso';

  const [clientName, setClientName] = useState(defaultUser);
  const [requisitionRef, setRequisitionRef] = useState(autoReqCode);
  const [notes, setNotes] = useState('Saída de múltiplos materiais para operações de campo.');
  
  const [lines, setLines] = useState<CheckoutLine[]>([
    { sku: 'SKU-00004', quantity: 2 },
    { sku: 'SKU-00005', quantity: 5 },
  ]);

  const handleAddLine = () => {
    setLines([...lines, { sku: '', quantity: 1 }]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWh || lines.length === 0) {
      alert('Adicione pelo menos um produto na requisição.');
      return;
    }

    // 1. Validar estoques de todos os itens antes de efetivar
    for (const line of lines) {
      const prod = catalogService.getProductBySku(line.sku.trim().toUpperCase());
      if (!prod) {
        alert(`SKU não encontrado no catálogo: ${line.sku}`);
        return;
      }
      const currentQty = prod.stockLevels[activeWh.id] || 0;
      if (line.quantity > currentQty) {
        alert(`Estoque insuficiente para o SKU ${prod.sku} (${prod.name}). Disponível: ${currentQty}, Requisitado: ${line.quantity}`);
        return;
      }
    }

    const pdfTableRows: string[][] = [];
    let grandTotalAOA = 0;

    // 2. Efetivar cada linha como movimento de saída
    for (const line of lines) {
      const prod = catalogService.getProductBySku(line.sku.trim().toUpperCase())!;
      const totalLinePrice = line.quantity * prod.basePriceAOA;
      grandTotalAOA += totalLinePrice;

      erpStore.addStockMovement({
        warehouseId: activeWh.id,
        productId: prod.id,
        productSku: prod.sku,
        productName: prod.name,
        type: 'saida_cliente',
        quantity: line.quantity,
        unitPriceAOA: prod.basePriceAOA,
        totalPriceAOA: totalLinePrice,
        originReference: requisitionRef,
        requesterOrRecipient: clientName,
        executedByUserId: erpStore.currentUser?.id || 'sys',
        executedByUserName: erpStore.currentUser?.name || 'Atendente',
        notes,
      });

      pdfTableRows.push([
        prod.sku,
        prod.name,
        `${line.quantity} ${prod.unit}`,
        formatAOA(prod.basePriceAOA),
        formatAOA(totalLinePrice),
      ]);
    }

    // 3. Imprimir a Guia de Remessa / Prova de Saída Consolidada Multilinhas
    printFormalDocument({
      title: `Guia de Remessa & Saída de Estoque Multilinhas`,
      documentNumber: requisitionRef,
      warehouseName: activeWh.name,
      warehouseProvince: activeWh.province,
      date: new Date().toLocaleDateString('pt-AO'),
      authorName: erpStore.currentUser?.name || 'Atendente de Balcão',
      role: 'Expedição & Faturamento',
      metadata: [
        { label: 'Número da Requisição', value: requisitionRef },
        { label: 'Cliente / Destinatário', value: clientName },
        { label: 'Unidade Expedidora', value: `${activeWh.name} (${activeWh.code})` },
        { label: 'Valor Global da Saída', value: formatAOA(grandTotalAOA) },
      ],
      tables: [
        {
          headers: ['Código SKU', 'Designação do Material', 'Quantidade', 'Preço Unit. (AOA)', 'Total (AOA)'],
          rows: pdfTableRows,
        },
      ],
      notes: `${notes}\n\nDeclaro que recebi os materiais acima descritos em perfeito estado e quantidade, assumindo total responsabilidade pela sua aplicação e guarda.`,
      signatures: ['Atendente / Expedidor', 'Cliente / Requisitante (Recebedor)', 'Controle de Saída'],
    });

    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full p-6 text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-white">Saída de Múltiplos Produtos (Guia de Remessa)</h3>
            <p className="text-xs text-slate-400">Atenda vários produtos numa única requisição e imprima a prova formal de saída.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleCheckout} className="py-4 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">N° Requisição (Automático)</label>
              <input
                type="text"
                required
                readOnly
                value={requisitionRef}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sky-400 font-mono font-bold cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Cliente / Destinatário *</label>
              <select
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-sky-500"
              >
                {allSystemUsers.length > 0 ? (
                  allSystemUsers.map(u => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.role.toUpperCase()})
                    </option>
                  ))
                ) : (
                  <option value={clientName}>{clientName}</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Observações / Destino de Campo</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-200">Produtos Requisitados (Carrinho Multilinhas):</span>
              <button
                type="button"
                onClick={handleAddLine}
                className="px-2.5 py-1 bg-amber-700 hover:bg-amber-600 text-white rounded text-[11px] flex items-center gap-1 font-semibold"
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
                    <label className="text-[10px] text-slate-400 uppercase block">Quantidade *</label>
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
                      title="Remover linha"
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
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold shadow"
            >
              Efetuar Saída e Gerar Guia de Remessa (PDF)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
