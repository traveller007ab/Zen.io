
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
  return data as Canvas[];
}

export async function createCanvas(name: string): Promise<Canvas | null> {
  const { data, error } = await supabase
    .from('canvases')
    .insert([{ name, content: '', output: '', chat_history: [] }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating canvas:', error.message);
    return null;
  }
  return data as Canvas;
}

export async function updateCanvas(id: string, updates: Partial<Canvas>): Promise<void> {
  const { error } = await supabase
    .from('canvases')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating canvas:', error.message);
  }
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