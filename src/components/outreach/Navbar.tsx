'use client';

import React from 'react';
import {
  Sparkles,
  Key,
  Calendar,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  MessageSquareText,
  UserCheck,
  Paperclip,
  Share2,
  Send,
  CheckCircle2,
} from 'lucide-react';

interface NavbarProps {
  sheetUrl: string;
  onReloadSheet: () => void;
  loadingSheet: boolean;
  hasApiKey: boolean;
  onOpenApiKeyModal: () => void;
  onOpenEventModal: () => void;
  onOpenSheetModal: () => void;
  hasDirectives: boolean;
  onOpenDirectivesModal: () => void;
  currentReviewer: string;
  onOpenReviewerModal: () => void;
  globalAttachmentsCount?: number;
  onOpenAttachmentsModal: () => void;
  onOpenShareModal: () => void;
  activeTab?: 'outreach' | 'tracker';
  onSelectTab?: (tab: 'outreach' | 'tracker') => void;
}

export default function Navbar({
  sheetUrl,
  onReloadSheet,
  loadingSheet,
  hasApiKey,
  onOpenApiKeyModal,
  onOpenEventModal,
  onOpenSheetModal,
  hasDirectives,
  onOpenDirectivesModal,
  currentReviewer,
  onOpenReviewerModal,
  globalAttachmentsCount = 0,
  onOpenAttachmentsModal,
  onOpenShareModal,
  activeTab = 'outreach',
  onSelectTab,
}: NavbarProps) {
  return (
    <header className="band sticky top-0 z-40 w-full border-b-2 border-[var(--ink)] shadow-md">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Mark */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {/* Transit Route SVG Mark */}
            <svg viewBox="0 0 44 20" className="w-11 h-5 flex-none" aria-hidden="true">
              <path d="M0 10 H44" stroke="#14161A" strokeWidth="8" />
              <path d="M0 10 H44" stroke="#F4B400" strokeWidth="4" />
              <circle cx="30" cy="10" r="7" fill="#fff" stroke="#14161A" strokeWidth="3" />
            </svg>
            <div className="leading-tight">
              <div className="font-extrabold tracking-widest text-lg sm:text-xl text-[var(--white)] uppercase flex items-center gap-2">
                <span>ENSI SPONSOR·AI</span>
                <span className="bg-[var(--yellow)] text-[var(--ink)] text-[10px] font-mono px-1.5 py-0.5 font-black tracking-normal">
                  SYS 2.0
                </span>
              </div>
              <div className="text-[11px] font-mono tracking-wide text-[var(--on-blue)] uppercase">
                Plateforme d'Automatisation & Prospection Événementielle
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Sheet Connection Status */}
          <button
            onClick={onOpenSheetModal}
            className="btn-transit !py-2 !text-xs !bg-[var(--blue)] !text-[var(--white)] !border-[var(--white)] hover:!bg-[var(--yellow)] hover:!text-[var(--ink)] hover:!border-[var(--yellow)]"
            title="Inspecter le lien Google Sheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--yellow)]" />
            <span>Google Sheet</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </button>

          {/* Reload Sheet Button */}
          <button
            onClick={onReloadSheet}
            disabled={loadingSheet}
            className="p-2 border-2 border-[var(--white)] text-[var(--white)] hover:bg-[var(--yellow)] hover:text-[var(--ink)] hover:border-[var(--yellow)] transition-colors disabled:opacity-50"
            title="Rafraîchir les données du Sheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSheet ? 'animate-spin text-[var(--yellow)]' : ''}`} />
          </button>

          {/* Event Context Button */}
          <button
            onClick={onOpenEventModal}
            className="btn-transit !py-2 !text-xs !bg-[var(--blue)] !text-[var(--white)] !border-[var(--white)] hover:!bg-[var(--yellow)] hover:!text-[var(--ink)] hover:!border-[var(--yellow)]"
          >
            <Calendar className="w-3.5 h-3.5 text-[var(--yellow)]" />
            <span>Événement</span>
          </button>

          {/* Global Attachments Button */}
          <button
            onClick={onOpenAttachmentsModal}
            className="btn-transit !py-2 !text-xs !bg-[var(--blue)] !text-[var(--white)] !border-[var(--white)] hover:!bg-[var(--yellow)] hover:!text-[var(--ink)] hover:!border-[var(--yellow)]"
            title="Gérer les pièces jointes globales (dossier de sponsoring, etc.)"
          >
            <Paperclip className="w-3.5 h-3.5 text-[var(--yellow)]" />
            <span>Pièces jointes</span>
            <span className="bg-[var(--yellow)] text-[var(--ink)] text-[10px] font-mono px-1 py-0.2 font-black rounded-sm">
              {globalAttachmentsCount}
            </span>
          </button>

          {/* Global AI Directives Button */}
          <button
            onClick={onOpenDirectivesModal}
            className={`btn-transit !py-2 !text-xs ${
              hasDirectives
                ? '!bg-[var(--yellow)] !text-[var(--ink)] !border-[var(--yellow)] hover:!bg-[var(--white)] hover:!text-[var(--blue)]'
                : '!bg-[var(--blue)] !text-[var(--white)] !border-[var(--white)] hover:!bg-[var(--yellow)] hover:!text-[var(--ink)] hover:!border-[var(--yellow)]'
            }`}
            title="Consignes globales transmises à Gemini avant chaque rédaction"
          >
            <MessageSquareText className="w-3.5 h-3.5" />
            <span>Directives IA</span>
            {hasDirectives && <span className="w-2 h-2 rounded-full bg-[var(--ink)]" />}
          </button>

          {/* Reviewer Session Button */}
          <button
            onClick={onOpenReviewerModal}
            className="btn-transit !py-2 !text-xs !bg-[var(--ink)] !text-[var(--white)] !border-[var(--white)] hover:!bg-[var(--yellow)] hover:!text-[var(--ink)] hover:!border-[var(--yellow)]"
            title="Cliquez pour changer d'examinateur (1 personne requise pour valider)"
          >
            <UserCheck className="w-3.5 h-3.5 text-[var(--yellow)]" />
            <span className="truncate max-w-[130px]">
              {currentReviewer ? currentReviewer : 'Nom requérant'}
            </span>
          </button>

          {/* Share Session Button */}
          <button
            onClick={onOpenShareModal}
            className="btn-transit !py-2 !text-xs !bg-[var(--yellow)] !text-[var(--ink)] !border-[var(--white)] hover:!bg-[var(--white)] hover:!text-[var(--ink)] font-black shadow-[2px_2px_0_var(--ink)]"
            title="Partager le lien de la session avec votre équipe ou exporter la sauvegarde"
          >
            <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Partager</span>
          </button>

          {/* Gemini API Key Button */}
          <button
            onClick={onOpenApiKeyModal}
            className={`btn-transit !py-2 !text-xs ${
              hasApiKey
                ? '!bg-[var(--white)] !text-[var(--blue)] !border-[var(--white)] hover:!bg-[var(--yellow)] hover:!text-[var(--ink)] hover:!border-[var(--yellow)]'
                : '!bg-[var(--yellow)] !text-[var(--ink)] !border-[var(--yellow)] hover:!bg-[var(--ink)] hover:!text-[var(--yellow)] animate-pulse'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{hasApiKey ? 'Clé Gemini Active' : 'Configurer Clé Gemini'}</span>
            <span
              className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-600' : 'bg-red-600'}`}
            />
          </button>
        </div>
      </div>

      {/* View Switcher Tabs (Campagne d'Envoi vs Suivi & Audit Retours) */}
      <div className="bg-[var(--ground)] border-t-2 border-[var(--ink)]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 flex items-center justify-between py-2 gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectTab?.('outreach')}
              className={`px-3 sm:px-4 py-1.5 text-xs font-mono font-black uppercase transition-all flex items-center gap-2 border-2 ${
                activeTab === 'outreach'
                  ? 'bg-[var(--ink)] text-[var(--yellow)] border-[var(--ink)] shadow-[2px_2px_0_var(--ink)]'
                  : 'bg-[var(--white)] text-[var(--ink)] border-[var(--ink)]/40 hover:border-[var(--ink)]'
              }`}
            >
              <Send className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>1. CAMPAGNE D&apos;ENVOI</span>
            </button>

            <button
              onClick={() => onSelectTab?.('tracker')}
              className={`px-3 sm:px-4 py-1.5 text-xs font-mono font-black uppercase transition-all flex items-center gap-2 border-2 ${
                activeTab === 'tracker'
                  ? 'bg-[var(--ink)] text-[var(--yellow)] border-[var(--ink)] shadow-[2px_2px_0_var(--ink)]'
                  : 'bg-[var(--white)] text-[var(--ink)] border-[var(--ink)]/40 hover:border-[var(--ink)]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              <span>2. SUIVI & AUDIT RETOURS (GMAIL)</span>
              <span className="px-1.5 py-0.2 bg-[var(--yellow)] text-[var(--ink)] text-[9px] font-black tracking-normal border border-[var(--ink)]">
                PYTHON AUDITOR
              </span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono text-[var(--grey)] font-bold uppercase">
            <span>BOUNCES (5XX/4XX) • RÉPONSES • COLLÈGUES • ABSENCE</span>
          </div>
        </div>
      </div>
    </header>
  );
}
