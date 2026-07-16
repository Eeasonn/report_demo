import { useState, useCallback } from 'react'

const API_BASE_URL = 'http://localhost:8000'

/**
 * 通用 fetch 封装
 * @param {string} endpoint - API 端点
 * @param {object} options - fetch 选项
 * @returns {Promise}
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  }

  const response = await fetch(url, { ...defaultOptions, ...options })

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `HTTP error! status: ${response.status}`
    }))
    throw new Error(error.message || error.detail || `HTTP error! status: ${response.status}`)
  }

  // 处理空响应
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }
  return response.text()
}

/**
 * API 调用 Hook
 * @returns {Object} { loading, error, clearError, api }
 */
export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * 包装异步函数，自动处理 loading 和 error 状态
   */
  const execute = useCallback(async (asyncFn) => {
    setLoading(true)
    setError(null)
    try {
      const result = await asyncFn()
      setLoading(false)
      return result
    } catch (err) {
      setLoading(false)
      setError(err.message || '请求失败')
      throw err
    }
  }, [])

  // ============ 会话 API ============

  /**
   * 创建新会话
   * @param {string} productName - 产品名称
   * @returns {Promise<Object>}
   */
  const createSession = useCallback(
    (productName) =>
      execute(() =>
        apiFetch('/api/sessions', {
          method: 'POST',
          body: JSON.stringify({ product_name: productName })
        })
      ),
    [execute]
  )

  /**
   * 获取会话列表
   * @returns {Promise<Array>}
   */
  const getSessions = useCallback(
    () => execute(() => apiFetch('/api/sessions')),
    [execute]
  )

  /**
   * 获取会话详情
   * @param {string} sessionId
   * @returns {Promise<Object>}
   */
  const getSession = useCallback(
    (sessionId) => execute(() => apiFetch(`/api/sessions/${sessionId}`)),
    [execute]
  )

  /**
   * 删除会话
   * @param {string} sessionId
   * @returns {Promise}
   */
  const deleteSession = useCallback(
    (sessionId) =>
      execute(() =>
        apiFetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
      ),
    [execute]
  )

  // ============ 消息 API ============

  /**
   * 发送消息
   * @param {string} sessionId
   * @param {string} content
   * @param {boolean} enableAudit - 是否启用 Marketing 7.0 审计
   * @returns {Promise<Object>}
   */
  const sendMessage = useCallback(
    (sessionId, content, enableAudit = false) =>
      execute(() =>
        apiFetch(`/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          body: JSON.stringify({
            content,
            enable_audit: enableAudit
          })
        })
      ),
    [execute]
  )

  /**
   * 获取消息历史
   * @param {string} sessionId
   * @returns {Promise<Array>}
   */
  const getMessages = useCallback(
    (sessionId) =>
      execute(() => apiFetch(`/api/sessions/${sessionId}/messages`)),
    [execute]
  )

  // ============ 报告 API ============

  /**
   * 获取报告
   * @param {string} sessionId
   * @param {string} reportType - competitor_analysis / marketing_plan / audit_report
   * @returns {Promise<Object>}
   */
  const getReport = useCallback(
    (sessionId, reportType) =>
      execute(() =>
        apiFetch(`/api/sessions/${sessionId}/reports/${reportType}`)
      ),
    [execute]
  )

  /**
   * 获取所有报告
   * @param {string} sessionId
   * @returns {Promise<Object>}
   */
  const getAllReports = useCallback(
    (sessionId) =>
      execute(() => apiFetch(`/api/sessions/${sessionId}/reports`)),
    [execute]
  )

  // ============ 审计 API ============

  /**
   * 获取审计结果
   * @param {string} sessionId
   * @returns {Promise<Object>}
   */
  const getAuditResult = useCallback(
    (sessionId) =>
      execute(() => apiFetch(`/api/sessions/${sessionId}/audit`)),
    [execute]
  )

  /**
   * 运行审计
   * @param {string} sessionId
   * @returns {Promise<Object>}
   */
  const runAudit = useCallback(
    (sessionId) =>
      execute(() =>
        apiFetch(`/api/sessions/${sessionId}/audit`, { method: 'POST' })
      ),
    [execute]
  )

  // ============ 任务 API ============

  /**
   * 获取任务列表
   * @param {string} sessionId
   * @returns {Promise<Array>}
   */
  const getTasks = useCallback(
    (sessionId) =>
      execute(() => apiFetch(`/api/sessions/${sessionId}/tasks`)),
    [execute]
  )

  return {
    loading,
    error,
    clearError,
    createSession,
    getSessions,
    getSession,
    deleteSession,
    sendMessage,
    getMessages,
    getReport,
    getAllReports,
    getAuditResult,
    runAudit,
    getTasks
  }
}

export default useApi
