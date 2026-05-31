import { cn } from '../lib/utils.ts';

export const editorGrid = 'grid grid-cols-2 gap-1.5';
export const editorField = 'grid gap-0.5';
export const editorFieldWide = 'col-span-2';
export const editorFieldCheckbox = 'flex items-center gap-2 content-center';
export const editorFieldLabel = 'text-[0.68rem] uppercase tracking-wide text-muted-foreground';
export const numericTriplet = 'grid grid-cols-3 gap-1';
export const editorDivider = 'col-span-2 h-px bg-border my-0.5';
export const visualCard = 'rounded-sm bg-muted/30 p-1.5';
export const visualCardList = 'grid gap-2';
export const editorPanelHeader =
  'mb-2 flex flex-nowrap items-start gap-1.5 border-b border-border pb-1.5 min-w-0';
export const editorPanelHeaderLabel =
  'shrink-0 self-start pt-0.5 text-[0.68rem] uppercase tracking-wide text-muted-foreground whitespace-nowrap';
export const inlineTags = 'flex min-w-0 flex-1 flex-wrap gap-1';
export const tagButton =
  'max-w-full truncate rounded-sm border border-border bg-muted/40 px-1.5 py-0.5 text-[0.72rem] hover:bg-accent';
export const tagButtonActive = 'border-primary/40 bg-primary text-primary-foreground';
export const tagInput =
  'max-w-[8rem] rounded-sm border border-input bg-background px-1.5 py-0.5 text-[0.72rem]';
export const geometryControlRow = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5';
export const typeSpecificGrid = 'col-span-2 grid grid-cols-2 gap-1.5';
export const textInputWithModeToggle = 'grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 items-center';
export const segmentedToggle = 'inline-flex rounded-sm border border-border overflow-hidden';
export const segmentedToggleButton =
  'px-2 py-0.5 text-[0.68rem] bg-muted/40 hover:bg-accent border-r border-border last:border-r-0';
export const segmentedToggleButtonActive = 'bg-primary text-primary-foreground';
export const emptyState = 'text-xs text-muted-foreground py-2';
export const sectionLabelWithActions = 'flex items-center gap-2';

export function fieldClass(...extra: string[]) {
  return cn(editorField, ...extra);
}

export function fieldWideClass(...extra: string[]) {
  return cn(editorField, editorFieldWide, ...extra);
}
