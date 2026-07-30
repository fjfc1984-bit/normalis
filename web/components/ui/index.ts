// web/components/ui/index.ts
// Barrel — importa desde aquí: import { KpiCard, Toast, useToast } from '@/components/ui'

export { KpiCard }         from './KpiCard';
export { StatusBadge }     from './StatusBadge';
export { Toast, useToast } from './Toast';
export type { ToastType }  from './Toast';
export { ConfirmModal }    from './ConfirmModal';
export { EmptyState }      from './EmptyState';
export { SectionHeader }   from './SectionHeader';
export { LoadingSpinner }  from './LoadingSpinner';
export { TabBar }          from './TabBar';
export type { TabItem }    from './TabBar';
// Button (existente, default export — importar directo: import Button from '@/components/ui/Button')
