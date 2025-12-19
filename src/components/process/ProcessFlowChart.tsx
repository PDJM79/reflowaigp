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
    let timeoutId: NodeJS.Timeout | null = null;
    let isCancelled = false;
    
    const renderDiagram = async () => {
      if (!mermaidText) {
        setLoading(false);
        return;
      }

      // Pre-validation: check for basic mermaid structure
      const hasFlowchart = mermaidText.includes('flowchart') || mermaidText.includes('graph');
      if (!hasFlowchart) {
        setError('Invalid diagram format - missing flowchart declaration');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Add timeout to prevent infinite loading (10 seconds)
      timeoutId = setTimeout(() => {
        if (!isCancelled) {
          setLoading(false);
          setError('Diagram render timeout - please try regenerating');
        }
      }, 10000);

      try {
        // Generate unique ID for this render
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Render the diagram
        const { svg } = await mermaid.render(id, mermaidText);
        
        if (!isCancelled) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
        
        if (!isCancelled) {
          setError(errorMessage);
          
          // Try to render a simplified fallback
          try {
            const fallbackDiagram = `flowchart TD
    A([Process Flow]) --> B[Unable to render full diagram]
    B --> C([Please try regenerating])
    style A fill:#fef3c7,stroke:#d97706
    style C fill:#dbeafe,stroke:#2563eb`;
            const fallbackId = `mermaid-fallback-${Date.now()}`;
            const { svg: fallbackSvg } = await mermaid.render(fallbackId, fallbackDiagram);
            setSvgContent(fallbackSvg);
          } catch {
            setSvgContent('');
          }
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    renderDiagram();
    
    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
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
      className={`bg-background rounded-lg border p-4 ${className}`}
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
        className="flex justify-center"
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
