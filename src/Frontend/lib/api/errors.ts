import axios from 'axios';
import type { ProblemDetails } from '@/types/api';

export function getApiError(error: unknown, fallback = 'Không thể thực hiện yêu cầu. Vui lòng thử lại.') {
  if (axios.isCancel(error)) return { message: '', cancelled: true, status: undefined, fields: {} };
  if (axios.isAxiosError<ProblemDetails & { message?: string }>(error)) {
    const problem = error.response?.data;
    const status = error.response?.status;
    const message = status && status >= 500 ? fallback
      : problem?.detail || problem?.message || problem?.title
      || (error.code === 'ECONNABORTED' ? 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.' : fallback);
    return { message, status, cancelled: false, fields: problem?.errors ?? {} };
  }
  return { message: fallback, status: undefined, cancelled: false, fields: {} };
}
