import { useState, useEffect } from 'react';
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
        const practiceId = (isMasterUser && selectedPracticeId) ? selectedPracticeId : user.practiceId;
        if (!practiceId) {
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/practices/${practiceId}/tasks`, {
          credentials: 'include',
        });

        if (!response.ok) {
          console.error('Failed to fetch tasks:', response.status);
          setUserTasks([]);
          setOtherTasks([]);
          setLoading(false);
          return;
        }

        const tasksData = await response.json();

        const tasks: Task[] = (tasksData || []).map((task: any) => {
          let status: 'green' | 'amber' | 'red' = 'green';
          let progress = 'Pending';

          if (task.status === 'complete' || task.status === 'closed' || task.status === 'submitted') {
            status = 'green';
            progress = 'Complete';
          } else if (task.status === 'in_progress') {
            status = 'amber';
            progress = 'In Progress';
          } else if (task.dueAt && new Date(task.dueAt) < new Date()) {
            status = 'red';
            progress = 'Overdue';
          } else if (task.due_at && new Date(task.due_at) < new Date()) {
            status = 'red';
            progress = 'Overdue';
          }

          const isCurrentUserTask = task.assigneeId === user.id || task.assignee_id === user.id;

          return {
            id: task.id,
            name: task.title || task.name || 'Unnamed Task',
            dueAt: task.dueAt || task.due_at ? new Date(task.dueAt || task.due_at).toLocaleDateString() : 'No due date',
            status,
            progress,
            assigneeName: task.assigneeName || task.assignee_name || 'Unassigned',
            assigneeRole: task.assigneeRole || task.assignee_role || task.module || 'General',
            isCurrentUser: isCurrentUserTask,
          };
        });

        const userTasksList = tasks.filter(task => task.isCurrentUser);
        const otherTasksList = tasks.filter(task => !task.isCurrentUser);

        setUserTasks(userTasksList);
        setOtherTasks(otherTasksList);
      } catch (error) {
        console.error('Error fetching tasks:', error);
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
