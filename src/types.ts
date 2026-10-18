/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- TIPOS E INTERFACES DO CATASSO ERP (ANGOLA) ---

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
  spec: string; // Ex: "Palete Fechada 40 Sacos", "Pack 24x / 500ml", "Cabinado Silencioso"
  stockByWarehouse: Record<string, number>; // warehouseId -> quantidade
  reorderPoint: number;
}

export interface MasterProduct {
  id: string;
  masterSku: string;
  name: string;
  category:
    | 'Construção & Obras'
    | 'Alimentar & Bebidas'
    | 'Peças & Maquinaria'
    | 'Eletrodomésticos & Energia'
    | 'Químicos & Fito';
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
  customsStatus:
    | 'Em Análise'
    | 'Canal Verde'
    | 'Canal Amarelo'
    | 'Canal Vermelho (Inspeção)'
    | 'Desembaraçado';
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
  type:
    | 'Camião Articulado'
    | 'Camião Porta-Contentor'
    | 'Carrinha Frigorífica'
    | 'Empilhador 5T'
    | 'Stacker Elétrico';
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

// --- HELPERS DE FORMATAÇÃO DE MOEDA KWANZA (AOA / Kz) ---

/** Formata valor numérico para o formato oficial Kwanza (ex: 14.850.000 Kz) */
export const formatKz = (value: number): string => {
  return (
    new Intl.NumberFormat('pt-AO', {
      maximumFractionDigits: 0,
    }).format(value) + ' Kz'
  );
};

/** Formata valores volumosos para dashboards executivos (ex: 2.4 B Kz, 850 M Kz) */
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
