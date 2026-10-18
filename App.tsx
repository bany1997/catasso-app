* @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Truck,
  Ship,
  ArrowLeftRight,
  QrCode,
  LayoutDashboard,
  ShieldAlert,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Clock,
  Printer,
  FileText,
  UserCheck,
  ChevronDown,
  Warehouse,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  LogOut,
  MapPin,
  ExternalLink,
  DollarSign,
  PackageCheck,
  BarChart3,
  BadgeAlert
} from 'lucide-react';

// --- TIPOS DE DADOS DO CATASSO ERP ---

export type UserRole =
  | 'Superadministrador'
  | 'Gestor de Armazém'
  | 'Supervisor'
  | 'Responsável de Frotas'
  | 'Atendente'
  | 'Fornecedor';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  warehouseId: string; // 'ALL' para visão global
}

export interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  province: string;
  city: string;
  address: string;
  capacityM3: number;
  usedCapacityM3: number;
  manager: string;
  phone: string;
  activeStaff: number;
}

export interface ProductVariant {
  id: string;
  skuVariant: string;
  spec: string; // Ex: "Azul / 200W", "Pack 24x / 500ml", "Grau Industrial 50kg"
  stockByWarehouse: Record<string, number>; // warehouseId -> quantidade
  reorderPoint: number;
}

export interface MasterProduct {
  id: string;
  masterSku: string;
  name: string;
  category: 'Construção & Obras' | 'Alimentar & Bebidas' | 'Peças & Maquinaria' | 'Eletrodomésticos & Energia' | 'Químicos & Fito';
  unitCostKz: number;
  unitPriceKz: number;
  variants: ProductVariant[];
  weightKg: number;
  originCountry: string;
  batchNumber: string;
  expiryDate?: string;
  barcode: string;
}

export type ShipmentStatus = 'expedido' | 'alfandega' | 'recebido' | 'rejeitado';

export interface SupplierShipment {
  id: string;
  shipmentNumber: string;
  supplierName: string;
  originPort: string;
  destinationWarehouseId: string;
  invoiceNumber: string;
  blNumber: string; // Bill of Lading ou Guia de Carga
  duNumber: string; // Declaração Única (AGT Angola)
  totalValueKz: number;
  customsTaxKz: number;
  step: 1 | 2 | 3;
  status: ShipmentStatus;
  estimatedArrival: string;
  customsStatus: 'Em Análise' | 'Canal Verde' | 'Canal Amarelo' | 'Canal Vermelho (Inspeção)' | 'Desembaraçado';
  inspectionNotes?: string;
  conformityReport?: {
    approvedBy: string;
    date: string;
    discrepancyCount: number;
    notes: string;
  };
  items: {
    masterSku: string;
    productName: string;
    quantity: number;
    unit: string;
  }[];
}

export interface FleetVehicle {
  id: string;
  plate: string; // Ex: LD-84-92-HL
  model: string;
  type: 'Camião Articulado' | 'Camião Porta-Contentor' | 'Carrinha Frigorífica' | 'Empilhador 5T' | 'Stacker Elétrico';
  assignedWarehouseId: string;
  purchaseYear: number;
  acquisitionCostKz: number;
  depreciationRateYear: number; // Ex: 0.15 (15%)
  currentBookValueKz: number;
  monthlyRentalChargeKz: number; // Custo imputado mensalmente
  status: 'Operacional' | 'Em Rota' | 'Em Manutenção' | 'Imobilizado';
  lastMaintenance: string;
  nextMaintenanceKm: number;
  currentKm: number;
  driverName: string;
}

export interface InterWarehouseTransfer {
  id: string;
  transferCode: string;
  sourceWarehouseId: string;
  destWarehouseId: string;
  masterSku: string;
  productName: string;
  variantSpec: string;
  quantity: number;
  requestedBy: string;
  requestDate: string;
  vehiclePlate: string;
  status: 'Pendente' | 'Aprovado' | 'Em Trânsito' | 'Concluído' | 'Rejeitado';
  nationalGuideNumber: string;
  estimatedArrival: string;
}

// --- DADOS MOCK REALISTAS DE ANGOLA ---

const INITIAL_WAREHOUSES: WarehouseItem[] = [
  {
    id: 'ARM-LUA-01',
    code: 'ARM-01',
    name: 'Pólo Industrial de Viana (Central)',
    province: 'Luanda',
    city: 'Viana',
    address: 'Estrada de Catete, Km 24, Luanda',
    capacityM3: 20000,
    usedCapacityM3: 16400,
    manager: 'Eng. Manuel Catasso',
    phone: '+244 923 456 789',
    activeStaff: 48,
  },
  {
    id: 'ARM-LUA-02',
    code: 'ARM-02',
    name: 'Entreposto Porto de Luanda',
    province: 'Luanda',
    city: 'Ingombota',
    address: 'Terminal de Cargas Gerais, Porto de Luanda',
    capacityM3: 12000,
    usedCapacityM3: 8900,
    manager: 'Dra. Esperança Panzo',
    phone: '+244 912 334 556',
    activeStaff: 32,
  },
  {
    id: 'ARM-LOB-03',
    code: 'ARM-03',
    name: 'Terminal Logístico do Lobito',
    province: 'Benguela',
    city: 'Lobito',
    address: 'Avenida da Independência, Corredor do Lobito',
    capacityM3: 15000,
    usedCapacityM3: 7200,
    manager: 'Sr. Bartolomeu Dias',
    phone: '+244 931 778 990',
    activeStaff: 26,
  },
  {
    id: 'ARM-HUA-04',
    code: 'ARM-04',
    name: 'Hub Logístico do Planalto Central',
    province: 'Huambo',
    city: 'Huambo',
    address: 'Zona Industrial do São Pedro, Huambo',
    capacityM3: 8000,
    usedCapacityM3: 5950,
    manager: 'Eng. Domingos Tchissola',
    phone: '+244 945 112 233',
    activeStaff: 18,
  },
  {
    id: 'ARM-CAB-05',
    code: 'ARM-05',
    name: 'Entreposto Fronteiriço de Fútila',
    province: 'Cabinda',
    city: 'Fútila',
    address: 'Polo Industrial de Fútila, Cabinda',
    capacityM3: 6500,
    usedCapacityM3: 2300,
    manager: 'Sra. Arlete Buco',
    phone: '+244 928 889 001',
    activeStaff: 14,
  },
];

const INITIAL_PRODUCTS: MasterProduct[] = [
  {
    id: 'PRD-001',
    masterSku: 'SKU-CAT-8801',
    name: 'Cimento Portland Especial 42.5R (Saco 50kg)',
    category: 'Construção & Obras',
    unitCostKz: 4800,
    unitPriceKz: 6200,
    weightKg: 50,
    originCountry: 'Angola (Cimangola)',
    batchNumber: 'LUA-2026-B91',
    barcode: '5601234880101',
    variants: [
      {
        id: 'VAR-001-A',
        skuVariant: 'SKU-CAT-8801-PAL',
        spec: 'Palete Fechada 40 Sacos (2.000 kg)',
        stockByWarehouse: {
          'ARM-LUA-01': 450,
          'ARM-LUA-02': 210,
          'ARM-LOB-03': 320,
          'ARM-HUA-04': 95,
          'ARM-CAB-05': 60,
        },
        reorderPoint: 80,
      },
      {
        id: 'VAR-001-B',
        skuVariant: 'SKU-CAT-8801-SAC',
        spec: 'Unidade Saco Individual 50kg',
        stockByWarehouse: {
          'ARM-LUA-01': 3200,
          'ARM-LUA-02': 1100,
          'ARM-LOB-03': 1850,
          'ARM-HUA-04': 640,
          'ARM-CAB-05': 420,
        },
        reorderPoint: 500,
      },
    ],
  },
  {
    id: 'PRD-002',
    masterSku: 'SKU-CAT-3042',
    name: 'Gerador a Diesel Trifásico Industrial 150 kVA',
    category: 'Eletrodomésticos & Energia',
    unitCostKz: 14500000,
    unitPriceKz: 18200000,
    weightKg: 1850,
    originCountry: 'Reino Unido / Perkins',
    batchNumber: 'GEN-UK-2026-04',
    barcode: '5601234304208',
    variants: [
      {
        id: 'VAR-002-A',
        skuVariant: 'SKU-CAT-3042-CAB',
        spec: 'Cabinado Super Silencioso 65dB',
        stockByWarehouse: {
          'ARM-LUA-01': 8,
          'ARM-LUA-02': 5,
          'ARM-LOB-03': 4,
          'ARM-HUA-04': 2,
          'ARM-CAB-05': 1,
        },
        reorderPoint: 3,
      },
      {
        id: 'VAR-002-B',
        skuVariant: 'SKU-CAT-3042-ABR',
        spec: 'Versão Aberta / Skid Chassi',
        stockByWarehouse: {
          'ARM-LUA-01': 4,
          'ARM-LUA-02': 2,
          'ARM-LOB-03': 1,
          'ARM-HUA-04': 0,
          'ARM-CAB-05': 1,
        },
        reorderPoint: 2,
      },
    ],
  },
  {
    id: 'PRD-003',
    masterSku: 'SKU-CAT-5120',
    name: 'Óleo Vegetal Refinado de Soja (Caixa 12x 1L)',
    category: 'Alimentar & Bebidas',
    unitCostKz: 18500,
    unitPriceKz: 23900,
    weightKg: 11.5,
    originCountry: 'Brasil / Ceval',
    batchNumber: 'LOTE-BR-892',
    expiryDate: '2027-11-30',
    barcode: '5601234512030',
    variants: [
      {
        id: 'VAR-003-A',
        skuVariant: 'SKU-CAT-5120-CX12',
        spec: 'Caixa com 12 garrafas PET 1L',
        stockByWarehouse: {
          'ARM-LUA-01': 1420,
          'ARM-LUA-02': 890,
          'ARM-LOB-03': 740,
          'ARM-HUA-04': 380,
          'ARM-CAB-05': 190,
        },
        reorderPoint: 250,
      },
    ],
  },
  {
    id: 'PRD-004',
    masterSku: 'SKU-CAT-7719',
    name: 'Pneu Radial Camião Pesado 315/80 R22.5',
    category: 'Peças & Maquinaria',
    unitCostKz: 195000,
    unitPriceKz: 260000,
    weightKg: 68,
    originCountry: 'África do Sul / Bridgestone',
    batchNumber: 'ZA-2026-T9',
    barcode: '5601234771904',
    variants: [
      {
        id: 'VAR-004-A',
        skuVariant: 'SKU-CAT-7719-DIR',
        spec: 'Eixo Direcional / Longa Distância',
        stockByWarehouse: {
          'ARM-LUA-01': 64,
          'ARM-LUA-02': 38,
          'ARM-LOB-03': 42,
          'ARM-HUA-04': 18,
          'ARM-CAB-05': 12,
        },
        reorderPoint: 15,
      },
      {
        id: 'VAR-004-B',
        skuVariant: 'SKU-CAT-7719-TRAC',
        spec: 'Eixo de Tração / Piso Misto Asfalto-Picada',
        stockByWarehouse: {
          'ARM-LUA-01': 85,
          'ARM-LUA-02': 45,
          'ARM-LOB-03': 50,
          'ARM-HUA-04': 22,
          'ARM-CAB-05': 8,
        },
        reorderPoint: 20,
      },
    ],
  },
  {
    id: 'PRD-005',
    masterSku: 'SKU-CAT-1194',
    name: 'Adubo Composto NPK 12-24-12 (Saco 50kg)',
    category: 'Químicos & Fito',
    unitCostKz: 32000,
    unitPriceKz: 41500,
    weightKg: 50,
    originCountry: 'Marrocos / OCP Group',
    batchNumber: 'MA-NPK-2026',
    barcode: '5601234119409',
    variants: [
      {
        id: 'VAR-005-A',
        skuVariant: 'SKU-CAT-1194-GRA',
        spec: 'Granulado Solúvel Granel Sacaria',
        stockByWarehouse: {
          'ARM-LUA-01': 600,
          'ARM-LUA-02': 150,
          'ARM-LOB-03': 420,
          'ARM-HUA-04': 850, // Forte no Huambo agrícola
          'ARM-CAB-05': 70,
        },
        reorderPoint: 120,
      },
    ],
  },
];

const INITIAL_SHIPMENTS: SupplierShipment[] = [
  {
    id: 'SHP-2026-001',
    shipmentNumber: 'CAT-IMP-2026-089',
    supplierName: 'Perkins Power Systems Ltd (UK)',
    originPort: 'Southampton (Reino Unido)',
    destinationWarehouseId: 'ARM-LUA-02',
    invoiceNumber: 'INV-GB-88419',
    blNumber: 'MSCU-LON-994182',
    duNumber: 'DU-AGT-2026-044129-LUA',
    totalValueKz: 87000000,
    customsTaxKz: 12180000,
    step: 2,
    status: 'alfandega',
    estimatedArrival: '2026-10-24',
    customsStatus: 'Canal Amarelo',
    inspectionNotes: 'Documentação remetida à AGT para verificação do certificado de origem e liquidação de IVA Aduaneiro.',
    items: [
      { masterSku: 'SKU-CAT-3042', productName: 'Gerador a Diesel Trifásico 150 kVA', quantity: 6, unit: 'unidades' },
    ],
  },
  {
    id: 'SHP-2026-002',
    shipmentNumber: 'CAT-IMP-2026-092',
    supplierName: 'Sociedade Cimangola S.A.',
    originPort: 'Fábrica de Cacuaco (Nacional)',
    destinationWarehouseId: 'ARM-LUA-01',
    invoiceNumber: 'FT-CIM-2026-1102',
    blNumber: 'GUIA-REM-00918',
    duNumber: 'ISENTO-NACIONAL',
    totalValueKz: 14400000,
    customsTaxKz: 0,
    step: 3,
    status: 'recebido',
    estimatedArrival: '2026-10-18',
    customsStatus: 'Desembaraçado',
    conformityReport: {
      approvedBy: 'Supervisor Januário Bento',
      date: '2026-10-18',
      discrepancyCount: 0,
      notes: 'Carregamento de 3.000 sacos recebido sem avarias na embalagem. Lote homologado para estocagem no Pavilhão B.',
    },
    items: [
      { masterSku: 'SKU-CAT-8801', productName: 'Cimento Portland Especial 42.5R', quantity: 3000, unit: 'sacos' },
    ],
  },
  {
    id: 'SHP-2026-003',
    shipmentNumber: 'CAT-IMP-2026-095',
    supplierName: 'OCP Africa Nutrientes (Marrocos)',
    originPort: 'Porto de Casablanca',
    destinationWarehouseId: 'ARM-LOB-03',
    invoiceNumber: 'MAR-EXP-55910',
    blNumber: 'CMA-CGM-CAS-7128',
    duNumber: 'DU-AGT-2026-091244-LOB',
    totalValueKz: 48000000,
    customsTaxKz: 5760000,
    step: 1,
    status: 'expedido',
    estimatedArrival: '2026-11-04',
    customsStatus: 'Em Análise',
    inspectionNotes: 'Navio mercante CMA CGM La Tour em navegação atlântica com escala prevista no Porto do Lobito.',
    items: [
      { masterSku: 'SKU-CAT-1194', productName: 'Adubo Composto NPK 12-24-12', quantity: 1500, unit: 'sacos' },
    ],
  },
];

const INITIAL_FLEET: FleetVehicle[] = [
  {
    id: 'FLT-001',
    plate: 'LD-44-88-HA',
    model: 'Volvo FH16 540 Globetrotter (Porta-Contentor)',
    type: 'Camião Porta-Contentor',
    assignedWarehouseId: 'ARM-LUA-01',
    purchaseYear: 2023,
    acquisitionCostKz: 125000000,
    depreciationRateYear: 0.15,
    currentBookValueKz: 81250000,
    monthlyRentalChargeKz: 2800000,
    status: 'Em Rota',
    lastMaintenance: '2026-09-12',
    nextMaintenanceKm: 140000,
    currentKm: 134200,
    driverName: 'António Kapapelo',
  },
  {
    id: 'FLT-002',
    plate: 'LD-92-14-GH',
    model: 'Scania R500 V8 Heavy Hauler',
    type: 'Camião Articulado',
    assignedWarehouseId: 'ARM-LUA-02',
    purchaseYear: 2022,
    acquisitionCostKz: 140000000,
    depreciationRateYear: 0.15,
    currentBookValueKz: 77000000,
    monthlyRentalChargeKz: 3200000,
    status: 'Operacional',
    lastMaintenance: '2026-10-02',
    nextMaintenanceKm: 190000,
    currentKm: 181500,
    driverName: 'Mateus Kissonde',
  },
  {
    id: 'FLT-003',
    plate: 'BG-12-76-BA',
    model: 'Toyota Traigo 80V Empilhador Triplex 5T',
    type: 'Empilhador 5T',
    assignedWarehouseId: 'ARM-LOB-03',
    purchaseYear: 2024,
    acquisitionCostKz: 38000000,
    depreciationRateYear: 0.12,
    currentBookValueKz: 31160000,
    monthlyRentalChargeKz: 1200000,
    status: 'Operacional',
    lastMaintenance: '2026-08-15',
    nextMaintenanceKm: 4000,
    currentKm: 3250,
    driverName: 'Operador Nelson Cafumana',
  },
  {
    id: 'FLT-004',
    plate: 'HB-33-09-CA',
    model: 'Isuzu FVR 900 Carga Seca 15T',
    type: 'Camião Articulado',
    assignedWarehouseId: 'ARM-HUA-04',
    purchaseYear: 2023,
    acquisitionCostKz: 65000000,
    depreciationRateYear: 0.15,
    currentBookValueKz: 42250000,
    monthlyRentalChargeKz: 1950000,
    status: 'Em Manutenção',
    lastMaintenance: '2026-10-15',
    nextMaintenanceKm: 95000,
    currentKm: 94800,
    driverName: 'Afonso Chivela',
  },
  {
    id: 'FLT-005',
    plate: 'CAB-08-41-AA',
    model: 'Jungheinrich ETV 320 Stacker Retrátil',
    type: 'Stacker Elétrico',
    assignedWarehouseId: 'ARM-CAB-05',
    purchaseYear: 2024,
    acquisitionCostKz: 24000000,
    depreciationRateYear: 0.12,
    currentBookValueKz: 19680000,
    monthlyRentalChargeKz: 900000,
    status: 'Operacional',
    lastMaintenance: '2026-07-20',
    nextMaintenanceKm: 3000,
    currentKm: 1820,
    driverName: 'Operadora Teresa Puna',
  },
];

const INITIAL_TRANSFERS: InterWarehouseTransfer[] = [
  {
    id: 'TRF-001',
    transferCode: 'TRF-CAT-2026-041',
    sourceWarehouseId: 'ARM-LUA-01',
    destWarehouseId: 'ARM-HUA-04',
    masterSku: 'SKU-CAT-8801',
    productName: 'Cimento Portland Especial 42.5R',
    variantSpec: 'Palete Fechada 40 Sacos',
    quantity: 35,
    requestedBy: 'Eng. Domingos Tchissola',
    requestDate: '2026-10-16',
    vehiclePlate: 'LD-44-88-HA',
    status: 'Em Trânsito',
    nationalGuideNumber: 'GTN-2026-99014-MINTRANS',
    estimatedArrival: '2026-10-19',
  },
  {
    id: 'TRF-002',
    transferCode: 'TRF-CAT-2026-042',
    sourceWarehouseId: 'ARM-LUA-02',
    destWarehouseId: 'ARM-LOB-03',
    masterSku: 'SKU-CAT-3042',
    productName: 'Gerador a Diesel Trifásico 150 kVA',
    variantSpec: 'Cabinado Super Silencioso',
    quantity: 2,
    requestedBy: 'Sr. Bartolomeu Dias',
    requestDate: '2026-10-17',
    vehiclePlate: 'LD-92-14-GH',
    status: 'Pendente',
    nationalGuideNumber: 'GTN-PENDENTE',
    estimatedArrival: '2026-10-21',
  },
  {
    id: 'TRF-003',
    transferCode: 'TRF-CAT-2026-039',
    sourceWarehouseId: 'ARM-LOB-03',
    destWarehouseId: 'ARM-HUA-04',
    masterSku: 'SKU-CAT-1194',
    productName: 'Adubo Composto NPK 12-24-12',
    variantSpec: 'Granulado Solúvel Granel Sacaria',
    quantity: 120,
    requestedBy: 'Eng. Domingos Tchissola',
    requestDate: '2026-10-12',
    vehiclePlate: 'HB-33-09-CA',
    status: 'Concluído',
    nationalGuideNumber: 'GTN-2026-98112-MINTRANS',
    estimatedArrival: '2026-10-14',
  },
];

// --- HELPER DE MOEDA KWANZA (AOA / Kz) ---

export const formatKz = (value: number): string => {
  return new Intl.NumberFormat('pt-AO', {
    maximumFractionDigits: 0,
  }).format(value) + ' Kz';
};

export const formatKzShort = (value: number): string => {
  if (value >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(2).replace('.', ',') + ' B Kz';
  }
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace('.', ',') + ' M Kz';
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(0) + ' mil Kz';
  }
  return formatKz(value);
};

// --- COMPONENTE PRINCIPAL DO ERP CATASSO ---

export default function App() {
  // Estado de Sessão e Armazém Ativo
  const [session, setSession] = useState<UserSession>({
    id: 'USR-001',
    name: 'Eng. António Catasso',
    email: 'a.catasso@catasso-logistica.co.ao',
    role: 'Superadministrador',
    avatar: 'AC',
    warehouseId: 'ALL', // Global ou armazém específico
  });

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'inventory' | 'shipments' | 'fleets' | 'labels' | 'transfers'
  >('dashboard');

  // Estados dos Dados
  const [warehouses] = useState<WarehouseItem[]>(INITIAL_WAREHOUSES);
  const [products, setProducts] = useState<MasterProduct[]>(INITIAL_PRODUCTS);
  const [shipments, setShipments] = useState<SupplierShipment[]>(INITIAL_SHIPMENTS);
  const [fleet, setFleet] = useState<FleetVehicle[]>(INITIAL_FLEET);
  const [transfers, setTransfers] = useState<InterWarehouseTransfer[]>(INITIAL_TRANSFERS);

  // Modais
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isStockMovementModalOpen, setIsStockMovementModalOpen] = useState(false);
  const [selectedProductForMovement, setSelectedProductForMovement] = useState<MasterProduct | null>(null);
  const [isNewTransferModalOpen, setIsNewTransferModalOpen] = useState(false);
  const [isNewShipmentModalOpen, setIsNewShipmentModalOpen] = useState(false);
  const [isFleetMaintenanceModalOpen, setIsFleetMaintenanceModalOpen] = useState(false);
  const [selectedVehicleForMaint, setSelectedVehicleForMaint] = useState<FleetVehicle | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estados de Filtro & Busca
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Estado para Emissão de Etiqueta
  const [selectedLabelProduct, setSelectedLabelProduct] = useState<MasterProduct>(products[0]);
  const [labelWarehouseId, setLabelWarehouseId] = useState<string>('ARM-LUA-01');
  const [labelBatch, setLabelBatch] = useState<string>(products[0].batchNumber);
  const [labelQuantity, setLabelQuantity] = useState<number>(50);
  const [labelInvoiceRef, setLabelInvoiceRef] = useState<string>('FT-2026-9921');

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Armazém Ativo
  const currentWarehouse = useMemo(() => {
    if (session.warehouseId === 'ALL') return null;
    return warehouses.find((w) => w.id === session.warehouseId) || null;
  }, [session.warehouseId, warehouses]);

  // Cálculos Financeiros e Métricas Globais ou do Armazém Ativo
  const metrics = useMemo(() => {
    let totalStockValueKz = 0;
    let totalUnitsInStock = 0;
    let lowStockCount = 0;

    products.forEach((prod) => {
      prod.variants.forEach((v) => {
        let qty = 0;
        if (session.warehouseId === 'ALL') {
          qty = Object.values(v.stockByWarehouse).reduce((acc, curr) => acc + curr, 0);
        } else {
          qty = v.stockByWarehouse[session.warehouseId] || 0;
        }

        totalUnitsInStock += qty;
        totalStockValueKz += qty * prod.unitCostKz;

        if (qty <= v.reorderPoint) {
          lowStockCount += 1;
        }
      });
    });

    const activeFleetCount = fleet.filter((f) => {
      if (session.warehouseId !== 'ALL' && f.assignedWarehouseId !== session.warehouseId) return false;
      return f.status === 'Operacional' || f.status === 'Em Rota';
    }).length;

    const monthlyRentalCostKz = fleet
      .filter((f) => session.warehouseId === 'ALL' || f.assignedWarehouseId === session.warehouseId)
      .reduce((acc, curr) => acc + curr.monthlyRentalChargeKz, 0);

    const pendingCustomsTaxKz = shipments
      .filter((s) => s.status === 'alfandega')
      .reduce((acc, curr) => acc + curr.customsTaxKz, 0);

    const totalShipmentsInTransitValueKz = shipments
      .filter((s) => s.status === 'expedido' || s.status === 'alfandega')
      .reduce((acc, curr) => acc + curr.totalValueKz, 0);

    return {
      totalStockValueKz,
      totalUnitsInStock,
      lowStockCount,
      activeFleetCount,
      monthlyRentalCostKz,
      pendingCustomsTaxKz,
      totalShipmentsInTransitValueKz,
    };
  }, [products, session.warehouseId, fleet, shipments]);

  // Handlers
  const handleRoleWarehouseSwitch = (newRole: UserRole, newWarehouseId: string) => {
    setSession((prev) => ({
      ...prev,
      role: newRole,
      warehouseId: newWarehouseId,
    }));
    setIsLoginModalOpen(false);
    showToast(`Sessão alterada para perfil: ${newRole} (${newWarehouseId === 'ALL' ? 'Visão Global' : newWarehouseId})`);
  };

  const handleStockMovement = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProductForMovement) return;

    const formData = new FormData(e.currentTarget);
    const movementType = formData.get('type') as 'ENTRADA' | 'SAIDA';
    const variantId = formData.get('variantId') as string;
    const warehouseTarget = formData.get('warehouseId') as string;
    const quantity = parseInt(formData.get('quantity') as string, 10);
    const justification = formData.get('justification') as string;

    if (isNaN(quantity) || quantity <= 0) {
      alert('Por favor insira uma quantidade válida.');
      return;
    }

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== selectedProductForMovement.id) return p;
        return {
          ...p,
          variants: p.variants.map((v) => {
            if (v.id !== variantId) return v;
            const currentStock = v.stockByWarehouse[warehouseTarget] || 0;
            const newStock =
              movementType === 'ENTRADA'
                ? currentStock + quantity
                : Math.max(0, currentStock - quantity);
            return {
              ...v,
              stockByWarehouse: {
                ...v.stockByWarehouse,
                [warehouseTarget]: newStock,
              },
            };
          }),
        };
      })
    );

    setIsStockMovementModalOpen(false);
    showToast(
      `Movimento de ${movementType} de ${quantity} un efetuado com sucesso no ${warehouseTarget}! (${justification})`
    );
  };

  const handleApproveTransfer = (transferId: string) => {
    setTransfers((prev) =>
      prev.map((t) => {
        if (t.id !== transferId) return t;
        const nextStatus = t.status === 'Pendente' ? 'Em Trânsito' : 'Concluído';
        return {
          ...t,
          status: nextStatus,
          nationalGuideNumber:
            t.nationalGuideNumber === 'GTN-PENDENTE'
              ? `GTN-2026-${Math.floor(10000 + Math.random() * 90000)}-MINTRANS`
              : t.nationalGuideNumber,
        };
      })
    );
    showToast('Estado da Transferência Inter-Armazéns atualizado com sucesso!');
  };

  const handleAdvanceShipmentStep = (shipmentId: string) => {
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipmentId) return s;
        if (s.step === 1) {
          return {
            ...s,
            step: 2,
            status: 'alfandega',
            customsStatus: 'Canal Amarelo',
            inspectionNotes: 'Mercadoria atracada no porto/aeroporto. Documentos em validação pela AGT.',
          };
        } else if (s.step === 2) {
          return {
            ...s,
            step: 3,
            status: 'recebido',
            customsStatus: 'Desembaraçado',
            conformityReport: {
              approvedBy: `${session.name} (${session.role})`,
              date: '2026-10-18',
              discrepancyCount: 0,
              notes: 'Despacho alfandegário concluído. Entrada conferida física e documentalmente sem não-conformidades.',
            },
          };
        }
        return s;
      })
    );
    showToast('Envio de fornecedor avançou para a etapa seguinte com sucesso!');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* TOAST DE NOTIFICAÇÃO DO ERP */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-emerald-950 border border-emerald-500/50 text-emerald-200 px-5 py-3 rounded-xl shadow-2xl shadow-emerald-950/80 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* CABEÇALHO CORPORATIVO SUPERIOR */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Marca CATASSO */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-wider text-white">CATASSO</span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/40 px-1.5 py-0.5 rounded">
                  ERP Logística
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  🇦🇴 Angola (Kz / AOA)
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Cadeia de Abastecimento & Gestão Multi-Armazém Enterprise
              </p>
            </div>
          </div>

          {/* Seletores Centrais: Armazém Ativo & Indicador */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 shadow-inner">
              <Warehouse className="w-4 h-4 text-blue-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Armazém Ativo</span>
                <select
                  value={session.warehouseId}
                  onChange={(e) => setSession((prev) => ({ ...prev, warehouseId: e.target.value }))}
                  className="bg-transparent text-sm font-semibold text-slate-100 focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900 text-slate-200">
                    🌐 Visão Global (Todos os Armazéns)
                  </option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id} className="bg-slate-900 text-slate-200">
                      {w.code} - {w.name} ({w.province})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Perfil & Troca de Sessão */}
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg px-3 py-1.5 transition text-left group"
              title="Trocar perfil ou armazém de início de sessão"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-xs font-bold text-blue-300 group-hover:border-blue-400">
                {session.avatar}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                  {session.name}
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
                <div className="text-[10px] font-medium text-emerald-400">{session.role}</div>
              </div>
            </button>
          </div>
        </div>

        {/* Barra de Navegação dos Módulos Principais */}
        <div className="max-w-7xl mx-auto mt-3 pt-2 border-t border-slate-800/60 flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard Executivo
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Boxes className="w-4 h-4" />
            Inventário SKU Mestre
            <span className="text-[10px] bg-slate-900/60 text-slate-300 px-1.5 py-0.2 rounded-full border border-slate-700">
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('shipments')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'shipments'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Ship className="w-4 h-4" />
            Envios de Fornecedores & AGT
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full border border-amber-500/40">
              {shipments.filter((s) => s.status !== 'recebido').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('transfers')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'transfers'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Transferências Inter-Armazéns
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded-full border border-blue-500/40">
              {transfers.filter((t) => t.status === 'Em Trânsito' || t.status === 'Pendente').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('fleets')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'fleets'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Truck className="w-4 h-4" />
            Frotas & Equipamentos
          </button>

          <button
            onClick={() => setActiveTab('labels')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'labels'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Etiquetas & Rastreio QR
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DINÂMICO */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* BANNER INFORMATIVO DO ARMAZÉM SELECIONADO */}
        {currentWarehouse ? (
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">
                    {currentWarehouse.code} - {currentWarehouse.name}
                  </h2>
                  <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    {currentWarehouse.city}, {currentWarehouse.province}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Responsável: <span className="text-slate-200 font-medium">{currentWarehouse.manager}</span> •
                  Contacto: {currentWarehouse.phone} • Operadores: {currentWarehouse.activeStaff}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
              <div className="text-right">
                <div className="text-xs text-slate-400">Capacidade Operacional</div>
                <div className="text-sm font-bold text-slate-200">
                  {currentWarehouse.usedCapacityM3.toLocaleString()} / {currentWarehouse.capacityM3.toLocaleString()} m³
                </div>
              </div>
              <div className="w-24 bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
                <div
                  className={`h-full rounded-full ${
                    currentWarehouse.usedCapacityM3 / currentWarehouse.capacityM3 > 0.85
                      ? 'bg-rose-500'
                      : currentWarehouse.usedCapacityM3 / currentWarehouse.capacityM3 > 0.65
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${(currentWarehouse.usedCapacityM3 / currentWarehouse.capacityM3) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Rede Nacional de Entrepostos Logísticos (Angola)
                  <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    5 Armazéns Ativos
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Hubs em Luanda (Viana & Porto), Benguela (Lobito), Huambo e Cabinda interligados em tempo real.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsNewTransferModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Nova Transferência Inter-Armazém
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: DASHBOARD EXECUTIVO                               */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Linha de KPIs Principais em Kwanzas (Kz) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1 */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden shadow">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs uppercase font-bold tracking-wider">Valor em Stock (AOA)</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-white">
                  {formatKz(metrics.totalStockValueKz)}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+14.2% face ao trimestre anterior</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {metrics.totalUnitsInStock.toLocaleString()} unidades contabilizadas
                </div>
              </div>

              {/* KPI 2 */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden shadow">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs uppercase font-bold tracking-wider">Carga Internacional em Rota</span>
                  <Ship className="w-4 h-4 text-blue-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-white">
                  {formatKz(metrics.totalShipmentsInTransitValueKz)}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-blue-400">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Taxas AGT Estimadas: {formatKz(metrics.pendingCustomsTaxKz)}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {shipments.filter((s) => s.status !== 'recebido').length} despachos em curso
                </div>
              </div>

              {/* KPI 3 */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden shadow">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs uppercase font-bold tracking-wider">Custos Mensais de Frota</span>
                  <Truck className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-white">
                  {formatKz(metrics.monthlyRentalCostKz)}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-amber-400">
                  <span>{metrics.activeFleetCount} Viaturas & Máquinas em Atividade</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Imputação de aluguer interno & depreciação
                </div>
              </div>

              {/* KPI 4 */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden shadow">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs uppercase font-bold tracking-wider">Alertas de Stock & Risco</span>
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-white">
                  {metrics.lowStockCount}{' '}
                  <span className="text-sm font-semibold text-rose-400">Ponto de Encomenda</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Necessidade de reposição imediata</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Baseado no lead time alfandegário de Luanda
                </div>
              </div>
            </div>

            {/* Gráficos Visuais e Ocupação dos Armazéns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Ocupação e Capacidade por Armazém */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                      Capacidade & Taxa de Ocupação dos Armazéns (m³)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Monitorização volumétrica em tempo real dos entrepostos provinciais
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                    Média Nacional: 66.8%
                  </span>
                </div>

                <div className="space-y-4">
                  {warehouses.map((w) => {
                    const pct = Math.round((w.usedCapacityM3 / w.capacityM3) * 100);
                    return (
                      <div key={w.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{w.name}</span>
                            <span className="text-[10px] text-slate-400">({w.city}, {w.province})</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-slate-300">
                              {w.usedCapacityM3.toLocaleString()} / {w.capacityM3.toLocaleString()} m³
                            </span>
                            <span
                              className={`ml-2 font-bold ${
                                pct > 80 ? 'text-rose-400' : pct > 65 ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            >
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              pct > 80
                                ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                                : pct > 65
                                ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                                : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Fluxo de Entradas vs Saídas Mensais (AOA) */}
                <div className="mt-6 pt-5 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Fluxo de Mercadorias nos Últimos 4 Meses (Milhões Kz)
                  </h4>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    {[
                      { month: 'Julho', inKz: 420, outKz: 510 },
                      { month: 'Agosto', inKz: 590, outKz: 480 },
                      { month: 'Setembro', inKz: 680, outKz: 620 },
                      { month: 'Outubro (Atual)', inKz: 810, outKz: 740 },
                    ].map((m, idx) => (
                      <div key={idx} className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                        <div className="text-xs font-semibold text-slate-400">{m.month}</div>
                        <div className="flex justify-center items-end gap-2 h-20 mt-2">
                          <div className="flex flex-col items-center">
                            <div
                              className="w-4 bg-emerald-500 rounded-t"
                              style={{ height: `${(m.inKz / 900) * 100}%` }}
                              title={`Entradas: ${m.inKz}M Kz`}
                            />
                            <span className="text-[9px] text-emerald-400 mt-1">E</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div
                              className="w-4 bg-blue-500 rounded-t"
                              style={{ height: `${(m.outKz / 900) * 100}%` }}
                              title={`Saídas: ${m.outKz}M Kz`}
                            />
                            <span className="text-[9px] text-blue-400 mt-1">S</span>
                          </div>
                        </div>
                        <div className="text-[10px] font-bold text-slate-300 mt-1">
                          {m.outKz}M Kz
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Entradas / Compras Fornecedores
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Saídas Faturadas / Despachos
                    </span>
                  </div>
                </div>
              </div>

              {/* Painel Lateral: Alertas e Atividade Rápida */}
              <div className="space-y-6">
                {/* Despacho Alfandegário Rápido */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <Ship className="w-4 h-4 text-amber-400" />
                    Processos AGT em Luanda & Lobito
                  </h3>
                  <div className="space-y-3">
                    {shipments.map((shp) => (
                      <div
                        key={shp.id}
                        className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-400">{shp.shipmentNumber}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              shp.customsStatus.includes('Verde')
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : shp.customsStatus.includes('Amarelo')
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : shp.customsStatus.includes('Desembaraçado')
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {shp.customsStatus}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-200 mt-1 truncate">
                          {shp.supplierName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1.5">
                          <span>DU: {shp.duNumber}</span>
                          <span className="font-bold text-emerald-400">{formatKz(shp.totalValueKz)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setActiveTab('shipments')}
                    className="w-full mt-3 py-2 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-950/40 border border-blue-800/40 rounded-lg transition"
                  >
                    Ver Rastreio Completo em 3 Passos →
                  </button>
                </div>

                {/* Transferências Inter-Armazéns em Rota */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                    Rotas Inter-Provinciais em Trânsito
                  </h3>
                  <div className="space-y-3">
                    {transfers.slice(0, 2).map((trf) => (
                      <div key={trf.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-200">{trf.transferCode}</span>
                          <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">
                            {trf.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                          <span>{trf.sourceWarehouseId.split('-')[1]}</span>
                          <span>→</span>
                          <span className="text-white font-medium">{trf.destWarehouseId.split('-')[1]}</span>
                          <span>• {trf.productName} ({trf.quantity} un)</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Viatura: {trf.vehiclePlate} | Guia: {trf.nationalGuideNumber}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: INVENTÁRIO SKU MESTRE                             */}
        {/* ========================================================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Barra de Ações & Filtros */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-3 w-full">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar por SKU Mestre, Nome, Código de Barras, Lote..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="ALL">Todas as Categorias</option>
                    <option value="Construção & Obras">Construção & Obras</option>
                    <option value="Eletrodomésticos & Energia">Eletrodomésticos & Energia</option>
                    <option value="Alimentar & Bebidas">Alimentar & Bebidas</option>
                    <option value="Peças & Maquinaria">Peças & Maquinaria</option>
                    <option value="Químicos & Fito">Químicos & Fito</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => setIsNewProductModalOpen(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-lg shadow-blue-600/20"
                >
                  <Plus className="w-4 h-4" />
                  Novo SKU Mestre
                </button>
              </div>
            </div>

            {/* Tabela de Produtos SKU Mestre com Variantes Locais */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="p-3.5 pl-5">SKU Mestre & Produto</th>
                      <th className="p-3.5">Categoria</th>
                      <th className="p-3.5 text-right">Custo Unitário (Kz)</th>
                      <th className="p-3.5 text-right">PVP Estimado (Kz)</th>
                      <th className="p-3.5">Variantes & Stock Local</th>
                      <th className="p-3.5 text-center">Total {session.warehouseId === 'ALL' ? 'Global' : 'Armazém'}</th>
                      <th className="p-3.5 text-right pr-5">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {products
                      .filter((p) => {
                        const matchesSearch =
                          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.masterSku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
                        return matchesSearch && matchesCat;
                      })
                      .map((prod) => {
                        // Total stock for this product in current context
                        let totalQty = 0;
                        prod.variants.forEach((v) => {
                          if (session.warehouseId === 'ALL') {
                            totalQty += Object.values(v.stockByWarehouse).reduce((a, b) => a + b, 0);
                          } else {
                            totalQty += v.stockByWarehouse[session.warehouseId] || 0;
                          }
                        });

                        return (
                          <tr key={prod.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5 pl-5">
                              <div className="font-bold text-slate-100 flex items-center gap-2">
                                <span className="text-blue-400 font-mono text-[11px] bg-blue-950 px-2 py-0.5 rounded border border-blue-800/50">
                                  {prod.masterSku}
                                </span>
                                <span>{prod.name}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                                <span>Origem: {prod.originCountry}</span>
                                <span>• Lote: {prod.batchNumber}</span>
                                <span>• EAN: {prod.barcode}</span>
                              </div>
                            </td>

                            <td className="p-3.5">
                              <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700">
                                {prod.category}
                              </span>
                            </td>

                            <td className="p-3.5 text-right font-mono font-semibold text-slate-200">
                              {formatKz(prod.unitCostKz)}
                            </td>

                            <td className="p-3.5 text-right font-mono font-semibold text-emerald-400">
                              {formatKz(prod.unitPriceKz)}
                            </td>

                            <td className="p-3.5">
                              <div className="space-y-1">
                                {prod.variants.map((v) => {
                                  const localQty =
                                    session.warehouseId === 'ALL'
                                      ? Object.values(v.stockByWarehouse).reduce((a, b) => a + b, 0)
                                      : v.stockByWarehouse[session.warehouseId] || 0;

                                  const isLow = localQty <= v.reorderPoint;

                                  return (
                                    <div
                                      key={v.id}
                                      className="flex items-center justify-between gap-3 text-[11px] bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800"
                                    >
                                      <span className="text-slate-300 font-medium truncate max-w-[200px]">
                                        {v.spec}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className={`font-mono font-bold ${isLow ? 'text-rose-400' : 'text-slate-200'}`}>
                                          {localQty} un
                                        </span>
                                        {isLow && (
                                          <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1 rounded border border-rose-500/40">
                                            Repor
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>

                            <td className="p-3.5 text-center font-bold text-sm">
                              <span className="text-white font-mono">{totalQty.toLocaleString()}</span>
                            </td>

                            <td className="p-3.5 text-right pr-5">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedProductForMovement(prod);
                                    setIsStockMovementModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-blue-300 rounded border border-slate-700 transition"
                                  title="Dar entrada ou saída rápida"
                                >
                                  Movimento
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedLabelProduct(prod);
                                    setLabelBatch(prod.batchNumber);
                                    setActiveTab('labels');
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition"
                                  title="Gerar Etiqueta QR"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: ENVIOS DE FORNECEDORES (RASTREIO EM 3 PASSOS)      */}
        {/* ========================================================= */}
        {activeTab === 'shipments' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Ship className="w-5 h-5 text-blue-400" />
                  Rastreio & Desembaraço Alfandegário em 3 Passos (Angola)
                </h2>
                <p className="text-xs text-slate-400">
                  Fluxo regulamentado: 1. Expedição / Fatura → 2. Despacho AGT Luanda/Lobito → 3. Auto de Conformidade
                </p>
              </div>
              <button
                onClick={() => setIsNewShipmentModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow"
              >
                <Plus className="w-4 h-4" />
                Registar Novo Envio
              </button>
            </div>

            {/* Lista dos Envios com Visualizador de 3 Passos */}
            <div className="space-y-6">
              {shipments.map((shp) => {
                const destWarehouse = warehouses.find((w) => w.id === shp.destinationWarehouseId);

                return (
                  <div
                    key={shp.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4"
                  >
                    {/* Cabeçalho do Envio */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white">{shp.shipmentNumber}</span>
                          <span className="text-xs font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                            {shp.supplierName}
                          </span>
                          <span className="text-xs text-slate-400">
                            Origem: {shp.originPort} → Destino: {destWarehouse?.name} ({destWarehouse?.province})
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-4">
                          <span>Fatura Com.: <strong className="text-slate-200">{shp.invoiceNumber}</strong></span>
                          <span>B/L Guia: <strong className="text-slate-200">{shp.blNumber}</strong></span>
                          <span>DU AGT: <strong className="text-slate-200">{shp.duNumber}</strong></span>
                          <span>Chegada Estimada: <strong className="text-slate-200">{shp.estimatedArrival}</strong></span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-400">Valor da Carga (AOA)</div>
                        <div className="text-lg font-black text-emerald-400 font-mono">
                          {formatKz(shp.totalValueKz)}
                        </div>
                        <div className="text-[10px] text-amber-400">
                          Direitos / Taxas AGT: {formatKz(shp.customsTaxKz)}
                        </div>
                      </div>
                    </div>

                    {/* PIPELINE EM 3 PASSOS INTERATIVO */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      {/* PASSO 1: Expedição & Documentação */}
                      <div
                        className={`p-4 rounded-xl border relative transition ${
                          shp.step >= 1
                            ? 'bg-slate-950/80 border-blue-600/40 text-slate-200'
                            : 'bg-slate-950/30 border-slate-800/60 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-400">
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                              1
                            </span>
                            Expedição & Carga
                          </span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p className="text-xs text-slate-300">
                          Fatura comercial anexada e manifesto marítimo emitido. Em trânsito marítimo/rodoviário.
                        </p>
                        <div className="mt-2 text-[10px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
                          Manifesto B/L: {shp.blNumber}
                        </div>
                      </div>

                      {/* PASSO 2: Despacho Alfandegário AGT */}
                      <div
                        className={`p-4 rounded-xl border relative transition ${
                          shp.step >= 2
                            ? 'bg-slate-950/80 border-amber-600/40 text-slate-200'
                            : 'bg-slate-950/30 border-slate-800/60 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-400">
                            <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">
                              2
                            </span>
                            Despacho Alfandegário (AGT)
                          </span>
                          {shp.step > 2 ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                          )}
                        </div>
                        <p className="text-xs text-slate-300">
                          Canal atribuído: <strong className="text-amber-400">{shp.customsStatus}</strong>.
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">{shp.inspectionNotes}</p>
                        {shp.step === 2 && (
                          <button
                            onClick={() => handleAdvanceShipmentStep(shp.id)}
                            className="mt-3 w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-1.5 rounded text-xs transition flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Aprovar Desembaraço Alfandegário
                          </button>
                        )}
                      </div>

                      {/* PASSO 3: Receção & Auto de Conformidade */}
                      <div
                        className={`p-4 rounded-xl border relative transition ${
                          shp.step >= 3
                            ? 'bg-slate-950/80 border-emerald-600/40 text-slate-200'
                            : 'bg-slate-950/30 border-slate-800/60 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-400">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                              3
                            </span>
                            Receção & Auto Técnico
                          </span>
                          {shp.step === 3 ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <span className="text-[10px] text-slate-500">Pendente</span>
                          )}
                        </div>
                        {shp.conformityReport ? (
                          <div className="space-y-1 text-xs">
                            <p className="text-emerald-300 font-medium">✓ Auto de Entrada Homologado</p>
                            <p className="text-slate-400 text-[11px]">{shp.conformityReport.notes}</p>
                            <div className="text-[10px] text-slate-500 pt-1">
                              Conferido por: {shp.conformityReport.approvedBy} ({shp.conformityReport.date})
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">
                            Aguardando conclusão do desembaraço alfandegário no terminal marítimo para vistoria física.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Itens do Envio */}
                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Mercadorias neste Embarque:
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {shp.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2"
                          >
                            <span className="font-mono text-blue-400">{item.masterSku}</span>
                            <span className="text-slate-200">{item.productName}</span>
                            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: TRANSFERÊNCIAS INTER-ARMAZÉNS                      */}
        {/* ========================================================= */}
        {activeTab === 'transfers' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-blue-400" />
                  Transferências & Logística Inter-Armazéns de Angola
                </h2>
                <p className="text-xs text-slate-400">
                  Gestão de remessas entre Luanda, Benguela, Huambo e Cabinda com Guia de Transporte Nacional
                </p>
              </div>
              <button
                onClick={() => setIsNewTransferModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow"
              >
                <Plus className="w-4 h-4" />
                Criar Solicitação de Transferência
              </button>
            </div>

            {/* Tabela de Transferências */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="p-3.5 pl-5">Código & Guia Nacional</th>
                      <th className="p-3.5">Origem → Destino</th>
                      <th className="p-3.5">Artigo Transferido</th>
                      <th className="p-3.5 text-center">Quantidade</th>
                      <th className="p-3.5">Viatura Alocada</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5 text-right pr-5">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {transfers.map((trf) => {
                      const src = warehouses.find((w) => w.id === trf.sourceWarehouseId);
                      const dst = warehouses.find((w) => w.id === trf.destWarehouseId);

                      return (
                        <tr key={trf.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 pl-5">
                            <div className="font-bold text-slate-100">{trf.transferCode}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {trf.nationalGuideNumber}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Sol.: {trf.requestedBy} ({trf.requestDate})
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                              <span className="text-slate-400">{src?.code} ({src?.province})</span>
                              <span>→</span>
                              <span className="text-blue-400">{dst?.code} ({dst?.province})</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Prev. Chegada: {trf.estimatedArrival}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-medium text-slate-200">{trf.productName}</div>
                            <div className="text-[11px] text-slate-400">{trf.variantSpec}</div>
                            <div className="font-mono text-[10px] text-blue-400">{trf.masterSku}</div>
                          </td>

                          <td className="p-3.5 text-center font-bold font-mono text-sm text-white">
                            {trf.quantity} un
                          </td>

                          <td className="p-3.5">
                            <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 font-mono text-slate-300">
                              {trf.vehiclePlate}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                                trf.status === 'Concluído'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                  : trf.status === 'Em Trânsito'
                                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              }`}
                            >
                              {trf.status}
                            </span>
                          </td>

                          <td className="p-3.5 text-right pr-5">
                            {trf.status !== 'Concluído' && (
                              <button
                                onClick={() => handleApproveTransfer(trf.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow"
                              >
                                {trf.status === 'Pendente' ? 'Despachar Carga' : 'Confirmar Receção'}
                              </button>
                            )}
                            {trf.status === 'Concluído' && (
                              <span className="text-[11px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Arquivado
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: FROTAS & EQUIPAMENTOS                             */}
        {/* ========================================================= */}
        {activeTab === 'fleets' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-400" />
                  Gestão de Frotas, Empilhadores & Equipamentos
                </h2>
                <p className="text-xs text-slate-400">
                  Alocação por entreposto, depreciação contabilística anual e imputação de custos em AOA
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-slate-400">Custo Mensal de Aluguer Imputado</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono">
                    {formatKz(metrics.monthlyRentalCostKz)}
                  </div>
                </div>
              </div>
            </div>

            {/* Cartões de Viaturas & Máquinas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {fleet.map((veh) => {
                const assignedWh = warehouses.find((w) => w.id === veh.assignedWarehouseId);
                const kmUntilMaintenance = veh.nextMaintenanceKm - veh.currentKm;
                const isMaintenanceClose = kmUntilMaintenance < 1500;

                return (
                  <div
                    key={veh.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-4 hover:border-slate-700 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold bg-slate-950 text-blue-400 px-2 py-0.5 rounded border border-blue-900">
                          {veh.plate}
                        </span>
                        <h3 className="text-sm font-bold text-white mt-1.5">{veh.model}</h3>
                        <p className="text-xs text-slate-400">{veh.type}</p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          veh.status === 'Operacional'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : veh.status === 'Em Rota'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        }`}
                      >
                        {veh.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Armazém Alocado:</span>
                        <span className="font-semibold text-slate-200">{assignedWh?.code} ({assignedWh?.province})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Motorista / Operador:</span>
                        <span className="font-semibold text-slate-200">{veh.driverName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Aluguer / Custo Mensal:</span>
                        <span className="font-bold text-emerald-400 font-mono">
                          {formatKz(veh.monthlyRentalChargeKz)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Valor Contabilístico:</span>
                        <span className="font-mono text-slate-300">
                          {formatKz(veh.currentBookValueKz)} (Dep. {veh.depreciationRateYear * 100}%/ano)
                        </span>
                      </div>
                    </div>

                    {/* Manutenção & Quilometragem */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          Odómetro: <strong>{veh.currentKm.toLocaleString()} km</strong>
                        </span>
                        <span className={`text-[11px] font-bold ${isMaintenanceClose ? 'text-amber-400' : 'text-slate-400'}`}>
                          Próx. Revisão: {veh.nextMaintenanceKm.toLocaleString()} km
                        </span>
                      </div>

                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full ${isMaintenanceClose ? 'bg-amber-500' : 'bg-blue-500'}`}
                          style={{
                            width: `${Math.min(100, (veh.currentKm / veh.nextMaintenanceKm) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setSelectedVehicleForMaint(veh);
                          setIsFleetMaintenanceModalOpen(true);
                        }}
                        className="w-full py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                      >
                        Registar Manutenção / Ocorrência
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: EMISSÃO DE ETIQUETAS & QR CODE                    */}
        {/* ========================================================= */}
        {activeTab === 'labels' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Painel Esquerdo: Configurador da Etiqueta */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-4">
              <div className="flex items-center gap-2 text-white">
                <QrCode className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold">Configurador de Etiqueta Logística</h2>
              </div>
              <p className="text-xs text-slate-400">
                Gere e imprima etiquetas normalizadas padrão Catasso com rastreabilidade de lote e armazém.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Produto (SKU Mestre)</label>
                  <select
                    value={selectedLabelProduct.id}
                    onChange={(e) => {
                      const p = products.find((x) => x.id === e.target.value);
                      if (p) {
                        setSelectedLabelProduct(p);
                        setLabelBatch(p.batchNumber);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.masterSku} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Armazém de Destino</label>
                    <select
                      value={labelWarehouseId}
                      onChange={(e) => setLabelWarehouseId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.code} - {w.province}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Qtd / Embalagem</label>
                    <input
                      type="number"
                      value={labelQuantity}
                      onChange={(e) => setLabelQuantity(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Número do Lote</label>
                    <input
                      type="text"
                      value={labelBatch}
                      onChange={(e) => setLabelBatch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Fatura / Despacho Ref.</label>
                    <input
                      type="text"
                      value={labelInvoiceRef}
                      onChange={(e) => setLabelInvoiceRef(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    window.print();
                    showToast('Comando de impressão enviado para a impressora de etiquetas térmica!');
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg text-xs transition shadow-lg shadow-blue-600/30"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Etiqueta Térmica (Zebra / GS1)
                </button>
              </div>
            </div>

            {/* Painel Direito: Pré-visualização da Etiqueta Industrial */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow flex flex-col items-center justify-center">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 self-start">
                Pré-visualização da Etiqueta (Dimensão 100mm x 150mm)
              </div>

              {/* Cartão Físico da Etiqueta (Estilo Industrial Branco com Contrastes Fortes) */}
              <div className="w-full max-w-md bg-white text-slate-950 rounded-lg p-6 shadow-2xl border-4 border-slate-900 font-sans select-none">
                {/* Header da Etiqueta */}
                <div className="flex items-center justify-between border-b-2 border-slate-950 pb-3">
                  <div>
                    <span className="text-xl font-black tracking-tighter">CATASSO ERP</span>
                    <div className="text-[10px] font-bold text-slate-600 tracking-wider">
                      LOGÍSTICA INTEGRADA ANGOLA
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black bg-slate-950 text-white px-2 py-0.5 rounded">
                      {labelWarehouseId}
                    </span>
                    <div className="text-[9px] font-semibold text-slate-500 mt-0.5">
                      {warehouses.find((w) => w.id === labelWarehouseId)?.province}
                    </div>
                  </div>
                </div>

                {/* SKU & Descrição */}
                <div className="py-3 border-b-2 border-slate-950">
                  <div className="text-[10px] uppercase font-bold text-slate-500">SKU MESTRE</div>
                  <div className="text-2xl font-black font-mono tracking-tight text-slate-950">
                    {selectedLabelProduct.masterSku}
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                    {selectedLabelProduct.name}
                  </div>
                </div>

                {/* Bloco de Dados Técnicos */}
                <div className="grid grid-cols-2 gap-2 py-3 border-b-2 border-slate-950 text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500">Lote Industrial:</span>
                    <div className="font-mono font-bold text-slate-950">{labelBatch}</div>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500">Qtd Na Embalagem:</span>
                    <div className="font-mono font-bold text-slate-950">{labelQuantity} UNIDADES</div>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500">Fatura de Entrada:</span>
                    <div className="font-mono font-bold text-slate-950">{labelInvoiceRef}</div>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500">País de Origem:</span>
                    <div className="font-semibold text-slate-950">{selectedLabelProduct.originCountry}</div>
                  </div>
                </div>

                {/* QR CODE Vetorial Nítido Simulado com Dados Reais */}
                <div className="pt-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase text-slate-500">Rastreabilidade QR</div>
                    <div className="text-[9px] text-slate-600 max-w-[200px] font-mono leading-tight">
                      CATASSO://SKU:{selectedLabelProduct.masterSku}#LOTE:{labelBatch}#WH:{labelWarehouseId}
                    </div>
                    <div className="text-[9px] font-bold text-slate-700 pt-1">
                      Data Emissão: 18/10/2026 11:30
                    </div>
                  </div>

                  {/* QR Code SVG */}
                  <div className="p-2 border-2 border-slate-950 rounded bg-white">
                    <svg className="w-24 h-24" viewBox="0 0 100 100" fill="currentColor">
                      {/* Canto Sup Esq */}
                      <rect x="5" y="5" width="30" height="30" />
                      <rect x="10" y="10" width="20" height="20" fill="white" />
                      <rect x="15" y="15" width="10" height="10" />

                      {/* Canto Sup Dir */}
                      <rect x="65" y="5" width="30" height="30" />
                      <rect x="70" y="10" width="20" height="20" fill="white" />
                      <rect x="75" y="15" width="10" height="10" />

                      {/* Canto Inf Esq */}
                      <rect x="5" y="65" width="30" height="30" />
                      <rect x="10" y="70" width="20" height="20" fill="white" />
                      <rect x="15" y="75" width="10" height="10" />

                      {/* Padrão de dados simulado */}
                      <rect x="45" y="10" width="5" height="15" />
                      <rect x="55" y="5" width="5" height="20" />
                      <rect x="40" y="35" width="20" height="5" />
                      <rect x="10" y="45" width="25" height="5" />
                      <rect x="45" y="45" width="10" height="10" />
                      <rect x="65" y="45" width="15" height="5" />
                      <rect x="45" y="65" width="15" height="5" />
                      <rect x="70" y="60" width="5" height="25" />
                      <rect x="80" y="70" width="15" height="5" />
                      <rect x="45" y="80" width="10" height="15" />
                    </svg>
                  </div>
                </div>

                {/* Código de Barras Linear no Rodapé */}
                <div className="mt-4 pt-2 border-t border-slate-400 text-center">
                  <div className="font-mono text-[9px] text-slate-700 tracking-[0.3em] font-bold">
                    |||||| | |||||||| || ||||| |||| || |||||||||| ||||
                  </div>
                  <div className="font-mono text-[10px] text-slate-900 mt-0.5">
                    {selectedLabelProduct.barcode}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: SELEÇÃO DE PERFIL / INÍCIO DE SESSÃO            */}
      {/* ========================================================= */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Sessão & Perfil de Acesso</h3>
                  <p className="text-xs text-slate-400">Selecione o perfil operacional e armazém em Angola</p>
                </div>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Perfis Disponíveis */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Perfis Predefinidos:
              </label>
              {[
                {
                  role: 'Superadministrador' as UserRole,
                  wh: 'ALL',
                  name: 'Eng. António Catasso',
                  desc: 'Acesso irrestrito a todos os armazéns, métricas financeiras globais e transferências',
                },
                {
                  role: 'Gestor de Armazém' as UserRole,
                  wh: 'ARM-LUA-01',
                  name: 'Eng. Manuel Catasso',
                  desc: 'Gestão operacional de estoque, capacidade e pessoal do Pólo de Viana',
                },
                {
                  role: 'Supervisor' as UserRole,
                  wh: 'ARM-LUA-02',
                  name: 'Dra. Esperança Panzo',
                  desc: 'Aprovação de autos de conformidade e conferência física no Porto de Luanda',
                },
                {
                  role: 'Responsável de Frotas' as UserRole,
                  wh: 'ARM-LOB-03',
                  name: 'Sr. Bartolomeu Dias',
                  desc: 'Controlo de camiões porta-contentor, empilhadores e custos de manutenção',
                },
                {
                  role: 'Atendente' as UserRole,
                  wh: 'ARM-HUA-04',
                  name: 'Eng. Domingos Tchissola',
                  desc: 'Registo de saídas no balcão e emissão rápida de etiquetas de expedição',
                },
                {
                  role: 'Fornecedor' as UserRole,
                  wh: 'ALL',
                  name: 'Perkins Power Systems Rep.',
                  desc: 'Consulta de status de despachos alfandegários e faturas pendentes',
                },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRoleWarehouseSwitch(item.role, item.wh)}
                  className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                    session.role === item.role && session.warehouseId === item.wh
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{item.name}</span>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-blue-400">
                        {item.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                  <span className="text-xs font-mono text-slate-400 font-semibold">{item.wh}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: MOVIMENTO DE STOCK (ENTRADA / SAÍDA)             */}
      {/* ========================================================= */}
      {isStockMovementModalOpen && selectedProductForMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleStockMovement}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Registar Movimento de Stock</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedProductForMovement.masterSku}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsStockMovementModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tipo de Operação</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 cursor-pointer">
                    <input type="radio" name="type" value="ENTRADA" defaultChecked className="text-emerald-500" />
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <ArrowDownLeft className="w-3.5 h-3.5" /> Entrada (Kz)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 cursor-pointer">
                    <input type="radio" name="type" value="SAIDA" className="text-rose-500" />
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Saída / Baixa
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Variante do Artigo</label>
                <select
                  name="variantId"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none"
                >
                  {selectedProductForMovement.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.spec} ({v.skuVariant})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Armazém Alvo</label>
                <select
                  name="warehouseId"
                  defaultValue={session.warehouseId === 'ALL' ? 'ARM-LUA-01' : session.warehouseId}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quantidade</label>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    defaultValue="10"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Custo / Valor Unitário</label>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-mono font-bold">
                    {formatKz(selectedProductForMovement.unitCostKz)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Justificação / Nº da Guia ou Fatura</label>
                <input
                  type="text"
                  name="justification"
                  required
                  placeholder="Ex: FT-2026-8802 ou Ajuste de Inventário Físico"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsStockMovementModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow"
              >
                Confirmar Movimento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: NOVA TRANSFERÊNCIA INTER-ARMAZÉM                 */}
      {/* ========================================================= */}
      {isNewTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const source = fd.get('source') as string;
              const dest = fd.get('dest') as string;
              const productId = fd.get('productId') as string;
              const qty = parseInt(fd.get('qty') as string, 10);
              const vehicle = fd.get('vehicle') as string;

              if (source === dest) {
                alert('O armazém de origem e destino não podem ser o mesmo!');
                return;
              }

              const prod = products.find((p) => p.id === productId);

              const newTransfer: InterWarehouseTransfer = {
                id: `TRF-${Date.now().toString().slice(-4)}`,
                transferCode: `TRF-CAT-2026-${Math.floor(100 + Math.random() * 900)}`,
                sourceWarehouseId: source,
                destWarehouseId: dest,
                masterSku: prod?.masterSku || 'SKU-CAT-8801',
                productName: prod?.name || 'Artigo de Transferência',
                variantSpec: prod?.variants[0]?.spec || 'Padrão',
                quantity: qty,
                requestedBy: session.name,
                requestDate: '2026-10-18',
                vehiclePlate: vehicle,
                status: 'Pendente',
                nationalGuideNumber: 'GTN-PENDENTE',
                estimatedArrival: '2026-10-22',
              };

              setTransfers((prev) => [newTransfer, ...prev]);
              setIsNewTransferModalOpen(false);
              showToast('Nova solicitação de transferência criada com sucesso!');
            }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-400" />
                Nova Guia de Transferência Inter-Armazéns
              </h3>
              <button
                type="button"
                onClick={() => setIsNewTransferModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Armazém Origem</label>
                  <select
                    name="source"
                    defaultValue="ARM-LUA-01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} ({w.province})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Armazém Destino</label>
                  <select
                    name="dest"
                    defaultValue="ARM-HUA-04"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} ({w.province})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Produto a Transferir</label>
                <select
                  name="productId"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.masterSku} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quantidade</label>
                  <input
                    type="number"
                    name="qty"
                    min="1"
                    defaultValue="25"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Viatura da Frota</label>
                  <select
                    name="vehicle"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  >
                    {fleet.map((f) => (
                      <option key={f.id} value={f.plate}>
                        {f.plate} ({f.model.slice(0, 20)}...)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewTransferModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow"
              >
                Emitir Pedido de Transferência
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: NOVO SKU MESTRE                                  */}
      {/* ========================================================= */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const name = fd.get('name') as string;
              const cat = fd.get('category') as MasterProduct['category'];
              const cost = parseFloat(fd.get('cost') as string);
              const price = parseFloat(fd.get('price') as string);
              const origin = fd.get('origin') as string;
              const spec = fd.get('spec') as string;

              const masterSku = `SKU-CAT-${Math.floor(1000 + Math.random() * 9000)}`;

              const newProd: MasterProduct = {
                id: `PRD-${Date.now().toString().slice(-4)}`,
                masterSku,
                name,
                category: cat,
                unitCostKz: cost,
                unitPriceKz: price,
                originCountry: origin || 'Angola',
                batchNumber: `LOTE-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
                barcode: `5601234${Math.floor(100000 + Math.random() * 900000)}`,
                weightKg: 25,
                variants: [
                  {
                    id: `VAR-${Date.now().toString().slice(-3)}`,
                    skuVariant: `${masterSku}-VAR1`,
                    spec: spec || 'Especificação Padrão',
                    stockByWarehouse: {
                      'ARM-LUA-01': 50,
                      'ARM-LUA-02': 20,
                    },
                    reorderPoint: 15,
                  },
                ],
              };

              setProducts((prev) => [newProd, ...prev]);
              setIsNewProductModalOpen(false);
              showToast(`Produto ${masterSku} cadastrado com sucesso no catálogo mestre!`);
            }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-400" />
                Cadastrar Novo Artigo (SKU Mestre)
              </h3>
              <button
                type="button"
                onClick={() => setIsNewProductModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Comercial do Produto</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Ex: Gerador Silencioso 60kVA ou Farinha de Trigo 25kg"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoria Logística</label>
                  <select
                    name="category"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                  >
                    <option value="Construção & Obras">Construção & Obras</option>
                    <option value="Eletrodomésticos & Energia">Eletrodomésticos & Energia</option>
                    <option value="Alimentar & Bebidas">Alimentar & Bebidas</option>
                    <option value="Peças & Maquinaria">Peças & Maquinaria</option>
                    <option value="Químicos & Fito">Químicos & Fito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">País / Fabrico de Origem</label>
                  <input
                    type="text"
                    name="origin"
                    defaultValue="Angola"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Custo Unitário em Kwanzas (Kz)</label>
                  <input
                    type="number"
                    name="cost"
                    min="1"
                    defaultValue="45000"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">PVP Estimado (Kz)</label>
                  <input
                    type="number"
                    name="price"
                    min="1"
                    defaultValue="60000"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Variante Inicial / Especificação</label>
                <input
                  type="text"
                  name="spec"
                  defaultValue="Modelo Standard / 220V"
                  placeholder="Ex: Cor Azul, Tamanho XL, 50kg, etc."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewProductModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow"
              >
                Gravar SKU Mestre
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: REGISTAR NOVO ENVIO DE FORNECEDOR                */}
      {/* ========================================================= */}
      {isNewShipmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const supplier = fd.get('supplier') as string;
              const origin = fd.get('origin') as string;
              const val = parseFloat(fd.get('valueKz') as string);
              const destWh = fd.get('destWh') as string;
              const bl = fd.get('bl') as string;

              const newShp: SupplierShipment = {
                id: `SHP-${Date.now().toString().slice(-4)}`,
                shipmentNumber: `CAT-IMP-2026-${Math.floor(100 + Math.random() * 900)}`,
                supplierName: supplier,
                originPort: origin,
                destinationWarehouseId: destWh,
                invoiceNumber: `FT-${Math.floor(10000 + Math.random() * 90000)}`,
                blNumber: bl || `BL-CAT-${Math.floor(1000 + Math.random() * 9000)}`,
                duNumber: `DU-AGT-2026-${Math.floor(100000 + Math.random() * 900000)}-LUA`,
                totalValueKz: val,
                customsTaxKz: Math.round(val * 0.14),
                step: 1,
                status: 'expedido',
                estimatedArrival: '2026-11-15',
                customsStatus: 'Em Análise',
                inspectionNotes: 'Carga despachada na origem com manifesto eletrónico enviado à alfândega.',
                items: [
                  {
                    masterSku: products[0].masterSku,
                    productName: products[0].name,
                    quantity: 500,
                    unit: 'unidades',
                  },
                ],
              };

              setShipments((prev) => [newShp, ...prev]);
              setIsNewShipmentModalOpen(false);
              showToast('Novo envio de fornecedor criado com sucesso no pipeline de rastreio!');
            }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Ship className="w-5 h-5 text-blue-400" />
                Registar Envio de Fornecedor & Importação
              </h3>
              <button
                type="button"
                onClick={() => setIsNewShipmentModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome do Fornecedor</label>
                <input
                  type="text"
                  name="supplier"
                  required
                  placeholder="Ex: Scania Sweden ou Cimangola S.A."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Porto / Local de Embarque</label>
                  <input
                    type="text"
                    name="origin"
                    required
                    placeholder="Ex: Antuérpia, Lisboa ou Luanda"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Armazém de Descarga</label>
                  <select
                    name="destWh"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} - {w.province}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valor Total em Kwanzas (Kz)</label>
                  <input
                    type="number"
                    name="valueKz"
                    min="1000"
                    defaultValue="35000000"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Guia de Carga (B/L ou CMR)</label>
                  <input
                    type="text"
                    name="bl"
                    defaultValue="MSCU-LUA-2026-91"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewShipmentModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow"
              >
                Iniciar Rastreio em 3 Passos
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: MANUTENÇÃO DE FROTA                             */}
      {/* ========================================================= */}
      {isFleetMaintenanceModalOpen && selectedVehicleForMaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const costKz = parseFloat(fd.get('costKz') as string);
              const notes = fd.get('notes') as string;
              const nextKm = parseInt(fd.get('nextKm') as string, 10);

              setFleet((prev) =>
                prev.map((f) => {
                  if (f.id !== selectedVehicleForMaint.id) return f;
                  return {
                    ...f,
                    status: 'Operacional',
                    lastMaintenance: '2026-10-18',
                    nextMaintenanceKm: nextKm || f.nextMaintenanceKm + 15000,
                  };
                })
              );

              setIsFleetMaintenanceModalOpen(false);
              showToast(
                `Revisão de ${formatKz(costKz)} registada para a viatura ${selectedVehicleForMaint.plate}! (${notes})`
              );
            }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Registar Manutenção</h3>
                <p className="text-xs text-blue-400 font-mono">
                  {selectedVehicleForMaint.plate} - {selectedVehicleForMaint.model}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFleetMaintenanceModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Custo da Oficina (Kz)</label>
                  <input
                    type="number"
                    name="costKz"
                    min="0"
                    defaultValue="450000"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Próx. Revisão (Km)</label>
                  <input
                    type="number"
                    name="nextKm"
                    defaultValue={selectedVehicleForMaint.nextMaintenanceKm + 15000}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Relatório Técnico / Peças Substituídas</label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue="Mudança de óleo sintético, filtros de gasóleo e pastilhas de travão."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsFleetMaintenanceModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow"
              >
                Homologar Manutenção
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RODAPÉ DO CATASSO ERP */}
      <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-500 text-xs py-4 px-4 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">CATASSO ERP Logística Enterprise</span>
            <span>•</span>
            <span>República de Angola</span>
            <span>•</span>
            <span className="font-mono text-emerald-400 font-semibold">Moeda: Kwanza (AOA)</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Polo de Viana • Porto de Luanda • Corredor do Lobito • Huambo • Fútila
          </div>
        </div>
      </footer>
    </div>
  );
}
