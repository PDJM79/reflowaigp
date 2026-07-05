import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useMasterUser } from './useMasterUser';

export interface Task {
  id: string;
  name: string;
  dueAt: string;
  status: 'green' | 'amber' | 'red';
  progress: string;
  assigneeName: string;
  assigneeRole: string;
  isCurrentUser: boolean;
}

export function useTaskData() {
  const { user } = useAuth();
  const { isMasterUser, selectedPracticeId } = useMasterUser();
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [otherTasks, setOtherTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

  const fetchTasks = async () => {
    try {
      // Use session user — no extra Supabase lookup needed
      let targetPracticeId = user.practiceId;
      if (isMasterUser && selectedPracticeId) {
        targetPracticeId = selectedPracticeId;
      }


      // Get practice manager for default assignment via the is_practice_manager flag.
      // (The former user_practice_roles/role_catalog lookup was RLS-dead under
      // session auth and always fell through to this flag — see docs/RBAC_MAP.md.)
      const { data: fallbackPM } = await supabase
        .from('users')
        .select('id, name')
        .eq('practice_id', targetPracticeId)
        .eq('is_practice_manager', true)
        .limit(1)
        .maybeSingle();

      const practiceManager: { id: string; name: string } | null = fallbackPM;


      // Get ALL process instances for the target practice with template info
      const { data: processInstances, error: processError } = await supabase
        .from('process_instances')
        .select(`
          *,
          process_templates!inner (
            name,
            responsible_role,
            steps,
            sla_hours
          ),
          users!assignee_id (
            id,
            name
          )
        `)
        .eq('practice_id', targetPracticeId);

      if (!processInstances) {
        return;
      }

      // Auto-assign unassigned processes to practice manager
      const unassignedProcesses = processInstances.filter(p => !p.assignee_id);
      
      if (unassignedProcesses.length > 0 && practiceManager) {
        const { error: assignError } = await supabase
          .from('process_instances')
          .update({ assignee_id: practiceManager.id })
          .in('id', unassignedProcesses.map(p => p.id));

        if (assignError) {
          console.error('Error auto-assigning to practice manager:', assignError);
        } else {
          // Refresh data after assignment
          const { data: updatedProcessInstances } = await supabase
            .from('process_instances')
            .select(`
              *,
              process_templates!inner (
                name,
                responsible_role,
                steps,
                sla_hours
              ),
              users!assignee_id (
                id,
                name
              )
            `)
            .eq('practice_id', targetPracticeId);
          
          if (updatedProcessInstances) {
            processInstances.splice(0, processInstances.length, ...updatedProcessInstances);
          }
        }
      }

      // Convert to Task format
      const tasks: Task[] = processInstances.map(instance => {
        const template = instance.process_templates;
        const assignee = instance.users;
        
        // Calculate progress and status based on completion and SLA
        let progress = '0/0 complete';
        let status: 'green' | 'amber' | 'red' = 'red';
        
        if (instance.status === 'complete') {
          status = 'green';
          progress = 'Complete';
        } else if (instance.status === 'in_progress') {
          status = 'amber';
          progress = 'In Progress';
        } else if (new Date(instance.due_at) < new Date()) {
          status = 'red';
          progress = 'Overdue';
        }

        // Check if this task is assigned to ANY of the current user's roles
        // A task is "current user's" if assigned to someone who has a role the current user also has
        const isCurrentUserTask = assignee?.id === user.id;

        return {
          id: instance.id,
          name: template?.name || 'Unnamed Process',
          dueAt: new Date(instance.due_at).toLocaleDateString(),
          status,
          progress,
          assigneeName: assignee?.name || 'Unassigned',
          assigneeRole: template?.responsible_role || 'Unknown',
          isCurrentUser: isCurrentUserTask
        };
      });


      // Split tasks based on current user
      // User tasks = tasks assigned to the current user
      // Other tasks = tasks assigned to other users
      const userTasksList = tasks.filter(task => task.isCurrentUser);
      const otherTasksList = tasks.filter(task => !task.isCurrentUser);


      setUserTasks(userTasksList);
      setOtherTasks(otherTasksList);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      
      // Fallback to empty arrays on error
      setUserTasks([]);
      setOtherTasks([]);
    } finally {
      setLoading(false);
    }
  };

    fetchTasks();
  }, [user, isMasterUser, selectedPracticeId]);

  return { userTasks, otherTasks, loading };
}