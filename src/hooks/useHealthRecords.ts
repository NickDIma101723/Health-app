import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface HealthRecord {
  id: string;
  user_id: string;
  date: string;
  weight?: number;
  height?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type HealthRecordInsert = Omit<HealthRecord, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type HealthRecordUpdate = Partial<Omit<HealthRecord, 'id'>>;

export function useHealthRecords() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      setRecords(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addRecord = async (record: HealthRecordInsert) => {
    try {
      const { data, error } = await supabase
        .from('health_records')
        .insert([record])
        .select()
        .single();

      if (error) throw error;

      setRecords(prev => [data, ...prev]);
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An error occurred';
      setError(error);
      return { data: null, error };
    }
  };

  const updateRecord = async (id: string, updates: HealthRecordUpdate) => {
    try {
      const { data, error } = await supabase
        .from('health_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setRecords(prev => prev.map(record => 
        record.id === id ? data : record
      ));
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An error occurred';
      setError(error);
      return { data: null, error };
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('health_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRecords(prev => prev.filter(record => record.id !== id));
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An error occurred';
      setError(error);
      return { error };
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return {
    records,
    loading,
    error,
    refetch: fetchRecords,
    addRecord,
    updateRecord,
    deleteRecord,
  };
}