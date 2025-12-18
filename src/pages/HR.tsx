import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, FileText, GraduationCap, Calendar, Shield, Plus, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { DBSTrackingDialog } from '@/components/hr/DBSTrackingDialog';
import { TrainingExpiryAlerts } from '@/components/hr/TrainingExpiryAlerts';
import { AppraisalDialog } from '@/components/hr/AppraisalDialog';
import { Feedback360Dialog } from '@/components/hr/Feedback360Dialog';
import { TrainingCatalogueDialog } from '@/components/hr/TrainingCatalogueDialog';
import { generateTrainingMatrixPDF, generateDBSRegisterPDF } from '@/lib/pdfExportV2';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function HR() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [employees, setEmployees] = useState<any[]>([]);
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [dbsChecks, setDbsChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDBSDialogOpen, setIsDBSDialogOpen] = useState(false);
  const [isAppraisalDialogOpen, setIsAppraisalDialogOpen] = useState(false);
  const [is360FeedbackOpen, setIs360FeedbackOpen] = useState(false);
  const [isTrainingCatalogueOpen, setIsTrainingCatalogueOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedAppraisal, setSelectedAppraisal] = useState<any>(null);
  const [selectedEmployeeForAppraisal, setSelectedEmployeeForAppraisal] = useState<string>('');
  const [practiceId, setPracticeId] = useState<string>('');

  // Employee pagination
  const [employeePage, setEmployeePage] = useState(1);
  const [employeePageSize, setEmployeePageSize] = useState(25);
  const [employeeTotalCount, setEmployeeTotalCount] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchHRData();
  }, [user, navigate, employeePage, employeePageSize]);

  const fetchHRData = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return;

      setPracticeId(userData.practice_id);

      // Get employee count
      const { count: empCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('practice_id', userData.practice_id);

      setEmployeeTotalCount(empCount || 0);

      // Get paginated employees
      const from = (employeePage - 1) * employeePageSize;
      const to = from + employeePageSize - 1;

      const [employeesData, appraisalsData, trainingData, leaveData] = await Promise.all([
        supabase.from('employees').select('*').eq('practice_id', userData.practice_id).range(from, to),
        supabase.from('appraisals').select('*, employees(name)').order('scheduled_date', { ascending: false }).limit(10),
        supabase.from('training_records').select('*, employees(name)').order('completion_date', { ascending: false }).limit(10),
        supabase.from('leave_requests').select('*, employees(name)').eq('status', 'pending').order('created_at', { ascending: false }),
      ]);

      setEmployees(employeesData.data || []);
      setAppraisals(appraisalsData.data || []);
      setTrainingRecords(trainingData.data || []);
      setLeaveRequests(leaveData.data || []);
    } catch (error) {
      console.error('Error fetching HR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeEmployees = employees.filter(e => !e.end_date);
  const pendingAppraisals = appraisals.filter(a => !a.completed_date);

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
          >
            <Plus className="h-4 w-4 mr-2" />
            New Appraisal
          </Button>
          <Button 
            size={isMobile ? 'lg' : 'default'}
            variant="outline"
            className="flex-1 sm:flex-none min-h-[44px]"
            onClick={() => setIsTrainingCatalogueOpen(true)}
          >
            <GraduationCap className="h-4 w-4 mr-2" />
            Training Catalogue
          </Button>
          <Button
            size={isMobile ? 'lg' : 'default'}
            variant="outline"
            className="flex-1 sm:flex-none min-h-[44px]"
            onClick={async () => {
              try {
                const { data: userData } = await supabase
                  .from('users')
                  .select('practice_id')
                  .eq('auth_user_id', user?.id)
                  .single();
                
                if (!userData) throw new Error('User data not found');
                
                const { data: practice } = await supabase
                  .from('practices')
                  .select('name')
                  .eq('id', userData.practice_id)
                  .single();
                
                const { data: employeesData } = await supabase
                  .from('employees')
                  .select('*')
                  .eq('practice_id', userData.practice_id);
                
                const { data: trainingTypesData } = await supabase
                  .from('training_types')
                  .select('*')
                  .eq('practice_id', userData.practice_id);
                
                const { data: trainingRecordsData } = await supabase
                  .from('training_records')
                  .select('*');

                if (employeesData && trainingTypesData && trainingRecordsData) {
                  generateTrainingMatrixPDF({
                    practiceName: practice?.name || 'Unknown Practice',
                    employees: employeesData,
                    trainingTypes: trainingTypesData,
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
            onClick={async () => {
              try {
                const { data: practice } = await supabase
                  .from('practices')
                  .select('name')
                  .eq('id', practiceId)
                  .single();
                
                const { data: employeesData } = await supabase
                  .from('employees')
                  .select('*')
                  .eq('practice_id', practiceId);

                if (dbsChecks && employeesData) {
                  generateDBSRegisterPDF({
                    practiceName: practice?.name || 'Unknown Practice',
                    employees: employeesData,
                    dbsChecks
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
            <div className="text-2xl sm:text-3xl font-bold">{activeEmployees.length}</div>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending Appraisals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{pendingAppraisals.length}</div>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{leaveRequests.length}</div>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Training Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{trainingRecords.length}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading HR data...</div>
      ) : (
        <Tabs defaultValue="employees" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
            <TabsTrigger value="employees" className="text-xs sm:text-sm">Employees</TabsTrigger>
            <TabsTrigger value="dbs" className="text-xs sm:text-sm">DBS</TabsTrigger>
            <TabsTrigger value="appraisals" className="text-xs sm:text-sm">Appraisals</TabsTrigger>
            <TabsTrigger value="training" className="text-xs sm:text-sm">Training</TabsTrigger>
            <TabsTrigger value="leave" className="text-xs sm:text-sm">Leave</TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs sm:text-sm">Alerts</TabsTrigger>
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
                  <>
                    <div className="space-y-3">
                      {employees.map((employee) => (
                        <div 
                          key={employee.id} 
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg touch-manipulation active:bg-accent gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm sm:text-base">{employee.name}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">{employee.role || 'No role assigned'}</p>
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            {employee.start_date && `Started ${new Date(employee.start_date).toLocaleDateString()}`}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Employee Pagination */}
                    {(() => {
                      const totalPages = Math.ceil(employeeTotalCount / employeePageSize);
                      const canGoPrevious = employeePage > 1;
                      const canGoNext = employeePage < totalPages;
                      const startItem = employeeTotalCount === 0 ? 0 : (employeePage - 1) * employeePageSize + 1;
                      const endItem = Math.min(employeePage * employeePageSize, employeeTotalCount);
                      
                      return (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-4 border-t">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Showing {startItem}-{endItem} of {employeeTotalCount}</span>
                            <Select 
                              value={employeePageSize.toString()} 
                              onValueChange={(value) => {
                                setEmployeePageSize(Number(value));
                                setEmployeePage(1);
                              }}
                            >
                              <SelectTrigger className="w-[80px] h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PAGE_SIZE_OPTIONS.map((size) => (
                                  <SelectItem key={size} value={size.toString()}>
                                    {size}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span>per page</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEmployeePage(1)}
                              disabled={!canGoPrevious}
                              className="min-h-[36px]"
                            >
                              First
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEmployeePage(employeePage - 1)}
                              disabled={!canGoPrevious}
                              className="min-h-[36px]"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="px-3 text-sm">
                              Page {employeePage} of {totalPages || 1}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEmployeePage(employeePage + 1)}
                              disabled={!canGoNext}
                              className="min-h-[36px]"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEmployeePage(totalPages)}
                              disabled={!canGoNext}
                              className="min-h-[36px]"
                            >
                              Last
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </>
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
                {appraisals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No appraisals scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appraisals.map((appraisal: any) => (
                      <div 
                        key={appraisal.id} 
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg touch-manipulation active:bg-accent gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base">{appraisal.employees?.name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">Period: {appraisal.period}</p>
                        </div>
                        <div className="text-xs sm:text-sm whitespace-nowrap">
                          {appraisal.completed_date ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300">
                              Completed
                            </Badge>
                          ) : (
                            <span>Due: {appraisal.scheduled_date ? new Date(appraisal.scheduled_date).toLocaleDateString() : 'TBC'}</span>
                          )}
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
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base">{record.course_name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{record.employees?.name}</p>
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          <div>Completed: {new Date(record.completion_date).toLocaleDateString()}</div>
                          {record.expiry_date && (
                            <div>Expires: {new Date(record.expiry_date).toLocaleDateString()}</div>
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
                {leaveRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending leave requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaveRequests.map((request: any) => (
                      <div 
                        key={request.id} 
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg touch-manipulation active:bg-accent gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base">{request.employees?.name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()} ({request.days_count} days)
                          </p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button size={isMobile ? 'default' : 'sm'} variant="outline" className="flex-1 sm:flex-none min-h-[44px]">
                            Approve
                          </Button>
                          <Button size={isMobile ? 'default' : 'sm'} variant="outline" className="flex-1 sm:flex-none min-h-[44px]">
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <TrainingExpiryAlerts />
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
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
