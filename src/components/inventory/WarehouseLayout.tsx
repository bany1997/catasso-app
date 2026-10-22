import React, { useState } from 'react';
import { erpStore } from '../../services/store';
import { StorageLocation } from '../../types';
import {
  MapPin,
  Image as ImageIcon,
  Plus,
  Layers,
  Pencil,
} from 'lucide-react';

export const WarehouseLayout: React.FC = () => {
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);
  
  const [isChangeImageOpen, setIsChangeImageOpen] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [imageFileBase64, setImageFileBase64] = useState('');

  // Location Form State
  const [aisle, setAisle] = useState('Corredor D');
  const [rack, setRack] = useState('Estante 01');
  const [shelf, setShelf] = useState('Nível 1');
  const [binCode, setBinCode] = useState('D-01-A');
  const [maxCapacity, setMaxCapacity] = useState(1500);
  const [isOccupied, setIsOccupied] = useState(false);
  const [notes, setNotes] = useState('');

  const currentUser = erpStore.currentUser;
  const activeWh = erpStore.getActiveWarehouse();

  const canManageLayout =
    currentUser?.role === 'superadmin' ||
    currentUser?.role === 'gestor_geral' ||
    currentUser?.role === 'responsavel_armazem';

  // Locations for this active warehouse
  const locations = erpStore.locations.filter(l => l.warehouseId === activeWh?.id);

  const handleOpenAddModal = () => {
    setEditingLocation(null);
    setAisle('Corredor D');
    setRack('Estante 01');
    setShelf('Nível 1');
    setBinCode(`D-0${locations.length + 1}-A`);
    setMaxCapacity(1500);
    setIsOccupied(false);
    setNotes('');
    setIsAddLocationOpen(true);
  };

  const handleOpenEditModal = (loc: StorageLocation) => {
    setEditingLocation(loc);
    setAisle(loc.aisle);
    setRack(loc.rack);
    setShelf(loc.shelf);
    setBinCode(loc.binCode);
    setMaxCapacity(loc.maxCapacityKg || 1500);
    setIsOccupied(loc.isOccupied);
    setNotes(loc.notes || '');
    setIsAddLocationOpen(true);
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWh) return;

    if (editingLocation) {
      erpStore.updateStorageLocation(editingLocation.id, {
        aisle,
        rack,
        shelf,
        binCode: binCode.toUpperCase(),
        maxCapacityKg: maxCapacity,
        isOccupied,
        notes,
      });
      alert(`Endereço ${binCode.toUpperCase()} atualizado com sucesso!`);
    } else {
      erpStore.addStorageLocation({
        warehouseId: activeWh.id,
        aisle,
        rack,
        shelf,
        binCode: binCode.toUpperCase(),
        maxCapacityKg: maxCapacity,
        isOccupied: false,
        notes,
      });
      alert('Endereçamento físico de armazenagem criado com sucesso!');
    }

    setIsAddLocationOpen(false);
    setEditingLocation(null);
  };

  const handleLayoutImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateLayoutImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWh) return;

    const finalImage = imageFileBase64 || newImageUrl.trim();
    if (!finalImage) {
      alert('Por favor, insira um URL ou selecione uma imagem para o layout.');
      return;
    }

    erpStore.updateWarehouse(activeWh.id, {
      layoutImageUrl: finalImage,
    });

    setIsChangeImageOpen(false);
    setNewImageUrl('');
    setImageFileBase64('');
    alert('Planta baixa / Layout visual do armazém atualizado com sucesso!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-sky-400" />
            <span>Layout Industrial & Endereçamento Físico</span>
            <span className="text-xs text-slate-400 font-mono">({activeWh?.name})</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Planta de zoneamento espacial, corredores, racks de alta densidade e controlo de posições porta-paletes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageLayout && (
            <>
              <button
                type="button"
                onClick={() => setIsChangeImageOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                <span>Alterar Planta Baixa</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Posição / Endereço</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Planta Baixa Operacional: {activeWh?.name} ({activeWh?.province})
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Capacidade Total: {activeWh?.totalCapacityM2.toLocaleString()} m²
          </span>
        </div>

        <div className="p-4">
          <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 h-72 sm:h-96">
            <img
              src={
                activeWh?.layoutImageUrl ||
                'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80'
              }
              alt="Planta Baixa do Armazém"
              className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />

            <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-700/80 p-3 rounded-xl text-xs backdrop-blur-sm shadow-xl">
              <div className="font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Zoneamento Ativo de Armazenagem</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                <div>• Zona A: Rolamentos & Alta Rotatividade</div>
                <div>• Zona B: Válvulas Flangeadas & Tubulações Pesadas</div>
                <div>• Zona C: Armazenamento Especial de Produtos Químicos</div>
                <div>• Doca 01 / 02: Carga, Descarga e Vistoria</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Posições Físicas & Endereçamento Cadastrado ({locations.length})
          </h2>
          <span className="text-xs text-slate-400">
            Codificação Aisle-Rack-Shelf (ex: A-01-A)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <th className="py-3 px-3">Código Endereço</th>
                <th className="py-3 px-3">Corredor</th>
                <th className="py-3 px-3">Estante / Rack</th>
                <th className="py-3 px-3">Nível / Prateleira</th>
                <th className="py-3 px-3 text-right">Capacidade Máxima</th>
                <th className="py-3 px-3 text-center">Ocupação</th>
                <th className="py-3 px-3">Observações</th>
                {canManageLayout && <th className="py-3 px-3 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Nenhuma posição cadastrada para este armazém.
                  </td>
                </tr>
              ) : (
                locations.map(loc => (
                  <tr key={loc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-sky-400 whitespace-nowrap">
                      {loc.binCode}
                    </td>
                    <td className="py-3 px-3 text-slate-200">{loc.aisle}</td>
                    <td className="py-3 px-3 text-slate-300">{loc.rack}</td>
                    <td className="py-3 px-3 text-slate-300">{loc.shelf}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                      {loc.maxCapacityKg ? `${loc.maxCapacityKg.toLocaleString()} kg` : 'Padrão'}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-bold border ${
                          loc.isOccupied
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        }`}
                      >
                        {loc.isOccupied ? 'Ocupado' : 'Disponível'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{loc.notes || 'Padrão'}</td>
                    {canManageLayout && (
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(loc)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          title="Editar Localização"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddLocationOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">
                  {editingLocation ? 'Editar Posição de Estoque' : 'Cadastrar Nova Posição de Estoque'}
                </h3>
                <p className="text-xs text-slate-400">Unidade: {activeWh?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddLocationOpen(false);
                  setEditingLocation(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Corredor *</label>
                  <input
                    type="text"
                    required
                    value={aisle}
                    onChange={e => setAisle(e.target.value)}
                    placeholder="Ex: Corredor D"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estante / Rack *</label>
                  <input
                    type="text"
                    required
                    value={rack}
                    onChange={e => setRack(e.target.value)}
                    placeholder="Ex: Estante 01"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nível / Prateleira *</label>
                  <input
                    type="text"
                    required
                    value={shelf}
                    onChange={e => setShelf(e.target.value)}
                    placeholder="Ex: Nível A"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Código do Endereço *</label>
                  <input
                    type="text"
                    required
                    value={binCode}
                    onChange={e => setBinCode(e.target.value.toUpperCase())}
                    placeholder="Ex: D-01-A"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Capacidade de Carga (kg)</label>
                  <input
                    type="number"
                    min="100"
                    value={maxCapacity}
                    onChange={e => setMaxCapacity(parseInt(e.target.value, 10) || 1000)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estado da Posição</label>
                  <select
                    value={isOccupied ? 'true' : 'false'}
                    onChange={e => setIsOccupied(e.target.value === 'true')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-semibold"
                  >
                    <option value="false">Disponível</option>
                    <option value="true">Ocupado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Observações da Posição</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ex: Bacia de contenção para tambores químicos."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddLocationOpen(false);
                    setEditingLocation(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow"
                >
                  {editingLocation ? 'Salvar Alterações' : 'Criar Posição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isChangeImageOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">Alterar Layout Visual do Armazém</h3>
                <p className="text-xs text-slate-400">{activeWh?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeImageOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateLayoutImage} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Upload de Arquivo de Imagem (PNG, JPG)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLayoutImageFileUpload}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-300 file:bg-slate-800 file:text-white file:border-0 file:rounded-lg file:px-2 file:py-1 file:text-xs"
                />
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-2 text-[10px] text-slate-500 uppercase">ou via URL</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  URL da Imagem da Planta Baixa
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newImageUrl}
                  onChange={e => setNewImageUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsChangeImageOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow"
                >
                  Atualizar Layout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
