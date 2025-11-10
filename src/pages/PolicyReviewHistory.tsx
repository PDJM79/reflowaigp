import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { History, Search, ArrowLeft, FileText, User, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';

interface ReviewHistory {
  id: string;
  policy_id: string;
  reviewed_by: string;
  reviewed_at: string;
  version_reviewed: string;
  review_type: string;
  notes: string | null;
  policy_title: string;
  reviewer_name: string;
  reviewer_email: string;
}

export default function PolicyReviewHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<ReviewHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchHistory();
  }, [user, navigate]);

  const fetchHistory = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return;

      const { data, error } = await supabase
        .from('policy_review_history')
        .select(`
          id,
          policy_id,
          reviewed_by,
          reviewed_at,
          version_reviewed,
          review_type,
          notes,
          policy_documents!inner(title),
          users!inner(name, email)
        `)
        .eq('practice_id', userData.practice_id)
        .order('reviewed_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((item: any) => ({
        id: item.id,
        policy_id: item.policy_id,
        reviewed_by: item.reviewed_by,
        reviewed_at: item.reviewed_at,
        version_reviewed: item.version_reviewed,
        review_type: item.review_type,
        notes: item.notes,
        policy_title: item.policy_documents.title,
        reviewer_name: item.users.name,
        reviewer_email: item.users.email,
      })) || [];

      setHistory(formattedData);
    } catch (error) {
      console.error('Error fetching review history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(
    (item) =>
      item.policy_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reviewer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.version_reviewed?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getReviewTypeBadge = (type: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      scheduled: { variant: 'default', label: 'Scheduled Review' },
      manual: { variant: 'secondary', label: 'Manual Review' },
      version_update: { variant: 'outline', label: 'Version Update' },
      acknowledgment: { variant: 'outline', label: 'Acknowledgment' },
    };

    const config = variants[type] || { variant: 'outline', label: type };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Calculate statistics
  const stats = {
    total: history.length,
    scheduled: history.filter((h) => h.review_type === 'scheduled').length,
    manual: history.filter((h) => h.review_type === 'manual').length,
    acknowledgments: history.filter((h) => h.review_type === 'acknowledgment').length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/policies')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Policies
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <History className="h-8 w-8" />
              Policy Review History
            </h1>
            <p className="text-muted-foreground">Complete audit trail of all policy review activities</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Scheduled Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.scheduled}</div>
            <p className="text-sm text-muted-foreground mt-1">Periodic reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Manual Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary">{stats.manual}</div>
            <p className="text-sm text-muted-foreground mt-1">On-demand checks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Acknowledgments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{stats.acknowledgments}</div>
            <p className="text-sm text-muted-foreground mt-1">Staff reviews</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by policy, reviewer, or version..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="text-center py-8">Loading review history...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Review Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No review history found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date & Time
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Policy
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Version
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Reviewed By
                        </div>
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(item.reviewed_at), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium">{item.policy_title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.version_reviewed}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.reviewer_name}</div>
                            <div className="text-sm text-muted-foreground">{item.reviewer_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getReviewTypeBadge(item.review_type)}</TableCell>
                        <TableCell className="max-w-xs">
                          {item.notes ? (
                            <span className="text-sm">{item.notes}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">No notes</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
