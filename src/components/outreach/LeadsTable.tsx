'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Check,
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Ban,
  Layers,
  CheckSquare,
  Calendar,
  X,
} from 'lucide-react';
import { CompanyLead } from '@/lib/sheets';

interface LeadsTableProps {
  leads: CompanyLead[];
  onOpenInspector: (lead: CompanyLead) => void;
  onGenerateEmail: (lead: CompanyLead) => Promise<void>;
  onAccept: (lead: CompanyLead) => void;
  onRefuse: (lead: CompanyLead) => void;
  generatingId?: string | null;
  currentReviewer: string;
  // Batch actions on selected leads
  onBatchGenerateSelected?: (selectedLeads: CompanyLead[]) => Promise<void>;
  onAcceptSelected?: (selectedLeads: CompanyLead[]) => void;
  onCancelSelected?: (selectedLeads: CompanyLead[]) => void;
  onScheduleSelected?: (selectedLeads: CompanyLead[], scheduleTime: string) => void;
  onSendSelected?: (selectedLeads: CompanyLead[]) => Promise<void>;
  batchGenerating?: boolean;
  batchSending?: boolean;
}

const ITEMS_PER_PAGE = 25;

export default function LeadsTable({
  leads,
  onOpenInspector,
  onGenerateEmail,
  onAccept,
  onRefuse,
  generatingId,
  currentReviewer,
  onBatchGenerateSelected,
  onAcceptSelected,
  onCancelSelected,
  onScheduleSelected,
  onSendSelected,
  batchGenerating = false,
  batchSending = false,
}: LeadsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Interval selection state
  const [rangeStart, setRangeStart] = useState<string>('1');
  const [rangeEnd, setRangeEnd] = useState<string>(() => String(Math.min(25, leads.length || 25)));

  // Scheduling time for selected
  const [scheduleDateTime, setScheduleDateTime] = useState<string>('');

  useEffect(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
    setScheduleDateTime(d.toISOString().slice(0, 16));
  }, []);

  const totalPages = Math.ceil(leads.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLeads = leads.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Selected leads list
  const selectedLeadsList = useMemo(() => {
    if (selectedIds.size === 0) return [];
    const idMap = new Map(leads.map((l) => [l.id, l]));
    const result: CompanyLead[] = [];
    selectedIds.forEach((id) => {
      const found = idMap.get(id);
      if (found) result.push(found);
    });
    return result;
  }, [leads, selectedIds]);

  // Single lead selection toggle
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select or deselect all leads on current page
  const toggleSelectPage = () => {
    const allOnPageSelected =
      paginatedLeads.length > 0 && paginatedLeads.every((l) => selectedIds.has(l.id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        paginatedLeads.forEach((l) => next.delete(l.id));
      } else {
        paginatedLeads.forEach((l) => next.add(l.id));
      }
      return next;
    });
  };

  // Interval selection handler (1-based indices)
  const handleApplyInterval = () => {
    let start = parseInt(rangeStart, 10);
    let end = parseInt(rangeEnd, 10);

    if (isNaN(start) || start < 1) start = 1;
    if (isNaN(end) || end < start) end = start;
    if (start > leads.length) start = leads.length;
    if (end > leads.length) end = leads.length;

    const slice = leads.slice(start - 1, end);
    const newSelected = new Set(selectedIds);
    slice.forEach((lead) => newSelected.add(lead.id));
    setSelectedIds(newSelected);

    // Jump to the page of the interval start
    const targetPage = Math.floor((start - 1) / ITEMS_PER_PAGE) + 1;
    setCurrentPage(targetPage);
  };

  const handleSelectPreset = (start: number, end: number) => {
    setRangeStart(String(start));
    const clampedEnd = Math.min(end, leads.length);
    setRangeEnd(String(clampedEnd));

    const slice = leads.slice(start - 1, clampedEnd);
    const newSelected = new Set(selectedIds);
    slice.forEach((lead) => newSelected.add(lead.id));
    setSelectedIds(newSelected);

    const targetPage = Math.floor((start - 1) / ITEMS_PER_PAGE) + 1;
    setCurrentPage(targetPage);
  };

  const handleSelectAllFiltered = () => {
    const all = new Set<string>();
    leads.forEach((l) => all.add(l.id));
    setSelectedIds(all);
    setRangeStart('1');
    setRangeEnd(String(leads.length));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const getStatusBadge = (lead: CompanyLead) => {
    switch (lead.status) {
      case 'accepted':
        return (
          <div className="flex flex-col gap-0.5">
            <span className="tag-hot !bg-[var(--white)] !text-[var(--ink)] border-2 border-[var(--ink)]">
              <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
              <span>VALIDÉ</span>
            </span>
            {lead.approvals && lead.approvals.length > 0 && (
              <span className="text-[10px] font-mono text-[var(--grey)] truncate max-w-[170px]">
                Validé par: {lead.approvals[0].reviewerName}
              </span>
            )}
          </div>
        );
      case 'pending_approval':
        return (
          <div className="flex flex-col gap-0.5">
            <span className="tag-hot !bg-[var(--yellow)] !text-[var(--ink)] border-2 border-[var(--ink)]">
              <Clock className="w-3 h-3" />
              <span>EN ATTENTE</span>
            </span>
          </div>
        );
      case 'refused':
        return (
          <div className="flex flex-col gap-0.5">
            <span className="tag-hot !bg-[#FFE8E8] !text-red-900 border-2 border-red-800">
              <Ban className="w-3 h-3 text-red-600 stroke-[3]" />
              <span>ANNULÉ</span>
            </span>
            {lead.refusedBy && (
              <span className="text-[10px] font-mono text-red-700 truncate max-w-[170px]">
                Par: {lead.refusedBy.reviewerName}
              </span>
            )}
          </div>
        );
      case 'scheduled':
        return (
          <span className="tag-hot !bg-[var(--blue)] !text-[var(--white)] border-2 border-[var(--ink)]">
            <Clock className="w-3 h-3 text-[var(--yellow)] stroke-[3]" />
            <span>PROGRAMMÉ</span>
          </span>
        );
      case 'sent':
        return (
          <span className="tag-hot !bg-[var(--ink)] !text-[var(--yellow)] border-2 border-[var(--ink)]">
            <Send className="w-3 h-3 stroke-[3]" />
            <span>ENVOYÉ</span>
          </span>
        );
      case 'draft':
        return (
          <span className="tag-hot">
            <Sparkles className="w-3 h-3" />
            <span>BROUILLON</span>
          </span>
        );
      case 'generating':
        return (
          <span className="tag-hot !bg-[var(--blue)] !text-[var(--white)]">
            <Sparkles className="w-3 h-3 animate-spin" />
            <span>ANALYSE EN COURS</span>
          </span>
        );
      default:
        return (
          <span className="font-mono text-[11px] text-[var(--grey)] uppercase tracking-wider">
            EN ATTENTE
          </span>
        );
    }
  };

  const isPageAllSelected =
    paginatedLeads.length > 0 && paginatedLeads.every((l) => selectedIds.has(l.id));

  return (
    <div className="bg-[var(--white)] border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] overflow-hidden">
      {/* Interval Selection Bar */}
      <div className="bg-[var(--ground)] border-b-2 border-[var(--ink)] p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono font-bold">
          <div className="flex items-center gap-1.5 bg-[var(--white)] px-2.5 py-1.5 border-2 border-[var(--ink)] shadow-[2px_2px_0_var(--ink)]">
            <Layers className="w-3.5 h-3.5 text-[var(--blue)]" />
            <span className="uppercase text-[var(--ink)] font-black">SÉLECTION PAR INTERVALLE :</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--grey)] font-mono uppercase">De N°</span>
            <input
              type="number"
              min={1}
              max={leads.length || 1}
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              placeholder="1"
              className="w-16 px-2 py-1 text-xs font-mono font-bold border-2 border-[var(--ink)] bg-[var(--white)] text-center focus:bg-[var(--yellow)]/20 outline-none shadow-[2px_2px_0_var(--ink)]"
            />
            <span className="text-[11px] text-[var(--grey)] font-mono uppercase">À N°</span>
            <input
              type="number"
              min={1}
              max={leads.length || 1}
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              placeholder={String(Math.min(25, leads.length || 25))}
              className="w-16 px-2 py-1 text-xs font-mono font-bold border-2 border-[var(--ink)] bg-[var(--white)] text-center focus:bg-[var(--yellow)]/20 outline-none shadow-[2px_2px_0_var(--ink)]"
            />
            <span className="text-[11px] text-[var(--grey)] font-mono">/ {leads.length}</span>
          </div>

          <button
            onClick={handleApplyInterval}
            className="btn-transit ink !py-1 !px-3 !text-xs !font-black uppercase shadow-[2px_2px_0_var(--ink)]"
            title="Sélectionner toutes les entreprises comprises dans cet intervalle"
          >
            SÉLECTIONNER L&apos;INTERVALLE
          </button>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono text-[var(--grey)] uppercase font-bold">Raccourcis:</span>
          <button
            onClick={() => handleSelectPreset(1, 25)}
            className="px-2 py-1 text-[11px] font-mono font-bold border-2 border-[var(--ink)] bg-[var(--white)] hover:bg-[var(--yellow)] transition-colors shadow-[1px_1px_0_var(--ink)]"
          >
            1–25
          </button>
          <button
            onClick={() => handleSelectPreset(26, 50)}
            className="px-2 py-1 text-[11px] font-mono font-bold border-2 border-[var(--ink)] bg-[var(--white)] hover:bg-[var(--yellow)] transition-colors shadow-[1px_1px_0_var(--ink)]"
          >
            26–50
          </button>
          <button
            onClick={() => handleSelectPreset(51, 100)}
            className="px-2 py-1 text-[11px] font-mono font-bold border-2 border-[var(--ink)] bg-[var(--white)] hover:bg-[var(--yellow)] transition-colors shadow-[1px_1px_0_var(--ink)]"
          >
            51–100
          </button>
          <button
            onClick={handleSelectAllFiltered}
            className="px-2 py-1 text-[11px] font-mono font-black border-2 border-[var(--ink)] bg-[var(--white)] hover:bg-[var(--yellow)] transition-colors shadow-[1px_1px_0_var(--ink)] uppercase"
          >
            TOUT ({leads.length})
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={handleClearSelection}
              className="px-2 py-1 text-[11px] font-mono font-black border-2 border-red-800 bg-red-100 text-red-900 hover:bg-red-200 transition-colors shadow-[1px_1px_0_red-800] uppercase"
            >
              EFFACER ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Route Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--ground)] border-b-4 border-[var(--ink)] text-[var(--ink)] font-mono font-black text-xs uppercase tracking-widest">
              {/* Header Checkbox & Numbering */}
              <th className="py-3.5 px-3 text-center w-14 border-r-2 border-[var(--ink)]/30">
                <div className="flex flex-col items-center gap-0.5">
                  <input
                    type="checkbox"
                    checked={isPageAllSelected}
                    onChange={toggleSelectPage}
                    className="w-4 h-4 cursor-pointer accent-[var(--ink)]"
                    title={
                      isPageAllSelected
                        ? 'Désélectionner toute la page'
                        : 'Sélectionner toute la page actuelle'
                    }
                  />
                  <span className="text-[9px] font-mono font-black text-[var(--grey)]">#</span>
                </div>
              </th>
              <th className="py-3.5 px-4">ENTREPRISE / DESTINATAIRE</th>
              <th className="py-3.5 px-4">CANAL E-MAIL & CONTACT</th>
              <th className="py-3.5 px-4">LOCALISATION</th>
              <th className="py-3.5 px-4">STATUT PROCESSUS</th>
              <th className="py-3.5 px-4 text-right">COMMANDE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ink)]/30">
            {paginatedLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-[var(--ink)] font-mono">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[var(--grey)]" />
                  AUCUNE UNITÉ CORRESPONDANTE DANS CETTE ROUTE.
                </td>
              </tr>
            ) : (
              paginatedLeads.map((lead, idx) => {
                const absoluteIndex = startIndex + idx + 1;
                const isSelected = selectedIds.has(lead.id);
                const isGenerating = generatingId === lead.id || lead.status === 'generating';
                const hasDraft = !!lead.generatedSubject;
                const isCancelled = lead.status === 'refused';
                const hasCurrentReviewerApproved = lead.approvals?.some(
                  (a) => a.reviewerName.toLowerCase().trim() === currentReviewer?.toLowerCase().trim()
                );

                return (
                  <tr
                    key={lead.id}
                    className={`transition-colors group ${
                      isSelected
                        ? 'bg-[var(--yellow)]/20 border-l-4 border-l-[var(--blue)]'
                        : isCancelled
                        ? 'bg-red-50/40 hover:bg-red-100/40 opacity-80'
                        : 'hover:bg-[var(--yellow)]/10'
                    }`}
                  >
                    {/* Numbering & Hover Checkbox Cell */}
                    <td className="py-3 px-3 text-center w-14 border-r border-[var(--ink)]/20 relative select-none">
                      <div className="relative flex items-center justify-center w-8 h-8 mx-auto">
                        {/* Checkbox button: visible when selected OR when row is hovered */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(lead.id)}
                          className={`w-4 h-4 cursor-pointer accent-[var(--ink)] rounded-none transition-all ${
                            isSelected
                              ? 'opacity-100 scale-110 z-10'
                              : 'opacity-0 group-hover:opacity-100 z-10'
                          }`}
                          title={`Sélectionner N°${absoluteIndex} - ${lead.name}`}
                        />
                        {/* Monospace Number: visible when NOT selected and NOT hovered */}
                        <span
                          className={`absolute inset-0 flex items-center justify-center pointer-events-none font-mono text-[11px] font-black tracking-tight text-[var(--ink)]/70 transition-opacity ${
                            isSelected ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'
                          }`}
                        >
                          #{absoluteIndex}
                        </span>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="py-3 px-4 max-w-[260px]">
                      <div
                        className={`font-extrabold text-sm uppercase transition-colors truncate ${
                          isCancelled
                            ? 'line-through text-red-900/60'
                            : 'text-[var(--ink)] group-hover:text-[var(--blue)]'
                        }`}
                      >
                        {lead.name}
                      </div>
                      {lead.contactPerson && (
                        <div className="text-[11px] font-mono text-[var(--grey)] mt-0.5 truncate uppercase">
                          RESP: {lead.contactPerson}
                        </div>
                      )}
                      <div className="text-[10px] font-mono text-[var(--grey)]/80 uppercase">
                        {lead.sourceSheet}
                      </div>
                    </td>

                    {/* Email & Phone */}
                    <td className="py-3 px-4 max-w-[240px]">
                      {lead.email ? (
                        <div className="flex items-center gap-1.5 font-mono text-[var(--ink)] font-semibold truncate">
                          <Mail className="w-3.5 h-3.5 shrink-0 text-[var(--blue)]" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      ) : (
                        <span className="tag-hot !bg-[#FFE8E8] !text-red-900 border-2 border-red-900">
                          SANS E-MAIL
                        </span>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1.5 font-mono text-[var(--grey)] mt-0.5 text-[11px]">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4 text-[var(--ink)]/80 max-w-[200px] truncate">
                      {lead.address ? (
                        <div className="flex items-center gap-1.5 truncate text-[11px] font-mono uppercase">
                          <MapPin className="w-3.5 h-3.5 text-[var(--grey)] shrink-0" />
                          <span className="truncate">{lead.address}</span>
                        </div>
                      ) : (
                        <span className="font-mono text-[var(--grey)]">-</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      {getStatusBadge(lead)}
                      {lead.scheduledTime && (
                        <div className="text-[10px] font-mono text-[var(--blue)] font-bold mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(lead.scheduledTime).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </td>

                    {/* Action Controls */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Generate AI Button */}
                        <button
                          onClick={() => onGenerateEmail(lead)}
                          disabled={isCancelled || isGenerating || !lead.email}
                          className="p-1.5 border-2 border-[var(--ink)] bg-[var(--white)] text-[var(--ink)] hover:bg-[var(--yellow)] disabled:opacity-30 transition-colors shadow-[1px_1px_0_var(--ink)]"
                          title={
                            isCancelled
                              ? 'Entreprise annulée / bloquée : aucun e-mail ne sera généré'
                              : !lead.email
                              ? 'E-mail manquant'
                              : hasDraft
                              ? 'Régénérer avec Gemini'
                              : 'Générer avec Gemini'
                          }
                        >
                          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                        </button>

                        {/* Accept Button */}
                        <button
                          onClick={() => onAccept(lead)}
                          disabled={isCancelled || !hasDraft}
                          className={`p-1.5 border-2 border-[var(--ink)] transition-colors shadow-[1px_1px_0_var(--ink)] ${
                            hasCurrentReviewerApproved || lead.status === 'accepted'
                              ? 'bg-emerald-300 text-[var(--ink)] ring-2 ring-[var(--ink)]'
                              : 'bg-[var(--white)] text-[var(--ink)] hover:bg-emerald-300 disabled:opacity-30'
                          }`}
                          title={
                            isCancelled
                              ? 'Entreprise annulée / bloquée'
                              : hasCurrentReviewerApproved || lead.status === 'accepted'
                              ? `Validé (${lead.approvals?.[0]?.reviewerName || currentReviewer}) - Cliquez pour révoquer`
                              : `Valider cet e-mail (1 approbation requise)`
                          }
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>

                        {/* Annuler / Bloquer Button */}
                        <button
                          onClick={() => onRefuse(lead)}
                          className={`p-1.5 border-2 border-[var(--ink)] transition-colors shadow-[1px_1px_0_var(--ink)] ${
                            isCancelled
                              ? 'bg-red-600 text-white ring-2 ring-red-700'
                              : 'bg-[var(--white)] text-[var(--ink)] hover:bg-red-200'
                          }`}
                          title={
                            isCancelled
                              ? `Entreprise annulée (${lead.refusedBy?.reviewerName || 'par vous'}) - Cliquez pour débloquer`
                              : 'Annuler / Bloquer cette entreprise (aucun e-mail ne sera généré ni envoyé)'
                          }
                        >
                          <Ban className="w-4 h-4 stroke-[2.5]" />
                        </button>

                        {/* Open Inspector */}
                        <button
                          onClick={() => onOpenInspector(lead)}
                          className="btn-transit !py-1.5 !px-2.5 !text-xs !bg-[var(--ink)] !text-[var(--white)] !border-[var(--ink)] hover:!bg-[var(--yellow)] hover:!text-[var(--ink)]"
                          title="Inspecter le brouillon et discuter avec Gemini"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">INSPECTER</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--ground)] border-t-2 border-[var(--ink)] text-xs font-mono font-bold text-[var(--ink)]">
        <div>
          LIGNES {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, leads.length)} SUR {leads.length} UNITÉS
          {selectedIds.size > 0 && (
            <span className="ml-3 px-2 py-0.5 bg-[var(--yellow)] text-[var(--ink)] border border-[var(--ink)] font-black">
              {selectedIds.size} SÉLECTIONNÉE{selectedIds.size > 1 ? 'S' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-1 border-2 border-[var(--ink)] bg-[var(--white)] text-[var(--ink)] hover:bg-[var(--yellow)] disabled:opacity-30 transition-colors shadow-[1px_1px_0_var(--ink)]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="tabular-nums">
            PAGE {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1 border-2 border-[var(--ink)] bg-[var(--white)] text-[var(--ink)] hover:bg-[var(--yellow)] disabled:opacity-30 transition-colors shadow-[1px_1px_0_var(--ink)]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sticky Action Dock for Selected Enterprises */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 z-30 p-3 sm:p-4 bg-[var(--ink)] text-[var(--white)] border-t-4 border-[var(--yellow)] shadow-[0_-8px_25px_rgba(0,0,0,0.5)] flex flex-wrap items-center justify-between gap-3">
          {/* Left info badge & clear */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[var(--yellow)] text-[var(--ink)] px-3 py-1.5 font-mono font-black text-xs uppercase shadow-[2px_2px_0_var(--white)]">
              <CheckSquare className="w-4 h-4 stroke-[2.5]" />
              <span>{selectedIds.size} SÉLECTIONNÉE{selectedIds.size > 1 ? 'S' : ''}</span>
            </div>
            <button
              onClick={handleClearSelection}
              className="text-[11px] font-mono text-[var(--white)]/70 hover:text-[var(--white)] underline cursor-pointer uppercase font-bold"
            >
              Tout désélectionner
            </button>
          </div>

          {/* Right: The 5 Requested Batch Actions for Selected */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Generate with Gemini */}
            <button
              onClick={() => onBatchGenerateSelected?.(selectedLeadsList)}
              disabled={batchGenerating}
              className="btn-transit !bg-[var(--blue)] !text-[var(--white)] !border-[var(--white)] hover:!bg-[var(--yellow)] hover:!text-[var(--ink)] !py-1.5 !px-3 !text-xs !font-black uppercase flex items-center gap-1.5 shadow-[2px_2px_0_var(--white)]"
              title="Générer les e-mails avec Gemini pour les entreprises sélectionnées"
            >
              <Sparkles className={`w-3.5 h-3.5 ${batchGenerating ? 'animate-spin' : ''}`} />
              <span>GÉNÉRER ({selectedIds.size})</span>
            </button>

            {/* 2. Validate / Accept */}
            <button
              onClick={() => onAcceptSelected?.(selectedLeadsList)}
              className="btn-transit !bg-emerald-400 !text-[var(--ink)] !border-[var(--white)] hover:!bg-emerald-300 !py-1.5 !px-3 !text-xs !font-black uppercase flex items-center gap-1.5 shadow-[2px_2px_0_var(--white)]"
              title="Valider / accepter les entreprises sélectionnées"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>VALIDER ({selectedIds.size})</span>
            </button>

            {/* 3. Block / Annuler */}
            <button
              onClick={() => onCancelSelected?.(selectedLeadsList)}
              className="btn-transit !bg-red-600 !text-white !border-white hover:!bg-red-500 !py-1.5 !px-3 !text-xs !font-black uppercase flex items-center gap-1.5 shadow-[2px_2px_0_var(--white)]"
              title="Annuler / Bloquer les entreprises sélectionnées (aucun e-mail ne sera généré ni envoyé)"
            >
              <Ban className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>BLOQUER / ANNULER ({selectedIds.size})</span>
            </button>

            {/* 4. Schedule send */}
            <div className="flex items-center gap-1 bg-[var(--white)]/10 p-1 border border-white/40 shadow-[2px_2px_0_var(--white)]">
              <input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                className="bg-black/60 text-white text-[11px] font-mono px-2 py-1 border border-white/30 outline-none"
                title="Date et heure de programmation (envoi simultané)"
              />
              <button
                onClick={() => onScheduleSelected?.(selectedLeadsList, scheduleDateTime)}
                className="btn-transit !bg-[var(--yellow)] !text-[var(--ink)] !border-[var(--white)] !py-1 !px-2.5 !text-xs !font-black uppercase flex items-center gap-1"
                title="Programmer l'envoi en simultané pour les entreprises sélectionnées"
              >
                <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>PROGRAMMER</span>
              </button>
            </div>

            {/* 5. Direct send immediately in parallel */}
            <button
              onClick={() => onSendSelected?.(selectedLeadsList)}
              disabled={batchSending}
              className="btn-transit !bg-[var(--white)] !text-[var(--ink)] !border-[var(--white)] hover:!bg-[var(--yellow)] !py-1.5 !px-3 !text-xs !font-black uppercase flex items-center gap-1.5 shadow-[2px_2px_0_var(--yellow)]"
              title="Envoyer immédiatement en parallèle via SMTP (tous les e-mails partent en même temps)"
            >
              <Send className={`w-3.5 h-3.5 ${batchSending ? 'animate-pulse' : ''}`} />
              <span>ENVOI SIMULTANÉ ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
