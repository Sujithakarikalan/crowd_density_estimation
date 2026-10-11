import axios from 'axios'

export const API_BASE = 'http://localhost:8000'

const client = axios.create({
  baseURL: API_BASE,
  timeout: 180000,
})

function formatError(error, fallback) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
  if (error?.code === 'ECONNABORTED') return 'The analysis request timed out. Try a smaller image.'
  if (error?.message === 'Network Error' || !error?.response) {
    return 'Backend unavailable. Start FastAPI on port 8000.'
  }
  return fallback
}

export async function getHealth() {
  const { data } = await client.get('/api/health')
  return data
}

export async function predictCrowd(file) {
  const form = new FormData()
  form.append('file', file)
  try {
    const { data } = await client.post('/api/predict', form)
    return data
  } catch (error) {
    throw new Error(
      formatError(
        error,
        'Unable to analyze this image. Please upload a valid JPG, PNG, or WEBP image.',
      ),
    )
  }
}

export function mediaUrl(url) {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('data:')) return url
  return `${API_BASE}${url}`
}
