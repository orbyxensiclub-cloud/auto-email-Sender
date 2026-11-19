import { fetchSheetTab } from '../src/lib/sheets';

const sheetId = '1WRTAe68SDCdEBt1-4Dv8D3REDNmSqz_1y-YAF2vNVY0';

async function checkSkipped() {
  for (const tab of [
    { name: 'Centre de Formation', gid: '1806652349' },
    { name: 'Subvention Nature', gid: '0' }
  ]) {
    const rows = await fetchSheetTab(sheetId, tab.name, tab.gid);
    console.log(`\n================== ${tab.name} (Total rows: ${rows.length}) ==================`);
    let kept = 0;
    let skipped = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      let name = '';
      if (row.length >= 4) {
        // let's check all columns to see where names are
        name = row[3]?.trim() || row[0]?.trim() || '';
      } else {
        name = row[0]?.trim() || '';
      }

      const hasContent = row.some(cell => cell.trim().length > 0);
      if (!hasContent) {
        skipped++;
        continue;
      }

      console.log(`Row ${i}: length=${row.length} | cols=[${row.map(c => JSON.stringify(c.substring(0, 25))).join(', ')}]`);
    }
  }
}

checkSkipped().catch(console.error);
