import React, { useState, useEffect } from 'react';
import { Product, WarehouseTransfer, StockMovement } from '../../types';
import { catalogService, TOTAL_BASE_SKUS } from '../../services/catalogService';
import { erpStore } from '../../services/store';
import { formatAOA, translations } from '../../services/i18n';
import { printProductLabels, exportToExcel } from '../../services/exportService';
import {
  Search,
  Filter,
  Plus,
  Printer,
  FileSpreadsheet,
  ArrowRightLeft,
  History,
  AlertTriangle,
  FlaskConical,
  Gauge,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export const ProductCatalog: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [onlyChemical, setOnlyChemical] = useState(false);
  const [onlyCalibrated, setOnlyCalibrated] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Selected product for modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [historyModalProduct, setHistoryModalProduct] = useState<Product | null>(null);
  const [transferModalProduct, setTransferModalProduct] = useState<Product | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Edit State
  const [editingBasePrice, setEditingBasePrice] = useState<number | null>(null);
  const [localDesc, setLocalDesc] = useState('');
  const [localColor, setLocalColor] = useState('');
  const [localSize, setLocalSize] = useState('');
  const [minStockAlert, setMinStockAlert] = useState(10);

  // Transfer modal form
  const [transferQty, setTransferQty] = useState(5);
  const [transferTargetWh, setTransferTargetWh] = useState('');

  // Selected items for batch label printing
  const [selectedForLabels, setSelectedForLabels] = useState<string[]>([]);

  const currentUser = erpStore.currentUser;
  const activeWh = erpStore.getActiveWarehouse();
  const t = translations[erpStore.language];

  // Permissions check: Atendente CANNOT edit products
  const canEditProduct =
    currentUser?.role === 'superadmin' ||
    currentUser?.role === 'gestor_geral' ||
    currentUser?.role === 'responsavel_armazem';

  // Load catalog data
  const searchResult = catalogService.searchProducts({
    query: searchQuery,
    category: selectedCategory,
    warehouseId: activeWh?.id,
    onlyLowStock,
    onlyChemical,
    onlyCalibrated,
    page,
    pageSize,
  });

  const categories = [
    'all',
    'Mecânica e Rolamentos',
    'Hidráulica e Pneumática',
    'Elétrica e Automação',
    'EPIs e Segurança Industrial',
    'Produtos Químicos e Lubrificantes',
    'Instrumentação e EIMES Calibráveis',
    'Tubagens, Flanges e Conexões',
    'Fixação e Elementos Roscados',
  ];

  const handleEditClick = (p: Product) => {
    setSelectedProduct(p);
    setEditingBasePrice(p.basePriceAOA);
    const whData = p.warehouseData[activeWh?.id || ''] || {};
    setLocalDesc(whData.localDescription || '');
    setLocalColor(whData.localColor || '');
    setLocalSize(whData.localSize || '');
    setMinStockAlert(whData.minStockAlert ?? 10);
  };

  const handleSaveProductEdit = () => {
    if (!selectedProduct) return;
    if (editingBasePrice !== null && editingBasePrice >= 0) {
      catalogService.updateBasePrice(selectedProduct.id, editingBasePrice);
    }
    if (activeWh) {
      catalogService.updateWarehouseSpecificData(selectedProduct.id, activeWh.id, {
        localDescription: localDesc,
        localColor: localColor,
        localSize: localSize,
        minStockAlert,
      });
    }
    setSelectedProduct(null);
  };

  const handleRequestTransfer = () => {
    if (!transferModalProduct || !activeWh || !transferTargetWh || transferQty <= 0) return;

    erpStore.requestTransfer({
      originWarehouseId: transferTargetWh,
      destinationWarehouseId: activeWh.id,
      requestedByUserId: currentUser?.id || 'sys',
      requestedByUserName: currentUser?.name || 'Utilizador',
      items: [
        {
          productId: transferModalProduct.id,
          sku: transferModalProduct.sku,
          productName: transferModalProduct.name,
          quantity: transferQty,
        },
      ],
      notes: `Solicitação emergencial para atendimento de estoque local no ${activeWh.name}.`,
    });

    setTransferModalProduct(null);
    alert('Solicitação de transferência entre armazéns enviada com sucesso!');
  };

  // Toggle selection for batch label printing
  const toggleSelectForLabel = (sku: string) => {
    if (selectedForLabels.includes(sku)) {
      setSelectedForLabels(selectedForLabels.filter(s => s !== sku));
    } else {
      setSelectedForLabels([...selectedForLabels, sku]);
    }
  };

  const handleBatchPrintLabels = () => {
    const listToPrint = selectedForLabels.length > 0 ? selectedForLabels : searchResult.products.map(p => p.sku);

    const labelsData = listToPrint
      .map(sku => {
        const prod = catalogService.getProductBySku(sku);
        if (!prod) return null;
        const localQty = prod.stockLevels[activeWh?.id || ''] || 0;
        return {
          sku: prod.sku,
          name: prod.name,
          category: prod.category,
          warehouseName: activeWh?.name || 'Armazém Central',
          locationBin: prod.warehouseData[activeWh?.id || '']?.localLocationId || 'Padrão',
          originRef: 'Estoque Central CATASSO',
          supplierName: 'Fornecedor Homologado Angola',
          quantity: localQty,
          unit: prod.unit,
          isChemical: prod.isChemical,
          fispqNumber: prod.chemicalInfo?.fispqNumber,
          isCalibrated: prod.isCalibrated,
          calibrationCert: prod.calibrationInfo?.certificateNumber,
        };
      })
      .filter(Boolean) as any[];

    if (labelsData.length === 0) {
      alert('Nenhum produto selecionado para gerar etiquetas.');
      return;
    }

    printProductLabels(labelsData);
  };

  const handleExportCatalogToExcel = () => {
    const headers = [
      'Código SKU',
      'Nome do Produto',
      'Categoria',
      'Unidade',
      'Preço Base (AOA)',
      'Qtd. Armazém Local',
      'Alerta Estoque Mínimo',
      'É Químico (FISPQ)',
      'É Calibrável (EIMES)',
      'Endereço Local',
    ];

    const rows = searchResult.products.map(p => [
      p.sku,
      p.name,
      p.category,
      p.unit,
      p.basePriceAOA,
      p.stockLevels[activeWh?.id || ''] || 0,
      p.warehouseData[activeWh?.id || '']?.minStockAlert ?? 10,
      p.isChemical ? (p.chemicalInfo?.fispqNumber || 'Sim') : 'Não',
      p.isCalibrated ? (p.calibrationInfo?.certificateNumber || 'Sim') : 'Não',
      p.warehouseData[activeWh?.id || '']?.localLocationId || 'A-01-A',
    ]);

    exportToExcel(`Catalogo_Produtos_${activeWh?.code || 'Geral'}`, headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Catálogo de Suprimentos & Peças Industriais</span>
            <span className="text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">
              {TOTAL_BASE_SKUS.toLocaleString()} SKUs Ativos
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Codificação sequencial única com parâmetros customizáveis por cada armazém (Unidade atual: {activeWh?.name}).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleBatchPrintLabels}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span>Imprimir Etiquetas {selectedForLabels.length > 0 ? `(${selectedForLabels.length})` : 'em Lote'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCatalogToExcel}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Excel</span>
          </button>

          {canEditProduct && (
            <button
              type="button"
              onClick={() => setIsRegisterOpen(true)}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Produto (Próx. SKU)</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Pesquisar por SKU (ex: SKU-00001), nome, fabricante..."
              className="w-full bg-slate-950 border border-slate-700 rounded py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="all">Todas as Categorias Industriais</option>
              {categories.filter(c => c !== 'all').map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyLowStock(!onlyLowStock)}
              className={`flex-1 py-2 px-2.5 rounded text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                onlyLowStock
                  ? 'bg-amber-950/80 border-amber-700 text-amber-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Estoque Mínimo</span>
            </button>

            <button
              type="button"
              onClick={() => setOnlyChemical(!onlyChemical)}
              className={`flex-1 py-2 px-2.5 rounded text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                onlyChemical
                  ? 'bg-red-950/80 border-red-700 text-red-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-red-400" />
              <span>Químicos</span>
            </button>

            <button
              type="button"
              onClick={() => setOnlyCalibrated(!onlyCalibrated)}
              className={`flex-1 py-2 px-2.5 rounded text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                onlyCalibrated
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span>EIMES</span>
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      searchResult.products.length > 0 &&
                      searchResult.products.every(p => selectedForLabels.includes(p.sku))
                    }
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedForLabels(searchResult.products.map(p => p.sku));
                      } else {
                        setSelectedForLabels([]);
                      }
                    }}
                    className="rounded bg-slate-900 border-slate-700 text-sky-600 focus:ring-0"
                  />
                </th>
                <th className="py-2.5 px-3">Código SKU</th>
                <th className="py-2.5 px-3">Descrição / Especificação do Produto</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3 text-right">Preço Base (AOA)</th>
                <th className="py-2.5 px-3 text-center">Qtd. Local ({activeWh?.province})</th>
                <th className="py-2.5 px-3 text-center">Outros Armazéns</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {searchResult.products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Nenhum produto encontrado com os critérios selecionados.
                  </td>
                </tr>
              ) : (
                searchResult.products.map(p => {
                  const localStock = p.stockLevels[activeWh?.id || ''] || 0;
                  const minAlert = p.warehouseData[activeWh?.id || '']?.minStockAlert ?? 10;
                  const isLow = localStock <= minAlert;

                  // Sum of stock in other warehouses
                  let otherTotal = 0;
                  const otherWarehousesBreakdown = erpStore.warehouses
                    .filter(w => w.id !== activeWh?.id)
                    .map(w => {
                      const qty = p.stockLevels[w.id] || 0;
                      otherTotal += qty;
                      return { name: w.name, province: w.province, qty, id: w.id };
                    });

                  const isChecked = selectedForLabels.includes(p.sku);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isLow ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectForLabel(p.sku)}
                          className="rounded bg-slate-900 border-slate-700 text-sky-600 focus:ring-0"
                        />
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-sky-400 whitespace-nowrap">
                        {p.sku}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-200">{p.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 max-w-md line-clamp-1">
                          {p.warehouseData[activeWh?.id || '']?.localDescription || p.standardDescription}
                        </div>
                        {/* Tags for chemical & calibration */}
                        <div className="flex items-center gap-2 mt-1">
                          {p.isChemical && (
                            <span className="text-[10px] text-red-400 font-mono bg-red-950/60 px-1.5 py-0.2 rounded border border-red-900/60">
                              FISPQ: {p.chemicalInfo?.fispqNumber}
                            </span>
                          )}
                          {p.isCalibrated && (
                            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-900/60">
                              EIMES: {p.calibrationInfo?.certificateNumber}
                            </span>
                          )}
                          {p.warehouseData[activeWh?.id || '']?.localColor && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Cor: {p.warehouseData[activeWh?.id || ''].localColor}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {p.category}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-200 whitespace-nowrap">
                        {formatAOA(p.basePriceAOA)}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                            isLow
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'text-slate-200'
                          }`}
                        >
                          {localStock} {p.unit}
                        </span>
                        {isLow && (
                          <div className="text-[10px] text-amber-400 font-medium mt-0.5">
                            Min: {minAlert}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="font-mono text-slate-300 font-medium">
                          {otherTotal} {p.unit}
                        </div>
                        {otherTotal > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setTransferModalProduct(p);
                              const availableOther = otherWarehousesBreakdown.find(o => o.qty > 0);
                              if (availableOther) setTransferTargetWh(availableOther.id);
                            }}
                            className="mt-0.5 text-[10px] text-sky-400 hover:underline flex items-center justify-center gap-0.5 mx-auto"
                          >
                            <ArrowRightLeft className="w-2.5 h-2.5" />
                            <span>Solicitar Transferência</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setHistoryModalProduct(p)}
                            className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
                            title="Histórico de Movimentações deste SKU"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {canEditProduct && (
                            <button
                              type="button"
                              onClick={() => handleEditClick(p)}
                              className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                              title="Editar Preço e Detalhes Locais"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="py-3 px-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Mostrando <strong>{searchResult.products.length}</strong> de aproximadamente{' '}
            <strong>{searchResult.totalCount.toLocaleString()}</strong> itens
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 text-slate-300 hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono">
              Página {searchResult.page} de {searchResult.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= searchResult.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 text-slate-300 hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Product Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs text-sky-400 font-mono font-bold">{selectedProduct.sku}</div>
                <h3 className="font-bold text-base text-white">{selectedProduct.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-slate-400">
                O código SKU e o nome matriz são imutáveis para manter a integridade da cadeia de suprimentos.
                Pode ajustar o <strong>preço base oficial</strong> e parâmetros específicos deste armazém.
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Preço Base Geral (AOA / Kz)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={editingBasePrice ?? selectedProduct.basePriceAOA}
                  onChange={e => setEditingBasePrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Descrição Local / Observações de Aplicação ({activeWh?.name})
                </label>
                <textarea
                  rows={2}
                  value={localDesc}
                  onChange={e => setLocalDesc(e.target.value)}
                  placeholder="Ex: Aplicável às bombas de recirculação do setor B..."
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Cor Local</label>
                  <input
                    type="text"
                    value={localColor}
                    onChange={e => setLocalColor(e.target.value)}
                    placeholder="Ex: Azul / Zincado"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tamanho / Medida</label>
                  <input
                    type="text"
                    value={localSize}
                    onChange={e => setLocalSize(e.target.value)}
                    placeholder="Ex: 4 Polegadas"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    min="1"
                    value={minStockAlert}
                    onChange={e => setMinStockAlert(parseInt(e.target.value, 10) || 5)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveProductEdit}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold"
              >
                Guardar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movement History Modal */}
      {historyModalProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-sky-400 font-mono font-bold">{historyModalProduct.sku}</span>
                <h3 className="font-bold text-base text-white">Histórico de Movimentações no Sistema</h3>
                <p className="text-xs text-slate-400">{historyModalProduct.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="py-4 max-h-96 overflow-y-auto space-y-2">
              {erpStore.movements.filter(m => m.productId === historyModalProduct.id).length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Ainda não há registros de movimentações físicas registradas para este produto neste armazém.
                </div>
              ) : (
                erpStore.movements
                  .filter(m => m.productId === historyModalProduct.id)
                  .map(m => {
                    const isEntrada = m.type.startsWith('entrada_');
                    return (
                      <div
                        key={m.id}
                        className="p-3 bg-slate-950 border border-slate-800 rounded flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white">{m.movementCode}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-mono uppercase ${
                                isEntrada ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                              }`}
                            >
                              {m.type.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-slate-400 mt-1">
                            Ref: <strong>{m.originReference || 'N/A'}</strong> · Operador:{' '}
                            {m.executedByUserName}
                          </div>
                          {m.notes && <div className="text-slate-500 text-[11px] mt-0.5">{m.notes}</div>}
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-mono font-bold text-sm ${
                              isEntrada ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {isEntrada ? '+' : '-'}{m.quantity} UN
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {new Date(m.createdAt).toLocaleDateString('pt-AO')}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryModalProduct(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Request Modal */}
      {transferModalProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-sky-400 font-mono font-bold">{transferModalProduct.sku}</span>
                <h3 className="font-bold text-base text-white">Solicitar Transferência Inter-Armazém</h3>
              </div>
              <button
                type="button"
                onClick={() => setTransferModalProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Armazém de Origem (com estoque disponível)</label>
                <select
                  value={transferTargetWh}
                  onChange={e => setTransferTargetWh(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-sky-500"
                >
                  {erpStore.warehouses
                    .filter(w => w.id !== activeWh?.id)
                    .map(w => {
                      const qty = transferModalProduct.stockLevels[w.id] || 0;
                      return (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.province}) — Disponível: {qty} {transferModalProduct.unit}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Quantidade a Transferir</label>
                <input
                  type="number"
                  min="1"
                  value={transferQty}
                  onChange={e => setTransferQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-sky-500"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded text-slate-400 leading-relaxed text-[11px]">
                O armazém solicitante é <strong>{activeWh?.name}</strong>. Esta solicitação passará pelo fluxo
                de aprovação do responsável do armazém de origem antes do despacho rodoviário/marítimo.
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTransferModalProduct(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRequestTransfer}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold"
              >
                Enviar Solicitação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register New Product Modal (Continuous SKU Sequence) */}
      {isRegisterOpen && (
        <RegisterProductModal
          onClose={() => setIsRegisterOpen(false)}
          onSuccess={() => {
            setIsRegisterOpen(false);
          }}
        />
      )}
    </div>
  );
};

// Modal for registering a new product continuing the unique sequence
const RegisterProductModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Mecânica e Rolamentos');
  const [unit, setUnit] = useState('UN');
  const [basePriceAOA, setBasePriceAOA] = useState(50000);
  const [standardDescription, setStandardDescription] = useState('');
  const [isChemical, setIsChemical] = useState(false);
  const [fispqNumber, setFispqNumber] = useState('');
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [certNumber, setCertNumber] = useState('');

  const activeWh = erpStore.getActiveWarehouse();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    catalogService.registerNewProduct({
      name,
      category,
      unit,
      basePriceAOA,
      standardDescription: standardDescription || 'Especificação padrão industrial.',
      isChemical,
      isCalibrated,
      chemicalInfo: isChemical
        ? {
            isChemical: true,
            fispqNumber: fispqNumber || 'FISPQ-AO-NOVO',
            manufactureDate: '2026-01-01',
            expirationDate: '2028-01-01',
          }
        : undefined,
      calibrationInfo: isCalibrated
        ? {
            isCalibrated: true,
            certificateNumber: certNumber || 'CAL-NOVO/2026',
            calibrationDate: '2026-01-01',
            dueDate: '2027-01-01',
            calibrationLaboratory: 'Laboratório Central de Metrologia',
          }
        : undefined,
      warehouseData: {
        [activeWh?.id || 'wh-luanda']: {
          minStockAlert: 10,
          maxStock: 200,
        },
      },
      stockLevels: {
        [activeWh?.id || 'wh-luanda']: 0,
      },
    });

    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-white">Cadastrar Novo Produto na Matriz</h3>
            <p className="text-xs text-slate-400">Receberá automaticamente a próxima numeração única de SKU.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleRegister} className="py-4 space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Nome / Descrição Matriz *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Motor Elétrico Trifásico 20cv - WEG"
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Categoria</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-sky-500"
              >
                <option value="Mecânica e Rolamentos">Mecânica e Rolamentos</option>
                <option value="Hidráulica e Pneumática">Hidráulica e Pneumática</option>
                <option value="Elétrica e Automação">Elétrica e Automação</option>
                <option value="EPIs e Segurança Industrial">EPIs e Segurança</option>
                <option value="Produtos Químicos e Lubrificantes">Produtos Químicos</option>
                <option value="Instrumentação e EIMES Calibráveis">Instrumentação EIMES</option>
                <option value="Tubagens, Flanges e Conexões">Tubagens e Flanges</option>
                <option value="Fixação e Elementos Roscados">Fixação e Parafusos</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Unidade</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-sky-500"
              >
                <option value="UN">Unidade (UN)</option>
                <option value="PAR">Par (PAR)</option>
                <option value="L">Litros (L)</option>
                <option value="KG">Quilogramas (KG)</option>
                <option value="M">Metros (M)</option>
                <option value="CX">Caixa (CX)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Preço Base (AOA)</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={basePriceAOA}
              onChange={e => setBasePriceAOA(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isChemical}
                onChange={e => setIsChemical(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-sky-600"
              />
              <span className="text-slate-300 font-semibold">Produto Químico (FISPQ)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isCalibrated}
                onChange={e => setIsCalibrated(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-sky-600"
              />
              <span className="text-slate-300 font-semibold">Calibrável (EIMES)</span>
            </label>
          </div>

          {isChemical && (
            <div>
              <label className="block text-slate-300 font-semibold mb-1">N° FISPQ / ONU</label>
              <input
                type="text"
                value={fispqNumber}
                onChange={e => setFispqNumber(e.target.value)}
                placeholder="Ex: FISPQ-AO-2026"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-sky-500"
              />
            </div>
          )}

          {isCalibrated && (
            <div>
              <label className="block text-slate-300 font-semibold mb-1">N° Certificado EIMES</label>
              <input
                type="text"
                value={certNumber}
                onChange={e => setCertNumber(e.target.value)}
                placeholder="Ex: CAL-EIMES-9921/2026"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-sky-500"
              />
            </div>
          )}

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
              Cadastrar Produto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
