import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProcessFlowChartProps {
  mermaidText: string;
  className?: string;
}

// Initialize mermaid with configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
    padding: 15,
  },
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#1f2937',
    primaryBorderColor: '#60a5fa',
    lineColor: '#9ca3af',
    secondaryColor: '#f3f4f6',
    tertiaryColor: '#ffffff',
  },
});

export function ProcessFlowChart({ mermaidText, className = '' }: ProcessFlowChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!mermaidText || !containerRef.current) return;

      setLoading(true);
      setError(null);

      try {
        // Generate unique ID for this render
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Render the diagram
        const { svg } = await mermaid.render(id, mermaidText);
        
        // Set the SVG content
        setSvgContent(svg);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        
        // Try to render a simplified fallback
        try {
          const fallbackDiagram = `flowchart TD
    A([Process Flow]) --> B[Unable to render full diagram]
    B --> C([Please try regenerating])`;
          const fallbackId = `mermaid-fallback-${Date.now()}`;
          const { svg: fallbackSvg } = await mermaid.render(fallbackId, fallbackDiagram);
          setSvgContent(fallbackSvg);
        } catch {
          setSvgContent('');
        }
      } finally {
        setLoading(false);
      }
    };

    renderDiagram();
  }, [mermaidText]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Rendering diagram...</span>
      </div>
    );
  }

  if (error && !svgContent) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to render diagram: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`overflow-auto bg-background rounded-lg border p-4 ${className}`}
    >
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Diagram rendered with errors. Some elements may not display correctly.
          </AlertDescription>
        </Alert>
      )}
      <div 
        className="flex justify-center min-h-[300px]"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}

// Export function to get SVG element for PDF export
export function getMermaidSvgElement(containerSelector: string): SVGElement | null {
  const container = document.querySelector(containerSelector);
  if (!container) return null;
  return container.querySelector('svg');
}
