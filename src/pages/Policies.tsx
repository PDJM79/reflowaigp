import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [checkingReviews, setCheckingReviews] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [sendingAckReminders, setSendingAckReminders] = useState(false);
  const [sendingEscalations, setSendingEscalations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchPolicies();
    fetchUserRoles();
  }, [user, navigate]);

  const fetchUserRoles = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select(`
          user_practice_roles(
            practice_roles(
              role_catalog(role_key)
            )
          )
        `)
        .eq('auth_user_id', user?.id)
        .single();

      if (userData?.user_practice_roles) {
        const roles = userData.user_practice_roles
          .map((upr: any) => upr.practice_roles?.role_catalog?.role_key)
          .filter(Boolean);
        setUserRoles(roles);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const fetchPolicies = async () => {
    try {
      setError(null);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        setError('Failed to load user data. Please try refreshing the page.');
        setLoading(false);
        return;
      }

      if (!userData) {
        setError('User data not found. Please contact support.');
        setLoading(false);
        return;
      }

      const { data, error: policiesError } = await supabase
        .from('policy_documents')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .order('created_at', { ascending: false });

      if (policiesError) {
        console.error('Error fetching policies:', policiesError);
        setError('Failed to load policies. Please try refreshing the page.');
        setLoading(false);
        return;
      }
      
      setPolicies(data || []);

      // Fetch user's acknowledgments
      const { data: acks } = await supabase
        .from('policy_acknowledgments')
        .select('policy_id, version_acknowledged')
        .eq('user_id', userData.id);

      const ackSet = new Set(
        acks?.map(a => `${a.policy_id}_${a.version_acknowledged}`) || []
      );
      setMyAcknowledgments(ackSet);
    } catch (error) {
      console.error('Error fetching policies:', error);
      setError('An unexpected error occurred. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const filteredPolicies = policies.filter(policy =>
    policy.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activePolicies = policies.filter(p => p.status === 'active');
  const dueForReview = activePolicies.filter(p => p.review_due && new Date(p.review_due) < new Date());
  const needsMyAcknowledgment = activePolicies.filter(p => 
    !myAcknowledgments.has(`${p.id}_${p.version || 'unversioned'}`)
  );

  const canUpload = userRoles.includes('practice_manager') || userRoles.includes('ig_lead');

  const handleAcknowledgeClick = (policy: any) => {
    setSelectedPolicy(policy);
    setAckDialogOpen(true);
  };

  const handleViewStaffTracker = (policyId: string) => {
    setSelectedPolicyForTracker(policyId);
  };

  const handleCheckPolicyReviews = async () => {
    setCheckingReviews(true);
    try {
      const { data, error } = await supabase.functions.invoke('policy-review-reminders');
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success('Policy Review Check Complete', {
          description: `Checked ${data.policies_checked} policies. Created ${data.notifications_created} notification(s) for ${data.practices_affected} practice(s).`
        });
      } else {
        toast.error('Check failed', {
          description: data?.error || 'Unknown error occurred'
        });
      }
    } catch (error) {
      console.error('Error checking policy reviews:', error);
      toast.error('Failed to check policy reviews', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setCheckingReviews(false);
    }
  };

  const handleSendEmailReminders = async () => {
    setSendingEmails(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-policy-review-emails');
      
      if (error) throw error;
      
      if (data?.success) {
        if (data.emails_sent === 0) {
          toast.info('No Email Reminders Needed', {
            description: data.message || 'No overdue policies found that require email notifications.'
          });
        } else {
          toast.success('Email Reminders Sent Successfully', {
            description: `Sent ${data.emails_sent} email(s) to managers about ${data.overdue_policies} overdue policy review(s) across ${data.practices_affected} practice(s).`
          });
        }
      } else {
        toast.error('Failed to send emails', {
          description: data?.error || 'Unknown error occurred'
        });
      }
    } catch (error) {
      console.error('Error sending email reminders:', error);
      toast.error('Failed to send email reminders', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setSendingEmails(false);
    }
  };

  const handleSendAcknowledgmentReminders = async () => {
    setSendingAckReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-policy-acknowledgment-reminders');
      
      if (error) throw error;
      
      if (data?.success) {
        if (data.emails_sent === 0) {
          toast.info('No Acknowledgment Reminders Needed', {
            description: 'All staff have acknowledged their required policies.'
          });
        } else {
          toast.success('Acknowledgment Reminders Sent Successfully', {
            description: `Sent ${data.emails_sent} reminder(s) to staff about ${data.policies_checked} policy acknowledgment(s).`
          });
        }
      } else {
        toast.error('Failed to send acknowledgment reminders', {
          description: data?.error || 'Unknown error occurred'
        });
      }
    } catch (error) {
      console.error('Error sending acknowledgment reminders:', error);
      toast.error('Failed to send acknowledgment reminders', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setSendingAckReminders(false);
    }
  };

  const handleSendEscalationEmails = async () => {
    setSendingEscalations(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-policy-escalation-emails');
      
      if (error) throw error;
      
      if (data?.success) {
        if (data.emails_sent === 0) {
          toast.info('No Escalations Needed', {
            description: 'No staff have exceeded the 21-day acknowledgment deadline.'
          });
        } else {
          toast.success('Escalation Emails Sent Successfully', {
            description: `Sent ${data.emails_sent} escalation(s) to managers about staff who haven't acknowledged policies after 21 days.`
          });
        }
      } else {
        toast.error('Failed to send escalation emails', {
          description: data?.error || 'Unknown error occurred'
        });
      }
    } catch (error) {
      console.error('Error sending escalation emails:', error);
      toast.error('Failed to send escalation emails', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setSendingEscalations(false);
    }
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
            >
              <FileText className="h-4 w-4 mr-2" />
              Review History
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCheckPolicyReviews}
              disabled={checkingReviews}
            >
              <Bell className="h-4 w-4 mr-2" />
              {checkingReviews ? 'Checking...' : 'Check Policy Reviews Now'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSendEmailReminders}
              disabled={sendingEmails}
            >
              <Mail className="h-4 w-4 mr-2" />
              {sendingEmails ? 'Sending Emails...' : 'Send Email Reminders Now'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSendAcknowledgmentReminders}
              disabled={sendingAckReminders}
            >
              <Clock className="h-4 w-4 mr-2" />
              {sendingAckReminders ? 'Sending Reminders...' : 'Send Acknowledgment Reminders'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSendEscalationEmails}
              disabled={sendingEscalations}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {sendingEscalations ? 'Sending Escalations...' : 'Send Escalation Emails'}
            </Button>
            <Button onClick={() => setUploadDialogOpen(true)}>
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
            <div className="text-3xl font-bold">{activePolicies.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Currently in effect</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Due for Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{dueForReview.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Needs My Acknowledgment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{needsMyAcknowledgment.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Require your review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{policies.length}</div>
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
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="text-center py-8">Loading policies...</div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-destructive font-medium mb-2">Error Loading Policies</p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => { setLoading(true); fetchPolicies(); }}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : selectedPolicyForTracker ? (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setSelectedPolicyForTracker(null)}>
            ← Back to Policies
          </Button>
          <PolicyStaffTracker policyId={selectedPolicyForTracker} />
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Policies</TabsTrigger>
            <TabsTrigger value="needs_ack">
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
                      const isOverdue = policy.review_due && new Date(policy.review_due) < new Date();
                      const needsAck = !myAcknowledgments.has(`${policy.id}_${policy.version || 'unversioned'}`);
                      return (
                        <div
                          key={policy.id}
                          className={`p-4 border rounded-lg ${
                            isOverdue ? 'border-orange-300 bg-orange-50' : ''
                          }`}
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
                                {policy.owner_role && (
                                  <p>Owner: {policy.owner_role}</p>
                                )}
                                {policy.effective_from && (
                                  <p>Effective: {new Date(policy.effective_from).toLocaleDateString()}</p>
                                )}
                                {policy.review_due && (
                                  <p className={isOverdue ? 'text-orange-600 font-medium' : ''}>
                                    Review Due: {new Date(policy.review_due).toLocaleDateString()}
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
