// supabase/functions/generate-scripts-claim-pdf/index.ts
// JWT-protected - generates PDF for claim runs in user's practice

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireJwtAndPractice } from '../_shared/auth.ts';
import { createServiceClient, createUserClientFromRequest } from '../_shared/supabase.ts';

interface ScriptData {
  id: string;
  date: string;
  emis_id: string;
  medication: string;
  prescriber: string;
  quantity: number;
}

interface ClaimRunData {
  id: string;
  practice_id: string;
  claim_number: string;
  period_start: string;
  period_end: string;
  total_scripts: number;
  total_items: number;
  practices: {
    name: string;
    address?: string;
  };
  scripts: ScriptData[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const optRes = handleOptions(req);
  if (optRes) return optRes;

  console.log('📄 Starting PDF generation for scripts claim...');

  try {
    // Authenticate and get practice from JWT
    const { practiceId } = await requireJwtAndPractice(req);

    const { claim_run_id } = await req.json();

    if (!claim_run_id) {
      return errorResponse(req, 'claim_run_id is required', 400);
    }

    console.log(`Fetching claim run data for ID: ${claim_run_id}`);

    // Fetch claim run with RLS (user client ensures access control)
    const supabaseClient = createUserClientFromRequest(req);
    const { data: claimRun, error: claimError } = await supabaseClient
      .from('claim_runs')
      .select(`
        id,
        practice_id,
        claim_number,
        period_start,
        period_end,
        total_scripts,
        total_items,
        practices (
          name,
          address
        )
      `)
      .eq('id', claim_run_id)
      .single();

    if (claimError || !claimRun) {
      console.error('Error fetching claim run:', claimError);
      return errorResponse(req, 'Claim run not found', 404);
    }

    // SECURITY: Verify claim run belongs to authenticated user's practice
    if (claimRun.practice_id !== practiceId) {
      console.error('Practice mismatch - access denied');
      return errorResponse(req, 'Unauthorized: Claim run belongs to a different practice', 403);
    }

    // Fetch all scripts for this claim run
    const { data: scripts, error: scriptsError } = await supabaseClient
      .from('month_end_scripts')
      .select('id, date, emis_id, medication, prescriber, quantity')
      .eq('claim_run_id', claim_run_id)
      .eq('removed', false)
      .order('date', { ascending: true });

    if (scriptsError) {
      console.error('Error fetching scripts:', scriptsError);
      return errorResponse(req, 'Failed to fetch scripts', 500);
    }

    console.log(`Found ${scripts?.length || 0} scripts for claim run`);

    const claimData: ClaimRunData = {
      ...claimRun,
      scripts: scripts || []
    };

    // Generate PDF
    console.log('Creating PDF document...');
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    let page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    const margin = 50;
    let yPosition = height - margin;

    // Helper function to add new page if needed
    const checkPageSpace = (requiredSpace: number) => {
      if (yPosition < margin + requiredSpace) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - margin;
      }
    };

    // Header
    page.drawText('MONTH-END CONTROLLED DRUGS CLAIM', {
      x: margin,
      y: yPosition,
      size: 18,
      font: timesRomanBold,
      color: rgb(0, 0, 0.5),
    });
    yPosition -= 40;

    // Practice Details
    page.drawText(`Practice: ${claimData.practices.name}`, {
      x: margin,
      y: yPosition,
      size: 12,
      font: timesRomanBold,
    });
    yPosition -= 20;

    if (claimData.practices.address) {
      page.drawText(`Address: ${claimData.practices.address}`, {
        x: margin,
        y: yPosition,
        size: 10,
        font: timesRomanFont,
      });
      yPosition -= 20;
    }

    // Claim Period
    page.drawText(`Claim Number: ${claimData.claim_number || 'N/A'}`, {
      x: margin,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
    });
    yPosition -= 15;

    page.drawText(
      `Period: ${new Date(claimData.period_start).toLocaleDateString('en-GB')} - ${new Date(claimData.period_end).toLocaleDateString('en-GB')}`,
      {
        x: margin,
        y: yPosition,
        size: 10,
        font: timesRomanFont,
      }
    );
    yPosition -= 30;

    // Table Header
    checkPageSpace(100);
    const colWidths = [80, 80, 150, 120, 65];
    const cols = ['Date', 'EMIS ID', 'Medication', 'Prescriber', 'Quantity'];
    
    // Draw header background
    page.drawRectangle({
      x: margin,
      y: yPosition - 20,
      width: width - 2 * margin,
      height: 25,
      color: rgb(0.9, 0.9, 0.9),
    });

    // Draw header text
    let xPos = margin + 5;
    for (let i = 0; i < cols.length; i++) {
      page.drawText(cols[i], {
        x: xPos,
        y: yPosition - 15,
        size: 10,
        font: timesRomanBold,
      });
      xPos += colWidths[i];
    }
    yPosition -= 30;

    // Table Rows
    for (const script of claimData.scripts) {
      checkPageSpace(25);
      
      xPos = margin + 5;
      const rowData = [
        new Date(script.date).toLocaleDateString('en-GB'),
        script.emis_id || 'N/A',
        script.medication || 'N/A',
        script.prescriber || 'N/A',
        script.quantity?.toString() || '0'
      ];

      for (let i = 0; i < rowData.length; i++) {
        const text = rowData[i].length > 20 ? rowData[i].substring(0, 18) + '...' : rowData[i];
        page.drawText(text, {
          x: xPos,
          y: yPosition,
          size: 9,
          font: timesRomanFont,
        });
        xPos += colWidths[i];
      }
      yPosition -= 20;
    }

    // Summary Section
    yPosition -= 20;
    checkPageSpace(80);
    
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: width - margin, y: yPosition },
      thickness: 1,
    });
    yPosition -= 25;

    page.drawText(`Total Scripts: ${claimData.total_scripts}`, {
      x: margin,
      y: yPosition,
      size: 12,
      font: timesRomanBold,
    });
    yPosition -= 20;

    page.drawText(`Total Items: ${claimData.total_items}`, {
      x: margin,
      y: yPosition,
      size: 12,
      font: timesRomanBold,
    });
    yPosition -= 40;

    // Signature Section
    checkPageSpace(80);
    page.drawText('Practice Manager Signature: _________________________', {
      x: margin,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
    });
    yPosition -= 25;

    page.drawText('Date: _________________________', {
      x: margin,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
    });
    yPosition -= 40;

    // Footer
    page.drawText(
      `Generated: ${new Date().toLocaleString('en-GB')} | Claim Run ID: ${claimData.id}`,
      {
        x: margin,
        y: 30,
        size: 8,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      }
    );

    // Save PDF
    console.log('Saving PDF...');
    const pdfBytes = await pdfDoc.save();

    // Upload to storage using admin client
    const fileName = `claim-runs/${claimData.practice_id}/${claim_run_id}.pdf`;
    const supabaseAdmin = createServiceClient();

    console.log(`Uploading PDF to storage: ${fileName}`);
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from('policy-documents')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Update claim run with PDF path
    const { error: updateError } = await supabaseAdmin
      .from('claim_runs')
      .update({ 
        pdf_storage_path: fileName,
        submitted_at: new Date().toISOString()
      })
      .eq('id', claim_run_id);

    if (updateError) {
      console.error('Error updating claim run:', updateError);
    }

    // Get signed URL for download
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from('policy-documents')
      .createSignedUrl(fileName, 3600); // 1 hour expiry

    console.log('✅ PDF generated successfully');

    return jsonResponse(req, {
      success: true,
      claim_run_id: claim_run_id,
      pdf_path: fileName,
      download_url: signedUrlData?.signedUrl,
      scripts_count: scripts?.length || 0,
      total_scripts: claimData.total_scripts,
      total_items: claimData.total_items
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('❌ Error in generate-scripts-claim-pdf:', message);
    const status = message.includes('Unauthorized') ? 401 : 500;
    return errorResponse(req, message, status);
  }
};

serve(handler);
