import { NextRequest, NextResponse } from 'next/server';
const { PDFParse } = require('pdf-parse');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse the PDF using pdf-parse v2.4.5
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    const text = data.text;

    // Split text into lines
    console.log('--- EMPIEZA TEXTO DEL PDF ---');
    console.log(text.substring(0, 1500));
    console.log('--- TERMINA TEXTO DEL PDF ---');
    
    const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);

    // Heuristic regex to find transactions
    // 1. Generic format: Date (12/05/2023), Description, Amount (-123.45)
    const genericRegex = /^(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\s+(.+?)\s+([-+]?(?:\d{1,3}[.,])*\d{1,3}(?:[.,]\d{1,2})?)$/i;
    // 2. Davivienda format: DD MM $ AMOUNT[+-] DOC_NUMBER DESCRIPTION (e.g. 01 03 $ 90,000.00+ 1264 Transferencia)
    const daviviendaRegex = /^(\d{2})\s+(\d{2})\s+\$\s*([\d.,]+)([+-])\s+(?:\d+\s+)?(.+)$/i;
    
    const results = [];
    
    for (const line of lines) {
      // Check generic format
      const matchGen = line.match(genericRegex);
      if (matchGen) {
        results.push({
          Fecha: matchGen[1],
          Descripción: matchGen[2].trim(),
          Monto: matchGen[3],
        });
        continue;
      }
      
      // Check Davivienda format
      const matchDav = line.match(daviviendaRegex);
      if (matchDav) {
        const day = matchDav[1];
        const month = matchDav[2];
        const amountStr = matchDav[3];
        const sign = matchDav[4];
        const desc = matchDav[5];
        results.push({
          Fecha: `${day}/${month}`,
          Descripción: desc.trim(),
          Monto: sign === '-' ? `-${amountStr}` : amountStr,
        });
        continue;
      }
    }

    // Check Porvenir format block extraction if no line-by-line matches were found
    if (results.length === 0 && (text.includes('PORVENIR S.A.') || text.includes('Valor\nAporte') || text.includes('Valor Aporte') || text.includes('del aporte'))) {
      const pages = text.split(/-- \d+ of \d+ --/);
      for (const page of pages) {
        const pageLines = page.split('\n').map((l: string) => l.trim()).filter(Boolean);
        let startObj = pageLines.indexOf('Objetivo');
        let startDates = pageLines.indexOf('Portafolio');
        let startVal = pageLines.findIndex((l: string, idx: number) => l === 'Fecha' && pageLines[idx+1] === 'del aporte');
        
        if (startObj !== -1 && startDates !== -1 && startVal !== -1) {
          const objs = [];
          let cur = startObj + 1;
          while(cur < startDates) {
              if (pageLines[cur] === 'Dolar' || pageLines[cur] === 'Dias' || pageLines[cur] === 'Dinamico') {
                  if (objs.length > 0) objs[objs.length - 1] += ' ' + pageLines[cur];
              } else if (pageLines[cur] !== 'Portafolio') {
                  objs.push(pageLines[cur]);
              }
              cur++;
          }
          
          const dates = [];
          cur = startDates + 1;
          while(cur < startVal) {
              if (pageLines[cur].match(/^\d{2}-\d{2}-\d{4}$/)) {
                  dates.push(pageLines[cur]);
              }
              cur++;
          }
          
          const amounts = [];
          cur = startVal + 2;
          while(cur < pageLines.length) {
              if (pageLines[cur].match(/^\$[0-9,]+\.\d{2}$/)) {
                  amounts.push(pageLines[cur]);
              }
              if (pageLines[cur] === 'Valor' && pageLines[cur+1] === 'Aporte') {
                  break; // Stop when the next column headers begin
              }
              cur++;
          }
          
          const minLen = Math.min(objs.length, dates.length, amounts.length);
          for (let i = 0; i < minLen; i++) {
              results.push({
                  Fecha: dates[i],
                  Descripción: objs[i],
                  Monto: amounts[i],
              });
          }
        }
      }
    }

    // Fallback logic
    if (results.length === 0) {
      const dateRegex = /^(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (dateRegex.test(line)) {
          const matchFull = line.match(/^(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\s*(.*)\s+([-+]?(?:\d{1,3}[.,])*\d{1,3}(?:[.,]\d{1,2})?)$/);
          if (matchFull) {
            results.push({
              Fecha: matchFull[1],
              Descripción: matchFull[2].trim() || 'Transacción',
              Monto: matchFull[3],
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      rawTextSample: text.substring(0, 500)
    });

  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
