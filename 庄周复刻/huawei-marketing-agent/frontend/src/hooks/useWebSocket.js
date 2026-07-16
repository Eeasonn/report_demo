import { useState, useEffect, useRef, useCallback } from 'react'

const WS_URL = 'ws://localhost:8000/ws'
const RECONNECT_DELAY = 3000
const MAX_RECONNECT_ATTEMPTS = 5

/**
 * WebSocket 自定义 Hook
 * @param {string} sessionId - 会话 ID
 * @returns {Object} { isConnected, messages, tasks, agentStatus, sendMessage, reconnect }
 */
export function useWebSocket(sessionId) {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState([])
  const [tasks, setTasks] = useState([])
  const [agentStatus, setAgentStatus] = useState({
    status: 'idle',
    currentStep: '',
    description: ''
  })

  const wsRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef(null)
  const sessionIdRef = useRef(sessionId)

  // 更新 sessionId ref
  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      const url = sessionIdRef.current
        ? `${WS_URL}/${sessionIdRef.current}`
        : WS_URL

      const ws = new WebSocket(url)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWebSocketMessage(data)
        } catch (error) {
          console.error('WebSocket message parse error:', error)
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        attemptReconnect()
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('WebSocket connection error:', error)
      attemptReconnect()
    }
  }, [])

  const handleWebSocketMessage = useCallback((data) => {
    const { type, payload } = data

    switch (type) {
      case 'status':
        setAgentStatus({
          status: payload.status || 'idle',
          currentStep: payload.current_step || '',
          description: payload.description || ''
        })
        break

      case 'task_update':
        setTasks((prev) => {
          const existing = prev.findIndex((t) => t.id === payload.id)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = { ...updated[existing], ...payload }
            return updated
          }
          return [...prev, payload]
        })
        break

      case 'task_list':
        setTasks(payload.tasks || [])
        break

      case 'message':
        setMessages((prev) => [...prev, payload])
        break

      case 'report':
        setMessages((prev) => [
          ...prev,
          {
            type: 'report',
            reportType: payload.report_type,
            content: payload.content,
            timestamp: payload.timestamp
          }
        ])
        break

      case 'complete':
        setAgentStatus({
          status: 'completed',
          currentStep: '',
          description: payload.message || '任务已完成'
        })
        break

      case 'error':
        setAgentStatus({
          status: 'error',
          currentStep: '',
          description: payload.message || '发生错误'
        })
        break

      default:
        console.log('Unknown WebSocket message type:', type)
    }
  }, [])

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached')
      return
    }

    reconnectAttemptsRef.current += 1
    console.log(
      `Reconnecting... Attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`
    )

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
    }

    reconnectTimerRef.current = setTimeout(() => {
      connect()
    }, RECONNECT_DELAY)
  }, [connect])

  // 发送消息
  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message',
          payload: message
        })
      )
      return true
    }
    return false
  }, [])

  // 手动重连
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
    }
    connect()
  }, [connect])

  // 初始连接
  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  return {
    isConnected,
    messages,
    tasks,
    agentStatus,
    sendMessage,
    reconnect
  }
}

export default useWebSocket
