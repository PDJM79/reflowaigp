import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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

  const { data: employeeData, isLoading } = useQuery({
    queryKey: ['self-service-data', user?.practiceId, user?.id],
    queryFn: async () => {
      if (!user?.practiceId) return null;

      const [employeesRes, trainingRes] = await Promise.all([
        fetch(`/api/practices/${user.practiceId}/employees`, { credentials: 'include' }),
        fetch(`/api/practices/${user.practiceId}/training-records`, { credentials: 'include' }),
      ]);

      const employees = employeesRes.ok ? await employeesRes.json() : [];
      const trainingRecords = trainingRes.ok ? await trainingRes.json() : [];

      const employee = (employees || []).find((e: any) => e.userId === user.id) || null;

      if (!employee) return null;

      const myTraining = (trainingRecords || []).filter(
        (r: any) => r.employeeId === employee.id
      );

      return {
        employee,
        dbsChecks: [],
        trainingRecords: myTraining,
        appraisals: [],
      };
    },
    enabled: !!user?.practiceId,
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
                  Next review: {new Date(dbsChecks[0].nextReviewDue).toLocaleDateString()}
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
              {employee.startDate ? new Date(employee.startDate).toLocaleDateString() : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="training" className="space-y-4">
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
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>DBS check records are not available through this interface yet.</p>
                <p className="text-sm">Contact your practice manager for DBS information.</p>
              </div>
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
                          <p className="font-medium">{record.courseName}</p>
                          {record.isMandatory && (
                            <Badge variant="outline" className="text-xs">Mandatory</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Completed: {record.completionDate ? new Date(record.completionDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      {record.expiryDate && (
                        <div className="text-right">
                          <p className="text-sm font-medium">Expires</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(record.expiryDate).toLocaleDateString()}
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
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Appraisal records are not available through this interface yet.</p>
                <p className="text-sm">Contact your practice manager for appraisal information.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}