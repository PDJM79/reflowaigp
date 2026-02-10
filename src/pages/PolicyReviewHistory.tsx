import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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

interface PolicyRecord {
  id: string;
  title: string;
  status: string;
  lastReviewedAt: string;
  nextReviewDate: string;
  version: string;
  reviewedBy: string;
}

export default function PolicyReviewHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<PolicyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user?.practiceId) {
      navigate('/');
      return;
    }
    fetchPolicies();
  }, [user, navigate]);

  const fetchPolicies = async () => {
    if (!user?.practiceId) return;

    try {
      const res = await fetch(`/api/practices/${user.practiceId}/policies`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch policies');
      const data = await res.json();

      const formatted = (data || []).map((policy: any) => ({
        id: policy.id,
        title: policy.title || 'Untitled Policy',
        status: policy.status || 'active',
        lastReviewedAt: policy.lastReviewedAt || policy.updatedAt || policy.createdAt,
        nextReviewDate: policy.nextReviewDate || '',
        version: policy.version || '1.0',
        reviewedBy: policy.reviewedBy || 'Unknown',
      }));

      setPolicies(formatted);
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPolicies = policies.filter(
    (item) =>
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.version?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: policies.length,
    active: policies.filter((p) => p.status === 'active' || p.status === 'approved').length,
    pendingReview: policies.filter((p) => p.status === 'pending_review' || p.status === 'draft').length,
    overdue: policies.filter((p) => {
      if (!p.nextReviewDate) return false;
      return new Date(p.nextReviewDate) < new Date();
    }).length,
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
            <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground mt-1">All policies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.active}</div>
            <p className="text-sm text-muted-foreground mt-1">Approved & active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{stats.pendingReview}</div>
            <p className="text-sm text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-sm text-muted-foreground mt-1">Past review date</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by policy name or version..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="text-center py-8">Loading policy history...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Policy Review Log</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPolicies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No policy records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Last Reviewed
                        </div>
                      </TableHead>
                      <TableHead>Next Review</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPolicies.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.version}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            item.status === 'active' || item.status === 'approved' ? 'default' :
                            item.status === 'draft' ? 'secondary' : 'outline'
                          }>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {item.lastReviewedAt ? format(new Date(item.lastReviewedAt), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {item.nextReviewDate ? format(new Date(item.nextReviewDate), 'MMM dd, yyyy') : 'N/A'}
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