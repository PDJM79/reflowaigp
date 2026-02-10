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

  addSectionTitle(title: string) {
    this.checkPageBreak(15);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.yPosition);
    this.yPosition += 8;
  }

  addSubsectionTitle(title: string) {
    this.checkPageBreak(10);
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.yPosition);
    this.yPosition += 6;
  }

  addParagraph(text: string) {
    this.checkPageBreak(20);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    const lines = this.doc.splitTextToSize(text, this.pageWidth - 2 * this.margin);
    this.doc.text(lines, this.margin, this.yPosition);
    this.yPosition += lines.length * 5 + 4;
  }

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

  private checkPageBreak(requiredSpace: number) {
    const pageHeight = this.doc.internal.pageSize.getHeight();
    if (this.yPosition + requiredSpace > pageHeight - this.margin) {
      this.doc.addPage();
      this.yPosition = this.margin;
    }
  }

  save(filename: string) {
    this.doc.save(filename);
  }

  getBlob(): Blob {
    return this.doc.output('blob');
  }
}

export async function generateFireEmergencyPackPDF(data: {
  practiceName: string;
  assessment: any;
  actions: any[];
}) {
  const exporter = new UpdatePackPDFExporter();
  const { assessment, actions } = data;

  if (!assessment) {
    throw new Error('Assessment not found');
  }

  exporter.addPracticeHeader(
    data.practiceName,
    `Assessment Date: ${new Date(assessment.assessment_date).toLocaleDateString()}`
  );

  exporter.addSectionTitle('Fire Emergency Pack');

  exporter.addSubsectionTitle('Fire Risk Assessment Summary');
  exporter.addKeyValuePairs([
    { key: 'Assessment Date', value: new Date(assessment.assessment_date).toLocaleDateString() },
    { key: 'Next Review', value: assessment.next_review_date ? new Date(assessment.next_review_date).toLocaleDateString() : 'Not set' },
    { key: 'Overall Risk', value: assessment.overall_risk_level || 'N/A' },
  ]);

  if (assessment.premises) {
    exporter.addSubsectionTitle('Premises Information');
    const premises = typeof assessment.premises === 'string' ? JSON.parse(assessment.premises) : assessment.premises;
    exporter.addParagraph(JSON.stringify(premises, null, 2));
  }

  if (assessment.emergency_plan) {
    exporter.addSubsectionTitle('Fire Emergency Plan');
    const plan = typeof assessment.emergency_plan === 'string' ? JSON.parse(assessment.emergency_plan) : assessment.emergency_plan;
    exporter.addParagraph(JSON.stringify(plan, null, 2));
  }

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

export async function generateClaimsPackPDF(data: {
  practiceName: string;
  claimRun: any;
  claims: any[];
  reviewLogs: any[];
}) {
  const exporter = new UpdatePackPDFExporter();
  const { claimRun, claims, reviewLogs } = data;

  if (!claimRun) {
    throw new Error('Claim run not found');
  }

  const periodStart = new Date(claimRun.period_start);
  const periodEnd = new Date(claimRun.period_end);

  exporter.addPracticeHeader(
    data.practiceName,
    `Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`
  );

  exporter.addSectionTitle('Enhanced Service Claims Pack');

  exporter.addSubsectionTitle('Claim Run Summary');
  exporter.addKeyValuePairs([
    { key: 'Run Date', value: new Date(claimRun.run_date).toLocaleDateString() },
    { key: 'Review Status', value: claimRun.review_status || 'Pending' },
    { key: 'FPPS Status', value: claimRun.fpps_submission_status || 'Not submitted' },
    { key: 'Total Scripts', value: claims?.length.toString() || '0' },
  ]);

  if (reviewLogs && reviewLogs.length > 0) {
    exporter.addSubsectionTitle('Manual Review Checklist');
    const checklist = reviewLogs[0].checklist || {};
    exporter.addBulletList([
      `Patient notes reviewed: ${checklist.patient_notes_reviewed ? 'Yes' : 'No'}`,
      `Blood results checked: ${checklist.blood_results_checked ? 'Yes' : 'No'}`,
      `Clinical coding verified: ${checklist.clinical_coding_verified ? 'Yes' : 'No'}`,
      `Claim form 1.3 completed: ${checklist.claim_form_completed ? 'Yes' : 'No'}`,
    ]);
  }

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
    exporter.addSubsectionTitle('360 Feedback Summary');
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
          row.push('OK');
        }
      } else {
        row.push('-');
      }
    });
    
    return row;
  });
  
  exporter.addTable(headers, rows, {
    0: { cellWidth: 40 },
    ...Object.fromEntries(data.trainingTypes.map((_: any, i: number) => [i + 1, { cellWidth: 'auto' }]))
  });
  
  exporter.addSubsectionTitle('Legend');
  exporter.addBulletList([
    'OK - Training current',
    'XXd - Expiring in XX days (less than 90 days)',
    'EXPIRED - Training has expired',
    '- - No record'
  ]);

  return exporter;
}

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

export function generateCleaningLogsPDF(data: {
  practiceName: string;
  period: string;
  zones: any[];
  tasks: any[];
  logs: any[];
}) {
  const exporter = new UpdatePackPDFExporter();
  
  exporter.addPracticeHeader(data.practiceName, data.period);
  exporter.addSectionTitle('NHS Cleanliness 2025 - Cleaning Logs');
  
  exporter.addKeyValuePairs([
    { key: 'Report Period', value: data.period },
    { key: 'Total Zones', value: data.zones.length.toString() },
    { key: 'Total Tasks', value: data.tasks.length.toString() },
    { key: 'Logs Recorded', value: data.logs.length.toString() }
  ]);

  exporter.addSubsectionTitle('Cleaning Completion Summary by Zone');
  const zoneRows = data.zones.map((zone: any) => {
    const zoneLogs = data.logs.filter((l: any) => l.zone_id === zone.id);
    return [
      zone.name,
      zone.zone_type || 'N/A',
      zoneLogs.length.toString(),
      zoneLogs.filter((l: any) => l.completed_at !== null).length.toString()
    ];
  });
  exporter.addTable(['Zone Name', 'Type', 'Logs', 'Completed'], zoneRows);

  if (data.logs.length > 0) {
    exporter.addSubsectionTitle('Detailed Cleaning Records');
    const logRows = data.logs.slice(0, 50).map((log: any) => [
      new Date(log.log_date).toLocaleDateString(),
      data.zones.find((z: any) => z.id === log.zone_id)?.name || 'Unknown',
      log.frequency || 'N/A',
      log.completed_by || 'Not recorded',
      log.completed_at ? 'Complete' : 'Incomplete'
    ]);
    exporter.addTable(['Date', 'Zone', 'Frequency', 'Completed By', 'Status'], logRows);
    
    if (data.logs.length > 50) {
      exporter.addParagraph(`Note: Showing first 50 of ${data.logs.length} total logs.`);
    }
  }

  exporter.addSubsectionTitle('Retention Notice');
  exporter.addParagraph('Cleaning logs are retained for 5 years in accordance with NHS compliance requirements.');

  exporter.addSignatureSection([
    { role: 'Cleaning Supervisor', name: '', date: '' },
    { role: 'Practice Manager', name: '', date: '' }
  ]);

  return exporter;
}

export function generateRoomAssessmentPDF(data: {
  practiceName: string;
  room: any;
  assessment: any;
  findings: any[];
}) {
  const exporter = new UpdatePackPDFExporter();
  
  exporter.addPracticeHeader(data.practiceName);
  exporter.addSectionTitle('Annual Room Safety Assessment');
  
  exporter.addKeyValuePairs([
    { key: 'Room Name', value: data.room.name },
    { key: 'Room Type', value: data.room.room_type || 'N/A' },
    { key: 'Floor', value: data.room.floor || 'N/A' },
    { key: 'Assessment Date', value: new Date(data.assessment.assessment_date).toLocaleDateString() },
    { key: 'Next Due Date', value: data.assessment.next_due_date ? new Date(data.assessment.next_due_date).toLocaleDateString() : 'Not set' }
  ]);

  if (data.findings && data.findings.length > 0) {
    exporter.addSubsectionTitle('Assessment Findings');
    const findingRows = data.findings.map((finding: any) => [
      finding.item || 'N/A',
      finding.status === 'pass' ? 'Pass' : finding.status === 'fail' ? 'Fail' : 'Action Required',
      finding.notes || '-'
    ]);
    exporter.addTable(['Item', 'Status', 'Notes'], findingRows, {
      0: { cellWidth: 60 },
      1: { cellWidth: 30 },
      2: { cellWidth: 'auto' }
    });

    const actionRequired = data.findings.filter((f: any) => f.status === 'action_required');
    if (actionRequired.length > 0) {
      exporter.addSubsectionTitle('Actions Required');
      exporter.addParagraph(`${actionRequired.length} items require follow-up action. These have been automatically added to the Fire Safety action register.`);
    }
  } else {
    exporter.addParagraph('No detailed findings recorded for this assessment.');
  }

  exporter.addSignatureSection([
    { role: 'Assessor', name: '', date: '' },
    { role: 'Practice Manager', name: '', date: '' }
  ]);

  return exporter;
}
