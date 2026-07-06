import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Building, Loader2, RefreshCw, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Room { id: string; name: string; type?: string | null }
interface Assessment { id: string; room_id: string; assessment_date: string; outcome: string | null; notes: string | null; next_due: string | null }

function plusOneYear(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export default function RoomAssessments() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ roomId: "", assessmentDate: today, outcome: "pass", notes: "", nextDue: plusOneYear(today) });

  const load = useCallback(async () => {
    if (!user?.practiceId) return;
    setLoading(true); setError(false);
    try {
      const [rRes, aRes] = await Promise.all([
        fetch(`/api/practices/${user.practiceId}/rooms`, { credentials: "include" }),
        fetch(`/api/practices/${user.practiceId}/room-assessments`, { credentials: "include" }),
      ]);
      if (!rRes.ok || !aRes.ok) throw new Error("load failed");
      setRooms(await rRes.json());
      setAssessments(await aRes.json());
    } catch { setError(true); } finally { setLoading(false); }
  }, [user?.practiceId]);

  useEffect(() => { load(); }, [load]);

  const latestByRoom = new Map<string, Assessment>();
  for (const a of assessments) if (!latestByRoom.has(a.room_id)) latestByRoom.set(a.room_id, a);

  const submit = async () => {
    if (!user?.practiceId) return;
    if (!form.roomId) { toast.error("Select a room"); return; }
    if (!form.assessmentDate) { toast.error("Assessment date is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/practices/${user.practiceId}/room-assessments`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: form.roomId, assessmentDate: form.assessmentDate, outcome: form.outcome, notes: form.notes || null, nextDue: form.nextDue || null }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Failed (${res.status})`); }
      const created = await res.json();
      toast.success(created.remedialTaskId ? "Assessment recorded — remedial task raised" : "Assessment recorded");
      setDialogOpen(false);
      setForm({ roomId: "", assessmentDate: today, outcome: "pass", notes: "", nextDue: plusOneYear(today) });
      load();
    } catch (e: any) { toast.error(e.message || "Failed to record assessment"); } finally { setSaving(false); }
  };

  const dueState = (nextDue: string | null) => {
    if (!nextDue) return null;
    const days = Math.floor((new Date(nextDue).getTime() - Date.now()) / 86400000);
    if (days < 0) return { label: "Overdue", className: "bg-destructive text-destructive-foreground" };
    if (days < 60) return { label: `Due in ${days}d`, className: "bg-amber-500 text-white" };
    return null;
  };
  const outcomeBadge = (o: string | null) =>
    o === "pass" ? "bg-green-500/15 text-green-700 dark:text-green-300"
    : o === "issues" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
    : o === "fail" ? "bg-destructive/15 text-destructive" : "";

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2"><BackButton /><h1 className="text-2xl sm:text-3xl font-bold">Annual Room Assessments</h1></div>
          <p className="text-muted-foreground">Per-room safety assessments with renewal tracking</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={rooms.length === 0}><Plus className="h-4 w-4 mr-2" />Record Assessment</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Rooms</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-muted-foreground">Failed to load room assessments.</p>
              <Button variant="outline" size="sm" onClick={() => load()}><RefreshCw className="h-4 w-4 mr-2" />Retry</Button>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No rooms configured.</p>
              <p className="text-sm mt-1">Add rooms in the Cleaning module to begin tracking assessments.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => {
                const latest = latestByRoom.get(room.id);
                const due = latest ? dueState(latest.next_due) : null;
                return (
                  <div key={room.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{room.name}</p>
                      {latest ? (
                        <p className="text-xs text-muted-foreground">
                          Last assessed {new Date(latest.assessment_date).toLocaleDateString()}
                          {latest.notes ? ` · ${latest.notes}` : ""}
                        </p>
                      ) : <p className="text-xs text-muted-foreground">Never assessed</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {latest?.outcome && <Badge className={outcomeBadge(latest.outcome)}>{latest.outcome}</Badge>}
                      {latest?.next_due && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          Next: {new Date(latest.next_due).toLocaleDateString()}
                          {due && <Badge className={due.className}>{due.label}</Badge>}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader><DialogTitle>Record Room Assessment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Room</Label>
              <Select value={form.roomId} onValueChange={(v) => setForm({ ...form, roomId: v })}>
                <SelectTrigger><SelectValue placeholder="Select a room" /></SelectTrigger>
                <SelectContent>{rooms.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assessment date</Label>
                <Input type="date" value={form.assessmentDate}
                  onChange={(e) => setForm({ ...form, assessmentDate: e.target.value, nextDue: plusOneYear(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Next due</Label>
                <Input type="date" value={form.nextDue} onChange={(e) => setForm({ ...form, nextDue: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={form.outcome} onValueChange={(v) => setForm({ ...form, outcome: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="issues">Issues found</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
              {(form.outcome === "issues" || form.outcome === "fail") && (
                <p className="text-xs text-amber-600 dark:text-amber-500">A high-importance remedial task will be raised for the estates lead.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.roomId}>{saving ? "Saving…" : "Record"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
