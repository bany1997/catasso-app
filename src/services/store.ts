import {
  User,
  Warehouse,
  PurchaseOrder,
  Shipment,
  StockMovement,
  Equipment,
  MaintenanceRecord,
  RNCReport,
  WarehouseTransfer,
  StorageLocation,
  ServiceRequest,
  Language,
} from '../types';
import { catalogService } from './catalogService';

const STORE_KEY = 'catasso_erp_state_v1';

// Seed Warehouses
const INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: 'wh-luanda',
    code: 'ARM-LUA-01',
    name: 'Armazém Central Viana',
    province: 'Luanda',
    city: 'Luanda',
    address: 'Zona Económica Especial Luanda-Bengo, Polo Industrial Viana',
    generalManagerId: 'user-gestor-luanda',
    totalCapacityM2: 12500,
    contactPhone: '+244 923 112 345',
    contactEmail: 'logistica.luanda@catasso.co.ao',
    layoutImageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'wh-lobito',
    code: 'ARM-LOB-02',
    name: 'Armazém Terminal Portuário Lobito',
    province: 'Benguela',
    city: 'Lobito',
    address: 'Recinto Portuário do Lobito, Cais Comercial n° 4',
    generalManagerId: 'user-gestor-lobito',
    totalCapacityM2: 8200,
    contactPhone: '+244 924 556 789',
    contactEmail: 'portuario.lobito@catasso.co.ao',
    layoutImageUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80',
    isActive: true,
    createdAt: '2025-01-05T00:00:00Z',
  },
  {
    id: 'wh-soyo',
    code: 'ARM-SOY-03',
    name: 'Base Logística Petrolífera do Soyo',
    province: 'Zaire',
    city: 'Soyo',
    address: 'Polo Industrial Petrolífero do Kwanda, Lote 14',
    generalManagerId: 'user-gestor-soyo',
    totalCapacityM2: 9800,
    contactPhone: '+244 922 445 678',
    contactEmail: 'oilgas.soyo@catasso.co.ao',
    layoutImageUrl: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=1200&q=80',
    isActive: true,
    createdAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'wh-huambo',
    code: 'ARM-HUA-04',
    name: 'Polo Logístico do Huambo',
    province: 'Huambo',
    city: 'Huambo',
    address: 'Bairro Académico, Via Rápida Circular Leste',
    generalManagerId: 'user-gestor-huambo',
    totalCapacityM2: 6400,
    contactPhone: '+244 926 889 012',
    contactEmail: 'centro.huambo@catasso.co.ao',
    layoutImageUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
    isActive: true,
    createdAt: '2025-01-15T00:00:00Z',
  },
];

// Seed Users for all 7 roles with password "1234"
const INITIAL_USERS: User[] = [
  {
    id: 'user-superadmin',
    username: 'admin',
    password: '1234',
    name: 'Albano Catasso (Direção Geral)',
    email: 'admin@catasso.co.ao',
    role: 'superadmin',
    warehouseId: 'all',
    phone: '+244 923 000 001',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'user-gestor-luanda',
    username: 'gestor.luanda',
    password: '1234',
    name: 'Eng. António Kiala',
    email: 'antonio.kiala@catasso.co.ao',
    role: 'gestor_geral',
    warehouseId: 'wh-luanda',
    phone: '+244 923 100 200',
    isActive: true,
    createdAt: '2025-01-02T00:00:00Z',
  },
  {
    id: 'user-resp-luanda',
    username: 'resp.luanda',
    password: '1234',
    name: 'Mateus Domingos',
    email: 'mateus.domingos@catasso.co.ao',
    role: 'responsavel_armazem',
    warehouseId: 'wh-luanda',
    phone: '+244 923 200 300',
    isActive: true,
    createdAt: '2025-01-02T00:00:00Z',
  },
  {
    id: 'user-atendente-luanda',
    username: 'atendente.luanda',
    password: '1234',
    name: 'Carla Sambongo',
    email: 'carla.sambongo@catasso.co.ao',
    role: 'atendente',
    warehouseId: 'wh-luanda',
    phone: '+244 923 300 400',
    isActive: true,
    createdAt: '2025-01-03T00:00:00Z',
  },
  {
    id: 'user-cliente-luanda',
    username: 'cliente.luanda',
    password: '1234',
    name: 'Sebastião Afonso (Operações Campo)',
    email: 'sebastiao.afonso@sonangol-field.ao',
    role: 'cliente',
    warehouseId: 'wh-luanda',
    phone: '+244 923 400 500',
    clientDepartment: 'Manutenção de Plataforma & Turbinas',
    isActive: true,
    createdAt: '2025-01-04T00:00:00Z',
  },
  {
    id: 'user-frotas',
    username: 'frotas.global',
    password: '1234',
    name: 'Manuel Chingando',
    email: 'manuel.chingando@catasso.co.ao',
    role: 'gestor_frotas',
    warehouseId: 'all',
    phone: '+244 923 500 600',
    isActive: true,
    createdAt: '2025-01-05T00:00:00Z',
  },
  {
    id: 'user-fornecedor',
    username: 'fornecedor.angola',
    password: '1234',
    name: 'Carlos Paixão (Total Supply Angola)',
    email: 'comercial@totalsupply.co.ao',
    role: 'fornecedor',
    warehouseId: 'all',
    phone: '+244 923 600 700',
    supplierCompanyName: 'Total Supply & Equipamentos Angola Lda',
    isActive: true,
    createdAt: '2025-01-05T00:00:00Z',
  },
];

const INITIAL_EQUIPMENT: Equipment[] = [
  {
    id: 'eqp-01',
    code: 'FRO-LUA-EMP01',
    name: 'Empilhadeira Hyster 3.5T Diesel Fortens',
    type: 'empilhadeira',
    warehouseId: 'wh-luanda',
    assignedDriverId: 'dr-01',
    assignedDriverName: 'Gaspar Lourenço (Operador Certificado)',
    driverPhone: '+244 923 778 899',
    condition: 'operacional',
    acquisitionCostAOA: 28500000,
    depreciationRateAnnualPercent: 15,
    calculatedDepreciationAOA: 4275000,
    currentValueAOA: 24225000,
    monthlyRentalCostAOA: 1200000,
    averageConsumption: '4.8 L/hora',
    totalRepairCostAOA: 480000,
    lastMaintenanceDate: '2026-02-15',
    nextMaintenanceDate: '2026-05-15',
    operatingHoursOrKm: 3420,
    notes: 'Revisão hidráulica e troca de garfos efetuadas em conformidade.',
    createdAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'eqp-02',
    code: 'FRO-LUA-CAM01',
    name: 'Camião Pesado Iveco Trakker 6x4 420cv',
    type: 'camiao',
    warehouseId: 'wh-luanda',
    assignedDriverId: 'dr-02',
    assignedDriverName: 'Domingos Mbala',
    driverPhone: '+244 924 112 233',
    condition: 'operacional',
    acquisitionCostAOA: 64000000,
    depreciationRateAnnualPercent: 12,
    calculatedDepreciationAOA: 7680000,
    currentValueAOA: 56320000,
    monthlyRentalCostAOA: 2500000,
    averageConsumption: '32.5 L/100km',
    totalRepairCostAOA: 1150000,
    lastMaintenanceDate: '2026-01-20',
    nextMaintenanceDate: '2026-06-20',
    operatingHoursOrKm: 87400,
    notes: 'Equipado com tacógrafo digital e sistema de rastreio GPS satelital.',
    createdAt: '2025-01-12T00:00:00Z',
  },
  {
    id: 'eqp-03',
    code: 'FRO-LOB-GRU01',
    name: 'Grua Telescópica Móvel Liebherr 50 Toneladas',
    type: 'grua',
    warehouseId: 'wh-lobito',
    assignedDriverId: 'dr-03',
    assignedDriverName: 'Afonso Queta',
    driverPhone: '+244 922 990 011',
    condition: 'em_manutencao',
    acquisitionCostAOA: 145000000,
    depreciationRateAnnualPercent: 10,
    calculatedDepreciationAOA: 14500000,
    currentValueAOA: 130500000,
    monthlyRentalCostAOA: 5500000,
    averageConsumption: '18.2 L/hora',
    totalRepairCostAOA: 3400000,
    lastMaintenanceDate: '2026-03-01',
    nextMaintenanceDate: '2026-03-25',
    operatingHoursOrKm: 4120,
    notes: 'Substituição do cabo de elevação e aferição dos sensores de carga.',
    createdAt: '2025-01-20T00:00:00Z',
  },
  {
    id: 'eqp-04',
    code: 'FRO-SOY-GER01',
    name: 'Gerador Industrial Caterpillar 500 kVA C15',
    type: 'gerador',
    warehouseId: 'wh-soyo',
    assignedDriverId: 'dr-04',
    assignedDriverName: 'Técnico Residente Soyo',
    driverPhone: '+244 927 441 122',
    condition: 'operacional',
    acquisitionCostAOA: 42000000,
    depreciationRateAnnualPercent: 10,
    calculatedDepreciationAOA: 4200000,
    currentValueAOA: 37800000,
    monthlyRentalCostAOA: 1800000,
    averageConsumption: '65 L/hora em carga total',
    totalRepairCostAOA: 620000,
    lastMaintenanceDate: '2026-02-10',
    nextMaintenanceDate: '2026-05-10',
    operatingHoursOrKm: 6100,
    notes: 'Alimenta o armazém petrolífero em contingência contínua.',
    createdAt: '2025-01-22T00:00:00Z',
  },
];

const INITIAL_MAINTENANCE_RECORDS: MaintenanceRecord[] = [
  {
    id: 'maint-01',
    equipmentId: 'eqp-01',
    date: '2026-02-15',
    type: 'preventiva',
    description: 'Troca de óleo de motor, filtros de ar e combustível, engraxamento das torres.',
    costAOA: 480000,
    partsReplaced: ['Filtro Óleo Hyster', 'Filtro Combustível', 'Óleo 15W40 20L'],
    performedBy: 'Oficina Central Viana',
    nextScheduledDate: '2026-05-15',
  },
  {
    id: 'maint-02',
    equipmentId: 'eqp-03',
    date: '2026-03-01',
    type: 'corretiva',
    description: 'Substituição das mangueiras do guincho principal e calibração do limitador de momento.',
    costAOA: 3400000,
    partsReplaced: ['Mangueira Hidráulica 4 Vias 6000 PSI', 'Sensor de Ângulo Liebherr'],
    performedBy: 'Liebherr Serviços Angola',
    nextScheduledDate: '2026-03-25',
  },
];

const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-01',
    orderNumber: 'PED-2026-0041',
    warehouseId: 'wh-luanda',
    requesterUserId: 'user-cliente-luanda',
    requesterName: 'Sebastião Afonso',
    requesterRole: 'cliente',
    supplierId: 'user-fornecedor',
    supplierName: 'Total Supply & Equipamentos Angola Lda',
    supplierEmail: 'comercial@totalsupply.co.ao',
    status: 'aprovado', // Approved by Gestor Geral, ready for supplier
    priority: 'alta',
    justification: 'Reposição urgente de rolamentos e válvulas para parada programada da refinaria.',
    totalEstimatedAOA: 1845000,
    approvedByUserId: 'user-gestor-luanda',
    approvedByName: 'Eng. António Kiala',
    approvedAt: '2026-03-10T14:30:00Z',
    items: [
      {
        productId: 'prod-1',
        sku: 'SKU-00001',
        productName: 'Rolamento de Esferas Blindado DDU - SKF',
        quantityRequested: 20,
        quantityDispatched: 15, // Partial shipment example
        quantityReceived: 0,
        quantityDamagedOrDefective: 0,
        unitPriceAOA: 45000,
        status: 'pendente',
      },
      {
        productId: 'prod-2',
        sku: 'SKU-00002',
        productName: 'Válvula Esférica Inox Flangeada ANSI 150 - Parker',
        quantityRequested: 10,
        quantityDispatched: 0, // Not yet dispatched
        quantityReceived: 0,
        quantityDamagedOrDefective: 0,
        unitPriceAOA: 94500,
        status: 'pendente',
      },
    ],
    createdAt: '2026-03-08T09:00:00Z',
    updatedAt: '2026-03-10T14:30:00Z',
  },
  {
    id: 'po-02',
    orderNumber: 'PED-2026-0038',
    warehouseId: 'wh-luanda',
    requesterUserId: 'user-resp-luanda',
    requesterName: 'Mateus Domingos',
    requesterRole: 'responsavel_armazem',
    supplierId: 'user-fornecedor',
    supplierName: 'Total Supply & Equipamentos Angola Lda',
    supplierEmail: 'comercial@totalsupply.co.ao',
    status: 'em_transito',
    priority: 'urgente',
    justification: 'Abastecimento de EPIs e Óleos lubrificantes industriais.',
    totalEstimatedAOA: 3420000,
    approvedByUserId: 'user-gestor-luanda',
    approvedByName: 'Eng. António Kiala',
    approvedAt: '2026-03-05T10:00:00Z',
    items: [
      {
        productId: 'prod-4',
        sku: 'SKU-00004',
        productName: 'Luva de Proteção Mecânica Nitrílica Anti-Corte Nível 5 - 3M',
        quantityRequested: 100,
        quantityDispatched: 100,
        quantityReceived: 0,
        quantityDamagedOrDefective: 0,
        unitPriceAOA: 8500,
        status: 'em_transito',
      },
      {
        productId: 'prod-5',
        sku: 'SKU-00005',
        productName: 'Óleo Lubrificante Industrial Hidráulico ISO VG 68 - TotalEnergies',
        quantityRequested: 30,
        quantityDispatched: 30,
        quantityReceived: 0,
        quantityDamagedOrDefective: 0,
        unitPriceAOA: 85000,
        status: 'em_transito',
      },
    ],
    createdAt: '2026-03-04T11:00:00Z',
    updatedAt: '2026-03-06T08:00:00Z',
  },
];

const INITIAL_SHIPMENTS: Shipment[] = [
  {
    id: 'ship-01',
    shipmentNumber: 'ENV-2026-0019',
    orderId: 'po-02',
    orderNumber: 'PED-2026-0038',
    warehouseId: 'wh-luanda',
    supplierId: 'user-fornecedor',
    supplierName: 'Total Supply & Equipamentos Angola Lda',
    status: 'em_transito',
    modal: 'rodoviario',
    carrierName: 'Trans-Angola Express Logística',
    driverName: 'Bernardo Costa',
    driverLicense: 'C-LA-9923841',
    vehiclePlate: 'LD-44-89-HP',
    trackingOrWaybill: 'GUIA-REM-8829/2026',
    estimatedArrival: '2026-03-22T17:00:00Z',
    dispatchedAt: '2026-03-12T09:30:00Z',
    itemsDispatched: [
      {
        productId: 'prod-4',
        sku: 'SKU-00004',
        productName: 'Luva de Proteção Mecânica Nitrílica Anti-Corte Nível 5 - 3M',
        quantity: 100,
      },
      {
        productId: 'prod-5',
        sku: 'SKU-00005',
        productName: 'Óleo Lubrificante Industrial Hidráulico ISO VG 68 - TotalEnergies',
        quantity: 30,
      },
    ],
    observations: 'Carga contendo tambores de lubrificante fixados com cintas e paletes de EPIs lacrados.',
    documents: [
      {
        id: 'doc-01',
        name: 'Fatura_Comercial_FT2026_0944.pdf',
        type: 'fatura',
        uploadedBy: 'Carlos Paixão (Fornecedor)',
        uploadedAt: '2026-03-12T09:35:00Z',
        fileSize: '1.4 MB',
      },
      {
        id: 'doc-02',
        name: 'Guia_Transporte_e_Packing_List.pdf',
        type: 'packing_list',
        uploadedBy: 'Carlos Paixão (Fornecedor)',
        uploadedAt: '2026-03-12T09:38:00Z',
        fileSize: '820 KB',
      },
    ],
    createdAt: '2026-03-12T09:30:00Z',
  },
];

const INITIAL_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov-01',
    movementCode: 'MOV-2026-0001',
    warehouseId: 'wh-luanda',
    productId: 'prod-1',
    productSku: 'SKU-00001',
    productName: 'Rolamento de Esferas Blindado DDU - SKF',
    type: 'entrada_compra',
    quantity: 50,
    unitPriceAOA: 42000,
    totalPriceAOA: 2100000,
    originReference: 'PED-2026-0012 / FAT-9912',
    requesterOrRecipient: 'Total Supply Angola Lda',
    executedByUserId: 'user-resp-luanda',
    executedByUserName: 'Mateus Domingos',
    notes: 'Entrada após inspeção de recebimento sem avarias.',
    createdAt: '2026-02-18T10:15:00Z',
  },
  {
    id: 'mov-02',
    movementCode: 'MOV-2026-0002',
    warehouseId: 'wh-luanda',
    productId: 'prod-1',
    productSku: 'SKU-00001',
    productName: 'Rolamento de Esferas Blindado DDU - SKF',
    type: 'saida_cliente',
    quantity: 5,
    unitPriceAOA: 42000,
    totalPriceAOA: 210000,
    originReference: 'REQ-CLI-0044',
    requesterOrRecipient: 'Sebastião Afonso (Operações Campo)',
    executedByUserId: 'user-atendente-luanda',
    executedByUserName: 'Carla Sambongo',
    notes: 'Requisição para bomba centrífuga B-102.',
    createdAt: '2026-02-25T14:40:00Z',
  },
  {
    id: 'mov-03',
    movementCode: 'MOV-2026-0003',
    warehouseId: 'wh-luanda',
    productId: 'prod-4',
    productSku: 'SKU-00004',
    productName: 'Luva de Proteção Mecânica Nitrílica Anti-Corte Nível 5 - 3M',
    type: 'saida_cliente',
    quantity: 20,
    unitPriceAOA: 8500,
    totalPriceAOA: 170000,
    originReference: 'REQ-CLI-0052',
    requesterOrRecipient: 'Equipa de Soldadura Viana',
    executedByUserId: 'user-atendente-luanda',
    executedByUserName: 'Carla Sambongo',
    notes: 'Distribuição mensal de EPIs.',
    createdAt: '2026-03-01T09:20:00Z',
  },
];

const INITIAL_RNCS: RNCReport[] = [
  {
    id: 'rnc-01',
    rncNumber: 'RNC-2026-0002',
    warehouseId: 'wh-luanda',
    orderId: 'po-prev-01',
    shipmentId: 'ship-prev-01',
    supplierId: 'user-fornecedor',
    supplierName: 'Total Supply & Equipamentos Angola Lda',
    openedByUserId: 'user-resp-luanda',
    openedByUserName: 'Mateus Domingos (Resp. Armazém)',
    openedAt: '2026-02-28T16:00:00Z',
    status: 'em_analise',
    severity: 'alta',
    issueType: 'avaria_transporte',
    description: 'Recebimento de 4 tambores de lubrificante industrial com vedação violada e vazamento parcial na caçamba do camião.',
    affectedItems: [
      {
        sku: 'SKU-00005',
        productName: 'Óleo Lubrificante Industrial Hidráulico ISO VG 68 - TotalEnergies',
        quantityAffected: 4,
        defectDetail: 'Lacres rompidos e perda estimada de 30% do fluido em cada tambor.',
      },
    ],
    rootCauseAnalysis: 'Estiva inadequada durante o transporte rodoviário na estrada Luanda-Catete.',
    correctiveAction: 'Fornecedor acionado para envio de reposição urgente e nota de crédito.',
  },
];

const INITIAL_TRANSFERS: WarehouseTransfer[] = [
  {
    id: 'trf-01',
    transferCode: 'TRF-2026-0014',
    originWarehouseId: 'wh-luanda',
    destinationWarehouseId: 'wh-lobito',
    requestedByUserId: 'user-gestor-lobito',
    requestedByUserName: 'Eng. Manuel Lobito',
    status: 'em_transito',
    items: [
      {
        productId: 'prod-3',
        sku: 'SKU-00003',
        productName: 'Disjuntor Caixa Moldada Tripolar 100A - Schneider',
        quantity: 15,
      },
    ],
    transportDetails: {
      carrier: 'Frota Interna CATASSO',
      driverName: 'Domingos Mbala',
      vehiclePlate: 'LD-44-89-HP',
    },
    requestDate: '2026-03-05T11:00:00Z',
    approvalDate: '2026-03-06T09:00:00Z',
    notes: 'Transferência de contingência para apoio às operações portuárias.',
  },
];

const INITIAL_LOCATIONS: StorageLocation[] = [
  { id: 'loc-01', warehouseId: 'wh-luanda', aisle: 'Corredor A', rack: 'Estante 01', shelf: 'Nível 1', binCode: 'A-01-A', isOccupied: true, maxCapacityKg: 1500 },
  { id: 'loc-02', warehouseId: 'wh-luanda', aisle: 'Corredor A', rack: 'Estante 02', shelf: 'Nível 2', binCode: 'A-02-B', isOccupied: true, maxCapacityKg: 1200 },
  { id: 'loc-03', warehouseId: 'wh-luanda', aisle: 'Corredor B', rack: 'Estante 01', shelf: 'Nível 1', binCode: 'B-01-A', isOccupied: false, maxCapacityKg: 2000 },
  { id: 'loc-04', warehouseId: 'wh-luanda', aisle: 'Corredor C (Químicos)', rack: 'Bacia 01', shelf: 'Solo', binCode: 'C-01-S', isOccupied: true, maxCapacityKg: 5000, notes: 'Área com contenção de vazamentos.' },
  { id: 'loc-05', warehouseId: 'wh-lobito', aisle: 'Corredor L1', rack: 'Estante 01', shelf: 'Nível 1', binCode: 'L1-01-A', isOccupied: true, maxCapacityKg: 1800 },
];

const INITIAL_SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: 'req-srv-01',
    code: 'SRV-2026-0007',
    warehouseId: 'wh-luanda',
    equipmentId: 'eqp-01',
    equipmentName: 'Empilhadeira Hyster 3.5T Diesel Fortens',
    requestedByUserId: 'user-atendente-luanda',
    requestedByUserName: 'Carla Sambongo',
    requestedRole: 'atendente',
    requestType: 'reparo',
    priority: 'alta',
    description: 'Vazamento leve de óleo hidráulico no cilindro de elevação da torre dianteira.',
    status: 'em_execucao',
    assignedTechnician: 'Manuel Chingando (Gestor Frotas)',
    estimatedCostAOA: 220000,
    createdAt: '2026-03-11T10:00:00Z',
  },
];

class ERPStore {
  public currentUser: User | null = null;
  public selectedWarehouseId: string = 'wh-luanda';
  public language: Language = 'pt';

  public warehouses: Warehouse[] = INITIAL_WAREHOUSES;
  public users: User[] = INITIAL_USERS;
  public purchaseOrders: PurchaseOrder[] = INITIAL_PURCHASE_ORDERS;
  public shipments: Shipment[] = INITIAL_SHIPMENTS;
  public movements: StockMovement[] = INITIAL_MOVEMENTS;
  public equipment: Equipment[] = INITIAL_EQUIPMENT;
  public maintenanceRecords: MaintenanceRecord[] = INITIAL_MAINTENANCE_RECORDS;
  public rncs: RNCReport[] = INITIAL_RNCS;
  public transfers: WarehouseTransfer[] = INITIAL_TRANSFERS;
  public locations: StorageLocation[] = INITIAL_LOCATIONS;
  public serviceRequests: ServiceRequest[] = INITIAL_SERVICE_REQUESTS;

  private listeners: (() => void)[] = [];

  constructor() {
    this.loadState();
    // Default logged in user: superadmin (admin / 1234)
    if (!this.currentUser) {
      this.currentUser = this.users.find(u => u.username === 'admin') || null;
    }
  }

  private loadState() {
    try {
      const stored = localStorage.getItem(STORE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.warehouses) this.warehouses = parsed.warehouses;
        if (parsed.users) this.users = parsed.users;
        if (parsed.purchaseOrders) this.purchaseOrders = parsed.purchaseOrders;
        if (parsed.shipments) this.shipments = parsed.shipments;
        if (parsed.movements) this.movements = parsed.movements;
        if (parsed.equipment) this.equipment = parsed.equipment;
        if (parsed.maintenanceRecords) this.maintenanceRecords = parsed.maintenanceRecords;
        if (parsed.rncs) this.rncs = parsed.rncs;
        if (parsed.transfers) this.transfers = parsed.transfers;
        if (parsed.locations) this.locations = parsed.locations;
        if (parsed.serviceRequests) this.serviceRequests = parsed.serviceRequests;
        if (parsed.language) this.language = parsed.language;
        if (parsed.currentUserId) {
          this.currentUser = this.users.find(u => u.id === parsed.currentUserId) || null;
        }
        if (parsed.selectedWarehouseId) {
          this.selectedWarehouseId = parsed.selectedWarehouseId;
        }
      }
    } catch (e) {
      console.warn('Could not load ERP store from localStorage', e);
    }
  }

  public saveState() {
    try {
      const payload = {
        warehouses: this.warehouses,
        users: this.users,
        purchaseOrders: this.purchaseOrders,
        shipments: this.shipments,
        movements: this.movements,
        equipment: this.equipment,
        maintenanceRecords: this.maintenanceRecords,
        rncs: this.rncs,
        transfers: this.transfers,
        locations: this.locations,
        serviceRequests: this.serviceRequests,
        language: this.language,
        currentUserId: this.currentUser?.id,
        selectedWarehouseId: this.selectedWarehouseId,
      };
      localStorage.setItem(STORE_KEY, JSON.stringify(payload));
      this.notify();
    } catch (e) {
      console.error('Failed to save state', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  // --- Auth methods ---
  public login(username: string, password: string, warehouseId: string): { success: boolean; message?: string } {
    const user = this.users.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    );

    if (!user) {
      return { success: false, message: 'Utilizador ou palavra-passe incorretos.' };
    }

    if (!user.isActive) {
      return { success: false, message: 'Esta conta de utilizador está desativada.' };
    }

    // Role warehouse check
    if (user.role !== 'superadmin' && user.role !== 'gestor_frotas' && user.role !== 'fornecedor') {
      if (user.warehouseId !== warehouseId) {
        const wh = this.warehouses.find(w => w.id === user.warehouseId);
        return {
          success: false,
          message: `Acesso negado: Este utilizador pertence apenas ao ${wh?.name || 'seu armazém específico'}.`,
        };
      }
    }

    this.currentUser = user;
    this.selectedWarehouseId = warehouseId;
    this.saveState();
    return { success: true };
  }

  public logout() {
    this.currentUser = null;
    this.saveState();
  }

  public switchWarehouse(warehouseId: string): boolean {
    if (!this.currentUser) return false;
    // Superadmin and Gestor de frotas can switch freely
    if (this.currentUser.role === 'superadmin' || this.currentUser.role === 'gestor_frotas' || this.currentUser.role === 'fornecedor') {
      this.selectedWarehouseId = warehouseId;
      this.saveState();
      return true;
    }
    // Other users are strictly restricted to their assigned warehouse
    if (this.currentUser.warehouseId === warehouseId) {
      this.selectedWarehouseId = warehouseId;
      this.saveState();
      return true;
    }
    return false;
  }

  public setLanguage(lang: Language) {
    this.language = lang;
    this.saveState();
  }

  public getActiveWarehouse(): Warehouse | undefined {
    return this.warehouses.find(w => w.id === this.selectedWarehouseId);
  }

  // --- Users management ---
  public addUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    this.saveState();
    return newUser;
  }

  public updateUser(userId: string, data: Partial<User>): boolean {
    const idx = this.users.findIndex(u => u.id === userId);
    if (idx === -1) return false;
    this.users[idx] = { ...this.users[idx], ...data };
    if (this.currentUser?.id === userId) {
      this.currentUser = this.users[idx];
    }
    this.saveState();
    return true;
  }

  public deleteUser(userId: string): boolean {
    if (userId === 'user-superadmin') return false; // Protected
    this.users = this.users.filter(u => u.id !== userId);
    this.saveState();
    return true;
  }

  // --- Warehouse management ---
  public addWarehouse(data: Omit<Warehouse, 'id' | 'createdAt'>): Warehouse {
    const newWh: Warehouse = {
      ...data,
      id: `wh-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.warehouses.push(newWh);
    this.saveState();
    return newWh;
  }

  public updateWarehouse(whId: string, data: Partial<Warehouse>): boolean {
    const idx = this.warehouses.findIndex(w => w.id === whId);
    if (idx === -1) return false;
    this.warehouses[idx] = { ...this.warehouses[idx], ...data };
    this.saveState();
    return true;
  }

  // --- Stock Movements ---
  public addStockMovement(data: Omit<StockMovement, 'id' | 'movementCode' | 'createdAt'>): StockMovement {
    const nextCode = `MOV-${new Date().getFullYear()}-${String(this.movements.length + 1).padStart(4, '0')}`;
    const newMovement: StockMovement = {
      ...data,
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      movementCode: nextCode,
      createdAt: new Date().toISOString(),
    };

    // Update stock levels
    const prod = catalogService.getProductById(data.productId);
    if (prod) {
      const currentStock = prod.stockLevels[data.warehouseId] || 0;
      let newStock = currentStock;

      if (data.type.startsWith('entrada_')) {
        newStock = currentStock + data.quantity;
      } else if (data.type.startsWith('saida_')) {
        newStock = Math.max(0, currentStock - data.quantity);
      } else if (data.type === 'ajuste_inventario') {
        newStock = Math.max(0, data.quantity);
      }

      catalogService.updateStockQuantity(data.productId, data.warehouseId, newStock);
    }

    this.movements.unshift(newMovement);
    this.saveState();
    return newMovement;
  }

  // Client return product to stock
  public returnProductToStock(params: {
    productId: string;
    productSku: string;
    productName: string;
    warehouseId: string;
    quantity: number;
    unitPriceAOA: number;
    clientName: string;
    notes: string;
  }): StockMovement {
    return this.addStockMovement({
      warehouseId: params.warehouseId,
      productId: params.productId,
      productSku: params.productSku,
      productName: params.productName,
      type: 'entrada_devolucao',
      quantity: params.quantity,
      unitPriceAOA: params.unitPriceAOA,
      totalPriceAOA: params.quantity * params.unitPriceAOA,
      originReference: `Devolução Cliente: ${params.clientName}`,
      requesterOrRecipient: params.clientName,
      executedByUserId: this.currentUser?.id || 'sys',
      executedByUserName: this.currentUser?.name || 'Sistema',
      notes: params.notes,
    });
  }

  // --- Purchase Orders ---
  public createPurchaseOrder(data: Omit<PurchaseOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): PurchaseOrder {
    const orderNumber = `PED-${new Date().getFullYear()}-${String(this.purchaseOrders.length + 1).padStart(4, '0')}`;
    const now = new Date().toISOString();
    const newPo: PurchaseOrder = {
      ...data,
      id: `po-${Date.now()}`,
      orderNumber,
      createdAt: now,
      updatedAt: now,
    };
    this.purchaseOrders.unshift(newPo);
    this.saveState();
    return newPo;
  }

  public approvePurchaseOrder(orderId: string, approvedByUserId: string, approvedByName: string): boolean {
    const po = this.purchaseOrders.find(p => p.id === orderId);
    if (!po) return false;
    po.status = 'aprovado';
    po.approvedByUserId = approvedByUserId;
    po.approvedByName = approvedByName;
    po.approvedAt = new Date().toISOString();
    po.updatedAt = new Date().toISOString();
    this.saveState();
    return true;
  }

  public rejectPurchaseOrder(orderId: string, reason: string): boolean {
    const po = this.purchaseOrders.find(p => p.id === orderId);
    if (!po) return false;
    po.status = 'rejeitado';
    po.rejectedReason = reason;
    po.updatedAt = new Date().toISOString();
    this.saveState();
    return true;
  }

  // --- Supplier Shipments ---
  public createShipment(data: Omit<Shipment, 'id' | 'shipmentNumber' | 'createdAt'>): Shipment {
    const shipmentNumber = `ENV-${new Date().getFullYear()}-${String(this.shipments.length + 1).padStart(4, '0')}`;
    const newShip: Shipment = {
      ...data,
      id: `ship-${Date.now()}`,
      shipmentNumber,
      createdAt: new Date().toISOString(),
    };

    // Update parent order item quantities & status
    const po = this.purchaseOrders.find(p => p.id === data.orderId);
    if (po) {
      data.itemsDispatched.forEach(dispatched => {
        const item = po.items.find(i => i.productId === dispatched.productId);
        if (item) {
          item.quantityDispatched = (item.quantityDispatched || 0) + dispatched.quantity;
          item.status = item.quantityDispatched >= item.quantityRequested ? 'em_transito' : 'pendente';
        }
      });
      const allDispatched = po.items.every(i => i.quantityDispatched >= i.quantityRequested);
      po.status = allDispatched ? 'em_transito' : 'em_preparacao';
      po.updatedAt = new Date().toISOString();
    }

    this.shipments.unshift(newShip);
    this.saveState();
    return newShip;
  }

  public updateShipment(shipmentId: string, data: Partial<Shipment>): boolean {
    const idx = this.shipments.findIndex(s => s.id === shipmentId);
    if (idx === -1) return false;
    this.shipments[idx] = { ...this.shipments[idx], ...data };
    this.saveState();
    return true;
  }

  public cancelShipment(shipmentId: string, reason?: string): boolean {
    const s = this.shipments.find(x => x.id === shipmentId);
    if (!s) return false;
    s.status = 'cancelado';
    if (reason) s.observations = `${s.observations || ''} [Cancelado: ${reason}]`;
    this.saveState();
    return true;
  }

  public addShipmentDocument(shipmentId: string, doc: Omit<Shipment['documents'][0], 'id' | 'uploadedAt'>): boolean {
    const s = this.shipments.find(x => x.id === shipmentId);
    if (!s) return false;
    s.documents.push({
      ...doc,
      id: `doc-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    });
    this.saveState();
    return true;
  }

  // --- Receiving & Stock Ingestion ---
  public completeReceivingInspection(params: {
    orderId: string;
    shipmentId?: string;
    itemsChecked: {
      productId: string;
      sku: string;
      productName: string;
      quantityExpected: number;
      quantityReceived: number;
      condition: 'conforme' | 'danificado' | 'incompleto' | 'divergente';
      batchNumber?: string;
      notes?: string;
    }[];
    notes?: string;
  }): { success: boolean; rncCreated?: RNCReport; orderUpdated?: PurchaseOrder } {
    const po = this.purchaseOrders.find(p => p.id === params.orderId);
    if (!po) return { success: false };

    const nonConformingItems = params.itemsChecked.filter(
      item => item.condition !== 'conforme' || item.quantityReceived < item.quantityExpected
    );

    let rncReport: RNCReport | undefined;

    if (nonConformingItems.length > 0) {
      const rncNumber = `RNC-${new Date().getFullYear()}-${String(this.rncs.length + 1).padStart(4, '0')}`;
      rncReport = {
        id: `rnc-${Date.now()}`,
        rncNumber,
        warehouseId: po.warehouseId,
        orderId: po.id,
        shipmentId: params.shipmentId,
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        openedByUserId: this.currentUser?.id || 'sys',
        openedByUserName: this.currentUser?.name || 'Responsável Armazém',
        openedAt: new Date().toISOString(),
        status: 'aberta',
        severity: 'alta',
        issueType: 'falta_quantidade',
        description: `Discrepâncias detectadas na inspeção de recebimento do pedido ${po.orderNumber}.`,
        affectedItems: nonConformingItems.map(i => ({
          sku: i.sku,
          productName: i.productName,
          quantityAffected: Math.max(1, i.quantityExpected - i.quantityReceived),
          defectDetail: `Condição: ${i.condition}. Esperado: ${i.quantityExpected}, Recebido: ${i.quantityReceived}. ${i.notes || ''}`,
        })),
      };
      this.rncs.unshift(rncReport);
    }

    // Automatically ingest conforming received items into stock!
    params.itemsChecked.forEach(item => {
      if (item.quantityReceived > 0) {
        this.addStockMovement({
          warehouseId: po.warehouseId,
          productId: item.productId,
          productSku: item.sku,
          productName: item.productName,
          type: 'entrada_compra',
          quantity: item.quantityReceived,
          unitPriceAOA: po.items.find(pi => pi.productId === item.productId)?.unitPriceAOA || 0,
          totalPriceAOA:
            item.quantityReceived * (po.items.find(pi => pi.productId === item.productId)?.unitPriceAOA || 0),
          originReference: `Pedido ${po.orderNumber} (Fornecedor: ${po.supplierName})`,
          requesterOrRecipient: po.supplierName,
          executedByUserId: this.currentUser?.id || 'sys',
          executedByUserName: this.currentUser?.name || 'Responsável Armazém',
          notes: item.batchNumber ? `Lote recebido: ${item.batchNumber}` : 'Recebimento de compra',
        });
      }
    });

    // Update order status: If fully received without discrepancies -> "comprado"
    if (nonConformingItems.length === 0) {
      po.status = 'comprado';
    } else {
      po.status = 'recebido_parcial';
    }
    po.updatedAt = new Date().toISOString();

    // Update shipment status if passed
    if (params.shipmentId) {
      const ship = this.shipments.find(s => s.id === params.shipmentId);
      if (ship) {
        ship.status = 'entregue';
        ship.deliveredAt = new Date().toISOString();
      }
    }

    this.saveState();
    return { success: true, rncCreated: rncReport, orderUpdated: po };
  }

  // --- Fleets & Equipment ---
  public addEquipment(data: Omit<Equipment, 'id' | 'createdAt'>): Equipment {
    const newEqp: Equipment = {
      ...data,
      id: `eqp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.equipment.push(newEqp);
    this.saveState();
    return newEqp;
  }

  public updateEquipment(eqpId: string, data: Partial<Equipment>): boolean {
    const idx = this.equipment.findIndex(e => e.id === eqpId);
    if (idx === -1) return false;
    this.equipment[idx] = { ...this.equipment[idx], ...data };
    this.saveState();
    return true;
  }

  public addMaintenanceRecord(record: Omit<MaintenanceRecord, 'id'>): MaintenanceRecord {
    const newRec: MaintenanceRecord = {
      ...record,
      id: `maint-${Date.now()}`,
    };
    this.maintenanceRecords.unshift(newRec);

    // Update total repair cost on equipment
    const eqp = this.equipment.find(e => e.id === record.equipmentId);
    if (eqp) {
      eqp.totalRepairCostAOA = (eqp.totalRepairCostAOA || 0) + record.costAOA;
      eqp.lastMaintenanceDate = record.date;
      if (record.nextScheduledDate) {
        eqp.nextMaintenanceDate = record.nextScheduledDate;
      }
    }

    this.saveState();
    return newRec;
  }

  public addServiceRequest(req: Omit<ServiceRequest, 'id' | 'code' | 'createdAt'>): ServiceRequest {
    const code = `SRV-${new Date().getFullYear()}-${String(this.serviceRequests.length + 1).padStart(4, '0')}`;
    const newReq: ServiceRequest = {
      ...req,
      id: `srv-${Date.now()}`,
      code,
      createdAt: new Date().toISOString(),
    };
    this.serviceRequests.unshift(newReq);
    this.saveState();
    return newReq;
  }

  public updateServiceRequest(id: string, data: Partial<ServiceRequest>): boolean {
    const idx = this.serviceRequests.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.serviceRequests[idx] = { ...this.serviceRequests[idx], ...data };
    this.saveState();
    return true;
  }

  // --- RNC Management ---
  public updateRNC(rncId: string, data: Partial<RNCReport>): boolean {
    const idx = this.rncs.findIndex(r => r.id === rncId);
    if (idx === -1) return false;
    this.rncs[idx] = { ...this.rncs[idx], ...data };
    this.saveState();
    return true;
  }

  // --- Inter-Warehouse Transfers ---
  public requestTransfer(data: Omit<WarehouseTransfer, 'id' | 'transferCode' | 'requestDate' | 'status'>): WarehouseTransfer {
    const code = `TRF-${new Date().getFullYear()}-${String(this.transfers.length + 1).padStart(4, '0')}`;
    const newTransfer: WarehouseTransfer = {
      ...data,
      id: `trf-${Date.now()}`,
      transferCode: code,
      status: 'solicitada',
      requestDate: new Date().toISOString(),
    };
    this.transfers.unshift(newTransfer);
    this.saveState();
    return newTransfer;
  }

  public approveTransfer(transferId: string): boolean {
    const trf = this.transfers.find(t => t.id === transferId);
    if (!trf) return false;
    trf.status = 'em_transito';
    trf.approvalDate = new Date().toISOString();

    // Deduct stock from origin warehouse
    trf.items.forEach(item => {
      const prod = catalogService.getProductById(item.productId);
      if (prod) {
        const cur = prod.stockLevels[trf.originWarehouseId] || 0;
        catalogService.updateStockQuantity(item.productId, trf.originWarehouseId, Math.max(0, cur - item.quantity));

        // Movement record for outbound
        this.addStockMovement({
          warehouseId: trf.originWarehouseId,
          productId: item.productId,
          productSku: item.sku,
          productName: item.productName,
          type: 'saida_transferencia',
          quantity: item.quantity,
          unitPriceAOA: prod.basePriceAOA,
          totalPriceAOA: item.quantity * prod.basePriceAOA,
          originReference: trf.transferCode,
          requesterOrRecipient: `Armazém Destino: ${this.warehouses.find(w => w.id === trf.destinationWarehouseId)?.name}`,
          executedByUserId: this.currentUser?.id || 'sys',
          executedByUserName: this.currentUser?.name || 'Sistema',
          notes: 'Saída por transferência inter-armazém aprovada',
        });
      }
    });

    this.saveState();
    return true;
  }

  public receiveTransfer(transferId: string): boolean {
    const trf = this.transfers.find(t => t.id === transferId);
    if (!trf) return false;
    trf.status = 'recebida';
    trf.deliveryDate = new Date().toISOString();

    // Ingest stock into destination warehouse
    trf.items.forEach(item => {
      const prod = catalogService.getProductById(item.productId);
      if (prod) {
        const cur = prod.stockLevels[trf.destinationWarehouseId] || 0;
        catalogService.updateStockQuantity(item.productId, trf.destinationWarehouseId, cur + item.quantity);

        // Movement record for inbound
        this.addStockMovement({
          warehouseId: trf.destinationWarehouseId,
          productId: item.productId,
          productSku: item.sku,
          productName: item.productName,
          type: 'entrada_transferencia',
          quantity: item.quantity,
          unitPriceAOA: prod.basePriceAOA,
          totalPriceAOA: item.quantity * prod.basePriceAOA,
          originReference: trf.transferCode,
          requesterOrRecipient: `Armazém Origem: ${this.warehouses.find(w => w.id === trf.originWarehouseId)?.name}`,
          executedByUserId: this.currentUser?.id || 'sys',
          executedByUserName: this.currentUser?.name || 'Sistema',
          notes: 'Recebimento de transferência inter-armazém',
        });
      }
    });

    this.saveState();
    return true;
  }

  // --- Storage Locations ---
  public addStorageLocation(data: Omit<StorageLocation, 'id'>): StorageLocation {
    const newLoc: StorageLocation = {
      ...data,
      id: `loc-${Date.now()}`,
    };
    this.locations.push(newLoc);
    this.saveState();
    return newLoc;
  }

  public updateStorageLocation(id: string, data: Partial<StorageLocation>): boolean {
    const idx = this.locations.findIndex(l => l.id === id);
    if (idx === -1) return false;
    this.locations[idx] = { ...this.locations[idx], ...data };
    this.saveState();
    return true;
  }
}

// Localiza onde a store é inicializada e altera currentUser para null:
export const erpStore = {
  // ... outros estados
  currentUser: null, // <-- Alterar de 'admin' ou user object para null
  
  // ... restante código
};
