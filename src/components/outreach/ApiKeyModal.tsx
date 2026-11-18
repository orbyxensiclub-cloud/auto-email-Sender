'use client';

import React, { useState } from 'react';
import { Key, CheckCircle2, AlertCircle, Eye, EyeOff, X, Mail } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  smtpPass?: string;
  onSave: (key: string, smtpPass?: string) => void;
}

export default function ApiKeyModal({ isOpen, onClose, apiKey, smtpPass = '', onSave }: ApiKeyModalProps) {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [smtpInput, setSmtpInput] = useState(smtpPass);
  const [showKey, setShowKey] = useState(false);
  const [showSmtp, setShowSmtp] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!keyInput.trim()) {
      setTestResult({ success: false, message: 'Veuillez saisir une clé API Gemini.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      let res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${keyInput.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hello, respond with {"status": "ok"}' }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      if (!res.ok) {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${keyInput.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Hello, respond with {"status": "ok"}' }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );
      }

      if (res.ok) {
        setTestResult({ success: true, message: 'CONNEXION GEMINI VALIDÉE ET OPÉRATIONNELLE.' });
      } else {
        const err = await res.json().catch(() => ({}));
        setTestResult({ success: false, message: err?.error?.message || `Erreur: code ${res.status}` });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || "Impossible de contacter l'API Gemini." });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSave(keyInput.trim(), smtpInput.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ink)]/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg bg-[var(--white)] border-4 border-[var(--ink)] shadow-[8px_8px_0_var(--ink)] p-6 text-[var(--ink)] my-6">
        <div className="flex items-center justify-between pb-4 border-b-2 border-[var(--ink)]">
          <div className="flex items-center gap-3">
            <Key className="w-6 h-6 text-[var(--blue)] stroke-[2.5]" />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">CLÉS & AUTHENTIFICATIONS</h3>
              <p className="text-xs font-mono text-[var(--grey)] uppercase">GEMINI IA & ENVOI D'E-MAILS GMAIL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-[var(--ink)] hover:bg-[var(--yellow)] transition-colors"
          >
            <X className="w-5 h-5 stroke-[3]" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Section 1: Gemini API Key */}
          <div>
            <label className="block text-xs font-mono font-black mb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span>1. CLÉ API GOOGLE GEMINI</span>
              <span className="text-[10px] text-[var(--blue)] font-bold">MODÈLE: gemini-3.5-flash-lite</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setTestResult(null);
                }}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 pr-10 text-xs font-mono bg-[var(--ground)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold focus:outline-none focus:bg-[var(--white)]"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-3 text-[var(--ink)]"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Section 2: Gmail App Password for SMTP Sending */}
          <div className="p-3.5 bg-[var(--ground)] border-2 border-[var(--ink)]">
            <div className="flex items-center gap-2 mb-1.5">
              <Mail className="w-4 h-4 text-[var(--blue)] stroke-[2.5]" />
              <label className="text-xs font-mono font-black uppercase tracking-wider">
                2. MOT DE PASSE D'APPLICATION GMAIL (SMTP)
              </label>
            </div>
            <p className="text-[11px] font-mono text-[var(--grey)] mb-2 leading-relaxed">
              Expéditeur : <strong className="text-[var(--ink)]">jasser.ben.joma@gmail.com</strong>.
              Pour l'envoi réel automatique en arrière-plan, créez un mot de passe d'application (16 lettres) sur{' '}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--blue)] font-bold underline"
              >
                Google App Passwords
              </a>
              .
            </p>
            <div className="relative">
              <input
                type={showSmtp ? 'text' : 'password'}
                value={smtpInput}
                onChange={(e) => setSmtpInput(e.target.value)}
                placeholder="abcd efgh ijkl mnop"
                className="w-full px-3.5 py-2 text-xs font-mono bg-[var(--white)] border-2 border-[var(--ink)] text-[var(--ink)] font-bold focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowSmtp(!showSmtp)}
                className="absolute right-3 top-2.5 text-[var(--ink)]"
              >
                {showSmtp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] font-mono text-[var(--grey)]">
              * Astuce : Sans ce mot de passe, vous pouvez aussi cliquer sur le bouton <strong>OUVRIR GMAIL</strong> dans l'inspecteur pour envoyer directement sans mot de passe.
            </p>
          </div>

          {testResult && (
            <div
              className={`p-3 border-2 font-mono text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-[#E8F8EE] border-emerald-800 text-emerald-950 font-bold'
                  : 'bg-[#FFE8E8] border-red-800 text-red-950 font-bold'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700 stroke-[3]" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-700 stroke-[3]" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between pt-4 border-t-2 border-[var(--ink)]">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !keyInput.trim()}
            className="btn-transit !py-2 !px-3 !text-xs !bg-[var(--ground)] !text-[var(--ink)] !border-[var(--ink)] hover:!bg-[var(--yellow)] disabled:opacity-40"
          >
            {testing ? 'TEST EN COURS...' : 'TESTER CONNEXION GEMINI'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-transit !py-2 !px-4 !text-xs !bg-[var(--white)] !text-[var(--ink)] !border-[var(--ink)] hover:!bg-[var(--ground)]"
            >
              ANNULER
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-transit yellow !py-2 !px-5 !text-xs !font-black !border-[var(--ink)]"
            >
              ENREGISTRER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
