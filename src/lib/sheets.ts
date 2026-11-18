export type CategoryKey = 'ensi' | 'sponsorship' | 'formation' | 'food';

export interface ApprovalRecord {
  reviewerName: string;
  timestamp: string;
}

export interface CompanyLead {
  id: string;
  sourceSheet: 'ensi-sheet' | 'Entreprises et Startups' | 'Centre de Formation' | 'Subvention Nature';
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
    sponsorship: number;
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
  const trimmed = rawEmail.replace(/["\r\n\t]/g, '').trim();
  // Split on comma, slash, space, or semicolon if multiple
  const parts = trimmed.split(/[,;\s/]+/);
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
    { title: 'Entreprises et Startups', category: 'sponsorship' as CategoryKey, source: 'Entreprises et Startups' as const, gid: '304578520' },
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
        // Headers: [empty, empty, Responsable, Nom de l'entreprise..., Tel, Mail, Adresse, Contacté, Remarques]
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          // Find company name - usually col 3 or col 0 if formatted differently
          let name = '';
          let contactPerson = '';
          let phone = '';
          let email = '';
          let address = '';
          let notes = '';

          if (row.length >= 6) {
            contactPerson = row[2]?.trim() || '';
            name = row[3]?.trim() || '';
            phone = row[4]?.trim() || '';
            email = cleanEmail(row[5]);
            address = row[6]?.trim() || '';
            notes = row[8]?.trim() || '';
          } else {
            name = row[0]?.trim() || '';
            email = cleanEmail(row[1]);
          }

          if (!name || name.toLowerCase().includes("nom de l'entreprise") || name.length < 2) continue;

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
    sponsorship: leads.filter((l) => l.category === 'sponsorship').length,
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
