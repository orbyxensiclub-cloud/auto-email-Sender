'use client';

import React from 'react';
import { Sparkles, Key, Calendar, FileSpreadsheet, RefreshCw, ExternalLink, MessageSquareText, UserCheck } from 'lucide-react';

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
    </header>
  );
}
