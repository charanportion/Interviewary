import { randomUUID } from 'node:crypto';
import type {
  InterviewType,
  Seniority,
  Session,
} from '@interview-copilot/shared';

const sessions = new Map<string, Session>();

export function createSession(): Session {
  const session: Session = {
    id: randomUUID(),
    startedAt: new Date(),
    jd: '',
    resume: '',
    seniority: 'mid',
    interviewType: 'screening',
    transcript: [],
    suggestedQuestions: [],
    evaluations: [],
    askedQuestionIds: [],
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function deleteSession(id: string): void {
  sessions.delete(id);
}

export function applyInterviewSetup(
  session: Session,
  setup: {
    jd: string;
    resume: string;
    seniority: Seniority;
    interviewType: InterviewType;
  },
): void {
  session.jd = setup.jd;
  session.resume = setup.resume;
  session.seniority = setup.seniority;
  session.interviewType = setup.interviewType;
}
