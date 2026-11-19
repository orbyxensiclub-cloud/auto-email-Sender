import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import { fetchSheetTab, parseCSV } from '../src/lib/sheets';

const sheetId = '1WRTAe68SDCdEBt1-4Dv8D3REDNmSqz_1y-YAF2vNVY0';

function cleanEmail(rawEmail?: string): string {
  if (!rawEmail) return '';
  let fixed = rawEmail.replace(/["\r\n\t]/g, '').trim();
  // Fix common typos in CSV
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

async function testAll() {
  const tabs = [
    { title: 'ensi-sheet', gid: '1620843151' },
    { title: 'Centre de Formation', gid: '1806652349' },
    { title: 'Subvention Nature', gid: '0' },
  ];

  for (const t of tabs) {
    const start = Date.now();
    const rows = await fetchSheetTab(sheetId, t.title, t.gid);
    console.log(`Tab: ${t.title} fetched in ${Date.now() - start}ms! Rows count: ${rows.length}`);
  }
}

testAll().catch(console.error);
