/** Comparação pura: a UI pode reutilizar esta regra no aviso de saída e no autosave futuro. */
export type EditableContent = { title: string; markdown: string }
export function hasUnsavedChanges(saved: EditableContent | null | undefined, draft: EditableContent): boolean {
  if (!saved) return false
  return saved.title !== draft.title || saved.markdown !== draft.markdown
}
