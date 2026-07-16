import { useState } from 'react'
import { User, Bot, FileText, BarChart3, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react'
import { renderMarkdown, getMarkdownPreview } from '../utils/markdown'

/**
 * 报告卡片组件
 * 可展开/折叠的报告卡片
 */
function ReportCard({ type, content, title, icon: Icon }) {
  const [expanded, setExpanded] = useState(false)

  const typeConfig = {
    competitorAnalysis: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700',
      title: '竞品分析报告'
    },
    marketingPlan: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      badgeBg: 'bg-green-100',
      badgeText: 'text-green-700',
      title: '营销方案'
    },
    auditReport: {
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      iconColor: 'text-orange-600',
      badgeBg: 'bg-orange-100',
      badgeText: 'text-orange-700',
      title: 'Marketing 7.0 审计报告'
    }
  }

  const config = typeConfig[type] || typeConfig.marketingPlan
  const displayTitle = title || config.title
  const preview = getMarkdownPreview(content, 6)

  return (
    <div className={`mt-3 rounded-xl border ${config.borderColor} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 px-4 py-3 ${config.bgColor} hover:opacity-80 transition-opacity`}
      >
        <Icon size={18} className={config.iconColor} />
        <span className={`text-sm font-semibold ${config.iconColor}`}>
          {displayTitle}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${config.badgeBg} ${config.badgeText}`}>
          {expanded ? '已展开' : '点击展开'}
        </span>
        <div className="ml-auto">
          {expanded ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </div>
      </button>

      {/* Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 bg-white">
          <div
            className="markdown-content text-sm"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(expanded ? content : preview + '\n\n...')
            }}
          />
          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-2 text-huawei-red text-xs font-medium hover:underline"
            >
              查看完整内容
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 打字指示器
 */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl rounded-tl-md border border-border-gray shadow-sm w-fit">
      <div className="typing-indicator flex gap-1">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span className="text-xs text-medium-gray ml-1">AI 正在思考...</span>
    </div>
  )
}

/**
 * 消息气泡组件
 * @param {Object} props
 * @param {string} props.role - 'user' | 'assistant'
 * @param {string} props.content - 消息内容
 * @param {Array} props.reports - 嵌入的报告
 * @param {boolean} props.isTyping - 是否显示打字指示器
 * @param {boolean} props.isLatest - 是否是最新消息
 */
export default function MessageBubble({
  role,
  content,
  reports = [],
  isTyping = false,
  isLatest = false
}) {
  const isUser = role === 'user'

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} ${
        isLatest ? 'animate-fade-in' : ''
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? 'bg-huawei-red text-white'
            : 'bg-white border-2 border-huawei-red text-huawei-red'
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        {/* Role label */}
        <span className="text-xs text-medium-gray mb-1.5">
          {isUser ? '您' : 'AI 助手'}
        </span>

        {/* Message bubble */}
        <div
          className={`px-4 py-3 rounded-2xl shadow-sm ${
            isUser
              ? 'bg-huawei-red text-white rounded-tr-md'
              : 'bg-white border border-border-gray rounded-tl-md'
          }`}
        >
          {isTyping && !content ? (
            <TypingIndicator />
          ) : (
            <div
              className={`markdown-content text-sm ${
                isUser ? 'text-white' : 'text-dark-gray'
              }`}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          )}
        </div>

        {/* Embedded Report Cards */}
        {!isUser && reports && reports.length > 0 && (
          <div className="w-full mt-1 space-y-2">
            {reports.map((report, index) => {
              const iconMap = {
                competitorAnalysis: BarChart3,
                marketingPlan: FileText,
                auditReport: ClipboardList
              }
              const Icon = iconMap[report.type] || FileText
              return (
                <ReportCard
                  key={index}
                  type={report.type}
                  content={report.content}
                  title={report.title}
                  icon={Icon}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export { ReportCard }
