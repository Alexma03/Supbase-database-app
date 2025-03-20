export interface EmailSubmission {
  id: string;
  email: string;
  name: string;
  phone?: string;
  company?: string;
  created_at: string;
  status: 'read' | 'unread';
  subject: string;
  message: string;
}

export type Database = {
  public: {
    Tables: {
      email_submissions: {
        Row: EmailSubmission;
        Insert: Omit<EmailSubmission, 'id' | 'created_at'>;
        Update: Partial<Omit<EmailSubmission, 'id'>>;
      };
    };
  };
};