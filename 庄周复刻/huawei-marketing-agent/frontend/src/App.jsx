import { useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { useApi } from './hooks/useApi'
import { useWebSocket } from './hooks/useWebSocket'
import Sidebar from './components/Sidebar'
import ChatInterface from './components/ChatInterface'
import TaskBoard from './components/TaskBoard'
import ReportViewer from './components/ReportViewer'
import AuditPanel from './components/AuditPanel'
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * 主应用内容组件
 */
function AppContent() {
  const {
    currentSessionId,
    activeTab,
    setActiveTab,
    loadSessions,
    addMessage,
    updateReport,
    updateTasks,
    updateAgentStatus,
    sidebarOpen,
    setSidebarOpen
  } = useApp()

  const { getSessions, error, clearError, loading } = useApi()

  // WebSocket 连接
  const {
    isConnected,
    messages: wsMessages,
    tasks: wsTasks,
    agentStatus: wsAgentStatus
  } = useWebSocket(currentSessionId)

  // 初始加载会话列表
  useEffect(() => {
    const load = async () => {
      try {
        const sessions = await getSessions()
        loadSessions(sessions || [])
      } catch (err) {
        console.error('Failed to load sessions:', err)
        // API 不可用时使用本地数据
        loadSessions([
          {
            id: 'demo_1',
            product_name: 'Mate 90 Pro',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            updated_at: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: 'demo_2',
            product_name: 'Pura 80 Ultra',
            created_at: new Date(Date.now() - 172800000).toISOString(),
            updated_at: new Date(Date.now() - 86400000).toISOString()
          }
        ])
      }
    }
    load()
  }, [getSessions, loadSessions])

  // 处理 WebSocket 消息
  useEffect(() => {
    if (wsMessages.length > 0) {
      const latestMessage = wsMessages[wsMessages.length - 1]
      if (latestMessage.type === 'report') {
        updateReport(latestMessage.reportType, latestMessage.content)
      } else {
        addMessage(latestMessage)
      }
    }
  }, [wsMessages, addMessage, updateReport])

  // 处理 WebSocket 任务更新
  useEffect(() => {
    if (wsTasks.length > 0) {
      updateTasks(wsTasks)
    }
  }, [wsTasks, updateTasks])

  // 处理 WebSocket Agent 状态
  useEffect(() => {
    if (wsAgentStatus) {
      updateAgentStatus(wsAgentStatus)
    }
  }, [wsAgentStatus, updateAgentStatus])

  // 渲染主内容区
  const renderMainContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatInterface />
      case 'tasks':
        return <TaskBoard />
      case 'reports':
        return (
          <ReportViewer
            onBack={() => setActiveTab('chat')}
          />
        )
      case 'audit':
        return (
          <AuditPanel
            onBack={() => setActiveTab('chat')}
          />
        )
      default:
        return <ChatInterface />
    }
  }

  return (
    <div className="h-screen w-screen flex bg-chat-bg overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Connection Status Bar */}
        {!isConnected && currentSessionId && (
          <div className="bg-warning-yellow-light border-b border-warning-yellow/20 px-4 py-2 flex items-center justify-center gap-2 text-xs">
            <AlertTriangle size={14} className="text-warning-yellow" />
            <span className="text-warning-yellow">
              WebSocket 连接断开，正在尝试重连...
            </span>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1 text-warning-yellow hover:underline font-medium"
            >
              <RefreshCw size={12} />
              刷新
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="bg-error-red-light border-b border-error-red/20 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle size={14} className="text-error-red" />
              <span className="text-error-red">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-error-red text-xs hover:underline"
            >
              关闭
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-50">
            <div className="flex items-center gap-3 px-6 py-4 bg-white rounded-xl shadow-lg border border-border-gray">
              <Loader2 size={20} className="text-huawei-red animate-spin-slow" />
              <span className="text-sm text-medium-gray">加载中...</span>
            </div>
          </div>
        )}

        {/* Tab Navigation (Mobile/Compact) */}
        <div className="lg:hidden bg-white border-b border-border-gray px-4 py-2 flex items-center gap-1 overflow-x-auto">
          <TabButton
            active={activeTab === 'chat'}
            onClick={() => setActiveTab('chat')}
            label="对话"
          />
          <TabButton
            active={activeTab === 'tasks'}
            onClick={() => setActiveTab('tasks')}
            label="任务"
          />
          <TabButton
            active={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
            label="报告"
          />
          <TabButton
            active={activeTab === 'audit'}
            onClick={() => setActiveTab('audit')}
            label="审计"
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat + Task Layout */}
          {activeTab === 'chat' || activeTab === 'tasks' ? (
            <>
              {/* Main Panel */}
              <div className="flex-1 min-w-0 overflow-hidden">
                {renderMainContent()}
              </div>

              {/* Right Panel - Task Board (Desktop only) */}
              {activeTab === 'chat' && (
                <div className="hidden xl:block w-96 border-l border-border-gray bg-white overflow-hidden">
                  <TaskBoard />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 min-w-0 overflow-hidden">
              {renderMainContent()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 标签页按钮
 */
function TabButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? 'bg-huawei-red text-white'
          : 'text-medium-gray hover:bg-light-gray'
      }`}
    >
      {label}
    </button>
  )
}

/**
 * 主应用组件
 */
export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
