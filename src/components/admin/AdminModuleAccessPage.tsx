import { useEffect, useState } from 'react';
import { Shield, Unlock, Lock } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { getModuleAccessMap, setModuleAccess } from '../../services/courseService';
import { allModules } from '../../content/modules';
import type { ModuleAccess, AccessTier } from '../../types/database';
import type { Module } from '../../types/content';

export default function AdminModuleAccessPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [accessMap, setAccessMap] = useState<Map<string, ModuleAccess>>(new Map());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const map = await getModuleAccessMap();
      setModules(allModules);
      setAccessMap(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpdateTier = async (moduleId: string, tier: AccessTier) => {
    setSavingId(moduleId);
    try {
      await setModuleAccess(moduleId, tier, []);
      await load();
    } catch (e) {
      alert('Error al actualizar el acceso');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout title="Acceso a Módulos">
      <div className="mb-6">
        <p className="text-sm text-slate-500">
          Configura qué módulos son gratuitos y cuáles requieren suscripción Premium.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando módulos...</p>
      ) : modules.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No hay módulos publicados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map(mod => {
            const access = accessMap.get(mod.id);
            const currentTier = access?.required_tier || 'premium'; // Default to premium if not set
            
            return (
              <div key={mod.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/30">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{mod.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-1">{mod.description || 'Sin descripción'}</p>
                </div>
                
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                  <button
                    disabled={savingId === mod.id}
                    onClick={() => handleUpdateTier(mod.id, 'free')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      currentTier === 'free' 
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Unlock className="w-4 h-4" /> Gratis
                  </button>
                  <button
                    disabled={savingId === mod.id}
                    onClick={() => handleUpdateTier(mod.id, 'premium')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      currentTier === 'premium' 
                        ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Lock className="w-4 h-4" /> Premium
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
