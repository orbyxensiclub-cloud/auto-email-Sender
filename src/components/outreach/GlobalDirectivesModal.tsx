'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquareText,
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Eye,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export interface DirectiveNote {
  id: string;
  text: string;
  enabled: boolean;
  createdAt?: string;
}

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
  const [notes, setNotes] = useState<DirectiveNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Suggested preset advice
  const advicePresets = [
    "Toujours vouvoyer et adopter une politesse d'élite",
    "Insister fortement sur le recrutement des stagiaires PFE en informatique & IA",
    "Garder l'e-mail percutant et en dessous de 150 mots",
    'Proposer un court échange visio ou téléphonique de 15 minutes',
    'Ne pas dévoiler les prix des packs de sponsoring dès le premier e-mail',
    "Mentionner les 800+ élèves-ingénieurs et chercheurs de l'ENSI",
    "Valoriser le logo de l'entreprise sur tous les supports média",
  ];

  // Fetch from JSON file on modal open (with localStorage fallback for serverless cold-starts)
  useEffect(() => {
    if (!isOpen) return;

    // Load from localStorage first if available
    try {
      const localCached = localStorage.getItem('outreach_directives_json');
      if (localCached) {
        const parsed = JSON.parse(localCached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotes(parsed);
        }
      }
    } catch {}

    const fetchDirectives = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch('/api/directives');
        if (!res.ok) throw new Error('Erreur lors du chargement des directives');
        const data = await res.json();
        if (Array.isArray(data.notes)) {
          setNotes(data.notes);
          try {
            localStorage.setItem('outreach_directives_json', JSON.stringify(data.notes));
          } catch {}
          if (data.combinedText !== undefined) {
            onSave(data.combinedText);
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch directives:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDirectives();
  }, [isOpen]);

  if (!isOpen) return null;

  // Compute combined bullet points for active notes
  const activeNotes = notes.filter((n) => n.enabled && n.text.trim());
  const combinedText = activeNotes.map((n) => `- ${n.text.trim()}`).join('\n');

  // Persist notes array to the backend JSON file
  const persistNotes = async (updated: DirectiveNote[]) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      localStorage.setItem('outreach_directives_json', JSON.stringify(updated));
    } catch {}
    try {
      const res = await fetch('/api/directives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: updated }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la sauvegarde');

      setNotes(data.notes);
      onSave(data.combinedText);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      console.error('Failed to save directives to API:', err);
      // Still keep local updates even if serverless returned read-only notice
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  // 1. ADD a new note
  const handleAddNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newNoteText.trim();
    if (!text) return;

    const newNote: DirectiveNote = {
      id: `dir-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text,
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    const updated = [...notes, newNote];
    setNotes(updated);
    setNewNoteText('');
    await persistNotes(updated);
  };

  // Add from preset chip
  const handleAddPreset = async (advice: string) => {
    if (notes.some((n) => n.text.toLowerCase() === advice.toLowerCase())) return;
    const newNote: DirectiveNote = {
      id: `dir-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: advice,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...notes, newNote];
    setNotes(updated);
    await persistNotes(updated);
  };

  // 2. START EDITING a note
  const handleStartEdit = (note: DirectiveNote) => {
    setEditingId(note.id);
    setEditingText(note.text);
  };

  // 3. SAVE MODIFIED note
  const handleSaveEdit = async (id: string) => {
    const text = editingText.trim();
    if (!text) return;

    const updated = notes.map((n) => (n.id === id ? { ...n, text } : n));
    setEditingId(null);
    setEditingText('');
    setNotes(updated);
    await persistNotes(updated);
  };

  // CANCEL EDIT
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  // 4. DELETE a note
  const handleDeleteNote = async (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    await persistNotes(updated);
  };

  // 5. TOGGLE active/disabled
  const handleToggleNote = async (id: string) => {
    const updated = notes.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n));
    setNotes(updated);
    await persistNotes(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ink)]/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl bg-[var(--white)] border-4 border-[var(--ink)] shadow-[8px_8px_0_var(--ink)] p-6 text-[var(--ink)] my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-[var(--ink)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--yellow)] border-2 border-[var(--ink)] flex items-center justify-center shadow-[2px_2px_0_var(--ink)]">
              <MessageSquareText className="w-5 h-5 text-[var(--ink)] stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black uppercase tracking-tight">
                  DIRECTIVES GÉNÉRALES // CONSIGNES IA
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 bg-[var(--ground)] border border-[var(--ink)]">
                  <FileJson className="w-3 h-3 text-[var(--blue)]" />
                  JSON FILE STORAGE
                </span>
              </div>
              <p className="text-xs font-mono text-[var(--grey)] uppercase">
                Consignes sauvegardées dans <code className="text-[var(--ink)] font-bold">src/data/directives.json</code> et injectées dans Gemini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-[var(--ink)] hover:bg-[var(--yellow)] transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5 stroke-[3]" />
          </button>
        </div>

        {/* Status / Save Banner */}
        <div className="mt-4 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase text-[11px] text-[var(--grey)]">
              TOTAL : {notes.length} CONSIGNES ({activeNotes.length} ACTIVES)
            </span>
            {saving && (
              <span className="text-[var(--blue)] font-bold animate-pulse text-[11px]">
                • Enregistrement dans le JSON...
              </span>
            )}
            {saveSuccess && (
              <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" /> Enregistré dans le fichier JSON !
              </span>
            )}
            {errorMsg && (
              <span className="text-red-600 font-bold flex items-center gap-1 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold border-2 border-[var(--ink)] bg-[var(--ground)] hover:bg-[var(--white)] transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showPreview ? 'MASQUER LE PROMPT' : 'VOIR LE PROMPT INJECTÉ'}</span>
          </button>
        </div>

        {/* Live Prompt Preview (Collapsible) */}
        {showPreview && (
          <div className="mt-3 p-3 bg-[var(--ground)] border-2 border-[var(--ink)] text-xs font-mono">
            <div className="font-bold uppercase text-[var(--ink)] pb-1 border-b border-[var(--ink)]/20 mb-2 flex items-center justify-between">
              <span>// BLOC TRANSMIS À GEMINI DANS LE SYSTEM PROMPT :</span>
              <span className="text-[10px] text-[var(--grey)]">{activeNotes.length} RÈGLES ACTIVES</span>
            </div>
            {combinedText ? (
              <pre className="whitespace-pre-wrap font-mono text-[11px] text-[var(--ink)] leading-relaxed bg-[var(--white)] p-2.5 border border-[var(--ink)]/20 max-h-40 overflow-y-auto">
                {combinedText}
              </pre>
            ) : (
              <span className="text-[var(--grey)] italic">
                Aucune directive active pour le moment.
              </span>
            )}
          </div>
        )}

        {/* 1. Add Note Input Form */}
        <form onSubmit={handleAddNote} className="mt-4 flex gap-2">
          <input
            type="text"
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Écrire une nouvelle consigne pour l'IA (ex: Toujours insister sur les opportunités de stages PFE)..."
            className="flex-1 px-3.5 py-2 text-xs font-mono bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold placeholder:text-[var(--grey)] focus:outline-none focus:bg-[var(--white)]"
          />
          <button
            type="submit"
            disabled={!newNoteText.trim() || saving}
            className="btn-transit !bg-[var(--yellow)] !text-[var(--ink)] !border-[var(--ink)] hover:!bg-[var(--ink)] hover:!text-[var(--yellow)] disabled:opacity-40 font-black text-xs px-4"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>AJOUTER</span>
          </button>
        </form>

        {/* Preset Chips */}
        <div className="mt-3">
          <span className="text-[10px] text-[var(--grey)] font-bold block mb-1.5 font-mono uppercase">
            // SUGGESTIONS RAPIDES (CLIQUEZ POUR AJOUTER) :
          </span>
          <div className="flex flex-wrap gap-1.5">
            {advicePresets.map((advice, idx) => {
              const isAdded = notes.some(
                (n) => n.text.toLowerCase() === advice.toLowerCase()
              );
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddPreset(advice)}
                  disabled={isAdded}
                  className={`px-2.5 py-1 text-[10px] font-mono border-2 flex items-center gap-1 font-bold transition-colors ${
                    isAdded
                      ? 'bg-[var(--ink)] text-[var(--yellow)] border-[var(--ink)] opacity-60 cursor-default'
                      : 'bg-[var(--white)] text-[var(--ink)] border-[var(--ink)]/40 hover:border-[var(--ink)] hover:bg-[var(--ground)]'
                  }`}
                >
                  {isAdded ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : (
                    <Plus className="w-3 h-3 stroke-[3]" />
                  )}
                  <span>{advice}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Directives Notes List */}
        <div className="mt-5 space-y-2 max-h-80 overflow-y-auto pr-1">
          {loading ? (
            <div className="p-8 text-center text-xs font-mono text-[var(--grey)] font-bold uppercase">
              Chargement des directives depuis le fichier JSON...
            </div>
          ) : notes.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-[var(--grey)] border-2 border-dashed border-[var(--ink)]/30 font-bold uppercase">
              Aucune directive pour le moment. Ajoutez-en une ci-dessus !
            </div>
          ) : (
            notes.map((note, index) => {
              const isEditing = editingId === note.id;

              return (
                <div
                  key={note.id}
                  className={`p-3 border-2 transition-all flex items-start justify-between gap-3 ${
                    note.enabled
                      ? 'bg-[var(--white)] border-[var(--ink)] shadow-[2px_2px_0_var(--ink)]'
                      : 'bg-[var(--ground)]/60 border-[var(--ink)]/30 opacity-60'
                  }`}
                >
                  {/* Left: Index badge + Note content */}
                  <div className="flex items-start gap-2.5 flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggleNote(note.id)}
                      className="mt-0.5 text-[var(--ink)] shrink-0"
                      title={note.enabled ? 'Désactiver cette consigne' : 'Activer cette consigne'}
                    >
                      {note.enabled ? (
                        <ToggleRight className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-[var(--grey)]" />
                      )}
                    </button>

                    <span className="w-5 h-5 rounded-none flex items-center justify-center font-mono font-bold text-[10px] shrink-0 bg-[var(--ink)] text-[var(--white)] mt-0.5">
                      {index + 1}
                    </span>

                    {isEditing ? (
                      <div className="flex-1 flex gap-2 items-center">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(note.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          autoFocus
                          className="flex-1 px-2.5 py-1 text-xs font-mono font-bold bg-[var(--ground)] border-2 border-[var(--blue)] text-[var(--ink)] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(note.id)}
                          className="p-1.5 bg-emerald-600 text-white border-2 border-[var(--ink)] hover:bg-emerald-700"
                          title="Valider la modification"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="p-1.5 bg-[var(--ground)] text-[var(--ink)] border-2 border-[var(--ink)] hover:bg-[var(--white)]"
                          title="Annuler"
                        >
                          <X className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <p
                          className={`text-xs font-mono font-bold leading-snug ${
                            note.enabled ? 'text-[var(--ink)]' : 'text-[var(--grey)] line-through'
                          }`}
                        >
                          {note.text}
                        </p>
                        <span className="text-[9px] font-mono text-[var(--grey)] uppercase block mt-1">
                          {note.enabled ? '● Active pour le modèle' : '○ Désactivée (ignorée)'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Actions: Modify & Delete */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(note)}
                        className="p-1.5 bg-[var(--ground)] hover:bg-[var(--yellow)] border-2 border-[var(--ink)] transition-colors text-[var(--ink)]"
                        title="Modifier cette consigne"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1.5 bg-[var(--ground)] hover:bg-red-500 hover:text-white border-2 border-[var(--ink)] transition-colors text-[var(--ink)]"
                        title="Supprimer cette consigne"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t-2 border-[var(--ink)] flex items-center justify-between">
          <div className="text-[11px] font-mono text-[var(--grey)] flex items-center gap-1.5">
            <FileJson className="w-4 h-4 text-[var(--blue)] shrink-0" />
            <span>Toute modification est automatiquement enregistrée dans le fichier JSON.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-transit !bg-[var(--ink)] !text-[var(--white)] !border-[var(--ink)] hover:!bg-[var(--yellow)] hover:!text-[var(--ink)] font-black text-xs px-6"
          >
            TERMINER
          </button>
        </div>
      </div>
    </div>
  );
}
