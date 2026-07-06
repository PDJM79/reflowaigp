import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';
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
import { TrainingAnalysis } from '@/components/hr/TrainingAnalysis';
import { generateTrainingMatrixPDF, generateDBSRegisterPDF } from '@/lib/pdfExportV2';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  practice_manager: 'Practice Manager',
  nurse_lead: 'Nurse Lead',
  cd_lead_gp: 'CD Lead GP',
  estates_lead: 'Estates Lead',
  ig_lead: 'IG Lead',
  reception_lead: 'Reception Lead',
  nurse: 'Nurse',
  hca: 'HCA',
  gp: 'GP',
  reception: 'Receptionist',
  auditor: 'Auditor',
  cleaner: 'Cleaner',
  administrator: 'Administrator',
  group_manager: 'Group Manager',
};

/** DBS renewal RAG: red = overdue, amber = due within 60 days, none otherwise. */
function dbsRenewalState(nextReviewDue: string | null | undefined): { label: string; className: string } | null {
  if (!nextReviewDue) return null;
  const due = new Date(nextReviewDue).getTime();
  if (Number.isNaN(due)) return null;
  const days = Math.floor((due - Date.now()) / 86400000);
  if (days < 0) return { label: 'Overdue', className: 'bg-destructive text-destructive-foreground' };
  if (days < 60) return { label: `Due in ${days}d`, className: 'bg-amber-500 text-white' };
  return null;
}

export default function HR() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { hasCapability, loading: capabilitiesLoading } = useCapabilities();
  const [employees, setEmployees] = useState<any[]>([]);
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<any[]>([]);
  const [catalogueTypes, setCatalogueTypes] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [dbsChecks, setDbsChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDBSDialogOpen, setIsDBSDialogOpen] = useState(false);
  const [isAppraisalDialogOpen, setIsAppraisalDialogOpen] = useState(false);
  const [is360FeedbackOpen, setIs360FeedbackOpen] = useState(false);
  const [isTrainingCatalogueOpen, setIsTrainingCatalogueOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedDbsCheck, setSelectedDbsCheck] = useState<any>(null);
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

      // Core HR data via the Express API (direct-Supabase was RLS-dead).
      // employees + training-records have routes; appraisals / leave_requests /
      // dbs_checks do NOT yet — those sections degrade to empty and are deferred
      // to a follow-up (they need dedicated routes + storage).
      const [empRes, trainRes, dbsRes, apprRes, ttRes] = await Promise.all([
        fetch(`/api/practices/${user.practiceId}/employees`, { credentials: 'include' }),
        fetch(`/api/practices/${user.practiceId}/training-records`, { credentials: 'include' }),
        fetch(`/api/practices/${user.practiceId}/dbs-checks`, { credentials: 'include' }),
        fetch(`/api/practices/${user.practiceId}/appraisals`, { credentials: 'include' }),
        fetch(`/api/practices/${user.practiceId}/training-types`, { credentials: 'include' }),
      ]);
      const employeesAll: any[] = empRes.ok ? await empRes.json() : [];
      const trainingAll: any[] = trainRes.ok ? await trainRes.json() : [];
      const dbsAll: any[] = dbsRes.ok ? await dbsRes.json() : [];
      const apprAll: any[] = apprRes.ok ? await apprRes.json() : [];
      const ttAll: any[] = ttRes.ok ? await ttRes.json() : [];
      setCatalogueTypes(ttAll);

      // Only real HR employees that have a role assigned (matches prior filter).
      const withRole = employeesAll.filter((e) => e.role != null);
      setEmployeeTotalCount(withRole.length);
      const from = (employeePage - 1) * employeePageSize;
      setEmployees(withRole.slice(from, from + employeePageSize));

      // Join employee names onto training records for display.
      const nameById = new Map(employeesAll.map((e: any) => [e.id, e.name]));
      const training = [...trainingAll]
        .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
        .slice(0, 10)
        .map((t: any) => ({
          ...t,
          completion_date: t.completedAt,
          course_name: t.courseName,
          expiry_date: t.expiryDate,
          type_id: t.typeId ?? t.type_id ?? null,
          employees: { name: nameById.get(t.employeeId) },
        }));
      setTrainingRecords(training);

      // DBS checks now via API; map to the snake_case the table renders.
      setDbsChecks(dbsAll.map((d) => ({
        ...d,
        employee_id: d.employeeId ?? d.employee_id,
        check_date: d.checkDate ?? d.check_date,
        certificate_number: d.certificateNumber ?? d.certificate_number,
        next_review_due: d.nextReviewDue ?? d.next_review_due,
      })));
      // Appraisals now via API; map employee names + snake_case for the render.
      setAppraisals(apprAll.map((a) => ({
        ...a,
        employee_id: a.employeeId ?? a.employee_id,
        appraisal_date: a.appraisalDate ?? a.appraisal_date,
        next_due: a.nextDue ?? a.next_due,
        employees: { name: nameById.get(a.employeeId ?? a.employee_id) },
      })));
      setLeaveRequests([]);
    } catch (error) {
      console.error('Error fetching HR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeEmployees = employees.filter(e => !e.end_date);
  const assignRecordType = async (recordId: string, typeId: string | null) => {
    if (!user?.practiceId) return;
    try {
      const res = await fetch(`/api/practices/${user.practiceId}/training-records/${recordId}/type`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typeId }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success('Training record typed');
      fetchHRData();
    } catch { toast.error('Failed to assign training type'); }
  };

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

        // Find employee by name (fetch the list once per practice would be nicer,
        // but keep the per-row match to preserve the existing import semantics).
        const empRes = await fetch(`/api/practices/${practiceId}/employees`, { credentials: 'include' });
        const employees = empRes.ok ? await empRes.json() as any[] : [];
        const employee = employees.find((e) => e.name?.toLowerCase().includes(employeeName.toLowerCase()));

        if (!employee) {
          skipped++;
          continue;
        }

        // Insert DBS check via the API
        const res = await fetch(`/api/practices/${practiceId}/dbs-checks`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: employee.id,
            checkDate: new Date(checkDate).toISOString(),
            certificateNumber: certificateNumber || null,
            nextReviewDue: nextReviewDue ? new Date(nextReviewDue).toISOString() : null,
          }),
        });

        if (!res.ok) {
          console.error('Import error for row:', i, res.status);
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

                const [empRes, trainRes] = await Promise.all([
                  fetch(`/api/practices/${user.practiceId}/employees`, { credentials: 'include' }),
                  fetch(`/api/practices/${user.practiceId}/training-records`, { credentials: 'include' }),
                ]);
                const employeesData = empRes.ok ? await empRes.json() : [];
                const trainingRecordsData = trainRes.ok ? await trainRes.json() : [];
                // training_types has no backing table (phantom) — pass an empty set.
                const trainingTypesData: any[] = [];

                if (employeesData && trainingRecordsData) {
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
                const practiceRes = await fetch(`/api/practices/${practiceId}`, { credentials: 'include' });
                const practice = practiceRes.ok ? await practiceRes.json() : null;

                const empRes = await fetch(`/api/practices/${practiceId}/employees`, { credentials: 'include' });
                const employeesData = empRes.ok ? await empRes.json() : [];

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
                            <p className="text-xs sm:text-sm text-muted-foreground">{ROLE_DISPLAY_NAMES[employee.role] || employee.role || 'No role assigned'}</p>
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
                      const renewal = dbsRenewalState(check.next_review_due);
                      return (
                        <button
                          type="button"
                          key={check.id}
                          onClick={() => { setSelectedEmployee(employee ?? { id: check.employee_id }); setSelectedDbsCheck(check); setIsDBSDialogOpen(true); }}
                          className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg text-left hover:bg-accent/50 active:bg-accent gap-2 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm sm:text-base">{employee?.name || 'Unknown Employee'}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {check.certificate_number && `Cert: ${check.certificate_number}`}
                            </p>
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground text-right flex flex-col items-end gap-1">
                            <div>Checked: {new Date(check.check_date).toLocaleDateString()}</div>
                            {check.next_review_due && (
                              <div className="flex items-center gap-2">
                                <span>Review Due: {new Date(check.next_review_due).toLocaleDateString()}</span>
                                {renewal && <Badge className={renewal.className}>{renewal.label}</Badge>}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appraisals">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base sm:text-lg">Appraisal History</CardTitle>
                <div className="flex gap-2">
                  <Select value={selectedEmployeeForAppraisal} onValueChange={setSelectedEmployeeForAppraisal}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e: any) => (<SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" disabled={!selectedEmployeeForAppraisal}
                    onClick={() => { setSelectedAppraisal(null); setIsAppraisalDialogOpen(true); }}>
                    Record
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {appraisals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No appraisals recorded</p>
                    <p className="text-sm mt-2">Select an employee and record their appraisal.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appraisals.map((appraisal: any) => {
                      const nextDue = appraisal.next_due;
                      const overdue = nextDue && new Date(nextDue).getTime() < Date.now();
                      return (
                        <button
                          type="button"
                          key={appraisal.id}
                          onClick={() => { setSelectedEmployeeForAppraisal(appraisal.employee_id); setSelectedAppraisal(appraisal); setIsAppraisalDialogOpen(true); }}
                          className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg text-left hover:bg-accent/50 gap-2 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm sm:text-base">{appraisal.employees?.name || 'Employee'}</p>
                            {appraisal.summary && <p className="text-xs sm:text-sm text-muted-foreground truncate">{appraisal.summary}</p>}
                          </div>
                          <div className="text-xs sm:text-sm text-right flex flex-col items-end gap-1">
                            <span>Appraised: {new Date(appraisal.appraisal_date).toLocaleDateString()}</span>
                            {nextDue && (
                              <span className="flex items-center gap-2">
                                Next due: {new Date(nextDue).toLocaleDateString()}
                                {overdue && <Badge className="bg-destructive text-destructive-foreground">Overdue</Badge>}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="training">
            <div className="space-y-4">
            <TrainingAnalysis />
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
                          {record.type_id && (
                            <Badge variant="outline" className="mt-1">{catalogueTypes.find((t) => t.id === record.type_id)?.name ?? 'Typed'}</Badge>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-xs sm:text-sm text-muted-foreground text-right">
                            <div>Completed: {record.completion_date ? new Date(record.completion_date).toLocaleDateString() : '—'}</div>
                            {record.expiry_date && (
                              <div>Expires: {new Date(record.expiry_date).toLocaleDateString()}</div>
                            )}
                          </div>
                          {catalogueTypes.length > 0 && (
                            <Select value={record.type_id ?? 'none'} onValueChange={(v) => assignRecordType(record.id, v === 'none' ? null : v)}>
                              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Assign type" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No type</SelectItem>
                                {catalogueTypes.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
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
            setSelectedDbsCheck(null);
          }}
          employeeId={selectedEmployee.id}
          practiceId={practiceId}
          existingCheck={selectedDbsCheck}
        />
      )}

      {selectedEmployeeForAppraisal && isAppraisalDialogOpen && (
        <AppraisalDialog
          employeeId={selectedEmployeeForAppraisal}
          existing={selectedAppraisal}
          open={isAppraisalDialogOpen}
          onOpenChange={(open) => {
            setIsAppraisalDialogOpen(open);
            if (!open) {
              setSelectedEmployeeForAppraisal('');
              setSelectedAppraisal(null);
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
