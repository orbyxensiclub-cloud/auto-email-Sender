const sheetId = '1WRTAe68SDCdEBt1-4Dv8D3REDNmSqz_1y-YAF2vNVY0';

async function listTabs() {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing`);
  const html = await res.text();
  
  // Find any gid numbers
  const gids = [...html.matchAll(/gid=([0-9]+)/g)].map(m => m[1]);
  console.log('Unique GIDs in HTML:', [...new Set(gids)]);

  // Check if gviz tq works
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  const gvizRes = await fetch(gvizUrl);
  console.log('gviz status:', gvizRes.status);
  const gvizText = await gvizRes.text();
  console.log('gviz length:', gvizText.length, 'preview:', gvizText.substring(0, 300));
}

listTabs().catch(console.error);
