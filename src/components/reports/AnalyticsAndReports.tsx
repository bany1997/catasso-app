import React, { useState } from 'react';
import { erpStore } from '../../services/store';
import { formatAOA } from '../../services/i18n';
import { exportToExcel, printFormalDocument } from '../../services/exportService';
import {
  FileSpreadsheet,
  Printer,
  TrendingUp,
  BarChart3,
  Calendar,
  Filter,
  Users,
  Building,
  DollarSign,
  AlertOctagon,
  Clock,
  Layers,
} from 'lucide-react';

export const AnalyticsAndReports: React.FC = () => {
  const [reportType, setReportType] = useState<
    | 'entradas_saidas'
    | 'compras_solicitante'
    | 'custos_fornecedor'
    | 'custos_funcionario'
    | 'gastos_periodo'
    | 'rnc_auditoria'
    | 'pendencias_recebimento'
  >('entradas_saidas');

  const [datePeriod, setDatePeriod] = useState<'semanal' | 'mensal' | 'anual' | 'todos'>('todos');

  const currentUser = erpStore.currentUser;
  const activeWh = erpStore.getActiveWarehouse();
  const isCliente = currentUser?.role === 'cliente';

  // 1. Data calculation: Compras por solicitante
  const ordersByRequester: Record<string, { name: string; count: number; totalAOA: number }> = {};
  erpStore.purchaseOrders.forEach(po => {
    if (isCliente && po.requesterUserId !== currentUser?.id) return;
    const req = po.requesterName;
    if (!ordersByRequester[req]) {
      ordersByRequester[req] = { name: req, count: 0, totalAOA: 0 };
    }
    ordersByRequester[req].count += 1;
    ordersByRequester[req].totalAOA += po.totalEstimatedAOA;
  });

  // 2. Data calculation: Custos por fornecedor
  const costsBySupplier: Record<string, { supplier: string; count: number; totalAOA: number }> = {};
  erpStore.purchaseOrders.forEach(po => {
    const supp = po.supplierName;
    if (!costsBySupplier[supp]) {
      costsBySupplier[supp] = { supplier: supp, count: 0, totalAOA: 0 };
    }
    costsBySupplier[supp].count += 1;
    costsBySupplier[supp].totalAOA += po.totalEstimatedAOA;
  });

  // 3. Data calculation: Custos por funcionário (saídas de material requisitadas por clientes)
  const costsByEmployee: Record<string, { employee: string; movements: number; totalAOA: number }> = {};
  erpStore.movements
    .filter(m => m.type.startsWith('saida_'))
    .forEach(m => {
      const emp = m.requesterOrRecipient || 'Não Identificado';
      if (isCliente && !emp.toLowerCase().includes(currentUser?.name.toLowerCase() || '')) return;
      if (!costsByEmployee[emp]) {
        costsByEmployee[emp] = { employee: emp, movements: 0, totalAOA: 0 };
      }
      costsByEmployee[emp].movements += 1;
      costsByEmployee[emp].totalAOA += m.totalPriceAOA;
    });

  // 4. Data calculation: Pendências de Recebimento
  const pendingReceiving = erpStore.purchaseOrders.filter(
    po => po.status === 'aprovado' || po.status === 'em_transito' || po.status === 'recebido_parcial'
  );

  // Export dynamically to Excel
  const handleExportCurrentReportExcel = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let title = 'Relatorio';

    switch (reportType) {
      case 'entradas_saidas':
        title = 'Movimentacoes_Entradas_Saidas';
        headers = ['Código Movimento', 'Data', 'SKU', 'Produto', 'Tipo', 'Qtd', 'Preço Unitário (AOA)', 'Total (AOA)', 'Origem / Destino'];
        rows = erpStore.movements.map(m => [
          m.movementCode,
          new Date(m.createdAt).toLocaleDateString('pt-AO'),
          m.productSku,
          m.productName,
          m.type,
          m.quantity,
          m.unitPriceAOA,
          m.totalPriceAOA,
          m.originReference || m.requesterOrRecipient || '-',
        ]);
        break;

      case 'compras_solicitante':
        title = 'Compras_Por_Solicitante';
        headers = ['Nome do Solicitante', 'Total de Ordens Emitidas', 'Valor Acumulado Requisitado (AOA)'];
        rows = Object.values(ordersByRequester).map(r => [r.name, r.count, r.totalAOA]);
        break;

      case 'custos_fornecedor':
        title = 'Custos_Por_Fornecedor';
        headers = ['Razão Social Fornecedor', 'Pedidos Realizados', 'Montante Total Contratado (AOA)'];
        rows = Object.values(costsBySupplier).map(s => [s.supplier, s.count, s.totalAOA]);
        break;

      case 'custos_funcionario':
        title = 'Consumo_Material_Por_Funcionario';
        headers = ['Funcionário / Setor', 'Qtd. Requisições Atendidas', 'Custo Total de Materiais (AOA)'];
        rows = Object.values(costsByEmployee).map(e => [e.employee, e.movements, e.totalAOA]);
        break;

      case 'pendencias_recebimento':
        title = 'Pendencias_Recebimento_Cargas';
        headers = ['N° Pedido', 'Fornecedor', 'Status Atual', 'Valor Total (AOA)', 'Qtd. Itens Pendentes'];
        rows = pendingReceiving.map(p => [
          p.orderNumber,
          p.supplierName,
          p.status,
          p.totalEstimatedAOA,
          p.items.reduce((sum, i) => sum + (i.quantityRequested - (i.quantityReceived || 0)), 0),
        ]);
        break;

      case 'rnc_auditoria':
        title = 'Auditoria_Nao_Conformidades';
        headers = ['N° RNC', 'Data Abertura', 'Fornecedor', 'Gravidade', 'Status', 'Descrição'];
        rows = erpStore.rncs.map(r => [
          r.rncNumber,
          new Date(r.openedAt).toLocaleDateString('pt-AO'),
          r.supplierName || 'Interno',
          r.severity,
          r.status,
          r.description,
        ]);
        break;

      default:
        break;
    }

    exportToExcel(`${title}_${activeWh?.code || 'Geral'}`, headers, rows);
  };

  // Print Formal PDF Report
  const handlePrintCurrentReportPdf = () => {
    let title = 'Relatório Corporativo de Logística';
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (reportType === 'entradas_saidas') {
      title = 'Balanço Geral de Movimentações: Entradas vs Saídas';
      headers = ['Movimento', 'Data', 'SKU', 'Material', 'Tipo', 'Qtd', 'Total (AOA)'];
      rows = erpStore.movements.map(m => [
        m.movementCode,
        new Date(m.createdAt).toLocaleDateString('pt-AO'),
        m.productSku,
        m.productName,
        m.type.toUpperCase(),
        m.quantity,
        formatAOA(m.totalPriceAOA),
      ]);
    } else if (reportType === 'compras_solicitante') {
      title = 'Demonstrativo de Compras Requisitadas por Solicitante';
      headers = ['Requisitante', 'Total de Pedidos', 'Valor Estimado (AOA)'];
      rows = Object.values(ordersByRequester).map(r => [r.name, `${r.count} pedidos`, formatAOA(r.totalAOA)]);
    } else if (reportType === 'custos_fornecedor') {
      title = 'Relatório Financeiro de Custos e Faturamento por Fornecedor';
      headers = ['Fornecedor', 'Qtd. Pedidos', 'Valor Global Acumulado (AOA)'];
      rows = Object.values(costsBySupplier).map(s => [s.supplier, `${s.count} ordens`, formatAOA(s.totalAOA)]);
    } else if (reportType === 'custos_funcionario') {
      title = 'Consumo de Suprimentos por Funcionário e Departamento';
      headers = ['Funcionário / Setor', 'Qtd. Saídas', 'Valor Consumido (AOA)'];
      rows = Object.values(costsByEmployee).map(e => [e.employee, `${e.movements} requisições`, formatAOA(e.totalAOA)]);
    } else {
      title = 'Relatório de Pendências de Cargas e Entregas em Aberto';
      headers = ['N° Pedido', 'Fornecedor', 'Situação', 'Valor Estimado (AOA)'];
      rows = pendingReceiving.map(p => [p.orderNumber, p.supplierName, p.status.toUpperCase(), formatAOA(p.totalEstimatedAOA)]);
    }

    printFormalDocument({
      title,
      documentNumber: `AUDIT-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
      warehouseName: activeWh?.name || 'Armazém Central',
      warehouseProvince: activeWh?.province || 'Luanda',
      date: new Date().toLocaleDateString('pt-AO'),
      authorName: currentUser?.name || 'Auditor Logístico',
      role: currentUser?.role || 'Controladoria',
      metadata: [
        { label: 'Unidade Operacional', value: `${activeWh?.name} (${activeWh?.province})` },
        { label: 'Tipo de Auditoria', value: reportType.replace('_', ' ').toUpperCase() },
        { label: 'Moeda Contábil', value: 'Kwanza Angolano (AOA)' },
        { label: 'Período Selecionado', value: datePeriod.toUpperCase() },
      ],
      tables: [{ headers, rows }],
      notes: 'Relatório dinâmico para conciliação contábil, auditoria fiscal de Angola e planejamento de suprimentos.',
      signatures: ['Auditor Interno / Controlador', 'Diretoria Financeira', 'Responsável do Armazém'],
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            <span>Relatórios Dinâmicos, Auditoria & Indicadores de Custo</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Métricas de consumo por solicitante, fornecedor, balanço de entradas/saídas e valores periódicos (AOA).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCurrentReportExcel}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Excel</span>
          </button>
          <button
            type="button"
            onClick={handlePrintCurrentReportPdf}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span>Imprimir Laudo PDF</span>
          </button>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setReportType('entradas_saidas')}
          className={`py-1.5 px-3 rounded font-medium transition-colors ${
            reportType === 'entradas_saidas'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Entradas vs Saídas
        </button>

        <button
          type="button"
          onClick={() => setReportType('compras_solicitante')}
          className={`py-1.5 px-3 rounded font-medium transition-colors ${
            reportType === 'compras_solicitante'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Compras por Solicitante
        </button>

        <button
          type="button"
          onClick={() => setReportType('custos_fornecedor')}
          className={`py-1.5 px-3 rounded font-medium transition-colors ${
            reportType === 'custos_fornecedor'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Custos por Fornecedor
        </button>

        <button
          type="button"
          onClick={() => setReportType('custos_funcionario')}
          className={`py-1.5 px-3 rounded font-medium transition-colors ${
            reportType === 'custos_funcionario'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Custo por Funcionário
        </button>

        <button
          type="button"
          onClick={() => setReportType('pendencias_recebimento')}
          className={`py-1.5 px-3 rounded font-medium transition-colors ${
            reportType === 'pendencias_recebimento'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Pendências de Recebimento
        </button>

        <button
          type="button"
          onClick={() => setReportType('rnc_auditoria')}
          className={`py-1.5 px-3 rounded font-medium transition-colors ${
            reportType === 'rnc_auditoria'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Auditoria de RNCs
        </button>
      </div>

      {/* Render Dynamic View based on Report Type */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {reportType === 'compras_solicitante' && (
          <div>
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Consolidado de Compras por Requisitante / Cliente
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="py-2.5 px-4">Nome do Solicitante</th>
                    <th className="py-2.5 px-4 text-center">N° de Pedidos Abertos</th>
                    <th className="py-2.5 px-4 text-right">Valor Total Requisitado (AOA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Object.values(ordersByRequester).map(item => (
                    <tr key={item.name} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-slate-200">{item.name}</td>
                      <td className="py-3 px-4 text-center font-mono text-white">{item.count}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {formatAOA(item.totalAOA)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'custos_fornecedor' && (
          <div>
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Faturamento e Gastos por Fornecedor Homologado
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="py-2.5 px-4">Fornecedor</th>
                    <th className="py-2.5 px-4 text-center">Total de Pedidos</th>
                    <th className="py-2.5 px-4 text-right">Montante Global Contratado (AOA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Object.values(costsBySupplier).map(item => (
                    <tr key={item.supplier} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-slate-200">{item.supplier}</td>
                      <td className="py-3 px-4 text-center font-mono text-white">{item.count}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sky-400">
                        {formatAOA(item.totalAOA)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'custos_funcionario' && (
          <div>
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Materiais Retirados por Funcionário / Equipa de Campo
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="py-2.5 px-4">Funcionário / Equipa</th>
                    <th className="py-2.5 px-4 text-center">N° de Saídas de Estoque</th>
                    <th className="py-2.5 px-4 text-right">Custo Total de Material (AOA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Object.values(costsByEmployee).map(item => (
                    <tr key={item.employee} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-slate-200">{item.employee}</td>
                      <td className="py-3 px-4 text-center font-mono text-white">{item.movements}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                        {formatAOA(item.totalAOA)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'pendencias_recebimento' && (
          <div>
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Ordens com Pendência de Recebimento Físico
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="py-2.5 px-4">N° Pedido</th>
                    <th className="py-2.5 px-4">Fornecedor</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Valor Total (AOA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {pendingReceiving.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-sky-400">{p.orderNumber}</td>
                      <td className="py-3 px-4 text-slate-200">{p.supplierName}</td>
                      <td className="py-3 px-4 text-center font-mono uppercase text-amber-400">
                        {p.status.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                        {formatAOA(p.totalEstimatedAOA)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'entradas_saidas' && (
          <div>
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Auditoria de Entradas e Saídas Físicas
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="py-2.5 px-3">Código Movimento</th>
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3 text-right">Qtd</th>
                    <th className="py-2.5 px-3 text-right">Total (AOA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {erpStore.movements.map(m => {
                    const isEntrada = m.type.startsWith('entrada_');
                    return (
                      <tr key={m.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-mono font-bold text-sky-400">{m.movementCode}</td>
                        <td className="py-3 px-3 text-slate-400">
                          {new Date(m.createdAt).toLocaleDateString('pt-AO')}
                        </td>
                        <td className="py-3 px-3 font-mono text-white">{m.productSku}</td>
                        <td className="py-3 px-3 text-slate-200">{m.productName}</td>
                        <td className="py-3 px-3 uppercase font-mono text-[10px] text-slate-400">
                          {m.type.replace('_', ' ')}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-mono font-bold ${
                            isEntrada ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {isEntrada ? '+' : '-'}{m.quantity} UN
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">
                          {formatAOA(m.totalPriceAOA)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'rnc_auditoria' && (
          <div>
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Relatório de Não Conformidades e Falhas Auditadas
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="py-2.5 px-4">N° RNC</th>
                    <th className="py-2.5 px-4">Fornecedor</th>
                    <th className="py-2.5 px-4">Gravidade</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Descrição da Falha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {erpStore.rncs.map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-red-400">{r.rncNumber}</td>
                      <td className="py-3 px-4 text-slate-200">{r.supplierName || 'Interno'}</td>
                      <td className="py-3 px-4 uppercase font-mono text-amber-400">{r.severity}</td>
                      <td className="py-3 px-4 uppercase font-mono text-slate-300">{r.status}</td>
                      <td className="py-3 px-4 text-slate-400">{r.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
