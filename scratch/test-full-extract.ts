import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import { fetchSheetTab } from '../src/lib/sheets';

const sheetId = '1WRTAe68SDCdEBt1-4Dv8D3REDNmSqz_1y-YAF2vNVY0';

function cleanEmail(rawEmail?: string): string {
  if (!rawEmail) return '';
  let fixed = rawEmail.replace(/["\r\n\t]/g, '').trim();
  // Fix typos
  fixed = fixed.replace(/,([a-zA-Z]{2,})/g, '.$1');
  fixed = fixed.replace(/,com/g, '.com');
  const parts = fixed.split(/[,;\s/]+/);
  for (const part of parts) {
    const clean = part.replace(/^mailto:/i, '').trim();
    if (clean.includes('@') && clean.includes('.')) {
      return clean;
    }
  }
  return fixed.includes('@') ? fixed : '';
}

function extractFormationAndFoodLeads(rows: string[][], tabTitle: string, category: 'formation' | 'food') {
  const leads = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some(c => c.trim().length > 0)) continue;

    // 1. Company name: usually col 3, fallback col 0
    let name = '';
    if (row.length >= 4 && row[3]?.trim()) {
      name = row[3].trim();
    } else if (row[0]?.trim()) {
      name = row[0].trim();
    } else {
      // Find first non-empty cell that is not Responsable/Status
      for (const cell of row) {
        const c = cell.trim();
        if (c && !c.includes('@') && !/^[0-9+\s\-/.]{7,}$/.test(c) && c !== 'FALSE' && c !== 'TRUE') {
          name = c;
          break;
        }
      }
    }

    const lower = name.toLowerCase();
    if (
      !name ||
      lower.includes("nom de l'entreprise") ||
      lower.includes("centre de formation") ||
      lower.includes("responsable") ||
      name.length < 2
    ) {
      continue;
    }

    // 2. Email: search any column
    let email = '';
    let emailCol = -1;
    for (let c = 0; c < row.length; c++) {
      const cell = row[c].trim();
      if (cell.includes('@')) {
        email = cleanEmail(cell);
        emailCol = c;
        break;
      }
    }

    // 3. Phone: search columns
    let phone = '';
    let phoneCol = -1;
    for (let c = 0; c < row.length; c++) {
      if (c === emailCol) continue;
      const cell = row[c].trim();
      if (/^[0-9+\s\-/.]{7,25}$/.test(cell)) {
        phone = cell;
        phoneCol = c;
        break;
      }
    }

    // 4. Address: usually col 6 or remaining column with text
    let address = '';
    if (row.length >= 7 && row[6]?.trim() && row[6] !== 'FALSE' && row[6] !== 'TRUE' && !row[6].includes('@')) {
      address = row[6].trim();
    } else if (row.length >= 5 && row[4]?.trim() && phoneCol !== 4 && emailCol !== 4 && row[4] !== 'FALSE') {
      address = row[4].trim();
    }

    // 5. Notes / Contact Person
    const contactPerson = row[2]?.trim() || '';
    const notes = row.length >= 9 ? row[8]?.trim() : '';

    leads.push({
      id: `${category}-${i}`,
      category,
      sourceSheet: tabTitle,
      name,
      contactPerson,
      phone,
      email,
      address,
      notes,
    });
  }
  return leads;
}

async function run() {
  const formationRows = await fetchSheetTab(sheetId, 'Centre de Formation', '1806652349');
  const formationLeads = extractFormationAndFoodLeads(formationRows, 'Centre de Formation', 'formation');
  console.log(`Formation leads extracted: ${formationLeads.length}`);
  console.log('With email:', formationLeads.filter(l => l.email).length);
  formationLeads.forEach(l => console.log(`  - ${l.name} | Email: ${l.email || 'NONE'} | Phone: ${l.phone || 'NONE'}`));

  const foodRows = await fetchSheetTab(sheetId, 'Subvention Nature', '0');
  const foodLeads = extractFormationAndFoodLeads(foodRows, 'Subvention Nature', 'food');
  console.log(`\nFood leads extracted: ${foodLeads.length}`);
  console.log('With email:', foodLeads.filter(l => l.email).length);
  foodLeads.forEach(l => console.log(`  - ${l.name} | Email: ${l.email || 'NONE'} | Phone: ${l.phone || 'NONE'}`));
}

run().catch(console.error);
