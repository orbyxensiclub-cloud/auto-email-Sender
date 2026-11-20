'use client';

import React, { useState, useMemo } from 'react';
import {
  Download,
  Upload,
  Terminal,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Mail,
  Users,
  Search,
  Filter,
  FileText,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Info,
  RefreshCw,
} from 'lucide-react';
import { CompanyLead } from '@/lib/sheets';

interface ResultRow {
  email: string;
  name: string;
  company: string;
  status: 'BOUNCED' | 'REPLIED' | 'REPLIED_OTHER_SENDER' | 'AUTO-REPLY' | 'NO RESPONSE' | string;
  bounce_type: 'PERMANENT' | 'TEMPORARY' | string;
  bounce_reason: string;
  reply_date: string;
  reply_subject: string;
  reply_from: string;
}

interface EmailCheckerDashboardProps {
  leads: CompanyLead[];
  onOpenInspector?: (lead: CompanyLead) => void;
}

export default function EmailCheckerDashboard({ leads }: EmailCheckerDashboardProps) {
  const [resultsData, setResultsData] = useState<ResultRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [exportFilterMode, setExportFilterMode] = useState<'all_emails' | 'sent_only'>('all_emails');

  // Export current recipients as CSV directly in the browser
  const handleExportRecipientsCsv = () => {
    const candidateLeads = leads.filter((l) => {
      if (!l.email || !l.email.includes('@')) return false;
      if (exportFilterMode === 'sent_only') {
        return l.status === 'sent';
      }
      return true;
    });

    if (candidateLeads.length === 0) {
      alert("Aucune entreprise avec adresse e-mail disponible pour l'export.");
      return;
    }

    // CSV header: email,name,company
    let csvContent = '\uFEFFemail,name,company\n';
    candidateLeads.forEach((lead) => {
      const emailSafe = `"${lead.email.replace(/"/g, '""').trim()}"`;
      const nameSafe = `"${(lead.contactPerson || '').replace(/"/g, '""').trim()}"`;
      const companySafe = `"${(lead.name || '').replace(/"/g, '""').trim()}"`;
      csvContent += `${emailSafe},${nameSafe},${companySafe}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'recipients.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Parse uploaded results.csv
  const handleUploadResultsCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) return;

      // Simple CSV parser supporting quotes
      const parseCsvLine = (line: string): string[] => {
        const row: string[] = [];
        let inQuotes = false;
        let token = '';
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            row.push(token.trim().replace(/^"|"$/g, ''));
            token = '';
          } else {
            token += char;
          }
        }
        row.push(token.trim().replace(/^"|"$/g, ''));
        return row;
      };

      const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
      const emailIdx = header.indexOf('email');
      const nameIdx = header.indexOf('name');
      const companyIdx = header.indexOf('company');
      const statusIdx = header.indexOf('status');
      const bounceTypeIdx = header.indexOf('bounce_type');
      const bounceReasonIdx = header.indexOf('bounce_reason');
      const replyDateIdx = header.indexOf('reply_date');
      const replySubjectIdx = header.indexOf('reply_subject');
      const replyFromIdx = header.indexOf('reply_from');

      const parsedRows: ResultRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length <= emailIdx) continue;
        parsedRows.push({
          email: cols[emailIdx] || '',
          name: nameIdx !== -1 ? cols[nameIdx] || '' : '',
          company: companyIdx !== -1 ? cols[companyIdx] || '' : '',
          status: (statusIdx !== -1 ? cols[statusIdx] || 'NO RESPONSE' : 'NO RESPONSE').toUpperCase(),
          bounce_type: bounceTypeIdx !== -1 ? cols[bounceTypeIdx] || '' : '',
          bounce_reason: bounceReasonIdx !== -1 ? cols[bounceReasonIdx] || '' : '',
          reply_date: replyDateIdx !== -1 ? cols[replyDateIdx] || '' : '',
          reply_subject: replySubjectIdx !== -1 ? cols[replySubjectIdx] || '' : '',
          reply_from: replyFromIdx !== -1 ? cols[replyFromIdx] || '' : '',
        });
      }

      setResultsData(parsedRows);
    };
    reader.readAsText(file);
  };

  // Download a subset CSV (to_clean.csv, to_retry.csv, replied.csv)
  const downloadSubsetCsv = (subsetType: 'to_clean' | 'to_retry' | 'replied') => {
    if (resultsData.length === 0) return;

    let filtered: ResultRow[] = [];
    let filename = '';

    if (subsetType === 'to_clean') {
      filtered = resultsData.filter((r) => r.bounce_type === 'PERMANENT');
      filename = 'to_clean.csv';
    } else if (subsetType === 'to_retry') {
      filtered = resultsData.filter((r) => r.status === 'NO RESPONSE' || r.bounce_type === 'TEMPORARY');
      filename = 'to_retry.csv';
    } else if (subsetType === 'replied') {
      filtered = resultsData.filter((r) => r.status === 'REPLIED' || r.status === 'REPLIED_OTHER_SENDER');
      filename = 'replied.csv';
    }

    let csvContent = '\uFEFFemail,name,company,status,bounce_type,bounce_reason,reply_date,reply_subject,reply_from\n';
    filtered.forEach((r) => {
      csvContent += `"${r.email}","${r.name}","${r.company}","${r.status}","${r.bounce_type}","${r.bounce_reason.replace(/"/g, '""')}","${r.reply_date}","${r.reply_subject.replace(/"/g, '""')}","${r.reply_from}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyCliCommand = () => {
    navigator.clipboard.writeText('python check_campaign.py --recipients recipients.csv --days 14');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 3000);
  };

  // Statistics
  const stats = useMemo(() => {
    const total = resultsData.length;
    const bounced = resultsData.filter((r) => r.status === 'BOUNCED');
    const permBounces = bounced.filter((r) => r.bounce_type === 'PERMANENT');
    const tempBounces = bounced.filter((r) => r.bounce_type === 'TEMPORARY');
    const directReplies = resultsData.filter((r) => r.status === 'REPLIED');
    const colleagueReplies = resultsData.filter((r) => r.status === 'REPLIED_OTHER_SENDER');
    const autoReplies = resultsData.filter((r) => r.status === 'AUTO-REPLY');
    const noResponse = resultsData.filter((r) => r.status === 'NO RESPONSE');

    return {
      total,
      bouncedCount: bounced.length,
      permBouncesCount: permBounces.length,
      tempBouncesCount: tempBounces.length,
      directRepliesCount: directReplies.length,
      colleagueRepliesCount: colleagueReplies.length,
      autoRepliesCount: autoReplies.length,
      noResponseCount: noResponse.length,
    };
  }, [resultsData]);

  // Filtered rows for table
  const filteredRows = useMemo(() => {
    return resultsData.filter((row) => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'BOUNCED' && row.status !== 'BOUNCED') return false;
        if (statusFilter === 'REPLIED' && row.status !== 'REPLIED' && row.status !== 'REPLIED_OTHER_SENDER') return false;
        if (statusFilter === 'AUTO-REPLY' && row.status !== 'AUTO-REPLY') return false;
        if (statusFilter === 'NO RESPONSE' && row.status !== 'NO RESPONSE') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mEmail = row.email.toLowerCase().includes(q);
        const mCompany = row.company.toLowerCase().includes(q);
        const mName = row.name.toLowerCase().includes(q);
        const mReason = row.bounce_reason.toLowerCase().includes(q);
        const mReplyFrom = row.reply_from.toLowerCase().includes(q);
        if (!mEmail && !mCompany && !mName && !mReason && !mReplyFrom) return false;
      }

      return true;
    });
  }, [resultsData, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[var(--white)] border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-black text-[var(--blue)] uppercase tracking-widest">
              <Terminal className="w-4 h-4" />
              <span>GMAIL API AUDITOR & CLASSIFICATION DES RETOURS</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase text-[var(--ink)] tracking-tight mt-1">
              SUIVI DE CAMPAGNE, BOUNCES & RÉPONSES
            </h2>
            <p className="text-xs font-mono text-[var(--grey)] uppercase font-bold mt-1">
              Classification automatique : Rebonds 5.x.x / 4.x.x, Réponses directes, Collègues d&apos;entreprise, Absences & Relances
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="/api/scripts/download?file=check_campaign.py"
              download="check_campaign.py"
              className="btn-transit !bg-[var(--ink)] !text-[var(--white)] !border-[var(--ink)] hover:!bg-[var(--yellow)] hover:!text-[var(--ink)] !py-2 !px-3 !text-xs !font-black uppercase flex items-center gap-1.5 shadow-[2px_2px_0_var(--ink)]"
              title="Télécharger le script Python complet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>check_campaign.py</span>
            </a>
            <a
              href="/api/scripts/download?file=requirements.txt"
              download="requirements.txt"
              className="btn-transit !bg-[var(--ground)] !text-[var(--ink)] !border-[var(--ink)] hover:!bg-[var(--yellow)] !py-2 !px-3 !text-xs !font-bold uppercase flex items-center gap-1.5 shadow-[2px_2px_0_var(--ink)]"
              title="Télécharger requirements.txt"
            >
              <Download className="w-3.5 h-3.5" />
              <span>requirements.txt</span>
            </a>
          </div>
        </div>
      </div>

      {/* 3 Action Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Step 1: Export Recipients */}
        <div className="bg-[var(--white)] border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-[var(--ink)]">
              <span className="font-mono font-black text-xs uppercase px-2 py-0.5 bg-[var(--yellow)] text-[var(--ink)]">
                ÉTAPE 1
              </span>
              <span className="text-[10px] font-mono font-bold text-[var(--grey)] uppercase">
                DESTINATAIRES
              </span>
            </div>
            <h3 className="text-sm font-black uppercase tracking-tight text-[var(--ink)] mt-3">
              GÉNÉRER RECIPIENTS.CSV
            </h3>
            <p className="text-xs font-mono text-[var(--ink)]/80 mt-1 leading-relaxed">
              Exporte la liste au format attendu par le script (<code className="bg-gray-200 px-1">email,name,company</code>).
            </p>

            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2 text-xs font-mono cursor-pointer">
                <input
                  type="radio"
                  name="exportMode"
                  checked={exportFilterMode === 'all_emails'}
                  onChange={() => setExportFilterMode('all_emails')}
                  className="accent-[var(--ink)]"
                />
                <span>Toutes les entreprises avec e-mail ({leads.filter((l) => l.email).length})</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-mono cursor-pointer">
                <input
                  type="radio"
                  name="exportMode"
                  checked={exportFilterMode === 'sent_only'}
                  onChange={() => setExportFilterMode('sent_only')}
                  className="accent-[var(--ink)]"
                />
                <span>Uniquement les e-mails envoyés ({leads.filter((l) => l.status === 'sent').length})</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleExportRecipientsCsv}
            className="btn-transit yellow !py-2.5 !px-4 !text-xs !font-black uppercase w-full mt-5 shadow-[2px_2px_0_var(--ink)] flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>TÉLÉCHARGER RECIPIENTS.CSV</span>
          </button>
        </div>

        {/* Step 2: Run Python Script */}
        <div className="bg-[var(--white)] border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-[var(--ink)]">
              <span className="font-mono font-black text-xs uppercase px-2 py-0.5 bg-[var(--blue)] text-[var(--white)]">
                ÉTAPE 2
              </span>
              <span className="text-[10px] font-mono font-bold text-[var(--grey)] uppercase">
                EXÉCUTION TERMINAL
              </span>
            </div>
            <h3 className="text-sm font-black uppercase tracking-tight text-[var(--ink)] mt-3">
              LANCER LE CLASSIFICATEUR
            </h3>
            <p className="text-xs font-mono text-[var(--ink)]/80 mt-1 leading-relaxed">
              Connectez votre compte Gmail en lecture seule et exécutez la commande :
            </p>

            <div className="mt-3 p-2.5 bg-[var(--ink)] text-[var(--white)] font-mono text-[11px] border border-[var(--ink)] rounded-none relative">
              <div className="break-all text-[var(--yellow)]">
                python check_campaign.py --recipients recipients.csv --days 14
              </div>
              <button
                onClick={copyCliCommand}
                className="mt-2 text-[10px] uppercase font-bold text-[var(--white)]/80 hover:text-[var(--white)] flex items-center gap-1 underline"
              >
                {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCmd ? 'Commande copiée !' : 'Copier la commande'}</span>
              </button>
            </div>
          </div>

          <div className="mt-4 p-2 bg-[var(--ground)] border border-[var(--ink)]/30 text-[10px] font-mono text-[var(--grey)]">
            * Nécessite <code className="text-[var(--ink)] font-bold">credentials.json</code> placé dans le même dossier (voir guide en bas).
          </div>
        </div>

        {/* Step 3: Load results.csv */}
        <div className="bg-[var(--white)] border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-[var(--ink)]">
              <span className="font-mono font-black text-xs uppercase px-2 py-0.5 bg-emerald-400 text-[var(--ink)]">
                ÉTAPE 3
              </span>
              <span className="text-[10px] font-mono font-bold text-[var(--grey)] uppercase">
                ANALYSE
              </span>
            </div>
            <h3 className="text-sm font-black uppercase tracking-tight text-[var(--ink)] mt-3">
              IMPORTER RESULTS.CSV
            </h3>
            <p className="text-xs font-mono text-[var(--ink)]/80 mt-1 leading-relaxed">
              Glissez ou sélectionnez le fichier <code className="bg-gray-200 px-1 font-bold">results.csv</code> généré pour visualiser le tableau de bord interactif.
            </p>

            <div className="mt-4">
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[var(--ink)] bg-[var(--ground)] hover:bg-[var(--yellow)]/10 cursor-pointer transition-colors text-center">
                <Upload className="w-6 h-6 text-[var(--blue)] stroke-[2.5] mb-1" />
                <span className="text-xs font-mono font-black uppercase text-[var(--ink)]">
                  {resultsData.length > 0 ? 'Changer results.csv' : 'Choisir results.csv'}
                </span>
                <span className="text-[10px] font-mono text-[var(--grey)] mt-0.5">
                  {resultsData.length > 0 ? `${resultsData.length} lignes chargées` : 'Fichier généré par le script'}
                </span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleUploadResultsCsv}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {resultsData.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-xs font-mono font-bold text-emerald-800 bg-[#E8F8EE] p-2 border border-emerald-700">
              <span>{resultsData.length} CONTACTS AUDITÉS</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards when results are loaded */}
      {resultsData.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Replies (Direct) */}
            <div className="p-4 bg-[var(--white)] border-2 border-[var(--ink)] shadow-[2px_2px_0_var(--ink)]">
              <div className="text-[10px] font-mono font-black text-emerald-700 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>RÉPONSES DIRECTES</span>
              </div>
              <div className="text-2xl font-black font-mono text-[var(--ink)] mt-1">
                {stats.directRepliesCount}
              </div>
              <div className="text-[10px] font-mono text-[var(--grey)] mt-0.5">
                {stats.total > 0 ? ((stats.directRepliesCount / stats.total) * 100).toFixed(1) : 0}% du total
              </div>
            </div>

            {/* Replies (Colleague) */}
            <div className="p-4 bg-[var(--white)] border-2 border-[var(--ink)] shadow-[2px_2px_0_var(--ink)]">
              <div className="text-[10px] font-mono font-black text-[var(--blue)] uppercase flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>COLLÈGUES DOMAINE</span>
              </div>
              <div className="text-2xl font-black font-mono text-[var(--ink)] mt-1">
                {stats.colleagueRepliesCount}
              </div>
              <div className="text-[10px] font-mono text-[var(--grey)] mt-0.5">
                Même entreprise
              </div>
            </div>

            {/* Auto-Replies */}
            <div className="p-4 bg-[var(--white)] border-2 border-[var(--ink)] shadow-[2px_2px_0_var(--ink)]">
              <div className="text-[10px] font-mono font-black text-amber-700 uppercase flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>AUTO-RÉPONSES / ABSENT</span>
              </div>
              <div className="text-2xl font-black font-mono text-[var(--ink)] mt-1">
                {stats.autoRepliesCount}
              </div>
              <div className="text-[10px] font-mono text-[var(--grey)] mt-0.5">
                Congés / Absence
              </div>
            </div>

            {/* Bounced */}
            <div className="p-4 bg-[var(--white)] border-2 border-[var(--ink)] shadow-[2px_2px_0_var(--ink)]">
              <div className="text-[10px] font-mono font-black text-red-700 uppercase flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>REBONDS (BOUNCES)</span>
              </div>
              <div className="text-2xl font-black font-mono text-red-900 mt-1">
                {stats.bouncedCount}
              </div>
              <div className="text-[10px] font-mono text-red-700 mt-0.5">
                {stats.permBouncesCount} perm (5xx) | {stats.tempBouncesCount} temp (4xx)
              </div>
            </div>

            {/* No Response */}
            <div className="p-4 bg-[var(--white)] border-2 border-[var(--ink)] shadow-[2px_2px_0_var(--ink)]">
              <div className="text-[10px] font-mono font-black text-[var(--grey)] uppercase flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                <span>SANS RÉPONSE</span>
              </div>
              <div className="text-2xl font-black font-mono text-[var(--ink)] mt-1">
                {stats.noResponseCount}
              </div>
              <div className="text-[10px] font-mono text-[var(--grey)] mt-0.5">
                À relancer
              </div>
            </div>
          </div>

          {/* Export Action Bar for Classified Subsets */}
          <div className="bg-[var(--ground)] border-2 border-[var(--ink)] p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-mono font-black uppercase text-[var(--ink)]">
              EXPORTER LES SEGMENTS :
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => downloadSubsetCsv('replied')}
                className="btn-transit !bg-emerald-400 !text-[var(--ink)] !border-[var(--ink)] !py-1.5 !px-3 !text-xs !font-black uppercase flex items-center gap-1 shadow-[1px_1px_0_var(--ink)]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>RÉPONSES ({stats.directRepliesCount + stats.colleagueRepliesCount})</span>
              </button>
              <button
                onClick={() => downloadSubsetCsv('to_clean')}
                className="btn-transit !bg-red-600 !text-white !border-[var(--ink)] !py-1.5 !px-3 !text-xs !font-black uppercase flex items-center gap-1 shadow-[1px_1px_0_var(--ink)]"
                title="Télécharger les rebonds permanents à purger de votre base de données"
              >
                <Download className="w-3.5 h-3.5" />
                <span>REBONDS À PURGER ({stats.permBouncesCount})</span>
              </button>
              <button
                onClick={() => downloadSubsetCsv('to_retry')}
                className="btn-transit !bg-[var(--yellow)] !text-[var(--ink)] !border-[var(--ink)] !py-1.5 !px-3 !text-xs !font-black uppercase flex items-center gap-1 shadow-[1px_1px_0_var(--ink)]"
                title="Télécharger les contacts sans réponse et rebonds temporaires pour relance"
              >
                <Download className="w-3.5 h-3.5" />
                <span>FILE RELANCES ({stats.noResponseCount + stats.tempBouncesCount})</span>
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-[var(--white)] border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] overflow-hidden">
            {/* Table Search & Filters */}
            <div className="p-3 sm:p-4 border-b-2 border-[var(--ink)] flex flex-wrap items-center justify-between gap-3 bg-[var(--ground)]">
              <div className="flex items-center gap-2 flex-1 max-w-md relative">
                <Search className="w-4 h-4 text-[var(--grey)] absolute left-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="FILTRER PAR EMAIL, ENTREPRISE, ERREUR..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs font-mono border-2 border-[var(--ink)] bg-[var(--white)] outline-none"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {['ALL', 'REPLIED', 'AUTO-REPLY', 'BOUNCED', 'NO RESPONSE'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 text-xs font-mono font-bold uppercase border-2 transition-colors ${
                      statusFilter === status
                        ? 'bg-[var(--ink)] text-[var(--yellow)] border-[var(--ink)]'
                        : 'bg-[var(--white)] text-[var(--ink)] border-[var(--ink)]/40 hover:border-[var(--ink)]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--ground)] border-b-2 border-[var(--ink)] font-mono font-black text-xs uppercase text-[var(--ink)]">
                    <th className="py-3 px-4">DESTINATAIRE & ENTREPRISE</th>
                    <th className="py-3 px-4">STATUT GMAIL</th>
                    <th className="py-3 px-4">TYPE & DIAGNOSTIC DÉTAILLÉ</th>
                    <th className="py-3 px-4">RÉPONSE / COLLABORATEUR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ink)]/20 font-mono">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-[var(--grey)]">
                        Aucun résultat correspondant aux filtres.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.slice(0, 100).map((row, idx) => (
                      <tr key={idx} className="hover:bg-[var(--yellow)]/10 transition-colors">
                        <td className="py-2.5 px-4 max-w-[260px]">
                          <div className="font-bold text-[var(--ink)] truncate">{row.email}</div>
                          <div className="text-[11px] text-[var(--grey)] truncate uppercase">
                            {row.company || row.name || '-'}
                          </div>
                        </td>

                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {row.status === 'REPLIED' ? (
                            <span className="tag-hot !bg-emerald-300 !text-emerald-950 border border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                              <span>RÉPONSE</span>
                            </span>
                          ) : row.status === 'REPLIED_OTHER_SENDER' ? (
                            <span className="tag-hot !bg-[var(--blue)] !text-[var(--white)] border border-[var(--ink)]">
                              <Users className="w-3 h-3" />
                              <span>COLLÈGUE</span>
                            </span>
                          ) : row.status === 'AUTO-REPLY' ? (
                            <span className="tag-hot !bg-amber-200 !text-amber-950 border border-amber-800">
                              <Clock className="w-3 h-3" />
                              <span>ABSENT</span>
                            </span>
                          ) : row.status === 'BOUNCED' ? (
                            <span
                              className={`tag-hot border ${
                                row.bounce_type === 'PERMANENT'
                                  ? '!bg-red-600 !text-white border-red-900'
                                  : '!bg-orange-300 !text-orange-950 border-orange-800'
                              }`}
                            >
                              <AlertOctagon className="w-3 h-3 stroke-[3]" />
                              <span>{row.bounce_type === 'PERMANENT' ? 'REBOND 5XX' : 'REBOND 4XX'}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-[var(--grey)]">
                              SANS RÉPONSE
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-4 max-w-[320px]">
                          {row.status === 'BOUNCED' ? (
                            <div>
                              <div className="font-bold text-red-900 text-[11px] truncate">
                                {row.bounce_type}: {row.bounce_reason}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[var(--grey)]">-</span>
                          )}
                        </td>

                        <td className="py-2.5 px-4 max-w-[300px]">
                          {row.reply_subject ? (
                            <div>
                              <div className="font-bold text-[var(--ink)] truncate text-[11px]">
                                {row.reply_subject}
                              </div>
                              <div className="text-[10px] text-[var(--grey)] truncate">
                                De: {row.reply_from || row.email} ({row.reply_date || 'Date inconnue'})
                              </div>
                            </div>
                          ) : (
                            <span className="text-[var(--grey)]">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredRows.length > 100 && (
              <div className="p-3 text-center text-xs font-mono text-[var(--grey)] bg-[var(--ground)] border-t border-[var(--ink)]/20">
                Affichage des 100 premières lignes sur {filteredRows.length}. Utilisez les segments CSV ci-dessus pour la liste complète.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Setup Guide & FAQ */}
      <div className="bg-[var(--white)] border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b-2 border-[var(--ink)]">
          <Info className="w-5 h-5 text-[var(--blue)] stroke-[2.5]" />
          <h3 className="text-sm font-black uppercase text-[var(--ink)] tracking-wider">
            GUIDE DE CONFIGURATION GOOGLE CLOUD OAUTH 2.0 (GMAIL READ-ONLY)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono leading-relaxed text-[var(--ink)]">
          <div className="p-3 bg-[var(--ground)] border border-[var(--ink)]/40 space-y-2">
            <h4 className="font-black uppercase text-[var(--blue)]">
              1. Créer le projet & Activer l&apos;API Gmail
            </h4>
            <p>
              1. Rendez-vous sur la <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-[var(--blue)] font-bold underline">Console Google Cloud</a>.<br />
              2. Créez un nouveau projet (ex: <code>ENSI-Email-Auditor</code>).<br />
              3. Allez dans <strong>API et services &gt; Bibliothèque</strong>, recherchez <strong>Gmail API</strong> et cliquez sur <strong>Activer</strong>.
            </p>
          </div>

          <div className="p-3 bg-[var(--ground)] border border-[var(--ink)]/40 space-y-2">
            <h4 className="font-black uppercase text-[var(--blue)]">
              2. Écran de Consentement OAuth & Test User
            </h4>
            <p>
              1. Allez dans <strong>Écran de consentement OAuth</strong> &gt; choisissez <strong>Externe</strong>.<br />
              2. Scope requis uniquement : <code>https://www.googleapis.com/auth/gmail.readonly</code>.<br />
              3. <strong>ESSENTIEL</strong> : Dans <em>Utilisateurs test</em>, ajoutez votre adresse Gmail expéditrice (ex: <code>orbyx.ensiclub@ensi-uma.tn</code>).
            </p>
          </div>

          <div className="p-3 bg-[var(--ground)] border border-[var(--ink)]/40 space-y-2">
            <h4 className="font-black uppercase text-[var(--blue)]">
              3. Télécharger credentials.json (Desktop App)
            </h4>
            <p>
              1. Allez dans <strong>Identifiants &gt; + Créer des identifiants &gt; ID client OAuth</strong>.<br />
              2. Type d&apos;application : <strong>Application pour ordinateur (Desktop App)</strong>.<br />
              3. Téléchargez le fichier JSON, renommez-le en <code>credentials.json</code> et déposez-le dans le dossier <code>scripts/</code>.
            </p>
          </div>

          <div className="p-3 bg-[var(--ground)] border border-[var(--ink)]/40 space-y-2">
            <h4 className="font-black uppercase text-[var(--blue)]">
              4. Note d&apos;expiration (7 jours en mode Testing)
            </h4>
            <p>
              En mode <em>Testing</em>, les tokens d&apos;actualisation Google expirent au bout de 7 jours. Le script relancera automatiquement la fenêtre de consentement si nécessaire. Pour rendre le token permanent, cliquez sur <strong>Publier l&apos;application</strong> dans Google Cloud Console.
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-[var(--yellow)]/20 border-2 border-[var(--ink)] flex items-start gap-3 mt-2">
          <ShieldAlert className="w-5 h-5 text-[var(--ink)] shrink-0 mt-0.5" />
          <div className="text-xs font-mono">
            <strong className="uppercase font-black text-[var(--ink)]">Astuce pour vos futures campagnes :</strong>
            <p className="mt-0.5 text-[var(--ink)]/90">
              Pour un suivi 100% déterministe sans recherche textuelle, notre plateforme enregistre les <code>Message-ID</code> et permet d&apos;ajouter l&apos;en-tête personnalisé <code>X-Campaign-ID: orbyx-ml-challenge-2.0</code> pour lier immédiatement les Delivery Status Notifications à chaque contact de la base de données.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
