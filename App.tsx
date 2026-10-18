import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured, supabaseUrl } from './supabaseClient';
import {
  Building2,
  LayoutDashboard,
  Boxes,
  SendHorizontal,
  Truck,
  Database,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  PackageCheck,
  ShieldCheck,
  Phone,
  Search,
  Plus,
  Download,
  Trash2,
  Edit3,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  X,
  Check,
  Layers,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Printer,
  Barcode,
  QrCode,
  Package,
  Fuel,
  BatteryCharging,
  Thermometer,
  Clock,
  Filter,
  Copy
} from 'lucide-react';

/* ==========================================================================
   1. DEFINIÇÕES DE TIPOS (TYPESCRIPT)
   ========================================================================== */

export type TabType = 'dashboard' | 'inventario' | 'envios' | 'frotas';

export interface Armazem {
  id: string;
  codigo: string;
  nome: string;
  localizacao: string;
  capacidade_maxima_m3: number;
  ocupacao_atual_m3: number;
  responsavel: string;
  contacto: string;
  ativo: boolean;
  created_at?: string;
}

export interface ProdutoMaster {
  id: string;
  armazem_id: string;
  sku: string;
  nome: string;
  categoria: string;
  quantidade: number;
  unidade: string;
  stock_minimo: number;
  localizacao_armazem: string;
  valor_unitario: number;
  peso_unitario_kg: number;
  status: 'disponivel' | 'baixo_stock' | 'esgotado';
  created_at?: string;
  updated_at?: string;
}

export interface ItemEnvio {
  produto_id: string;
  sku: string;
  nome: string;
  quantidade: number;
  peso_kg: number;
}

export interface Envio {
  id: string;
  codigo_rastreio: string;
  armazem_origem_id: string;
  armazem_origem_nome?: string;
  destino_cliente: string;
  destino_morada: string;
  destino_cidade: string;
  tipo_frete: 'Normal' | 'Expresso 24h' | 'Frigorífico / Controlado' | 'Carga Pesada';
  data_expedicao: string;
  data_prevista: string;
  transportadora_ou_veiculo: string;
  motorista_nome: string;
  veiculo_matricula: string;
  status: 'Pendente' | 'Em Trânsito' | 'Entregue' | 'Cancelado';
  itens: ItemEnvio[];
  peso_total_kg: number;
  volume_total_m3: number;
  created_at: string;
}

export interface Veiculo {
  id: string;
  matricula: string;
  modelo: string;
  tipo: 'Camião Articulado 24t' | 'Camião Rígido 12t' | 'Furgão Frigorífico' | 'Carrinha Distribuição Urbana';
  capacidade_kg: number;
  capacidade_m3: number;
  motorista_nome: string;
  status: 'disponivel' | 'em_rota' | 'carregando' | 'manutencao';
  localizacao_atual: string;
  combustivel_bateria_pct: number;
  proxima_revisao: string;
  temperatura_camara_c?: number;
}

/* ==========================================================================
   2. DADOS INICIAIS & SCRIPT SQL SUPABASE
   ========================================================================== */

const INITIAL_ARMAZENS: Armazem[] = [
  {
    id: 'arm-lis-01',
    codigo: 'ARM-LIS-01',
    nome: 'Armazém Central Lisboa (Alverca)',
    localizacao: 'Parque Logístico do Tejo, Lote 14, 2615 Alverca',
    capacidade_maxima_m3: 45000,
    ocupacao_atual_m3: 34200,
    responsavel: 'Eng. Manuel Catasso',
    contacto: '+351 219 550 100',
    ativo: true,
  },
  {
    id: 'arm-opo-02',
    codigo: 'ARM-OPO-02',
    nome: 'Hub Logístico Norte (Maia/Porto)',
    localizacao: 'Zona Industrial da Maia I, Setor C, 4470 Maia',
    capacidade_maxima_m3: 32000,
    ocupacao_atual_m3: 21800,
    responsavel: 'Dra. Sofia Mendonça',
    contacto: '+351 229 880 220',
    ativo: true,
  },
  {
    id: 'arm-fao-03',
    codigo: 'ARM-FAO-03',
    nome: 'Plataforma Distribuição Sul (Faro)',
    localizacao: 'Parque Empresarial do Algarve, Pavilhão 8, 8005 Faro',
    capacidade_maxima_m3: 18000,
    ocupacao_atual_m3: 11250,
    responsavel: 'Carlos Alverca',
    contacto: '+351 289 440 330',
    ativo: true,
  },
  {
    id: 'arm-mad-04',
    codigo: 'ARM-MAD-04',
    nome: 'Hub Ibérico Madrid (Coslada)',
    localizacao: 'Centro de Carga Aérea & Terrestre, 28821 Coslada, Madrid',
    capacidade_maxima_m3: 60000,
    ocupacao_atual_m3: 49800,
    responsavel: 'Javier Gomez Ortiz',
    contacto: '+34 917 220 440',
    ativo: true,
  },
];

const INITIAL_PRODUTOS_MASTER: ProdutoMaster[] = [
  {
    id: 'prod-001',
    armazem_id: 'arm-lis-01',
    sku: 'CAT-PAL-1001',
    nome: 'Paletes Européias EPAL Certificadas 1200x800',
    categoria: 'Embalagens & Carga',
    quantidade: 1450,
    unidade: 'un',
    stock_minimo: 500,
    localizacao_armazem: 'Corredor A - Baía 01-04',
    valor_unitario: 14.80,
    peso_unitario_kg: 25.0,
    status: 'disponivel',
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-10-15T14:20:00Z',
  },
  {
    id: 'prod-002',
    armazem_id: 'arm-lis-01',
    sku: 'CAT-IND-4089',
    nome: 'Óleo Hidráulico Sintético ISO VG 46 (Tambor 208L)',
    categoria: 'Química Industrial',
    quantidade: 42,
    unidade: 'tambor',
    stock_minimo: 50,
    localizacao_armazem: 'Câmara Química Q2 - Prateleira 03',
    valor_unitario: 485.00,
    peso_unitario_kg: 195.0,
    status: 'baixo_stock',
    created_at: '2026-02-12T09:30:00Z',
    updated_at: '2026-10-18T06:15:00Z',
  },
  {
    id: 'prod-003',
    armazem_id: 'arm-lis-01',
    sku: 'CAT-FRO-9201',
    nome: 'Módulos de Refrigeração Industrial Bitzer 15HP',
    categoria: 'Frio Industrial',
    quantidade: 18,
    unidade: 'un',
    stock_minimo: 8,
    localizacao_armazem: 'Corredor D - Rack Cargas Pesadas',
    valor_unitario: 3420.00,
    peso_unitario_kg: 340.0,
    status: 'disponivel',
    created_at: '2026-03-01T11:00:00Z',
    updated_at: '2026-10-12T16:40:00Z',
  },
  {
    id: 'prod-004',
    armazem_id: 'arm-lis-01',
    sku: 'CAT-ELE-5520',
    nome: 'Inversores de Potência Trifásicos 50kW Schneider',
    categoria: 'Eletrónicos & Automação',
    quantidade: 0,
    unidade: 'un',
    stock_minimo: 15,
    localizacao_armazem: 'Armazém Seguro B - Gaiola 02',
    valor_unitario: 2150.00,
    peso_unitario_kg: 48.0,
    status: 'esgotado',
    created_at: '2026-03-20T10:15:00Z',
    updated_at: '2026-10-17T11:00:00Z',
  },
  {
    id: 'prod-005',
    armazem_id: 'arm-lis-01',
    sku: 'CAT-SEC-3310',
    nome: 'Cintas de Amarração com Catraca 50mm 5T (10m)',
    categoria: 'Segurança & Amarração',
    quantidade: 620,
    unidade: 'cx',
    stock_minimo: 200,
    localizacao_armazem: 'Corredor B - Prateleira 12',
    valor_unitario: 24.50,
    peso_unitario_kg: 3.2,
    status: 'disponivel',
    created_at: '2026-04-05T14:00:00Z',
    updated_at: '2026-10-16T09:10:00Z',
  },
  {
    id: 'prod-006',
    armazem_id: 'arm-opo-02',
    sku: 'CAT-TEX-8802',
    nome: 'Rolos de Tecido Técnico Impermeável Cordura 1000D',
    categoria: 'Matéria-Prima Têxtil',
    quantidade: 85,
    unidade: 'rolo',
    stock_minimo: 100,
    localizacao_armazem: 'Pavilhão Têxtil - Rack 05',
    valor_unitario: 310.00,
    peso_unitario_kg: 62.0,
    status: 'baixo_stock',
    created_at: '2026-01-22T08:30:00Z',
    updated_at: '2026-10-17T15:20:00Z',
  },
  {
    id: 'prod-007',
    armazem_id: 'arm-opo-02',
    sku: 'CAT-MET-1144',
    nome: 'Chapas de Alumínio Estrutural 6082-T6 (3000x1500x3mm)',
    categoria: 'Metais & Ligas',
    quantidade: 340,
    unidade: 'chapa',
    stock_minimo: 80,
    localizacao_armazem: 'Setor Metalúrgico - Baía M1',
    valor_unitario: 142.00,
    peso_unitario_kg: 36.5,
    status: 'disponivel',
    created_at: '2026-02-18T10:00:00Z',
    updated_at: '2026-10-14T11:45:00Z',
  },
  {
    id: 'prod-008',
    armazem_id: 'arm-opo-02',
    sku: 'CAT-ROL-7711',
    nome: 'Rolamentos Industriais de Rolos Cónicos SKF Explorer',
    categoria: 'Peças & Componentes',
    quantidade: 1250,
    unidade: 'un',
    stock_minimo: 300,
    localizacao_armazem: 'Corredor Central - Gaveteiro G8',
    valor_unitario: 68.00,
    peso_unitario_kg: 1.8,
    status: 'disponivel',
    created_at: '2026-03-14T09:20:00Z',
    updated_at: '2026-10-18T05:00:00Z',
  },
  {
    id: 'prod-009',
    armazem_id: 'arm-fao-03',
    sku: 'CAT-AGR-2201',
    nome: 'Caixas Isotérmicas EPS para Frutos Vermelhos & Marisco',
    categoria: 'Embalagens & Carga',
    quantidade: 4800,
    unidade: 'un',
    stock_minimo: 1500,
    localizacao_armazem: 'Pavilhão Sul - Estante E2',
    valor_unitario: 4.20,
    peso_unitario_kg: 0.45,
    status: 'disponivel',
    created_at: '2026-04-01T08:00:00Z',
    updated_at: '2026-10-18T07:00:00Z',
  },
  {
    id: 'prod-010',
    armazem_id: 'arm-mad-04',
    sku: 'CAT-AUT-9940',
    nome: 'Baterias de Lítio LiFePO4 para Empilhadores 48V 600Ah',
    categoria: 'Eletrónicos & Automação',
    quantidade: 14,
    unidade: 'un',
    stock_minimo: 20,
    localizacao_armazem: 'Zona ADR - Prateleira B1',
    valor_unitario: 6400.00,
    peso_unitario_kg: 420.0,
    status: 'baixo_stock',
    created_at: '2026-02-05T13:00:00Z',
    updated_at: '2026-10-18T04:15:00Z',
  },
];

const INITIAL_VEICULOS: Veiculo[] = [
  {
    id: 'v-01',
    matricula: '64-ZH-88',
    modelo: 'Scania R500 V8 Highline',
    tipo: 'Camião Articulado 24t',
    capacidade_kg: 24000,
    capacidade_m3: 90,
    motorista_nome: 'Joaquim Esteves',
    status: 'em_rota',
    localizacao_atual: 'A1 KM 142 (Leiria sentido Norte)',
    combustivel_bateria_pct: 78,
    proxima_revisao: '2026-12-15',
  },
  {
    id: 'v-02',
    matricula: '92-XQ-14',
    modelo: 'Volvo FH Electric 460',
    tipo: 'Camião Articulado 24t',
    capacidade_kg: 22000,
    capacidade_m3: 86,
    motorista_nome: 'Rui Barroso',
    status: 'disponivel',
    localizacao_atual: 'Armazém Central Lisboa (Doca 4)',
    combustivel_bateria_pct: 94,
    proxima_revisao: '2026-11-30',
  },
  {
    id: 'v-03',
    matricula: '31-TV-99',
    modelo: 'Mercedes-Benz Actros 1845 Frio',
    tipo: 'Furgão Frigorífico',
    capacidade_kg: 16000,
    capacidade_m3: 65,
    motorista_nome: 'António Valente',
    status: 'em_rota',
    localizacao_atual: 'A22 KM 54 (Albufeira)',
    combustivel_bateria_pct: 62,
    proxima_revisao: '2026-11-10',
    temperatura_camara_c: -18.4,
  },
  {
    id: 'v-04',
    matricula: '55-LM-23',
    modelo: 'Iveco Daily 35S18 City Logistics',
    tipo: 'Carrinha Distribuição Urbana',
    capacidade_kg: 3500,
    capacidade_m3: 18,
    motorista_nome: 'Tiago Santos',
    status: 'carregando',
    localizacao_atual: 'Hub Logístico Norte Maia (Doca 12)',
    combustivel_bateria_pct: 88,
    proxima_revisao: '2027-01-20',
  },
  {
    id: 'v-05',
    matricula: '18-BD-70',
    modelo: 'MAN TGX 18.510 EfficientLine',
    tipo: 'Camião Rígido 12t',
    capacidade_kg: 12000,
    capacidade_m3: 45,
    motorista_nome: 'Pedro Alentejano',
    status: 'manutencao',
    localizacao_atual: 'Oficina Central Alverca (Revisão Freios)',
    combustivel_bateria_pct: 35,
    proxima_revisao: 'Em Curso',
  },
];

const INITIAL_ENVIOS: Envio[] = [
  {
    id: 'env-901',
    codigo_rastreio: 'CAT-PT-2026-8910',
    armazem_origem_id: 'arm-lis-01',
    armazem_origem_nome: 'Armazém Central Lisboa (Alverca)',
    destino_cliente: 'Sonae MC Logística & Retalho',
    destino_morada: 'Estrada Nacional 10, KM 118',
    destino_cidade: 'Azambuja',
    tipo_frete: 'Expresso 24h',
    data_expedicao: '2026-10-18',
    data_prevista: '2026-10-19',
    transportadora_ou_veiculo: 'CATASSO Frota Própria (64-ZH-88)',
    motorista_nome: 'Joaquim Esteves',
    veiculo_matricula: '64-ZH-88',
    status: 'Em Trânsito',
    peso_total_kg: 12500,
    volume_total_m3: 48,
    itens: [
      {
        produto_id: 'prod-001',
        sku: 'CAT-PAL-1001',
        nome: 'Paletes Européias EPAL Certificadas 1200x800',
        quantidade: 400,
        peso_kg: 10000,
      },
      {
        produto_id: 'prod-005',
        sku: 'CAT-SEC-3310',
        nome: 'Cintas de Amarração com Catraca 50mm 5T',
        quantidade: 100,
        peso_kg: 320,
      },
    ],
    created_at: '2026-10-18T06:30:00Z',
  },
];

const SUPABASE_SETUP_SQL = `-- SCRIPT SQL CATASSO LOGÍSTICA PARA SUPABASE
-- Execute no SQL Editor do Supabase:

CREATE TABLE IF NOT EXISTS public.armazens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  localizacao TEXT NOT NULL,
  capacidade_maxima_m3 NUMERIC(10, 2) NOT NULL DEFAULT 10000,
  ocupacao_atual_m3 NUMERIC(10, 2) NOT NULL DEFAULT 0,
  responsavel TEXT NOT NULL,
  contacto TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.produtos_master (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  armazem_id TEXT NOT NULL REFERENCES public.armazens(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'un',
  stock_minimo INTEGER NOT NULL DEFAULT 10,
  localizacao_armazem TEXT NOT NULL,
  valor_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  peso_unitario_kg NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'disponivel',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.armazens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total armazens" ON public.armazens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total produtos_master" ON public.produtos_master FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.armazens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos_master;
`;

/* ==========================================================================
   3. SERVIÇOS & INTEGRAÇÃO SUPABASE EMBUTIDOS
   ========================================================================== */

const STORAGE_KEYS = {
  PRODUTOS: 'catasso_produtos_master_v1',
  ARMAZENS: 'catasso_armazens_v1',
  ENVIOS: 'catasso_envios_v1',
  VEICULOS: 'catasso_veiculos_v1',
};

function getStorage<T>(key: string, defaultVal: T): T {
  try {
    const val = localStorage.getItem(key);
    if (!val) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(val);
  } catch {
    return defaultVal;
  }
}

function setStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error('Erro ao salvar localmente:', err);
  }
}

/* ==========================================================================
   4. COMPONENTES EMBUTIDOS (UI, DASHBOARD, MASTER, ENVIOS, FROTAS, MODAL)
   ========================================================================== */

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [armazens, setArmazens] = useState<Armazem[]>([]);
  const [selectedArmazemId, setSelectedArmazemId] = useState<string>('todos');
  const [produtos, setProdutos] = useState<ProdutoMaster[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);

  // Estados de Filtros e Pesquisa do Inventário Master
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('todas');
  const [selectedStatus, setSelectedStatus] = useState('todos');

  // Modais do Inventário Master
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<ProdutoMaster | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form de Novo Produto
  const [formData, setFormData] = useState({
    armazem_id: 'arm-lis-01',
    sku: '',
    nome: '',
    categoria: 'Embalagens & Carga',
    quantidade: 100,
    unidade: 'un',
    stock_minimo: 20,
    localizacao_armazem: 'Corredor A - Baía 01',
    valor_unitario: 15.0,
    peso_unitario_kg: 5.0,
  });

  // Estados de Envios em 3 Passos
  const [shipmentStep, setShipmentStep] = useState<1 | 2 | 3>(1);
  const [shipmentOrigemId, setShipmentOrigemId] = useState<string>('arm-lis-01');
  const [shipmentCliente, setShipmentCliente] = useState('Jerónimo Martins Distribuição');
  const [shipmentMorada, setShipmentMorada] = useState('Parque Logístico da Azambuja, Plataforma 4');
  const [shipmentCidade, setShipmentCidade] = useState('Azambuja / Lisboa');
  const [shipmentTipoFrete, setShipmentTipoFrete] = useState<Envio['tipo_frete']>('Expresso 24h');
  const [shipmentDataExp, setShipmentDataExp] = useState(new Date().toISOString().slice(0, 10));
  const [shipmentDataPrev, setShipmentDataPrev] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [shipmentItens, setShipmentItens] = useState<
    { produto_id: string; sku: string; nome: string; quantidade: number; peso_kg: number; unidade: string; stockMax: number }[]
  >([]);
  const [selectedItemToAddId, setSelectedItemToAddId] = useState('');
  const [selectedItemToAddQtd, setSelectedItemToAddQtd] = useState(1);
  const [shipmentVeiculoId, setShipmentVeiculoId] = useState('');
  const [generatedEnvio, setGeneratedEnvio] = useState<Envio | null>(null);

  // Estados da Frota
  const [fleetSearch, setFleetSearch] = useState('');
  const [fleetStatusFilter, setFleetStatusFilter] = useState('todos');

  // Modal Supabase
  const [sqlCopied, setSqlCopied] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingConn, setIsTestingConn] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* --------------------------------------------------------------------------
     Carregamento Inicial & Sincronização em Tempo Real com Supabase
     -------------------------------------------------------------------------- */
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Armazéns (Supabase -> Localhost Fallback)
      let loadedArmazens: Armazem[] = [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.from('armazens').select('*').order('nome');
          if (!error && data && data.length > 0) {
            loadedArmazens = data as Armazem[];
          }
        } catch (e) {
          console.warn('[Supabase armazens fetch]', e);
        }
      }
      if (loadedArmazens.length === 0) {
        loadedArmazens = getStorage<Armazem[]>(STORAGE_KEYS.ARMAZENS, INITIAL_ARMAZENS);
      }
      setArmazens(loadedArmazens);

      // 2. Produtos Master (Supabase -> Localhost Fallback)
      let loadedProdutos: ProdutoMaster[] = [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.from('produtos_master').select('*').order('nome');
          if (!error && data && data.length > 0) {
            loadedProdutos = data as ProdutoMaster[];
          }
        } catch (e) {
          console.warn('[Supabase produtos_master fetch]', e);
        }
      }
      if (loadedProdutos.length === 0) {
        loadedProdutos = getStorage<ProdutoMaster[]>(STORAGE_KEYS.PRODUTOS, INITIAL_PRODUTOS_MASTER);
      }
      setProdutos(loadedProdutos);

      // 3. Frotas & Envios
      const loadedVeiculos = getStorage<Veiculo[]>(STORAGE_KEYS.VEICULOS, INITIAL_VEICULOS);
      const loadedEnvios = getStorage<Envio[]>(STORAGE_KEYS.ENVIOS, INITIAL_ENVIOS);
      setVeiculos(loadedVeiculos);
      setEnvios(loadedEnvios);
      if (loadedVeiculos.length > 0) {
        setShipmentVeiculoId(loadedVeiculos[0].id);
      }
    } catch (err) {
      console.error('Erro ao inicializar CATASSO:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();

    // Inscrição Realtime no Supabase para a tabela produtos_master
    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('public:produtos_master_live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'produtos_master' },
          async (payload) => {
            console.log('[Supabase Realtime Triggered]', payload);
            const { data } = await supabase.from('produtos_master').select('*').order('nome');
            if (data) {
              setProdutos(data as ProdutoMaster[]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loadAllData]);

  // Armazém Ativo
  const activeArmazem = useMemo(() => {
    return armazens.find((a) => a.id === selectedArmazemId);
  }, [armazens, selectedArmazemId]);

  // Produtos filtrados pelo Armazém Selecionado no Topo
  const produtosDoArmazem = useMemo(() => {
    if (selectedArmazemId === 'todos') return produtos;
    return produtos.filter((p) => p.armazem_id === selectedArmazemId);
  }, [produtos, selectedArmazemId]);

  /* --------------------------------------------------------------------------
     Ações do Inventário Master (CRUD direto no Supabase)
     -------------------------------------------------------------------------- */
  const handleQuickAdjust = async (prod: ProdutoMaster, delta: number) => {
    const novaQtd = Math.max(0, prod.quantidade + delta);
    const novoStatus: ProdutoMaster['status'] =
      novaQtd === 0 ? 'esgotado' : novaQtd <= prod.stock_minimo ? 'baixo_stock' : 'disponivel';
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('produtos_master')
          .update({ quantidade: novaQtd, status: novoStatus, updated_at: now })
          .eq('id', prod.id);
      } catch (e) {
        console.warn('[Supabase QuickAdjust]', e);
      }
    }

    // Atualização do Estado
    const updated = produtos.map((p) =>
      p.id === prod.id ? { ...p, quantidade: novaQtd, status: novoStatus, updated_at: now } : p
    );
    setProdutos(updated);
    setStorage(STORAGE_KEYS.PRODUTOS, updated);
    showToast(`Stock de ${prod.sku} alterado para ${novaQtd} ${prod.unidade}.`);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku || !formData.nome) return;

    setIsSubmitting(true);
    const status: ProdutoMaster['status'] =
      formData.quantidade === 0
        ? 'esgotado'
        : formData.quantidade <= formData.stock_minimo
        ? 'baixo_stock'
        : 'disponivel';

    const newProd: ProdutoMaster = {
      ...formData,
      id: `prod-${Date.now()}`,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('produtos_master').insert([newProd]);
      } catch (err) {
        console.warn('[Supabase Insert Error]', err);
      }
    }

    const updated = [newProd, ...produtos];
    setProdutos(updated);
    setStorage(STORAGE_KEYS.PRODUTOS, updated);
    setIsCreateModalOpen(false);
    setIsSubmitting(false);
    showToast(`Produto ${newProd.sku} criado com sucesso no Inventário Master.`);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduto) return;

    setIsSubmitting(true);
    const status: ProdutoMaster['status'] =
      editingProduto.quantidade === 0
        ? 'esgotado'
        : editingProduto.quantidade <= editingProduto.stock_minimo
        ? 'baixo_stock'
        : 'disponivel';

    const updatedProd = {
      ...editingProduto,
      status,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('produtos_master')
          .update(updatedProd)
          .eq('id', editingProduto.id);
      } catch (err) {
        console.warn('[Supabase Update Error]', err);
      }
    }

    const updated = produtos.map((p) => (p.id === editingProduto.id ? updatedProd : p));
    setProdutos(updated);
    setStorage(STORAGE_KEYS.PRODUTOS, updated);
    setEditingProduto(null);
    setIsSubmitting(false);
    showToast(`Produto ${updatedProd.sku} atualizado com sucesso.`);
  };

  const handleDeleteProduct = async (id: string) => {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('produtos_master').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase Delete Error]', err);
      }
    }

    const updated = produtos.filter((p) => p.id !== id);
    setProdutos(updated);
    setStorage(STORAGE_KEYS.PRODUTOS, updated);
    setDeletingId(null);
    showToast('Produto removido do Inventário Master.');
  };

  const handleExportCSV = () => {
    const headers = ['SKU', 'Nome', 'Armazém ID', 'Categoria', 'Quantidade', 'Unidade', 'Stock Mínimo', 'Localização', 'Valor (€)', 'Peso (kg)', 'Status'];
    const rows = filteredMasterProdutos.map((p) => [
      p.sku,
      `"${p.nome.replace(/"/g, '""')}"`,
      p.armazem_id,
      `"${p.categoria}"`,
      p.quantidade,
      p.unidade,
      p.stock_minimo,
      `"${p.localizacao_armazem}"`,
      p.valor_unitario,
      p.peso_unitario_kg,
      p.status,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CATASSO_Inventario_Master_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Categorias únicas do inventário
  const uniqueCategorias = useMemo(() => {
    const set = new Set<string>();
    produtos.forEach((p) => set.add(p.categoria));
    return Array.from(set).sort();
  }, [produtos]);

  // Lista filtrada do Inventário Master
  const filteredMasterProdutos = useMemo(() => {
    return produtos.filter((p) => {
      if (selectedArmazemId !== 'todos' && p.armazem_id !== selectedArmazemId) return false;
      if (selectedCategoria !== 'todas' && p.categoria !== selectedCategoria) return false;
      if (selectedStatus !== 'todos' && p.status !== selectedStatus) return false;
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const mSku = p.sku.toLowerCase().includes(term);
        const mNome = p.nome.toLowerCase().includes(term);
        const mLoc = p.localizacao_armazem.toLowerCase().includes(term);
        if (!mSku && !mNome && !mLoc) return false;
      }
      return true;
    });
  }, [produtos, selectedArmazemId, selectedCategoria, selectedStatus, searchTerm]);

  /* --------------------------------------------------------------------------
     Ações de Envios em 3 Passos
     -------------------------------------------------------------------------- */
  const produtosDoArmazemOrigemEnvio = useMemo(() => {
    return produtos.filter((p) => p.armazem_id === shipmentOrigemId && p.quantidade > 0);
  }, [produtos, shipmentOrigemId]);

  const totalPesoKgEnvio = useMemo(() => {
    return shipmentItens.reduce((acc, i) => acc + i.quantidade * i.peso_kg, 0);
  }, [shipmentItens]);

  const totalVolumeM3Envio = useMemo(() => {
    return Math.max(1, Math.round((totalPesoKgEnvio / 250) * 10) / 10);
  }, [totalPesoKgEnvio]);

  const handleAddShipmentItem = () => {
    const prod = produtosDoArmazemOrigemEnvio.find((p) => p.id === selectedItemToAddId);
    if (!prod || selectedItemToAddQtd <= 0) return;

    if (selectedItemToAddQtd > prod.quantidade) {
      alert(`Quantidade selecionada (${selectedItemToAddQtd}) excede o stock disponível (${prod.quantidade}).`);
      return;
    }

    const exIndex = shipmentItens.findIndex((i) => i.produto_id === prod.id);
    if (exIndex !== -1) {
      const copy = [...shipmentItens];
      const newTotal = copy[exIndex].quantidade + selectedItemToAddQtd;
      if (newTotal > prod.quantidade) {
        alert(`Total selecionado (${newTotal}) excede o stock disponível.`);
        return;
      }
      copy[exIndex].quantidade = newTotal;
      setShipmentItens(copy);
    } else {
      setShipmentItens([
        ...shipmentItens,
        {
          produto_id: prod.id,
          sku: prod.sku,
          nome: prod.nome,
          quantidade: selectedItemToAddQtd,
          peso_kg: prod.peso_unitario_kg,
          unidade: prod.unidade,
          stockMax: prod.quantidade,
        },
      ]);
    }

    setSelectedItemToAddId('');
    setSelectedItemToAddQtd(1);
  };

  const handleFinalizarEnvio = async () => {
    if (shipmentItens.length === 0) return;
    const armOrigem = armazens.find((a) => a.id === shipmentOrigemId);
    const veiculo = veiculos.find((v) => v.id === shipmentVeiculoId);
    const code = `CAT-PT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newEnvio: Envio = {
      id: `env-${Date.now()}`,
      codigo_rastreio: code,
      armazem_origem_id: shipmentOrigemId,
      armazem_origem_nome: armOrigem?.nome || 'Armazém Central',
      destino_cliente: shipmentCliente,
      destino_morada: shipmentMorada,
      destino_cidade: shipmentCidade,
      tipo_frete: shipmentTipoFrete,
      data_expedicao: shipmentDataExp,
      data_prevista: shipmentDataPrev,
      transportadora_ou_veiculo: veiculo ? `CATASSO Frota Própria (${veiculo.matricula})` : 'CATASSO Express',
      motorista_nome: veiculo ? veiculo.motorista_nome : 'Motorista Designado',
      veiculo_matricula: veiculo ? veiculo.matricula : 'PT-64-ZH-88',
      status: 'Em Trânsito',
      itens: shipmentItens.map((i) => ({
        produto_id: i.produto_id,
        sku: i.sku,
        nome: i.nome,
        quantidade: i.quantidade,
        peso_kg: i.peso_kg * i.quantidade,
      })),
      peso_total_kg: totalPesoKgEnvio,
      volume_total_m3: totalVolumeM3Envio,
      created_at: new Date().toISOString(),
    };

    // Débito no Inventário Master e no Supabase
    let prodsCopy = [...produtos];
    for (const item of shipmentItens) {
      const idx = prodsCopy.findIndex((p) => p.id === item.produto_id);
      if (idx !== -1) {
        const novaQtd = Math.max(0, prodsCopy[idx].quantidade - item.quantidade);
        const novoStatus = novaQtd === 0 ? 'esgotado' : novaQtd <= prodsCopy[idx].stock_minimo ? 'baixo_stock' : 'disponivel';
        prodsCopy[idx] = { ...prodsCopy[idx], quantidade: novaQtd, status: novoStatus };

        if (isSupabaseConfigured) {
          try {
            await supabase
              .from('produtos_master')
              .update({ quantidade: novaQtd, status: novoStatus, updated_at: new Date().toISOString() })
              .eq('id', item.produto_id);
          } catch (e) {
            console.warn('[Supabase dispatch update]', e);
          }
        }
      }
    }

    setProdutos(prodsCopy);
    setStorage(STORAGE_KEYS.PRODUTOS, prodsCopy);

    // Atualização de Frotas
    if (veiculo) {
      const updatedVeiculos = veiculos.map((v) => (v.id === veiculo.id ? { ...v, status: 'em_rota' as const } : v));
      setVeiculos(updatedVeiculos);
      setStorage(STORAGE_KEYS.VEICULOS, updatedVeiculos);
    }

    const updatedEnvios = [newEnvio, ...envios];
    setEnvios(updatedEnvios);
    setStorage(STORAGE_KEYS.ENVIOS, updatedEnvios);

    setGeneratedEnvio(newEnvio);
    showToast(`Guia ${code} emitida com sucesso!`);
  };

  /* --------------------------------------------------------------------------
     Ações de Frotas
     -------------------------------------------------------------------------- */
  const handleFleetStatusChange = (id: string, status: Veiculo['status']) => {
    const updated = veiculos.map((v) => (v.id === id ? { ...v, status } : v));
    setVeiculos(updated);
    setStorage(STORAGE_KEYS.VEICULOS, updated);
    showToast('Status do veículo atualizado.');
  };

  const filteredFleet = useMemo(() => {
    return veiculos.filter((v) => {
      if (fleetStatusFilter !== 'todos' && v.status !== fleetStatusFilter) return false;
      if (fleetSearch.trim() !== '') {
        const t = fleetSearch.toLowerCase();
        return (
          v.matricula.toLowerCase().includes(t) ||
          v.modelo.toLowerCase().includes(t) ||
          v.motorista_nome.toLowerCase().includes(t) ||
          v.localizacao_atual.toLowerCase().includes(t)
        );
      }
      return true;
    });
  }, [veiculos, fleetStatusFilter, fleetSearch]);

  /* --------------------------------------------------------------------------
     Teste de Conexão Supabase
     -------------------------------------------------------------------------- */
  const handleTestSupabase = async () => {
    setIsTestingConn(true);
    setTestResult(null);
    try {
      if (!isSupabaseConfigured) {
        setTestResult({
          success: false,
          message: 'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não detetadas no .env. A operar em modo local reativo.',
        });
      } else {
        const { data, error } = await supabase.from('armazens').select('*');
        if (error) {
          setTestResult({
            success: false,
            message: `Erro na tabela 'armazens': ${error.message}. Execute o script SQL no Supabase.`,
          });
        } else {
          setTestResult({
            success: true,
            message: `Conectado ao Supabase com sucesso! ${data?.length ?? 0} armazéns encontrados na base de dados.`,
          });
          loadAllData();
        }
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Falha de conexão com o Supabase.',
      });
    } finally {
      setIsTestingConn(false);
    }
  };

  /* ==========================================================================
     MÉTRICAS DO DASHBOARD
     ========================================================================== */
  const totalSKUs = produtosDoArmazem.length;
  const produtosAlerta = produtosDoArmazem.filter((p) => p.quantidade <= p.stock_minimo);
  const totalItensArmazenados = produtosDoArmazem.reduce((acc, p) => acc + p.quantidade, 0);
  const valorTotalInventario = produtosDoArmazem.reduce((acc, p) => acc + p.quantidade * p.valor_unitario, 0);

  const capacidadeTotalM3 = activeArmazem
    ? activeArmazem.capacidade_maxima_m3
    : armazens.reduce((acc, a) => acc + a.capacidade_maxima_m3, 0);

  const ocupacaoTotalM3 = activeArmazem
    ? activeArmazem.ocupacao_atual_m3
    : armazens.reduce((acc, a) => acc + a.ocupacao_atual_m3, 0);

  const percentagemOcupacao = Math.min(100, Math.round((ocupacaoTotalM3 / (capacidadeTotalM3 || 1)) * 100));
  const veiculosOperacionais = veiculos.filter((v) => v.status === 'disponivel' || v.status === 'em_rota').length;
  const enviosEmTransito = envios.filter((e) => e.status === 'Em Trânsito').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 border ${
            toast.type === 'error'
              ? 'bg-rose-950 border-rose-800 text-rose-200'
              : 'bg-blue-950 border-blue-800 text-blue-200'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <Check className="w-4 h-4 text-blue-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ======================================================================
          HEADER COM SELETOR DE ARMAZÉM NO TOPO & NAVEGAÇÃO DE ABAS
          ====================================================================== */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800 text-slate-100 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Lado Esquerdo: Wordmark + Seletor de Armazém */}
            <div className="flex items-center gap-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/30">
                  <span className="text-base tracking-wider">C</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold tracking-tight text-white leading-none">
                    CATASSO
                  </span>
                  <span className="text-[11px] font-semibold text-blue-400 tracking-wider uppercase mt-0.5">
                    Logística Global
                  </span>
                </div>
              </div>

              <div className="h-6 w-px bg-slate-800 hidden md:block" />

              {/* SELETOR DE ARMAZÉM NO TOPO */}
              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-1.5 focus-within:border-blue-500 transition-colors">
                <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="flex flex-col">
                  <label htmlFor="top-armazem-select" className="text-[10px] uppercase font-semibold text-slate-400 leading-tight">
                    Armazém Ativo
                  </label>
                  <select
                    id="top-armazem-select"
                    value={selectedArmazemId}
                    onChange={(e) => setSelectedArmazemId(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-4"
                  >
                    <option value="todos" className="bg-slate-900 text-slate-200">
                      🌍 Todos os Armazéns (Consolidado)
                    </option>
                    {armazens.map((arm) => (
                      <option key={arm.id} value={arm.id} className="bg-slate-900 text-slate-200">
                        🏢 {arm.nome}
                      </option>
                    ))}
                  </select>
                </div>
                {activeArmazem && (
                  <span className="hidden xl:inline-block text-[11px] tabular-nums text-slate-400 border-l border-slate-800 pl-2">
                    {Math.round((activeArmazem.ocupacao_atual_m3 / activeArmazem.capacidade_maxima_m3) * 100)}% ocupado
                  </span>
                )}
              </div>
            </div>

            {/* Lado Direito: Supabase Status & Modal Trigger */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSupabaseModalOpen(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isSupabaseConfigured
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/40'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-blue-500 hover:text-white'
                }`}
                title="Configuração Supabase & Script SQL"
              >
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">
                  {isSupabaseConfigured ? 'Supabase Conectado' : 'Configurar Supabase'}
                </span>
                {isSupabaseConfigured ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                )}
              </button>
            </div>
          </div>

          {/* Abas de Navegação */}
          <nav className="flex space-x-1 border-t border-slate-800/80 -mb-px overflow-x-auto py-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'inventario', label: 'Inventário Master', icon: <Boxes className="w-4 h-4" /> },
              { id: 'envios', label: 'Envios em 3 Passos', icon: <SendHorizontal className="w-4 h-4" /> },
              { id: 'frotas', label: 'Frotas', icon: <Truck className="w-4 h-4" /> },
            ].map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold whitespace-nowrap rounded-md transition-all ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border-b-2 border-blue-500 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ======================================================================
          CORPO PRINCIPAL
          ====================================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        
        {/* ====================================================================
            ABA 1: DASHBOARD
            ==================================================================== */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Banner de Contexto Operacional */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 border border-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                    <span>CATASSO Operações Logísticas</span>
                    <span aria-hidden="true">·</span>
                    <span>Visão Executiva</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
                    {activeArmazem ? activeArmazem.nome : 'Visão Consolidada de Toda a Rede CATASSO'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    {activeArmazem
                      ? `${activeArmazem.localizacao} · Responsável: ${activeArmazem.responsavel}`
                      : `Monitorização centralizada de ${armazens.length} armazéns e centros de distribuição`}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setCurrentTab('envios')}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-all"
                  >
                    <SendHorizontal className="w-3.5 h-3.5" />
                    <span>Novo Envio Rápido</span>
                  </button>
                  <button
                    onClick={() => setCurrentTab('inventario')}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all"
                  >
                    <Boxes className="w-3.5 h-3.5 text-blue-400" />
                    <span>Ver Inventário Master</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Grid de 4 KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">SKUs Ativos no Inventário</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Boxes className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-white tabular-nums">{totalSKUs}</span>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {totalItensArmazenados.toLocaleString('pt-PT')} unidades
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Avaliação de Stock</span>
                  <span className="text-slate-200 font-semibold tabular-nums">
                    € {valorTotalInventario.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Capacidade Volumétrica</span>
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-white tabular-nums">{percentagemOcupacao}%</span>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {ocupacaoTotalM3.toLocaleString('pt-PT')} / {capacidadeTotalM3.toLocaleString('pt-PT')} m³
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/80">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        percentagemOcupacao > 85 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${percentagemOcupacao}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Alertas de Stock Crítico</span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    produtosAlerta.length > 0 ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-white tabular-nums">{produtosAlerta.length}</span>
                  <span className={`text-xs font-medium ${produtosAlerta.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {produtosAlerta.length > 0 ? 'Requer atenção imediata' : 'Níveis nominais'}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Abaixo do Stock Mínimo</span>
                  <button onClick={() => setCurrentTab('inventario')} className="text-blue-400 hover:text-blue-300 font-medium">
                    Verificar itens →
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Frota & Envios em Curso</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-white tabular-nums">{enviosEmTransito}</span>
                  <span className="text-xs text-slate-400">envios em trânsito</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Veículos Ativos</span>
                  <span className="text-slate-200 font-semibold tabular-nums">
                    {veiculosOperacionais} de {veiculos.length} operacionais
                  </span>
                </div>
              </div>
            </div>

            {/* Secção Central: Foto/Detalhes da Instalação + Tabela de Alertas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
                  <img
                    src="/src/assets/images/catasso_warehouse_hub_1792333100321.jpg"
                    alt="Instalações de Armazenamento CATASSO"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover brightness-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700/80 rounded px-2.5 py-1 text-[11px] font-semibold text-blue-300">
                    Instalação Automatizada
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <span className="text-xs font-bold text-white drop-shadow">
                        {activeArmazem ? activeArmazem.codigo : 'REDE NACIONAL & IBÉRICA'}
                      </span>
                      <p className="text-[11px] text-slate-300 drop-shadow line-clamp-1">
                        {activeArmazem ? activeArmazem.nome : 'Gestão Integrada de Armazéns'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-blue-400 drop-shadow tabular-nums">
                        {percentagemOcupacao}%
                      </span>
                      <span className="text-[10px] text-slate-300 block">ocupação</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-start justify-between text-slate-400">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        Localização:
                      </span>
                      <span className="text-slate-200 text-right max-w-[200px] truncate font-medium">
                        {activeArmazem ? activeArmazem.localizacao : 'Portugal & Espanha'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        Responsável Técnico:
                      </span>
                      <span className="text-slate-200 font-medium">
                        {activeArmazem ? activeArmazem.responsavel : 'Equipa de Gestão Operacional'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        Contacto Direto:
                      </span>
                      <span className="text-slate-200 font-medium tabular-nums">
                        {activeArmazem ? activeArmazem.contacto : '+351 219 550 100'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Status da Infraestrutura:</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Operacional 24/7
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabela de Alertas Imediatos */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Produtos Abaixo do Stock Mínimo
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Itens com necessidade de reposição preventiva ou urgente
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentTab('inventario')}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                  >
                    <span>Inventário Completo</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {produtosAlerta.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950/40 rounded-lg border border-slate-800/80">
                    <PackageCheck className="w-10 h-10 text-emerald-400/80 mb-2" />
                    <p className="text-sm font-semibold text-slate-200">
                      Nenhum produto em nível crítico no armazém selecionado
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Todos os produtos inventariados cumprem os limites de segurança estipulados na política CATASSO.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="pb-2 font-medium">SKU</th>
                          <th className="pb-2 font-medium">Designação do Produto</th>
                          <th className="pb-2 font-medium">Localização</th>
                          <th className="pb-2 font-medium text-right">Qtd Atual</th>
                          <th className="pb-2 font-medium text-right">Mínimo</th>
                          <th className="pb-2 font-medium text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {produtosAlerta.map((prod) => (
                          <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 font-mono text-slate-300 tabular-nums">{prod.sku}</td>
                            <td className="py-2.5 font-medium text-white max-w-[220px] truncate">{prod.nome}</td>
                            <td className="py-2.5 text-slate-400">{prod.localizacao_armazem}</td>
                            <td className="py-2.5 text-right font-mono font-bold text-amber-400 tabular-nums">
                              {prod.quantidade} {prod.unidade}
                            </td>
                            <td className="py-2.5 text-right font-mono text-slate-400 tabular-nums">
                              {prod.stock_minimo} {prod.unidade}
                            </td>
                            <td className="py-2.5 text-center">
                              <span
                                className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${
                                  prod.quantidade === 0
                                    ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                                    : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                }`}
                              >
                                {prod.quantidade === 0 ? 'Esgotado' : 'Reposição'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Secção Inferior: Movimentações Semanais SVG & Envios Recentes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">Movimentações da Semana</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Entradas vs Saídas de mercadorias</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1 text-blue-400">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Entradas
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-sm bg-slate-600 inline-block" /> Saídas
                    </span>
                  </div>
                </div>

                <div className="h-40 flex items-end justify-between gap-2 pt-4 px-2">
                  {[
                    { dia: 'Seg', in: 65, out: 48 },
                    { dia: 'Ter', in: 82, out: 70 },
                    { dia: 'Qua', in: 55, out: 62 },
                    { dia: 'Qui', in: 95, out: 84 },
                    { dia: 'Sex', in: 74, out: 90 },
                    { dia: 'Sáb', in: 30, out: 24 },
                  ].map((col) => (
                    <div key={col.dia} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full flex items-end justify-center gap-1 h-32">
                        <div
                          className="w-1/2 bg-blue-500 rounded-t-sm transition-all hover:bg-blue-400"
                          style={{ height: `${(col.in / 100) * 100}%` }}
                          title={`Entradas: ${col.in} ton`}
                        />
                        <div
                          className="w-1/2 bg-slate-600 rounded-t-sm transition-all hover:bg-slate-500"
                          style={{ height: `${(col.out / 100) * 100}%` }}
                          title={`Saídas: ${col.out} ton`}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{col.dia}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="w-4 h-4 text-blue-400" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Entradas</span>
                      <span className="font-bold text-white tabular-nums">401 Ton</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Saídas</span>
                      <span className="font-bold text-white tabular-nums">378 Ton</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <SendHorizontal className="w-4 h-4 text-blue-400" />
                      Envios Recentes & Rastreamento
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Últimas ordens de expedição geradas</p>
                  </div>
                  <button onClick={() => setCurrentTab('envios')} className="text-xs text-blue-400 hover:text-blue-300 font-medium">
                    Gerar Novo Envio →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-2 font-medium">Guia / Rastreio</th>
                        <th className="pb-2 font-medium">Cliente / Destino</th>
                        <th className="pb-2 font-medium">Modalidade</th>
                        <th className="pb-2 font-medium">Veículo / Motorista</th>
                        <th className="pb-2 font-medium text-right">Peso Total</th>
                        <th className="pb-2 font-medium text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {envios.slice(0, 4).map((env) => (
                        <tr key={env.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 font-mono font-semibold text-blue-400 tabular-nums">{env.codigo_rastreio}</td>
                          <td className="py-2.5 font-medium text-slate-200">
                            <div>{env.destino_cliente}</div>
                            <span className="text-[11px] text-slate-400">{env.destino_cidade}</span>
                          </td>
                          <td className="py-2.5 text-slate-300">{env.tipo_frete}</td>
                          <td className="py-2.5 text-slate-300">
                            <span className="font-mono text-slate-200">{env.veiculo_matricula}</span>
                            <span className="text-[11px] text-slate-400 block">{env.motorista_nome}</span>
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums text-slate-200">
                            {env.peso_total_kg.toLocaleString('pt-PT')} kg
                          </td>
                          <td className="py-2.5 text-center">
                            <span
                              className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${
                                env.status === 'Entregue'
                                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                                  : env.status === 'Em Trânsito'
                                  ? 'bg-blue-950/60 text-blue-300 border border-blue-800/60'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {env.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            ABA 2: INVENTÁRIO MASTER (SUPABASE REALTIME)
            ==================================================================== */}
        {currentTab === 'inventario' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                    <Boxes className="w-4 h-4" />
                    <span>CATASSO Tabela Centralizada</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[11px] text-slate-400">public.produtos_master</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
                    Inventário Master
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Gestão de stock em tempo real ligada diretamente às tabelas{' '}
                    <code className="text-blue-300 font-mono">armazens</code> e{' '}
                    <code className="text-blue-300 font-mono">produtos_master</code>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => setIsSupabaseModalOpen(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                      isSupabaseConfigured
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/50'
                        : 'bg-amber-950/40 text-amber-300 border-amber-800/80 hover:bg-amber-900/50'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>{isSupabaseConfigured ? 'Supabase Realtime Ativo' : 'Supabase Offline (Demo)'}</span>
                  </button>

                  <button
                    onClick={loadAllData}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
                    <span>Sincronizar</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar CSV</span>
                  </button>

                  <button
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        armazem_id: selectedArmazemId !== 'todos' ? selectedArmazemId : armazens[0]?.id || 'arm-lis-01',
                      }));
                      setIsCreateModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo Produto</span>
                  </button>
                </div>
              </div>

              {/* Filtros e Busca */}
              <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Pesquisar por SKU, nome ou localização..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <select
                    value={selectedArmazemId}
                    onChange={(e) => setSelectedArmazemId(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="todos" className="bg-slate-900 text-slate-200">
                      Todos os Armazéns ({armazens.length})
                    </option>
                    {armazens.map((arm) => (
                      <option key={arm.id} value={arm.id} className="bg-slate-900 text-slate-200">
                        {arm.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={selectedCategoria}
                    onChange={(e) => setSelectedCategoria(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="todas" className="bg-slate-900 text-slate-200">Todas as Categorias</option>
                    {uniqueCategorias.map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900 text-slate-200">{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5">
                  <span className="text-[11px] text-slate-400 shrink-0">Estado:</span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="todos" className="bg-slate-900 text-slate-200">Todos os Estados</option>
                    <option value="disponivel" className="bg-slate-900 text-slate-200">🟢 Disponível</option>
                    <option value="baixo_stock" className="bg-slate-900 text-slate-200">🟡 Baixo Stock</option>
                    <option value="esgotado" className="bg-slate-900 text-slate-200">🔴 Esgotado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tabela de Inventário Master */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200">
                    {filteredMasterProdutos.length} {filteredMasterProdutos.length === 1 ? 'produto encontrado' : 'produtos listados'}
                  </span>
                  {selectedArmazemId !== 'todos' && (
                    <span className="text-xs text-slate-400">
                      no {armazens.find((a) => a.id === selectedArmazemId)?.nome}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Sincronização reativa ativa
                </span>
              </div>

              {filteredMasterProdutos.length === 0 ? (
                <div className="p-12 text-center">
                  <Boxes className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-slate-300">Nenhum produto encontrado</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Nenhum item corresponde aos critérios de pesquisa ou filtros selecionados.
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategoria('todas');
                      setSelectedStatus('todos');
                      setSelectedArmazemId('todos');
                    }}
                    className="mt-3 text-xs text-blue-400 hover:underline"
                  >
                    Limpar todos os filtros
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium">
                      <tr>
                        <th className="py-3 px-4">SKU</th>
                        <th className="py-3 px-4">Designação / Descrição</th>
                        <th className="py-3 px-4">Armazém</th>
                        <th className="py-3 px-4">Categoria</th>
                        <th className="py-3 px-4 text-right">Qtd em Stock</th>
                        <th className="py-3 px-4 text-center">Ajuste Rápido</th>
                        <th className="py-3 px-4 text-right">Mínimo</th>
                        <th className="py-3 px-4">Localização Física</th>
                        <th className="py-3 px-4 text-right">Valor Unit.</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {filteredMasterProdutos.map((prod) => {
                        const armNome = armazens.find((a) => a.id === prod.armazem_id)?.nome || prod.armazem_id;
                        const isAbaixoMinimo = prod.quantidade <= prod.stock_minimo;

                        return (
                          <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-blue-400 tabular-nums">
                              {prod.sku}
                            </td>
                            <td className="py-3 px-4 text-white max-w-[240px]">
                              <div className="font-semibold line-clamp-1">{prod.nome}</div>
                              <span className="text-[10px] text-slate-400 font-normal">
                                {prod.peso_unitario_kg} kg / {prod.unidade}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300 max-w-[150px] truncate">
                              <span className="text-[11px] block">{armNome}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-300">{prod.categoria}</td>
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`font-mono text-sm font-bold tabular-nums ${
                                  prod.quantidade === 0
                                    ? 'text-rose-400'
                                    : isAbaixoMinimo
                                    ? 'text-amber-400'
                                    : 'text-slate-100'
                                }`}
                              >
                                {prod.quantidade.toLocaleString('pt-PT')}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">{prod.unidade}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5">
                                <button
                                  onClick={() => handleQuickAdjust(prod, -1)}
                                  disabled={prod.quantidade <= 0}
                                  className="text-slate-400 hover:text-rose-400 disabled:opacity-30 p-0.5"
                                  title="Diminuir 1 unidade"
                                >
                                  <MinusCircle className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleQuickAdjust(prod, 1)}
                                  className="text-slate-400 hover:text-emerald-400 p-0.5"
                                  title="Aumentar 1 unidade"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-400 tabular-nums">
                              {prod.stock_minimo} {prod.unidade}
                            </td>
                            <td className="py-3 px-4 text-slate-300 max-w-[160px] truncate">
                              <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                                {prod.localizacao_armazem}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-200 tabular-nums">
                              € {prod.valor_unitario.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                                  prod.status === 'disponivel'
                                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                                    : prod.status === 'baixo_stock'
                                    ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                    : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                                }`}
                              >
                                {prod.status === 'disponivel' ? 'Disponível' : prod.status === 'baixo_stock' ? 'Baixo Stock' : 'Esgotado'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setEditingProduto(prod)}
                                  className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
                                  title="Editar"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingId(prod.id)}
                                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====================================================================
            ABA 3: ENVIOS EM 3 PASSOS
            ==================================================================== */}
        {currentTab === 'envios' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                    <SendHorizontal className="w-4 h-4" />
                    <span>CATASSO Dispatch Engine</span>
                    <span aria-hidden="true">·</span>
                    <span>Assistente de Expedição</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
                    Envios em 3 Passos
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Crie expedições oficiais, debite automaticamente o Inventário Master e emita a Guia de Transporte.
                  </p>
                </div>

                {generatedEnvio && (
                  <button
                    onClick={() => {
                      setGeneratedEnvio(null);
                      setShipmentStep(1);
                      setShipmentItens([]);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors"
                  >
                    + Criar Outro Envio
                  </button>
                )}
              </div>

              {/* Indicador de Passos */}
              <div className="mt-6 pt-4 border-t border-slate-800/80">
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <button
                    onClick={() => !generatedEnvio && setShipmentStep(1)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      shipmentStep === 1
                        ? 'bg-blue-950/40 border-blue-500/80 text-white'
                        : shipmentStep > 1
                        ? 'bg-slate-900 border-emerald-800/80 text-emerald-400'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Passo 1</span>
                      {shipmentStep > 1 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <MapPin className="w-4 h-4 text-blue-400" />}
                    </div>
                    <span className="text-xs sm:text-sm font-semibold block text-slate-100">Origem & Destino</span>
                  </button>

                  <button
                    onClick={() => !generatedEnvio && setShipmentStep(2)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      shipmentStep === 2
                        ? 'bg-blue-950/40 border-blue-500/80 text-white'
                        : shipmentStep > 2
                        ? 'bg-slate-900 border-emerald-800/80 text-emerald-400'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Passo 2</span>
                      {shipmentStep > 2 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Boxes className="w-4 h-4 text-blue-400" />}
                    </div>
                    <span className="text-xs sm:text-sm font-semibold block text-slate-100">Itens do Inventário</span>
                  </button>

                  <button
                    onClick={() => !generatedEnvio && setShipmentStep(3)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      shipmentStep === 3
                        ? 'bg-blue-950/40 border-blue-500/80 text-white'
                        : generatedEnvio
                        ? 'bg-slate-900 border-emerald-800/80 text-emerald-400'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Passo 3</span>
                      {generatedEnvio ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Truck className="w-4 h-4 text-blue-400" />}
                    </div>
                    <span className="text-xs sm:text-sm font-semibold block text-slate-100">Frota & Guia Oficial</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Guia Emitida ou Formulário Wizard */}
            {generatedEnvio ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 no-print">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Guia de Transporte Emitida com Sucesso!</h2>
                      <p className="text-xs text-slate-400">
                        O stock foi debitado do Inventário Master no Supabase. O código de rastreio oficial está ativo.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Guia Oficial</span>
                  </button>
                </div>

                {/* VISUALIZAÇÃO/IMPRESSÃO DA GUIA OFICIAL */}
                <div className="bg-white text-slate-900 p-8 rounded-lg shadow-lg border border-slate-200 font-sans max-w-4xl mx-auto">
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black tracking-tight text-blue-900">CATASSO</span>
                        <span className="text-xs font-bold text-slate-600 border-l border-slate-400 pl-2 uppercase">
                          Logística & Transportes S.A.
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        NIF: PT 509 881 234 · Licença de Transporte Rodoviário DGRMT nº 4892
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Sede: Parque Logístico do Tejo, 2615 Alverca do Ribatejo, Portugal
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold uppercase text-slate-500 block">GUIA DE TRANSPORTE Nº</span>
                      <span className="text-lg font-mono font-bold text-slate-900">{generatedEnvio.codigo_rastreio}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Emitida em: {new Date(generatedEnvio.created_at).toLocaleString('pt-PT')}
                      </span>
                    </div>
                  </div>

                  <div className="py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Barcode className="w-24 h-10 text-slate-800" />
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        *{generatedEnvio.codigo_rastreio.replace(/-/g, '')}*
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <QrCode className="w-10 h-10 text-slate-800" />
                      <div className="text-[10px] text-slate-500 text-left">
                        <span className="font-bold text-slate-800 block">Código AT Verificado</span>
                        <span>Rastreio em Tempo Real</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200 text-xs">
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-blue-900 block mb-1">1. Local de Carga / Origem</span>
                      <p className="font-bold text-slate-900">{generatedEnvio.armazem_origem_nome}</p>
                      <p className="text-slate-600 mt-0.5">Armazém Central CATASSO Logística</p>
                      <p className="text-slate-600">Data de Saída: {generatedEnvio.data_expedicao}</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-blue-900 block mb-1">2. Local de Descarga / Destinatário</span>
                      <p className="font-bold text-slate-900">{generatedEnvio.destino_cliente}</p>
                      <p className="text-slate-600 mt-0.5">{generatedEnvio.destino_morada}</p>
                      <p className="text-slate-600 font-medium">{generatedEnvio.destino_cidade}</p>
                      <p className="text-slate-600">Data Prevista: {generatedEnvio.data_prevista}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 py-3 border-b border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Veículo / Matrícula</span>
                      <span className="font-mono font-bold text-slate-900">{generatedEnvio.veiculo_matricula}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Motorista Responsável</span>
                      <span className="font-semibold text-slate-900">{generatedEnvio.motorista_nome}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Modalidade de Frete</span>
                      <span className="font-semibold text-blue-800">{generatedEnvio.tipo_frete}</span>
                    </div>
                  </div>

                  <div className="py-4">
                    <span className="text-xs font-bold text-slate-900 uppercase block mb-2">
                      Discriminação das Mercadorias Transportadas
                    </span>
                    <table className="w-full text-left text-xs border border-slate-200">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
                        <tr>
                          <th className="py-2 px-3">Item</th>
                          <th className="py-2 px-3">SKU</th>
                          <th className="py-2 px-3">Designação da Mercadoria</th>
                          <th className="py-2 px-3 text-right">Qtd</th>
                          <th className="py-2 px-3 text-right">Peso (kg)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {generatedEnvio.itens.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-semibold text-slate-800">{item.sku}</td>
                            <td className="py-2 px-3 text-slate-900">{item.nome}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">{item.quantidade}</td>
                            <td className="py-2 px-3 text-right font-mono">{item.peso_kg.toLocaleString('pt-PT')}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                        <tr>
                          <td colSpan={3} className="py-2 px-3 text-right">Totais:</td>
                          <td className="py-2 px-3 text-right font-mono">
                            {generatedEnvio.itens.reduce((acc, i) => acc + i.quantidade, 0)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-blue-900">
                            {generatedEnvio.peso_total_kg.toLocaleString('pt-PT')} kg ({generatedEnvio.volume_total_m3} m³)
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300 text-xs text-center">
                    <div>
                      <div className="h-10 border-b border-slate-400" />
                      <span className="text-[11px] text-slate-600 block mt-1">Assinatura do Expedidor (CATASSO Logística)</span>
                    </div>
                    <div>
                      <div className="h-10 border-b border-slate-400" />
                      <span className="text-[11px] text-slate-600 block mt-1">Assinatura e Carimbo do Destinatário</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
                
                {/* PASSO 1: ORIGEM & DESTINO */}
                {shipmentStep === 1 && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-800 pb-3">
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-400" />
                        Passo 1: Definição de Origem e Destino
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Selecione o armazém de expedição e preencha os dados do cliente de destino.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-300">Armazém de Expedição (Origem)</label>
                        <select
                          value={shipmentOrigemId}
                          onChange={(e) => {
                            setShipmentOrigemId(e.target.value);
                            setShipmentItens([]);
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          {armazens.map((arm) => (
                            <option key={arm.id} value={arm.id}>
                              {arm.nome} — {arm.localizacao}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-300">Empresa Destinatária / Cliente</label>
                        <input
                          type="text"
                          required
                          value={shipmentCliente}
                          onChange={(e) => setShipmentCliente(e.target.value)}
                          placeholder="Ex: Sonae MC, Continental, Galp Energia"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-300">Morada Completa de Descarga</label>
                        <input
                          type="text"
                          required
                          value={shipmentMorada}
                          onChange={(e) => setShipmentMorada(e.target.value)}
                          placeholder="Ex: Zona Industrial de Alverca, Lote 12"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-300">Cidade / Região</label>
                        <input
                          type="text"
                          required
                          value={shipmentCidade}
                          onChange={(e) => setShipmentCidade(e.target.value)}
                          placeholder="Ex: Azambuja, Lisboa ou Madrid"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-300">Modalidade de Frete</label>
                        <select
                          value={shipmentTipoFrete}
                          onChange={(e) => setShipmentTipoFrete(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="Expresso 24h">Expresso 24h (Urgente)</option>
                          <option value="Normal">Normal (Geral Rodoviário)</option>
                          <option value="Frigorífico / Controlado">Frigorífico / Temperatura Controlada</option>
                          <option value="Carga Pesada">Carga Pesada / Camião Completo</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-semibold text-slate-400">Data de Saída</label>
                          <input
                            type="date"
                            value={shipmentDataExp}
                            onChange={(e) => setShipmentDataExp(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-semibold text-slate-400">Data de Entrega</label>
                          <input
                            type="date"
                            value={shipmentDataPrev}
                            onChange={(e) => setShipmentDataPrev(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShipmentStep(2)}
                        className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow transition-colors"
                      >
                        <span>Avançar para Passo 2 (Selecionar Itens)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* PASSO 2: SELEÇÃO DE ITENS DO INVENTÁRIO */}
                {shipmentStep === 2 && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                          <Boxes className="w-5 h-5 text-blue-400" />
                          Passo 2: Seleção de Itens do Inventário Master
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Itens disponíveis no armazém:{' '}
                          <span className="text-white font-medium">
                            {armazens.find((a) => a.id === shipmentOrigemId)?.nome}
                          </span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-blue-400 tabular-nums">
                          {totalPesoKgEnvio.toLocaleString('pt-PT')} kg
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Volume Est.: {totalVolumeM3Envio} m³
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col md:flex-row items-end gap-3">
                      <div className="flex-1 space-y-1 w-full">
                        <label className="block text-xs font-semibold text-slate-300">Escolher Produto em Stock</label>
                        <select
                          value={selectedItemToAddId}
                          onChange={(e) => setSelectedItemToAddId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="">-- Selecione um produto para expedir --</option>
                          {produtosDoArmazemOrigemEnvio.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.sku}] {p.nome} — Disp: {p.quantidade} {p.unidade} ({p.peso_unitario_kg} kg/un)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full md:w-36 space-y-1">
                        <label className="block text-xs font-semibold text-slate-300">Quantidade</label>
                        <input
                          type="number"
                          min="1"
                          value={selectedItemToAddQtd}
                          onChange={(e) => setSelectedItemToAddQtd(parseInt(e.target.value) || 1)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddShipmentItem}
                        disabled={!selectedItemToAddId}
                        className="w-full md:w-auto px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-40 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar à Carga</span>
                      </button>
                    </div>

                    {/* Tabela de Itens Selecionados */}
                    <div className="border border-slate-800 rounded-lg overflow-hidden">
                      <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300">
                        <span>Itens Selecionados para Expedição ({shipmentItens.length})</span>
                        <span>Peso Total: {totalPesoKgEnvio.toLocaleString('pt-PT')} kg</span>
                      </div>

                      {shipmentItens.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400">
                          <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <span>Nenhum item adicionado à carga ainda. Use o seletor acima para adicionar.</span>
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3">SKU</th>
                              <th className="py-2.5 px-3">Produto</th>
                              <th className="py-2.5 px-3 text-right">Qtd</th>
                              <th className="py-2.5 px-3 text-right">Peso Total</th>
                              <th className="py-2.5 px-3 text-right">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {shipmentItens.map((item, idx) => (
                              <tr key={item.produto_id}>
                                <td className="py-2.5 px-3 font-mono font-bold text-blue-400">{item.sku}</td>
                                <td className="py-2.5 px-3 text-white">{item.nome}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                                  {item.quantidade} {item.unidade}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                                  {(item.quantidade * item.peso_kg).toLocaleString('pt-PT')} kg
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() => {
                                      const c = [...shipmentItens];
                                      c.splice(idx, 1);
                                      setShipmentItens(c);
                                    }}
                                    className="text-slate-400 hover:text-rose-400 p-1"
                                    title="Remover"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShipmentStep(1)}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Voltar ao Passo 1</span>
                      </button>

                      <button
                        type="button"
                        disabled={shipmentItens.length === 0}
                        onClick={() => setShipmentStep(3)}
                        className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow disabled:opacity-40 transition-colors"
                      >
                        <span>Avançar para Passo 3 (Frota & Guia)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* PASSO 3: FROTA & EMISSÃO DA GUIA */}
                {shipmentStep === 3 && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-800 pb-3">
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Truck className="w-5 h-5 text-blue-400" />
                        Passo 3: Atribuição de Frota & Emissão da Guia
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Selecione o veículo da frota CATASSO e confirme o envio.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Origem</span>
                        <span className="text-xs font-bold text-white">
                          {armazens.find((a) => a.id === shipmentOrigemId)?.nome}
                        </span>
                      </div>
                      <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Destinatário</span>
                        <span className="text-xs font-bold text-white truncate block">
                          {shipmentCliente} ({shipmentCidade})
                        </span>
                      </div>
                      <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Carga & Volume</span>
                        <span className="text-xs font-bold text-blue-400 tabular-nums">
                          {totalPesoKgEnvio.toLocaleString('pt-PT')} kg · {totalVolumeM3Envio} m³ · {shipmentItens.length} itens
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-slate-300">
                        Veículo & Motorista CATASSO Designado
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {veiculos.map((v) => {
                          const isSelected = shipmentVeiculoId === v.id;
                          const canCarry = v.capacidade_kg >= totalPesoKgEnvio;

                          return (
                            <div
                              key={v.id}
                              onClick={() => setShipmentVeiculoId(v.id)}
                              className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-blue-950/60 border-blue-500 shadow-md'
                                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-sm text-white">{v.matricula}</span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                    v.status === 'disponivel'
                                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {v.status === 'disponivel' ? 'Disponível' : v.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 font-medium mt-1">{v.modelo}</p>
                              <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
                                <div>Motorista: <span className="text-slate-200">{v.motorista_nome}</span></div>
                                <div>Capacidade: <span className="font-mono text-slate-200">{v.capacidade_kg.toLocaleString('pt-PT')} kg</span> ({v.capacidade_m3} m³)</div>
                              </div>
                              {!canCarry && (
                                <span className="text-[10px] text-amber-400 font-medium block mt-1">
                                  ⚠️ Carga ({totalPesoKgEnvio}kg) excede a capacidade útil do veículo.
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShipmentStep(2)}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Voltar aos Itens</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleFinalizarEnvio}
                        className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-900/30 disabled:opacity-50 transition-all"
                      >
                        {isSubmitting ? (
                          <span>A Processar Guia no Supabase...</span>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Emitir Guia Oficial de Transporte</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            ABA 4: FROTAS
            ==================================================================== */}
        {currentTab === 'frotas' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                    <Truck className="w-4 h-4" />
                    <span>CATASSO Telemetria & Rota</span>
                    <span aria-hidden="true">·</span>
                    <span>Gestão de Frota Pesada e Urbana</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">Frotas CATASSO</h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Monitorização de veículos, condutores, capacidade de carga e telemetria operacional.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Capacidade Total Frota:</span>
                  <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/60 border border-blue-800/60 px-2.5 py-1 rounded">
                    {(veiculos.reduce((acc, v) => acc + v.capacidade_kg, 0) / 1000).toFixed(1)} Toneladas Úteis
                  </span>
                </div>
              </div>

              {/* KPIs de Frota */}
              <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Veículos</span>
                  <span className="text-xl font-bold text-white block mt-0.5 tabular-nums">{veiculos.length}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold">Disponíveis / Carga</span>
                  <span className="text-xl font-bold text-emerald-400 block mt-0.5 tabular-nums">
                    {veiculos.filter((v) => v.status === 'disponivel').length}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-blue-400 uppercase font-semibold">Em Rota / Missão</span>
                  <span className="text-xl font-bold text-blue-400 block mt-0.5 tabular-nums">
                    {veiculos.filter((v) => v.status === 'em_rota').length}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-amber-400 uppercase font-semibold">Em Manutenção</span>
                  <span className="text-xl font-bold text-amber-400 block mt-0.5 tabular-nums">
                    {veiculos.filter((v) => v.status === 'manutencao').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Barra de Busca de Frotas */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Pesquisar por matrícula, condutor ou modelo..."
                  value={fleetSearch}
                  onChange={(e) => setFleetSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={fleetStatusFilter}
                  onChange={(e) => setFleetStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer w-full sm:w-auto"
                >
                  <option value="todos">Todos os Estados ({veiculos.length})</option>
                  <option value="disponivel">Disponível no Armazém</option>
                  <option value="em_rota">Em Rota</option>
                  <option value="carregando">Carregando em Doca</option>
                  <option value="manutencao">Em Manutenção</option>
                </select>
              </div>
            </div>

            {/* Grid de Veículos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFleet.map((veiculo) => {
                const isElectric = veiculo.modelo.toLowerCase().includes('electric');

                return (
                  <div
                    key={veiculo.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-base font-black text-white bg-slate-950 border border-slate-700 px-2.5 py-1 rounded tracking-wide">
                            {veiculo.matricula}
                          </span>
                          <h3 className="text-xs font-semibold text-slate-200 mt-2">{veiculo.modelo}</h3>
                          <span className="text-[11px] text-slate-400">{veiculo.tipo}</span>
                        </div>

                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            veiculo.status === 'disponivel'
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                              : veiculo.status === 'em_rota'
                              ? 'bg-blue-950/70 text-blue-300 border border-blue-800'
                              : veiculo.status === 'carregando'
                              ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-800'
                              : 'bg-amber-950/70 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {veiculo.status === 'disponivel'
                            ? 'Disponível'
                            : veiculo.status === 'em_rota'
                            ? 'Em Rota'
                            : veiculo.status === 'carregando'
                            ? 'Em Doca'
                            : 'Manutenção'}
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="truncate">{veiculo.localizacao_atual}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span>Condutor:</span>
                          <span className="font-medium text-slate-200">{veiculo.motorista_nome}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span>Capacidade:</span>
                          <span className="font-mono font-medium text-slate-200 tabular-nums">
                            {(veiculo.capacidade_kg / 1000).toFixed(1)}t · {veiculo.capacidade_m3} m³
                          </span>
                        </div>
                        {veiculo.temperatura_camara_c !== undefined && (
                          <div className="flex items-center justify-between text-cyan-400 text-[11px] bg-cyan-950/40 p-1.5 rounded border border-cyan-900/60">
                            <span className="flex items-center gap-1">
                              <Thermometer className="w-3 h-3" /> Câmara Térmica:
                            </span>
                            <span className="font-mono font-bold">{veiculo.temperatura_camara_c}°C</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            {isElectric ? <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" /> : <Fuel className="w-3.5 h-3.5 text-amber-400" />}
                            {isElectric ? 'Bateria SOC' : 'Combustível'}
                          </span>
                          <span className="font-mono font-semibold text-slate-200 tabular-nums">
                            {veiculo.combustivel_bateria_pct}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              veiculo.combustivel_bateria_pct > 30 ? 'bg-blue-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${veiculo.combustivel_bateria_pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Rev: {veiculo.proxima_revisao}
                      </span>
                      <select
                        value={veiculo.status}
                        onChange={(e) => handleFleetStatusChange(veiculo.id, e.target.value as any)}
                        className="bg-slate-950 border border-slate-700 text-slate-300 text-[11px] rounded px-2 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="disponivel">Definir: Disponível</option>
                        <option value="em_rota">Definir: Em Rota</option>
                        <option value="carregando">Definir: Em Doca</option>
                        <option value="manutencao">Definir: Manutenção</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* ======================================================================
          RODAPÉ
          ====================================================================== */}
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

      {/* ======================================================================
          MODAL 1: CRIAR PRODUTO (NO INVENTÁRIO MASTER)
          ====================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-400" />
                  Registar Novo Produto no Inventário Master
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tabela: <code className="text-blue-300 font-mono">public.produtos_master</code>
                </p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Armazém de Alocação</label>
                  <select
                    value={formData.armazem_id}
                    onChange={(e) => setFormData({ ...formData, armazem_id: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {armazens.map((arm) => (
                      <option key={arm.id} value={arm.id}>
                        {arm.nome} ({arm.codigo})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Código SKU / Referência</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CAT-IND-5010"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria Logística</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Embalagens, Frio, Eletrónicos"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Designação Completa do Produto</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Motores Industriais Trifásicos 7.5kW WEG"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Quantidade Inicial</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Unidade de Medida</label>
                  <select
                    value={formData.unidade}
                    onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="un">un (Unidades)</option>
                    <option value="kg">kg (Quilogramas)</option>
                    <option value="cx">cx (Caixas)</option>
                    <option value="palete">palete (Paletes)</option>
                    <option value="tambor">tambor (Tambores)</option>
                    <option value="rolo">rolo (Rolos)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock_minimo}
                    onChange={(e) => setFormData({ ...formData, stock_minimo: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Localização no Armazém</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Corredor B - Baía 04"
                    value={formData.localizacao_armazem}
                    onChange={(e) => setFormData({ ...formData, localizacao_armazem: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Valor Unitário (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.valor_unitario}
                    onChange={(e) => setFormData({ ...formData, valor_unitario: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Peso Unitário (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={formData.peso_unitario_kg}
                    onChange={(e) => setFormData({ ...formData, peso_unitario_kg: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? 'A Gravar...' : 'Gravar no Inventário Master'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================
          MODAL 2: EDITAR PRODUTO
          ====================================================================== */}
      {editingProduto && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-400" />
                  Editar Produto: {editingProduto.sku}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Atualização direta no Supabase</p>
              </div>
              <button onClick={() => setEditingProduto(null)} className="text-slate-400 hover:text-white p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Designação do Produto</label>
                  <input
                    type="text"
                    required
                    value={editingProduto.nome}
                    onChange={(e) => setEditingProduto({ ...editingProduto, nome: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Quantidade em Stock</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduto.quantidade}
                    onChange={(e) => setEditingProduto({ ...editingProduto, quantidade: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduto.stock_minimo}
                    onChange={(e) => setEditingProduto({ ...editingProduto, stock_minimo: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Localização no Armazém</label>
                  <input
                    type="text"
                    required
                    value={editingProduto.localizacao_armazem}
                    onChange={(e) => setEditingProduto({ ...editingProduto, localizacao_armazem: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Valor Unitário (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editingProduto.valor_unitario}
                    onChange={(e) => setEditingProduto({ ...editingProduto, valor_unitario: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduto(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'A Atualizar...' : 'Gravar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================
          MODAL 3: CONFIRMAR ELIMINAÇÃO
          ====================================================================== */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              Confirmar Eliminação de Produto
            </h3>
            <p className="text-xs text-slate-300 mt-2">
              Tem a certeza de que deseja remover permanentemente este SKU da tabela de Inventário Master?
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteProduct(deletingId)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg"
              >
                Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          MODAL 4: CONFIGURAÇÃO DO SUPABASE & SCRIPT SQL
          ====================================================================== */}
      {isSupabaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Configuração & Conexão Supabase</h3>
                  <p className="text-xs text-slate-400">
                    Tabelas <code className="text-blue-300 font-mono">armazens</code> e{' '}
                    <code className="text-blue-300 font-mono">produtos_master</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSupabaseModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
              {/* Estado Atual */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-200">Estado da Conexão</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                      isSupabaseConfigured
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {isSupabaseConfigured ? 'Credenciais Detetadas' : 'Modo Demonstração (Fallback Local)'}
                  </span>
                </div>

                <p className="text-slate-400 text-xs">
                  {isSupabaseConfigured
                    ? `URL Configurado: ${supabaseUrl}`
                    : 'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não preenchidas no .env. A operar com armazenamento local reativo completo.'}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={handleTestSupabase}
                    disabled={isTestingConn}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingConn ? 'animate-spin' : ''}`} />
                    <span>{isTestingConn ? 'A Testar Conexão...' : 'Testar Conexão Supabase'}</span>
                  </button>

                  {testResult && (
                    <span className={`text-xs font-medium ${testResult.success ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {testResult.message}
                    </span>
                  )}
                </div>
              </div>

              {/* Guia de Configuração */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Como Ligar ao seu Projeto:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg space-y-2">
                    <span className="font-bold text-blue-400 block">1. Variáveis de Ambiente (.env)</span>
                    <p className="text-[11px] text-slate-400">Adicione ao seu ficheiro .env as credenciais do Supabase:</p>
                    <div className="bg-slate-900 p-2.5 rounded font-mono text-[11px] text-slate-300 border border-slate-800 select-all">
                      VITE_SUPABASE_URL="https://seu-id.supabase.co"<br />
                      VITE_SUPABASE_ANON_KEY="sua-chave-anon"
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg space-y-2">
                    <span className="font-bold text-blue-400 block">2. Executar Script SQL no Supabase</span>
                    <p className="text-[11px] text-slate-400">
                      Abra o <strong>SQL Editor</strong> no Supabase e execute o script para criar as tabelas e habilitar o Realtime.
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
                        setSqlCopied(true);
                        setTimeout(() => setSqlCopied(false), 2500);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                    >
                      {sqlCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
                      <span>{sqlCopied ? 'Copiado para a Área de Transferência!' : 'Copiar Script SQL Completo'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bloco SQL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Script SQL:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
                      setSqlCopied(true);
                      setTimeout(() => setSqlCopied(false), 2500);
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{sqlCopied ? 'Copiado!' : 'Copiar SQL'}</span>
                  </button>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 max-h-56 overflow-y-auto font-mono text-[11px] text-slate-300">
                  <pre className="whitespace-pre-wrap">{SUPABASE_SETUP_SQL}</pre>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
              <button
                onClick={() => setIsSupabaseModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
