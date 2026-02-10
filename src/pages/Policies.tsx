import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Search, AlertCircle, Upload, CheckCircle2, Users, Bell, Mail, Clock, AlertTriangle } from 'lucide-react';
import { PolicyUploadDialog } from '@/components/policies/PolicyUploadDialog';
import { PolicyAcknowledgmentDialog } from '@/components/policies/PolicyAcknowledgmentDialog';
import { PolicyStaffTracker } from '@/components/policies/PolicyStaffTracker';
import { toast } from 'sonner';

export default function Policies() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<any[]>([]);
  const [myAcknowledgments, setMyAcknowledgments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [ackDialogOpen, setAckDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [selectedPolicyForTracker, setSelectedPolicyForTracker] = useState<string | null>(null);

  const practiceId = user?.practiceId || '';
  const canUpload = user?.isPracticeManager || user?.role === 'practice_manager';

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchPolicies();
  }, [user, navigate]);

  const fetchPolicies = async () => {
    if (!practiceId) return;
    try {
      const res = await fetch(`/api/practices/${practiceId}/policies`, { credentials: 'include' });

      if (!res.ok) throw new Error('Failed to fetch policies');
      const data = await res.json();
      setPolicies(data || []);
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPolicies = policies.filter(policy =>
    policy.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activePolicies = policies.filter(p => p.status === 'active');
  const dueForReview = activePolicies.filter(p => p.nextReviewDate && new Date(p.nextReviewDate) < new Date());
  const needsMyAcknowledgment = activePolicies.filter(p => 
    !myAcknowledgments.has(`${p.id}_${p.version || 'unversioned'}`)
  );

  const handleAcknowledgeClick = (policy: any) => {
    setSelectedPolicy(policy);
    setAckDialogOpen(true);
  };

  const handleViewStaffTracker = (policyId: string) => {
    setSelectedPolicyForTracker(policyId);
  };

  const handleCheckPolicyReviews = async () => {
    toast.info('Policy review check is not available in this mode.');
  };

  const handleSendEmailReminders = async () => {
    toast.info('Email reminders are not available in this mode.');
  };

  const handleSendAcknowledgmentReminders = async () => {
    toast.info('Acknowledgment reminders are not available in this mode.');
  };

  const handleSendEscalationEmails = async () => {
    toast.info('Escalation emails are not available in this mode.');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BackButton />
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8" />
              Policies Library
            </h1>
          </div>
          <p className="text-muted-foreground">Manage and access practice policies</p>
        </div>
        {canUpload && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/policies/review-history')}
              data-testid="button-review-history"
            >
              <FileText className="h-4 w-4 mr-2" />
              Review History
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCheckPolicyReviews}
              data-testid="button-check-reviews"
            >
              <Bell className="h-4 w-4 mr-2" />
              Check Policy Reviews Now
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSendEmailReminders}
              data-testid="button-send-email-reminders"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Email Reminders Now
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSendAcknowledgmentReminders}
              data-testid="button-send-ack-reminders"
            >
              <Clock className="h-4 w-4 mr-2" />
              Send Acknowledgment Reminders
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSendEscalationEmails}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              data-testid="button-send-escalations"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Send Escalation Emails
            </Button>
            <Button onClick={() => setUploadDialogOpen(true)} data-testid="button-upload-policy">
              <Upload className="h-4 w-4 mr-2" />
              Upload Policy
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-active-policies-count">{activePolicies.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Currently in effect</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Due for Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600" data-testid="text-due-review-count">{dueForReview.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Needs My Acknowledgment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600" data-testid="text-needs-ack-count">{needsMyAcknowledgment.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Require your review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-policies-count">{policies.length}</div>
            <p className="text-sm text-muted-foreground mt-1">All policies</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search policies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-policies"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="text-center py-8">Loading policies...</div>
      ) : selectedPolicyForTracker ? (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setSelectedPolicyForTracker(null)} data-testid="button-back-to-policies">
            ← Back to Policies
          </Button>
          <PolicyStaffTracker policyId={selectedPolicyForTracker} />
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all-policies">All Policies</TabsTrigger>
            <TabsTrigger value="needs_ack" data-testid="tab-needs-ack">
              Needs My Acknowledgment {needsMyAcknowledgment.length > 0 && `(${needsMyAcknowledgment.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Policy Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredPolicies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No policies found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPolicies.map((policy) => {
                      const isOverdue = policy.nextReviewDate && new Date(policy.nextReviewDate) < new Date();
                      const needsAck = !myAcknowledgments.has(`${policy.id}_${policy.version || 'unversioned'}`);
                      return (
                        <div
                          key={policy.id}
                          className={`p-4 border rounded-lg ${
                            isOverdue ? 'border-orange-300 bg-orange-50' : ''
                          }`}
                          data-testid={`card-policy-${policy.id}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h3 className="font-semibold">{policy.title}</h3>
                                <Badge variant={policy.status === 'active' ? 'default' : 'secondary'}>
                                  {policy.status}
                                </Badge>
                                {policy.version && (
                                  <Badge variant="outline">{policy.version}</Badge>
                                )}
                                {isOverdue && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Review Overdue
                                  </Badge>
                                )}
                                {needsAck && policy.status === 'active' && (
                                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                                    Needs Acknowledgment
                                  </Badge>
                                )}
                                {!needsAck && policy.status === 'active' && (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Acknowledged
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                {policy.nextReviewDate && (
                                  <p className={isOverdue ? 'text-orange-600 font-medium' : ''}>
                                    Review Due: {new Date(policy.nextReviewDate).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {needsAck && policy.status === 'active' && (
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => handleAcknowledgeClick(policy)}
                                  data-testid={`button-acknowledge-${policy.id}`}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Acknowledge
                                </Button>
                              )}
                              {canUpload && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleViewStaffTracker(policy.id)}
                                  data-testid={`button-staff-status-${policy.id}`}
                                >
                                  <Users className="h-4 w-4 mr-2" />
                                  Staff Status
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="needs_ack" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Policies Needing Your Acknowledgment</CardTitle>
              </CardHeader>
              <CardContent>
                {needsMyAcknowledgment.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-600" />
                    <p className="font-medium text-green-600">All caught up!</p>
                    <p className="text-sm mt-2">You've acknowledged all active policies</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {needsMyAcknowledgment.map((policy) => (
                      <div key={policy.id} className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{policy.title}</h3>
                              {policy.version && (
                                <Badge variant="outline">{policy.version}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Please read and acknowledge this policy
                            </p>
                          </div>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handleAcknowledgeClick(policy)}
                            data-testid={`button-acknowledge-needed-${policy.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Acknowledge
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <PolicyUploadDialog
        isOpen={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onSuccess={fetchPolicies}
      />

      <PolicyAcknowledgmentDialog
        isOpen={ackDialogOpen}
        onClose={() => {
          setAckDialogOpen(false);
          setSelectedPolicy(null);
        }}
        onSuccess={fetchPolicies}
        policy={selectedPolicy}
      />
    </div>
  );
}
