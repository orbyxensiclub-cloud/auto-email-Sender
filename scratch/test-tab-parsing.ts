import { fetchSheetTab, parseCSV } from '../src/lib/sheets';

const sheetId = '1WRTAe68SDCdEBt1-4Dv8D3REDNmSqz_1y-YAF2vNVY0';

async function testTabs() {
  for (const tab of [
    { name: 'Centre de Formation', gid: '1806652349' },
    { name: 'Subvention Nature', gid: '0' }
  ]) {
    try {
      const rows = await fetchSheetTab(sheetId, tab.name, tab.gid);
      console.log('Tab:', tab.name, 'rows count:', rows.length);
      console.log('Header row:', rows[0]);
      console.log('Row 1:', rows[1]);
      console.log('Row 2:', rows[2]);
    } catch (e: any) {
      console.error('Error for tab', tab.name, e.message);
    }
  }
}

testTabs().catch(console.error);
