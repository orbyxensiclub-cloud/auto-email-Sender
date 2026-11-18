'use client';

import React, { useState } from 'react';
import { Database, X, ExternalLink } from 'lucide-react';

interface SheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  onSave: (newUrl: string) => void;
}

export default function SheetModal({ isOpen, onClose, currentUrl, onSave }: SheetModalProps) {
  const [urlInput, setUrlInput] = useState(currentUrl);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onSave(urlInput.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ink)]/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[var(--white)] border-4 border-[var(--ink)] shadow-[8px_8px_0_var(--ink)] p-6 text-[var(--ink)]">
        <div className="flex items-center justify-between pb-4 border-b-2 border-[var(--ink)]">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-[var(--blue)] stroke-[2.5]" />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">SOURCE GOOGLE SPREADSHEET</h3>
              <p className="text-xs font-mono text-[var(--grey)] uppercase">FLUX DE DONNÉES EN DIRECT</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-[var(--ink)] hover:bg-[var(--yellow)] transition-colors"
          >
            <X className="w-5 h-5 stroke-[3]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-mono font-black mb-1.5 uppercase tracking-wider">
              LIEN PUBLIC DU GOOGLE SPREADSHEET
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold focus:outline-none focus:bg-[var(--white)]"
              required
            />
            <p className="mt-2 text-xs font-mono text-[var(--grey)] uppercase">
              VÉRIFIEZ LE PARTAGE DU DOCUMENT : « TOUS LES UTILISATEURS AVEC LE LIEN PEUVENT CONSULTER ».
            </p>
          </div>

          <div className="p-3.5 bg-[var(--ground)] border-2 border-[var(--ink)] font-mono text-xs space-y-2">
            <span className="font-black text-[var(--blue)] uppercase block">
              // ONGLETS SYNCHRONISÉS AUTOMATIQUEMENT :
            </span>
            <ul className="space-y-1 text-[var(--ink)] text-[11px] font-bold">
              <li>• <strong>ensi-sheet</strong> & <strong>Entreprises et Startups</strong> : Sponsoring</li>
              <li>• <strong>Centre de Formation</strong> : Partenariats formations & certifications</li>
              <li>• <strong>Subvention Nature</strong> : Traiteur, boissons & sponsoring en nature</li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-4 border-t-2 border-[var(--ink)]">
            <a
              href={urlInput}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono font-bold text-[var(--blue)] flex items-center gap-1 hover:underline uppercase"
            >
              <span>OUVRIR LE SHEET</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-transit !py-2 !px-3 !text-xs !bg-[var(--white)] !text-[var(--ink)] !border-[var(--ink)]"
              >
                ANNULER
              </button>
              <button
                type="submit"
                className="btn-transit yellow !py-2 !px-4 !text-xs !font-black !border-[var(--ink)]"
              >
                SYNCHRONISER
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
