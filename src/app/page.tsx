'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import GlobalAttachmentsModal from '@/components/outreach/GlobalAttachmentsModal';
import ShareSessionModal, { decodeSessionState } from '@/components/outreach/ShareSessionModal';
import EmailCheckerDashboard from '@/components/outreach/EmailCheckerDashboard';
import { CompanyLead, CategoryKey, ApprovalRecord } from '@/lib/sheets';
import type { StoredAttachment } from '@/lib/email-attachments';
import { EventDetails, defaultEventDetails } from '@/lib/gemini';
import { Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';
import type { GeminiKeyItem } from '@/app/api/gemini/keys/route';

const DEFAULT_KEYS_POOL: GeminiKeyItem[] = [];

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
  const [activeMainTab, setActiveMainTab] = useState<'outreach' | 'tracker'>('outreach');

  // Modals
  const [selectedLead, setSelectedLead] = useState<CompanyLead | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isReviewerModalOpen, setIsReviewerModalOpen] = useState(false);
  const [isDirectivesModalOpen, setIsDirectivesModalOpen] = useState(false);
  const [isAttachmentsModalOpen, setIsAttachmentsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [globalAttachments, setGlobalAttachments] = useState<StoredAttachment[]>([]);

  // Settings
  const [apiKey, setApiKey] = useState('');
  const [apiKeysPool, setApiKeysPool] = useState<GeminiKeyItem[]>(DEFAULT_KEYS_POOL);
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

      // Load and sync Multi-Key Gemini Pool
      try {
        const savedPoolStr = localStorage.getItem('gemini_api_keys_pool');
        if (savedPoolStr) {
          const parsed = JSON.parse(savedPoolStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const map = new Map<string, GeminiKeyItem>();
            DEFAULT_KEYS_POOL.forEach((k) => map.set(k.id, k));
            parsed.forEach((k: GeminiKeyItem) => map.set(k.id, k));
            setApiKeysPool(Array.from(map.values()));
          }
        }
      } catch {}

      fetch('/api/gemini/keys')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data.keys) && data.keys.length > 0) {
            setApiKeysPool((prev) => {
              const map = new Map(prev.map((k) => [k.id, k]));
              data.keys.forEach((sk: GeminiKeyItem) => {
                if (!map.has(sk.id)) map.set(sk.id, sk);
              });
              const merged = Array.from(map.values());
              localStorage.setItem('gemini_api_keys_pool', JSON.stringify(merged));
              return merged;
            });
          }
        })
        .catch(() => {});

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

      // Load latest directives from JSON file
      fetch('/api/directives')
        .then((res) => res.json())
        .then((data) => {
          if (data?.combinedText !== undefined) {
            setGlobalDirectives(data.combinedText);
            localStorage.setItem('outreach_global_directives', data.combinedText);
          }
        })
        .catch((err) => console.error('Failed to load directives from JSON:', err));

      // Load global attachments from backend
      fetch('/api/attachments')
        .then((res) => res.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : data?.attachments;
          if (Array.isArray(list)) {
            setGlobalAttachments(list);
          }
        })
        .catch((err) => console.error('Failed to load global attachments:', err));

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

      // Check if URL contains a shared session snapshot (#session=...)
      let sharedSnapshot: any[] | null = null;
      if (typeof window !== 'undefined' && window.location.hash.includes('session=')) {
        try {
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const rawSession = params.get('session');
          if (rawSession) {
            const decoded = decodeSessionState(rawSession);
            if (Array.isArray(decoded) && decoded.length > 0) {
              sharedSnapshot = decoded;
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
              showToast(
                'Session synchronisée !',
                `${decoded.length} e-mails générés / statuts importés depuis le lien partagé.`,
                'success'
              );
            }
          }
        } catch (e) {
          console.error('Error decoding hash session:', e);
        }
      }

      // Fast optimistic initial load from localStorage if available
      const savedLeads = localStorage.getItem('outreach_cached_leads');
      if (savedLeads || sharedSnapshot) {
        try {
          let parsed: CompanyLead[] = savedLeads ? JSON.parse(savedLeads) : [];
          if (sharedSnapshot && Array.isArray(sharedSnapshot)) {
            const snapMap = new Map<string, any>();
            for (const item of sharedSnapshot) {
              if (item.id) snapMap.set(item.id, item);
              if (item.name && item.cat) snapMap.set(`${item.cat}:${item.name.toLowerCase().trim()}`, item);
            }

            parsed = parsed.map((l) => {
              const key = `${l.category}:${l.name.toLowerCase().trim()}`;
              const match = snapMap.get(l.id) || snapMap.get(key);
              if (match) {
                return {
                  ...l,
                  generatedSubject: match.sub || match.generatedSubject || l.generatedSubject,
                  generatedBody: stripTrailingTextSig(match.bod || match.generatedBody || l.generatedBody),
                  status: match.st || match.status || l.status,
                  approvals: match.app || match.approvals || l.approvals,
                  refusedBy: match.ref || match.refusedBy || l.refusedBy,
                  scheduledTime: match.sch || match.scheduledTime || l.scheduledTime,
                  sentAt: match.snt || match.sentAt || l.sentAt,
                  customAttachments: match.att || match.customAttachments || l.customAttachments,
                  excludeGlobalAttachments: match.ex ?? match.excludeGlobalAttachments ?? l.excludeGlobalAttachments,
                  chatHistory: match.chat || match.chatHistory || l.chatHistory || [],
                };
              }
              return l;
            });
          }

          if (Array.isArray(parsed) && parsed.length > 0) {
            const clean = parsed.map((l: CompanyLead) => ({
              ...l,
              generatedBody: stripTrailingTextSig(l.generatedBody),
            }));
            setLeads(clean);
            localStorage.setItem('outreach_cached_leads', JSON.stringify(clean));
          }
        } catch {}
      }

      // Authoritative load from server JSON database (shared across all browsers/sessions)
      loadSavedLeadsFromBackend(savedSheet || DEFAULT_SHEET_URL);
    }
  }, []);

  // Sync leads to localStorage and backend JSON storage (src/data/leads.json)
  useEffect(() => {
    if (leads.length > 0) {
      localStorage.setItem('outreach_cached_leads', JSON.stringify(leads));

      // Debounced sync to /api/leads to update src/data/leads.json and src/data/generated_emails.json
      const timer = setTimeout(() => {
        fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leads }),
        }).catch((err) => console.error('Failed to sync leads to JSON storage:', err));
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [leads]);

  // Load authoritative saved leads & emails directly from backend
  const loadSavedLeadsFromBackend = async (sheetFallbackUrl: string) => {
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.leads) && data.leads.length > 0) {
          setLeads((currentLeads) => {
            // Find existing local leads in state or localStorage to NEVER overwrite generated data
            const cachedStr = typeof window !== 'undefined' ? localStorage.getItem('outreach_cached_leads') : null;
            let localList = currentLeads;
            if ((!localList || localList.length === 0) && cachedStr) {
              try {
                localList = JSON.parse(cachedStr);
              } catch {}
            }

            const localMap = new Map<string, CompanyLead>();
            for (const l of (localList || [])) {
              if (l.id) localMap.set(l.id, l);
              localMap.set(`${l.category}:${l.name.toLowerCase().trim()}`, l);
              if (l.email) localMap.set(l.email.toLowerCase().trim(), l);
            }

            const merged = data.leads.map((incoming: CompanyLead) => {
              const key = `${incoming.category}:${incoming.name.toLowerCase().trim()}`;
              const emailKey = incoming.email ? incoming.email.toLowerCase().trim() : '';
              const local = localMap.get(incoming.id) || localMap.get(key) || (emailKey ? localMap.get(emailKey) : undefined);

              if (local) {
                const effectiveSubject = local.generatedSubject || incoming.generatedSubject;
                const effectiveBody = stripTrailingTextSig(local.generatedBody || incoming.generatedBody);
                const effectiveStatus = (local.status && local.status !== 'idle') ? local.status : (incoming.status || 'idle');

                return {
                  ...incoming,
                  generatedSubject: effectiveSubject,
                  generatedBody: effectiveBody,
                  status: effectiveStatus,
                  approvals: (local.approvals && local.approvals.length > 0) ? local.approvals : incoming.approvals,
                  refusedBy: local.refusedBy || incoming.refusedBy,
                  scheduledTime: local.scheduledTime || incoming.scheduledTime,
                  sentAt: local.sentAt || incoming.sentAt,
                  customAttachments: (local.customAttachments && local.customAttachments.length > 0) ? local.customAttachments : incoming.customAttachments,
                  excludeGlobalAttachments: local.excludeGlobalAttachments ?? incoming.excludeGlobalAttachments,
                  chatHistory: (local.chatHistory && local.chatHistory.length > 0) ? local.chatHistory : (incoming.chatHistory || []),
                };
              }
              return incoming;
            });

            if (typeof window !== 'undefined') {
              localStorage.setItem('outreach_cached_leads', JSON.stringify(merged));
            }
            return merged;
          });
          return;
        }
      }
    } catch (err) {
      console.warn('Could not load saved leads from backend storage:', err);
    }

    // Only if backend has no saved leads at all, seed from Google Sheet
    loadSheetData(sheetFallbackUrl);
  };

  const inFlightSendingRef = useRef<Set<string>>(new Set());

  // Automated background scheduler ticker (runs every 5 seconds)
  // Dispatches all due scheduled emails in parallel at the same time
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      const dueLeads = leads.filter(
        (l) =>
          l.status === 'scheduled' &&
          l.scheduledTime &&
          new Date(l.scheduledTime) <= now &&
          l.email &&
          l.generatedSubject &&
          l.generatedBody &&
          !inFlightSendingRef.current.has(l.id)
      );

      if (dueLeads.length === 0) return;

      // Mark all due leads as in-flight to prevent duplicate execution
      dueLeads.forEach((l) => inFlightSendingRef.current.add(l.id));

      showToast(
        'Envoi programmé en simultané',
        `Expédition en parallèle de ${dueLeads.length} e-mail(s) arrivés à échéance...`,
        'info'
      );

      let sentCount = 0;
      await Promise.all(
        dueLeads.map(async (lead) => {
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
                customAttachments: lead.customAttachments,
                excludeGlobal: lead.excludeGlobalAttachments,
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
              console.error(`Error sending scheduled email to ${lead.name}`);
            }
          } catch (e: any) {
            console.error(`Error sending scheduled email to ${lead.name}:`, e);
          } finally {
            inFlightSendingRef.current.delete(lead.id);
          }
        })
      );

      if (sentCount > 0) {
        showToast(
          'Envoi programmé réussi',
          `${sentCount} e-mail(s) expédié(s) en parallèle en même temps avec succès.`,
          'success'
        );
      }
    }, 5000);

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

      // Fetch existing leads and generated emails from backend JSON storage
      let savedJsonLeads: CompanyLead[] = [];
      let savedGenerated: any[] = [];
      try {
        const jsonRes = await fetch('/api/leads');
        if (jsonRes.ok) {
          const jsonData = await jsonRes.json();
          if (Array.isArray(jsonData.leads)) savedJsonLeads = jsonData.leads;
          if (Array.isArray(jsonData.generated)) savedGenerated = jsonData.generated;
        }
      } catch {}

      setLeads((prev) => {
        const pool = prev.length > 0 ? prev : savedJsonLeads;

        // Build lookup maps from existing leads and from generated emails
        const existingMap = new Map<string, CompanyLead>();
        for (const l of pool) {
          if (l.id) existingMap.set(l.id, l);
          existingMap.set(`${l.category}:${l.name.toLowerCase().trim()}`, l);
          if (l.email) existingMap.set(l.email.toLowerCase().trim(), l);
        }

        const genMap = new Map<string, any>();
        for (const g of savedGenerated) {
          if (g.leadId) genMap.set(g.leadId, g);
          genMap.set(`${g.category}:${g.companyName.toLowerCase().trim()}`, g);
          if (g.to) genMap.set(g.to.toLowerCase().trim(), g);
        }

        const sheetKeys = new Set<string>();

        const mergedLeads = data.leads.map((newLead: CompanyLead) => {
          const key = `${newLead.category}:${newLead.name.toLowerCase().trim()}`;
          sheetKeys.add(key);
          sheetKeys.add(newLead.id);
          if (newLead.email) sheetKeys.add(newLead.email.toLowerCase().trim());

          const existing = existingMap.get(key) || (newLead.email ? existingMap.get(newLead.email.toLowerCase().trim()) : undefined);
          const gen = genMap.get(key) || (newLead.email ? genMap.get(newLead.email.toLowerCase().trim()) : undefined);

          if (existing || gen) {
            return {
              ...newLead,
              generatedSubject: existing?.generatedSubject || gen?.subject,
              generatedBody: stripTrailingTextSig(existing?.generatedBody || gen?.body),
              status: existing?.status || gen?.status || 'draft',
              approvals: existing?.approvals,
              refusedBy: existing?.refusedBy,
              scheduledTime: existing?.scheduledTime,
              sentAt: existing?.sentAt,
              customAttachments: existing?.customAttachments,
              excludeGlobalAttachments: existing?.excludeGlobalAttachments,
              chatHistory: existing?.chatHistory || [],
            };
          }
          return newLead;
        });

        // Retain custom leads that exist in pool but not in sheet (like manual test leads)
        for (const p of pool) {
          const pKey = `${p.category}:${p.name.toLowerCase().trim()}`;
          if (!sheetKeys.has(pKey) && !sheetKeys.has(p.id)) {
            mergedLeads.push(p);
          }
        }

        return mergedLeads;
      });

      showToast(
        'Données Google Sheet synchronisées',
        `${data.leads.length} contacts chargés et e-mails générés préservés.`,
        'success'
      );
    } catch (err: any) {
      setSheetError(err.message);
      showToast('Erreur Google Sheet', err.message, 'warn');
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleSaveApiKey = (key: string, newSmtpPass?: string, updatedPool?: GeminiKeyItem[]) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    if (newSmtpPass !== undefined) {
      setSmtpPass(newSmtpPass);
      localStorage.setItem('outreach_smtp_pass', newSmtpPass);
    }
    if (updatedPool) {
      setApiKeysPool(updatedPool);
      localStorage.setItem('gemini_api_keys_pool', JSON.stringify(updatedPool));
      const activeCount = updatedPool.filter((k) => k.enabled && k.key.trim().length > 0).length;
      showToast(
        'Pool Gemini & SMTP mis à jour',
        `${activeCount} workers parallèles configurés pour la génération simultanée.`,
        'success'
      );
    } else {
      showToast('Identifiants enregistrés', 'Clé Gemini et mot de passe SMTP mis à jour.', 'success');
    }
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
    showToast('Directives enregistrées', 'Consignes sauvegardées dans le fichier JSON et prises en compte par Gemini.', 'success');
  };

  const handleSaveGlobalAttachments = async (attachments: StoredAttachment[]) => {
    try {
      const res = await fetch('/api/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attachments),
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.attachments;
        setGlobalAttachments(Array.isArray(list) ? list : attachments);
      }
    } catch (err) {
      console.error('Failed to save global attachments:', err);
    }
  };

  const handleResetDefaultAttachments = async () => {
    try {
      const res = await fetch('/api/attachments', { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.attachments;
        if (Array.isArray(list)) {
          setGlobalAttachments(list);
        }
      }
    } catch (err) {
      console.error('Failed to reset attachments:', err);
    }
  };

  const handleSaveSheetUrl = (newUrl: string) => {
    setSheetUrl(newUrl);
    localStorage.setItem('outreach_sheet_url', newUrl);
    loadSheetData(newUrl);
  };

  const handleImportLeads = (importedLeads: CompanyLead[]) => {
    if (!Array.isArray(importedLeads) || importedLeads.length === 0) return;

    setLeads((prev) => {
      const importMap = new Map<string, CompanyLead>();
      for (const imp of importedLeads) {
        if (imp.id) importMap.set(imp.id, imp);
        importMap.set(`${imp.category}:${imp.name.toLowerCase().trim()}`, imp);
        if (imp.email) importMap.set(imp.email.toLowerCase().trim(), imp);
      }

      const merged = prev.map((lead) => {
        const key = `${lead.category}:${lead.name.toLowerCase().trim()}`;
        const emailKey = lead.email ? lead.email.toLowerCase().trim() : '';
        const match = importMap.get(lead.id) || importMap.get(key) || (emailKey ? importMap.get(emailKey) : undefined);

        if (match) {
          return {
            ...lead,
            generatedSubject: match.generatedSubject || lead.generatedSubject,
            generatedBody: stripTrailingTextSig(match.generatedBody || lead.generatedBody),
            status: (match.status && match.status !== 'idle') ? match.status : lead.status,
            approvals: (match.approvals && match.approvals.length > 0) ? match.approvals : lead.approvals,
            refusedBy: match.refusedBy || lead.refusedBy,
            scheduledTime: match.scheduledTime || lead.scheduledTime,
            sentAt: match.sentAt || lead.sentAt,
            customAttachments: (match.customAttachments && match.customAttachments.length > 0) ? match.customAttachments : lead.customAttachments,
            excludeGlobalAttachments: match.excludeGlobalAttachments ?? lead.excludeGlobalAttachments,
            chatHistory: (match.chatHistory && match.chatHistory.length > 0) ? match.chatHistory : (lead.chatHistory || []),
          };
        }
        return lead;
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('outreach_cached_leads', JSON.stringify(merged));
      }

      fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: merged }),
      }).catch((e) => console.error('Failed to sync imported leads to backend:', e));

      return merged;
    });

    showToast('Import réussi', `${importedLeads.length} leads synchronisés et enregistrés.`, 'success');
  };

  // Generate Email for single lead using ORBYX ML Challenge 2.0 template
  const handleGenerateEmail = async (lead: CompanyLead) => {
    if (lead.status === 'refused') {
      showToast('Action impossible', 'Cette entreprise est annulée / bloquée. Débloquez-la d\'abord pour générer un e-mail.', 'warn');
      return;
    }

    const effectiveKey = apiKey || apiKeysPool.find((k) => k.enabled && k.key.trim().length > 0)?.key;
    if (!effectiveKey) {
      setIsApiKeyModalOpen(true);
      showToast('Clé API requise', 'Veuillez saisir ou activer votre clé API Gemini pour générer.', 'warn');
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
          apiKey: effectiveKey,
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

  // Multi-Worker Parallel Gemini Generation (1 parallel execution per active API key)
  const runParallelGeminiGeneration = async (
    targetLeads: CompanyLead[],
    contextTitle: string = 'Génération'
  ) => {
    const activeKeys = apiKeysPool.filter((k) => k.enabled && k.key.trim().length > 0);
    if (activeKeys.length === 0) {
      setIsApiKeyModalOpen(true);
      showToast('Clés API requises', 'Veuillez activer au moins une clé Gemini dans le pool.', 'warn');
      return;
    }

    const actionable = targetLeads.filter(
      (l) => l.status !== 'refused' && l.email && (!l.generatedSubject || l.status === 'idle' || l.status === 'failed')
    );

    if (actionable.length === 0) {
      showToast(
        'Aucun e-mail à générer',
        'Toutes les entreprises ciblées ont déjà un e-mail rédigé ou sont sans adresse e-mail.',
        'info'
      );
      return;
    }

    setBatchGenerating(true);
    setBatchProgress({ current: 0, total: actionable.length });

    const workerCount = activeKeys.length;
    const workerNames = activeKeys.map((k) => k.name).join(', ');

    showToast(
      'IA Multi-Workers en parallèle',
      `Lancement simultané de ${workerCount} workers (${workerNames}) pour ${actionable.length} entreprises...`,
      'info'
    );

    let nextQueueIdx = 0;
    let completedCount = 0;
    const total = actionable.length;

    // Worker loop running with assigned key
    const runWorker = async (workerKey: GeminiKeyItem) => {
      while (true) {
        if (nextQueueIdx >= total) break;
        const currentIdx = nextQueueIdx++;
        if (currentIdx >= total) break;

        const lead = actionable[currentIdx];

        try {
          const res = await fetch('/api/gemini/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: workerKey.key,
              lead,
              event: eventDetails,
              globalDirectives,
            }),
          });

          const data = await res.json();
          if (res.ok && data.subject && data.body) {
            setLeads((prev) =>
              prev.map((item) =>
                item.id === lead.id
                  ? {
                      ...item,
                      generatedSubject: data.subject,
                      generatedBody: stripTrailingTextSig(data.body),
                      status: 'draft',
                    }
                  : item
              )
            );
          } else {
            // Intelligent fallback: try other active keys in the pool
            console.warn(`Worker ${workerKey.name} returned error for ${lead.name}:`, data.error);
            let recovered = false;
            for (const fallbackKey of activeKeys) {
              if (fallbackKey.key === workerKey.key) continue;
              try {
                const resFb = await fetch('/api/gemini/generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    apiKey: fallbackKey.key,
                    lead,
                    event: eventDetails,
                    globalDirectives,
                  }),
                });
                const dataFb = await resFb.json();
                if (resFb.ok && dataFb.subject && dataFb.body) {
                  setLeads((prev) =>
                    prev.map((item) =>
                      item.id === lead.id
                        ? {
                            ...item,
                            generatedSubject: dataFb.subject,
                            generatedBody: stripTrailingTextSig(dataFb.body),
                            status: 'draft',
                          }
                        : item
                    )
                  );
                  recovered = true;
                  break;
                }
              } catch {}
            }
          }
        } catch (err) {
          console.error(`Worker ${workerKey.name} fetch exception on ${lead.name}:`, err);
        } finally {
          completedCount++;
          setBatchProgress({ current: completedCount, total });
          await new Promise((r) => setTimeout(r, 150));
        }
      }
    };

    // Execute 1 worker per active key -> full parallel execution!
    await Promise.all(activeKeys.map((k) => runWorker(k)));

    setBatchGenerating(false);
    showToast(
      'Génération parallèle terminée',
      `${completedCount} e-mails rédigés avec succès grâce aux ${workerCount} workers Gemini en simultané.`,
      'success'
    );
  };

  // Batch generate emails for active category in parallel
  const handleBatchGenerate = async () => {
    const pending = leads.filter(
      (l) => l.category === selectedCategory && (!l.generatedSubject || l.status === 'idle') && l.email && l.status !== 'refused'
    );

    if (pending.length === 0) {
      showToast('Aucun e-mail en attente', 'Toutes les entreprises de cette catégorie ont déjà un brouillon généré.', 'info');
      return;
    }

    await runParallelGeminiGeneration(pending, 'Catégorie');
  };

  // 1-Person Approval Rule: Accept or revoke approval
  const handleAcceptLead = (lead: CompanyLead) => {
    if (!currentReviewer) {
      setIsReviewerModalOpen(true);
      showToast('Nom requis', 'Veuillez saisir votre nom pour valider.', 'warn');
      return;
    }

    const reviewer = currentReviewer.trim();
    const currentInState = leads.find((l) => l.id === lead.id) || lead;
    const isAlreadyAccepted =
      currentInState.status === 'accepted' ||
      (currentInState.approvals && currentInState.approvals.length > 0);

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

  // Annuler / Bloquer ou Débloquer une entreprise
  const handleRefuseLead = (lead: CompanyLead) => {
    if (!currentReviewer) {
      setIsReviewerModalOpen(true);
      showToast('Nom requis', 'Veuillez saisir votre nom pour enregistrer cette action.', 'warn');
      return;
    }

    const reviewer = currentReviewer.trim();
    const isCurrentlyCancelled = lead.status === 'refused';

    const updatedLead: CompanyLead = {
      ...lead,
      status: isCurrentlyCancelled
        ? (lead.generatedSubject ? 'draft' : 'idle')
        : 'refused',
      refusedBy: isCurrentlyCancelled
        ? undefined
        : {
            reviewerName: reviewer,
            timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          },
      // If cancelling, clear any previous scheduled time or approval
      ...(isCurrentlyCancelled
        ? {}
        : { approvals: [], scheduledTime: undefined }),
    };

    setLeads((prev) => prev.map((item) => (item.id === lead.id ? updatedLead : item)));
    if (selectedLead?.id === lead.id) {
      setSelectedLead(updatedLead);
    }

    if (isCurrentlyCancelled) {
      showToast('Entreprise débloquée', `${lead.name} a été réintégrée et peut à nouveau être traitée.`, 'info');
    } else {
      showToast(
        'Entreprise annulée / bloquée',
        `${lead.name} a été annulée par ${reviewer}. Aucun e-mail ne sera généré ni envoyé.`,
        'warn'
      );
    }
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
      (l) =>
        l.status !== 'refused' &&
        (l.status === 'draft' ||
          l.status === 'pending_approval' ||
          (!!l.generatedSubject && l.status !== 'accepted'))
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
          item.status !== 'refused' &&
          (item.status === 'draft' ||
            item.status === 'pending_approval' ||
            (!!item.generatedSubject && item.status !== 'accepted'))
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

  // Schedule all accepted leads for the same target time (all sent in parallel when due)
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

    const targetIsoTime = startTime.toISOString();
    const acceptedIds = new Set(acceptedLeads.map((l) => l.id));

    setLeads((prev) =>
      prev.map((item) => {
        if (acceptedIds.has(item.id)) {
          return {
            ...item,
            status: 'scheduled',
            scheduledTime: targetIsoTime,
          };
        }
        return item;
      })
    );

    showToast(
      'Programmation en simultané réussie',
      `${acceptedLeads.length} e-mails programmés pour le ${startTime.toLocaleString('fr-FR')} (envoi en parallèle en même temps).`,
      'success'
    );
  };

  // SEND ALL BUTTON: Send all accepted leads immediately in parallel all at the same time
  const handleSendAll = async () => {
    let readyLeads = filteredLeads.filter(
      (l) => l.status === 'accepted' && l.email && l.generatedSubject && l.generatedBody
    );

    if (readyLeads.length === 0) {
      // Check if there are generated drafts that just need approval
      const drafts = filteredLeads.filter((l) => (l.status === 'draft' || !!l.generatedSubject) && l.email);
      if (drafts.length > 0) {
        const confirmAccept = window.confirm(
          `Il y a ${drafts.length} brouillons générés non validés. Voulez-vous les valider (1 approbation) et les expédier immédiatement en parallèle ?`
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
      `Confirmez-vous l'expédition immédiate EN PARALLÈLE de ${readyLeads.length} e-mails via votre compte Gmail (${eventDetails.organizerEmail}) ? Tous les e-mails partiront en même temps.`
    );
    if (!confirmSend) return;

    setBatchSending(true);
    setBatchSendProgress({ current: 0, total: readyLeads.length });

    showToast(
      'Expédition parallèle lancée',
      `Envoi simultané de ${readyLeads.length} e-mails en cours...`,
      'info'
    );

    let sentCount = 0;
    let completedCount = 0;

    // Dispatch all emails concurrently in parallel all at the same time!
    await Promise.all(
      readyLeads.map(async (lead) => {
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
              customAttachments: lead.customAttachments,
              excludeGlobal: lead.excludeGlobalAttachments,
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
          console.error(`Parallel send error for ${lead.name}:`, err);
        } finally {
          completedCount++;
          setBatchSendProgress({ current: completedCount, total: readyLeads.length });
        }
      })
    );

    setBatchSending(false);
    showToast(
      'Envoi groupé en parallèle terminé',
      `${sentCount} sur ${readyLeads.length} e-mails expédiés en simultané avec succès via Gmail SMTP.`,
      'success'
    );
  };

  // Send single lead now
  const handleSendNow = async (lead: CompanyLead) => {
    if (lead.status === 'refused') {
      showToast('Envoi bloqué', 'Cette entreprise est annulée / bloquée. Débloquez-la avant tout envoi.', 'warn');
      return;
    }

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
          customAttachments: lead.customAttachments,
          excludeGlobal: lead.excludeGlobalAttachments,
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

  // Batch generate emails for selected leads in parallel
  const handleBatchGenerateSelected = async (targetLeads: CompanyLead[]) => {
    await runParallelGeminiGeneration(targetLeads, 'Sélection');
  };

  // Accept selected leads
  const handleAcceptSelected = (targetLeads: CompanyLead[]) => {
    if (!currentReviewer) {
      setIsReviewerModalOpen(true);
      showToast('Nom requis', 'Veuillez définir votre nom avant de valider.', 'warn');
      return;
    }

    const reviewer = currentReviewer.trim();
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const actionable = targetLeads.filter((l) => l.status !== 'refused');

    if (actionable.length === 0) {
      showToast('Aucune entreprise valide', 'Les entreprises sélectionnées sont annulées/bloquées.', 'warn');
      return;
    }

    const actionableIds = new Set(actionable.map((l) => l.id));

    setLeads((prev) =>
      prev.map((item) => {
        if (actionableIds.has(item.id)) {
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
      'Validation réussie',
      `${actionable.length} entreprise(s) sélectionnée(s) validée(s) par ${reviewer}.`,
      'success'
    );
  };

  // Cancel / Block or Unblock selected leads
  const handleCancelSelected = (targetLeads: CompanyLead[]) => {
    if (!currentReviewer) {
      setIsReviewerModalOpen(true);
      showToast('Nom requis', 'Veuillez définir votre nom pour enregistrer cette action.', 'warn');
      return;
    }

    const reviewer = currentReviewer.trim();
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const targetIds = new Set(targetLeads.map((l) => l.id));
    const allAlreadyRefused = targetLeads.every((l) => l.status === 'refused');

    setLeads((prev) =>
      prev.map((item) => {
        if (targetIds.has(item.id)) {
          if (allAlreadyRefused) {
            return {
              ...item,
              status: item.generatedSubject ? 'draft' : 'idle',
              refusedBy: undefined,
            };
          } else {
            return {
              ...item,
              status: 'refused',
              refusedBy: { reviewerName: reviewer, timestamp },
              approvals: [],
              scheduledTime: undefined,
            };
          }
        }
        return item;
      })
    );

    if (allAlreadyRefused) {
      showToast(
        'Entreprises débloquées',
        `${targetLeads.length} entreprise(s) débloquée(s) et réintégrées.`,
        'info'
      );
    } else {
      showToast(
        'Entreprises bloquées / annulées',
        `${targetLeads.length} entreprise(s) annulée(s) par ${reviewer}. Aucun e-mail ne sera généré ni envoyé.`,
        'warn'
      );
    }
  };

  // Schedule selected leads for the same target time (all sent in parallel when due)
  const handleScheduleSelected = (targetLeads: CompanyLead[], scheduleTimeStr: string) => {
    const actionable = targetLeads.filter((l) => l.status !== 'refused' && l.email);

    if (actionable.length === 0) {
      showToast(
        'Aucune entreprise éligible',
        'Les entreprises sélectionnées sont annulées ou sans adresse e-mail.',
        'warn'
      );
      return;
    }

    const startTime = scheduleTimeStr ? new Date(scheduleTimeStr) : new Date();
    if (isNaN(startTime.getTime())) {
      showToast('Date invalide', "Veuillez choisir une date et heure d'envoi valides.", 'warn');
      return;
    }

    const reviewer = currentReviewer?.trim() || 'Jasser Ben Jomaa';
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const targetIsoTime = startTime.toISOString();
    const actionableIds = new Set(actionable.map((l) => l.id));

    setLeads((prev) =>
      prev.map((item) => {
        if (actionableIds.has(item.id)) {
          return {
            ...item,
            status: 'scheduled',
            scheduledTime: targetIsoTime,
            approvals:
              item.approvals && item.approvals.length > 0
                ? item.approvals
                : [{ reviewerName: reviewer, timestamp: nowTime }],
          };
        }
        return item;
      })
    );

    showToast(
      'Programmation en simultané réussie',
      `${actionable.length} e-mail(s) sélectionné(s) programmé(s) pour le ${startTime.toLocaleString('fr-FR')} (envoi en parallèle en même temps).`,
      'success'
    );
  };

  // Send selected leads immediately in parallel all at the same time
  const handleSendSelected = async (targetLeads: CompanyLead[]) => {
    const readyLeads = targetLeads.filter(
      (l) => l.status !== 'refused' && l.email && l.generatedSubject && l.generatedBody
    );

    if (readyLeads.length === 0) {
      const ungenerated = targetLeads.filter((l) => !l.generatedSubject && l.email && l.status !== 'refused');
      if (ungenerated.length > 0) {
        showToast(
          'E-mails non générés',
          `Veuillez d'abord cliquer sur "GÉNÉRER (${targetLeads.length})" avant de les expédier.`,
          'warn'
        );
      } else {
        showToast('Aucun e-mail prêt', "Aucun e-mail prêt pour l'envoi dans la sélection.", 'warn');
      }
      return;
    }

    const confirmSend = window.confirm(
      `Confirmez-vous l'expédition immédiate EN PARALLÈLE de ${readyLeads.length} e-mail(s) sélectionné(s) via votre compte Gmail (${eventDetails.organizerEmail}) ? Tous les e-mails partiront en même temps.`
    );
    if (!confirmSend) return;

    setBatchSending(true);
    setBatchSendProgress({ current: 0, total: readyLeads.length });

    showToast(
      'Expédition parallèle lancée',
      `Envoi simultané de ${readyLeads.length} e-mails sélectionnés en cours...`,
      'info'
    );

    let sentCount = 0;
    let completedCount = 0;

    // Dispatch all selected emails concurrently in parallel all at the same time!
    await Promise.all(
      readyLeads.map(async (lead) => {
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
              customAttachments: lead.customAttachments,
              excludeGlobal: lead.excludeGlobalAttachments,
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
          console.error(`Send error for ${lead.name}:`, err);
        } finally {
          completedCount++;
          setBatchSendProgress({ current: completedCount, total: readyLeads.length });
        }
      })
    );

    setBatchSending(false);
    showToast(
      'Envoi groupé en parallèle terminé',
      `${sentCount} sur ${readyLeads.length} e-mails sélectionnés expédiés en simultané avec succès via Gmail SMTP.`,
      'success'
    );
  };

  // Schedule send for individual lead
  const handleScheduleSend = async (lead: CompanyLead, scheduledTime: string) => {
    if (lead.status === 'refused') {
      showToast('Action bloquée', 'Cette entreprise est annulée / bloquée. Débloquez-la avant de programmer.', 'warn');
      return;
    }
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
          customAttachments: lead.customAttachments,
          excludeGlobal: lead.excludeGlobalAttachments,
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
        hasApiKey={!!apiKey || apiKeysPool.some((k) => k.enabled && k.key.trim().length > 0)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenEventModal={() => setIsEventModalOpen(true)}
        onOpenSheetModal={() => setIsSheetModalOpen(true)}
        hasDirectives={!!globalDirectives}
        onOpenDirectivesModal={() => setIsDirectivesModalOpen(true)}
        currentReviewer={currentReviewer}
        onOpenReviewerModal={() => setIsReviewerModalOpen(true)}
        globalAttachmentsCount={globalAttachments.filter((a) => a.enabled).length}
        onOpenAttachmentsModal={() => setIsAttachmentsModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        activeTab={activeMainTab}
        onSelectTab={setActiveMainTab}
      />

      {/* Main Workspace */}
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-8 py-6 space-y-5">
        {activeMainTab === 'tracker' ? (
          <EmailCheckerDashboard
            leads={leads}
            onOpenInspector={(lead) => {
              setSelectedLead(lead);
              setIsInspectorOpen(true);
            }}
          />
        ) : (
          <>
            {/* Banner Alert when API key is missing */}
            {!apiKey && !apiKeysPool.some((k) => k.enabled && k.key.trim().length > 0) && (
              <div className="p-4 bg-[var(--yellow)] text-[var(--ink)] border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--ink)] text-[var(--yellow)]">
                    <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight">CLÉ API GEMINI NON CONFIGURÉE</h3>
                    <p className="text-xs font-mono text-[var(--ink)]/90 uppercase font-semibold">
                      Pour générer les e-mails de sponsoring du ML Challenge 2.0 et dialoguer avec le copilote IA, veuillez connecter vos clés API Gemini.
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
              onBatchGenerateSelected={handleBatchGenerateSelected}
              onAcceptSelected={handleAcceptSelected}
              onCancelSelected={handleCancelSelected}
              onScheduleSelected={handleScheduleSelected}
              onSendSelected={handleSendSelected}
              batchGenerating={batchGenerating}
              batchSending={batchSending}
            />
          </>
        )}
      </main>

      {/* Inspector & Gemini Chat Modal */}
      <EmailInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        lead={selectedLead}
        event={eventDetails}
        apiKey={apiKey || apiKeysPool.find((k) => k.enabled && k.key.trim().length > 0)?.key || ''}
        currentReviewer={currentReviewer}
        globalDirectives={globalDirectives}
        globalAttachments={globalAttachments}
        onOpenReviewerModal={() => setIsReviewerModalOpen(true)}
        onUpdateLead={(updated) => {
          setSelectedLead(updated);
          setLeads((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
          fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead: updated }),
          }).catch((err) => console.error('Failed to sync updated lead to backend:', err));
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
        apiKey={apiKey || apiKeysPool.find((k) => k.enabled && k.key.trim().length > 0)?.key || ''}
        smtpPass={smtpPass}
        keysPool={apiKeysPool}
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

      {/* Global Attachments Modal */}
      <GlobalAttachmentsModal
        isOpen={isAttachmentsModalOpen}
        onClose={() => setIsAttachmentsModalOpen(false)}
        attachments={globalAttachments}
        onSave={handleSaveGlobalAttachments}
        onResetDefault={handleResetDefaultAttachments}
      />

      {/* Share / Backup Session Modal */}
      <ShareSessionModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        leads={leads}
        onImportLeads={handleImportLeads}
      />
    </div>
  );
}
