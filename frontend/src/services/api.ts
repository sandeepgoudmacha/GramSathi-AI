import axios from 'axios'
import toast from 'react-hot-toast'

const _apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined
const API_BASE = _apiBase != null && _apiBase !== ''
  ? `${_apiBase}/api/v1`
  : '/api/v1'

export const api = axios.create({ baseURL: API_BASE, timeout: 30000 })

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('access_token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

api.interceptors.response.use(r => r, async err => {
  if (err.response?.status === 401) {
    localStorage.clear()
    window.location.href = '/login'
    return Promise.reject(err)
  }
  if (err.response?.status === 403) toast.error('Access denied.')
  if (err.response?.status === 429) toast.error('Too many requests. Please slow down.')
  if (err.response?.status >= 500) toast.error('Server error. Please try again.')
  return Promise.reject(err)
})

export const authApi = {
  register: (d: any) => api.post('/auth/register', d),
  login:    (d: any) => api.post('/auth/login', d),
  refresh:  (t: string) => api.post('/auth/refresh', { refresh_token: t }),
  me:       () => api.get('/auth/me'),
}
export const dashboardApi = {
  member:      () => api.get('/dashboard/member'),
  coordinator: () => api.get('/dashboard/coordinator'),
  bank:        () => api.get('/dashboard/bank'),
  admin:       () => api.get('/dashboard/admin'),
}
export const loansApi = {
  apply:    (d: any)           => api.post('/loans/apply', d),
  my:       ()                 => api.get('/loans/my'),
  all:      (status?: string)  => api.get('/loans', { params: status ? { status } : {} }),
  get:      (id: number)       => api.get(`/loans/${id}`),
  review:   (id: number, d: any) => api.post(`/loans/${id}/review`, d),
  payEmi:   (id: number, month: number) => api.post(`/loans/${id}/pay-emi`, { month_number: month }),
  documents: (id: number) => api.get(`/loans/${id}/documents`),
}
export const savingsApi = {
  get:    (memberId?: number) => api.get('/savings', { params: memberId ? { member_id: memberId } : {} }),
  record: (d: any)            => api.post('/savings', d),
  recordSelf: (d: any)        => api.post('/savings/self', d),
}
export const creditApi = {
  score: (userId?: number) => api.get('/credit-score', { params: userId ? { user_id: userId } : {} }),
}
export const skillsApi = {
  all:    ()                   => api.get('/skills'),
  my:     (uid?: number)       => api.get('/skills/my', { params: uid ? { user_id: uid } : {} }),
  add:    (d: any)             => api.post('/skills/my', d),
  update: (id: number, d: any) => api.put(`/skills/my/${id}`, d),
  remove: (id: number)         => api.delete(`/skills/my/${id}`),
}
export const trainingApi = {
  list:   () => api.get('/training'),
  enroll: (id: number) => api.post(`/training/${id}/enroll`),
  myEnrollments: () => api.get('/training/my-enrollments'),
  create: (d: any) => api.post('/training', d),
  // Coordinator endpoints
  allPrograms: () => api.get('/coordinator/training-programs'),
  programEnrollments: (id: number) => api.get(`/coordinator/training-programs/${id}/enrollments`),
}
export const schemesApi = {
  list:           (p?: any) => api.get('/schemes', { params: p }),
  eligible:       ()        => api.get('/schemes/eligible'),
  apply:          (d: any)  => api.post('/schemes/apply', d),
  myApplications: ()        => api.get('/schemes/my-applications'),
  review:         (id: number, d: any) => api.put(`/schemes/applications/${id}/review`, d),
  create:         (d: any)  => api.post('/schemes', d),
  delete:         (id: number) => api.delete(`/schemes/${id}`),
  autoFetch:      ()        => api.post('/schemes/auto-fetch'),
}
export const marketplaceApi = {
  products:      (p?: any)           => api.get('/marketplace/products', { params: p }),
  getProduct:    (id: number)        => api.get(`/marketplace/products/${id}`),
  createProduct: (d: any)            => api.post('/marketplace/products', d),
  updateProduct: (id: number, d: any)=> api.put(`/marketplace/products/${id}`, d),
  deleteProduct: (id: number)        => api.delete(`/marketplace/products/${id}`),
  recommendations:(p?: any)          => api.get('/marketplace/recommendations', { params: p }),
  predict:       (d?: any)           => api.post('/marketplace/predict', d),
  placeOrder:    (d: any)            => api.post('/marketplace/orders', d),
  orders:        (myPurchases?: boolean) => api.get('/marketplace/orders', { params: myPurchases ? { my_purchases: 1 } : {} }),
  updateStatus:  (id: number, status: string) => api.put(`/marketplace/orders/${id}/status`, { status }),
}
export const aiApi = {
  chat:         (d: any, lang?: string) => api.post('/ai/chat', { ...d, lang }),
  chatHistory:  ()       => api.get('/ai/chat/history'),
  health:       (d: any) => api.post('/ai/health', d),
  healthHistory:()       => api.get('/ai/health/history'),
  livelihoods:  ()       => api.get('/ai/livelihoods'),
  tts:          (d: any) => api.post('/ai/tts', d, { responseType: 'arraybuffer', timeout: 120000 }),
  schemeCheck:  (d: any) => api.post('/ai/scheme-check', d),
}
export const notificationsApi = {
  list:       () => api.get('/notifications'),
  markRead:   (id: number) => api.put(`/notifications/${id}/read`),
  markAllRead:() => api.put('/notifications/mark-all-read'),
}
export const usersApi = {
  me:         () => api.get('/auth/me'),
  update:     (d: any) => api.put('/profile', d),
  all:        (p?: any) => api.get('/users/all', { params: p }),
  assignRole: (id: number, role: string) => api.put(`/users/${id}/role`, { role }),
  toggle:     (id: number) => api.put(`/users/${id}/toggle`),
}
export const meetingsApi = {
  list:           () => api.get('/meetings'),
  create:         (d: any) => api.post('/meetings', d),
  markAttendance: (id: number, user_ids: number[]) => api.post(`/meetings/${id}/attendance`, { user_ids }),
}
export const uploadApi = {
  file: (file: File) => {
    const f = new FormData(); f.append('file', file)
    return api.post('/upload', f, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}
export const statsApi = {
  public: () => api.get('/stats/public'),
}

export const adminApi = {
  aiKeys: () => api.get('/admin/ai-keys'),
  setAiKeys: (d: any) => api.post('/admin/ai-keys', d),
}
