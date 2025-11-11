import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFExportOptions {
  title: string;
  subtitle?: string;
  practiceName?: string;
  dateRange?: { start: string; end: string };
}

export class DashboardPDFExporter {
  private doc: jsPDF;
  private yPosition: number = 20;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;

  constructor(options: PDFExportOptions) {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    
    this.addHeader(options);
  }

  private addHeader(options: PDFExportOptions) {
    // Title
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(options.title, this.pageWidth / 2, this.yPosition, { align: 'center' });
    this.yPosition += 10;

    // Subtitle
    if (options.subtitle) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(options.subtitle, this.pageWidth / 2, this.yPosition, { align: 'center' });
      this.yPosition += 8;
    }

    // Practice name
    if (options.practiceName) {
      this.doc.setFontSize(10);
      this.doc.text(options.practiceName, this.pageWidth / 2, this.yPosition, { align: 'center' });
      this.yPosition += 6;
    }

    // Date range
    if (options.dateRange) {
      this.doc.setFontSize(9);
      this.doc.setTextColor(100);
      this.doc.text(
        `Report Period: ${new Date(options.dateRange.start).toLocaleDateString()} - ${new Date(options.dateRange.end).toLocaleDateString()}`,
        this.pageWidth / 2,
        this.yPosition,
        { align: 'center' }
      );
      this.yPosition += 8;
    }

    // Generated timestamp
    this.doc.setFontSize(8);
    this.doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      this.pageWidth / 2,
      this.yPosition,
      { align: 'center' }
    );
    this.yPosition += 12;

    // Separator line
    this.doc.setDrawColor(200);
    this.doc.line(this.margin, this.yPosition, this.pageWidth - this.margin, this.yPosition);
    this.yPosition += 10;

    // Reset colors
    this.doc.setTextColor(0);
  }

  checkPageBreak(neededSpace: number = 40) {
    if (this.yPosition + neededSpace > this.pageHeight - this.margin) {
      this.doc.addPage();
      this.yPosition = 20;
    }
  }

  addSection(title: string) {
    this.checkPageBreak(30);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.yPosition);
    this.yPosition += 8;
  }

  addMetricCard(label: string, value: string, subtitle?: string) {
    this.checkPageBreak(25);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(label, this.margin + 5, this.yPosition);
    
    this.doc.setFontSize(16);
    this.doc.text(value, this.margin + 5, this.yPosition + 7);
    
    if (subtitle) {
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(100);
      this.doc.text(subtitle, this.margin + 5, this.yPosition + 12);
      this.doc.setTextColor(0);
    }
    
    this.yPosition += 18;
  }

  addMetricsGrid(metrics: Array<{ label: string; value: string; subtitle?: string }>) {
    this.checkPageBreak(30);
    
    const cols = 2;
    const colWidth = (this.pageWidth - 2 * this.margin) / cols;
    
    metrics.forEach((metric, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = this.margin + col * colWidth;
      const y = this.yPosition + row * 25;
      
      // Draw box
      this.doc.setDrawColor(200);
      this.doc.rect(x, y, colWidth - 5, 20);
      
      // Label
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(metric.label, x + 3, y + 5);
      
      // Value
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(metric.value, x + 3, y + 12);
      
      // Subtitle
      if (metric.subtitle) {
        this.doc.setFontSize(7);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(100);
        this.doc.text(metric.subtitle, x + 3, y + 17);
        this.doc.setTextColor(0);
      }
    });
    
    this.yPosition += Math.ceil(metrics.length / cols) * 25 + 5;
  }

  addTable(headers: string[], rows: any[][], title?: string) {
    this.checkPageBreak(40);
    
    if (title) {
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(title, this.margin, this.yPosition);
      this.yPosition += 6;
    }

    autoTable(this.doc, {
      head: [headers],
      body: rows,
      startY: this.yPosition,
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didDrawPage: (data) => {
        this.yPosition = data.cursor?.y || this.yPosition;
      }
    });
    
    this.yPosition += 10;
  }

  addList(items: string[], title?: string) {
    this.checkPageBreak(30);
    
    if (title) {
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(title, this.margin, this.yPosition);
      this.yPosition += 6;
    }

    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    
    items.forEach((item) => {
      this.checkPageBreak(10);
      this.doc.text(`• ${item}`, this.margin + 5, this.yPosition);
      this.yPosition += 5;
    });
    
    this.yPosition += 5;
  }

  addKeyValuePairs(pairs: Array<{ key: string; value: string }>, title?: string) {
    this.checkPageBreak(30);
    
    if (title) {
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(title, this.margin, this.yPosition);
      this.yPosition += 6;
    }

    pairs.forEach((pair) => {
      this.checkPageBreak(8);
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`${pair.key}:`, this.margin + 5, this.yPosition);
      
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(pair.value, this.margin + 50, this.yPosition);
      
      this.yPosition += 6;
    });
    
    this.yPosition += 5;
  }

  addRAGIndicator(label: string, status: 'green' | 'amber' | 'red', score?: number) {
    this.checkPageBreak(15);
    
    const colors: Record<'green' | 'amber' | 'red', [number, number, number]> = {
      green: [34, 197, 94],
      amber: [251, 191, 36],
      red: [239, 68, 68]
    };
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(label, this.margin + 5, this.yPosition);
    
    // RAG badge
    const badgeX = this.margin + 100;
    const color = colors[status];
    this.doc.setFillColor(color[0], color[1], color[2]);
    this.doc.roundedRect(badgeX, this.yPosition - 4, 20, 6, 2, 2, 'F');
    
    this.doc.setTextColor(255);
    this.doc.setFontSize(8);
    this.doc.text(status.toUpperCase(), badgeX + 10, this.yPosition, { align: 'center' });
    this.doc.setTextColor(0);
    
    if (score !== undefined) {
      this.doc.setFontSize(10);
      this.doc.text(`${score}%`, badgeX + 25, this.yPosition);
    }
    
    this.yPosition += 8;
  }

  save(filename: string) {
    this.doc.save(filename);
  }
}

export const generateFilename = (dashboardName: string, dateRange?: { start: string; end: string }) => {
  const timestamp = new Date().toISOString().split('T')[0];
  const rangeSuffix = dateRange 
    ? `_${dateRange.start}_to_${dateRange.end}`
    : '';
  return `${dashboardName}_${timestamp}${rangeSuffix}.pdf`;
};
