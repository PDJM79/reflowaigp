import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { 
  Home, Calendar, ListTodo, FileText, FolderOpen, BarChart3,
  Pill, PoundSterling, Shield, Droplet, AlertTriangle, Flame,
  Users, MessageSquare, FileCheck, BookOpen, Thermometer, Mail,
  Settings, LogOut, Menu, X
} from 'lucide-react';

export function AppLayout() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Fetch user roles
    const fetchUserRole = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      
      if (data) setUserRole(data.role);
    };
    
    fetchUserRole();
  }, [user, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { icon: Home, label: t('nav.home'), path: '/dashboard', roles: 'all' },
    { icon: Calendar, label: t('nav.schedule'), path: '/schedule', roles: ['practice_manager', 'administrator'] },
    { icon: ListTodo, label: t('nav.tasks'), path: '/tasks', roles: 'all' },
    { icon: FileText, label: t('nav.taskTemplates'), path: '/task-templates', roles: ['practice_manager', 'administrator'] },
    { icon: Pill, label: t('nav.month_end'), path: '/month-end', roles: 'all' },
    { icon: PoundSterling, label: t('nav.claims'), path: '/claims', roles: ['practice_manager', 'administrator'] },
    { icon: Shield, label: t('nav.infection_control'), path: '/infection-control', roles: ['nurse_lead', 'practice_manager'] },
    { icon: Droplet, label: t('nav.cleaning'), path: '/cleaning', roles: ['estates_lead', 'practice_manager'] },
    { icon: AlertTriangle, label: t('nav.incidents'), path: '/incidents', roles: 'all' },
    { icon: Flame, label: t('nav.fire_safety'), path: '/fire-safety', roles: ['estates_lead', 'practice_manager'] },
    { icon: Users, label: t('nav.hr'), path: '/hr', roles: ['practice_manager', 'administrator'] },
    { icon: Users, label: 'My Information', path: '/staff-self-service', roles: 'all' },
    { icon: MessageSquare, label: t('nav.complaints'), path: '/complaints', roles: ['ig_lead', 'practice_manager', 'reception_lead'] },
    { icon: FileCheck, label: t('nav.medical_requests'), path: '/medical-requests', roles: ['administrator', 'practice_manager'] },
    { icon: BookOpen, label: t('nav.policies'), path: '/policies', roles: 'all' },
    { icon: Thermometer, label: t('nav.fridge_temps'), path: '/fridge-temps', roles: 'all' },
    { icon: Mail, label: t('nav.email_logs'), path: '/email-logs', roles: ['practice_manager', 'ig_lead'] },
    { icon: BarChart3, label: t('nav.reports'), path: '/reports', roles: ['practice_manager', 'group_manager'] },
  ];

  const visibleNavItems = navItems.filter(item => 
    item.roles === 'all' || 
    (Array.isArray(item.roles) && item.roles.includes(userRole))
  );

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 border-r bg-card`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            {sidebarOpen && (
              <h1 className="font-bold text-lg truncate">{t('app.title')}</h1>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 overflow-y-auto">
            <div className="space-y-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={active ? 'secondary' : 'ghost'}
                      className={`w-full justify-start ${!sidebarOpen && 'px-2'}`}
                    >
                      <Icon className={`h-5 w-5 ${sidebarOpen ? 'mr-2' : ''}`} />
                      {sidebarOpen && <span>{item.label}</span>}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-2 border-t space-y-1">
            <Link to="/settings">
              <Button
                variant={isActive('/settings') ? 'secondary' : 'ghost'}
                className={`w-full justify-start ${!sidebarOpen && 'px-2'}`}
              >
                <Settings className={`h-5 w-5 ${sidebarOpen ? 'mr-2' : ''}`} />
                {sidebarOpen && <span>{t('nav.settings')}</span>}
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className={`w-full justify-start ${!sidebarOpen && 'px-2'}`}
            >
              <LogOut className={`h-5 w-5 ${sidebarOpen ? 'mr-2' : ''}`} />
              {sidebarOpen && <span>{t('nav.logout')}</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
