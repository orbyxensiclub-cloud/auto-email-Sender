'use client';

import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { EventDetails } from '@/lib/gemini';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventDetails;
  onSave: (event: EventDetails) => void;
}

export default function EventDetailsModal({ isOpen, onClose, event, onSave }: EventDetailsModalProps) {
  const [form, setForm] = useState<EventDetails>({ ...event });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ink)]/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-[var(--white)] border-4 border-[var(--ink)] shadow-[8px_8px_0_var(--ink)] p-6 text-[var(--ink)] my-8">
        <div className="flex items-center justify-between pb-4 border-b-2 border-[var(--ink)]">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-[var(--blue)] stroke-[2.5]" />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">PARAMÈTRES ÉVÉNEMENT & DOSSIER</h3>
              <p className="text-xs font-mono text-[var(--grey)] uppercase">VARIABLES INJECTÉES DANS LE PROMPT GEMINI</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-black mb-1 uppercase tracking-wider">NOM DE L'ÉVÉNEMENT</label>
              <input
                type="text"
                value={form.eventName}
                onChange={(e) => setForm({ ...form, eventName: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold focus:outline-none focus:bg-[var(--white)]"
                required
              />
            </div>
            <div>
              <label className="block font-black mb-1 uppercase tracking-wider">DATE / PÉRIODE</label>
              <input
                type="text"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold focus:outline-none focus:bg-[var(--white)]"
                placeholder="Ex: 25 Octobre 2026"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-black mb-1 uppercase tracking-wider">LIEU / CAMPUS</label>
              <input
                type="text"
                value={form.eventLocation}
                onChange={(e) => setForm({ ...form, eventLocation: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold focus:outline-none focus:bg-[var(--white)]"
                required
              />
            </div>
            <div>
              <label className="block font-black mb-1 uppercase tracking-wider">ORGANISATEUR / ÉCOLE</label>
              <input
                type="text"
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold focus:outline-none focus:bg-[var(--white)]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-black mb-1 uppercase tracking-wider">AUDIENCE CIBLÉE & CHIFFRES CLÉS</label>
            <input
              type="text"
              value={form.attendees}
              onChange={(e) => setForm({ ...form, attendees: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold focus:outline-none focus:bg-[var(--white)]"
              placeholder="Ex: 800+ élèves-ingénieurs en informatique, IA et systèmes embarqués"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-black mb-1 uppercase tracking-wider">NOM DU SIGNATAIRE</label>
              <input
                type="text"
                value={form.organizerName}
                onChange={(e) => setForm({ ...form, organizerName: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold focus:outline-none focus:bg-[var(--white)]"
                required
              />
            </div>
            <div>
              <label className="block font-black mb-1 uppercase tracking-wider">TITRE DU SIGNATAIRE</label>
              <input
                type="text"
                value={form.organizerRole}
                onChange={(e) => setForm({ ...form, organizerRole: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold focus:outline-none focus:bg-[var(--white)]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-black mb-1 uppercase tracking-wider">E-MAIL DE CONTACT</label>
              <input
                type="email"
                value={form.organizerEmail}
                onChange={(e) => setForm({ ...form, organizerEmail: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold focus:outline-none focus:bg-[var(--white)]"
                required
              />
            </div>
            <div>
              <label className="block font-black mb-1 uppercase tracking-wider">TÉLÉPHONE</label>
              <input
                type="text"
                value={form.organizerPhone}
                onChange={(e) => setForm({ ...form, organizerPhone: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold focus:outline-none focus:bg-[var(--white)]"
              />
            </div>
          </div>

          <div>
            <label className="block font-black mb-1 uppercase tracking-wider">PACKS DE SPONSORING & DÉTAILS</label>
            <textarea
              rows={3}
              value={form.customNotes || ''}
              onChange={(e) => setForm({ ...form, customNotes: e.target.value })}
              placeholder="Ex: Packs Platine (3000 DT), Gold (2000 DT), Silver (1200 DT). Stand d'exposition, logo sur banderoles..."
              className="w-full px-3 py-2 bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold focus:outline-none focus:bg-[var(--white)]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t-2 border-[var(--ink)]">
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
              ENREGISTRER
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
