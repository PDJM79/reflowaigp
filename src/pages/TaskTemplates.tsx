import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Copy, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { TaskTemplateDialog } from '@/components/tasks/TaskTemplateDialog';

interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  module: string;
  default_assignee_role: string;
  requires_photo: boolean;
  sla_type: string;
  due_rule: string;
  allowed_roles: string[];
  evidence_tags: string[];
  created_at: string;
}

export default function TaskTemplates() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const modules = [
    'month_end',
    'claims',
    'infection_control',
    'cleaning',
    'incidents',
    'fire_safety',
    'hr',
    'complaints',
    'medical_requests',
    'policies',
    'fridge_temps',
  ];

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchTemplates();
  }, [user, navigate]);

  const fetchTemplates = async () => {
    try {
      if (!user?.practiceId) return;

      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('practice_id', user.practiceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicate = async (template: TaskTemplate) => {
    try {
      if (!user?.practiceId) return;

      const { id, created_at, ...templateData } = template;

      const { error } = await supabase
        .from('task_templates')
        .insert([{
          title: `${template.title} (Copy)`,
          description: templateData.description,
          module: templateData.module,
          default_assignee_role: templateData.default_assignee_role as any,
          requires_photo: templateData.requires_photo,
          sla_type: templateData.sla_type,
          due_rule: templateData.due_rule,
          evidence_tags: templateData.evidence_tags as any,
          allowed_roles: templateData.allowed_roles as any,
          practice_id: user!.practiceId,
        }]);

      if (error) throw error;

      toast.success('Template duplicated successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModule = selectedModule === 'all' || template.module === selectedModule;
    return matchesSearch && matchesModule;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('taskTemplates.title')}</h1>
          <p className="text-muted-foreground">{t('taskTemplates.description')}</p>
        </div>
        <Button onClick={() => {
          setEditingTemplate(null);
          setShowDialog(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          {t('taskTemplates.create')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('taskTemplates.filters')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('taskTemplates.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">{t('taskTemplates.allModules')}</option>
              {modules.map((module) => (
                <option key={module} value={module}>
                  {t(`modules.${module}`)}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8">Loading templates...</div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery || selectedModule !== 'all'
                ? t('taskTemplates.noResults')
                : t('taskTemplates.noTemplates')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {template.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{t(`modules.${template.module}`)}</Badge>
                  {template.requires_photo && (
                    <Badge variant="secondary">Photo Required</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Default Assignee:</span>
                    <span className="font-medium">{template.default_assignee_role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SLA Type:</span>
                    <span className="font-medium">{template.sla_type || 'None'}</span>
                  </div>
                  {template.evidence_tags && template.evidence_tags.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Evidence Tags:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.evidence_tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingTemplate(template);
                      setShowDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TaskTemplateDialog
        isOpen={showDialog}
        onClose={() => {
          setShowDialog(false);
          setEditingTemplate(null);
        }}
        onSuccess={() => {
          setShowDialog(false);
          setEditingTemplate(null);
          fetchTemplates();
        }}
        template={editingTemplate}
      />
    </div>
  );
}
