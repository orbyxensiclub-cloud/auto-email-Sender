import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

const sheetId = '1WRTAe68SDCdEBt1-4Dv8D3REDNmSqz_1y-YAF2vNVY0';

async function testDns() {
  const start = Date.now();
  console.log('Testing with ipv4first...');
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=1620843151`);
  console.log(`Connected in ${Date.now() - start}ms! Status:`, res.status);
  const text = await res.text();
  console.log(`Downloaded ${text.length} chars!`);
}

testDns().catch(console.error);
