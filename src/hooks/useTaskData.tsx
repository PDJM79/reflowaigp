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
          .select('practice_id, name, role')
          .eq('auth_user_id', user.id)
          .single();

        if (!userData) return;

        // Get all role assignments for the practice
        const { data: roleAssignments } = await supabase
          .from('role_assignments')
          .select('*')
          .eq('practice_id', userData.practice_id);

        if (!roleAssignments) return;

        // Create mock tasks based on roles
        const mockTasks: Task[] = [
          {
            id: '1',
            name: 'Weekly Staff Meeting Documentation',
            dueAt: '2:00 PM',
            status: 'green',
            progress: '2/3 complete',
            assigneeName: roleAssignments.find(r => r.role === 'practice_manager')?.assigned_name || 'Practice Manager',
            assigneeRole: 'Practice Manager',
            isCurrentUser: userData.role === 'practice_manager'
          },
          {
            id: '2',
            name: 'Patient Safety Round',
            dueAt: '11:00 AM',
            status: 'amber',
            progress: '1/4 complete',
            assigneeName: roleAssignments.find(r => r.role === 'nurse_lead')?.assigned_name || 'Nurse Lead',
            assigneeRole: 'Nurse Lead',
            isCurrentUser: userData.role === 'nurse_lead'
          },
          {
            id: '3',
            name: 'Equipment Maintenance Check',
            dueAt: '4:00 PM',
            status: 'red',
            progress: 'Overdue',
            assigneeName: roleAssignments.find(r => r.role === 'hca')?.assigned_name || 'Healthcare Assistant',
            assigneeRole: 'Healthcare Assistant',
            isCurrentUser: userData.role === 'hca'
          },
          {
            id: '4',
            name: 'Clinical Governance Review',
            dueAt: '9:00 AM',
            status: 'green',
            progress: 'Complete',
            assigneeName: roleAssignments.find(r => r.role === 'cd_lead_gp')?.assigned_name || 'CD Lead GP',
            assigneeRole: 'CD Lead GP',
            isCurrentUser: userData.role === 'cd_lead_gp'
          },
          {
            id: '5',
            name: 'Reception Audit',
            dueAt: '1:00 PM',
            status: 'amber',
            progress: '3/5 complete',
            assigneeName: roleAssignments.find(r => r.role === 'reception_lead')?.assigned_name || 'Reception Lead',
            assigneeRole: 'Reception Lead',
            isCurrentUser: userData.role === 'reception_lead'
          },
        ];

        // Split tasks based on current user
        const userTasksList = mockTasks.filter(task => task.isCurrentUser);
        const otherTasksList = mockTasks.filter(task => !task.isCurrentUser);

        setUserTasks(userTasksList);
        setOtherTasks(otherTasksList);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user]);

  return { userTasks, otherTasks, loading };
}