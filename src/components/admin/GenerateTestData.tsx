import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Loader2, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestUser {
  email: string;
  password: string;
  role: string;
}

const TEST_USERS_STORAGE_KEY = 'test_users_credentials';

export function GenerateTestData() {
  const [generating, setGenerating] = useState(false);
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);

  // Load saved credentials from localStorage on mount
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
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-test-data');

      if (error) {
        console.error('Error generating test data:', error);
        toast.error('Failed to generate test data');
        return;
      }

      setTestUsers(data.users);
      setShowCredentials(true);
      // Save to localStorage
      localStorage.setItem(TEST_USERS_STORAGE_KEY, JSON.stringify(data.users));
      toast.success('Test data generated successfully!');
      console.log('Test data generated:', data);
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
                  <li>A test practice: "Test Medical Centre"</li>
                  <li>6 test users with different roles</li>
                  <li>Sample data for all modules (incidents, tasks, complaints, etc.)</li>
                  <li>Fridges, temperature logs, policy documents</li>
                  <li>Task templates and active tasks</li>
                </ul>
              </div>
              
              <Button 
                onClick={generateTestData}
                disabled={generating}
                className="w-full"
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
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      ✓ Test data generated successfully!
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Test User Credentials:</h3>
                    {testUsers.map((user, index) => (
                      <div 
                        key={index}
                        className="rounded-lg border bg-card p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">Email:</span> {user.email}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Password:</span> {user.password}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Role: {user.role.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyCredentials(user.email, user.password, index)}
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
                    >
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Credentials
                    </Button>
                    <Button
                      variant="outline"
                      onClick={clearCredentials}
                      className="flex-1"
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
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Show Credentials
                    </Button>
                    <Button
                      variant="outline"
                      onClick={clearCredentials}
                      className="flex-1"
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
