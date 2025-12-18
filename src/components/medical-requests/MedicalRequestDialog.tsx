import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  REQUEST_TYPES,
  medicalRequestFormSchema,
  type MedicalRequestFormValues,
  type MedicalRequest,
} from './types';

interface MedicalRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practiceId: string;
  request?: MedicalRequest | null;
  onSuccess: () => void;
}

export function MedicalRequestDialog({
  open,
  onOpenChange,
  practiceId,
  request,
  onSuccess,
}: MedicalRequestDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEditing = !!request;

  const form = useForm<MedicalRequestFormValues>({
    resolver: zodResolver(medicalRequestFormSchema),
    defaultValues: {
      request_type: (request?.request_type as any) || 'insurance',
      received_at: request?.received_at
        ? format(new Date(request.received_at), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd'),
      emis_hash: request?.emis_hash || '',
      notes: request?.notes || '',
    },
  });

  const onSubmit = async (data: MedicalRequestFormValues) => {
    setLoading(true);
    try {
      const payload = {
        practice_id: practiceId,
        request_type: data.request_type,
        received_at: data.received_at,
        emis_hash: data.emis_hash || null,
        notes: data.notes || null,
        status: 'received' as const,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('medical_requests')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', request.id);

        if (error) throw error;
        toast({ title: 'Request updated successfully' });
      } else {
        const { error } = await supabase
          .from('medical_requests')
          .insert(payload);

        if (error) throw error;
        toast({ title: 'Request logged successfully' });
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error saving request:', error);
      toast({
        title: 'Error saving request',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Medical Request' : 'Log New Request'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="request_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REQUEST_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="received_at"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date Received *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(new Date(field.value), 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) =>
                          field.onChange(date ? format(date, 'yyyy-MM-dd') : '')
                        }
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emis_hash"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient Reference (EMIS/NHS)</FormLabel>
                  <FormControl>
                    <Input placeholder="Patient identifier hash" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about the request (requester, organization, etc.)..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : isEditing ? 'Update' : 'Log Request'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
