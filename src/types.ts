export interface Student {
  studentId: string;
  name: string;
  email: string;
  subjectId?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  section: string;
  studentCount: number;
}
