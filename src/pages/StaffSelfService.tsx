import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Shield, GraduationCap, FileText, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function StaffSelfService() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch employee self-service data
  const { data: employeeData, isLoading } = useQuery({
    queryKey: ['self-service-data', user?.id],
    queryFn: async () => {
      const { data: userData } = await (supabase as any)
        .from('users')
        .select('id, practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return null;

      // Get employee record
      const { data: employee } = await (supabase as any)
        .from('employees')
        .select('*')
        .eq('user_id', userData.id)
        .single();

      if (!employee) return null;

      // Get DBS checks
      const { data: dbsChecks } = await (supabase as any)
        .from('dbs_checks')
        .select('*')
        .eq('employee_id', employee.id)
        .order('check_date', { ascending: false });

      // Get training records
      const { data: trainingRecords } = await (supabase as any)
        .from('training_records')
        .select('*')
        .eq('employee_id', employee.id)
        .order('completion_date', { ascending: false });

      // Get appraisals
      const { data: appraisals } = await (supabase as any)
        .from('appraisals')
        .select('*')
        .eq('employee_id', employee.id)
        .order('scheduled_date', { ascending: false });

      return {
        employee,
        dbsChecks: dbsChecks || [],
        trainingRecords: trainingRecords || [],
        appraisals: appraisals || [],
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading your information...</div>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No employee record found. Please contact your practice manager.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { employee, dbsChecks, trainingRecords, appraisals } = employeeData;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="h-8 w-8" />
          My Information
        </h1>
        <p className="text-muted-foreground">View your HR records and training certificates</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              DBS Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dbsChecks.length > 0 ? (
              <div>
                <div className="text-2xl font-bold">Valid</div>
                <p className="text-xs text-muted-foreground">
                  Next review: {new Date(dbsChecks[0].next_review_due).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No DBS record</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Training
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trainingRecords.length}</div>
            <p className="text-xs text-muted-foreground">Certificates on file</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Appraisals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appraisals.filter((a: any) => a.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Start Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {new Date(employee.start_date).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="dbs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dbs">DBS Checks</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="appraisals">Appraisals</TabsTrigger>
        </TabsList>

        <TabsContent value="dbs">
          <Card>
            <CardHeader>
              <CardTitle>DBS Check History</CardTitle>
            </CardHeader>
            <CardContent>
              {dbsChecks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No DBS checks recorded</p>
              ) : (
                <div className="space-y-3">
                  {dbsChecks.map((check: any) => (
                    <div key={check.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Check Date: {new Date(check.check_date).toLocaleDateString()}</p>
                        {check.certificate_number && (
                          <p className="text-sm text-muted-foreground">Cert: {check.certificate_number}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Next Review</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(check.next_review_due).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training">
          <Card>
            <CardHeader>
              <CardTitle>Training Certificates</CardTitle>
            </CardHeader>
            <CardContent>
              {trainingRecords.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No training records</p>
              ) : (
                <div className="space-y-3">
                  {trainingRecords.map((record: any) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{record.course_name}</p>
                          {record.is_mandatory && (
                            <Badge variant="outline" className="text-xs">Mandatory</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Completed: {new Date(record.completion_date).toLocaleDateString()}
                        </p>
                      </div>
                      {record.expiry_date && (
                        <div className="text-right">
                          <p className="text-sm font-medium">Expires</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(record.expiry_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appraisals">
          <Card>
            <CardHeader>
              <CardTitle>Appraisal History</CardTitle>
            </CardHeader>
            <CardContent>
              {appraisals.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No appraisals recorded</p>
              ) : (
                <div className="space-y-3">
                  {appraisals.map((appraisal: any) => (
                    <div key={appraisal.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{appraisal.period}</p>
                        <p className="text-sm text-muted-foreground">
                          {appraisal.scheduled_date && `Scheduled: ${new Date(appraisal.scheduled_date).toLocaleDateString()}`}
                        </p>
                      </div>
                      <Badge variant={appraisal.status === 'completed' ? 'default' : 'secondary'}>
                        {appraisal.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
