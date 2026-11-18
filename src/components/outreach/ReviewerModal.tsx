'use client';

import React, { useState } from 'react';
import { UserCheck, X } from 'lucide-react';

interface ReviewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentReviewer: string;
  onSave: (name: string) => void;
}

export default function ReviewerModal({
  isOpen,
  onClose,
  currentReviewer,
  onSave,
}: ReviewerModalProps) {
  const [nameInput, setNameInput] = useState(currentReviewer);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onSave(nameInput.trim());
      onClose();
    }
  };

  const sampleNames = ['Jasser Ben Jemaa', 'Responsable Sponsoring', 'Membre Bureau ORBYX', 'Président ORBYX'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ink)]/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[var(--white)] border-4 border-[var(--ink)] shadow-[8px_8px_0_var(--ink)] p-6 text-[var(--ink)]">
        <div className="flex items-center justify-between pb-3 border-b-2 border-[var(--ink)]">
          <div className="flex items-center gap-3">
            <UserCheck className="w-6 h-6 text-[var(--blue)] stroke-[2.5]" />
            <div>
              <h3 className="text-base font-black uppercase tracking-tight">IDENTITÉ DE L'EXAMINATEUR</h3>
              <p className="text-[11px] font-mono text-[var(--grey)] uppercase">CONTRÔLE QUALITÉ : 1 VALIDATION REQUISE</p>
            </div>
          </div>
          {currentReviewer && (
            <button
              onClick={onClose}
              className="p-1 border-2 border-[var(--ink)] hover:bg-[var(--yellow)] transition-colors"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs font-mono">
          <div className="p-3 bg-[var(--ground)] border-2 border-[var(--ink)]">
            <p className="font-bold text-[var(--ink)] leading-relaxed">
              Pour assurer la traçabilité des décisions et la sécurité des envois, chaque e-mail requiert <strong>1 approbation</strong> de l'équipe avant d'être expédié ou programmé.
            </p>
          </div>

          <div>
            <label className="block font-black mb-1.5 uppercase tracking-wider">
              VOTRE NOM & PRÉNOM (OU RÔLE) :
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Ex: Jasser Ben Jomaa"
              className="w-full px-3.5 py-2.5 bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold text-sm focus:outline-none focus:bg-[var(--white)]"
              required
              autoFocus
            />
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-[10px] text-[var(--grey)] font-bold block mb-1 uppercase">
              SUGGESTIONS RAPIDES :
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sampleNames.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNameInput(n)}
                  className="px-2 py-1 text-[10px] bg-[var(--ground)] border border-[var(--ink)] hover:bg-[var(--yellow)] font-bold"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t-2 border-[var(--ink)]">
            {currentReviewer && (
              <button
                type="button"
                onClick={onClose}
                className="btn-transit !py-2 !px-3 !text-xs !bg-[var(--white)] !text-[var(--ink)] !border-[var(--ink)]"
              >
                ANNULER
              </button>
            )}
            <button
              type="submit"
              className="btn-transit yellow !py-2 !px-4 !text-xs !font-black !border-[var(--ink)]"
            >
              CONFIRMER L'IDENTITÉ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
