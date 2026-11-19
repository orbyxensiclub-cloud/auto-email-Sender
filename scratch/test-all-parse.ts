import { fetchSheetTab } from '../src/lib/sheets';

const sheetId = '1WRTAe68SDCdEBt1-4Dv8D3REDNmSqz_1y-YAF2vNVY0';

function cleanEmail(rawEmail?: string): string {
  if (!rawEmail) return '';
  let fixed = rawEmail.replace(/["\r\n\t]/g, '').trim();
  // Fix typos like contact@deeplearn,tn or sotucho@sotucho,com,tn
  fixed = fixed.replace(/,([a-zA-Z]{2,})/g, '.$1');
  const parts = fixed.split(/[,;\s/]+/);
  for (const part of parts) {
    const clean = part.replace(/^mailto:/i, '').trim();
    if (clean.includes('@') && clean.includes('.')) {
      return clean;
    }
  }
  return fixed.includes('@') ? fixed : '';
}

function parseRow(row: string[], category: string) {
  // If row has no content, skip
  if (!row.some(c => c.trim().length > 0)) return null;

  // Find email in any column
  let email = '';
  let emailColIdx = -1;
  for (let c = 0; c < row.length; c++) {
    const cell = row[c].trim();
    if (cell.includes('@')) {
      email = cleanEmail(cell);
      emailColIdx = c;
      break;
    }
  }

  // Find company name:
  // usually col 3 in formation/food, or col 0 if formatted differently
  let name = '';
  if (row.length >= 4 && row[3]?.trim()) {
    name = row[3].trim();
  } else if (row[0]?.trim()) {
    name = row[0].trim();
  }

  // Filter out header rows
  const lower = name.toLowerCase();
  if (
    !name ||
    lower.includes("nom de l'entreprise") ||
    lower.includes("centre de formation") ||
    lower.includes("responsable") ||
    name.length < 2
  ) {
    return null;
  }

  // Phone
  let phone = '';
  // Check typical phone cols: 4, 5, 2
  for (let c = 0; c < row.length; c++) {
    if (c === emailColIdx) continue;
    const cell = row[c].trim();
    if (/^[0-9+\s\-/.]{7,25}$/.test(cell)) {
      phone = cell;
      break;
    }
  }

  // Address: look for address text
  let address = '';
  if (row.length >= 7 && row[6]?.trim() && !row[6].includes('@')) {
    address = row[6].trim();
  } else if (row.length >= 5 && row[4]?.trim() && !row[4].includes('@') && !phone.includes(row[4].trim())) {
    address = row[4].trim();
  }

  return { name, email, phone, address };
}

async function testAll() {
  const tabs = [
    { title: 'Centre de Formation', category: 'formation', gid: '1806652349' },
    { title: 'Subvention Nature', category: 'food', gid: '0' },
  ];

  for (const t of tabs) {
    const rows = await fetchSheetTab(sheetId, t.title, t.gid);
    const leads = [];
    for (let i = 1; i < rows.length; i++) {
      const parsed = parseRow(rows[i], t.category);
      if (parsed) leads.push(parsed);
    }
    console.log(`Tab: ${t.title} -> Extracted ${leads.length} leads:`);
    console.log(leads.map(l => `${l.name} | ${l.email || 'NO EMAIL'} | ${l.phone || 'NO PHONE'}`).join('\n'));
  }
}

testAll().catch(console.error);
