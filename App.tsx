import React, { useState, useEffect, useCallback } from 'react';
import { Armazem, ProdutoMaster, Veiculo, Envio } from './types/database';
import { Header, TabType } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { InventarioMaster } from './components/InventarioMaster';
import { EnviosTresPassos } from './components/EnviosTresPassos';
import { Frotas } from './components/Frotas';
import { SupabaseModal } from './components/SupabaseModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [armazens, setArmazens] = useState<Armazem[]>([]);
  const [selectedArmazemId, setSelectedArmazemId] = useState<string>('todos');
  const [produtos, setProdutos] = useState<ProdutoMaster[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);

  // Carregar dados principais
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [arms, prods, veics, envs] = await Promise.all([
        logisticsService.getArmazens(),
        logisticsService.getProdutosMaster(),
        Promise.resolve(logisticsService.getVeiculos()),
        Promise.resolve(logisticsService.getEnvios()),
      ]);

      setArmazens(arms);
      setProdutos(prods);
      setVeiculos(veics);
      setEnvios(envs);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Inicialização e Subscrição em Tempo Real Supabase
  useEffect(() => {
    loadData();

    // Ativar subscrição em tempo real na tabela produtos_master
    const unsubscribe = logisticsService.subscribeRealtime(async () => {
      console.log('[Supabase Realtime] Dados alterados, a atualizar...');
      const prods = await logisticsService.getProdutosMaster();
      setProdutos(prods);
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  // Recarregar apenas produtos
  const handleRefreshProdutos = async () => {
    setIsLoading(true);
    try {
      const prods = await logisticsService.getProdutosMaster(
        selectedArmazemId !== 'todos' ? selectedArmazemId : undefined
      );
      setProdutos(prods);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshVeiculos = () => {
    setVeiculos(logisticsService.getVeiculos());
  };

  const handleShipmentCreated = async () => {
    const [prods, envs, veics] = await Promise.all([
      logisticsService.getProdutosMaster(),
      Promise.resolve(logisticsService.getEnvios()),
      Promise.resolve(logisticsService.getVeiculos()),
    ]);
    setProdutos(prods);
    setEnvios(envs);
    setVeiculos(veics);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header Corporativo com Seletor de Armazém e Navegação de Abas */}
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        armazens={armazens}
        selectedArmazemId={selectedArmazemId}
        onSelectArmazem={(id) => setSelectedArmazemId(id)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      {/* Área de Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentTab === 'dashboard' && (
          <Dashboard
            armazens={armazens}
            selectedArmazemId={selectedArmazemId}
            produtos={produtos}
            envios={envios}
            veiculos={veiculos}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'inventario' && (
          <InventarioMaster
            armazens={armazens}
            selectedArmazemId={selectedArmazemId}
            onSelectArmazem={(id) => setSelectedArmazemId(id)}
            produtos={produtos}
            onRefreshData={handleRefreshProdutos}
            isLoading={isLoading}
            onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          />
        )}

        {currentTab === 'envios' && (
          <EnviosTresPassos
            armazens={armazens}
            selectedArmazemId={selectedArmazemId}
            produtos={produtos}
            veiculos={veiculos}
            onShipmentCreated={handleShipmentCreated}
          />
        )}

        {currentTab === 'frotas' && (
          <Frotas
            veiculos={veiculos}
            onRefreshVeiculos={handleRefreshVeiculos}
          />
        )}
      </main>

      {/* Rodapé Corporativo Limpo */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">CATASSO Logística & Transportes S.A.</span>
            <span>·</span>
            <span>Sistema Integrado de Gestão de Armazéns</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Supabase API v2.4</span>
            <span>·</span>
            <span>Armazéns Ativos: {armazens.length}</span>
            <span>·</span>
            <span>Segurança RLS Ativa</span>
          </div>
        </div>
      </footer>

      {/* Modal de Configuração e SQL do Supabase */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConnectionSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
