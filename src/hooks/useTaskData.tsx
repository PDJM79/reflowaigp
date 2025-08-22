import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [otherTasks, setOtherTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

  const fetchTasks = async () => {
    try {
      // Get user's practice info
      const { data: userData } = await supabase
        .from('users')
        .select('id, practice_id, name, role')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) return;

      // Get practice manager for default assignment
      const { data: practiceManager } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('practice_id', userData.practice_id)
        .eq('is_practice_manager', true)
        .single();

      // Get process instances for the practice with template info
      const { data: processInstances } = await supabase
        .from('process_instances')
        .select(`
          *,
          process_templates!inner (
            name,
            responsible_role,
            steps
          ),
          users!assignee_id (
            name,
            role
          )
        `)
        .eq('practice_id', userData.practice_id);

      if (!processInstances) return;

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
                steps
              ),
              users!assignee_id (
                name,
                role
              )
            `)
            .eq('practice_id', userData.practice_id);
          
          if (updatedProcessInstances) {
            processInstances.splice(0, processInstances.length, ...updatedProcessInstances);
          }
        }
      }

      // Convert to Task format
      const tasks: Task[] = processInstances.map(instance => {
        const template = instance.process_templates;
        const assignee = instance.users;
        
        // Calculate progress based on step completion
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

        return {
          id: instance.id,
          name: template?.name || 'Unnamed Process',
          dueAt: new Date(instance.due_at).toLocaleDateString(),
          status,
          progress,
          assigneeName: assignee?.name || 'Unassigned',
          assigneeRole: assignee?.role || 'Unknown',
          isCurrentUser: instance.assignee_id === userData.id
        };
      });

      // Split tasks based on current user
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
  }, [user]);

  return { userTasks, otherTasks, loading };
}