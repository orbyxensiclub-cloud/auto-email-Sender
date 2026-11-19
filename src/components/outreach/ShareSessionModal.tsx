'use client';

import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  Upload,
  Database,
  Users,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { CompanyLead } from '@/lib/sheets';

interface ShareSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: CompanyLead[];
  onImportLeads: (leads: CompanyLead[]) => void;
}

/**
 * Compact browser-safe UTF-8 base64 encoder for modified leads
 */
export function encodeSessionState(leads: CompanyLead[]): string {
  const modified = leads
    .filter(
      (l) =>
        (l.generatedSubject && l.generatedBody) ||
        l.status !== 'idle' ||
        (l.approvals && l.approvals.length > 0) ||
        (l.customAttachments && l.customAttachments.length > 0) ||
        l.excludeGlobalAttachments
    )
    .map((l) => ({
      id: l.id,
      name: l.name,
      cat: l.category,
      sub: l.generatedSubject,
      bod: l.generatedBody,
      st: l.status,
      app: l.approvals,
      ref: l.refusedBy,
      sch: l.scheduledTime,
      snt: l.sentAt,
      att: l.customAttachments,
      ex: l.excludeGlobalAttachments,
      chat: l.chatHistory?.length ? l.chatHistory : undefined,
    }));

  const json = JSON.stringify(modified);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Compact browser-safe UTF-8 base64 decoder
 */
export function decodeSessionState(str: string): any[] {
  try {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to decode session state:', e);
    return [];
  }
}

export default function ShareSessionModal({
  isOpen,
  onClose,
  leads,
  onImportLeads,
}: ShareSessionModalProps) {
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const modifiedLeads = leads.filter(
    (l) =>
      (l.generatedSubject && l.generatedBody) ||
      l.status !== 'idle' ||
      (l.approvals && l.approvals.length > 0) ||
      l.excludeGlobalAttachments
  );

  const generatedCount = leads.filter((l) => l.generatedSubject && l.generatedBody).length;
  const acceptedCount = leads.filter((l) => l.status === 'accepted').length;
  const cancelledCount = leads.filter((l) => l.status === 'refused').length;

  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const b64 = encodeSessionState(leads);
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}#session=${b64}`;
  };

  const handleCopyLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadJSON = () => {
    const dataToExport = {
      exportedAt: new Date().toISOString(),
      generator: 'ENSI SPONSOR AI SYS 2.0',
      totalLeads: leads.length,
      generatedCount,
      acceptedCount,
      cancelledCount,
      leads,
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ensi-outreach-session-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        let list: CompanyLead[] = [];

        if (Array.isArray(parsed)) {
          list = parsed;
        } else if (Array.isArray(parsed.leads)) {
          list = parsed.leads;
        } else {
          throw new Error('Format de fichier JSON non reconnu');
        }

        onImportLeads(list);
        setImportSuccess(`${list.length} entreprises importées avec succès !`);
        setTimeout(() => setImportSuccess(null), 3000);
      } catch (err: any) {
        setImportError(err.message || "Échec de l'importation");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--white)] border-2 border-[var(--ink)] shadow-[8px_8px_0_var(--ink)] w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-2 border-[var(--ink)] bg-[var(--yellow)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--ink)] text-[var(--yellow)]">
              <Share2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-[var(--ink)]">
                PARTAGER & SAUVEGARDER LA SESSION
              </h2>
              <p className="text-xs font-mono text-[var(--ink)]/80 uppercase">
                {generatedCount} e-mail(s) généré(s) • {acceptedCount} validé(s) • {cancelledCount} annulé(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border-2 border-[var(--ink)] hover:bg-[var(--white)] text-[var(--ink)] transition-colors"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {importError && (
            <div className="p-3 bg-red-100 border-2 border-red-700 text-red-900 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {importSuccess && (
            <div className="p-3 bg-emerald-100 border-2 border-emerald-700 text-emerald-900 text-xs font-mono flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{importSuccess}</span>
            </div>
          )}

          {/* Option 1: Direct Shareable Link */}
          <div className="p-4 bg-[var(--ground)] border-2 border-[var(--ink)] space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-black text-[var(--ink)] uppercase">
              <Users className="w-4 h-4 text-[var(--blue)]" />
              <span>1. LIEN DE PARTAGE IMMÉDIAT (SANS COMPTE NI BASE DE DONNÉES)</span>
            </div>

            <p className="text-xs text-[var(--ink)]/90 leading-relaxed">
              Copiez ce lien et envoyez-le à vos camarades de club (WhatsApp, Slack, mail).
              Dès qu'ils l'ouvriront, tous vos e-mails rédigés, statuts validés et refusés seront{' '}
              <strong>instantanément synchronisés et enregistrés</strong> dans leur navigateur !
            </p>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={getShareUrl()}
                className="flex-1 px-3 py-2 text-xs font-mono bg-[var(--white)] border-2 border-[var(--ink)] text-[var(--grey)] select-all truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="btn-transit !py-2 !px-4 !text-xs !bg-[var(--ink)] !text-[var(--yellow)] !border-[var(--ink)] hover:!bg-[var(--yellow)] hover:!text-[var(--ink)] whitespace-nowrap font-black flex items-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4 stroke-[3] text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'LIEN COPIÉ !' : 'COPIER LE LIEN'}</span>
              </button>
            </div>
          </div>

          {/* Option 2: Export & Import JSON Backup */}
          <div className="p-4 bg-[var(--ground)] border-2 border-[var(--ink)] space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-black text-[var(--ink)] uppercase">
              <Download className="w-4 h-4 text-emerald-700" />
              <span>2. SAUVEGARDE & RESTAURATION PAR FICHIER JSON</span>
            </div>

            <p className="text-xs text-[var(--ink)]/90 leading-relaxed">
              Téléchargez un fichier complet de sauvegarde ou importez un fichier JSON précédemment exporté pour reprendre le travail sur n'importe quel ordinateur.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadJSON}
                className="btn-transit !py-2 !px-4 !text-xs !bg-[var(--white)] !text-[var(--ink)] !border-[var(--ink)] hover:!bg-[var(--yellow)] font-bold flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORTER LA SESSION (.JSON)</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-transit !py-2 !px-4 !text-xs !bg-[var(--white)] !text-[var(--ink)] !border-[var(--ink)] hover:!bg-[var(--yellow)] font-bold flex items-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>IMPORTER UN FICHIER JSON</span>
              </button>
            </div>
          </div>

          {/* Option 3: Optional Vercel Cloud KV Info */}
          <div className="p-4 bg-blue-50 border-2 border-[var(--blue)] space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-black text-[var(--blue)] uppercase">
              <Database className="w-4 h-4" />
              <span>3. SYNCHRONISATION SERVEUR AUTOMATIQUE (VERCEL KV / UPSTASH)</span>
            </div>
            <p className="text-xs text-[var(--ink)]/90 leading-relaxed">
              Pour que <strong>toute votre équipe accède automatiquement à la même base en temps réel</strong> sur l'adresse principale sans avoir à partager de lien, ajoutez simplement l'intégration gratuite <strong>Upstash Redis</strong> dans le tableau de bord Vercel de votre projet (onglet <em>Storage &gt; Upstash Redis</em>).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-[var(--ink)] bg-[var(--ground)] flex items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-[var(--grey)]">
            💾 Les données restent également enregistrées dans votre navigateur actuel.
          </div>
          <button
            onClick={onClose}
            className="btn-transit ink !py-2 !px-5 !text-xs !font-bold"
          >
            FERMER
          </button>
        </div>
      </div>
    </div>
  );
}
