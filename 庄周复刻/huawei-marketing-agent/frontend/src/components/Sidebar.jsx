import { useState } from 'react'
import {
  Plus,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Clock
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useApi } from '../hooks/useApi'

/**
 * 侧边栏组件
 * - 应用 Logo + 标题
 * - 新建会话按钮
 * - 会话历史列表
 */
export default function Sidebar() {
  const {
    sessions,
    currentSessionId,
    sidebarOpen,
    addSession,
    selectSession,
    removeSession,
    toggleSidebar
  } = useApp()

  const { createSession, deleteSession } = useApi()
  const [isCreating, setIsCreating] = useState(false)
  const [productName, setProductName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // 新建会话
  const handleCreateSession = async () => {
    if (!productName.trim()) return
    setIsCreating(false)
    try {
      const session = await createSession(productName.trim())
      addSession(session)
      setProductName('')
    } catch (error) {
      console.error('Create session error:', error)
      // 如果 API 不可用，创建本地会话
      const localSession = {
        id: 'local_' + Date.now(),
        product_name: productName.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      addSession(localSession)
      setProductName('')
    }
  }

  // 删除会话
  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation()
    if (deleteConfirm === sessionId) {
      try {
        await deleteSession(sessionId)
      } catch (error) {
        console.error('Delete session API error:', error)
      }
      removeSession(sessionId)
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(sessionId)
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  // 格式化时间
  const formatTime = (isoString) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  if (!sidebarOpen) {
    return (
      <div className="w-14 bg-sidebar-bg flex flex-col items-center py-4 shrink-0 transition-all duration-300">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-sidebar-hover text-white/70 hover:text-white transition-colors"
          title="展开侧边栏"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    )
  }

  return (
    <div className="w-72 bg-sidebar-bg flex flex-col h-full shrink-0 transition-all duration-300">
      {/* Logo & Title */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-huawei-red flex items-center justify-center shrink-0">
            <Smartphone size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-semibold text-base leading-tight truncate">
              华为营销策划 Agent
            </h1>
            <p className="text-white/40 text-xs mt-0.5">AI 驱动的营销方案生成</p>
          </div>
        </div>
      </div>

      {/* New Session Button */}
      <div className="px-4 py-3">
        {isCreating ? (
          <div className="bg-sidebar-hover rounded-xl p-3 animate-fade-in">
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSession()
                if (e.key === 'Escape') {
                  setIsCreating(false)
                  setProductName('')
                }
              }}
              placeholder="输入产品名称，如 Mate 90 Pro"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 outline-none focus:border-huawei-red transition-colors"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleCreateSession}
                disabled={!productName.trim()}
                className="flex-1 bg-huawei-red hover:bg-huawei-red-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium py-2 rounded-lg transition-colors"
              >
                创建
              </button>
              <button
                onClick={() => {
                  setIsCreating(false)
                  setProductName('')
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium py-2 rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center gap-2.5 bg-huawei-red hover:bg-huawei-red-hover text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-huawei-red/20"
          >
            <Plus size={18} />
            <span className="text-sm">新建营销会话</span>
          </button>
        )}
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="px-2 py-2 text-white/30 text-xs font-medium uppercase tracking-wider">
          会话历史
        </div>
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare size={32} className="mx-auto text-white/15 mb-3" />
            <p className="text-white/25 text-sm">暂无会话</p>
            <p className="text-white/15 text-xs mt-1">点击上方按钮开始</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => selectSession(session.id)}
                className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  currentSessionId === session.id
                    ? 'bg-huawei-red/20 border border-huawei-red/30'
                    : 'hover:bg-sidebar-hover border border-transparent'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    currentSessionId === session.id
                      ? 'bg-huawei-red text-white'
                      : 'bg-white/10 text-white/50'
                  }`}
                >
                  <Smartphone size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      currentSessionId === session.id
                        ? 'text-white'
                        : 'text-white/70'
                    }`}
                  >
                    {session.product_name || '未命名产品'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock size={10} className="text-white/30" />
                    <span className="text-xs text-white/30">
                      {formatTime(session.updated_at || session.created_at)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                    deleteConfirm === session.id
                      ? 'bg-error-red text-white'
                      : 'text-white/20 hover:text-error-red hover:bg-error-red/10 opacity-0 group-hover:opacity-100'
                  }`}
                  title={deleteConfirm === session.id ? '确认删除' : '删除会话'}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 text-white/30 hover:text-white/60 text-xs py-2 rounded-lg hover:bg-sidebar-hover transition-colors"
        >
          <ChevronLeft size={14} />
          <span>收起侧边栏</span>
        </button>
      </div>
    </div>
  )
}
