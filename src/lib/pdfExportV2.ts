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
    
    const colors = {
      red: [220, 38, 38],
      amber: [245, 158, 11],
      green: [34, 197, 94]
    };
    
    this.doc.setFillColor(...colors[status]);
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

// Fire Emergency Pack PDF Generator
export function generateFireEmergencyPackPDF(data: {
  practiceName: string;
  assessment: any;
  actions: any[];
}) {
  const exporter = new UpdatePackPDFExporter();
  
  exporter.addPracticeHeader(data.practiceName);
  exporter.addSectionTitle('Fire Emergency Pack (FEP)');
  
  exporter.addSubsectionTitle('Assessment Details');
  exporter.addKeyValuePairs([
    { key: 'Assessment Date', value: new Date(data.assessment.assessment_date).toLocaleDateString() },
    { key: 'Next Review Due', value: data.assessment.next_review_date ? new Date(data.assessment.next_review_date).toLocaleDateString() : 'Not set' },
    { key: 'Assessor', value: data.assessment.assessor_name || 'Unknown' }
  ]);

  if (data.assessment.emergency_plan) {
    const plan = data.assessment.emergency_plan as any;
    exporter.addSubsectionTitle('Emergency Plan');
    if (plan.muster_point) {
      exporter.addParagraph(`Muster Point: ${plan.muster_point}`);
    }
    if (plan.marshal_roles) {
      exporter.addParagraph(`Fire Marshals: ${plan.marshal_roles}`);
    }
  }

  if (data.actions.length > 0) {
    exporter.addSubsectionTitle('Fire Safety Actions');
    const actionRows = data.actions.map((action: any) => [
      action.action_description,
      action.severity || 'N/A',
      action.timeframe || 'N/A',
      action.status,
      action.due_date ? new Date(action.due_date).toLocaleDateString() : 'N/A'
    ]);
    exporter.addTable(['Action', 'Severity', 'Timeframe', 'Status', 'Due Date'], actionRows);
  }

  exporter.addSignatureSection([
    { role: 'Estates Lead', name: '', date: '' },
    { role: 'Practice Manager', name: '', date: '' }
  ]);

  return exporter;
}

// Claims Pack PDF Generator
export function generateClaimsPackPDF(data: {
  practiceName: string;
  claimRun: any;
  claims: any[];
  reviewChecklist: any[];
}) {
  const exporter = new UpdatePackPDFExporter();
  
  exporter.addPracticeHeader(data.practiceName, 
    `${new Date(data.claimRun.period_start).toLocaleDateString()} - ${new Date(data.claimRun.period_end).toLocaleDateString()}`
  );
  exporter.addSectionTitle('Enhanced Service Claims Pack');
  
  exporter.addKeyValuePairs([
    { key: 'Claim Period', value: `${new Date(data.claimRun.period_start).toLocaleDateString()} - ${new Date(data.claimRun.period_end).toLocaleDateString()}` },
    { key: 'Total Scripts', value: data.claims.length.toString() },
    { key: 'Run Date', value: new Date(data.claimRun.run_date).toLocaleDateString() }
  ]);

  exporter.addSubsectionTitle('Claim Items');
  const claimRows = data.claims.map((claim: any) => [
    new Date(claim.issue_date).toLocaleDateString(),
    claim.emis_id || 'N/A',
    claim.medication,
    claim.amount
  ]);
  exporter.addTable(['Date', 'EMIS ID', 'Medication', 'Amount'], claimRows);

  if (data.reviewChecklist && data.reviewChecklist.length > 0) {
    exporter.addSubsectionTitle('PM Review Checklist');
    const checklistItems = data.reviewChecklist.map((item: any) => 
      `${item.checked ? '✓' : '☐'} ${item.item_description}`
    );
    exporter.addBulletList(checklistItems);
  }

  exporter.addSignatureSection([
    { role: 'Practice Manager', name: '', date: '' }
  ]);

  return exporter;
}
