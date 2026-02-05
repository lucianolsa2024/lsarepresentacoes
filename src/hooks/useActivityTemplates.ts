import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ActivityTemplate, ActivityType, ActivityPriority } from '@/types/activity';

interface CreateTemplateInput {
  name: string;
  type: ActivityType;
  title_template: string;
  description_template?: string;
  default_priority?: ActivityPriority;
  default_time?: string;
  days_offset?: number;
}

interface DbTemplate {
  id: string;
  name: string;
  type: string;
  title_template: string;
  description_template: string | null;
  default_priority: string;
  default_time: string | null;
  days_offset: number;
  is_active: boolean;
  created_at: string;
}

const dbToTemplate = (row: DbTemplate): ActivityTemplate => ({
  id: row.id,
  name: row.name,
  type: row.type as ActivityType,
  title_template: row.title_template,
  description_template: row.description_template || undefined,
  default_priority: row.default_priority as ActivityPriority,
  default_time: row.default_time || undefined,
  days_offset: row.days_offset,
  is_active: row.is_active,
  created_at: row.created_at,
});

export function useActivityTemplates() {
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('activity_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setTemplates((data || []).map(row => dbToTemplate(row as DbTemplate)));
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const addTemplate = async (input: CreateTemplateInput): Promise<ActivityTemplate | null> => {
    try {
      const { data, error } = await supabase
        .from('activity_templates')
        .insert({
          name: input.name,
          type: input.type,
          title_template: input.title_template,
          description_template: input.description_template || null,
          default_priority: input.default_priority || 'media',
          default_time: input.default_time || null,
          days_offset: input.days_offset || 0,
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchTemplates();
      toast.success('Template criado com sucesso!');
      return dbToTemplate(data as DbTemplate);
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Erro ao criar template');
      return null;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<CreateTemplateInput>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('activity_templates')
        .update({
          ...updates,
          description_template: updates.description_template !== undefined ? updates.description_template || null : undefined,
          default_time: updates.default_time !== undefined ? updates.default_time || null : undefined,
        })
        .eq('id', id);

      if (error) throw error;
      
      await fetchTemplates();
      toast.success('Template atualizado!');
      return true;
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Erro ao atualizar template');
      return false;
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      // Soft delete - just deactivate
      const { error } = await supabase
        .from('activity_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      
      await fetchTemplates();
      toast.success('Template removido!');
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Erro ao remover template');
      return false;
    }
  };

  // Apply template to create activity data
  const applyTemplate = (
    template: ActivityTemplate, 
    clientName?: string
  ): { title: string; description?: string; due_date: string; due_time?: string; priority: ActivityPriority; type: ActivityType; template_id: string } => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + template.days_offset);
    
    return {
      title: template.title_template.replace('{cliente}', clientName || 'Cliente'),
      description: template.description_template?.replace('{cliente}', clientName || 'Cliente'),
      due_date: dueDate.toISOString().split('T')[0],
      due_time: template.default_time,
      priority: template.default_priority,
      type: template.type,
      template_id: template.id,
    };
  };

  return {
    templates,
    loading,
    refetch: fetchTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
  };
}
