'use client';

import React from 'react';
import { Search, Sparkles, CheckCheck, Clock, Send } from 'lucide-react';
import { CategoryKey } from '@/lib/sheets';

interface CategoryTabsProps {
  selectedCategory: CategoryKey;
  onSelectCategory: (cat: CategoryKey) => void;
  statusFilter: string;
  onSelectStatusFilter: (status: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  counts: {
    ensi: number;
    sponsorship: number;
    formation: number;
    food: number;
  };
  onAcceptAll: () => void;
  onScheduleAllAccepted: () => void;
  onBatchGenerate: () => void;
  batchGenerating: boolean;
  batchProgress?: { current: number; total: number };
  // Scheduling time selection
  selectedScheduleTime: string;
  onScheduleTimeChange: (time: string) => void;
  // Send all
  onSendAll: () => void;
  batchSending: boolean;
  batchSendProgress?: { current: number; total: number };
  acceptedCount: number;
}

export default function CategoryTabs({
  selectedCategory,
  onSelectCategory,
  statusFilter,
  onSelectStatusFilter,
  searchQuery,
  onSearchChange,
  counts,
  onAcceptAll,
  onScheduleAllAccepted,
  onBatchGenerate,
  batchGenerating,
  batchProgress,
  selectedScheduleTime,
  onScheduleTimeChange,
  onSendAll,
  batchSending,
  batchSendProgress,
  acceptedCount,
}: CategoryTabsProps) {
  const routes: Array<{
    id: CategoryKey;
    lineNum: string;
    title: string;
    desc: string;
    count: number;
    source: string;
  }> = [
    {
      id: 'ensi',
      lineNum: 'L01',
      title: 'ENSI SHEET',
      desc: 'Base ENSI — entreprises, banques & sociétés (793 contacts)',
      count: counts.ensi,
      source: 'ensi-sheet (gid:1620843151)',
    },
    {
      id: 'sponsorship',
      lineNum: 'L02',
      title: 'ENTREPRISES & STARTUPS',
      desc: 'Sponsoring ML Challenge 2.0 & recrutement ingénieurs IA',
      count: counts.sponsorship,
      source: 'Entreprises et Startups',
    },
    {
      id: 'formation',
      lineNum: 'L03',
      title: 'CENTRES DE FORMATION',
      desc: 'Partenariats académiques, vouchers & certifications',
      count: counts.formation,
      source: 'Centre de Formation',
    },
    {
      id: 'food',
      lineNum: 'L04',
      title: 'SUBVENTION NATURE',
      desc: 'Traiteur, boissons, snacks & pause-café',
      count: counts.food,
      source: 'Subvention Nature',
    },
  ];

  const statusFilters = [
    { id: 'all', label: 'TOUS LES LEADS' },
    { id: 'idle', label: 'NON GÉNÉRÉS' },
    { id: 'draft', label: 'BROUILLONS' },
    { id: 'accepted', label: 'VALIDÉS' },
    { id: 'refused', label: 'REFUSÉS' },
    { id: 'scheduled', label: 'PROGRAMMÉS' },
    { id: 'sent', label: 'ENVOYÉS' },
  ];

  return (
    <div className="space-y-4">
      {/* 4 Transit Lines Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {routes.map((route) => {
          const isActive = selectedCategory === route.id;
          return (
            <button
              key={route.id}
              onClick={() => onSelectCategory(route.id)}
              className={`p-4 text-left border-2 transition-all relative ${
                isActive
                  ? 'bg-[var(--white)] border-[var(--ink)] shadow-[4px_4px_0_var(--ink)]'
                  : 'bg-[var(--ground)] border-[var(--ink)]/40 hover:border-[var(--ink)]'
              }`}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-[var(--ink)]">
                <span
                  className={`font-mono font-black text-xs px-2 py-0.5 border-2 border-[var(--ink)] uppercase ${
                    isActive ? 'bg-[var(--yellow)] text-[var(--ink)]' : 'bg-[var(--ink)] text-[var(--white)]'
                  }`}
                >
                  ROUTE {route.lineNum}
                </span>
                <span className="font-mono font-black text-sm text-[var(--ink)] tabular-nums">
                  {route.count} UNITÉS
                </span>
              </div>
              <h3 className="font-extrabold text-base tracking-tight text-[var(--ink)] uppercase">
                {route.title}
              </h3>
              <p className="text-xs text-[var(--ink)]/80 mt-1 line-clamp-1">{route.desc}</p>
              <div className="mt-3 pt-2 border-t border-[var(--ink)]/20 text-[10px] font-mono text-[var(--grey)] uppercase">
                SRC: {route.source}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter and Control Console */}
      <div className="p-4 bg-[var(--white)] border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] space-y-4">
        {/* Top Control Bar: Search + Generation / Validation */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--ink)] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="RECHERCHER PAR ENTREPRISE, VILLE, CONTACT..."
              className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] placeholder:text-[var(--grey)] uppercase focus:outline-none focus:bg-[var(--white)]"
            />
          </div>

          {/* Draft Generation & Approval Buttons */}
          <div className="flex items-center flex-wrap gap-2 justify-end">
            {/* Batch Generate */}
            <button
              onClick={onBatchGenerate}
              disabled={batchGenerating}
              className="btn-transit !bg-[var(--yellow)] !text-[var(--ink)] !border-[var(--ink)] hover:!bg-[var(--ink)] hover:!text-[var(--yellow)] disabled:opacity-50"
              title="Générer automatiquement les e-mails avec le template ORBYX ML Challenge 2.0"
            >
              <Sparkles className={`w-3.5 h-3.5 ${batchGenerating ? 'animate-spin' : ''}`} />
              <span>
                {batchGenerating
                  ? `GÉNÉRATION (${batchProgress?.current}/${batchProgress?.total})...`
                  : 'GÉNÉRER AVEC GEMINI'}
              </span>
            </button>

            {/* Accept All */}
            <button
              onClick={onAcceptAll}
              className="btn-transit !bg-[var(--ink)] !text-[var(--white)] !border-[var(--ink)] hover:!bg-[var(--yellow)] hover:!text-[var(--ink)]"
              title="Valider tous les brouillons générés (1 seule approbation requise)"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>TOUT ACCEPTER (1/1)</span>
            </button>
          </div>
        </div>

        {/* Dispatch Console: Schedule Selection & Send All */}
        <div className="p-3 bg-[var(--ground)] border-2 border-[var(--ink)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Select time to send & schedule button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[var(--white)] border-2 border-[var(--ink)] px-2.5 py-1.5 shadow-[2px_2px_0_var(--ink)]">
              <Clock className="w-3.5 h-3.5 text-[var(--blue)] shrink-0" />
              <label htmlFor="schedule-time-picker" className="text-[10px] font-mono font-black text-[var(--ink)] uppercase whitespace-nowrap">
                HEURE D'ENVOI :
              </label>
              <input
                id="schedule-time-picker"
                type="datetime-local"
                value={selectedScheduleTime}
                onChange={(e) => onScheduleTimeChange(e.target.value)}
                className="text-xs font-mono font-bold bg-transparent border-none text-[var(--ink)] focus:outline-none cursor-pointer"
                title="Sélectionnez la date et l'heure de départ de la file d'envoi"
              />
            </div>

            <button
              onClick={onScheduleAllAccepted}
              disabled={acceptedCount === 0}
              className="btn-transit !bg-[var(--blue)] !text-[var(--white)] !border-[var(--ink)] hover:!bg-[var(--yellow)] hover:!text-[var(--ink)] disabled:opacity-40"
              title="Programmer tous les e-mails validés à partir de la date/heure sélectionnée (+2 min entre chaque envoi)"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>PROGRAMMER LA FILE ({acceptedCount})</span>
            </button>
          </div>

          {/* SEND ALL BUTTON */}
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onSendAll}
              disabled={batchSending || acceptedCount === 0}
              className="btn-transit !bg-[#16A34A] !text-[var(--white)] !border-[var(--ink)] hover:!bg-[var(--yellow)] hover:!text-[var(--ink)] font-black shadow-[3px_3px_0_var(--ink)] disabled:opacity-40"
              title="Envoyer immédiatement tous les e-mails validés via Gmail SMTP"
            >
              <Send className={`w-3.5 h-3.5 stroke-[2.5] ${batchSending ? 'animate-bounce' : ''}`} />
              <span>
                {batchSending
                  ? `ENVOI EN COURS (${batchSendProgress?.current}/${batchSendProgress?.total})...`
                  : `ENVOYER TOUT (${acceptedCount})`}
              </span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-[var(--ink)]/20">
          <span className="text-[11px] font-mono font-bold text-[var(--grey)] uppercase mr-1">
            STATUT:
          </span>
          {statusFilters.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSelectStatusFilter(opt.id)}
              className={`px-3 py-1 text-xs font-mono font-bold tracking-wider uppercase border-2 transition-colors whitespace-nowrap ${
                statusFilter === opt.id
                  ? 'bg-[var(--ink)] text-[var(--yellow)] border-[var(--ink)]'
                  : 'bg-[var(--ground)] text-[var(--ink)] border-[var(--ink)]/30 hover:border-[var(--ink)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
