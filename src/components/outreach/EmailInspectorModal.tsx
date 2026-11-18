'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Check,
  XCircle,
  Clock,
  Sparkles,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  Copy,
  CheckCheck,
  ExternalLink,
  Building,
} from 'lucide-react';
import { CompanyLead } from '@/lib/sheets';
import { EventDetails } from '@/lib/gemini';
import { getSignatureHtml } from '@/lib/signature';

interface EmailInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: CompanyLead | null;
  event: EventDetails;
  apiKey: string;
  currentReviewer: string;
  globalDirectives?: string;
  onOpenReviewerModal?: () => void;
  onUpdateLead: (updated: CompanyLead) => void;
  onSendNow: (lead: CompanyLead) => Promise<void>;
  onScheduleSend: (lead: CompanyLead, scheduledTime: string) => Promise<void>;
  onAccept: (lead: CompanyLead) => void;
  onRefuse: (lead: CompanyLead) => void;
}

export default function EmailInspectorModal({
  isOpen,
  onClose,
  lead,
  event,
  apiKey,
  currentReviewer,
  globalDirectives,
  onOpenReviewerModal,
  onUpdateLead,
  onSendNow,
  onScheduleSend,
  onAccept,
  onRefuse,
}: EmailInspectorModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipient, setRecipient] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lead) {
      setSubject(lead.generatedSubject || '');
      setBody(lead.generatedBody || '');
      setRecipient(lead.email || '');
      if (lead.scheduledTime) {
        try {
          const d = new Date(lead.scheduledTime);
          const pad = (n: number) => String(n).padStart(2, '0');
          const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          setScheduledTime(localIso);
        } catch {
          setScheduledTime('');
        }
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 30, 0, 0);
        const pad = (n: number) => String(n).padStart(2, '0');
        const defaultTime = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
        setScheduledTime(defaultTime);
      }
    }
  }, [lead]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lead?.chatHistory, chatLoading]);

  if (!isOpen || !lead) return null;

  const textSignature = `\n\n--\nORBYX ENSI CLUB\nJasser Ben Jomaa\nResponsable Sponsoring\nTel: 58745567\nNational School of Computer Science (ENSI)\nFacebook: https://www.facebook.com/share/18f9Q5asNW/\nInstagram: https://www.instagram.com/orbyx_ensi_club\nLinkedIn: https://www.linkedin.com/in/orbyx-ensi-club-057abb373`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`Objet: ${subject}\n\n${body}${textSignature}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInGmail = () => {
    if (!recipient || !body.trim()) return;
    const fullBody = `${body}${textSignature}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      recipient
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullBody)}`;
    window.open(gmailUrl, '_blank');
  };

  const handleSaveDraft = () => {
    onUpdateLead({
      ...lead,
      generatedSubject: subject,
      generatedBody: body,
      email: recipient,
    });
  };

  // 1-person approval rule: delegate toggle to onAccept with latest edited fields
  const handleAcceptClick = () => {
    onAccept({
      ...lead,
      generatedSubject: subject,
      generatedBody: body,
      email: recipient,
    });
  };

  const handleRefuseClick = () => {
    const reviewer = currentReviewer?.trim() || 'Examinateur';
    onRefuse({
      ...lead,
      generatedSubject: subject,
      generatedBody: body,
      email: recipient,
      status: 'refused',
      refusedBy: {
        reviewerName: reviewer,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      },
    });
  };

  const handleSendImmediately = async () => {
    const updated: CompanyLead = {
      ...lead,
      generatedSubject: subject,
      generatedBody: body,
      email: recipient,
    };
    await onSendNow(updated);
  };

  const handleScheduleSubmit = async () => {
    if (!scheduledTime) return;
    const isoTime = new Date(scheduledTime).toISOString();
    const updated: CompanyLead = {
      ...lead,
      generatedSubject: subject,
      generatedBody: body,
      email: recipient,
      scheduledTime: isoTime,
    };
    await onScheduleSend(updated, isoTime);
  };

  const handleSendChatMessage = async (msgToSend?: string) => {
    const promptText = msgToSend || chatInput;
    if (!promptText.trim()) return;

    if (!apiKey) {
      alert("Veuillez d'abord configurer votre clé API Gemini.");
      return;
    }

    const userMsgId = `u-${Date.now()}`;
    const newChatHistory = [
      ...lead.chatHistory,
      {
        id: userMsgId,
        sender: 'user' as const,
        text: promptText,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    onUpdateLead({
      ...lead,
      generatedSubject: subject,
      generatedBody: body,
      chatHistory: newChatHistory,
    });

    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          lead,
          event,
          currentSubject: subject,
          currentBody: body,
          userMessage: promptText,
          history: newChatHistory.map((h) => ({ sender: h.sender, text: h.text })),
          globalDirectives,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la communication avec Gemini');

      setSubject(data.subject);
      setBody(data.body);

      const assistantMsg = {
        id: `a-${Date.now()}`,
        sender: 'assistant' as const,
        text: data.reply,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };

      onUpdateLead({
        ...lead,
        generatedSubject: data.subject,
        generatedBody: data.body,
        chatHistory: [...newChatHistory, assistantMsg],
      });
    } catch (err: any) {
      alert(`Erreur IA : ${err.message}`);
    } finally {
      setChatLoading(false);
    }
  };

  const quickChips = [
    'RÉDUIRE ET PERCUTER',
    'TON PLUS FORMEL',
    'INSISTER RECRUTEMENT IA',
    'PROPOSER FORMULES BRONZE/ARGENT/OR',
    'MENTORAT & DATASETS',
    'TRADUIRE EN ANGLAIS',
  ];

  const isApproved = lead.status === 'accepted' || (lead.approvals && lead.approvals.length >= 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[var(--ink)]/80 backdrop-blur-sm">
      <div className="w-full max-w-7xl h-[94vh] bg-[var(--ground)] border-4 border-[var(--ink)] shadow-[8px_8px_0_var(--ink)] flex flex-col overflow-hidden text-[var(--ink)]">
        {/* Header */}
        <div className="band flex items-center justify-between px-6 py-4 border-b-4 border-[var(--ink)]">
          <div className="flex items-center gap-3">
            <Building className="w-6 h-6 text-[var(--yellow)] shrink-0" />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black text-[var(--white)] tracking-tight uppercase">
                  {lead.name}
                </h2>
                <span className="tag-hot">
                  CATÉGORIE: {lead.category.toUpperCase()}
                </span>
                <span className="bg-[var(--ink)] text-[var(--white)] text-[10px] font-mono px-2 py-0.5 border border-[var(--white)] uppercase">
                  STATUT: {lead.status}
                </span>
              </div>
              <div className="text-xs font-mono text-[var(--on-blue)] mt-1 flex items-center gap-3 flex-wrap">
                {lead.contactPerson && <span>RESP: {lead.contactPerson.toUpperCase()}</span>}
                {lead.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[var(--yellow)]" /> {lead.phone}
                  </span>
                )}
                {lead.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[var(--yellow)]" /> {lead.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 border-2 border-[var(--white)] text-[var(--white)] hover:bg-[var(--yellow)] hover:text-[var(--ink)] hover:border-[var(--yellow)] transition-colors"
          >
            <X className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Dual Pane Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden divide-y-4 lg:divide-y-0 lg:divide-x-4 divide-[var(--ink)]">
          {/* Left: Email Editor & Scheduling (7 cols) */}
          <div className="lg:col-span-7 flex flex-col h-full overflow-y-auto p-5 space-y-4 bg-[var(--ground)]">
            {/* Recipient & Subject Console */}
            <div className="p-4 bg-[var(--white)] border-2 border-[var(--ink)] space-y-3">
              <div>
                <label className="block text-xs font-mono font-black text-[var(--ink)] mb-1 uppercase tracking-wider flex items-center justify-between">
                  <span>DESTINATAIRE (À :)</span>
                  {!recipient && <span className="text-red-700 font-bold">E-MAIL MANQUANT DANS LE FICHIER</span>}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--grey)] absolute left-3 top-3" />
                  <input
                    type="email"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="contact@entreprise.com"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-semibold focus:outline-none focus:bg-[var(--white)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-black text-[var(--ink)] mb-1 uppercase tracking-wider">
                  OBJET DE LA TRANSMISSION
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Objet du message de sponsoring..."
                  className="w-full px-3 py-2 text-xs font-sans font-extrabold bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] focus:outline-none focus:bg-[var(--white)]"
                />
              </div>
            </div>

            {/* Email Body TextArea */}
            <div className="flex-1 flex flex-col min-h-[300px]">
              <div className="flex items-center justify-between mb-1.5 font-mono text-xs font-bold text-[var(--ink)] uppercase">
                <span>CORPS DE L'E-MAIL (MODÈLE ORBYX ML CHALLENGE 2.0)</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="btn-transit !py-1 !px-2.5 !text-[11px] !bg-[var(--white)] !text-[var(--ink)] !border-[var(--ink)]"
                  >
                    {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'COPIÉ !' : 'COPIER'}</span>
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    className="btn-transit !py-1 !px-2.5 !text-[11px] !bg-[var(--white)] !text-[var(--ink)] !border-[var(--ink)]"
                  >
                    SAUVEGARDER
                  </button>
                </div>
              </div>

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Le corps de l'e-mail personnalisé s'affichera ici..."
                className="flex-1 w-full p-4 text-sm font-sans leading-relaxed bg-[var(--white)] border-2 border-[var(--ink)] text-[var(--ink)] resize-none focus:outline-none focus:ring-0"
              />
            </div>

            {/* Official ORBYX Signature Preview at the bottom */}
            <div className="p-4 bg-[var(--white)] border-2 border-[var(--ink)] space-y-2">
              <div className="flex items-center justify-between border-b border-[var(--ink)]/20 pb-1.5 text-xs font-mono font-bold text-[var(--ink)] uppercase">
                <span>SIGNATURE OFFICIELLE ORBYX (ATTACHÉE EN BAS DU MAIL)</span>
                <span className="text-emerald-700 font-bold text-[11px]">✓ EMBARQUÉE AUTOMATIQUEMENT</span>
              </div>
              <div
                className="overflow-x-auto bg-[#ffffff] p-2 border border-[var(--ink)]/10"
                dangerouslySetInnerHTML={{
                  __html: getSignatureHtml({
                    name: 'Jasser Ben Jomaa',
                    role: 'Responsable Sponsoring',
                    phone: '58745567',
                    forWebPreview: true,
                  }),
                }}
              />
            </div>

            {/* 1-Person Approval Protocol Strip */}
            <div className="p-4 bg-[var(--white)] border-2 border-[var(--ink)] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--ink)]/20 pb-2">
                <div className="flex items-center gap-2 text-xs font-mono font-black text-[var(--ink)] uppercase">
                  <CheckCheck className="w-4 h-4 text-[var(--blue)] stroke-[2.5]" />
                  <span>CONTRÔLE QUALITÉ : 1 APPROBATION REQUISE</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`tag-hot ${isApproved ? '!bg-[var(--yellow)] !text-[var(--ink)]' : ''}`}>
                    {isApproved ? 'VALIDÉ (1/1)' : 'BROUILLON (0/1)'}
                  </span>
                  {onOpenReviewerModal && (
                    <button
                      type="button"
                      onClick={onOpenReviewerModal}
                      className="text-[10px] font-mono text-[var(--blue)] underline font-bold uppercase"
                    >
                      (Changer d'examinateur)
                    </button>
                  )}
                </div>
              </div>

              {/* Single Reviewer Approval Slot */}
              <div className="text-xs font-mono">
                {isApproved ? (
                  <div className="p-3 border-2 bg-[var(--ground)] border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center font-black text-xs shrink-0 bg-[var(--yellow)] text-[var(--ink)]">
                        ✓
                      </span>
                      <div>
                        <span className="font-bold text-[var(--ink)] block uppercase">
                          APPROUVÉ PAR {lead.approvals?.[0]?.reviewerName || currentReviewer}
                        </span>
                        <span className="text-[10px] text-[var(--grey)]">
                          {lead.approvals?.[0]?.timestamp ? `Validé à ${lead.approvals[0].timestamp}` : 'Approuvé'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-700 font-bold uppercase flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 stroke-[3]" /> PRÊT POUR L'EXPÉDITION
                    </span>
                  </div>
                ) : (
                  <div className="p-3 border-2 bg-[var(--ground)]/40 border-[var(--ink)]/30 border-dashed text-[var(--grey)] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center font-black text-xs shrink-0 bg-[var(--grey)]/30 text-[var(--grey)]">
                        1
                      </span>
                      <div>
                        <span className="font-bold text-[var(--ink)]/70 block uppercase">
                          EN ATTENTE D'UNE VALIDATION
                        </span>
                        <span className="text-[10px] text-[var(--grey)]">
                          Cliquez sur &quot;APPROUVER&quot; pour autoriser l'envoi immédiat ou la programmation.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Control Bar: Schedule & Send */}
            <div className="p-4 bg-[var(--white)] border-2 border-[var(--ink)] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--ink)] uppercase">
                  <Clock className="w-4 h-4 text-[var(--blue)]" />
                  <span>SÉLECTIONNER L'HEURE D'ENVOI :</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="px-3 py-1.5 text-xs font-mono bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleScheduleSubmit}
                    disabled={!scheduledTime || !recipient || !isApproved}
                    className="btn-transit !py-1.5 !px-3 !text-xs !bg-[var(--blue)] !text-[var(--white)] !border-[var(--ink)] hover:!bg-[var(--yellow)] hover:!text-[var(--ink)] disabled:opacity-40"
                    title={
                      !isApproved
                        ? '1 approbation nécessaire avant programmation'
                        : "Programmer l'envoi pour cette date"
                    }
                  >
                    PROGRAMMER
                  </button>
                </div>
              </div>

              {/* Accept / Refuse / Send Now Buttons */}
              <div className="flex items-center justify-between pt-3 border-t-2 border-[var(--ink)]">
                <div className="flex gap-2">
                  {/* Single Person Accept Button */}
                  <button
                    type="button"
                    onClick={handleAcceptClick}
                    className={`btn-transit !py-2 !px-3 !text-xs ${
                      isApproved
                        ? '!bg-emerald-300 !text-[var(--ink)] !border-[var(--ink)] font-black ring-2 ring-[var(--ink)]'
                        : '!bg-[var(--white)] !text-[var(--ink)] !border-[var(--ink)] hover:!bg-emerald-300'
                    }`}
                    title={
                      isApproved
                        ? `Validé (${lead.approvals?.[0]?.reviewerName || currentReviewer}) - Cliquez pour révoquer`
                        : `Valider en tant que ${currentReviewer || 'examinateur'}`
                    }
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>
                      {isApproved
                        ? `VALIDÉ (${currentReviewer || '1/1'})`
                        : `APPROUVER (${currentReviewer || '1/1'})`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRefuseClick}
                    className={`btn-transit !py-2 !px-3 !text-xs ${
                      lead.status === 'refused'
                        ? '!bg-red-600 !text-white !border-[var(--ink)]'
                        : '!bg-[var(--white)] !text-[var(--ink)] !border-[var(--ink)] hover:!bg-red-200'
                    }`}
                  >
                    <XCircle className="w-4 h-4 stroke-[3]" />
                    <span>REFUSER</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenInGmail}
                    disabled={!recipient || !body.trim()}
                    className="btn-transit !bg-[var(--white)] !text-[var(--ink)] !border-[var(--ink)] hover:!bg-[#E6E8E2] !py-2 !px-3 !text-xs !font-black disabled:opacity-40"
                    title="Ouvrir directement dans Gmail avec le destinataire, objet et message pré-remplis"
                  >
                    <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>OUVRIR GMAIL</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendImmediately}
                    disabled={!recipient || !body.trim() || !isApproved}
                    className="btn-transit yellow !py-2 !px-4 !text-xs !font-black !border-[var(--ink)] disabled:opacity-40"
                    title={
                      !isApproved
                        ? '1 approbation nécessaire avant transmission immédiate'
                        : 'Transmettre automatiquement via Gmail SMTP'
                    }
                  >
                    <Send className="w-4 h-4 stroke-[2.5]" />
                    <span>ENVOI SMTP DIRECT</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Station Query Terminal / Gemini Copilot (5 cols) */}
          <div className="lg:col-span-5 flex flex-col h-full bg-[var(--ink)] text-[var(--white)]">
            {/* Terminal Header */}
            <div className="px-5 py-3.5 bg-[#1B1E24] border-b-2 border-[var(--ink)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 bg-[var(--yellow)] inline-block" />
                <div>
                  <div className="font-mono text-xs font-black tracking-widest text-[var(--white)] uppercase">
                    COPILOTE GEMINI // ORBYX ML 2.0
                  </div>
                  <div className="text-[10px] font-mono text-[var(--yellow)] font-bold">
                    MODÈLE : gemini-3.5-flash-lite
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSendChatMessage('Régénère un e-mail complet et percutant de zéro selon le modèle ORBYX ML Challenge 2.0')}
                disabled={chatLoading}
                className="btn-transit !py-1 !px-2.5 !text-[10px] !bg-[var(--ink)] !text-[var(--yellow)] !border-[var(--yellow)] hover:!bg-[var(--yellow)] hover:!text-[var(--ink)] disabled:opacity-40"
              >
                <RefreshCw className={`w-3 h-3 ${chatLoading ? 'animate-spin' : ''}`} />
                <span>RÉGÉNÉRER</span>
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
              <div className="p-3 bg-[#1B1E24] border-l-4 border-[var(--yellow)] text-[#D6D8DC] leading-relaxed">
                <span className="font-bold text-[var(--yellow)] block mb-1 uppercase tracking-wider">
                  // ASSISTANT GEMINI INITIALISÉ (ORBYX ENSI)
                </span>
                Prêt pour réviser et affiner l'e-mail destiné à {lead.name}. Donnez une consigne pour ajuster le ton, les chiffres ou insister sur le recrutement, les crédits cloud ou le mentorat.
              </div>

              {lead.chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 border-2 leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[var(--blue)] text-[var(--white)] border-[var(--white)] ml-4'
                      : 'bg-[#1B1E24] text-[#DCE3F5] border-[#3A3E46] mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 text-[10px] font-bold uppercase tracking-widest opacity-80">
                    <span>{msg.sender === 'user' ? 'UTILISATEUR' : 'COPILOTE GEMINI'}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))}

              {chatLoading && (
                <div className="p-3 bg-[#1B1E24] border-l-4 border-[var(--yellow)] text-[var(--yellow)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>RÉÉCRITURE DU BROUILLON EN COURS...</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Prompt Chips */}
            <div className="p-3 bg-[#1B1E24] border-t-2 border-[#2A2E35]">
              <span className="text-[10px] font-mono font-bold text-[var(--grey)] uppercase block mb-1.5">
                // SUGGESTIONS D'ACTION RAPIDE :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendChatMessage(chip)}
                    disabled={chatLoading}
                    className="px-2 py-1 text-[10px] font-mono font-bold tracking-wider uppercase bg-[var(--ink)] text-[var(--white)] border border-[#4A4E56] hover:bg-[var(--yellow)] hover:text-[var(--ink)] hover:border-[var(--yellow)] transition-colors disabled:opacity-40"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-3 bg-[var(--ink)] border-t-2 border-[#3A3E46]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="INSTRUCTION (EX: INSISTER SUR LE PACK OR ET LES 60-80 ÉLÈVES-INGÉNIEURS)..."
                  disabled={chatLoading}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-[#1B1E24] border-2 border-[#3A3E46] text-[var(--white)] placeholder:text-[var(--grey)] focus:outline-none focus:border-[var(--yellow)]"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="btn-transit yellow !py-2 !px-3 !text-xs disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
