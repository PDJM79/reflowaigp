import { Link, useLocation } from 'react-router-dom';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home } from 'lucide-react';

interface Crumb {
  label: string;
  to?: string; // omit for the current (leaf) page
}

const DASHBOARD_LABELS: Record<string, string> = {
  compliance: 'Compliance Overview',
  clinical: 'Clinical Governance',
  workforce: 'Workforce Management',
  environmental: 'Environmental Safety',
  'patient-experience': 'Patient Experience',
  governance: 'Governance Approvals',
};

/**
 * The breadcrumb trail (section → detail) for a nested route, or null for a
 * top-level page (which needs no trail). Explicit per detail-under-section route
 * so labels + parents are correct rather than guessed from path segments.
 */
function buildTrail(pathname: string): Crumb[] | null {
  const dash = pathname.match(/^\/dashboards\/([a-z-]+)$/);
  if (dash) return [{ label: 'Dashboards', to: '/dashboards' }, { label: DASHBOARD_LABELS[dash[1]] ?? dash[1] }];

  if (/^\/ipc\/audit\/[^/]+$/.test(pathname)) return [{ label: 'Infection Control', to: '/ipc' }, { label: 'Audit' }];
  if (pathname === '/cleaning/manage') return [{ label: 'Cleaning', to: '/cleaning' }, { label: 'Manage Zones & Tasks' }];
  if (pathname === '/policies/review-history') return [{ label: 'Policies', to: '/policies' }, { label: 'Review History' }];

  if (/^\/task\/[^/]+\/step\/[^/]+$/.test(pathname)) return [{ label: 'Tasks', to: '/tasks' }, { label: 'Task', to: pathname.replace(/\/step\/[^/]+$/, '') }, { label: 'Step' }];
  if (/^\/task\/[^/]+$/.test(pathname)) return [{ label: 'Tasks', to: '/tasks' }, { label: 'Task' }];

  return null;
}

export function RouteBreadcrumbs() {
  const { pathname } = useLocation();
  const trail = buildTrail(pathname);
  if (!trail) return null;

  return (
    <div className="px-3 sm:px-6 pt-3 sm:pt-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/" className="flex items-center gap-1"><Home className="h-3.5 w-3.5" /> Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {trail.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {crumb.to ? (
                  <BreadcrumbLink asChild><Link to={crumb.to}>{crumb.label}</Link></BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
