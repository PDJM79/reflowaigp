import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    { icon: BarChart3, label: 'Dashboards', path: '/dashboards', roles: ['practice_manager', 'group_manager'] },
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
  ];

  const visibleNavItems = navItems.filter(item => 
    item.roles === 'all' || 
    (Array.isArray(item.roles) && item.roles.includes(userRole))
  );

  const isActive = (path: string) => location.pathname === path;

  const renderNavItems = () => (
    <div className="space-y-1">
      {visibleNavItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        
        return (
          <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
            <Button
              variant={active ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${!sidebarOpen && !isMobile && 'px-2'}`}
            >
              <Icon className={`h-5 w-5 ${(sidebarOpen || isMobile) ? 'mr-2' : ''}`} />
              {(sidebarOpen || isMobile) && <span>{item.label}</span>}
            </Button>
          </Link>
        );
      })}
    </div>
  );

  const renderFooterButtons = () => (
    <div className="space-y-1">
      <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
        <Button
          variant={isActive('/settings') ? 'secondary' : 'ghost'}
          className={`w-full justify-start ${!sidebarOpen && !isMobile && 'px-2'}`}
        >
          <Settings className={`h-5 w-5 ${(sidebarOpen || isMobile) ? 'mr-2' : ''}`} />
          {(sidebarOpen || isMobile) && <span>{t('nav.settings')}</span>}
        </Button>
      </Link>
      <Button
        variant="ghost"
        onClick={handleLogout}
        className={`w-full justify-start ${!sidebarOpen && !isMobile && 'px-2'}`}
      >
        <LogOut className={`h-5 w-5 ${(sidebarOpen || isMobile) ? 'mr-2' : ''}`} />
        {(sidebarOpen || isMobile) && <span>{t('nav.logout')}</span>}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 border-r bg-card`}>
          <div className="flex flex-col h-full">
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
            <nav className="flex-1 p-2 overflow-y-auto">
              {renderNavItems()}
            </nav>
            <div className="p-2 border-t">
              {renderFooterButtons()}
            </div>
          </div>
        </aside>
      )}

      {/* Mobile Sheet Menu */}
      {isMobile && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-16 left-2 z-40 md:hidden"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b">
                <h1 className="font-bold text-lg">{t('app.title')}</h1>
              </div>
              <nav className="flex-1 p-2 overflow-y-auto">
                {renderNavItems()}
              </nav>
              <div className="p-2 border-t">
                {renderFooterButtons()}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isMobile ? 'pb-16' : ''}`}>
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-inset-bottom">
          <div className="flex justify-around items-center h-16 px-2">
            <Link to="/dashboard">
              <Button
                variant={isActive('/dashboard') ? 'secondary' : 'ghost'}
                size="icon"
                className="flex flex-col h-14 w-14 gap-1"
              >
                <Home className="h-5 w-5" />
                <span className="text-xs">Home</span>
              </Button>
            </Link>
            <Link to="/tasks">
              <Button
                variant={isActive('/tasks') ? 'secondary' : 'ghost'}
                size="icon"
                className="flex flex-col h-14 w-14 gap-1"
              >
                <ListTodo className="h-5 w-5" />
                <span className="text-xs">Tasks</span>
              </Button>
            </Link>
            <Link to="/incidents">
              <Button
                variant={isActive('/incidents') ? 'secondary' : 'ghost'}
                size="icon"
                className="flex flex-col h-14 w-14 gap-1"
              >
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs">Incidents</span>
              </Button>
            </Link>
            <Link to="/staff-self-service">
              <Button
                variant={isActive('/staff-self-service') ? 'secondary' : 'ghost'}
                size="icon"
                className="flex flex-col h-14 w-14 gap-1"
              >
                <Users className="h-5 w-5" />
                <span className="text-xs">Profile</span>
              </Button>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
