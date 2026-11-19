import path from 'path';
import fs from 'fs';

export interface EmailAttachment {
  filename: string;
  path: string;
  contentType?: string;
  cid?: string;
}

export interface StoredAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
  enabled: boolean;
  isDefault?: boolean;
}

function getGlobalAttachmentsFilePath(): string {
  return path.join(process.cwd(), 'src', 'data', 'global_attachments.json');
}

export function getDefaultGlobalAttachment(): StoredAttachment {
  const fileName = 'Dossier de Sponsoring — ORBYX ML Challenge 2.0.pdf';
  const localDocsPath = path.join(process.cwd(), 'public', 'docs', fileName);
  let size = 4313865;
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ localDocsPath)) {
      size = fs.statSync(/*turbopackIgnore: true*/ localDocsPath).size;
    }
  } catch {}

  return {
    id: 'default-dossier-sponsoring',
    name: fileName,
    size,
    type: 'application/pdf',
    url: `/docs/${encodeURIComponent(fileName)}`,
    path: localDocsPath,
    enabled: true,
    isDefault: true,
  };
}

export function getGlobalAttachments(): StoredAttachment[] {
  const filePath = getGlobalAttachmentsFilePath();
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      const content = fs.readFileSync(/*turbopackIgnore: true*/ filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  const defaultAtt = getDefaultGlobalAttachment();
  return [defaultAtt];
}

export function saveGlobalAttachments(attachments: StoredAttachment[]): void {
  const filePath = getGlobalAttachmentsFilePath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
    }
    fs.writeFileSync(/*turbopackIgnore: true*/ filePath, JSON.stringify(attachments, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save global attachments to JSON:', err);
  }
}

export function getSignatureAttachments(): EmailAttachment[] {
  const baseDir = path.join(process.cwd(), 'public', 'images', 'signature');
  return [
    {
      filename: 'orbyx_logo.png',
      path: path.join(baseDir, 'ii_1a1e5e0d0e006.png'),
      cid: 'ii_1a1e5e0d0e006',
    },
    {
      filename: 'phone.png',
      path: path.join(baseDir, 'ii_1a1e5e0d0e307.png'),
      cid: 'ii_1a1e5e0d0e307',
    },
    {
      filename: 'facebook.png',
      path: path.join(baseDir, 'ii_1a1e5e0d0e308.png'),
      cid: 'ii_1a1e5e0d0e308',
    },
    {
      filename: 'instagram.png',
      path: path.join(baseDir, 'ii_1a1e5e0d0e309.png'),
      cid: 'ii_1a1e5e0d0e309',
    },
    {
      filename: 'linkedin.png',
      path: path.join(baseDir, 'ii_1a1e5e0d0e40a.png'),
      cid: 'ii_1a1e5e0d0e40a',
    },
  ];
}

/**
 * Resolves an attachment file's absolute path on disk safely
 */
export function resolveAttachmentDiskPath(att: {
  name?: string;
  filename?: string;
  path?: string;
  url?: string;
}): string | null {
  const candidatePaths: string[] = [];

  if (att.path) {
    candidatePaths.push(att.path);
  }

  const name = att.filename || att.name;
  if (name) {
    candidatePaths.push(path.join(process.cwd(), 'public', 'uploads', name));
    candidatePaths.push(path.join(process.cwd(), 'public', 'docs', name));
  }

  if (att.url) {
    const cleanUrl = decodeURIComponent(att.url.replace(/^\/+/, ''));
    candidatePaths.push(path.join(process.cwd(), 'public', cleanUrl));
  }

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
        return p;
      }
    } catch {}
  }

  return null;
}

/**
 * Builds the complete attachment list for Nodemailer:
 * 1) Signature graphical CIDs
 * 2) Active Global attachments (unless excludeGlobal is true)
 * 3) Any custom local attachments specific to this lead/email
 */
export function getEffectiveEmailAttachments(params?: {
  customAttachments?: Array<{ id?: string; name?: string; filename?: string; path?: string; url?: string; type?: string }>;
  excludeGlobal?: boolean;
}): EmailAttachment[] {
  const attachments: EmailAttachment[] = [...getSignatureAttachments()];

  // 1. Add enabled global attachments
  if (!params?.excludeGlobal) {
    const globals = getGlobalAttachments();
    for (const g of globals) {
      if (g.enabled) {
        const resolvedPath = resolveAttachmentDiskPath(g);
        if (resolvedPath) {
          attachments.push({
            filename: g.name,
            path: resolvedPath,
            contentType: g.type || 'application/pdf',
          });
        }
      }
    }
  }

  // 2. Add local / specific custom attachments
  if (params?.customAttachments && Array.isArray(params.customAttachments)) {
    for (const c of params.customAttachments) {
      const resolvedPath = resolveAttachmentDiskPath(c);
      const name = c.filename || c.name || 'document';
      if (resolvedPath) {
        // Prevent adding duplicate filename if already present from globals
        const alreadyAdded = attachments.some(
          (a) => a.filename.toLowerCase() === name.toLowerCase() && !a.cid
        );
        if (!alreadyAdded) {
          attachments.push({
            filename: name,
            path: resolvedPath,
            contentType: c.type || 'application/octet-stream',
          });
        }
      }
    }
  }

  return attachments;
}
