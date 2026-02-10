import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AppHeader } from '@/components/layout/AppHeader';
import { ArrowLeft, Search, Clock, User, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RAGBadge } from '@/components/dashboard/RAGBadge';

interface ProcessTemplate {
  id: string;
  name: string;
  module: string;
  description: string;
  frequency: string;
  responsibleRole: string;
  isActive: boolean;
  createdAt: string;
}

export default function AllProcesses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ProcessTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const practiceId = user?.practiceId || '';

  useEffect(() => {
    if (!user || !practiceId) return;

    const fetchProcesses = async () => {
      try {
        const res = await fetch(`/api/practices/${practiceId}/process-templates`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch process templates');
        const data = await res.json();
        setTemplates(data || []);
        setFilteredTemplates(data || []);
      } catch (error) {
        console.error('Error fetching processes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProcesses();
  }, [user, practiceId]);

  useEffect(() => {
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(template => 
        template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.responsibleRole?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(template => template.isActive);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(template => !template.isActive);
      }
    }

    setFilteredTemplates(filtered);
  }, [templates, searchTerm, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/')} data-testid="button-back-dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">All Audits</h1>
            <p className="text-muted-foreground">
              Complete overview of all audit processes
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search processes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                    data-testid="input-search-processes"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  data-testid="button-filter-all"
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('active')}
                  data-testid="button-filter-active"
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('inactive')}
                  data-testid="button-filter-inactive"
                >
                  Inactive
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Process Templates ({filteredTemplates.length})</CardTitle>
            <CardDescription>
              View all audit process templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map((template) => (
                  <div 
                    key={template.id}
                    className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                    data-testid={`card-process-${template.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <RAGBadge status={template.isActive ? 'green' : 'red'} />
                      <div>
                        <h3 className="font-medium">{template.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {template.responsibleRole || 'Unassigned'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {template.frequency}
                          </Badge>
                          {template.module && (
                            <Badge variant="outline" className="text-xs">
                              {template.module}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {template.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4" />
                  <p>No processes found matching your criteria</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
