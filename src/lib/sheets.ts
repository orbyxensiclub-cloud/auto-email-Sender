import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

export type CategoryKey = 'ensi' | 'formation' | 'food';

export interface ApprovalRecord {
  reviewerName: string;
  timestamp: string;
}

export interface LeadAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  path?: string;
}

export interface CompanyLead {
  id: string;
  sourceSheet: 'ensi-sheet' | 'Centre de Formation' | 'Subvention Nature';
  category: CategoryKey;
  name: string;
  email: string;
  phone: string;
  address: string;
  contactPerson?: string;
  fax?: string;
  notes?: string;

  // Workflow status & multi-person approval
  status: 'idle' | 'generating' | 'draft' | 'pending_approval' | 'accepted' | 'refused' | 'scheduled' | 'sent' | 'failed';
  approvals?: ApprovalRecord[];
  refusedBy?: { reviewerName: string; timestamp: string };
  generatedSubject?: string;
  generatedBody?: string;
  scheduledTime?: string;
  sentAt?: string;
  error?: string;

  // Attachments specific to this lead
  customAttachments?: LeadAttachment[];
  excludeGlobalAttachments?: boolean;

  // AI Chat history for this specific email
  chatHistory: Array<{
    id: string;
    sender: 'user' | 'assistant';
    text: string;
    timestamp: string;
  }>;
}

export interface SheetParseResult {
  sheetId: string;
  leads: CompanyLead[];
  stats: {
    total: number;
    withEmail: number;
    ensi: number;
    formation: number;
    food: number;
  };
  errors?: string[];
}

/**
 * Extract Google Sheet ID from any standard Google Sheets URL.
 */
export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Robust CSV Line Parser that respects quoted values and multiline items.
 */
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // handle CRLF
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some((col) => col.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((col) => col.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Clean and normalize email strings.
 */
function cleanEmail(rawEmail?: string): string {
  if (!rawEmail) return '';
  let trimmed = rawEmail.replace(/["\r\n\t]/g, '').trim();

  // Fix common TLD typos: ,tn -> .tn, ,com -> .com, ,com,tn -> .com.tn
  trimmed = trimmed.replace(/,com,tn/gi, '.com.tn');
  trimmed = trimmed.replace(/,tn/gi, '.tn');
  trimmed = trimmed.replace(/,com/gi, '.com');
  trimmed = trimmed.replace(/,net/gi, '.net');

  // Split on semicolon, space, or slash if multiple
  const parts = trimmed.split(/[;\s/]+/);
  for (const part of parts) {
    const clean = part.replace(/^mailto:/i, '').trim();
    if (clean.includes('@') && clean.includes('.')) {
      return clean;
    }
  }
  return trimmed;
}

/**
 * Fetch and parse a specific Google Sheet tab as CSV.
 * Supports fetching by sheet title or by gid.
 */
export async function fetchSheetTab(sheetId: string, sheetTitle: string, gid?: string): Promise<string[][]> {
  let url: string;
  if (gid) {
    url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  } else {
    const encodedTitle = encodeURIComponent(sheetTitle);
    url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedTitle}`;
  }
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet "${sheetTitle}": ${res.statusText}`);
  }
  const text = await res.text();
  return parseCSV(text);
}

/**
 * Fetch all 3 categories (4 tabs) from Google Sheets and normalize into CompanyLead records.
 */
export async function fetchAllSheetLeads(sheetId: string): Promise<SheetParseResult> {
  const tabs = [
    { title: 'ensi-sheet', category: 'ensi' as CategoryKey, source: 'ensi-sheet' as const, gid: '1620843151' },
    { title: 'Centre de Formation', category: 'formation' as CategoryKey, source: 'Centre de Formation' as const, gid: '1806652349' },
    { title: 'Subvention Nature', category: 'food' as CategoryKey, source: 'Subvention Nature' as const, gid: '0' },
  ];

  const leads: CompanyLead[] = [];
  const errors: string[] = [];

  for (const tab of tabs) {
    try {
      const rows = await fetchSheetTab(sheetId, tab.title, (tab as any).gid);
      if (rows.length < 2) continue;

      if (tab.source === 'ensi-sheet') {
        // Headers: "Nom de l'entreprise", "Adresse", "Téléphone", "Fax", "Email entreprise"
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const name = row[0]?.trim();
          if (!name || name.toLowerCase().includes("nom de l'entreprise")) continue;

          const address = row[1]?.trim() || '';
          const phone = row[2]?.trim() || '';
          const fax = row[3]?.trim() || '';
          const email = cleanEmail(row[4]);

          leads.push({
            id: `ensi-${i}-${Math.random().toString(36).substring(2, 7)}`,
            sourceSheet: tab.source,
            category: tab.category,
            name,
            address,
            phone,
            fax,
            email,
            status: 'idle',
            chatHistory: [],
          });
        }
      } else {
        // Headers: [empty, empty, Responsable, Nom/Centre, Tel, Mail, Adresse, Contacté, Remarques]
        // Some rows have shifted columns (e.g. email in col 7 instead of col 5)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];

          // Skip empty/FALSE-only rows
          const hasContent = row.some((cell) => cell && cell !== 'FALSE' && cell.trim().length > 1);
          if (!hasContent) continue;

          let name = '';
          let contactPerson = '';
          let phone = '';
          let email = '';
          let address = '';
          let notes = '';

          // Dynamically find the email: scan all columns for '@'
          let emailColIdx = -1;
          for (let c = 0; c < row.length; c++) {
            if (row[c]?.includes('@')) {
              emailColIdx = c;
              break;
            }
          }

          if (row.length >= 6) {
            contactPerson = row[2]?.trim() || '';
            name = row[3]?.trim() || '';

            if (emailColIdx === 5) {
              // Standard layout: col 4=Tel, col 5=Mail, col 6=Adresse
              phone = row[4]?.trim() || '';
              email = cleanEmail(row[5]);
              address = row[6]?.trim() || '';
            } else if (emailColIdx === 7 || emailColIdx === 6) {
              // Shifted layout (like coaching academy): col 4=address, col 5/6=phone, col 7=email
              address = row[4]?.trim() || '';
              phone = row[5]?.trim() || '';
              email = cleanEmail(row[emailColIdx]);
            } else if (emailColIdx >= 0) {
              // Email found in unexpected column
              email = cleanEmail(row[emailColIdx]);
              phone = row[4]?.trim() || '';
              address = row[6]?.trim() || '';
            } else {
              // No email found in any column
              phone = row[4]?.trim() || '';
              address = row[6]?.trim() || '';
            }

            notes = row[8]?.trim() || '';
          } else {
            name = row[0]?.trim() || '';
            email = cleanEmail(row[1]);
          }

          // Skip header rows or rows without a name
          if (!name || name.toLowerCase().includes("nom de l'entreprise") || name.toLowerCase().includes('centre de formation') && name.length < 25 || name.length < 2) continue;
          // Skip if the name looks like it's a re-parsed header
          if (name.toLowerCase().includes('patisserie')) continue;

          leads.push({
            id: `${tab.category}-${i}-${Math.random().toString(36).substring(2, 7)}`,
            sourceSheet: tab.source,
            category: tab.category,
            name,
            contactPerson,
            address,
            phone,
            email,
            notes,
            status: 'idle',
            chatHistory: [],
          });
        }
      }
    } catch (err: any) {
      errors.push(`Error loading tab "${tab.title}": ${err.message}`);
    }
  }

  // Calculate statistics
  const stats = {
    total: leads.length,
    withEmail: leads.filter((l) => l.email && l.email.includes('@')).length,
    ensi: leads.filter((l) => l.category === 'ensi').length,
    formation: leads.filter((l) => l.category === 'formation').length,
    food: leads.filter((l) => l.category === 'food').length,
  };

  return {
    sheetId,
    leads,
    stats,
    errors: errors.length > 0 ? errors : undefined,
  };
}
