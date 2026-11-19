import { NextRequest, NextResponse } from 'next/server';

export interface GeminiKeyItem {
  id: string;
  name: string;
  key: string;
  enabled: boolean;
}

export async function GET() {
  const keys: GeminiKeyItem[] = [];

  // Known named keys
  if (process.env.GEMINI_API_KEY_AMIR) {
    keys.push({
      id: 'amir',
      name: 'AMIR',
      key: process.env.GEMINI_API_KEY_AMIR,
      enabled: true,
    });
  }
  if (process.env.GEMINI_API_KEY_YASSIN) {
    keys.push({
      id: 'yassin',
      name: 'YASSIN',
      key: process.env.GEMINI_API_KEY_YASSIN,
      enabled: true,
    });
  }
  if (process.env.GEMINI_API_KEY_JASSER) {
    keys.push({
      id: 'jasser',
      name: 'JASSER',
      key: process.env.GEMINI_API_KEY_JASSER,
      enabled: true,
    });
  }
  if (process.env.GEMINI_API_KEY_MANAR) {
    keys.push({
      id: 'manar',
      name: 'MANAR',
      key: process.env.GEMINI_API_KEY_MANAR,
      enabled: true,
    });
  }

  // Scan any other GEMINI_API_KEY_* in environment
  for (const [envKey, envVal] of Object.entries(process.env)) {
    if (
      envKey.startsWith('GEMINI_API_KEY_') &&
      !['GEMINI_API_KEY_AMIR', 'GEMINI_API_KEY_YASSIN', 'GEMINI_API_KEY_JASSER', 'GEMINI_API_KEY_MANAR'].includes(envKey) &&
      envVal
    ) {
      const name = envKey.replace('GEMINI_API_KEY_', '');
      keys.push({
        id: name.toLowerCase(),
        name: name,
        key: envVal,
        enabled: true,
      });
    }
  }

  // Default key
  if (process.env.GEMINI_API_KEY) {
    keys.push({
      id: 'default',
      name: 'ORBYX PRINCIPALE',
      key: process.env.GEMINI_API_KEY,
      enabled: true,
    });
  }

  return NextResponse.json({ keys });
}
