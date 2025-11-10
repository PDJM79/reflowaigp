import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, FileText } from 'lucide-react';

interface PolicyUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PolicyUploadDialog({ isOpen, onClose, onSuccess }: PolicyUploadDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    version: '',
    owner_role: '',
    effective_from: '',
    review_due: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        toast.error('File size must be less than 10MB');
        return;
      }
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error('Only PDF and Word documents are allowed');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setLoading(true);

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) throw new Error('User not found');

      // Upload file to storage
      const filePath = `${userData.practice_id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('policy-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create policy document record
      const { error: insertError } = await supabase
        .from('policy_documents')
        .insert([{
          practice_id: userData.practice_id,
          title: formData.title,
          version: formData.version,
          owner_role: formData.owner_role || null as any,
          effective_from: formData.effective_from || null,
          review_due: formData.review_due || null,
          storage_path: filePath,
          file_size: file.size,
          file_mime_type: file.type,
          uploaded_by: userData.id,
          status: 'active',
          source: 'manual_upload',
        }]);

      if (insertError) throw insertError;

      toast.success('Policy uploaded successfully');
      onSuccess();
      onClose();
      setFile(null);
      setFormData({
        title: '',
        version: '',
        owner_role: '',
        effective_from: '',
        review_due: '',
      });
    } catch (error) {
      console.error('Error uploading policy:', error);
      toast.error('Failed to upload policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Policy Document</DialogTitle>
          <DialogDescription>
            Upload a policy document (PDF or Word, max 10MB)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Document File *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="cursor-pointer"
                required
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Policy Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Health and Safety Policy"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="e.g., v1.0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_role">Owner Role</Label>
              <Select
                value={formData.owner_role}
                onValueChange={(value) => setFormData({ ...formData, owner_role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="practice_manager">Practice Manager</SelectItem>
                  <SelectItem value="ig_lead">IG Lead</SelectItem>
                  <SelectItem value="nurse_lead">Nurse Lead</SelectItem>
                  <SelectItem value="cd_lead_gp">CD Lead GP</SelectItem>
                  <SelectItem value="estates_lead">Estates Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="effective_from">Effective From</Label>
              <Input
                id="effective_from"
                type="date"
                value={formData.effective_from}
                onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review_due">Review Due</Label>
              <Input
                id="review_due"
                type="date"
                value={formData.review_due}
                onChange={(e) => setFormData({ ...formData, review_due: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Upload className="h-4 w-4 mr-2" />
              {loading ? 'Uploading...' : 'Upload Policy'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
