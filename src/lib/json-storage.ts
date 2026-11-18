import fs from 'fs';
import path from 'path';
import type { CompanyLead, CategoryKey } from './sheets';

export interface GeneratedEmailRecord {
  id: string;
  leadId: string;
  companyName: string;
  category: string;
  to: string;
  subject: string;
  body: string;
  model: string;
  status: string;
  generatedAt: string;
  updatedAt?: string;
}

export interface SentEmailRecord {
  id: string;
  leadId?: string;
  companyName?: string;
  to: string;
  sender: string;
  replyTo?: string;
  subject: string;
  body: string;
  messageId: string;
  sentAt: string;
}

// In-memory caches to handle serverless cold starts and read-only filesystems
let memoryLeads: CompanyLead[] | null = null;
let memoryGenerated: GeneratedEmailRecord[] | null = null;
let memorySent: SentEmailRecord[] | null = null;

function getPaths(filename: string) {
  return {
    local: path.join(process.cwd(), 'src', 'data', filename),
    tmp: path.join('/tmp', filename),
  };
}

function safeReadJSON<T>(filename: string, fallback: T): T {
  const { local, tmp } = getPaths(filename);

  // 1. Check local project data directory first (primary source of truth)
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ local)) {
      const content = fs.readFileSync(/*turbopackIgnore: true*/ local, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch {}

  // 2. Check /tmp on serverless environments
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ tmp)) {
      const content = fs.readFileSync(/*turbopackIgnore: true*/ tmp, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch {}

  return fallback;
}

function safeWriteJSON<T>(filename: string, data: T): void {
  const { local, tmp } = getPaths(filename);
  const jsonString = JSON.stringify(data, null, 2);

  // Try local write (works in local dev, may throw EROFS on serverless)
  try {
    const dir = path.dirname(local);
    if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
    }
    fs.writeFileSync(/*turbopackIgnore: true*/ local, jsonString, 'utf-8');
  } catch {}

  // Always attempt /tmp write on serverless
  try {
    const tmpDir = path.dirname(tmp);
    if (fs.existsSync(/*turbopackIgnore: true*/ tmpDir)) {
      fs.writeFileSync(/*turbopackIgnore: true*/ tmp, jsonString, 'utf-8');
    }
  } catch {}
}

/**
 * Hydrates leads array with generated email records to guarantee NO generated email is ever lost
 */
export function hydrateLeadsWithGeneratedEmails(
  leads: CompanyLead[],
  generated: GeneratedEmailRecord[]
): CompanyLead[] {
  if (!generated || generated.length === 0) return leads;

  const genById = new Map<string, GeneratedEmailRecord>();
  const genByKey = new Map<string, GeneratedEmailRecord>();
  const genByEmail = new Map<string, GeneratedEmailRecord>();

  for (const gen of generated) {
    if (gen.leadId) genById.set(gen.leadId, gen);
    if (gen.companyName && gen.category) {
      genByKey.set(`${gen.category}:${gen.companyName.toLowerCase().trim()}`, gen);
    }
    if (gen.to && gen.to.includes('@')) {
      genByEmail.set(gen.to.toLowerCase().trim(), gen);
    }
  }

  const matchedKeys = new Set<string>();

  const hydrated = leads.map((lead) => {
    const key = `${lead.category}:${lead.name.toLowerCase().trim()}`;
    const emailKey = lead.email ? lead.email.toLowerCase().trim() : '';

    const match =
      genById.get(lead.id) ||
      genByKey.get(key) ||
      (emailKey ? genByEmail.get(emailKey) : undefined);

    if (match) {
      matchedKeys.add(key);
      if (match.leadId) matchedKeys.add(match.leadId);
      return {
        ...lead,
        generatedSubject: lead.generatedSubject || match.subject,
        generatedBody: lead.generatedBody || match.body,
        status:
          lead.status && lead.status !== 'idle'
            ? lead.status
            : ((match.status as any) || 'draft'),
      };
    }
    return lead;
  });

  return hydrated;
}

/* ====================================================================
   1. LEADS STORAGE (src/data/leads.json)
   ==================================================================== */
export function getSavedLeads(): CompanyLead[] {
  let leads = memoryLeads;
  if (!leads || leads.length === 0) {
    leads = safeReadJSON<CompanyLead[]>('leads.json', []);
  }

  // Always hydrate with generated emails to ensure persistence across browsers
  const generated = getGeneratedEmails();
  if (generated.length > 0 && leads.length > 0) {
    leads = hydrateLeadsWithGeneratedEmails(leads, generated);
  }

  memoryLeads = leads;
  return leads;
}

export function saveLeadsToJSON(leads: CompanyLead[]): void {
  // Safe merge with existing leads to guarantee generatedSubject and generatedBody are never erased
  const current = safeReadJSON<CompanyLead[]>('leads.json', []);
  const currentMap = new Map<string, CompanyLead>();
  for (const l of current) {
    if (l.id) currentMap.set(l.id, l);
    currentMap.set(`${l.category}:${l.name.toLowerCase().trim()}`, l);
    if (l.email) currentMap.set(l.email.toLowerCase().trim(), l);
  }

  const merged = leads.map((incoming) => {
    const key = `${incoming.category}:${incoming.name.toLowerCase().trim()}`;
    const emailKey = incoming.email ? incoming.email.toLowerCase().trim() : '';
    const existing = currentMap.get(incoming.id) || currentMap.get(key) || (emailKey ? currentMap.get(emailKey) : undefined);

    if (existing) {
      return {
        ...existing,
        ...incoming,
        // Retain generated content if incoming was blank
        generatedSubject: incoming.generatedSubject || existing.generatedSubject,
        generatedBody: incoming.generatedBody || existing.generatedBody,
        status: incoming.generatedSubject
          ? incoming.status
          : existing.generatedSubject
          ? existing.status
          : incoming.status,
        approvals:
          incoming.approvals && incoming.approvals.length > 0
            ? incoming.approvals
            : existing.approvals,
        sentAt: incoming.sentAt || existing.sentAt,
        scheduledTime: incoming.scheduledTime || existing.scheduledTime,
        chatHistory:
          incoming.chatHistory && incoming.chatHistory.length > 0
            ? incoming.chatHistory
            : existing.chatHistory,
      };
    }
    return incoming;
  });

  memoryLeads = merged;
  safeWriteJSON('leads.json', merged);
}

export function updateSingleLead(updatedLead: CompanyLead): void {
  const leads = safeReadJSON<CompanyLead[]>('leads.json', []);
  const key = `${updatedLead.category}:${updatedLead.name.toLowerCase().trim()}`;
  const idx = leads.findIndex(
    (l) => l.id === updatedLead.id || `${l.category}:${l.name.toLowerCase().trim()}` === key
  );

  let updated: CompanyLead[];
  if (idx !== -1) {
    updated = [...leads];
    updated[idx] = { ...updated[idx], ...updatedLead };
  } else {
    updated = [updatedLead, ...leads];
  }

  memoryLeads = updated;
  safeWriteJSON('leads.json', updated);

  if (updatedLead.generatedSubject && updatedLead.generatedBody) {
    saveGeneratedEmail({
      id: `gen-${updatedLead.id}`,
      leadId: updatedLead.id,
      companyName: updatedLead.name,
      category: updatedLead.category,
      to: updatedLead.email || '',
      subject: updatedLead.generatedSubject,
      body: updatedLead.generatedBody,
      model: 'gemini-3.5-flash-lite',
      status: updatedLead.status,
      generatedAt: new Date().toISOString(),
    });
  }
}

/* ====================================================================
   2. GENERATED EMAILS STORAGE (src/data/generated_emails.json)
   ==================================================================== */
export function getGeneratedEmails(): GeneratedEmailRecord[] {
  if (memoryGenerated && memoryGenerated.length > 0) return memoryGenerated;
  const records = safeReadJSON<GeneratedEmailRecord[]>('generated_emails.json', []);
  memoryGenerated = records;
  return records;
}

export function saveGeneratedEmail(record: GeneratedEmailRecord): void {
  const current = getGeneratedEmails();
  const existingIdx = current.findIndex(
    (r) =>
      r.leadId === record.leadId ||
      (r.companyName.toLowerCase().trim() === record.companyName.toLowerCase().trim() &&
        r.category === record.category)
  );

  let updated: GeneratedEmailRecord[];
  if (existingIdx !== -1) {
    updated = [...current];
    updated[existingIdx] = {
      ...updated[existingIdx],
      ...record,
      updatedAt: new Date().toISOString(),
    };
  } else {
    updated = [record, ...current];
  }

  memoryGenerated = updated;
  safeWriteJSON('generated_emails.json', updated);
}

export function saveBatchGeneratedEmails(records: GeneratedEmailRecord[]): void {
  const current = getGeneratedEmails();
  const map = new Map<string, GeneratedEmailRecord>(
    current.map((r) => [r.leadId || `${r.category}:${r.companyName.toLowerCase().trim()}`, r])
  );

  for (const rec of records) {
    const key = rec.leadId || `${rec.category}:${rec.companyName.toLowerCase().trim()}`;
    map.set(key, rec);
  }

  const updated = Array.from(map.values());
  memoryGenerated = updated;
  safeWriteJSON('generated_emails.json', updated);
}

/**
 * High-level atomic helper: saves generated email to BOTH generated_emails.json and leads.json immediately
 */
export function saveLeadGeneratedEmail(params: {
  leadId: string;
  companyName: string;
  category: CategoryKey;
  to?: string;
  subject: string;
  body: string;
  model?: string;
  status?: string;
  chatHistory?: any[];
}): void {
  // 1. Save to generated_emails.json
  const genRecord: GeneratedEmailRecord = {
    id: `gen-${params.leadId}`,
    leadId: params.leadId,
    companyName: params.companyName,
    category: params.category,
    to: params.to || '',
    subject: params.subject,
    body: params.body,
    model: params.model || 'gemini-3.5-flash-lite',
    status: params.status || 'draft',
    generatedAt: new Date().toISOString(),
  };
  saveGeneratedEmail(genRecord);

  // 2. Save directly into leads.json
  const leads = safeReadJSON<CompanyLead[]>('leads.json', []);
  const leadKey = `${params.category}:${params.companyName.toLowerCase().trim()}`;
  const idx = leads.findIndex(
    (l) => l.id === params.leadId || `${l.category}:${l.name.toLowerCase().trim()}` === leadKey
  );

  if (idx !== -1) {
    leads[idx] = {
      ...leads[idx],
      generatedSubject: params.subject,
      generatedBody: params.body,
      status: (params.status as any) || (leads[idx].status === 'idle' ? 'draft' : leads[idx].status),
      chatHistory: params.chatHistory || leads[idx].chatHistory || [],
    };
  } else {
    // If not found in leads.json, insert it
    leads.unshift({
      id: params.leadId,
      sourceSheet: 'ensi-sheet',
      category: params.category,
      name: params.companyName,
      email: params.to || '',
      phone: '',
      address: '',
      status: (params.status as any) || 'draft',
      generatedSubject: params.subject,
      generatedBody: params.body,
      chatHistory: params.chatHistory || [],
    });
  }

  memoryLeads = leads;
  safeWriteJSON('leads.json', leads);
}

/* ====================================================================
   3. SENT EMAILS STORAGE (src/data/sent_emails.json)
   ==================================================================== */
export function getSentEmails(): SentEmailRecord[] {
  if (memorySent && memorySent.length > 0) return memorySent;
  const records = safeReadJSON<SentEmailRecord[]>('sent_emails.json', []);
  memorySent = records;
  return records;
}

export function saveSentEmail(record: SentEmailRecord): void {
  const current = getSentEmails();
  const updated = [record, ...current];
  memorySent = updated;
  safeWriteJSON('sent_emails.json', updated);
}
