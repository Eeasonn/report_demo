import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send,
  Paperclip,
  Shield,
  Loader2,
  Sparkles,
  MessageSquare,
  BarChart3,
  FileText,
  ClipboardList,
  Bot
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useApi } from '../hooks/useApi'
import { renderMarkdown } from '../utils/markdown'
import MessageBubble from './MessageBubble'

/**
 * Agent 状态指示器
 */
function AgentStatusBar({ status, description }) {
  const config = {
    idle: {
      icon: Sparkles,
      color: 'text-medium-gray',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: '就绪'
    },
    running: {
      icon: Loader2,
      color: 'text-huawei-red',
      bg: 'bg-huawei-red-light',
      border: 'border-huawei-red/20',
      text: '工作中'
    },
    completed: {
      icon: Sparkles,
      color: 'text-success-green',
      bg: 'bg-success-green-light',
      border: 'border-success-green/20',
      text: '已完成'
    },
    error: {
      icon: Bot,
      color: 'text-error-red',
      bg: 'bg-error-red-light',
      border: 'border-error-red/20',
      text: '出错'
    }
  }

  const c = config[status] || config.idle
  const Icon = c.icon

  return (
    <div className={`flex items-center gap-3 px-5 py-3 ${c.bg} border-b ${c.border}`}>
      <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center border ${c.border}`}>
        <Icon size={16} className={`${c.color} ${status === 'running' ? 'animate-spin-slow' : ''}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${c.color}`}>
            AI Agent {c.text}
          </span>
          {status === 'running' && (
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-huawei-red opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-huawei-red"></span>
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-medium-gray truncate mt-0.5">{description}</p>
        )}
      </div>
    </div>
  )
}

/**
 * 嵌入的报告卡片（在消息中显示）
 */
function InlineReportCard({ type, content, onViewReport }) {
  const config = {
    competitorAnalysis: {
      icon: BarChart3,
      title: '竞品分析报告',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      badge: 'bg-blue-100 text-blue-700'
    },
    marketingPlan: {
      icon: FileText,
      title: '营销方案',
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      badge: 'bg-green-100 text-green-700'
    },
    auditReport: {
      icon: ClipboardList,
      title: '审计报告',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      badge: 'bg-orange-100 text-orange-700'
    }
  }

  const c = config[type] || config.marketingPlan
  const Icon = c.icon

  // 提取预览内容
  const preview = content.split('\n').slice(0, 5).join('\n')

  return (
    <div className={`mt-3 rounded-xl border ${c.border} overflow-hidden max-w-lg`}>
      <div className={`flex items-center gap-3 px-4 py-3 ${c.bg}`}>
        <Icon size={18} className={c.color} />
        <span className={`text-sm font-semibold ${c.color}`}>{c.title}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${c.badge}`}>
          已生成
        </span>
      </div>
      <div className="p-4 bg-white">
        <div
          className="markdown-content text-xs text-medium-gray line-clamp-6"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(preview + '...') }}
        />
        <button
          onClick={() => onViewReport(type)}
          className="mt-3 text-huawei-red text-xs font-medium hover:underline flex items-center gap-1"
        >
          查看完整报告
        </button>
      </div>
    </div>
  )
}

/**
 * 欢迎界面
 */
function WelcomeScreen({ onStart, productName }) {
  const suggestions = [
    '分析华为 Mate 90 Pro 的市场定位和竞争对手',
    '制定针对年轻用户群体的社交媒体营销策略',
    '评估当前营销方案的合规性和改进建议',
    '生成包含预算分配的全渠道营销计划'
  ]

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-16 h-16 rounded-2xl bg-huawei-red/10 flex items-center justify-center mb-6">
        <Sparkles size={32} className="text-huawei-red" />
      </div>
      <h2 className="text-2xl font-bold text-dark-gray mb-2">
        {productName ? `${productName}` : '华为营销策划 Agent'}
      </h2>
      <p className="text-medium-gray text-sm text-center max-w-md mb-8 leading-relaxed">
        我是您的 AI 营销助手，可以帮您进行竞品分析、制定营销方案，
        并使用 Marketing 7.0 框架审计方案合规性。
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
        {suggestions.map((text, idx) => (
          <button
            key={idx}
            onClick={() => onStart(text)}
            className="text-left p-4 rounded-xl border border-border-gray hover:border-huawei-red/30 hover:bg-huawei-red-light/30 transition-all duration-200 group"
          >
            <p className="text-sm text-dark-gray group-hover:text-huawei-red transition-colors leading-relaxed">
              {text}
            </p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-6 mt-8 text-xs text-medium-gray">
        <div className="flex items-center gap-1.5">
          <BarChart3 size={14} />
          <span>竞品分析</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileText size={14} />
          <span>营销方案</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield size={14} />
          <span>合规审计</span>
        </div>
      </div>
    </div>
  )
}

/**
 * 核心对话界面
 */
export default function ChatInterface() {
  const {
    currentSessionId,
    currentProductName,
    messages,
    agentStatus,
    enableAudit,
    activeTab,
    setActiveTab,
    addMessage,
    updateReport,
    toggleAudit
  } = useApp()

  const { sendMessage: apiSendMessage, loading } = useApi()

  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [localMessages, setLocalMessages] = useState([])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // 合并本地消息和上下文消息
  const allMessages = [...localMessages, ...messages]

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [allMessages, agentStatus.status, scrollToBottom])

  // 发送消息
  const handleSend = async (content) => {
    if (!content.trim() || isSending) return

    const userMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    }

    // 添加到本地消息
    setLocalMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsSending(true)

    // 添加 typing 指示器
    const typingId = 'typing_' + Date.now()
    setLocalMessages((prev) => [
      ...prev,
      { id: typingId, role: 'assistant', content: '', isTyping: true }
    ])

    try {
      if (currentSessionId) {
        // 调用 API
        const response = await apiSendMessage(
          currentSessionId,
          content.trim(),
          enableAudit
        )

        // 移除 typing 指示器
        setLocalMessages((prev) => prev.filter((m) => m.id !== typingId))

        // 添加 AI 回复
        if (response) {
          const aiMessage = {
            id: 'msg_' + Date.now(),
            role: 'assistant',
            content: response.content || response.message || '已收到您的请求，正在处理...',
            reports: response.reports || [],
            timestamp: new Date().toISOString()
          }
          setLocalMessages((prev) => [...prev, aiMessage])

          // 更新报告
          if (response.reports) {
            response.reports.forEach((report) => {
              updateReport(report.type, report.content)
            })
          }

          // 如果有报告，自动添加报告消息
          if (response.competitor_analysis) {
            updateReport('competitorAnalysis', response.competitor_analysis)
          }
          if (response.marketing_plan) {
            updateReport('marketingPlan', response.marketing_plan)
          }
          if (response.audit_report) {
            updateReport('auditReport', response.audit_report)
          }
        }
      } else {
        // 没有会话时的模拟回复
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // 移除 typing 指示器
        setLocalMessages((prev) => prev.filter((m) => m.id !== typingId))

        // 模拟回复
        const aiMessage = {
          id: 'msg_' + Date.now(),
          role: 'assistant',
          content: generateMockResponse(content.trim()),
          timestamp: new Date().toISOString()
        }
        setLocalMessages((prev) => [...prev, aiMessage])
      }
    } catch (error) {
      // 移除 typing 指示器
      setLocalMessages((prev) => prev.filter((m) => m.id !== typingId))

      // 错误回复
      const errorMessage = {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        content: '抱歉，处理您的请求时出现了问题。请稍后重试，或检查网络连接。',
        isError: true,
        timestamp: new Date().toISOString()
      }
      setLocalMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  // 模拟响应生成
  const generateMockResponse = (userInput) => {
    const lower = userInput.toLowerCase()
    if (lower.includes('竞品') || lower.includes('竞争') || lower.includes('对手')) {
      return `## 竞品分析

基于您的需求，我对华为 ${currentProductName || 'Mate 90 Pro'} 的主要竞争对手进行了分析：

### 主要竞争对手

| 品牌 | 型号 | 优势 | 劣势 |
|------|------|------|------|
| 苹果 | iPhone 16 Pro | 品牌溢价高、生态系统完善 | 价格昂贵、创新放缓 |
| 三星 | Galaxy S25 | 屏幕技术领先、全球化布局 | 中国市场萎缩、品牌认知下降 |
| 小米 | 15 Ultra | 性价比突出、粉丝运营强 | 高端形象不足、利润率低 |
| OPPO | Find X8 | 影像技术强、渠道覆盖广 | 品牌差异化不足 |

### 差异化策略建议

1. **技术领先**：继续强化影像、通信等核心技术优势
2. **品牌高端化**：通过旗舰产品巩固高端市场地位
3. **生态建设**：完善鸿蒙生态，提升用户粘性

您可以要求我基于此分析制定详细的营销方案。`
    }

    if (lower.includes('营销') || lower.includes('方案') || lower.includes('策略')) {
      return `## 华为 ${currentProductName || 'Mate 90 Pro'} 营销策划方案

### 一、营销目标

- **品牌目标**：巩固华为在高端智能手机市场的领导地位
- **销售目标**：首销季度达成 500 万台销量
- **用户目标**：提升年轻用户群体（18-35岁）占比至 40%

### 二、目标受众

**核心人群**：25-40岁科技爱好者、商务人士
- 注重产品品质与技术创新
- 具有较强的品牌忠诚度
- 购买力较强，对价格敏感度低

### 三、营销策略

#### 3.1 产品策略
- 突出影像系统升级，与徕卡深度合作
- 强调鸿蒙系统流畅体验
- 5G/卫星通信技术领先

#### 3.2 价格策略
- 采取价值定价策略
- 推出多版本满足不同需求
- 以旧换新政策促进换机

#### 3.3 渠道策略
- **线上**：华为商城、京东、天猫旗舰店
- **线下**：华为体验店 + 合作伙伴门店
- **新兴**：抖音直播、小红书种草

#### 3.4 推广策略
- **发布会**：打造科技圈年度盛事
- **KOL合作**：科技博主、摄影达人深度评测
- **社交营销**：微博话题、抖音挑战赛
- **户外广告**：机场、高铁站高端场景

### 四、执行计划

| 阶段 | 时间 | 主要活动 |
|------|------|----------|
| 预热期 | T-30天 | 悬念海报、参数爆料 |
| 发布期 | T-Day | 发布会、媒体评测 |
| 首销期 | T+1~7天 | 限时优惠、直播带货 |
| 持续期 | T+7~30天 | 用户UGC、口碑传播 |

您可以启用 **Marketing 7.0 审计**来评估此方案的合规性。`
    }

    if (lower.includes('审计') || lower.includes('评估') || lower.includes('marketing 7')) {
      return `## Marketing 7.0 审计结果

### 总体评分：**72/100**

---

### 三道闸门评估

#### 第一道闸门：品牌专业度（78/100）
- 品牌定位清晰，核心信息一致
- **建议**：增加品牌故事叙述，强化情感连接

#### 第二道闸门：受众洞察（65/100）
- 目标人群定义基本准确
- **建议**：补充更详细的用户画像数据，增加行为洞察

#### 第三道闸门：战略意图（82/100）
- 营销目标明确，策略与目标对齐度高
- **建议**：细化各渠道的预期转化目标

---

### 认知地图激活评估：70%

品牌在功能性和情感性维度的认知映射较为均衡，但创新性维度的认知映射有待加强。

---

### 四大工具应用评分

| 工具 | 得分 | 评价 |
|------|------|------|
| AIM 品效模型 | 75 | 品牌-效果协同策略较为完善 |
| DESA 内容评估 | 68 | 内容策略需要更系统化 |
| REAN 转化分析 | 72 | 转化漏斗设计合理 |
| SCOPE 战略规划 | 80 | 战略规划框架完整 |

---

### 整改建议

1. **【高优先级】** 建议补充目标受众的细分分析，增加年龄、性别、收入水平等维度
2. **【高优先级】** 品牌定位部分需加入核心价值的具体阐述
3. **【中优先级】** 营销渠道策略需补充各渠道的具体投放预算
4. **【中优先级】** 建议增加风险评估部分和应对措施

请在对话中勾选「启用 Marketing 7.0 审计」以获取实时审计结果。`
    }

    return `收到您的需求！我将为您分析 **${currentProductName || '华为产品'}** 的相关内容。

我可以为您提供以下服务：

1. **竞品分析** - 深入分析主要竞争对手的产品特点、市场定位和营销策略
2. **营销方案** - 基于分析结果制定针对性的营销策略和执行计划
3. **合规审计** - 使用 Marketing 7.0 框架评估方案的合规性和优化建议

请问您希望我重点关注哪个方面？或者您可以更详细地描述您的需求。`
  }

  // 查看报告
  const handleViewReport = (reportType) => {
    const tabMap = {
      competitorAnalysis: 'reports',
      marketingPlan: 'reports',
      auditReport: 'audit'
    }
    const targetTab = tabMap[reportType] || 'reports'
    setActiveTab(targetTab)
  }

  // 渲染消息列表
  const renderMessages = () => {
    return allMessages.map((msg, index) => {
      // 如果是 typing 指示器
      if (msg.isTyping) {
        return (
          <div key={msg.id} className="animate-fade-in">
            <MessageBubble role="assistant" content="" isTyping={true} />
          </div>
        )
      }

      const isLatest = index === allMessages.length - 1

      return (
        <div key={msg.id || index} className="animate-fade-in">
          <MessageBubble
            role={msg.role}
            content={msg.content}
            isLatest={isLatest}
          />
          {/* 嵌入的报告卡片 */}
          {msg.role === 'assistant' && msg.reports && msg.reports.length > 0 && (
            <div className="ml-11 mt-1">
              {msg.reports.map((report, rIdx) => (
                <InlineReportCard
                  key={rIdx}
                  type={report.type}
                  content={report.content}
                  onViewReport={handleViewReport}
                />
              ))}
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <div className="h-full flex flex-col bg-chat-bg">
      {/* Top Header */}
      <div className="bg-white border-b border-border-gray px-6 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-huawei-red/10 flex items-center justify-center">
            <Bot size={18} className="text-huawei-red" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-dark-gray">
              {currentProductName || '华为营销策划 Agent'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  agentStatus.status === 'running'
                    ? 'bg-huawei-red animate-pulse'
                    : agentStatus.status === 'completed'
                    ? 'bg-success-green'
                    : agentStatus.status === 'error'
                    ? 'bg-error-red'
                    : 'bg-medium-gray'
                }`}
              />
              <span className="text-xs text-medium-gray">
                {agentStatus.status === 'running'
                  ? 'AI 正在工作中'
                  : agentStatus.status === 'completed'
                  ? '任务已完成'
                  : agentStatus.status === 'error'
                  ? '执行出错'
                  : '就绪'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {allMessages.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('reports')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-dark-gray hover:bg-light-gray border border-border-gray transition-colors"
            >
              <FileText size={14} />
              <span className="hidden sm:inline">查看报告</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-dark-gray hover:bg-light-gray border border-border-gray transition-colors"
            >
              <Shield size={14} />
              <span className="hidden sm:inline">审计面板</span>
            </button>
          </div>
        )}
      </div>

      {/* Agent Status Bar (shown when running) */}
      {agentStatus.status === 'running' && (
        <AgentStatusBar
          status={agentStatus.status}
          description={agentStatus.description || agentStatus.currentStep}
        />
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        {allMessages.length === 0 ? (
          <WelcomeScreen
            onStart={handleSend}
            productName={currentProductName}
          />
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {renderMessages()}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-border-gray px-4 sm:px-6 py-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          {/* Input toolbar */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    enableAudit
                      ? 'bg-huawei-red border-huawei-red'
                      : 'border-gray-300 group-hover:border-huawei-red/50'
                  }`}
                  onClick={toggleAudit}
                >
                  {enableAudit && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield size={13} className={enableAudit ? 'text-huawei-red' : 'text-medium-gray'} />
                  <span
                    className={`text-xs font-medium ${
                      enableAudit ? 'text-huawei-red' : 'text-medium-gray'
                    }`}
                  >
                    启用 Marketing 7.0 审计
                  </span>
                </div>
              </label>
            </div>

            {currentSessionId && (
              <span className="text-xs text-medium-gray">
                会话: {currentSessionId.slice(0, 8)}...
              </span>
            )}
          </div>

          {/* Input box */}
          <div className="flex items-end gap-2 bg-light-gray rounded-2xl border border-border-gray focus-within:border-huawei-red/30 focus-within:ring-2 focus-within:ring-huawei-red/10 transition-all">
            <button
              className="p-3 text-medium-gray hover:text-dark-gray transition-colors shrink-0"
              title="附件（开发中）"
            >
              <Paperclip size={18} />
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(input)
                }
              }}
              placeholder={
                currentProductName
                  ? `询问关于 ${currentProductName} 的营销问题...`
                  : '输入您的产品名称开始，或输入营销相关问题...'
              }
              rows={1}
              className="flex-1 bg-transparent py-3 px-1 text-sm text-dark-gray placeholder-medium-gray/60 outline-none resize-none max-h-32 min-h-[42px]"
              style={{ lineHeight: '1.5' }}
            />

            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isSending}
              className={`m-1.5 p-2.5 rounded-xl transition-all duration-200 shrink-0 ${
                input.trim() && !isSending
                  ? 'bg-huawei-red hover:bg-huawei-red-hover text-white shadow-md shadow-huawei-red/20'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSending ? (
                <Loader2 size={18} className="animate-spin-slow" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>

          <p className="text-xs text-medium-gray/50 mt-2 text-center">
            AI 生成的内容仅供参考，请结合实际情况进行调整
          </p>
        </div>
      </div>
    </div>
  )
}
