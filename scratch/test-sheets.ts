import { fetchAllSheetLeads } from '../src/lib/sheets';

const sheetId = '1WRTAe68SDCdEBt1-4Dv8D3REDNmSqz_1y-YAF2vNVY0';

async function main() {
  console.log('Fetching sheet leads for sheetId:', sheetId);
  const res = await fetchAllSheetLeads(sheetId);
  console.log('Stats:', res.stats);
  console.log('Errors:', res.errors);
  console.log('Total leads:', res.leads.length);
  const byCat: Record<string, number> = {};
  for (const l of res.leads) {
    byCat[l.category] = (byCat[l.category] || 0) + 1;
  }
  console.log('By category:', byCat);
  const formation = res.leads.filter(l => l.category === 'formation');
  console.log('Formation count:', formation.length, 'sample:', formation.slice(0, 3).map(l => ({ name: l.name, email: l.email, phone: l.phone })));
  const food = res.leads.filter(l => l.category === 'food');
  console.log('Food count:', food.length, 'sample:', food.slice(0, 3).map(l => ({ name: l.name, email: l.email, phone: l.phone })));
}

main().catch(console.error);
