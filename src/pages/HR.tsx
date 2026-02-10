import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, FileText, GraduationCap, Calendar, Shield, Plus, FileDown } from 'lucide-react';
import { DBSTrackingDialog } from '@/components/hr/DBSTrackingDialog';
import { TrainingExpiryAlerts } from '@/components/hr/TrainingExpiryAlerts';
import { AppraisalDialog } from '@/components/hr/AppraisalDialog';
import { Feedback360Dialog } from '@/components/hr/Feedback360Dialog';
import { TrainingCatalogueDialog } from '@/components/hr/TrainingCatalogueDialog';
import { generateTrainingMatrixPDF, generateDBSRegisterPDF } from '@/lib/pdfExportV2';
import { toast } from 'sonner';

export default function HR() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [employees, setEmployees] = useState<any[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDBSDialogOpen, setIsDBSDialogOpen] = useState(false);
  const [isAppraisalDialogOpen, setIsAppraisalDialogOpen] = useState(false);
  const [is360FeedbackOpen, setIs360FeedbackOpen] = useState(false);
  const [isTrainingCatalogueOpen, setIsTrainingCatalogueOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedAppraisal, setSelectedAppraisal] = useState<any>(null);
  const [selectedEmployeeForAppraisal, setSelectedEmployeeForAppraisal] = useState<string>('');

  const practiceId = user?.practiceId || '';

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchHRData();
  }, [user, navigate]);

  const fetchHRData = async () => {
    if (!practiceId) return;
    try {
      const [employeesRes, trainingRes] = await Promise.all([
        fetch(`/api/practices/${practiceId}/employees`, { credentials: 'include' }),
        fetch(`/api/practices/${practiceId}/training-records`, { credentials: 'include' }),
      ]);

      if (employeesRes.ok) {
        const empData = await employeesRes.json();
        setEmployees(empData || []);
      }

      if (trainingRes.ok) {
        const trainData = await trainingRes.json();
        setTrainingRecords(trainData || []);
      }
    } catch (error) {
      console.error('Error fetching HR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeEmployees = employees.filter(e => !e.endDate);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <BackButton />
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 sm:h-8 sm:w-8" />
              Human Resources
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">Manage employees, training, appraisals, and leave</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            size={isMobile ? 'lg' : 'default'}
            className="flex-1 sm:flex-none min-h-[44px]"
            onClick={() => setIsAppraisalDialogOpen(true)}
            data-testid="button-new-appraisal"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Appraisal
          </Button>
          <Button 
            size={isMobile ? 'lg' : 'default'}
            variant="outline"
            className="flex-1 sm:flex-none min-h-[44px]"
            onClick={() => setIsTrainingCatalogueOpen(true)}
            data-testid="button-training-catalogue"
          >
            <GraduationCap className="h-4 w-4 mr-2" />
            Training Catalogue
          </Button>
          <Button
            size={isMobile ? 'lg' : 'default'}
            variant="outline"
            className="flex-1 sm:flex-none min-h-[44px]"
            data-testid="button-export-training-matrix"
            onClick={async () => {
              try {
                const [employeesRes, trainingRes] = await Promise.all([
                  fetch(`/api/practices/${practiceId}/employees`, { credentials: 'include' }),
                  fetch(`/api/practices/${practiceId}/training-records`, { credentials: 'include' }),
                ]);

                const employeesData = employeesRes.ok ? await employeesRes.json() : [];
                const trainingRecordsData = trainingRes.ok ? await trainingRes.json() : [];

                if (employeesData.length > 0) {
                  generateTrainingMatrixPDF({
                    practiceName: user?.practice?.name || 'Unknown Practice',
                    employees: employeesData,
                    trainingTypes: [],
                    trainingRecords: trainingRecordsData
                  });
                  toast.success('Training Matrix PDF exported');
                }
              } catch (error) {
                console.error('Export error:', error);
                toast.error('Failed to export PDF');
              }
            }}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export Training Matrix
          </Button>
          <Button
            size={isMobile ? 'lg' : 'default'}
            variant="outline"
            className="flex-1 sm:flex-none min-h-[44px]"
            data-testid="button-export-dbs-register"
            onClick={async () => {
              try {
                const employeesRes = await fetch(`/api/practices/${practiceId}/employees`, { credentials: 'include' });
                const employeesData = employeesRes.ok ? await employeesRes.json() : [];

                if (employeesData.length > 0) {
                  generateDBSRegisterPDF({
                    practiceName: user?.practice?.name || 'Unknown Practice',
                    employees: employeesData,
                    dbsChecks: []
                  });
                  toast.success('DBS Register PDF exported');
                }
              } catch (error) {
                console.error('Export error:', error);
                toast.error('Failed to export PDF');
              }
            }}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export DBS Register
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold" data-testid="text-active-employees-count">{activeEmployees.length}</div>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending Appraisals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold" data-testid="text-pending-appraisals-count">0</div>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold" data-testid="text-leave-requests-count">0</div>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Training Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold" data-testid="text-training-records-count">{trainingRecords.length}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading HR data...</div>
      ) : (
        <Tabs defaultValue="employees" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
            <TabsTrigger value="employees" className="text-xs sm:text-sm" data-testid="tab-employees">Employees</TabsTrigger>
            <TabsTrigger value="dbs" className="text-xs sm:text-sm" data-testid="tab-dbs">DBS</TabsTrigger>
            <TabsTrigger value="appraisals" className="text-xs sm:text-sm" data-testid="tab-appraisals">Appraisals</TabsTrigger>
            <TabsTrigger value="training" className="text-xs sm:text-sm" data-testid="tab-training">Training</TabsTrigger>
            <TabsTrigger value="leave" className="text-xs sm:text-sm" data-testid="tab-leave">Leave</TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs sm:text-sm" data-testid="tab-alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Employee Directory</CardTitle>
              </CardHeader>
              <CardContent>
                {employees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No employees registered</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {employees.map((employee) => (
                      <div 
                        key={employee.id} 
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg touch-manipulation active:bg-accent gap-2"
                        data-testid={`card-employee-${employee.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base" data-testid={`text-employee-name-${employee.id}`}>{employee.name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{employee.role || 'No role assigned'}</p>
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {employee.startDate && `Started ${new Date(employee.startDate).toLocaleDateString()}`}
                        </div>
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
                <CardTitle className="text-base sm:text-lg">Recent Appraisals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No appraisals scheduled</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="training">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Training Records</CardTitle>
              </CardHeader>
              <CardContent>
                {trainingRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No training records</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trainingRecords.map((record: any) => (
                      <div 
                        key={record.id} 
                        className="flex flex-col sm:flex-row items-start justify-between p-4 border rounded-lg touch-manipulation active:bg-accent gap-2"
                        data-testid={`card-training-${record.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base">{record.courseName}</p>
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {record.completionDate && (
                            <div>Completed: {new Date(record.completionDate).toLocaleDateString()}</div>
                          )}
                          {record.expiryDate && (
                            <div>Expires: {new Date(record.expiryDate).toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leave">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Pending Leave Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending leave requests</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <TrainingExpiryAlerts />
          </TabsContent>
        </Tabs>
      )}

      {selectedEmployee && (
        <DBSTrackingDialog
          open={isDBSDialogOpen}
          onClose={() => {
            setIsDBSDialogOpen(false);
            setSelectedEmployee(null);
          }}
          employeeId={selectedEmployee.id}
          practiceId={practiceId}
        />
      )}

      {selectedEmployeeForAppraisal && (
        <AppraisalDialog
          employeeId={selectedEmployeeForAppraisal}
          open={isAppraisalDialogOpen}
          onOpenChange={(open) => {
            setIsAppraisalDialogOpen(open);
            if (!open) {
              setSelectedEmployeeForAppraisal('');
              fetchHRData();
            }
          }}
          onSuccess={fetchHRData}
        />
      )}

      {selectedAppraisal && (
        <Feedback360Dialog
          open={is360FeedbackOpen}
          onOpenChange={setIs360FeedbackOpen}
          appraisalId={selectedAppraisal.id}
          employeeName={selectedAppraisal.employees?.name || 'Employee'}
          onSuccess={fetchHRData}
        />
      )}

      <TrainingCatalogueDialog
        open={isTrainingCatalogueOpen}
        onOpenChange={(open) => {
          setIsTrainingCatalogueOpen(open);
          if (!open) fetchHRData();
        }}
        onSuccess={fetchHRData}
      />
    </div>
  );
}
