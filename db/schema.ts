// Canonical StructLab D1 schema map. Runtime queries remain behind server/index.js.
// The executable SQL migration lives in drizzle/0001_structlab_core.sql.

export const structLabTables = {
  users: ['id', 'auth_subject', 'email', 'name', 'role', 'status', 'email_verified'],
  studentProfiles: ['user_id', 'headline', 'bio', 'location', 'skills_json', 'visibility'],
  companies: ['id', 'owner_user_id', 'name', 'slug', 'verification_status'],
  companyMembers: ['company_id', 'user_id', 'member_role'],
  courses: ['id', 'title', 'slug', 'category', 'level', 'status', 'created_by'],
  courseModules: ['id', 'course_id', 'title', 'position'],
  lessons: ['id', 'module_id', 'title', 'content_json', 'position'],
  enrollments: ['id', 'course_id', 'student_user_id', 'status', 'progress'],
  lessonProgress: ['lesson_id', 'student_user_id', 'completed'],
  jobs: ['id', 'company_id', 'title', 'status', 'created_by'],
  savedJobs: ['job_id', 'student_user_id'],
  applications: ['id', 'job_id', 'student_user_id', 'status'],
  companyTrainingAssignments: ['id', 'company_id', 'course_id', 'assignee_user_id', 'assignee_email', 'status', 'progress'],
  certificates: ['id', 'student_user_id', 'course_id', 'credential_code'],
  files: ['id', 'owner_user_id', 'company_id', 'kind', 'storage_key', 'status'],
  moderationCases: ['id', 'entity_type', 'entity_id', 'status'],
  auditLogs: ['id', 'actor_user_id', 'action', 'entity_type', 'entity_id'],
  platformSettings: ['key', 'value_json', 'updated_by'],
} as const;

export type StructLabRole = 'student' | 'company' | 'admin';
export type CompanyMemberRole = 'owner' | 'recruiter' | 'training_manager' | 'viewer';
