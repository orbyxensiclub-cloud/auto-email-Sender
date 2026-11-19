import { fetchSheetTab } from '../src/lib/sheets';

const sheetId = '1WRTAe68SDCdEBt1-4Dv8D3REDNmSqz_1y-YAF2vNVY0';

async function inspectColumns() {
  for (const tab of [
    { name: 'Centre de Formation', gid: '1806652349' },
    { name: 'Subvention Nature', gid: '0' }
  ]) {
    const rows = await fetchSheetTab(sheetId, tab.name, tab.gid);
    console.log(`\n================== ${tab.name} ==================`);
    rows.forEach((r, idx) => {
      // Find which column has email
      const emailCol = r.findIndex(c => c.includes('@'));
      // Find company name
      const name = r[3] || r[0] || '';
      if (name.trim()) {
        console.log(`Row ${idx}: name="${name.trim()}" | emailCol=${emailCol} (${emailCol !== -1 ? r[emailCol] : 'NO EMAIL'}) | cols:`, r.filter(c => c.trim().length > 0));
      }
    });
  }
}

inspectColumns().catch(console.error);
