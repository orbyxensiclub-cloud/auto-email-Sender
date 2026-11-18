'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/outreach/Navbar';
import StatsBar from '@/components/outreach/StatsBar';
import CategoryTabs from '@/components/outreach/CategoryTabs';
import LeadsTable from '@/components/outreach/LeadsTable';
import EmailInspectorModal from '@/components/outreach/EmailInspectorModal';
import ApiKeyModal from '@/components/outreach/ApiKeyModal';
import EventDetailsModal from '@/components/outreach/EventDetailsModal';
import SheetModal from '@/components/outreach/SheetModal';
import GlobalDirectivesModal from '@/components/outreach/GlobalDirectivesModal';
import ReviewerModal from '@/components/outreach/ReviewerModal';
import { CompanyLead, CategoryKey, ApprovalRecord } from '@/lib/sheets';
import { EventDetails, defaultEventDetails } from '@/lib/gemini';
import { Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';

const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1WRTAe68SDCdEBt1-4Dv8D3REDNmSqz_1y-YAF2vNVY0/edit?usp=sharing';

/** Strip any trailing plain-text signature after "Bien cordialement," to avoid duplication with the graphical signature. */
function stripTrailingTextSig(text: string | undefined): string {
  if (!text) return '';
  const marker = 'Bien cordialement,';
  const idx = text.indexOf(marker);
  if (idx !== -1) {
    const after = text.substring(idx + marker.length);
    if (
      after.includes('Jasser') ||
      after.includes('Sponsoring') ||
      after.includes('53989316') ||
      after.includes('58745567') ||
      after.includes('ORBYX') ||
      after.includes('Seif')
    ) {
      return text.substring(0, idx + marker.length).trim();
    }
  }
  return text;
}

export default function HomePage() {
  const [leads, setLeads] = useState<CompanyLead[]>([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [, setSheetError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('ensi');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedLead, setSelectedLead] = useState<CompanyLead | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isReviewerModalOpen, setIsReviewerModalOpen] = useState(false);
  const [isDirectivesModalOpen, setIsDirectivesModalOpen] = useState(false);

  // Settings
  const [apiKey, setApiKey] = useState('');
  const [smtpPass, setSmtpPass] = useState('fhdhixdgigwuaxhq');
  const [eventDetails, setEventDetails] = useState<EventDetails>(defaultEventDetails);
  const [currentReviewer, setCurrentReviewer] = useState('Jasser Ben Jomaa');
  const [globalDirectives, setGlobalDirectives] = useState('');

  // Scheduling and Send All states
  const [selectedScheduleTime, setSelectedScheduleTime] = useState('');
  const [batchSending, setBatchSending] = useState(false);
  const [batchSendProgress, setBatchSendProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // Background and Progress
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type?: 'info' | 'success' | 'warn' } | null>(null);

  // Initialize saved configurations on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('gemini_api_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
      if (savedKey) setApiKey(savedKey);

      const savedSmtp = localStorage.getItem('outreach_smtp_pass');
      if (savedSmtp && savedSmtp !== 'psootfqrahfzjfbr') {
        setSmtpPass(savedSmtp);
      } else {
        const defaultSmtp = 'fhdhixdgigwuaxhq';
        setSmtpPass(defaultSmtp);
        localStorage.setItem('outreach_smtp_pass', defaultSmtp);
      }

      const savedSheet = localStorage.getItem('outreach_sheet_url');
      if (savedSheet) setSheetUrl(savedSheet);

      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      const pad = (n: number) => String(n).padStart(2, '0');
      setSelectedScheduleTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);

      const savedReviewer = localStorage.getItem('outreach_current_reviewer');
      if (savedReviewer) {
        setCurrentReviewer(savedReviewer);
      } else {
        setCurrentReviewer('Jasser Ben Jomaa');
        localStorage.setItem('outreach_current_reviewer', 'Jasser Ben Jomaa');
      }

      const savedDirectives = localStorage.getItem('outreach_global_directives');
      if (savedDirectives) setGlobalDirectives(savedDirectives);

      const savedEvent = localStorage.getItem('outreach_event_details');
      if (savedEvent) {
        try {
          const parsed = JSON.parse(savedEvent);
          if (!parsed.eventName || parsed.eventName.includes('Forum National') || parsed.organizerEmail !== 'orbyx.ensiclub@ensi-uma.tn' || parsed.organizerPhone !== '58745567') {
            const updated = {
              ...(parsed.eventName?.includes('Forum National') ? defaultEventDetails : parsed),
              organizerEmail: 'orbyx.ensiclub@ensi-uma.tn',
              organizerPhone: '58745567',
            };
            setEventDetails(updated);
            localStorage.setItem('outreach_event_details', JSON.stringify(updated));
          } else {
            setEventDetails(parsed);
          }
        } catch {
          setEventDetails(defaultEventDetails);
        }
      } else {
        setEventDetails(defaultEventDetails);
      }

      const savedLeads = localStorage.getItem('outreach_cached_leads');
      if (savedLeads) {
        try {
          const parsed = JSON.parse(savedLeads);
          const hasEnsi = parsed.some((l: any) => l.category === 'ensi');
          const hasFoodInFormation = parsed.some(
            (l: any) => l.category === 'formation' && (l.name?.toLowerCase().includes('chahia') || l.name?.toLowerCase().includes('elmazraa'))
          );
          const hasValidFormation = parsed.some(
            (l: any) => l.category === 'formation' && (l.name?.toLowerCase().includes('inset') || l.name?.toLowerCase().includes('inp') || l.name?.toLowerCase().includes('gomycode'))
          );

          if (Array.isArray(parsed) && parsed.length > 0 && hasEnsi && !hasFoodInFormation && hasValidFormation) {
            setLeads(parsed.map((l: CompanyLead) => ({
              ...l,
              generatedBody: stripTrailingTextSig(l.generatedBody),
            })));
            return;
          } else {
            localStorage.removeItem('outreach_cached_leads');
          }
        } catch {}
      }

      loadSheetData(savedSheet || DEFAULT_SHEET_URL);
    }
  }, []);

  // Sync leads to localStorage
  useEffect(() => {
    if (leads.length > 0) {
      localStorage.setItem('outreach_cached_leads', JSON.stringify(leads));
    }
  }, [leads]);

  // Automated background scheduler ticker (runs every 10 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      const scheduledLeads = leads.filter(
        (l) => l.status === 'scheduled' && l.scheduledTime && new Date(l.scheduledTime) <= now
      );

      for (const lead of scheduledLeads) {
        try {
          const res = await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: lead.email,
              subject: lead.generatedSubject,
              emailBody: lead.generatedBody,
              senderName: eventDetails.organizerName,
              senderEmail: eventDetails.organizerEmail,
              smtpPass,
            }),
          });
          if (res.ok) {
            setLeads((prev) =>
              prev.map((item) =>
                item.id === lead.id
                  ? {
                      ...item,
                      status: 'sent',
                      sentAt: new Date().toISOString(),
                      scheduledTime: undefined,
                    }
                  : item
              )
            );
            showToast('E-mail programmé envoyé', `Envoyé avec succès à ${lead.name} (${lead.email})`, 'success');
          }
        } catch (e: any) {
          console.error(`Error sending scheduled email to ${lead.name}:`, e);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [leads, eventDetails, smtpPass]);

  const showToast = (title: string, desc: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadSheetData = async (urlToFetch: string) => {
    setLoadingSheet(true);
    setSheetError(null);
    try {
      const res = await fetch('/api/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToFetch }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la lecture du Google Sheet');
      }

      setLeads((prev) => {
        if (prev.length === 0) return data.leads;
        const map = new Map<string, CompanyLead>(
          prev.map((p) => [`${p.category}:${p.name.toLowerCase().trim()}`, p])
        );
        return data.leads.map((newLead: CompanyLead) => {
          const key = `${newLead.category}:${newLead.name.toLowerCase().trim()}`;
          const existing = map.get(key);
          if (existing && existing.generatedSubject) {
            return {
              ...newLead,
              generatedSubject: existing.generatedSubject,
              generatedBody: stripTrailingTextSig(existing.generatedBody),
              status: existing.status,
              approvals: existing.approvals,
              scheduledTime: existing.scheduledTime,
              sentAt: existing.sentAt,
              chatHistory: existing.chatHistory,
            };
          }
          return newLead;
        });
      });

      showToast(
        'Données Google Sheet synchronisées',
        `${data.leads.length} contacts chargés à travers les 4 catégories.`,
        'success'
      );
    } catch (err: any) {
      setSheetError(err.message);
      showToast('Erreur Google Sheet', err.message, 'warn');
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleSaveApiKey = (key: string, newSmtpPass?: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    if (newSmtpPass !== undefined) {
      setSmtpPass(newSmtpPass);
      localStorage.setItem('outreach_smtp_pass', newSmtpPass);
    }
    showToast('Identifiants enregistrés', 'Clé Gemini et mot de passe SMTP mis à jour.', 'success');
  };

  const handleSaveEventDetails = (newDetails: EventDetails) => {
    setEventDetails(newDetails);
    localStorage.setItem('outreach_event_details', JSON.stringify(newDetails));
    showToast('Événement mis à jour', `Paramètres pour "${newDetails.eventName}" enregistrés.`, 'success');
  };

  const handleSaveReviewer = (name: string) => {
    setCurrentReviewer(name);
    localStorage.setItem('outreach_current_reviewer', name);
    showToast('Identité confirmée', `Examinateur actif : ${name}`, 'success');
  };

  const handleSaveDirectives = (newDirectives: string) => {
    setGlobalDirectives(newDirectives);
    localStorage.setItem('outreach_global_directives', newDirectives);
    showToast('Directives enregistrées', 'Gemini prendra en compte ces consignes dans toutes les rédactions.', 'success');
  };

  const handleSaveSheetUrl = (newUrl: string) => {
    setSheetUrl(newUrl);
    localStorage.setItem('outreach_sheet_url', newUrl);
    loadSheetData(newUrl);
  };

  // Generate Email for single lead using ORBYX ML Challenge 2.0 template
  const handleGenerateEmail = async (lead: CompanyLead) => {
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      showToast('Clé API requise', 'Veuillez saisir votre clé API Gemini pour générer.', 'warn');
      return;
    }

    setGeneratingId(lead.id);
    setLeads((prev) =>
      prev.map((item) => (item.id === lead.id ? { ...item, status: 'generating' } : item))
    );

    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          lead,
          event: eventDetails,
          globalDirectives,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la génération');

      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id
            ? {
                ...item,
                generatedSubject: data.subject,
                generatedBody: data.body,
                status: 'draft',
              }
            : item
        )
      );

      if (selectedLead?.id === lead.id) {
        setSelectedLead((prev) =>
          prev
            ? {
                ...prev,
                generatedSubject: data.subject,
                generatedBody: data.body,
                status: 'draft',
              }
            : null
        );
      }
    } catch (err: any) {
      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id ? { ...item, status: 'failed', error: err.message } : item
        )
      );
      showToast('Erreur IA', `Échec pour ${lead.name}: ${err.message}`, 'warn');
    } finally {
      setGeneratingId(null);
    }
  };

  // Batch generate emails for active category
  const handleBatchGenerate = async () => {
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      showToast('Clé API requise', 'Veuillez configurer votre clé Gemini.', 'warn');
      return;
    }

    const pending = leads.filter(
      (l) => l.category === selectedCategory && (!l.generatedSubject || l.status === 'idle') && l.email
    );

    if (pending.length === 0) {
      showToast('Aucun e-mail en attente', 'Toutes les entreprises de cette catégorie ont déjà un brouillon généré.', 'info');
      return;
    }

    setBatchGenerating(true);
    setBatchProgress({ current: 0, total: pending.length });

    let count = 0;
    for (const lead of pending) {
      try {
        const res = await fetch('/api/gemini/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey,
            lead,
            event: eventDetails,
            globalDirectives,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setLeads((prev) =>
            prev.map((item) =>
              item.id === lead.id
                ? {
                    ...item,
                    generatedSubject: data.subject,
                    generatedBody: data.body,
                    status: 'draft',
                  }
                : item
            )
          );
        }
      } catch (err) {
        console.error(`Batch error for ${lead.name}:`, err);
      }
      count++;
      setBatchProgress({ current: count, total: pending.length });
      await new Promise((r) => setTimeout(r, 600));
    }

    setBatchGenerating(false);
    showToast('Génération terminée', `${count} e-mails ont été rédigés sur le modèle ORBYX ML Challenge 2.0.`, 'success');
  };

  // 1-Person Approval Rule: Accept or revoke approval
  const handleAcceptLead = (lead: CompanyLead) => {
    if (!currentReviewer) {
      setIsReviewerModalOpen(true);
      showToast('Nom requis', 'Veuillez saisir votre nom pour valider.', 'warn');
      return;
    }

    const reviewer = currentReviewer.trim();
    const isAlreadyAccepted = lead.status === 'accepted' || (lead.approvals && lead.approvals.length > 0);

    let updatedApprovals: ApprovalRecord[] = [];
    if (!isAlreadyAccepted) {
      updatedApprovals = [
        {
          reviewerName: reviewer,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        },
      ];
    }

    const isFullyApproved = updatedApprovals.length >= 1;
    const newStatus = isFullyApproved ? 'accepted' : 'draft';

    const updatedLead: CompanyLead = {
      ...lead,
      approvals: updatedApprovals,
      status: newStatus,
    };

    setLeads((prev) => prev.map((item) => (item.id === lead.id ? updatedLead : item)));
    if (selectedLead?.id === lead.id) {
      setSelectedLead(updatedLead);
    }

    if (isFullyApproved) {
      showToast(
        'Validation validée (1/1)',
        `${lead.name} a été validé par ${reviewer}. Prêt pour l'envoi immédiat ou programmé.`,
        'success'
      );
    } else {
      showToast('Validation annulée', `La validation pour ${lead.name} a été retirée.`, 'info');
    }
  };

  // Refuse single lead
  const handleRefuseLead = (lead: CompanyLead) => {
    if (!currentReviewer) {
      setIsReviewerModalOpen(true);
      showToast('Nom requis', 'Veuillez saisir votre nom pour enregistrer le refus.', 'warn');
      return;
    }

    const reviewer = currentReviewer.trim();
    const updatedLead: CompanyLead = {
      ...lead,
      status: 'refused',
      refusedBy: {
        reviewerName: reviewer,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      },
    };

    setLeads((prev) => prev.map((item) => (item.id === lead.id ? updatedLead : item)));
    if (selectedLead?.id === lead.id) {
      setSelectedLead(updatedLead);
    }
    showToast('E-mail refusé', `Refusé par ${reviewer}.`, 'warn');
  };

  // Accept all drafts in current category view (1 approval is enough)
  const handleAcceptAll = () => {
    if (!currentReviewer) {
      setIsReviewerModalOpen(true);
      showToast('Nom requis', 'Veuillez définir votre nom avant de valider en masse.', 'warn');
      return;
    }

    const reviewer = currentReviewer.trim();
    const affected = filteredLeads.filter(
      (l) => l.status === 'draft' || l.status === 'pending_approval' || (!!l.generatedSubject && l.status !== 'accepted')
    );

    if (affected.length === 0) {
      showToast('Rien à valider', "Générez d'abord des e-mails avant de pouvoir les valider.", 'info');
      return;
    }

    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    setLeads((prev) =>
      prev.map((item) => {
        if (
          item.category === selectedCategory &&
          (item.status === 'draft' || item.status === 'pending_approval' || (!!item.generatedSubject && item.status !== 'accepted'))
        ) {
          return {
            ...item,
            approvals: [{ reviewerName: reviewer, timestamp }],
            status: 'accepted',
          };
        }
        return item;
      })
    );

    showToast(
      'Validation en masse réussie',
      `${affected.length} e-mails validés par ${reviewer} (1/1 approbation). Prêts pour l'expédition !`,
      'success'
    );
  };

  // Schedule all accepted leads starting from the user-selected time
  const handleScheduleAllAccepted = () => {
    const acceptedLeads = filteredLeads.filter((l) => l.status === 'accepted' && l.email);
    if (acceptedLeads.length === 0) {
      showToast('Aucun e-mail validé', "Veuillez d'abord valider (ou cliquer sur TOUT ACCEPTER) les e-mails à programmer.", 'info');
      return;
    }

    const startTime = selectedScheduleTime ? new Date(selectedScheduleTime) : new Date();
    if (isNaN(startTime.getTime())) {
      showToast('Date invalide', "Veuillez choisir une date et heure d'envoi valides.", 'warn');
      return;
    }

    let offsetMinutes = 0;
    const scheduledMap = new Map<string, string>();
    for (const lead of acceptedLeads) {
      const scheduledDate = new Date(startTime.getTime() + offsetMinutes * 60000);
      scheduledMap.set(lead.id, scheduledDate.toISOString());
      offsetMinutes += 2;
    }

    setLeads((prev) =>
      prev.map((item) => {
        if (scheduledMap.has(item.id)) {
          return {
            ...item,
            status: 'scheduled',
            scheduledTime: scheduledMap.get(item.id),
          };
        }
        return item;
      })
    );

    showToast(
      'Programmation en masse réussie',
      `${acceptedLeads.length} e-mails programmés à partir du ${startTime.toLocaleString('fr-FR')} (intervalle de 2 min).`,
      'success'
    );
  };

  // SEND ALL BUTTON: Send all accepted leads immediately via Gmail SMTP
  const handleSendAll = async () => {
    let readyLeads = filteredLeads.filter(
      (l) => l.status === 'accepted' && l.email && l.generatedSubject && l.generatedBody
    );

    if (readyLeads.length === 0) {
      // Check if there are generated drafts that just need approval
      const drafts = filteredLeads.filter((l) => (l.status === 'draft' || !!l.generatedSubject) && l.email);
      if (drafts.length > 0) {
        const confirmAccept = window.confirm(
          `Il y a ${drafts.length} brouillons générés non validés. Voulez-vous les valider (1 approbation) et les expédier immédiatement ?`
        );
        if (confirmAccept) {
          const reviewer = currentReviewer?.trim() || 'Jasser Ben Jomaa';
          const nowStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          readyLeads = drafts.map((d) => ({
            ...d,
            status: 'accepted' as const,
            approvals: [{ reviewerName: reviewer, timestamp: nowStr }],
          }));
          setLeads((prev) => {
            const map = new Map(readyLeads.map((r) => [r.id, r]));
            return prev.map((item) => map.get(item.id) || item);
          });
        } else {
          return;
        }
      } else {
        showToast('Aucun e-mail à envoyer', "Générez d'abord des e-mails avec Gemini pour cette catégorie.", 'info');
        return;
      }
    }

    const confirmSend = window.confirm(
      `Confirmez-vous l'expédition immédiate de ${readyLeads.length} e-mails via votre compte Gmail (${eventDetails.organizerEmail}) ?`
    );
    if (!confirmSend) return;

    setBatchSending(true);
    setBatchSendProgress({ current: 0, total: readyLeads.length });

    let sentCount = 0;
    for (let i = 0; i < readyLeads.length; i++) {
      const lead = readyLeads[i];
      try {
        const res = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: lead.email,
            subject: lead.generatedSubject,
            emailBody: lead.generatedBody,
            senderName: eventDetails.organizerName,
            senderEmail: eventDetails.organizerEmail,
            smtpPass,
          }),
        });

        if (res.ok) {
          sentCount++;
          setLeads((prev) =>
            prev.map((item) =>
              item.id === lead.id
                ? {
                    ...item,
                    status: 'sent',
                    sentAt: new Date().toISOString(),
                    scheduledTime: undefined,
                  }
                : item
            )
          );
        } else {
          const errData = await res.json().catch(() => ({}));
          console.error(`Error sending to ${lead.name}:`, errData);
        }
      } catch (err) {
        console.error(`Batch send error for ${lead.name}:`, err);
      }

      setBatchSendProgress({ current: i + 1, total: readyLeads.length });
      if (i < readyLeads.length - 1) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }

    setBatchSending(false);
    showToast(
      'Envoi groupé terminé',
      `${sentCount} sur ${readyLeads.length} e-mails expédiés avec succès via Gmail SMTP.`,
      'success'
    );
  };

  // Send single lead now
  const handleSendNow = async (lead: CompanyLead) => {
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.email,
          subject: lead.generatedSubject,
          emailBody: lead.generatedBody,
          senderName: eventDetails.organizerName,
          senderEmail: eventDetails.organizerEmail,
          smtpPass,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi");

      const updated: CompanyLead = {
        ...lead,
        status: 'sent',
        sentAt: data.sentAt || new Date().toISOString(),
      };

      setLeads((prev) => prev.map((item) => (item.id === lead.id ? updated : item)));
      setSelectedLead(updated);
      showToast('E-mail envoyé', `E-mail transmis avec succès à ${lead.email}.`, 'success');
    } catch (e: any) {
      showToast("Erreur d'envoi", e.message, 'warn');
    }
  };

  // Schedule send for individual lead
  const handleScheduleSend = async (lead: CompanyLead, scheduledTime: string) => {
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.email,
          subject: lead.generatedSubject,
          emailBody: lead.generatedBody,
          senderName: eventDetails.organizerName,
          senderEmail: eventDetails.organizerEmail,
          scheduledTime,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de programmation');

      const updated: CompanyLead = {
        ...lead,
        status: 'scheduled',
        scheduledTime,
      };

      setLeads((prev) => prev.map((item) => (item.id === lead.id ? updated : item)));
      setSelectedLead(updated);
      showToast(
        'Envoi programmé',
        `L'e-mail pour ${lead.name} sera envoyé le ${new Date(scheduledTime).toLocaleString('fr-FR')}.`,
        'success'
      );
    } catch (e: any) {
      showToast('Erreur de programmation', e.message, 'warn');
    }
  };

  // Filtered leads calculation
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (lead.category !== selectedCategory) return false;

      if (statusFilter !== 'all') {
        if (statusFilter === 'idle' && lead.status !== 'idle') return false;
        if (statusFilter === 'draft' && lead.status !== 'draft') return false;
        if (statusFilter === 'accepted' && lead.status !== 'accepted') return false;
        if (statusFilter === 'refused' && lead.status !== 'refused') return false;
        if (statusFilter === 'scheduled' && lead.status !== 'scheduled') return false;
        if (statusFilter === 'sent' && lead.status !== 'sent') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(q);
        const matchesEmail = lead.email?.toLowerCase().includes(q);
        const matchesAddress = lead.address?.toLowerCase().includes(q);
        const matchesContact = lead.contactPerson?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesAddress && !matchesContact) {
          return false;
        }
      }

      return true;
    });
  }, [leads, selectedCategory, statusFilter, searchQuery]);

  // Counts per category
  const categoryCounts = useMemo(() => {
    return {
      ensi: leads.filter((l) => l.category === 'ensi').length,
      sponsorship: leads.filter((l) => l.category === 'sponsorship').length,
      formation: leads.filter((l) => l.category === 'formation').length,
      food: leads.filter((l) => l.category === 'food').length,
    };
  }, [leads]);

  // Accepted count in current category
  const acceptedCount = useMemo(() => {
    return leads.filter((l) => l.category === selectedCategory && l.status === 'accepted' && l.email).length;
  }, [leads, selectedCategory]);

  return (
    <div className="min-h-screen bg-[var(--ground)] text-[var(--ink)] flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md p-4 bg-[var(--white)] border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] flex items-start gap-3 animate-in fade-in duration-150">
          <div
            className={`p-1.5 border-2 border-[var(--ink)] shrink-0 ${
              toastMessage.type === 'success'
                ? 'bg-[var(--yellow)] text-[var(--ink)]'
                : toastMessage.type === 'warn'
                ? 'bg-red-400 text-[var(--ink)]'
                : 'bg-[var(--blue)] text-[var(--white)]'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 stroke-[3]" />
            ) : toastMessage.type === 'warn' ? (
              <AlertTriangle className="w-4 h-4 stroke-[3]" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-mono font-black text-[var(--ink)] uppercase tracking-wide">
              {toastMessage.title}
            </h4>
            <p className="text-xs font-mono text-[var(--ink)]/80 mt-0.5 leading-relaxed">{toastMessage.desc}</p>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        sheetUrl={sheetUrl}
        onReloadSheet={() => loadSheetData(sheetUrl)}
        loadingSheet={loadingSheet}
        hasApiKey={!!apiKey}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenEventModal={() => setIsEventModalOpen(true)}
        onOpenSheetModal={() => setIsSheetModalOpen(true)}
        hasDirectives={!!globalDirectives}
        onOpenDirectivesModal={() => setIsDirectivesModalOpen(true)}
        currentReviewer={currentReviewer}
        onOpenReviewerModal={() => setIsReviewerModalOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-8 py-6 space-y-5">
        {/* Banner Alert when API key is missing */}
        {!apiKey && (
          <div className="p-4 bg-[var(--yellow)] text-[var(--ink)] border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--ink)] text-[var(--yellow)]">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight">CLÉ API GEMINI NON CONFIGURÉE</h3>
                <p className="text-xs font-mono text-[var(--ink)]/90 uppercase font-semibold">
                  Pour générer les e-mails de sponsoring du ML Challenge 2.0 et dialoguer avec le copilote IA, veuillez connecter votre clé API Gemini.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="btn-transit ink !py-2 !px-4 !text-xs !font-black whitespace-nowrap"
            >
              AJOUTER MA CLÉ API
            </button>
          </div>
        )}

        {/* Global Statistics Bar */}
        <StatsBar leads={leads} />

        {/* Categories, Filters, Search, Scheduling & Send All */}
        <CategoryTabs
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            setStatusFilter('all');
          }}
          statusFilter={statusFilter}
          onSelectStatusFilter={setStatusFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          counts={categoryCounts}
          onAcceptAll={handleAcceptAll}
          onScheduleAllAccepted={handleScheduleAllAccepted}
          onBatchGenerate={handleBatchGenerate}
          batchGenerating={batchGenerating}
          batchProgress={batchProgress}
          selectedScheduleTime={selectedScheduleTime}
          onScheduleTimeChange={setSelectedScheduleTime}
          onSendAll={handleSendAll}
          batchSending={batchSending}
          batchSendProgress={batchSendProgress}
          acceptedCount={acceptedCount}
        />

        {/* Leads Table */}
        <LeadsTable
          leads={filteredLeads}
          onOpenInspector={(lead) => {
            setSelectedLead(lead);
            setIsInspectorOpen(true);
          }}
          onGenerateEmail={handleGenerateEmail}
          onAccept={handleAcceptLead}
          onRefuse={handleRefuseLead}
          generatingId={generatingId}
          currentReviewer={currentReviewer}
        />
      </main>

      {/* Inspector & Gemini Chat Modal */}
      <EmailInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        lead={selectedLead}
        event={eventDetails}
        apiKey={apiKey}
        currentReviewer={currentReviewer}
        globalDirectives={globalDirectives}
        onOpenReviewerModal={() => setIsReviewerModalOpen(true)}
        onUpdateLead={(updated) => {
          setSelectedLead(updated);
          setLeads((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        }}
        onSendNow={handleSendNow}
        onScheduleSend={handleScheduleSend}
        onAccept={handleAcceptLead}
        onRefuse={handleRefuseLead}
      />

      {/* Global Directives Modal */}
      <GlobalDirectivesModal
        isOpen={isDirectivesModalOpen}
        onClose={() => setIsDirectivesModalOpen(false)}
        directives={globalDirectives}
        onSave={handleSaveDirectives}
      />

      {/* Reviewer Identity Modal */}
      <ReviewerModal
        isOpen={isReviewerModalOpen}
        onClose={() => setIsReviewerModalOpen(false)}
        currentReviewer={currentReviewer}
        onSave={handleSaveReviewer}
      />

      {/* API Key & SMTP Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        smtpPass={smtpPass}
        onSave={handleSaveApiKey}
      />

      {/* Event Details Modal */}
      <EventDetailsModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        event={eventDetails}
        onSave={handleSaveEventDetails}
      />

      {/* Sheet URL Modal */}
      <SheetModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        currentUrl={sheetUrl}
        onSave={handleSaveSheetUrl}
      />
    </div>
  );
}
