'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Paperclip,
  Upload,
  Trash2,
  ExternalLink,
  Check,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { StoredAttachment } from '@/lib/email-attachments';

interface GlobalAttachmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachments: StoredAttachment[];
  onSave: (attachments: StoredAttachment[]) => Promise<void>;
  onResetDefault: () => Promise<void>;
}

export default function GlobalAttachmentsModal({
  isOpen,
  onClose,
  attachments,
  onSave,
  onResetDefault,
}: GlobalAttachmentsModalProps) {
  const [items, setItems] = useState<StoredAttachment[]>(attachments);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync internal state with props when modal opens
  React.useEffect(() => {
    setItems(attachments);
    setError(null);
    setSuccessMsg(null);
  }, [isOpen, attachments]);

  if (!isOpen) return null;

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 Ko';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    }
    return `${Math.round(bytes / 1024)} Ko`;
  };

  const handleToggleEnabled = async (id: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    setItems(updated);
    await onSave(updated);
  };

  const handleDeleteItem = async (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    await onSave(updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du téléversement');
      }

      const newStored: StoredAttachment[] = data.files.map((f: any) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
        url: f.url,
        path: f.path,
        enabled: true,
        isDefault: false,
      }));

      const updated = [...items, ...newStored];
      setItems(updated);
      await onSave(updated);

      setSuccessMsg(`${newStored.length} fichier(s) ajouté(s) aux pièces jointes globales !`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Échec du téléversement');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetToDefault = async () => {
    await onResetDefault();
    setSuccessMsg('Pièce jointe officielle par défaut rétablie.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const activeCount = items.filter((i) => i.enabled).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--white)] border-2 border-[var(--ink)] shadow-[8px_8px_0_var(--ink)] w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b-2 border-[var(--ink)] bg-[var(--yellow)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--ink)] text-[var(--yellow)]">
              <Paperclip className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-[var(--ink)]">
                PIÈCES JOINTES GLOBALES
              </h2>
              <p className="text-xs font-mono text-[var(--ink)]/80 uppercase">
                {activeCount} active(s) • Envoyée(s) avec tous les e-mails par défaut
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border-2 border-[var(--ink)] hover:bg-[var(--white)] text-[var(--ink)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-red-100 border-2 border-red-700 text-red-900 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-100 border-2 border-emerald-700 text-emerald-900 text-xs font-mono flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="text-xs text-[var(--ink)] leading-relaxed">
            Configurez ici les documents (brochure, dossier de sponsoring, grille tarifaire, etc.)
            qui seront automatiquement joints à chaque e-mail expédié ou programmé.
          </div>

          {/* Current Attachments List */}
          <div className="space-y-2">
            <div className="text-xs font-mono font-bold text-[var(--ink)] uppercase tracking-wider flex items-center justify-between">
              <span>DOCUMENTS ATTACHÉS ACTUELS ({items.length})</span>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[11px] font-mono text-[var(--blue)] hover:underline flex items-center gap-1 font-bold lowercase"
                title="Réinsérer le dossier de sponsoring ORBYX officiel"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Rétablir dossier par défaut</span>
              </button>
            </div>

            {items.length === 0 ? (
              <div className="p-6 border-2 border-dashed border-[var(--ink)]/30 text-center text-xs font-mono text-[var(--grey)]">
                Aucune pièce jointe globale configurée. Cliquez sur le bouton ci-dessous pour en ajouter une.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 border-2 border-[var(--ink)] flex items-center justify-between gap-3 transition-colors ${
                      item.enabled ? 'bg-[var(--ground)]' : 'bg-gray-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => handleToggleEnabled(item.id)}
                        className="w-4 h-4 accent-[var(--blue)] cursor-pointer"
                        title={item.enabled ? 'Désactiver cette pièce jointe' : 'Activer cette pièce jointe'}
                      />
                      <div className="w-8 h-8 rounded bg-red-100 border border-red-300 flex items-center justify-center text-red-700 font-bold text-xs shrink-0">
                        {item.name.toLowerCase().endsWith('.pdf') ? 'PDF' : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-[var(--ink)] truncate max-w-[280px] sm:max-w-md">
                            {item.name}
                          </p>
                          {item.isDefault && (
                            <span className="text-[9px] font-mono bg-[var(--yellow)] px-1 py-0.5 border border-[var(--ink)] font-black">
                              PAR DÉFAUT
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-[var(--grey)]">
                          {formatFileSize(item.size)} • {item.enabled ? 'Actif (inclus)' : 'Désactivé'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 border border-[var(--ink)] bg-[var(--white)] hover:bg-[var(--yellow)] text-[var(--ink)] transition-colors"
                        title="Voir / Télécharger ce fichier"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 border border-red-800 bg-[var(--white)] hover:bg-red-600 hover:text-white text-red-800 transition-colors"
                        title="Supprimer cette pièce jointe"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Area */}
          <div className="pt-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full p-5 border-2 border-dashed border-[var(--ink)] bg-[var(--white)] hover:bg-[var(--ground)] text-[var(--ink)] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Upload className={`w-6 h-6 text-[var(--blue)] ${uploading ? 'animate-bounce' : ''}`} />
              <div className="text-xs font-bold uppercase tracking-tight">
                {uploading ? 'Téléversement en cours...' : '+ Téléverser un ou plusieurs documents'}
              </div>
              <div className="text-[10px] font-mono text-[var(--grey)]">
                PDF, Word, Excel, Images (taille max recommandée : 15 Mo par fichier)
              </div>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t-2 border-[var(--ink)] bg-[var(--ground)] flex items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-[var(--grey)]">
            💡 Chaque destinataire recevra les fichiers actifs cochés.
          </div>
          <button
            onClick={onClose}
            className="btn-transit ink !py-2 !px-5 !text-xs !font-bold"
          >
            TERMINER
          </button>
        </div>
      </div>
    </div>
  );
}
