import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export class UpdatePackPDFExporter {
  private doc: jsPDF;
  private yPosition: number = 20;
  private readonly pageWidth: number;
  private readonly margin: number = 20;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
  }

  // Add practice header
  addPracticeHeader(practiceName: string, dateRange?: string) {
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(practiceName, this.margin, this.yPosition);
    
    this.yPosition += 8;
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    if (dateRange) {
      this.doc.text(`Report Period: ${dateRange}`, this.margin, this.yPosition);
      this.yPosition += 6;
    }
    
    this.doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, this.margin, this.yPosition);
    this.yPosition += 10;
  }

  // Add section title
  addSectionTitle(title: string) {
    this.checkPageBreak(15);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.yPosition);
    this.yPosition += 8;
  }

  // Add subsection title
  addSubsectionTitle(title: string) {
    this.checkPageBreak(10);
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.yPosition);
    this.yPosition += 6;
  }

  // Add paragraph text
  addParagraph(text: string) {
    this.checkPageBreak(20);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    const lines = this.doc.splitTextToSize(text, this.pageWidth - 2 * this.margin);
    this.doc.text(lines, this.margin, this.yPosition);
    this.yPosition += lines.length * 5 + 4;
  }

  // Add table
  addTable(headers: string[], rows: any[][], columnStyles?: any) {
    this.checkPageBreak(40);
    
    autoTable(this.doc, {
      startY: this.yPosition,
      head: [headers],
      body: rows,
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [71, 85, 105], fontStyle: 'bold' },
      columnStyles: columnStyles || {},
      didDrawPage: (data) => {
        this.yPosition = data.cursor ? data.cursor.y + 10 : this.yPosition;
      }
    });
  }

  // Add key-value pairs
  addKeyValuePairs(pairs: Array<{ key: string; value: string }>) {
    this.checkPageBreak(pairs.length * 6 + 10);
    this.doc.setFontSize(10);
    
    pairs.forEach(pair => {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`${pair.key}:`, this.margin, this.yPosition);
      
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(pair.value, this.margin + 50, this.yPosition);
      
      this.yPosition += 6;
    });
    
    this.yPosition += 4;
  }

  // Add bullet list
  addBulletList(items: string[]) {
    this.checkPageBreak(items.length * 6 + 10);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    items.forEach(item => {
      this.doc.text('•', this.margin, this.yPosition);
      const lines = this.doc.splitTextToSize(item, this.pageWidth - 2 * this.margin - 10);
      this.doc.text(lines, this.margin + 5, this.yPosition);
      this.yPosition += lines.length * 5 + 2;
    });
    
    this.yPosition += 4;
  }

  // Add signature section
  addSignatureSection(signers: Array<{ role: string; name?: string; date?: string }>) {
    this.checkPageBreak(40);
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Signatures:', this.margin, this.yPosition);
    this.yPosition += 10;

    signers.forEach(signer => {
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(`${signer.role}:`, this.margin, this.yPosition);
      this.doc.line(this.margin + 40, this.yPosition, this.margin + 120, this.yPosition);
      
      if (signer.name) {
        this.doc.setFontSize(9);
        this.doc.text(signer.name, this.margin + 40, this.yPosition + 4);
        this.doc.setFontSize(10);
      }
      
      if (signer.date) {
        this.doc.text(`Date: ${signer.date}`, this.margin + 130, this.yPosition);
      }
      
      this.yPosition += 15;
    });
  }

  // Add RAG status badge
  addRAGIndicator(status: 'red' | 'amber' | 'green', label: string) {
    this.checkPageBreak(10);
    
    const colors: Record<string, [number, number, number]> = {
      red: [220, 38, 38],
      amber: [245, 158, 11],
      green: [34, 197, 94]
    };
    
    const [r, g, b] = colors[status];
    this.doc.setFillColor(r, g, b);
    this.doc.circle(this.margin + 2, this.yPosition - 1, 2, 'F');
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.text(label, this.margin + 7, this.yPosition);
    
    this.yPosition += 7;
  }

  // Check if we need a page break
  private checkPageBreak(requiredSpace: number) {
    const pageHeight = this.doc.internal.pageSize.getHeight();
    if (this.yPosition + requiredSpace > pageHeight - this.margin) {
      this.doc.addPage();
      this.yPosition = this.margin;
    }
  }

  // Save the PDF
  save(filename: string) {
    this.doc.save(filename);
  }

  // Get the PDF as blob (for upload to storage)
  getBlob(): Blob {
    return this.doc.output('blob');
  }
}

// Fire Emergency Pack PDF Generator
export async function generateFireEmergencyPackPDF(assessmentId: string, supabase: any) {
  const exporter = new UpdatePackPDFExporter();

  // Fetch assessment data
  const { data: assessment } = await supabase
    .from('fire_risk_assessments_v2')
    .select('*, practices(name)')
    .eq('id', assessmentId)
    .single();

  // Fetch actions
  const { data: actions } = await supabase
    .from('fire_actions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('severity', { ascending: false });

  if (!assessment) {
    throw new Error('Assessment not found');
  }

  exporter.addPracticeHeader(
    assessment.practices?.name || 'Unknown Practice',
    `Assessment Date: ${new Date(assessment.assessment_date).toLocaleDateString()}`
  );

  exporter.addSectionTitle('Fire Emergency Pack');

  // FRA Summary
  exporter.addSubsectionTitle('Fire Risk Assessment Summary');
  exporter.addKeyValuePairs([
    { key: 'Assessment Date', value: new Date(assessment.assessment_date).toLocaleDateString() },
    { key: 'Next Review', value: assessment.next_review_date ? new Date(assessment.next_review_date).toLocaleDateString() : 'Not set' },
    { key: 'Overall Risk', value: assessment.overall_risk_level || 'N/A' },
  ]);

  // Premises Information
  if (assessment.premises) {
    exporter.addSubsectionTitle('Premises Information');
    const premises = typeof assessment.premises === 'string' ? JSON.parse(assessment.premises) : assessment.premises;
    exporter.addParagraph(JSON.stringify(premises, null, 2));
  }

  // Emergency Plan
  if (assessment.emergency_plan) {
    exporter.addSubsectionTitle('Fire Emergency Plan');
    const plan = typeof assessment.emergency_plan === 'string' ? JSON.parse(assessment.emergency_plan) : assessment.emergency_plan;
    exporter.addParagraph(JSON.stringify(plan, null, 2));
  }

  // Actions Table
  if (actions && actions.length > 0) {
    exporter.addSubsectionTitle('Fire Safety Actions');
    const actionRows = actions.map((action: any) => [
      action.deficiency_description || '',
      action.severity || '',
      action.timeframe || '',
      action.completed_at ? 'Complete' : 'Open',
    ]);
    exporter.addTable(
      ['Description', 'Severity', 'Timeframe', 'Status'],
      actionRows
    );
  }

  exporter.addSignatureSection([
    { role: 'Fire Safety Lead', name: '', date: '' },
    { role: 'Practice Manager', name: '', date: '' }
  ]);

  return exporter.save(`Fire_Emergency_Pack_${new Date(assessment.assessment_date).toISOString().split('T')[0]}.pdf`);
}

// Claims Pack PDF Generator
export async function generateClaimsPackPDF(claimRunId: string, supabase: any) {
  const exporter = new UpdatePackPDFExporter();

  // Fetch claim run data
  const { data: claimRun } = await supabase
    .from('script_claim_runs')
    .select('*, practices(name)')
    .eq('id', claimRunId)
    .single();

  // Fetch claims
  const { data: claims } = await supabase
    .from('script_claims')
    .select('*')
    .eq('claim_run_id', claimRunId)
    .order('issue_date', { ascending: true });

  // Fetch review checklist
  const { data: reviewLogs } = await supabase
    .from('claim_review_logs')
    .select('*')
    .eq('claim_run_id', claimRunId)
    .order('reviewed_at', { ascending: false })
    .limit(1);

  if (!claimRun) {
    throw new Error('Claim run not found');
  }

  const periodStart = new Date(claimRun.period_start);
  const periodEnd = new Date(claimRun.period_end);

  exporter.addPracticeHeader(
    claimRun.practices?.name || 'Unknown Practice',
    `Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`
  );

  exporter.addSectionTitle('Enhanced Service Claims Pack');

  // Claim Summary
  exporter.addSubsectionTitle('Claim Run Summary');
  exporter.addKeyValuePairs([
    { key: 'Run Date', value: new Date(claimRun.run_date).toLocaleDateString() },
    { key: 'Review Status', value: claimRun.review_status || 'Pending' },
    { key: 'FPPS Status', value: claimRun.fpps_submission_status || 'Not submitted' },
    { key: 'Total Scripts', value: claims?.length.toString() || '0' },
  ]);

  // Review Checklist Status
  if (reviewLogs && reviewLogs.length > 0) {
    exporter.addSubsectionTitle('Manual Review Checklist');
    const checklist = reviewLogs[0].checklist || {};
    exporter.addBulletList([
      `Patient notes reviewed: ${checklist.patient_notes_reviewed ? '✓' : '✗'}`,
      `Blood results checked: ${checklist.blood_results_checked ? '✓' : '✗'}`,
      `Clinical coding verified: ${checklist.clinical_coding_verified ? '✓' : '✗'}`,
      `Claim form 1.3 completed: ${checklist.claim_form_completed ? '✓' : '✗'}`,
    ]);
  }

  // Claims Table
  if (claims && claims.length > 0) {
    exporter.addSubsectionTitle('Script Claims - Form 1.3');
    const claimRows = claims.map((claim: any) => [
      new Date(claim.issue_date).toLocaleDateString(),
      claim.emis_id || '',
      claim.medication || '',
      claim.amount || '1',
    ]);
    exporter.addTable(
      ['Date', 'EMIS ID', 'Medication', 'Amount'],
      claimRows
    );
  }

  exporter.addSignatureSection([
    { role: 'Practice Manager', name: '', date: '' },
    { role: 'Administrator', name: '', date: '' }
  ]);

  return exporter.save(`Claims_Pack_${periodStart.toISOString().split('T')[0]}_to_${periodEnd.toISOString().split('T')[0]}.pdf`);
}

// IPC Statement PDF Generator
export function generateIPCStatementPDF(data: {
  practiceName: string;
  period: string;
  audits: any[];
  actions: any[];
  completionRate: number;
}) {
  const exporter = new UpdatePackPDFExporter();
  
  exporter.addPracticeHeader(data.practiceName, data.period);
  exporter.addSectionTitle('IPC Statement - 12 Month Summary');
  
  exporter.addKeyValuePairs([
    { key: 'Report Period', value: data.period },
    { key: 'Total Audits Completed', value: data.audits.length.toString() },
    { key: 'Completion Rate', value: `${data.completionRate}%` },
    { key: 'Open Actions', value: data.actions.filter((a: any) => a.status === 'open').length.toString() }
  ]);

  exporter.addSubsectionTitle('Audit Summary');
  const auditRows = data.audits.map((audit: any) => [
    new Date(audit.completed_at).toLocaleDateString(),
    audit.location_scope || 'All Areas',
    audit.completed_by || 'Unknown'
  ]);
  exporter.addTable(['Date', 'Location', 'Completed By'], auditRows);

  if (data.actions.length > 0) {
    exporter.addSubsectionTitle('Action Plan');
    const actionRows = data.actions.map((action: any) => [
      action.action_description,
      action.severity || 'N/A',
      action.status,
      action.due_date ? new Date(action.due_date).toLocaleDateString() : 'N/A'
    ]);
    exporter.addTable(['Action', 'Severity', 'Status', 'Due Date'], actionRows);
  }

  exporter.addSignatureSection([
    { role: 'IPC Lead', name: '', date: '' },
    { role: 'Practice Manager', name: '', date: '' }
  ]);

  return exporter;
}

// HR Appraisal Report PDF Generator
export function generateAppraisalReportPDF(data: {
  practiceName: string;
  employee: any;
  appraisal: any;
  feedback360?: any[];
  actions?: any[];
}) {
  const exporter = new UpdatePackPDFExporter();
  
  exporter.addPracticeHeader(data.practiceName, data.appraisal.period);
  exporter.addSectionTitle('Annual Appraisal Report');
  
  exporter.addKeyValuePairs([
    { key: 'Employee', value: data.employee.name },
    { key: 'Appraisal Period', value: data.appraisal.period },
    { key: 'Scheduled Date', value: new Date(data.appraisal.scheduled_date).toLocaleDateString() },
    { key: 'Completed Date', value: data.appraisal.completed_date ? new Date(data.appraisal.completed_date).toLocaleDateString() : 'Pending' },
    { key: 'Status', value: data.appraisal.status }
  ]);

  if (data.appraisal.ratings) {
    exporter.addSubsectionTitle('Performance Ratings');
    const ratings = data.appraisal.ratings as Record<string, number>;
    const ratingPairs = Object.entries(ratings).map(([key, value]) => ({
      key: key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      value: `${value}/5`
    }));
    exporter.addKeyValuePairs(ratingPairs);
  }

  if (data.appraisal.achievements) {
    exporter.addSubsectionTitle('Key Achievements');
    exporter.addParagraph(data.appraisal.achievements);
  }

  if (data.appraisal.challenges) {
    exporter.addSubsectionTitle('Challenges & Areas for Improvement');
    exporter.addParagraph(data.appraisal.challenges);
  }

  if (data.appraisal.support_needs) {
    exporter.addSubsectionTitle('Support & Development Needs');
    exporter.addParagraph(data.appraisal.support_needs);
  }

  if (data.appraisal.next_year_targets) {
    exporter.addSubsectionTitle('Next Year Objectives');
    const targets = data.appraisal.next_year_targets as string[];
    exporter.addBulletList(targets);
  }

  if (data.feedback360 && data.feedback360.length > 0) {
    exporter.addSubsectionTitle('360° Feedback Summary');
    exporter.addParagraph(`Received ${data.feedback360.length} anonymous feedback responses.`);
  }

  if (data.actions && data.actions.length > 0) {
    exporter.addSubsectionTitle('Development Action Plan');
    const actionRows = data.actions.map((action: any) => [
      action.action_description,
      action.priority || 'N/A',
      action.due_date ? new Date(action.due_date).toLocaleDateString() : 'Not set'
    ]);
    exporter.addTable(['Action', 'Priority', 'Due Date'], actionRows);
  }

  exporter.addSignatureSection([
    { role: 'Employee', name: '', date: '' },
    { role: 'Reviewer', name: '', date: '' }
  ]);

  return exporter;
}

// Training Matrix PDF Generator
export function generateTrainingMatrixPDF(data: {
  practiceName: string;
  employees: any[];
  trainingTypes: any[];
  trainingRecords: any[];
}) {
  const exporter = new UpdatePackPDFExporter();
  
  exporter.addPracticeHeader(data.practiceName);
  exporter.addSectionTitle('Training Compliance Matrix');
  
  exporter.addParagraph(`This matrix shows training compliance status for ${data.employees.length} employees across ${data.trainingTypes.length} training types.`);
  
  // Create matrix table
  const headers = ['Employee', ...data.trainingTypes.map((t: any) => t.title)];
  const rows = data.employees.map((emp: any) => {
    const row = [emp.name];
    
    data.trainingTypes.forEach((type: any) => {
      const record = data.trainingRecords.find((r: any) => 
        r.employee_id === emp.id && r.training_type_id === type.id
      );
      
      if (record && record.expiry_date) {
        const expiryDate = new Date(record.expiry_date);
        const today = new Date();
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) {
          row.push('EXPIRED');
        } else if (daysUntilExpiry < 90) {
          row.push(`${daysUntilExpiry}d`);
        } else {
          row.push('✓');
        }
      } else {
        row.push('-');
      }
    });
    
    return row;
  });
  
  exporter.addTable(headers, rows, {
    0: { cellWidth: 40 },
    ...Object.fromEntries(data.trainingTypes.map((_, i) => [i + 1, { cellWidth: 'auto' }]))
  });
  
  exporter.addSubsectionTitle('Legend');
  exporter.addBulletList([
    '✓ - Training current',
    'XXd - Expiring in XX days (less than 90 days)',
    'EXPIRED - Training has expired',
    '- - No record'
  ]);

  return exporter;
}

// DBS Register PDF Generator
export function generateDBSRegisterPDF(data: {
  practiceName: string;
  employees: any[];
  dbsChecks: any[];
}) {
  const exporter = new UpdatePackPDFExporter();
  
  exporter.addPracticeHeader(data.practiceName);
  exporter.addSectionTitle('DBS Tracking Register');
  
  exporter.addParagraph(`This register tracks DBS check status for ${data.employees.length} employees.`);
  
  const rows = data.employees.map((emp: any) => {
    const dbs = data.dbsChecks.find((d: any) => d.employee_id === emp.id);
    
    if (dbs) {
      const nextReview = new Date(dbs.next_review_due);
      const today = new Date();
      const daysUntilReview = Math.floor((nextReview.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return [
        emp.name,
        emp.role || 'N/A',
        new Date(dbs.check_date).toLocaleDateString(),
        dbs.certificate_number || 'N/A',
        dbs.is_clear ? 'Clear' : 'Issues',
        new Date(dbs.next_review_due).toLocaleDateString(),
        daysUntilReview < 0 ? 'OVERDUE' : daysUntilReview < 90 ? 'Due Soon' : 'Current'
      ];
    } else {
      return [emp.name, emp.role || 'N/A', '-', '-', '-', '-', 'NO RECORD'];
    }
  });
  
  exporter.addTable(
    ['Employee', 'Role', 'Check Date', 'Certificate No.', 'Status', 'Next Review', 'Review Status'],
    rows
  );
  
  exporter.addSubsectionTitle('Notes');
  exporter.addBulletList([
    'DBS checks should be reviewed every 3 years',
    'All reviews should be completed before the 5-year inspection cycle',
    'Any "Issues" status requires immediate follow-up with HR'
  ]);

  return exporter;
}
