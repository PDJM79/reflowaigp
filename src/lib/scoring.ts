// Scoring utilities for RAG status calculation

export type Rag = 'green' | 'amber' | 'red';

export const ragFromScore = (score: number): Rag => {
  if (score >= 90) return 'green';
  if (score >= 75) return 'amber';
  return 'red';
};

export const ragColor = (rag: Rag): string => {
  switch (rag) {
    case 'green': return 'hsl(var(--chart-2))';
    case 'amber': return 'hsl(var(--chart-4))';
    case 'red': return 'hsl(var(--destructive))';
  }
};

export const ragLabel = (rag: Rag): string => {
  switch (rag) {
    case 'green': return 'Good';
    case 'amber': return 'Needs Attention';
    case 'red': return 'Critical';
  }
};
