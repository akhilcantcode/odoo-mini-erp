'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../services/api';
import { Loader2, Plus, Circle, Clock, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';

export default function TasksPage() {
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({ queryKey: ['tasks'], queryFn: () => fetchApi('/tasks') });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetchApi(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const move = (id: string, current: string) => {
    const next = current === 'todo' ? 'in_progress' : current === 'in_progress' ? 'done' : null;
    if (next) moveMutation.mutate({ id, status: next });
  };

  const columns = [
    { id: 'todo', title: 'To Do', icon: Circle, color: 'text-slate-400' },
    { id: 'in_progress', title: 'In Progress', icon: Clock, color: 'text-blue-500' },
    { id: 'done', title: 'Completed', icon: CheckCircle2, color: 'text-emerald-500' },
  ];

  const total = tasks?.length || 1;
  const done = tasks?.filter((t: any) => t.status === 'done').length || 0;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>Tasks Tracker</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Organize and monitor sprint manufacturing workflows</p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold text-white rounded-xl transition-all shadow-md cursor-pointer"
          style={{ background: 'var(--primary)', boxShadow: '0 4px 14px rgba(0, 111, 238, 0.2)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Global Progression Slider */}
      <div className="mb-6 shrink-0 p-4 rounded-xl border" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-bold" style={{ color: 'var(--text-muted)' }}>Sprint Completion Rate</span>
          <span className="text-[12px] font-extrabold" style={{ color: 'var(--text-main)' }}>{Math.round((done / total) * 100)}% ({done}/{total})</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700" 
            style={{ width: `${(done / total) * 100}%` }} 
          />
        </div>
      </div>

      {/* Board Columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-5 overflow-hidden">
        {columns.map((col) => {
          const colTasks = tasks?.filter((t: any) => t.status === col.id) || [];
          const Icon = col.icon;

          return (
            <div key={col.id} className="flex flex-col min-h-0 rounded-2xl border" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
              {/* Column Title */}
              <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${col.color}`} />
                  <span className="text-[14px] font-bold" style={{ color: 'var(--text-main)' }}>{col.title}</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800" style={{ color: 'var(--text-muted)' }}>
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[calc(100vh-360px)]">
                {colTasks.map((task: any) => (
                  <div 
                    key={task.id} 
                    className="rounded-xl p-4 transition-all border group hover:-translate-y-0.5"
                    style={{ background: 'var(--bg-app)', borderColor: 'var(--border-color)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-color-hover)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span 
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                        style={{ 
                          background: task.priority === 'high' ? 'var(--bg-badge-danger)' : task.priority === 'medium' ? 'var(--bg-badge-warning)' : 'var(--bg-panel)',
                          color: task.priority === 'high' ? 'var(--danger)' : task.priority === 'medium' ? 'var(--warning)' : 'var(--text-muted)'
                        }}
                      >
                        {task.priority === 'high' && <AlertTriangle className="w-3 h-3 inline mr-1 -mt-0.5" />}
                        {task.priority} Priority
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 font-mono">{task.id}</span>
                    </div>

                    <h4 className="text-[14px] font-bold tracking-tight mb-4" style={{ color: 'var(--text-main)' }}>{task.title}</h4>

                    <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0">
                          {task.assignee.charAt(0)}
                        </div>
                        <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-muted)' }}>{task.assignee.split(' ')[0]}</span>
                      </div>

                      {col.id !== 'done' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); move(task.id, task.status); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all cursor-pointer"
                          title="Advance Task"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div className="py-10 text-center rounded-xl border-2 border-dashed flex flex-col items-center justify-center" style={{ borderColor: 'var(--border-color)' }}>
                    <p className="text-[12px] font-semibold" style={{ color: 'var(--text-light)' }}>No tasks assigned</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
