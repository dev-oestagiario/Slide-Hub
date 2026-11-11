export type Profile = { id: string; full_name: string; role: 'student' | 'teacher' | 'admin' }
export type Discipline = { id: string; owner_id: string; title: string; description: string; is_public: boolean }
export type CourseModule = { id: string; discipline_id: string; title: string; description: string; position: number }
export type Lesson = {
  id: string
  module_id: string
  title: string
  markdown: string
  status: 'draft' | 'published'
  position: number
  template_id: string | null
  theme_config?: unknown
  presentation_template_id?: string | null
  presentation_template_snapshot?: unknown
  editor_layout?: unknown
  editor_revision?: number
  updated_at?: string
}
export type SlideTemplate = { id: string; owner_id: string; name: string; config: unknown }
export type SpeakerNote = { id?: string; lesson_id: string; slide_index: number; slide_key?: string | null; notes: string }
