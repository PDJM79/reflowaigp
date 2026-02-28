import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, FileText, GraduationCap, Calendar, Shield, Plus, FileDown, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const { hasCapability, loading: capabilitiesLoading } = useCapabilities();
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
  const practiceId = user?.practiceId ?? '';
  const [isImportingDBS, setIsImportingDBS] = useState(false);

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
      if (!user?.practiceId) return;

      // Get employee count
      const { count: empCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('practice_id', user.practiceId);

      setEmployeeTotalCount(empCount || 0);

      // Get paginated employees
      const from = (employeePage - 1) * employeePageSize;
      const to = from + employeePageSize - 1;

      const [employeesData, appraisalsData, trainingData, leaveData, dbsData] = await Promise.all([
        supabase.from('employees').select('*').eq('practice_id', user.practiceId).range(from, to),
        supabase.from('appraisals').select('*, employees(name)').order('scheduled_date', { ascending: false }).limit(10),
        supabase.from('training_records').select('*, employees(name)').order('completion_date', { ascending: false }).limit(10),
        supabase.from('leave_requests').select('*, employees(name)').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('dbs_checks').select('*').eq('practice_id', user.practiceId).order('check_date', { ascending: false }),
      ]);

      setEmployees(employeesData.data || []);
      setAppraisals(appraisalsData.data || []);
      setTrainingRecords(trainingData.data || []);
      setLeaveRequests(leaveData.data || []);
      setDbsChecks(dbsData.data || []);
    } catch (error) {
      console.error('Error fetching HR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeEmployees = employees.filter(e => !e.end_date);
  const pendingAppraisals = appraisals.filter(a => !a.completed_date);

  // Capability check - requires manage_training or manage_appraisals capability
  const canManageHR = hasCapability('manage_training') || hasCapability('manage_appraisals');

  if (capabilitiesLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canManageHR) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You need training or appraisal management capabilities to access HR.
            </p>
            <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDBSImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !practiceId) return;

    setIsImportingDBS(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('employee'));
      const dateIndex = headers.findIndex(h => h.includes('check') && h.includes('date') || h === 'date');
      const certIndex = headers.findIndex(h => h.includes('certificate') || h.includes('cert'));
      const reviewIndex = headers.findIndex(h => h.includes('review') || h.includes('next'));

      if (nameIndex === -1 || dateIndex === -1) {
        toast.error('CSV must contain employee name and check date columns');
        return;
      }

      let imported = 0;
      let skipped = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const employeeName = values[nameIndex];
        const checkDate = values[dateIndex];
        const certificateNumber = certIndex !== -1 ? values[certIndex] : null;
        const nextReviewDue = reviewIndex !== -1 ? values[reviewIndex] : null;

        if (!employeeName || !checkDate) {
          skipped++;
          continue;
        }

        // Find employee by name
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('practice_id', practiceId)
          .ilike('name', `%${employeeName}%`)
          .single();

        if (!employee) {
          skipped++;
          continue;
        }

        // Insert DBS check
        const { error } = await supabase.from('dbs_checks').insert({
          employee_id: employee.id,
          practice_id: practiceId,
          check_date: new Date(checkDate).toISOString().split('T')[0],
          certificate_number: certificateNumber || null,
          next_review_due: nextReviewDue ? new Date(nextReviewDue).toISOString().split('T')[0] : null,
        });

        if (error) {
          console.error('Import error for row:', i, error);
          skipped++;
        } else {
          imported++;
        }
      }

      toast.success(`Imported ${imported} DBS checks${skipped > 0 ? `, ${skipped} skipped` : ''}`);
      fetchHRData();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import DBS checks');
    } finally {
      setIsImportingDBS(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BackButton />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 sm:h-8 sm:w-8" />
              Human Resources
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage employees, training, appraisals, and leave</p>
          </div>
        </div>
        
        {/* Action Buttons - Separate Row */}
        <div className="flex flex-wrap gap-2">
          <Button 
            size={isMobile ? 'lg' : 'default'}
            className="min-h-[44px]"
            onClick={() => setIsAppraisalDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Appraisal
          </Button>
          <Button 
            size={isMobile ? 'lg' : 'default'}
            variant="outline"
            className="min-h-[44px]"
            onClick={() => setIsTrainingCatalogueOpen(true)}
          >
            <GraduationCap className="h-4 w-4 mr-2" />
            Training Catalogue
          </Button>
          <Button
            size={isMobile ? 'lg' : 'default'}
            variant="outline"
            className="min-h-[44px]"
            onClick={async () => {
              try {
                if (!user?.practiceId) throw new Error('User data not found');

                const { data: employeesData } = await supabase
                  .from('employees')
                  .select('*')
                  .eq('practice_id', user.practiceId);

                const { data: trainingTypesData } = await supabase
                  .from('training_types')
                  .select('*')
                  .eq('practice_id', user.practiceId);
                
                const { data: trainingRecordsData } = await supabase
                  .from('training_records')
                  .select('*');

                if (employeesData && trainingTypesData && trainingRecordsData) {
                  generateTrainingMatrixPDF({
                    practiceName: user.practice?.name || 'Unknown Practice',
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
            className="min-h-[44px]"
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

          <TabsContent value="dbs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base sm:text-lg">DBS Checks</CardTitle>
                <div className="flex gap-2">
                  <Label htmlFor="dbs-import" className="cursor-pointer">
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[36px]"
                      disabled={isImportingDBS}
                      asChild
                    >
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {isImportingDBS ? 'Importing...' : 'Import CSV'}
                      </span>
                    </Button>
                  </Label>
                  <Input
                    id="dbs-import"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleDBSImport}
                    disabled={isImportingDBS}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">
                  Import CSV with columns: Employee Name, Check Date, Certificate Number (optional), Next Review Due (optional)
                </p>
                {dbsChecks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No DBS checks recorded</p>
                    <p className="text-sm mt-2">Import a CSV file or add DBS checks from the employee list</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dbsChecks.map((check: any) => {
                      const employee = employees.find(e => e.id === check.employee_id);
                      return (
                        <div 
                          key={check.id} 
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg touch-manipulation active:bg-accent gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm sm:text-base">{employee?.name || 'Unknown Employee'}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {check.certificate_number && `Cert: ${check.certificate_number}`}
                            </p>
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground text-right">
                            <div>Checked: {new Date(check.check_date).toLocaleDateString()}</div>
                            {check.next_review_due && (
                              <div>Review Due: {new Date(check.next_review_due).toLocaleDateString()}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
