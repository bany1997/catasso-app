import { Product, ChemicalData, CalibrationData, WarehouseSpecificProductData } from '../types';

const BASE_CATEGORIES = [
  {
    name: 'Mecânica e Rolamentos',
    unit: 'UN',
    prefix: 'Rolamento de Esferas',
    subtypes: ['Blindado DDU', 'Autocompensador de Rolos', 'Cônico de Precisão', 'Linear de Aço Temperado', 'Axial de Pressão'],
    brands: ['SKF', 'FAG', 'NSK', 'NTN', 'Timken'],
    basePriceRange: [18000, 145000],
    isChemical: false,
    isCalibrated: false,
  },
  {
    name: 'Hidráulica e Pneumática',
    unit: 'UN',
    prefix: 'Válvula Esférica Inox',
    subtypes: ['Flangeada ANSI 150', 'Rosca BSP Alta Pressão', 'Pneumática Solenóide 24V', 'Retenção Duplo Disco', 'Redutora de Pressão'],
    brands: ['Parker', 'Festo', 'Danfoss', 'Bosch Rexroth', 'Swagelok'],
    basePriceRange: [32000, 380000],
    isChemical: false,
    isCalibrated: false,
  },
  {
    name: 'Elétrica e Automação',
    unit: 'UN',
    prefix: 'Disjuntor Caixa Moldada',
    subtypes: ['Tripolar 100A', 'Tetrapolar 250A', 'Relé Térmico Sobrecarga', 'Inversor de Frequência 15kW', 'Contator Tripolar 32A'],
    brands: ['Schneider Electric', 'Siemens', 'ABB', 'WEG', 'Eaton'],
    basePriceRange: [25000, 520000],
    isChemical: false,
    isCalibrated: false,
  },
  {
    name: 'EPIs e Segurança Industrial',
    unit: 'PAR',
    prefix: 'Luva de Proteção Mecânica',
    subtypes: ['Nitrílica Anti-Corte Nível 5', 'Vaqueta de Couro Soldador', 'Botina Biqueira Composite', 'Capacete MSA Aba Frontal', 'Óculos Anti-Embaçante UV'],
    brands: ['3M', 'Honeywell', 'Ansell', 'MSA', 'Delta Plus'],
    basePriceRange: [4500, 48000],
    isChemical: false,
    isCalibrated: false,
  },
  {
    name: 'Produtos Químicos e Lubrificantes',
    unit: 'L',
    prefix: 'Óleo Lubrificante Industrial',
    subtypes: ['Hidráulico ISO VG 68', 'Sintético Compressores 46', 'Graxa Grafitada Alta Temp', 'Desengraxante Biodegradável', 'Fluido de Corte Solúvel'],
    brands: ['TotalEnergies', 'Shell Angola', 'Mobil', 'Castrol Industrial', 'Puma Energy'],
    basePriceRange: [12000, 195000],
    isChemical: true,
    isCalibrated: false,
  },
  {
    name: 'Instrumentação e EIMES Calibráveis',
    unit: 'UN',
    prefix: 'Manômetro Diferencial Industrial',
    subtypes: ['Escala 0-100 Bar Inox', 'Termômetro Digital PT100', 'Paquímetro Digital 300mm', 'Torquímetro de Estalo 40-200Nm', 'Micrômetro Externo 0-25mm'],
    brands: ['WIKA', 'Mitutoyo', 'Fluke', 'Endress+Hauser', 'Yokogawa'],
    basePriceRange: [45000, 680000],
    isChemical: false,
    isCalibrated: true,
  },
  {
    name: 'Tubagens, Flanges e Conexões',
    unit: 'M',
    prefix: 'Tubo de Aço Carbono Sem Costura',
    subtypes: ['SCH 40 4 Polegadas', 'SCH 80 2 Polegadas', 'Flange WN ANSI 300#', 'Curva 90 LR Soldável', 'Tê Redução ANSI'],
    brands: ['Vallourec', 'Tenaris', 'Asme Standard', 'Conforja', 'Tuper'],
    basePriceRange: [15000, 240000],
    isChemical: false,
    isCalibrated: false,
  },
  {
    name: 'Fixação e Elementos Roscados',
    unit: 'CX',
    prefix: 'Parafuso Sextavado Grau 8.8',
    subtypes: ['M16 x 80mm Zincado', 'M20 x 120mm Galvanizado', 'Barra Roscada Inox 316', 'Porca Autotravante M12', 'Arruela de Pressão Aço'],
    brands: ['Ciser', 'Böllhoff', 'Würth', 'Unbrako', 'Fischer'],
    basePriceRange: [8500, 65000],
    isChemical: false,
    isCalibrated: false,
  },
];

const OVERRIDES_STORAGE_KEY = 'catasso_product_overrides_v1';
const CUSTOM_PRODUCTS_KEY = 'catasso_custom_products_v1';

export const TOTAL_BASE_SKUS = 50000;

// Deterministic Pseudo-Random Number Generator (PRNG) for constant reproducible catalog
function getSeedRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate base product definition at index (1 to 50000)
export function generateBaseProduct(index: number): Product {
  const catIdx = (index - 1) % BASE_CATEGORIES.length;
  const categoryMeta = BASE_CATEGORIES[catIdx];
  
  const rand1 = getSeedRandom(index * 13 + 7);
  const rand2 = getSeedRandom(index * 29 + 11);
  const rand3 = getSeedRandom(index * 47 + 19);

  const subtypeIdx = Math.floor(rand1 * categoryMeta.subtypes.length);
  const brandIdx = Math.floor(rand2 * categoryMeta.brands.length);
  const subtype = categoryMeta.subtypes[subtypeIdx];
  const brand = categoryMeta.brands[brandIdx];

  const priceRange = categoryMeta.basePriceRange[1] - categoryMeta.basePriceRange[0];
  const basePrice = Math.round((categoryMeta.basePriceRange[0] + rand3 * priceRange) / 500) * 500;

  const skuCode = `SKU-${String(index).padStart(5, '0')}`;
  const name = `${categoryMeta.prefix} ${subtype} - ${brand}`;

  // Default initial stock across 4 primary warehouses
  const stockLuanda = index <= 1200 ? Math.floor(getSeedRandom(index * 3) * 150) + 10 : (index % 12 === 0 ? Math.floor(getSeedRandom(index) * 40) : 0);
  const stockLobito = index <= 1200 ? Math.floor(getSeedRandom(index * 5) * 80) : (index % 18 === 0 ? Math.floor(getSeedRandom(index * 2) * 25) : 0);
  const stockSoyo = index <= 1200 ? Math.floor(getSeedRandom(index * 7) * 90) : (index % 15 === 0 ? Math.floor(getSeedRandom(index * 4) * 30) : 0);
  const stockHuambo = index <= 1200 ? Math.floor(getSeedRandom(index * 11) * 60) : (index % 25 === 0 ? Math.floor(getSeedRandom(index * 6) * 15) : 0);

  const chemicalInfo: ChemicalData | undefined = categoryMeta.isChemical
    ? {
        isChemical: true,
        fispqNumber: `FISPQ-AO-${String((index * 31) % 9999).padStart(4, '0')}`,
        unNumber: `ONU-${1000 + ((index * 17) % 2500)}`,
        hazardClass: index % 2 === 0 ? 'Classe 3 - Líquidos Inflamáveis' : 'Classe 9 - Substâncias Diversas',
        manufactureDate: '2025-06-15',
        expirationDate: index % 5 === 0 ? '2026-11-15' : '2027-08-30', // some near expiration
        batchNumber: `LOTE-${202500 + (index % 800)}`,
      }
    : undefined;

  const calibrationInfo: CalibrationData | undefined = categoryMeta.isCalibrated
    ? {
        isCalibrated: true,
        certificateNumber: `CAL-EIMES-${String((index * 53) % 99999).padStart(5, '0')}/2025`,
        calibrationDate: '2025-08-10',
        dueDate: index % 4 === 0 ? '2026-11-05' : '2027-04-20', // some near expiration
        calibrationLaboratory: 'Laboratório Central de Metrologia de Luanda (LCML)',
        tolerance: '± 0.25% F.S.',
      }
    : undefined;

  return {
    id: `prod-${index}`,
    sku: skuCode,
    name,
    category: categoryMeta.name,
    unit: categoryMeta.unit,
    basePriceAOA: basePrice,
    standardDescription: `Especificação técnica padrão industrial de alta durabilidade para uso contínuo em regime severo onshore/offshore.`,
    isChemical: categoryMeta.isChemical,
    isCalibrated: categoryMeta.isCalibrated,
    chemicalInfo,
    calibrationInfo,
    warehouseData: {
      'wh-luanda': {
        localLocationId: `A-${String((index % 20) + 1).padStart(2, '0')}-02`,
        minStockAlert: 15,
        maxStock: 500,
      },
      'wh-lobito': {
        localLocationId: `B-${String((index % 15) + 1).padStart(2, '0')}-01`,
        minStockAlert: 10,
        maxStock: 300,
      },
      'wh-soyo': {
        localLocationId: `C-${String((index % 12) + 1).padStart(2, '0')}-03`,
        minStockAlert: 10,
        maxStock: 250,
      },
      'wh-huambo': {
        localLocationId: `D-${String((index % 10) + 1).padStart(2, '0')}-01`,
        minStockAlert: 5,
        maxStock: 150,
      },
    },
    stockLevels: {
      'wh-luanda': stockLuanda,
      'wh-lobito': stockLobito,
      'wh-soyo': stockSoyo,
      'wh-huambo': stockHuambo,
    },
    createdAt: '2025-01-10T08:00:00Z',
    updatedAt: '2026-03-01T12:00:00Z',
  };
}

class CatalogService {
  private overrides: Record<string, Partial<Product>> = {};
  private customProducts: Product[] = [];
  private highestCustomSkuIndex = TOTAL_BASE_SKUS;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedOverrides = localStorage.getItem(OVERRIDES_STORAGE_KEY);
      if (storedOverrides) {
        this.overrides = JSON.parse(storedOverrides);
      }
      const storedCustom = localStorage.getItem(CUSTOM_PRODUCTS_KEY);
      if (storedCustom) {
        this.customProducts = JSON.parse(storedCustom);
        if (this.customProducts.length > 0) {
          const maxNum = Math.max(
            ...this.customProducts.map(p => {
              const match = p.sku.match(/SKU-(\d+)/);
              return match ? parseInt(match[1], 10) : TOTAL_BASE_SKUS;
            })
          );
          if (maxNum > this.highestCustomSkuIndex) {
            this.highestCustomSkuIndex = maxNum;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load product storage', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(this.overrides));
      localStorage.setItem(CUSTOM_PRODUCTS_KEY, JSON.stringify(this.customProducts));
    } catch (e) {
      console.error('Failed to save product storage', e);
    }
  }

  // Get full resolved product with applied overrides
  public getProductBySku(sku: string): Product | null {
    // Check custom products first
    const custom = this.customProducts.find(p => p.sku.toLowerCase() === sku.toLowerCase());
    if (custom) {
      return this.applyOverrides(custom);
    }

    // Check base generated catalog
    const match = sku.match(/SKU-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= TOTAL_BASE_SKUS) {
        const base = generateBaseProduct(num);
        return this.applyOverrides(base);
      }
    }
    return null;
  }

  public getProductById(id: string): Product | null {
    const custom = this.customProducts.find(p => p.id === id);
    if (custom) return this.applyOverrides(custom);

    if (id.startsWith('prod-')) {
      const num = parseInt(id.replace('prod-', ''), 10);
      if (num >= 1 && num <= TOTAL_BASE_SKUS) {
        return this.applyOverrides(generateBaseProduct(num));
      }
    }
    return null;
  }

  private applyOverrides(product: Product): Product {
    const override = this.overrides[product.id];
    if (!override) return product;

    return {
      ...product,
      ...override,
      stockLevels: {
        ...product.stockLevels,
        ...(override.stockLevels || {}),
      },
      warehouseData: {
        ...product.warehouseData,
        ...(override.warehouseData || {}),
      },
      chemicalInfo: override.chemicalInfo
        ? { ...product.chemicalInfo, ...override.chemicalInfo }
        : product.chemicalInfo,
      calibrationInfo: override.calibrationInfo
        ? { ...product.calibrationInfo, ...override.calibrationInfo }
        : product.calibrationInfo,
    };
  }

  // Update base price
  public updateBasePrice(productId: string, newPriceAOA: number): boolean {
    if (newPriceAOA < 0) return false;
    const current = this.overrides[productId] || {};
    this.overrides[productId] = {
      ...current,
      basePriceAOA: newPriceAOA,
      updatedAt: new Date().toISOString(),
    };
    this.saveToStorage();
    return true;
  }

  // Update warehouse-specific attributes (description, color, size, min stock alert)
  public updateWarehouseSpecificData(
    productId: string,
    warehouseId: string,
    data: Partial<WarehouseSpecificProductData>
  ): boolean {
    const current = this.overrides[productId] || {};
    const whData = current.warehouseData || {};
    const existingForWh = whData[warehouseId] || { minStockAlert: 10, maxStock: 200 };

    this.overrides[productId] = {
      ...current,
      warehouseData: {
        ...whData,
        [warehouseId]: {
          ...existingForWh,
          ...data,
        },
      },
      updatedAt: new Date().toISOString(),
    };
    this.saveToStorage();
    return true;
  }

  // Update stock quantity for a warehouse (strictly non-negative)
  public updateStockQuantity(productId: string, warehouseId: string, quantity: number): boolean {
    if (quantity < 0) return false;
    const current = this.overrides[productId] || {};
    const stockLevels = current.stockLevels || {};

    this.overrides[productId] = {
      ...current,
      stockLevels: {
        ...stockLevels,
        [warehouseId]: quantity,
      },
      updatedAt: new Date().toISOString(),
    };
    this.saveToStorage();
    return true;
  }

  // Update chemical or calibration data
  public updateChemicalOrCalibration(
    productId: string,
    chemical?: ChemicalData,
    calibration?: CalibrationData
  ): boolean {
    const current = this.overrides[productId] || {};
    this.overrides[productId] = {
      ...current,
      ...(chemical ? { chemicalInfo: chemical, isChemical: chemical.isChemical } : {}),
      ...(calibration ? { calibrationInfo: calibration, isCalibrated: calibration.isCalibrated } : {}),
      updatedAt: new Date().toISOString(),
    };
    this.saveToStorage();
    return true;
  }

  // Register new product continuing unique sequential SKU
  public registerNewProduct(
    productData: Omit<Product, 'id' | 'sku' | 'createdAt' | 'updatedAt'>
  ): Product {
    this.highestCustomSkuIndex += 1;
    const newSku = `SKU-${String(this.highestCustomSkuIndex).padStart(5, '0')}`;
    const newId = `prod-${this.highestCustomSkuIndex}`;
    const now = new Date().toISOString();

    const newProd: Product = {
      ...productData,
      id: newId,
      sku: newSku,
      createdAt: now,
      updatedAt: now,
    };

    this.customProducts.push(newProd);
    this.saveToStorage();
    return newProd;
  }

  // Search & Query engine with high performance
  public searchProducts(params: {
    query?: string;
    category?: string;
    warehouseId?: string;
    onlyLowStock?: boolean;
    onlyChemical?: boolean;
    onlyCalibrated?: boolean;
    page?: number;
    pageSize?: number;
  }): {
    products: Product[];
    totalCount: number;
    page: number;
    totalPages: number;
  } {
    const {
      query = '',
      category = 'all',
      warehouseId = 'wh-luanda',
      onlyLowStock = false,
      onlyChemical = false,
      onlyCalibrated = false,
      page = 1,
      pageSize = 25,
    } = params;

    const cleanQ = query.trim().toLowerCase();

    // Fast path: if user typed an exact SKU or ID, check directly
    if (cleanQ.startsWith('sku-')) {
      const single = this.getProductBySku(cleanQ);
      if (single) {
        return {
          products: [single],
          totalCount: 1,
          page: 1,
          totalPages: 1,
        };
      }
    }

    const matchesFilter = (p: Product): boolean => {
      if (cleanQ) {
        const inSku = p.sku.toLowerCase().includes(cleanQ);
        const inName = p.name.toLowerCase().includes(cleanQ);
        const inDesc = p.standardDescription.toLowerCase().includes(cleanQ);
        const localData = p.warehouseData[warehouseId];
        const inLocal = localData?.localDescription?.toLowerCase().includes(cleanQ);
        if (!inSku && !inName && !inDesc && !inLocal) return false;
      }

      if (category !== 'all' && p.category !== category) return false;
      if (onlyChemical && !p.isChemical) return false;
      if (onlyCalibrated && !p.isCalibrated) return false;

      if (onlyLowStock) {
        const localStock = p.stockLevels[warehouseId] || 0;
        const minAlert = p.warehouseData[warehouseId]?.minStockAlert ?? 10;
        if (localStock > minAlert) return false;
      }

      return true;
    };

    // Aggregate custom products first
    const matched: Product[] = [];

    for (const cp of this.customProducts) {
      const resolved = this.applyOverrides(cp);
      if (matchesFilter(resolved)) {
        matched.push(resolved);
      }
    }

    // Determine how many items to sample or scan
    // For general browsing, we scan through index space efficiently
    let totalEstimated = matched.length;
    const startIndex = (page - 1) * pageSize;

    if (!cleanQ && category === 'all' && !onlyLowStock && !onlyChemical && !onlyCalibrated) {
      // Direct fast pagination over the 50,000 SKUs!
      totalEstimated += TOTAL_BASE_SKUS;
      const baseStart = Math.max(1, startIndex + 1 - matched.length);
      const baseEnd = Math.min(TOTAL_BASE_SKUS, baseStart + pageSize - matched.length);

      for (let i = baseStart; i <= baseEnd; i++) {
        matched.push(this.applyOverrides(generateBaseProduct(i)));
      }

      return {
        products: matched.slice(0, pageSize),
        totalCount: totalEstimated,
        page,
        totalPages: Math.ceil(totalEstimated / pageSize),
      };
    }

    // When searching or filtering, iterate intelligently through active range
    const searchLimit = cleanQ ? 1500 : 800; // Fast scan window
    for (let i = 1; i <= searchLimit; i++) {
      const p = this.applyOverrides(generateBaseProduct(i));
      if (matchesFilter(p)) {
        matched.push(p);
      }
    }

    totalEstimated = matched.length;
    const paginated = matched.slice((page - 1) * pageSize, page * pageSize);

    return {
      products: paginated,
      totalCount: totalEstimated,
      page,
      totalPages: Math.max(1, Math.ceil(totalEstimated / pageSize)),
    };
  }

  // Get Chemical Products List
  public getChemicalProducts(warehouseId: string): Product[] {
    const list: Product[] = [];
    // Custom chemicals
    for (const cp of this.customProducts) {
      if (cp.isChemical) list.push(this.applyOverrides(cp));
    }
    // Base chemicals
    for (let i = 1; i <= 600; i++) {
      const p = this.applyOverrides(generateBaseProduct(i));
      if (p.isChemical) list.push(p);
    }
    return list;
  }

  // Get Calibrated (EIMES) Products List
  public getCalibratedProducts(warehouseId: string): Product[] {
    const list: Product[] = [];
    for (const cp of this.customProducts) {
      if (cp.isCalibrated) list.push(this.applyOverrides(cp));
    }
    for (let i = 1; i <= 600; i++) {
      const p = this.applyOverrides(generateBaseProduct(i));
      if (p.isCalibrated) list.push(p);
    }
    return list;
  }

  public getTotalCatalogCount(): number {
    return TOTAL_BASE_SKUS + this.customProducts.length;
  }
}

export const catalogService = new CatalogService();
