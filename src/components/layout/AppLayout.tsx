import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';
import { usePracticeModules } from '@/hooks/usePracticeModules';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Home, Calendar, ListTodo, FileText, FolderOpen, BarChart3,
  Pill, PoundSterling, Shield, Droplet, AlertTriangle, Flame,
  Users, MessageSquare, FileCheck, BookOpen, Thermometer, Mail,
  Settings, LogOut, Menu, X, Building, ShieldAlert, ChevronDown, ChevronRight, ScrollText
} from 'lucide-react';
import { OfflineIndicator } from '@/components/ui/offline-indicator';
import type { Capability } from '@/types/roles';
import { AVAILABLE_ROLES } from '@/types/auth';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  capabilities?: Capability | Capability[] | 'all';
  module?: string;   // if set, item is hidden when this module is disabled
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

// Paths each restricted role may access. Roles not listed here see everything
// (capability filtering still applies on top of this).
const ROLE_ALLOWED_PATHS: Record<string, string[]> = {
  gp: ['/', '/tasks', '/schedule', '/policies', '/incidents', '/complaints', '/staff-self-service', '/processes'],
  nurse: ['/', '/tasks', '/schedule', '/fridge-temps', '/ipc', '/policies', '/staff-self-service'],
  hca: ['/', '/tasks', '/fridge-temps', '/staff-self-service'],
  reception: ['/', '/cleaning'],
  cleaner: ['/', '/cleaning'],
};

export function AppLayout() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { hasAnyCapability, loading: capabilitiesLoading } = useCapabilities();
  const { enabledSet: enabledModules } = usePracticeModules();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Overview', 'Tasks & Schedule']);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Block direct URL access to pages the user's role doesn't allow
  useEffect(() => {
    if (!user) return;
    const role = user.role ?? '';
    const allowedPaths = ROLE_ALLOWED_PATHS[role];
    if (!allowedPaths) return; // No restriction for this role
    // Check if current path starts with any allowed path
    const allowed = allowedPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
    if (!allowed) {
      const fallback = allowedPaths[0] ?? '/';
      navigate(fallback, { replace: true });
    }
  }, [user, location.pathname, navigate]);

  const handleLogout = async () => {
    await signOut();
  };

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupTitle) 
        ? prev.filter(g => g !== groupTitle)
        : [...prev, groupTitle]
    );
  };

  // Navigation groups with capability-based access control
  const navGroups: NavGroup[] = [
    {
      title: 'Overview',
      items: [
        { icon: Home, label: t('nav.home'), path: '/', capabilities: 'all' },
        { icon: BarChart3, label: 'Dashboards', path: '/dashboards', capabilities: 'view_dashboards' },
        { icon: FolderOpen, label: 'Processes', path: '/processes', capabilities: 'all' },
      ]
    },
    {
      title: 'Tasks & Schedule',
      items: [
        { icon: ListTodo, label: t('nav.tasks'), path: '/tasks', capabilities: 'all' },
        { icon: Calendar, label: t('nav.schedule'), path: '/schedule', capabilities: ['configure_practice', 'manage_users'] },
        { icon: FileText, label: t('nav.taskTemplates'), path: '/task-templates', capabilities: 'configure_practice' },
      ]
    },
    {
      title: 'Clinical',
      items: [
        { icon: Pill, label: t('nav.month_end'), path: '/month-end', capabilities: 'record_script' },
        { icon: PoundSterling, label: t('nav.claims'), path: '/claims', capabilities: 'manage_claims' },
        { icon: Thermometer, label: t('nav.fridge_temps'), path: '/fridge-temps', capabilities: ['record_fridge_temp', 'manage_fridges'], module: 'fridge_temps' },
        { icon: FileCheck, label: t('nav.medical_requests'), path: '/medical-requests', capabilities: 'manage_medical_requests' },
      ]
    },
    {
      title: 'Compliance',
      items: [
        { icon: Shield, label: 'IPC Audits', path: '/ipc', capabilities: ['manage_ipc', 'run_ipc_audit'], module: 'ipc' },
        { icon: BookOpen, label: t('nav.policies'), path: '/policies', capabilities: 'view_policies', module: 'policies' },
        { icon: ShieldAlert, label: 'Risk Register', path: '/risk-register', capabilities: ['manage_hs', 'run_risk_assessment'], module: 'compliance' },
      ]
    },
    {
      title: 'Facilities',
      items: [
        { icon: Droplet, label: t('nav.cleaning'), path: '/cleaning', capabilities: ['manage_cleaning', 'complete_cleaning'], module: 'cleaning' },
        { icon: Building, label: 'Room Assessments', path: '/room-assessments', capabilities: ['manage_rooms', 'run_room_assessment'] },
        { icon: Flame, label: t('nav.fire_safety'), path: '/fire-safety', capabilities: ['manage_fire', 'run_fire_checks'], module: 'fire_safety' },
      ]
    },
    {
      title: 'People',
      items: [
        { icon: Users, label: 'User Management', path: '/user-management', capabilities: 'manage_users' },
        { icon: Shield, label: 'Role Management', path: '/role-management', capabilities: 'assign_roles' },
        { icon: Users, label: t('nav.hr'), path: '/hr', capabilities: ['manage_training', 'manage_appraisals'], module: 'hr' },
        { icon: Users, label: 'Team', path: '/team', capabilities: ['manage_users', 'assign_roles'] },
        { icon: Users, label: 'My Information', path: '/staff-self-service', capabilities: 'all' },
        { icon: AlertTriangle, label: t('nav.incidents'), path: '/incidents', capabilities: ['report_incident', 'manage_incident'] },
        { icon: MessageSquare, label: t('nav.complaints'), path: '/complaints', capabilities: ['log_complaint', 'manage_complaint'], module: 'complaints' },
      ]
    },
    {
      title: 'Reports & Admin',
      items: [
        { icon: BarChart3, label: 'Reports', path: '/reports', capabilities: 'run_reports' },
        { icon: Mail, label: t('nav.email_logs'), path: '/email-logs', capabilities: 'configure_notifications' },
        { icon: ScrollText, label: 'Audit Logs', path: '/audit-logs', capabilities: 'manage_users' },
      ]
    }
  ];

  // Check if user has access to a nav item based on role + capabilities + modules
  const hasNavAccess = (item: NavItem): boolean => {
    const role = user?.role ?? '';
    const allowedPaths = ROLE_ALLOWED_PATHS[role];
    // For roles with a strict path allowlist, path presence is the only gate.
    if (allowedPaths) return allowedPaths.includes(item.path);

    // Module gate: if a module is assigned and the set has been loaded, hide disabled modules.
    // While loading (enabledModules.size === 0), show all items to avoid flicker.
    if (item.module && enabledModules.size > 0 && !enabledModules.has(item.module)) return false;

    // Capability gate for unrestricted roles
    if (item.capabilities === 'all') return true;
    if (!item.capabilities) return true;
    const caps = Array.isArray(item.capabilities) ? item.capabilities : [item.capabilities];
    return hasAnyCapability(...caps);
  };

  // Filter groups based on user capabilities
  const visibleNavGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(hasNavAccess)
  })).filter(group => group.items.length > 0);

  const isActive = (path: string) => location.pathname === path;

  // Don't render layout if auth is loading or user is not authenticated
  if (authLoading || !user) {
    return null;
  }

  const roleLabel = AVAILABLE_ROLES.find(r => r.value === user.role)?.label ?? user.role;

  const renderSidebarHeader = (open: boolean) => (
    <div className="p-4 border-b">
      <div className="flex items-center justify-between gap-2">
        {open && (
          <span className="font-bold text-base leading-tight tracking-tight">
            FitForAudit GP
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 ml-auto"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-sm font-medium leading-tight truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{roleLabel}</p>
        </div>
      )}
    </div>
  );
  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    return (
      <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
        <Button
          variant={active ? 'secondary' : 'ghost'}
          className={`w-full justify-start ${!sidebarOpen && !isMobile ? 'px-2' : ''}`}
        >
          <Icon className={`h-4 w-4 ${(sidebarOpen || isMobile) ? 'mr-2' : ''}`} />
          {(sidebarOpen || isMobile) && <span className="text-sm">{item.label}</span>}
        </Button>
      </Link>
    );
  };

  const renderNavItems = () => {
    const isCleanerRole = user?.role === 'reception' || user?.role === 'cleaner';

    // Cleaner/reception: flat list, no collapsible groups — only 2 items and
    // they span different groups so the grouped view is confusing.
    if (isCleanerRole) {
      const flatItems = visibleNavGroups.flatMap(g => g.items);
      return (
        <div className="space-y-1">
          {flatItems.map(item => renderNavItem(item))}
        </div>
      );
    }

    // All other roles: collapsible groups
    return (
      <div className="space-y-2">
        {visibleNavGroups.map((group) => {
          const isExpanded = expandedGroups.includes(group.title);
          return (
            <Collapsible
              key={group.title}
              open={isExpanded}
              onOpenChange={() => toggleGroup(group.title)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between font-semibold text-muted-foreground hover:text-foreground"
                >
                  <span className="text-xs uppercase tracking-wider">{group.title}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pl-2">
                {group.items.map(item => renderNavItem(item))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    );
  };

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
      {(sidebarOpen || isMobile) && user?.isPracticeManager && (
        <Link to="/settings/modules" onClick={() => setMobileMenuOpen(false)}>
          <Button
            variant={isActive('/settings/modules') ? 'secondary' : 'ghost'}
            className="w-full justify-start text-xs text-muted-foreground"
            size="sm"
          >
            <Settings className="h-3.5 w-3.5 mr-2" />Modules
          </Button>
        </Link>
      )}
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
            {renderSidebarHeader(sidebarOpen)}
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
                <span className="font-bold text-base leading-tight tracking-tight block">
                  FitForAudit GP
                </span>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-sm font-medium leading-tight truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{roleLabel}</p>
                </div>
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
      <main className={`flex-1 overflow-auto ${isMobile ? 'pb-20' : ''}`}>
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-inset-bottom">
          <div className="flex justify-around items-center h-16 px-2">
            <Link to="/">
              <Button variant={isActive('/') ? 'secondary' : 'ghost'} size="icon" className="flex flex-col h-14 w-14 gap-1">
                <Home className="h-5 w-5" />
                <span className="text-xs">Home</span>
              </Button>
            </Link>
            {(user?.role === 'reception' || user?.role === 'cleaner') ? (
              <Link to="/cleaning">
                <Button variant={isActive('/cleaning') ? 'secondary' : 'ghost'} size="icon" className="flex flex-col h-14 w-14 gap-1">
                  <Droplet className="h-5 w-5" />
                  <span className="text-xs">Cleaning</span>
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/tasks">
                  <Button variant={isActive('/tasks') ? 'secondary' : 'ghost'} size="icon" className="flex flex-col h-14 w-14 gap-1">
                    <ListTodo className="h-5 w-5" />
                    <span className="text-xs">Tasks</span>
                  </Button>
                </Link>
                <Link to="/incidents">
                  <Button variant={isActive('/incidents') ? 'secondary' : 'ghost'} size="icon" className="flex flex-col h-14 w-14 gap-1">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="text-xs">Incidents</span>
                  </Button>
                </Link>
                <Link to="/staff-self-service">
                  <Button variant={isActive('/staff-self-service') ? 'secondary' : 'ghost'} size="icon" className="flex flex-col h-14 w-14 gap-1">
                    <Users className="h-5 w-5" />
                    <span className="text-xs">Profile</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      )}

      {/* Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
}