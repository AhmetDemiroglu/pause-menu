import { axiosInstance } from './client';

export type FeedbackCategory = 'child_safety' | 'harassment' | 'spam' | 'bug' | 'other';

export interface FeedbackForCreation {
  category: FeedbackCategory;
  message: string;
  contactEmail?: string;
}

/** Uygulama ici geri bildirim / guvenlik bildirimi. Misafir de gonderebilir. */
export const sendFeedback = (data: FeedbackForCreation) => {
  return axiosInstance.post('/feedback', data);
};
