import { supabase } from './supabase';
import type { EmailSubmission } from '@/types/supabase';

export async function fetchEmailSubmissions(page: number, pageSize: number) {
  const { data, error } = await supabase
    .from('email_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (error) throw error;
  return data;
}

export async function fetchEmailSubmission(id: string) {
  const { data, error } = await supabase
    .from('email_submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// Función para crear funciones RPC que manejen la eliminación
export async function deleteEmailSubmission(id: string) {
  // Utilizamos una función RPC que debe estar creada en Supabase
  const { data, error } = await supabase
    .rpc('delete_email_submission', { submission_id: id });
  
  if (error) throw error;
  return data;
}

// Función para actualizar usando RPC
export async function updateEmailSubmissionStatus(id: string, status: 'read' | 'unread') {
  // Utilizamos una función RPC que debe estar creada en Supabase
  const { data, error } = await supabase
    .rpc('update_email_submission_status', { 
      submission_id: id, 
      new_status: status 
    });
  
  if (error) throw error;
  return data;
}