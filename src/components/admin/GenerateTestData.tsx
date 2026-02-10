import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Loader2, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface TestUser {
  email: string;
  password: string;
  role: string;
}

const TEST_USERS_STORAGE_KEY = 'test_users_credentials';

export function GenerateTestData() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);

  useEffect(() => {
    const savedUsers = localStorage.getItem(TEST_USERS_STORAGE_KEY);
    if (savedUsers) {
      try {
        setTestUsers(JSON.parse(savedUsers));
      } catch (error) {
        console.error('Error loading saved credentials:', error);
      }
    }
  }, []);

  const generateTestData = async () => {
    if (!user?.practiceId) {
      toast.error('No practice context available');
      return;
    }

    setGenerating(true);
    try {
      const testEmployees = [
        { name: 'Dr. Sarah Johnson', role: 'gp', email: 'sarah.johnson@test.com' },
        { name: 'Nurse Emily Davis', role: 'nurse', email: 'emily.davis@test.com' },
        { name: 'Admin Rachel Green', role: 'administrator', email: 'rachel.green@test.com' },
        { name: 'HCA Tom Wilson', role: 'hca', email: 'tom.wilson@test.com' },
        { name: 'Reception Lisa Brown', role: 'reception', email: 'lisa.brown@test.com' },
        { name: 'Nurse Lead Jane Smith', role: 'nurse_lead', email: 'jane.smith@test.com' },
      ];

      const createdUsers: TestUser[] = [];

      for (const emp of testEmployees) {
        try {
          const response = await fetch(`/api/practices/${user.practiceId}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: emp.name,
              email: emp.email,
              role: emp.role,
            }),
          });

          if (response.ok) {
            createdUsers.push({
              email: emp.email,
              password: 'TestPassword123',
              role: emp.role,
            });
          }
        } catch (error) {
          console.error(`Error creating user ${emp.name}:`, error);
        }
      }

      const testTasks = [
        { title: 'Monthly Fire Safety Check', description: 'Complete fire safety inspection', priority: 'high', status: 'pending' },
        { title: 'Weekly Cleaning Audit', description: 'Review cleaning schedules', priority: 'medium', status: 'pending' },
        { title: 'Staff Training Review', description: 'Review staff training records', priority: 'medium', status: 'pending' },
      ];

      for (const task of testTasks) {
        try {
          await fetch(`/api/practices/${user.practiceId}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(task),
          });
        } catch (error) {
          console.error(`Error creating task ${task.title}:`, error);
        }
      }

      const testIncidents = [
        { title: 'Slip in corridor', description: 'Patient slipped on wet floor', severity: 'moderate', status: 'open' },
        { title: 'Medication error', description: 'Wrong dosage administered', severity: 'high', status: 'investigating' },
      ];

      for (const incident of testIncidents) {
        try {
          await fetch(`/api/practices/${user.practiceId}/incidents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(incident),
          });
        } catch (error) {
          console.error(`Error creating incident ${incident.title}:`, error);
        }
      }

      setTestUsers(createdUsers);
      setShowCredentials(true);
      localStorage.setItem(TEST_USERS_STORAGE_KEY, JSON.stringify(createdUsers));
      toast.success('Test data generated successfully!');
    } catch (error) {
      console.error('Error generating test data:', error);
      toast.error('Failed to generate test data');
    } finally {
      setGenerating(false);
    }
  };

  const copyCredentials = (email: string, password: string, index: number) => {
    navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
    setCopiedIndex(index);
    toast.success('Credentials copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const clearCredentials = () => {
    setTestUsers([]);
    setShowCredentials(false);
    localStorage.removeItem(TEST_USERS_STORAGE_KEY);
    toast.success('Test credentials cleared');
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Generate Test Data
        </CardTitle>
        <CardDescription>
          Create a complete test practice with users and sample data for all modules
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {testUsers.length === 0 ? (
            <>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>This will create:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>6 test users with different roles</li>
                  <li>Sample tasks for various modules</li>
                  <li>Sample incidents and complaints</li>
                </ul>
              </div>
              
              <Button 
                onClick={generateTestData}
                disabled={generating}
                className="w-full"
                data-testid="button-generate-test-data"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Test Data...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Generate Test Data
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              {showCredentials ? (
                <>
                  <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400" data-testid="text-test-data-success">
                      Test data generated successfully!
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Test User Credentials:</h3>
                    {testUsers.map((testUser, index) => (
                      <div 
                        key={index}
                        className="rounded-lg border bg-card p-3 space-y-2"
                        data-testid={`card-test-user-${index}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">Email:</span> {testUser.email}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Password:</span> {testUser.password}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Role: {testUser.role.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyCredentials(testUser.email, testUser.password, index)}
                            data-testid={`button-copy-credentials-${index}`}
                          >
                            {copiedIndex === index ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-muted-foreground mb-4">
                    <p>You can now sign out and log in with any of these test accounts to explore different role permissions.</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCredentials(false)}
                      className="flex-1"
                      data-testid="button-hide-credentials"
                    >
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Credentials
                    </Button>
                    <Button
                      variant="outline"
                      onClick={clearCredentials}
                      className="flex-1"
                      data-testid="button-clear-credentials"
                    >
                      Clear All
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Test credentials saved
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click below to view {testUsers.length} saved test user credentials
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCredentials(true)}
                      className="flex-1"
                      data-testid="button-show-credentials"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Show Credentials
                    </Button>
                    <Button
                      variant="outline"
                      onClick={clearCredentials}
                      className="flex-1"
                      data-testid="button-clear-all"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
