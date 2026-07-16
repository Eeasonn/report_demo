import { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext(null)

/**
 * App 全局状态提供者
 */
export function AppProvider({ children }) {
  // 会话状态
  const [sessions, setSessions] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [currentProductName, setCurrentProductName] = useState('')

  // 消息状态
  const [messages, setMessages] = useState([])

  // 报告状态
  const [reports, setReports] = useState({
    competitorAnalysis: null,
    marketingPlan: null,
    auditReport: null
  })

  // 任务状态
  const [tasks, setTasks] = useState([])

  // Agent 状态
  const [agentStatus, setAgentStatus] = useState({
    status: 'idle', // idle | running | completed | error
    currentStep: '',
    description: ''
  })

  // UI 状态
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('chat') // chat | reports | audit
  const [enableAudit, setEnableAudit] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  // ============ Actions ============

  /**
   * 添加会话
   */
  const addSession = useCallback((session) => {
    setSessions((prev) => [session, ...prev])
    setCurrentSessionId(session.id)
    setCurrentProductName(session.product_name || '')
    setMessages([])
    setReports({
      competitorAnalysis: null,
      marketingPlan: null,
      auditReport: null
    })
    setTasks([])
    setAgentStatus({ status: 'idle', currentStep: '', description: '' })
  }, [])

  /**
   * 选择会话
   */
  const selectSession = useCallback((sessionId) => {
    setCurrentSessionId(sessionId)
    const session = sessions.find((s) => s.id === sessionId)
    if (session) {
      setCurrentProductName(session.product_name || '')
    }
    setMessages([])
    setActiveTab('chat')
  }, [sessions])

  /**
   * 删除会话
   */
  const removeSession = useCallback((sessionId) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null)
      setCurrentProductName('')
      setMessages([])
    }
  }, [currentSessionId])

  /**
   * 加载会话列表
   */
  const loadSessions = useCallback((sessionList) => {
    setSessions(sessionList)
  }, [])

  /**
   * 添加消息
   */
  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, message])
  }, [])

  /**
   * 设置消息列表
   */
  const setMessageList = useCallback((messageList) => {
    setMessages(messageList)
  }, [])

  /**
   * 更新报告
   */
  const updateReport = useCallback((reportType, content) => {
    setReports((prev) => ({
      ...prev,
      [reportType]: content
    }))
  }, [])

  /**
   * 更新任务列表
   */
  const updateTasks = useCallback((taskList) => {
    setTasks(taskList)
  }, [])

  /**
   * 更新单个任务
   */
  const updateTask = useCallback((task) => {
    setTasks((prev) => {
      const index = prev.findIndex((t) => t.id === task.id)
      if (index >= 0) {
        const updated = [...prev]
        updated[index] = { ...updated[index], ...task }
        return updated
      }
      return [...prev, task]
    })
  }, [])

  /**
   * 更新 Agent 状态
   */
  const updateAgentStatus = useCallback((status) => {
    setAgentStatus(status)
  }, [])

  /**
   * 切换侧边栏
   */
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  /**
   * 切换审计开关
   */
  const toggleAudit = useCallback(() => {
    setEnableAudit((prev) => !prev)
  }, [])

  const value = {
    // State
    sessions,
    currentSessionId,
    currentProductName,
    messages,
    reports,
    tasks,
    agentStatus,
    sidebarOpen,
    activeTab,
    enableAudit,
    isTyping,

    // Setters
    setSessions,
    setCurrentSessionId,
    setCurrentProductName,
    setMessages,
    setReports,
    setTasks,
    setAgentStatus,
    setSidebarOpen,
    setActiveTab,
    setEnableAudit,
    setIsTyping,

    // Actions
    addSession,
    selectSession,
    removeSession,
    loadSessions,
    addMessage,
    setMessageList,
    updateReport,
    updateTasks,
    updateTask,
    updateAgentStatus,
    toggleSidebar,
    toggleAudit
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

/**
 * 使用 App Context
 */
export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export default AppContext
