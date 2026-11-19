'use client';

import React from 'react';
import { CompanyLead } from '@/lib/sheets';

interface StatsBarProps {
  leads: CompanyLead[];
}

export default function StatsBar({ leads }: StatsBarProps) {
  const total = leads.length;
  const withEmail = leads.filter((l) => l.email && l.email.includes('@')).length;
  const drafts = leads.filter((l) => l.status === 'draft').length;
  const accepted = leads.filter((l) => l.status === 'accepted').length;
  const refused = leads.filter((l) => l.status === 'refused').length;
  const scheduled = leads.filter((l) => l.status === 'scheduled').length;
  const sent = leads.filter((l) => l.status === 'sent').length;

  const stats = [
    { label: 'TOTAL LEADS', value: total, unit: 'ENTREPRISES', op: 'EXTRACTION SHEET' },
    { label: 'E-MAILS VALIDES', value: withEmail, unit: 'CONTACTS', op: 'DÉLIVRABILITÉ' },
    { label: 'BROUILLONS IA', value: drafts, unit: 'GÉNÉRÉS', op: 'REVUE REQUISE' },
    { label: 'ACCEPTÉS', value: accepted, unit: 'VALIDÉS', op: 'PRÊTS ENVOI' },
    { label: 'ANNULÉS', value: refused, unit: 'BLOQUÉS', op: 'NON CONTACTÉS' },
    { label: 'PROGRAMMÉS', value: scheduled, unit: 'EN FILE', op: 'HORAIRE FIXÉ' },
    { label: 'DISPATCHÉS', value: sent, unit: 'ENVOYÉS', op: 'TRANSMISSION 200' },
  ];

  return (
    <div className="bg-[var(--ink)] text-[var(--white)] p-5 border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--ink)]">
      {/* Board Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#3A3E46] text-xs font-mono tracking-widest text-[var(--grey)] uppercase font-extrabold gap-2">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[var(--yellow)] inline-block" />
          // STATION TELEMETRY MONITOR — SPONSORSHIP DISPATCH STATUS
        </span>
        <span className="text-[var(--yellow)]">
          FLIGHT: FORUM-ENSI-2026
        </span>
      </div>

      {/* Grid of Telemetry Readouts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 pt-4">
        {stats.map((s, idx) => (
          <div key={idx} className="flex flex-col justify-between border-l-2 border-[#2A2E35] pl-3 first:border-l-0">
            <div>
              <span className="block text-[11px] font-mono font-bold tracking-wider text-[var(--grey)] uppercase">
                {s.label}
              </span>
              <span className="font-mono font-bold text-2xl sm:text-3xl text-[var(--yellow)] leading-tight block mt-0.5 tabular-nums">
                {s.value}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-[#2A2E35]/60 flex items-center justify-between text-[10px] font-mono text-[#C9CCD1]">
              <span>{s.unit}</span>
              <span className="text-[var(--yellow)] font-semibold">{s.op}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
