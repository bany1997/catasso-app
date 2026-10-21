import React, { useState } from 'react';
import { catalogService } from '../../services/catalogService';
import { erpStore } from '../../services/store';
import { Product, ChemicalData, CalibrationData } from '../../types';
import { exportToExcel, printFormalDocument } from '../../services/exportService';
import {
  FlaskConical,
  Gauge,
  AlertTriangle,
  Calendar,
  ShieldAlert,
  Edit2,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  Search,
} from 'lucide-react';

export const ChemicalAndCalibration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chemicals' | 'calibrated'>('chemicals');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form states for Chemical
  const [fispq, setFispq] = useState('');
  const [unNumber, setUnNumber] = useState('');
  const [hazardClass, setHazardClass] = useState('');
  const [chemMfgDate, setChemMfgDate] = useState('');
  const [chemExpDate, setChemExpDate] = useState('');
  const [batchNumber, setBatchNumber] = useState('');

  // Form states for Calibration
  const [certNumber, setCertNumber] = useState('');
  const [calibDate, setCalibDate] = useState('');
  const [calibDueDate, setCalibDueDate] = useState('');
  const [lab, setLab] = useState('');
  const [tolerance, setTolerance] = useState('');

  const activeWh = erpStore.getActiveWarehouse();
  const currentUser = erpStore.currentUser;

  const chemicalProducts = catalogService.getChemicalProducts(activeWh?.id || 'wh-luanda');
  const calibratedProducts = catalogService.getCalibratedProducts(activeWh?.id || 'wh-luanda');

  // Filter based on search query
  const filteredChemicals = chemicalProducts.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.sku.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.chemicalInfo?.fispqNumber?.toLowerCase().includes(q) ||
      p.chemicalInfo?.batchNumber?.toLowerCase().includes(q)
    );
  });

  const filteredCalibrated = calibratedProducts.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.sku.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.calibrationInfo?.certificateNumber?.toLowerCase().includes(q) ||
      p.calibrationInfo?.calibrationLaboratory?.toLowerCase().includes(q)
    );
  });

  // Expiration check helper
  const getExpirationStatus = (expDateStr?: string) => {
    if (!expDateStr) return { status: 'ok', label: 'Indeterminado' };
    const exp = new Date(expDateStr);
    const now = new Date();
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return { status: 'expired', label: `Vencido há ${Math.abs(diffDays)} dias`, color: 'text-red-400 bg-red-950/60 border-red-800' };
    }
    if (diffDays <= 60) {
      return { status: 'warning', label: `Vence em ${diffDays} dias`, color: 'text-amber-400 bg-amber-950/60 border-amber-800' };
    }
    return { status: 'ok', label: 'Conforme / Válido', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' };
  };

  const handleOpenEdit = (p: Product) => {
    setSelectedProduct(p);
    if (p.isChemical && p.chemicalInfo) {
      setFispq(p.chemicalInfo.fispqNumber || '');
      setUnNumber(p.chemicalInfo.unNumber || '');
      setHazardClass(p.chemicalInfo.hazardClass || '');
      setChemMfgDate(p.chemicalInfo.manufactureDate || '');
      setChemExpDate(p.chemicalInfo.expirationDate || '');
      setBatchNumber(p.chemicalInfo.batchNumber || '');
    }
    if (p.isCalibrated && p.calibrationInfo) {
      setCertNumber(p.calibrationInfo.certificateNumber || '');
      setCalibDate(p.calibrationInfo.calibrationDate || '');
      setCalibDueDate(p.calibrationInfo.dueDate || '');
      setLab(p.calibrationInfo.calibrationLaboratory || '');
      setTolerance(p.calibrationInfo.tolerance || '');
    }
  };

  const handleSaveData = () => {
    if (!selectedProduct) return;

    if (activeTab === 'chemicals') {
      const chemData: ChemicalData = {
        isChemical: true,
        fispqNumber: fispq,
        unNumber,
        hazardClass,
        manufactureDate: chemMfgDate,
        expirationDate: chemExpDate,
        batchNumber,
      };
      catalogService.updateChemicalOrCalibration(selectedProduct.id, chemData, undefined);
    } else {
      const calibData: CalibrationData = {
        isCalibrated: true,
        certificateNumber: certNumber,
        calibrationDate: calibDate,
        dueDate: calibDueDate,
        calibrationLaboratory: lab,
        tolerance,
      };
      catalogService.updateChemicalOrCalibration(selectedProduct.id, undefined, calibData);
    }

    setSelectedProduct(null);
  };

  const handleExportExcel = () => {
    if (activeTab === 'chemicals') {
      const headers = ['SKU', 'Produto', 'N° FISPQ', 'N° ONU', 'Classe Risco', 'Lote', 'Data Fabr.', 'Data Validade', 'Status Validade'];
      const rows = filteredChemicals.map(p => {
        const expStatus = getExpirationStatus(p.chemicalInfo?.expirationDate);
        return [
          p.sku,
          p.name,
          p.chemicalInfo?.fispqNumber || '',
          p.chemicalInfo?.unNumber || '',
          p.chemicalInfo?.hazardClass || '',
          p.chemicalInfo?.batchNumber || '',
          p.chemicalInfo?.manufactureDate || '',
          p.chemicalInfo?.expirationDate || '',
          expStatus.label,
        ];
      });
      exportToExcel(`Controle_Quimicos_FISPQ_${activeWh?.code}`, headers, rows);
    } else {
      const headers = ['SKU', 'Equipamento / Instrumento', 'N° Certificado EIMES', 'Data Calibração', 'Data Próx. Calibração', 'Laboratório', 'Tolerância', 'Status Metrológico'];
      const rows = filteredCalibrated.map(p => {
        const expStatus = getExpirationStatus(p.calibrationInfo?.dueDate);
        return [
          p.sku,
          p.name,
          p.calibrationInfo?.certificateNumber || '',
          p.calibrationInfo?.calibrationDate || '',
          p.calibrationInfo?.dueDate || '',
          p.calibrationInfo?.calibrationLaboratory || '',
          p.calibrationInfo?.tolerance || '',
          expStatus.label,
        ];
      });
      exportToExcel(`Controle_Calibraveis_EIMES_${activeWh?.code}`, headers, rows);
    }
  };

  const handlePrintReport = () => {
    const isChem = activeTab === 'chemicals';
    printFormalDocument({
      title: isChem ? 'Relatório Oficial de Controle de Produtos Químicos e Lubrificantes' : 'Relatório Oficial de Controle Metrológico de Equipamentos EIMES',
      documentNumber: isChem ? `REL-FISPQ-${new Date().getFullYear()}` : `REL-EIMES-${new Date().getFullYear()}`,
      warehouseName: activeWh?.name || 'Armazém Central',
      warehouseProvince: activeWh?.province || 'Luanda',
      date: new Date().toLocaleDateString('pt-AO'),
      authorName: currentUser?.name || 'Responsável Armazém',
      role: currentUser?.role || 'Engenharia de Qualidade',
      metadata: [
        { label: 'Unidade Operacional', value: `${activeWh?.name} (${activeWh?.code})` },
        { label: 'Norma Aplicável', value: isChem ? 'FISPQ / Regulamento Angolano de Produtos Perigosos' : 'Controle EIMES / Calibração Metrológica Rastreada' },
        { label: 'Total de Itens Auditados', value: `${isChem ? filteredChemicals.length : filteredCalibrated.length} itens` },
      ],
      tables: [
        {
          headers: isChem ? ['SKU', 'Produto', 'FISPQ', 'Lote', 'Vencimento', 'Situação'] : ['SKU', 'Instrumento', 'Certificado', 'Vencimento', 'Laboratório', 'Situação'],
          rows: isChem
            ? filteredChemicals.map(p => [
                p.sku,
                p.name,
                p.chemicalInfo?.fispqNumber || '-',
                p.chemicalInfo?.batchNumber || '-',
                p.chemicalInfo?.expirationDate || '-',
                getExpirationStatus(p.chemicalInfo?.expirationDate).label,
              ])
            : filteredCalibrated.map(p => [
                p.sku,
                p.name,
                p.calibrationInfo?.certificateNumber || '-',
                p.calibrationInfo?.dueDate || '-',
                p.calibrationInfo?.calibrationLaboratory || '-',
                getExpirationStatus(p.calibrationInfo?.dueDate).label,
              ]),
        },
      ],
      notes: isChem
        ? 'Todos os produtos com prazo de validade inferior a 60 dias exigem segregação e laudo de revalidação.'
        : 'Instrumentos fora do prazo de validade da calibração não podem ser utilizados em operações críticas.',
      signatures: ['Técnico de Segurança Industrial / Metrologia', 'Responsável do Armazém'],
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Controle Especial: Químicos & Calibráveis EIMES</span>
            <span className="text-xs text-slate-400 font-mono">({activeWh?.name})</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestão integrada de fichas de segurança (FISPQ), lotes, calibrações de instrumentos de medição e alertas automáticos de vencimento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Excel</span>
          </button>
          <button
            type="button"
            onClick={handlePrintReport}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span>Imprimir Laudo PDF</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-lg max-w-md">
        <button
          type="button"
          onClick={() => {
            setActiveTab('chemicals');
            setSearchQuery('');
          }}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'chemicals'
              ? 'bg-red-950 text-red-300 border border-red-800 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5 text-red-400" />
          <span>Produtos Químicos ({chemicalProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('calibrated');
            setSearchQuery('');
          }}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'calibrated'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gauge className="w-3.5 h-3.5 text-emerald-400" />
          <span>EIMES Calibráveis ({calibratedProducts.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'chemicals'
                ? 'Pesquisar químico por SKU, nome, lote ou FISPQ...'
                : 'Pesquisar instrumento por SKU, nome ou certificado...'
            }
            className="w-full bg-slate-950 border border-slate-700 rounded py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'chemicals' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                  <th className="py-2.5 px-3">Código SKU</th>
                  <th className="py-2.5 px-3">Produto Químico / Lubrificante</th>
                  <th className="py-2.5 px-3">FISPQ / ONU</th>
                  <th className="py-2.5 px-3">Classe de Risco</th>
                  <th className="py-2.5 px-3">N° Lote</th>
                  <th className="py-2.5 px-3">Fabricação</th>
                  <th className="py-2.5 px-3">Validade</th>
                  <th className="py-2.5 px-3 text-center">Situação</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredChemicals.map(p => {
                  const expStatus = getExpirationStatus(p.chemicalInfo?.expirationDate);
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-bold text-red-400 whitespace-nowrap">
                        {p.sku}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-200">
                        {p.name}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                        {p.chemicalInfo?.fispqNumber || '-'}
                        {p.chemicalInfo?.unNumber && <span className="text-[10px] text-slate-500 block">{p.chemicalInfo.unNumber}</span>}
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {p.chemicalInfo?.hazardClass || 'Uso Geral'}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                        {p.chemicalInfo?.batchNumber || 'LOTE-PADRAO'}
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {p.chemicalInfo?.manufactureDate || '-'}
                      </td>
                      <td className="py-3 px-3 font-bold font-mono text-slate-200 whitespace-nowrap">
                        {p.chemicalInfo?.expirationDate || '-'}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase border ${expStatus.color}`}>
                          {expStatus.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
                          title="Editar Validade e FISPQ"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                  <th className="py-2.5 px-3">Código SKU</th>
                  <th className="py-2.5 px-3">Instrumento / Equipamento EIMES</th>
                  <th className="py-2.5 px-3">N° Certificado</th>
                  <th className="py-2.5 px-3">Laboratório Credenciado</th>
                  <th className="py-2.5 px-3">Última Calibração</th>
                  <th className="py-2.5 px-3">Próximo Vencimento</th>
                  <th className="py-2.5 px-3">Tolerância</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCalibrated.map(p => {
                  const expStatus = getExpirationStatus(p.calibrationInfo?.dueDate);
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {p.sku}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-200">
                        {p.name}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                        {p.calibrationInfo?.certificateNumber || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {p.calibrationInfo?.calibrationLaboratory || 'Laboratório Central'}
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {p.calibrationInfo?.calibrationDate || '-'}
                      </td>
                      <td className="py-3 px-3 font-bold font-mono text-slate-200 whitespace-nowrap">
                        {p.calibrationInfo?.dueDate || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap font-mono">
                        {p.calibrationInfo?.tolerance || '± 0.5%'}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase border ${expStatus.color}`}>
                          {expStatus.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
                          title="Editar Certificado e Data de Calibração"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-sky-400 font-mono font-bold">{selectedProduct.sku}</span>
                <h3 className="font-bold text-base text-white">
                  {activeTab === 'chemicals' ? 'Editar Dados de FISPQ & Validade' : 'Editar Calibração EIMES'}
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              {activeTab === 'chemicals' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">N° FISPQ</label>
                      <input
                        type="text"
                        value={fispq}
                        onChange={e => setFispq(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">N° ONU</label>
                      <input
                        type="text"
                        value={unNumber}
                        onChange={e => setUnNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Classe de Risco</label>
                      <input
                        type="text"
                        value={hazardClass}
                        onChange={e => setHazardClass(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Número de Lote</label>
                      <input
                        type="text"
                        value={batchNumber}
                        onChange={e => setBatchNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Data de Fabricação</label>
                      <input
                        type="date"
                        value={chemMfgDate}
                        onChange={e => setChemMfgDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Data de Validade *</label>
                      <input
                        type="date"
                        value={chemExpDate}
                        onChange={e => setChemExpDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-bold"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">N° Certificado EIMES *</label>
                    <input
                      type="text"
                      value={certNumber}
                      onChange={e => setCertNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Data de Realização</label>
                      <input
                        type="date"
                        value={calibDate}
                        onChange={e => setCalibDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Data Próxima Calibração *</label>
                      <input
                        type="date"
                        value={calibDueDate}
                        onChange={e => setCalibDueDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Laboratório Metrológico</label>
                      <input
                        type="text"
                        value={lab}
                        onChange={e => setLab(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Tolerância / Incerteza</label>
                      <input
                        type="text"
                        value={tolerance}
                        onChange={e => setTolerance(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                      />
                    </div>
                  </div>
                </>
              )}
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
                onClick={handleSaveData}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold"
              >
                Salvar Dados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
