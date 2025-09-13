
import { supabase } from './supabaseClient';
import { Canvas } from '../types';

export async function fetchCanvases(): Promise<Canvas[]> {
  const { data, error } = await supabase
    .from('canvases')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching canvases:', error.message);
    return [];
  }

  // FIX: Perform in-flight data migration for canvases with an outdated schema.
  // This handles cases where 'content' might be a raw string from a previous
  // version or null, ensuring it's always an array as the components expect.
  const migratedData = (data || []).map(canvas => {
    if (!Array.isArray(canvas.content)) {
      // If content is a string (from old schema), use it. Otherwise, default to empty.
      const contentValue = typeof canvas.content === 'string' ? canvas.content : '';
      return {
        ...canvas,
        content: [{ type: 'text', content: contentValue }],
      };
    }
    return canvas;
  });

  return migratedData as Canvas[];
}

export async function createCanvas(name: string): Promise<Canvas | null> {
  const initialContent = [{ type: 'text', content: '' }];
  const { data, error } = await supabase
    .from('canvases')
    .insert([{ name, content: initialContent, output: '', chat_history: [], output_sources: [] }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating canvas:', error.message);
    return null;
  }
  return data as Canvas;
}

export async function updateCanvas(id: string, updates: Partial<Omit<Canvas, 'id'>>): Promise<Canvas | null> {
  const { data, error } = await supabase
    .from('canvases')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating canvas:', error.message);
    return null;
  }
  return data as Canvas;
}

export async function deleteCanvas(id: string): Promise<void> {
  const { error } = await supabase
    .from('canvases')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting canvas:', error.message);
  }
}
