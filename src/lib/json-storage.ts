import fs from 'fs';
import path from 'path';
import { CompanyLead } from './sheets';

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

  // 1. Check /tmp on serverless environments
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ tmp)) {
      const content = fs.readFileSync(/*turbopackIgnore: true*/ tmp, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch {}

  // 2. Check local project data directory
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ local)) {
      const content = fs.readFileSync(/*turbopackIgnore: true*/ local, 'utf-8');
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

  // Always write to /tmp on serverless/Linux
  try {
    fs.writeFileSync(/*turbopackIgnore: true*/ tmp, jsonString, 'utf-8');
  } catch {}
}

/* ====================================================================
   1. LEADS STORAGE (src/data/leads.json)
   ==================================================================== */
export function getSavedLeads(): CompanyLead[] {
  if (memoryLeads && memoryLeads.length > 0) return memoryLeads;
  const leads = safeReadJSON<CompanyLead[]>('leads.json', []);
  memoryLeads = leads;
  return leads;
}

export function saveLeadsToJSON(leads: CompanyLead[]): void {
  memoryLeads = leads;
  safeWriteJSON('leads.json', leads);
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
  const existingIdx = current.findIndex((r) => r.leadId === record.leadId || (r.companyName === record.companyName && r.category === record.category));

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
  const map = new Map<string, GeneratedEmailRecord>(current.map((r) => [r.leadId || `${r.category}:${r.companyName}`, r]));

  for (const rec of records) {
    const key = rec.leadId || `${rec.category}:${rec.companyName}`;
    map.set(key, rec);
  }

  const updated = Array.from(map.values());
  memoryGenerated = updated;
  safeWriteJSON('generated_emails.json', updated);
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
