'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  XCircle,
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
}: LeadsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(leads.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLeads = leads.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

  return (
    <div className="bg-[var(--white)] border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] overflow-hidden">
      {/* Route Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--ground)] border-b-4 border-[var(--ink)] text-[var(--ink)] font-mono font-black text-xs uppercase tracking-widest">
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
                <td colSpan={5} className="py-16 text-center text-[var(--ink)] font-mono">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[var(--grey)]" />
                  AUCUNE UNITÉ CORRESPONDANTE DANS CETTE ROUTE.
                </td>
              </tr>
            ) : (
              paginatedLeads.map((lead) => {
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
                      isCancelled
                        ? 'bg-red-50/40 hover:bg-red-100/40 opacity-80'
                        : 'hover:bg-[var(--yellow)]/10'
                    }`}
                  >
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
                          className="p-1.5 border-2 border-[var(--ink)] bg-[var(--white)] text-[var(--ink)] hover:bg-[var(--yellow)] disabled:opacity-30 transition-colors"
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
                          className={`p-1.5 border-2 border-[var(--ink)] transition-colors ${
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
                          className={`p-1.5 border-2 border-[var(--ink)] transition-colors ${
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
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-1 border-2 border-[var(--ink)] bg-[var(--white)] text-[var(--ink)] hover:bg-[var(--yellow)] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="tabular-nums">
            PAGE {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1 border-2 border-[var(--ink)] bg-[var(--white)] text-[var(--ink)] hover:bg-[var(--yellow)] disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
