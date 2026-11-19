const sheetId = '1WRTAe68SDCdEBt1-4Dv8D3REDNmSqz_1y-YAF2vNVY0';
const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=1620843151`;

async function testFetch() {
  try {
    const res = await fetch(url);
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Got text length:', text.length);
  } catch (err: any) {
    console.error('Fetch error:', err.message, err.cause);
  }
}
testFetch();
