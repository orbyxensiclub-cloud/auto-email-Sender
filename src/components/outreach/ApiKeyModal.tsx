'use client';

import React, { useState } from 'react';
import {
  Key,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  X,
  Mail,
  Cpu,
  Plus,
  Trash2,
  Check,
  Zap,
} from 'lucide-react';
import { GeminiKeyItem } from '@/app/api/gemini/keys/route';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  smtpPass?: string;
  keysPool?: GeminiKeyItem[];
  onSave: (primaryKey: string, smtpPass: string, updatedPool: GeminiKeyItem[]) => void;
}

export default function ApiKeyModal({
  isOpen,
  onClose,
  apiKey,
  smtpPass = '',
  keysPool = [],
  onSave,
}: ApiKeyModalProps) {
  const [smtpInput, setSmtpInput] = useState(smtpPass);
  const [showSmtp, setShowSmtp] = useState(false);

  // Pool of keys state
  const [pool, setPool] = useState<GeminiKeyItem[]>(() => {
    if (keysPool && keysPool.length > 0) return keysPool;
    if (apiKey) {
      return [{ id: 'primary', name: 'CLÉ PRINCIPALE', key: apiKey, enabled: true }];
    }
    return [];
  });

  // Adding a new key
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  // Per-key testing state
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [keyTestResults, setKeyTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Visibility toggle per key
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const activeWorkersCount = pool.filter((k) => k.enabled && k.key.trim().length > 0).length;

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleKeyEnabled = (id: string) => {
    setPool((prev) =>
      prev.map((k) => (k.id === id ? { ...k, enabled: !k.enabled } : k))
    );
  };

  const handleRemoveKey = (id: string) => {
    setPool((prev) => prev.filter((k) => k.id !== id));
  };

  const handleAddNewKey = () => {
    if (!newKeyValue.trim()) return;
    const name = newKeyName.trim() || `CLÉ ${pool.length + 1}`;
    const id = `custom_${Date.now()}`;
    const newItem: GeminiKeyItem = {
      id,
      name: name.toUpperCase(),
      key: newKeyValue.trim(),
      enabled: true,
    };
    setPool((prev) => [...prev, newItem]);
    setNewKeyName('');
    setNewKeyValue('');
  };

  const testSingleKey = async (item: GeminiKeyItem) => {
    setTestingKeyId(item.id);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${item.key.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'ping' }] }],
          }),
        }
      );
      const data = await res.json();
      if (res.ok && data.candidates) {
        setKeyTestResults((prev) => ({
          ...prev,
          [item.id]: { success: true, message: 'OPÉRATIONNELLE (gemini-3.5-flash-lite)' },
        }));
      } else {
        setKeyTestResults((prev) => ({
          ...prev,
          [item.id]: {
            success: false,
            message: data.error?.message || `Erreur HTTP ${res.status}`,
          },
        }));
      }
    } catch (e: any) {
      setKeyTestResults((prev) => ({
        ...prev,
        [item.id]: { success: false, message: e.message || 'Échec de connexion' },
      }));
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleSave = () => {
    const primary = pool.find((k) => k.enabled)?.key || pool[0]?.key || apiKey;
    onSave(primary, smtpInput.trim(), pool);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[var(--ink)]/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-[var(--white)] border-4 border-[var(--ink)] shadow-[8px_8px_0_var(--ink)] p-5 sm:p-6 text-[var(--ink)] my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-[var(--ink)] shrink-0">
          <div className="flex items-center gap-3">
            <Cpu className="w-6 h-6 text-[var(--blue)] stroke-[2.5]" />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">
                POOL MULTI-CLÉS & PARALLÉLISME GEMINI IA
              </h3>
              <p className="text-xs font-mono text-[var(--grey)] uppercase">
                EXÉCUTION EN PARALLÈLE & ENVOI SMTP GMAIL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-[var(--ink)] hover:bg-[var(--yellow)] transition-colors"
          >
            <X className="w-5 h-5 stroke-[3]" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="mt-4 space-y-5 overflow-y-auto pr-1 flex-1">
          {/* Parallel Execution Multiplier Banner */}
          <div className="p-3 bg-[var(--ink)] text-[var(--white)] border-2 border-[var(--yellow)] shadow-[3px_3px_0_var(--yellow)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-[var(--yellow)] fill-[var(--yellow)] shrink-0" />
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-[var(--yellow)]">
                  {activeWorkersCount} WORKERS PARALLÈLES SIMULTANÉS
                </div>
                <div className="text-[11px] font-mono text-[var(--white)]/90">
                  Pour chaque clé API active, une exécution parallèle indépendante traite les e-mails en simultané.
                </div>
              </div>
            </div>
            <div className="px-2.5 py-1 bg-[var(--yellow)] text-[var(--ink)] font-mono font-black text-xs uppercase whitespace-nowrap">
              x{activeWorkersCount} VITESSE
            </div>
          </div>

          {/* Section 1: Active Keys List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[var(--blue)]" />
                <span>CLÉS API CONFIGURÉES DANS LE POOL ({pool.length})</span>
              </label>
              <span className="text-[10px] font-mono font-bold text-[var(--grey)]">
                {activeWorkersCount} / {pool.length} ACTIVES
              </span>
            </div>

            <div className="space-y-2">
              {pool.map((item) => {
                const isTesting = testingKeyId === item.id;
                const testRes = keyTestResults[item.id];
                const isVisible = !!visibleKeys[item.id];

                return (
                  <div
                    key={item.id}
                    className={`p-2.5 border-2 border-[var(--ink)] transition-colors ${
                      item.enabled ? 'bg-[var(--ground)]' : 'bg-gray-100 opacity-60'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {/* Name & Checkbox */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={() => toggleKeyEnabled(item.id)}
                          className="w-4 h-4 accent-[var(--ink)] cursor-pointer"
                          title={item.enabled ? 'Désactiver cette clé' : 'Activer cette clé'}
                        />
                        <span className="font-mono font-black text-xs uppercase px-2 py-0.5 bg-[var(--ink)] text-[var(--white)]">
                          {item.name}
                        </span>
                        {item.enabled ? (
                          <span className="text-[10px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" /> WORKER ACTIF
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-[var(--grey)] uppercase">
                            Désactivé
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => testSingleKey(item)}
                          disabled={isTesting || !item.key}
                          className="px-2 py-1 text-[10px] font-mono font-black uppercase border border-[var(--ink)] bg-[var(--white)] hover:bg-[var(--yellow)] disabled:opacity-40 transition-colors"
                        >
                          {isTesting ? 'TEST...' : 'TESTER'}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleKeyVisibility(item.id)}
                          className="p-1 border border-[var(--ink)] bg-[var(--white)] hover:bg-[var(--ground)] text-[var(--ink)]"
                          title="Afficher/Masquer la clé"
                        >
                          {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        {item.id.startsWith('custom_') && (
                          <button
                            type="button"
                            onClick={() => handleRemoveKey(item.id)}
                            className="p-1 border border-red-700 bg-red-100 text-red-900 hover:bg-red-200"
                            title="Supprimer cette clé"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Key Input / View */}
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type={isVisible ? 'text' : 'password'}
                        value={item.key}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPool((prev) =>
                            prev.map((k) => (k.id === item.id ? { ...k, key: val } : k))
                          );
                        }}
                        placeholder="AQ.Ab8..."
                        className="w-full px-2.5 py-1 text-xs font-mono border border-[var(--ink)] bg-[var(--white)] font-bold text-[var(--ink)] outline-none"
                      />
                    </div>

                    {/* Test result status if any */}
                    {testRes && (
                      <div
                        className={`mt-1.5 px-2 py-1 text-[10px] font-mono font-bold flex items-center gap-1.5 ${
                          testRes.success
                            ? 'bg-[#E8F8EE] text-emerald-950 border border-emerald-700'
                            : 'bg-[#FFE8E8] text-red-950 border border-red-700'
                        }`}
                      >
                        {testRes.success ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-red-700 shrink-0" />
                        )}
                        <span className="truncate">{testRes.message}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Add another key */}
          <div className="p-3 bg-[var(--ground)] border-2 border-dashed border-[var(--ink)]">
            <label className="block text-xs font-mono font-black mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[var(--blue)] stroke-[3]" />
              <span>AJOUTER UNE NOUVELLE CLÉ (+1 WORKER PARALLÈLE)</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="NOM DU MEMBRE (ex: NOUR)"
                className="sm:w-1/3 px-3 py-1.5 text-xs font-mono border-2 border-[var(--ink)] bg-[var(--white)] font-bold uppercase outline-none"
              />
              <input
                type="text"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                placeholder="CLÉ API GEMINI (AQ.Ab8... ou AIza...)"
                className="flex-1 px-3 py-1.5 text-xs font-mono border-2 border-[var(--ink)] bg-[var(--white)] font-bold outline-none"
              />
              <button
                type="button"
                onClick={handleAddNewKey}
                disabled={!newKeyValue.trim()}
                className="btn-transit ink !py-1.5 !px-3 !text-xs !font-black uppercase disabled:opacity-30 whitespace-nowrap"
              >
                + AJOUTER
              </button>
            </div>
          </div>

          {/* Section 3: Gmail SMTP */}
          <div className="p-3.5 bg-[var(--white)] border-2 border-[var(--ink)]">
            <div className="flex items-center gap-2 mb-1.5">
              <Mail className="w-4 h-4 text-[var(--blue)] stroke-[2.5]" />
              <label className="text-xs font-mono font-black uppercase tracking-wider">
                MOT DE PASSE D&apos;APPLICATION GMAIL (SMTP)
              </label>
            </div>
            <p className="text-[11px] font-mono text-[var(--grey)] mb-2 leading-relaxed">
              Expéditeur : <strong className="text-[var(--ink)]">orbyx.ensiclub@ensi-uma.tn</strong>.
              Pour l&apos;envoi automatique direct via Gmail, utilisez un mot de passe d&apos;application (16 caractères) sur{' '}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--blue)] font-bold underline"
              >
                Google App Passwords
              </a>
              .
            </p>
            <div className="relative">
              <input
                type={showSmtp ? 'text' : 'password'}
                value={smtpInput}
                onChange={(e) => setSmtpInput(e.target.value)}
                placeholder="abcd efgh ijkl mnop"
                className="w-full px-3.5 py-2 text-xs font-mono bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowSmtp(!showSmtp)}
                className="absolute right-3 top-2.5 text-[var(--ink)]"
              >
                {showSmtp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between pt-4 border-t-2 border-[var(--ink)] shrink-0">
          <div className="text-[11px] font-mono text-[var(--grey)] font-bold uppercase">
            ⚡ {activeWorkersCount} THREAD(S) EN SIMULTANÉ
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-transit !py-2 !px-4 !text-xs !bg-[var(--white)] !text-[var(--ink)] !border-[var(--ink)] hover:!bg-[var(--ground)]"
            >
              ANNULER
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-transit yellow !py-2 !px-5 !text-xs !font-black !border-[var(--ink)]"
            >
              ENREGISTRER ({activeWorkersCount} WORKERS)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
