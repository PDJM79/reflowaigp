import jsPDF from 'jspdf';

interface ProcessDiagramPDFOptions {
  processName: string;
  frequency: string | null;
  responsibleRole: string | null;
  practiceName?: string;
  mermaidText: string;
  generatedAt: string;
  isAiEnhanced: boolean;
}

/**
 * Convert SVG to PNG data URL using canvas
 */
async function svgToPng(svgElement: SVGElement, scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Get dimensions
      const bbox = svgElement.getBoundingClientRect();
      const width = bbox.width * scale;
      const height = bbox.height * scale;
      
      // Set dimensions on cloned SVG
      clonedSvg.setAttribute('width', String(width));
      clonedSvg.setAttribute('height', String(height));
      
      // Serialize SVG to string
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(clonedSvg);
      
      // Add XML declaration and fix namespaces
      if (!svgString.includes('xmlns')) {
        svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      
      // Create data URL
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      // Create image from SVG
      const img = new Image();
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Draw image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to PNG
        const pngUrl = canvas.toDataURL('image/png');
        
        // Cleanup
        URL.revokeObjectURL(url);
        
        resolve(pngUrl);
      };
      
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG as image'));
      };
      
      img.src = url;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Export process diagram to PDF
 */
export async function exportProcessDiagramToPDF(options: ProcessDiagramPDFOptions): Promise<void> {
  const {
    processName,
    frequency,
    responsibleRole,
    practiceName,
    generatedAt,
    isAiEnhanced,
  } = options;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(processName, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Subtitle with practice name
  if (practiceName) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(practiceName, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
  }

  // Metadata line
  const metadataParts: string[] = [];
  if (frequency) metadataParts.push(`Frequency: ${frequency}`);
  if (responsibleRole) metadataParts.push(`Responsible: ${responsibleRole}`);
  if (isAiEnhanced) metadataParts.push('AI Enhanced');

  if (metadataParts.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(metadataParts.join(' | '), pageWidth / 2, yPos, { align: 'center' });
    doc.setTextColor(0);
    yPos += 6;
  }

  // Generated timestamp
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(
    `Generated: ${new Date(generatedAt).toLocaleString()}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );
  doc.setTextColor(0);
  yPos += 8;

  // Separator line
  doc.setDrawColor(200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Find the SVG element in the diagram container
  // Wait a small moment to ensure the SVG is fully rendered
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const container = document.getElementById('process-diagram-container');
  if (!container) {
    throw new Error('Diagram container not found');
  }
  
  const svgElement = container.querySelector('svg');

  if (svgElement) {
    try {
      // Convert SVG to PNG
      const pngDataUrl = await svgToPng(svgElement, 2);
      
      // Calculate available space
      const availableWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - yPos - margin;
      
      // Get image dimensions from the SVG
      const bbox = svgElement.getBoundingClientRect();
      const aspectRatio = bbox.width / bbox.height;
      
      // Calculate final dimensions to fit within available space
      let imgWidth = availableWidth;
      let imgHeight = imgWidth / aspectRatio;
      
      if (imgHeight > availableHeight) {
        imgHeight = availableHeight;
        imgWidth = imgHeight * aspectRatio;
      }
      
      // Center the image horizontally
      const xPos = (pageWidth - imgWidth) / 2;
      
      // Add the image
      doc.addImage(pngDataUrl, 'PNG', xPos, yPos, imgWidth, imgHeight);
    } catch (error) {
      console.error('Error converting diagram to image:', error);
      // Add error message instead
      doc.setFontSize(12);
      doc.setTextColor(200, 0, 0);
      doc.text('Error: Could not render diagram image', pageWidth / 2, yPos + 20, { align: 'center' });
      doc.setTextColor(0);
    }
  } else {
    // No SVG found
    doc.setFontSize(12);
    doc.setTextColor(200, 0, 0);
    doc.text('No diagram available', pageWidth / 2, yPos + 20, { align: 'center' });
    doc.setTextColor(0);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(
    `Process Flowchart - ${new Date().toLocaleDateString()}`,
    margin,
    pageHeight - 10
  );
  doc.text(
    'Page 1 of 1',
    pageWidth - margin,
    pageHeight - 10,
    { align: 'right' }
  );

  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0];
  const safeName = processName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `process_${safeName}_${timestamp}.pdf`;

  // Save the PDF
  doc.save(filename);
}
