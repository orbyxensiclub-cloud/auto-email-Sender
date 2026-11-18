'use client';

import React, { useState } from 'react';
import { MessageSquareText, Sparkles, X, Plus, Check } from 'lucide-react';

interface GlobalDirectivesModalProps {
  isOpen: boolean;
  onClose: () => void;
  directives: string;
  onSave: (newDirectives: string) => void;
}

export default function GlobalDirectivesModal({
  isOpen,
  onClose,
  directives,
  onSave,
}: GlobalDirectivesModalProps) {
  const [text, setText] = useState(directives);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(text.trim());
    onClose();
  };

  const advicePresets = [
    'Toujours vouvoyer et adopter une politesse d\'élite',
    'Insister fortement sur le recrutement des stagiaires PFE en informatique & IA',
    'Garder l\'e-mail percutant et en dessous de 150 mots',
    'Proposer un court échange visio ou téléphonique de 15 minutes',
    'Ne pas dévoiler les prix des packs de sponsoring dès le premier e-mail',
    'Mentionner les 800+ élèves-ingénieurs et chercheurs de l\'ENSI',
    'Valoriser le logo de l\'entreprise sur tous les supports média',
  ];

  const handleAddPreset = (advice: string) => {
    if (text.includes(advice)) return;
    const separator = text.trim().length > 0 ? '\n- ' : '- ';
    setText((prev) => `${prev.trim()}${separator}${advice}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ink)]/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-[var(--white)] border-4 border-[var(--ink)] shadow-[8px_8px_0_var(--ink)] p-6 text-[var(--ink)] my-8">
        <div className="flex items-center justify-between pb-4 border-b-2 border-[var(--ink)]">
          <div className="flex items-center gap-3">
            <MessageSquareText className="w-6 h-6 text-[var(--blue)] stroke-[2.5]" />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">DIRECTIVES GÉNÉRALES // CONSIGNES IA</h3>
              <p className="text-xs font-mono text-[var(--grey)] uppercase">RÈGLES ET CONSEILS INJECTÉS DANS TOUTES LES GÉNÉRATIONS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-[var(--ink)] hover:bg-[var(--yellow)] transition-colors"
          >
            <X className="w-5 h-5 stroke-[3]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs font-mono">
          <div className="p-3 bg-[var(--ground)] border-2 border-[var(--ink)]">
            <p className="font-bold text-[var(--ink)] leading-relaxed">
              Tout ce que vous inscrivez ici est transmis à <strong>Gemini</strong> comme <strong>règles prioritaires</strong> pour l'ensemble des e-mails générés et des révisions de chat.
            </p>
          </div>

          <div>
            <label className="block font-black mb-1.5 uppercase tracking-wider">
              CONSIGNES, ARGUMENTS & CONSEILS PERMANENTS :
            </label>
            <textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="- Rédiger des e-mails concis et percutants&#10;- Mettre en avant le Forum ENSI 2026&#10;- Insister sur la visibilité stand et recrutement PFE..."
              className="w-full p-3.5 bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold text-xs focus:outline-none focus:bg-[var(--white)] leading-relaxed resize-none"
            />
          </div>

          {/* Quick preset advice chips */}
          <div>
            <span className="text-[10px] text-[var(--grey)] font-bold block mb-1.5 uppercase">
              // CLIQUEZ POUR AJOUTER UN CONSEIL PRÉ-CONFIGURÉ :
            </span>
            <div className="flex flex-wrap gap-1.5">
              {advicePresets.map((advice, idx) => {
                const isAdded = text.includes(advice);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddPreset(advice)}
                    disabled={isAdded}
                    className={`px-2.5 py-1 text-[10px] border-2 flex items-center gap-1 font-bold transition-colors ${
                      isAdded
                        ? 'bg-[var(--ink)] text-[var(--yellow)] border-[var(--ink)] opacity-70'
                        : 'bg-[var(--white)] text-[var(--ink)] border-[var(--ink)] hover:bg-[var(--yellow)]'
                    }`}
                  >
                    {isAdded ? <Check className="w-3 h-3 stroke-[3]" /> : <Plus className="w-3 h-3 stroke-[3]" />}
                    <span>{advice}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t-2 border-[var(--ink)]">
            <button
              type="button"
              onClick={() => setText('')}
              className="text-[11px] font-bold text-[var(--grey)] hover:text-red-600 underline uppercase"
            >
              RÉINITIALISER LES CONSIGNES
            </button>

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
                ENREGISTRER LES DIRECTIVES
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
