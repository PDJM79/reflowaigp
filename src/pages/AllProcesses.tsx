import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AppHeader } from '@/components/layout/AppHeader';
import { ArrowLeft, Search, Clock, User, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RAGBadge } from '@/components/dashboard/RAGBadge';

interface ProcessInstance {
  id: string;
  status: string;
  due_at: string;
  created_at: string;
  period_start: string;
  period_end: string;
  process_templates: {
    name: string;
    responsible_role: string;
    frequency: string;
  };
  users: {
    name: string;
    role: string;
  };
}

export default function AllProcesses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [processes, setProcesses] = useState<ProcessInstance[]>([]);
  const [filteredProcesses, setFilteredProcesses] = useState<ProcessInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;

    const fetchProcesses = async () => {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('practice_id')
          .eq('auth_user_id', user.id)
          .single();

        if (!userData) return;

        const { data: processInstances } = await supabase
          .from('process_instances')
          .select(`
            *,
            process_templates!inner (
              name,
              responsible_role,
              frequency
            ),
            users!assignee_id (
              name,
              role
            )
          `)
          .eq('practice_id', userData.practice_id)
          .order('created_at', { ascending: false });

        setProcesses(processInstances || []);
        setFilteredProcesses(processInstances || []);
      } catch (error) {
        console.error('Error fetching processes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProcesses();
  }, [user]);

  useEffect(() => {
    let filtered = processes;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(process => 
        process.process_templates?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        process.users?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(process => process.status === statusFilter);
    }

    setFilteredProcesses(filtered);
  }, [processes, searchTerm, statusFilter]);

  const getStatusBadge = (status: string, dueAt: string) => {
    if (status === 'complete') return 'green';
    if (status === 'in_progress') return 'amber';
    if (new Date(dueAt) < new Date()) return 'red';
    return 'amber';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'complete': return 'Complete';
      case 'in_progress': return 'In Progress';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

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
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">All Processes</h1>
            <p className="text-muted-foreground">
              Complete overview of all practice processes
            </p>
          </div>
        </div>

        {/* Filters */}
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
                    placeholder="Search processes or assignees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('pending')}
                >
                  Pending
                </Button>
                <Button
                  variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('in_progress')}
                >
                  In Progress
                </Button>
                <Button
                  variant={statusFilter === 'complete' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('complete')}
                >
                  Complete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processes List */}
        <Card>
          <CardHeader>
            <CardTitle>Processes ({filteredProcesses.length})</CardTitle>
            <CardDescription>
              Click on any process to view details and manage steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredProcesses.length > 0 ? (
                filteredProcesses.map((process) => (
                  <div 
                    key={process.id}
                    className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => navigate(`/task/${process.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <RAGBadge status={getStatusBadge(process.status, process.due_at)} />
                      <div>
                        <h3 className="font-medium">{process.process_templates?.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due: {new Date(process.due_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {process.users?.name || 'Unassigned'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {process.process_templates?.frequency}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {getStatusText(process.status)}
                      </Badge>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
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