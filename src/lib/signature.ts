export interface SignatureOptions {
  name?: string;
  role?: string;
  phone?: string;
  forWebPreview?: boolean;
}

export function getSignatureHtml(options: SignatureOptions = {}): string {
  const name = options.name || 'Jasser Ben Jomaa';
  const role = options.role || 'Responsable Sponsoring';
  const phone = options.phone || '58745567';
  const isWeb = !!options.forWebPreview;

  const logoSrc = isWeb ? '/images/signature/ii_1a1e5e0d0e006.png' : 'cid:ii_1a1e5e0d0e006';
  const phoneSrc = isWeb ? '/images/signature/ii_1a1e5e0d0e307.png' : 'cid:ii_1a1e5e0d0e307';
  const fbSrc = isWeb ? '/images/signature/ii_1a1e5e0d0e308.png' : 'cid:ii_1a1e5e0d0e308';
  const igSrc = isWeb ? '/images/signature/ii_1a1e5e0d0e309.png' : 'cid:ii_1a1e5e0d0e309';
  const liSrc = isWeb ? '/images/signature/ii_1a1e5e0d0e40a.png' : 'cid:ii_1a1e5e0d0e40a';

  return `
<div dir="ltr" class="gmail_signature" data-smartmail="gmail_signature">
  <div dir="ltr">
    <table style="border-width:medium;border-style:none;border-color:currentcolor;border-collapse:collapse;margin-top:20px;width:600px;">
      <colgroup><col width="300"><col width="300"></colgroup>
      <thead>
        <tr>
          <th style="border-right:0.5pt solid rgb(0,0,0);vertical-align:top;padding:5pt 15pt 5pt 5pt;overflow:hidden;text-align:left;font-weight:normal;" scope="col">
            <p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">
              <span style="display:inline-block;overflow:hidden;width:330px;height:168px">
                <img src="${logoSrc}" width="330" height="168" alt="ORBYX ENSI CLUB" style="margin-left:0px;margin-top:0px;display:block;">
              </span>
            </p>
            <p dir="ltr" style="line-height:1.38;margin-top:4pt;margin-bottom:0pt">
              <span style="font-size:13pt;font-family:Archivo,Arial,sans-serif;color:rgb(0,0,0);font-weight:bold;">ORBYX ENSI CLUB</span>
            </p>
            <p dir="ltr" style="line-height:1.38;margin-top:2pt;margin-bottom:0pt">
              <span style="font-size:11pt;font-family:Arial,sans-serif;color:rgb(0,0,0);">${name}</span>
            </p>
            <p dir="ltr" style="line-height:1.38;margin-top:2pt;margin-bottom:0pt">
              <span style="font-size:11pt;font-family:Arial,sans-serif;color:rgb(80,80,80);">${role}</span>
            </p>
          </th>
          <th style="border-left:0.5pt solid rgb(0,0,0);vertical-align:middle;padding:5pt 10pt;overflow:hidden;text-align:center;font-weight:normal;" scope="col">
            <p style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;text-align:center;">
              <span style="display:inline-block;overflow:hidden;width:30px;height:27px;vertical-align:middle;margin-right:4px;">
                <img src="${phoneSrc}" width="30" height="27" alt="Phone" style="margin-left:0px;margin-top:4px">
              </span>
              <span style="font-size:16pt;font-family:Arial,sans-serif;color:rgb(0,0,0);font-weight:500;vertical-align:middle;">${phone}</span>
            </p>
            <p style="line-height:1.2;margin-top:8pt;margin-bottom:0pt;text-align:center;">
              <a href="https://ieee.tn/venue/r377fgr%D8%8C-campus-universitaire-de-manouba-2010-tunis-manouba-tunisia-2021/" style="text-decoration:none" target="_blank">
                <span style="font-size:14pt;font-family:Arial,sans-serif;color:rgb(17,85,204);text-decoration:underline;">National School of</span>
              </a>
            </p>
            <p style="line-height:1.2;margin-top:2pt;margin-bottom:0pt;text-align:center;">
              <a href="https://www.google.com/maps/dir//R377%2BFGR%D8%8C+Campus+Universitaire+de,+Manouba+2010,+Tunisia,+Tunisia%E2%80%AD/@36.6822204,10.4343939,12z?entry=ttu&amp;g_ep=EgoyMDI2MDYwMS4wIKXMDSoASAFQAw%3D%3D" style="text-decoration:none" target="_blank">
                <span style="font-size:14pt;font-family:Arial,sans-serif;color:rgb(17,85,204);text-decoration:underline;">Computer Science</span>
              </a>
            </p>
            <p style="line-height:1.2;margin-top:12pt;margin-bottom:0pt;text-align:center;">
              <a href="https://www.facebook.com/share/18f9Q5asNW/" style="text-decoration:none;display:inline-block;margin-right:8px;" target="_blank">
                <span style="display:inline-block;overflow:hidden;width:36px;height:38px">
                  <img src="${fbSrc}" width="36" height="38" alt="Facebook" style="margin-left:0px;margin-top:0px">
                </span>
              </a>
              <a href="https://www.instagram.com/orbyx_ensi_club" style="text-decoration:none;display:inline-block;margin-right:8px;" target="_blank">
                <span style="display:inline-block;overflow:hidden;width:47px;height:42px">
                  <img src="${igSrc}" width="47" height="42" alt="Instagram" style="margin-left:0px;margin-top:2px">
                </span>
              </a>
              <a href="https://www.linkedin.com/in/orbyx-ensi-club-057abb373?utm_source=share_via&amp;utm_content=profile&amp;utm_medium=member_android" style="text-decoration:none;display:inline-block;" target="_blank">
                <span style="display:inline-block;overflow:hidden;width:46px;height:42px">
                  <img src="${liSrc}" width="46" height="42" alt="LinkedIn" style="margin-left:0px;margin-top:2px">
                </span>
              </a>
            </p>
          </th>
        </tr>
      </thead>
    </table>
  </div>
</div>
`.trim();
}

/**
 * Strips any trailing plain-text signature blocks after "Bien cordialement,"
 * to avoid duplication with the official graphical ORBYX signature table.
 */
export function stripTrailingTextSignature(text: string): string {
  if (!text) return '';
  const marker = 'Bien cordialement,';
  const idx = text.indexOf(marker);
  if (idx !== -1) {
    const after = text.substring(idx + marker.length);
    if (
      after.includes('Jasser') ||
      after.includes('Sponsoring') ||
      after.includes('53989316') ||
      after.includes('58745567') ||
      after.includes('ORBYX') ||
      after.includes('Seif')
    ) {
      return text.substring(0, idx + marker.length).trim();
    }
  }
  return text;
}
