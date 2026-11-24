export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type RequestOptions = Omit<RequestInit, 'credentials'>

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')
  if (
    options.method &&
    !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())
  ) {
    headers.set('X-Noctua-Request', '1')
  }
  const apiBase = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })
  const body =
    response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401)
      window.dispatchEvent(new Event('noctua:unauthorized'))
    const rawMessage = body?.message
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(' ')
      : rawMessage
    throw new ApiError(
      message || 'Não foi possível concluir a solicitação.',
      response.status,
    )
  }
  return body as T
}
