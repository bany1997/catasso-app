export type UserRole =
  | 'superadmin'
  | 'gestor_geral'
  | 'responsavel_armazem'
  | 'gestor_frotas'
  | 'atendente'
  | 'cliente'
  | 'fornecedor';

export type Language = 'pt' | 'es' | 'en';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  province: string; // e.g. Luanda, Benguela, Huambo, Cabinda, Zaire
  city: string;
  address: string;
  generalManagerId: string;
  layoutImageUrl?: string;
  totalCapacityM2: number;
  contactPhone: string;
  contactEmail: string;
  isActive: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  email: string;
  role: UserRole;
  warehouseId: string; // 'all' for superadmin and gestor_frotas
  phone: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  // Specific role metadata
  supplierCompanyName?: string;
  clientDepartment?: string;
}

export interface WarehouseSpecificProductData {
  localDescription?: string;
  localColor?: string;
  localSize?: string;
  localLocationId?: string; // Corredor/Prateleira
  minStockAlert: number;
  maxStock: number;
}

export interface ChemicalData {
  isChemical: boolean;
  fispqNumber?: string; // Ficha de Informações de Segurança de Produtos Químicos
  unNumber?: string; // Número ONU
  hazardClass?: string;
  manufactureDate?: string;
  expirationDate?: string;
  batchNumber?: string;
}

export interface CalibrationData {
  isCalibrated: boolean; // EIMES (Equipamentos de Medição e Ensaios)
  certificateNumber?: string;
  calibrationDate?: string;
  dueDate?: string;
  calibrationLaboratory?: string;
  tolerance?: string;
}

export interface Product {
  id: string;
  sku: string; // e.g., SKU-00001
  name: string;
  category: string;
  unit: string; // Unidade, Peça, Litro, Kg, Metro, Caixa
  basePriceAOA: number; // Angolan Kwanza
  standardDescription: string;
  imageUrl?: string;
  isChemical: boolean;
  isCalibrated: boolean;
  chemicalInfo?: ChemicalData;
  calibrationInfo?: CalibrationData;
  warehouseData: Record<string, WarehouseSpecificProductData>; // warehouseId -> data
  stockLevels: Record<string, number>; // warehouseId -> quantity
  createdAt: string;
  updatedAt: string;
}

export type MovementType =
  | 'entrada_compra'
  | 'entrada_transferencia'
  | 'entrada_devolucao'
  | 'entrada_inventario'
  | 'saida_cliente'
  | 'saida_transferencia'
  | 'saida_manutencao'
  | 'ajuste_inventario';

export interface StockMovement {
  id: string;
  movementCode: string; // e.g. MOV-2026-0001
  warehouseId: string;
  productId: string;
  productSku: string;
  productName: string;
  type: MovementType;
  quantity: number;
  unitPriceAOA: number;
  totalPriceAOA: number;
  originReference?: string; // N° Encomenda, Fatura, Despacho, Devolução cliente
  requesterOrRecipient?: string; // Nome do cliente ou fornecedor
  executedByUserId: string;
  executedByUserName: string;
  notes?: string;
  createdAt: string;
}

export type PurchaseStatus =
  | 'solicitado' // Aguardando aprovação do Gestor Geral
  | 'aprovado'   // Aprovado pelo Gestor Geral -> encaminhado ao Fornecedor
  | 'rejeitado'  // Rejeitado pelo Gestor Geral
  | 'em_preparacao' // Fornecedor aceitou e está preparando
  | 'em_transito'   // Fornecedor despachou
  | 'recebido_parcial' // Recebido com pendências ou itens parciais
  | 'comprado'   // Concluído e recebido integralmente
  | 'cancelado';

export interface PurchaseOrderItem {
  productId: string;
  sku: string;
  productName: string;
  quantityRequested: number;
  quantityDispatched: number;
  quantityReceived: number;
  quantityDamagedOrDefective: number;
  unitPriceAOA: number;
  status: 'pendente' | 'em_transito' | 'recebido' | 'nao_conforme';
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string; // e.g. PED-2026-0012
  warehouseId: string;
  requesterUserId: string;
  requesterName: string;
  requesterRole: UserRole;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  status: PurchaseStatus;
  items: PurchaseOrderItem[];
  totalEstimatedAOA: number;
  priority: 'normal' | 'alta' | 'urgente';
  justification: string;
  approvedByUserId?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransportModal = 'rodoviario' | 'maritimo' | 'aereo';

export interface ShipmentDocument {
  id: string;
  name: string;
  type: 'fatura' | 'packing_list' | 'conhecimento_embarque' | 'certificado_conformidade' | 'outro';
  uploadedBy: string;
  uploadedAt: string;
  fileSize: string;
  url?: string;
}

export interface Shipment {
  id: string;
  shipmentNumber: string; // e.g. ENV-2026-0034
  orderId: string;
  orderNumber: string;
  warehouseId: string;
  supplierId: string;
  supplierName: string;
  status: 'preparando' | 'enviado' | 'em_transito' | 'entregue' | 'cancelado';
  modal: TransportModal;
  // Transport info
  carrierName?: string;
  driverName?: string;
  driverLicense?: string;
  vehiclePlate?: string;
  trackingOrWaybill?: string; // N° Conhecimento de Carga / Guia de Transporte
  estimatedArrival?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  itemsDispatched: {
    productId: string;
    sku: string;
    productName: string;
    quantity: number;
  }[];
  observations?: string;
  documents: ShipmentDocument[];
  createdAt: string;
}

export interface ReceivingInspectionReport {
  id: string;
  reportNumber: string; // e.g. REC-2026-0089
  warehouseId: string;
  orderId: string;
  orderNumber: string;
  shipmentId?: string;
  receivedByUserId: string;
  receivedByUserName: string;
  inspectionDate: string;
  overallStatus: 'aprovado_total' | 'aprovado_parcial' | 'rejeitado_rnc';
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
  rncId?: string;
  createdAt: string;
}

export interface RNCReport {
  id: string;
  rncNumber: string; // e.g. RNC-2026-0005
  warehouseId: string;
  orderId?: string;
  shipmentId?: string;
  supplierId?: string;
  supplierName?: string;
  openedByUserId: string;
  openedByUserName: string;
  openedAt: string;
  status: 'aberta' | 'em_analise' | 'aguardando_reposicao' | 'resolvida' | 'cancelada';
  severity: 'baixa' | 'media' | 'alta' | 'critica';
  issueType: 'falta_quantidade' | 'avaria_transporte' | 'defeito_fabricacao' | 'divergencia_especificacao' | 'documentacao_irregular';
  description: string;
  affectedItems: {
    sku: string;
    productName: string;
    quantityAffected: number;
    defectDetail: string;
  }[];
  rootCauseAnalysis?: string;
  correctiveAction?: string;
  resolutionDate?: string;
  resolvedByUserName?: string;
  attachedPhotosOrDocs?: string[];
}

export type EquipmentCondition = 'operacional' | 'em_manutencao' | 'inativo' | 'critico';

export interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  date: string;
  type: 'preventiva' | 'corretiva' | 'preditiva' | 'inspecao';
  description: string;
  costAOA: number;
  partsReplaced: string[];
  performedBy: string;
  nextScheduledDate?: string;
  notes?: string;
}

export interface Equipment {
  id: string;
  code: string; // e.g. EQP-001, FRO-014
  name: string;
  type: 'empilhadeira' | 'camiao' | 'carrinho_eletrico' | 'gerador' | 'grua' | 'compressor' | 'outro';
  warehouseId: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  driverPhone?: string;
  condition: EquipmentCondition;
  acquisitionCostAOA: number;
  depreciationRateAnnualPercent: number;
  calculatedDepreciationAOA: number;
  currentValueAOA: number;
  monthlyRentalCostAOA: number; // Custo de aluguer mensal
  averageConsumption: string; // e.g. "14.5 L/100km" or "4.2 kWh/h"
  totalRepairCostAOA: number;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  operatingHoursOrKm: number;
  notes?: string;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  code: string;
  warehouseId: string;
  equipmentId: string;
  equipmentName: string;
  requestedByUserId: string;
  requestedByUserName: string;
  requestedRole: UserRole;
  requestType: 'reparo' | 'manutencao_preventiva' | 'abastecimento' | 'peca_reposicao' | 'outro';
  priority: 'normal' | 'alta' | 'urgente';
  description: string;
  status: 'pendente' | 'aprovado' | 'em_execucao' | 'concluido' | 'rejeitado';
  assignedTechnician?: string;
  estimatedCostAOA?: number;
  createdAt: string;
}

export interface WarehouseTransfer {
  id: string;
  transferCode: string; // e.g. TRF-2026-0042
  originWarehouseId: string;
  destinationWarehouseId: string;
  requestedByUserId: string;
  requestedByUserName: string;
  status: 'solicitada' | 'aprovada' | 'em_transito' | 'recebida' | 'rejeitada';
  items: {
    productId: string;
    sku: string;
    productName: string;
    quantity: number;
  }[];
  transportDetails?: {
    carrier?: string;
    driverName?: string;
    vehiclePlate?: string;
  };
  requestDate: string;
  approvalDate?: string;
  deliveryDate?: string;
  notes?: string;
}

export interface StorageLocation {
  id: string;
  warehouseId: string;
  aisle: string; // Corredor (ex: Corredor A)
  rack: string; // Prateleira / Estante (ex: Estante 03)
  shelf: string; // Nível (ex: Nível B)
  binCode: string; // Código de Endereçamento (ex: A-03-B)
  categoryAllowed?: string;
  maxCapacityKg?: number;
  isOccupied: boolean;
  notes?: string;
}
