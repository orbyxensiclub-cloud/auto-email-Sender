import { NextRequest, NextResponse } from 'next/server';
import { extractSheetId, fetchAllSheetLeads } from '@/lib/sheets';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body.url || 'https://docs.google.com/spreadsheets/d/1WRTAe68SDCdEBt1-4Dv8D3REDNmSqz_1y-YAF2vNVY0/edit?usp=sharing';
    
    const sheetId = extractSheetId(url);
    if (!sheetId) {
      return NextResponse.json(
        { error: 'Invalid Google Spreadsheet URL. Please verify the URL structure.' },
        { status: 400 }
      );
    }

    const result = await fetchAllSheetLeads(sheetId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching sheet:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while fetching Google Sheet' },
      { status: 500 }
    );
  }
}
