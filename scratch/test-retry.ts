import { parseCSV } from '../src/lib/sheets';

const sheetId = '1WRTAe68SDCdEBt1-4Dv8D3REDNmSqz_1y-YAF2vNVY0';

async function fetchWithRetry(url: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeout);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.text();
    } catch (err: any) {
      console.warn(`Attempt ${attempt} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error('All retries failed');
}

async function testFetch() {
  const tabs = [
    { title: 'ensi-sheet', gid: '1620843151' },
    { title: 'Centre de Formation', gid: '1806652349' },
    { title: 'Subvention Nature', gid: '0' },
  ];

  for (const t of tabs) {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${t.gid}`;
    console.log(`Fetching ${t.title}...`);
    const csv = await fetchWithRetry(url);
    const rows = parseCSV(csv);
    console.log(`Success ${t.title}: ${rows.length} rows`);
  }
}

testFetch().catch(console.error);
