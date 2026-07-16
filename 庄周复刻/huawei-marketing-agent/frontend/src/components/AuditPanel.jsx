import { useMemo } from 'react'
import {
  Shield,
  Target,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Info,
  Award,
  ChevronLeft
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { renderMarkdown } from '../utils/markdown'

/**
 * 环形进度条组件
 */
function RingProgress({ value, size = 140, strokeWidth = 12, color = '#CF0A2C' }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  const getScoreColor = (score) => {
    if (score >= 80) return '#52C41A'
    if (score >= 60) return '#FAAD14'
    return '#F5222D'
  }

  const scoreColor = getScoreColor(value)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="ring-progress">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E8E8E8"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color: scoreColor }}>
          {value}
        </span>
        <span className="text-xs text-medium-gray mt-0.5">总分 / 100</span>
      </div>
    </div>
  )
}

/**
 * 雷达图组件（使用 SVG）
 */
function RadarChart({ data }) {
  const size = 240
  const center = size / 2
  const maxRadius = 90
  const levels = 5

  const axes = Object.keys(data)
  const angleStep = (2 * Math.PI) / axes.length

  // 计算点的坐标
  const getPoint = (index, value) => {
    const angle = index * angleStep - Math.PI / 2
    const radius = (value / 100) * maxRadius
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    }
  }

  // 生成网格线
  const gridLines = []
  for (let level = 1; level <= levels; level++) {
    const levelValue = (level / levels) * 100
    const points = axes.map((_, i) => {
      const p = getPoint(i, levelValue)
      return `${p.x},${p.y}`
    })
    gridLines.push(
      <polygon
        key={`grid-${level}`}
        points={points.join(' ')}
        fill="none"
        stroke="#E8E8E8"
        strokeWidth="1"
      />
    )
  }

  // 生成轴线
  const axisLines = axes.map((_, i) => {
    const end = getPoint(i, 100)
    return (
      <line
        key={`axis-${i}`}
        x1={center}
        y1={center}
        x2={end.x}
        y2={end.y}
        stroke="#E8E8E8"
        strokeWidth="1"
      />
    )
  })

  // 生成数据区域
  const dataPoints = axes.map((key, i) => {
    const value = data[key]?.score || 0
    return getPoint(i, value)
  })
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ')

  // 生成标签
  const labels = axes.map((key, i) => {
    const angle = i * angleStep - Math.PI / 2
    const labelRadius = maxRadius + 22
    const x = center + labelRadius * Math.cos(angle)
    const y = center + labelRadius * Math.sin(angle)
    return (
      <text
        key={`label-${i}`}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-[10px] fill-medium-gray"
      >
        {data[key]?.label || key}
      </text>
    )
  })

  return (
    <svg width={size} height={size} className="mx-auto">
      {gridLines}
      {axisLines}
      <polygon
        points={dataPolygon}
        fill="rgba(207, 10, 44, 0.15)"
        stroke="#CF0A2C"
        strokeWidth="2"
      />
      {dataPoints.map((p, i) => (
        <circle
          key={`point-${i}`}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="#CF0A2C"
        />
      ))}
      {labels}
    </svg>
  )
}

/**
 * 评分卡片组件
 */
function ScoreCard({ title, score, maxScore = 100, description, icon: Icon, items = [] }) {
  const getScoreColor = (s) => {
    if (s >= 80) return { text: 'text-success-green', bg: 'bg-success-green-light', bar: 'bg-success-green' }
    if (s >= 60) return { text: 'text-warning-yellow', bg: 'bg-warning-yellow-light', bar: 'bg-warning-yellow' }
    return { text: 'text-error-red', bg: 'bg-error-red-light', bar: 'bg-error-red' }
  }

  const colors = getScoreColor(score)
  const percentage = (score / maxScore) * 100

  return (
    <div className="bg-white rounded-xl border border-border-gray p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
            <Icon size={20} className={colors.text} />
          </div>
          <div>
            <h4 className="font-semibold text-dark-gray text-sm">{title}</h4>
            {description && (
              <p className="text-xs text-medium-gray mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <div className={`text-2xl font-bold ${colors.text}`}>
          {score}
          <span className="text-sm text-medium-gray font-normal">/{maxScore}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2.5 bg-light-gray rounded-full overflow-hidden mb-4">
        <div
          className={`h-full ${colors.bar} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Detail items */}
      {items.length > 0 && (
        <div className="space-y-2 mt-3 pt-3 border-t border-border-gray">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-medium-gray">{item.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-light-gray rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      item.score >= 80
                        ? 'bg-success-green'
                        : item.score >= 60
                        ? 'bg-warning-yellow'
                        : 'bg-error-red'
                    } rounded-full`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <span
                  className={`font-medium min-w-[28px] text-right ${
                    item.score >= 80
                      ? 'text-success-green'
                      : item.score >= 60
                      ? 'text-warning-yellow'
                      : 'text-error-red'
                  }`}
                >
                  {item.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 整改建议项
 */
function SuggestionItem({ type, content, priority }) {
  const config = {
    high: {
      icon: AlertCircle,
      color: 'text-error-red',
      bg: 'bg-error-red-light',
      border: 'border-error-red/20',
      label: '高优先级'
    },
    medium: {
      icon: Info,
      color: 'text-warning-yellow',
      bg: 'bg-warning-yellow-light',
      border: 'border-warning-yellow/20',
      label: '中优先级'
    },
    low: {
      icon: CheckCircle,
      color: 'text-success-green',
      bg: 'bg-success-green-light',
      border: 'border-success-green/20',
      label: '低优先级'
    }
  }

  const c = config[priority] || config.medium
  const Icon = c.icon

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${c.border} ${c.bg}`}>
      <Icon size={18} className={`${c.color} shrink-0 mt-0.5`} />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium ${c.color}`}>{c.label}</span>
        </div>
        <p className="text-sm text-dark-gray leading-relaxed">{content}</p>
      </div>
    </div>
  )
}

/**
 * Marketing 7.0 审计面板
 */
export default function AuditPanel({ onBack }) {
  const { reports, currentProductName } = useApp()
  const auditReport = reports.auditReport

  // 解析审计报告数据（如果可用）
  const auditData = useMemo(() => {
    if (!auditReport) return null
    // 尝试从 Markdown 报告中提取结构化数据
    // 这里使用示例数据作为后备
    return parseAuditReport(auditReport)
  }, [auditReport])

  // 示例审计数据结构
  const sampleData = {
    overallScore: 72,
    gateScores: {
      gate1: { label: '品牌专业度', score: 78 },
      gate2: { label: '受众洞察', score: 65 },
      gate3: { label: '战略意图', score: 82 }
    },
    cognitiveMapScore: 70,
    toolScores: {
      AIM: { label: 'AIM 品效模型', score: 75 },
      DESA: { label: 'DESA 内容评估', score: 68 },
      REAN: { label: 'REAN 转化分析', score: 72 },
      SCOPE: { label: 'SCOPE 战略规划', score: 80 }
    },
    radarData: {
      brandProfessionalism: { label: '品牌专业度', score: 78 },
      audienceInsight: { label: '受众洞察', score: 65 },
      strategicIntent: { label: '战略意图', score: 82 },
      cognitiveMap: { label: '认知地图', score: 70 },
      toolApplication: { label: '工具应用', score: 74 }
    },
    suggestions: [
      {
        type: 'improvement',
        content: '建议在营销方案中增加对目标受众的细分分析，包括年龄、性别、收入水平等维度的详细描述。',
        priority: 'high'
      },
      {
        type: 'improvement',
        content: '品牌定位部分需要更加明确，建议加入品牌核心价值的具体阐述。',
        priority: 'high'
      },
      {
        type: 'improvement',
        content: '营销渠道策略可以更详细，建议补充各渠道的具体投放预算和预期效果。',
        priority: 'medium'
      },
      {
        type: 'improvement',
        content: '建议在方案中增加风险评估部分，分析可能面临的市场风险和应对措施。',
        priority: 'medium'
      },
      {
        type: 'enhancement',
        content: '可以考虑增加社交媒体互动策略，提升品牌与消费者的互动深度。',
        priority: 'low'
      }
    ]
  }

  const data = auditData || sampleData

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-gray bg-white flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-light-gray text-medium-gray hover:text-dark-gray transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div>
          <h2 className="text-lg font-bold text-dark-gray">Marketing 7.0 审计面板</h2>
          <p className="text-sm text-medium-gray mt-0.5">
            {currentProductName
              ? `${currentProductName} 的合规性评估`
              : '营销方案合规性评估'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!auditReport ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Shield size={64} className="text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-medium-gray mb-2">
              暂无审计数据
            </h3>
            <p className="text-sm text-medium-gray/60 max-w-md">
              在对话中启用「Marketing 7.0 审计」功能后，AI 将自动评估营销方案的合规性，并在此显示详细的审计结果。
            </p>
          </div>
        ) : (
          <div className="px-6 py-6 space-y-6 max-w-6xl mx-auto">
            {/* Overall Score Section */}
            <div className="bg-white rounded-xl border border-border-gray p-6">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                {/* Ring Progress */}
                <div className="flex flex-col items-center">
                  <RingProgress value={data.overallScore} />
                  <div className="flex items-center gap-2 mt-3">
                    <Award size={16} className="text-huawei-red" />
                    <span className="text-sm font-medium text-dark-gray">
                      {data.overallScore >= 80
                        ? '优秀'
                        : data.overallScore >= 60
                        ? '良好'
                        : '需改进'}
                    </span>
                  </div>
                </div>

                {/* Radar Chart */}
                <div className="flex-1 flex flex-col items-center">
                  <h4 className="text-sm font-semibold text-medium-gray mb-4">
                    能力雷达图
                  </h4>
                  <RadarChart data={data.radarData} />
                </div>

                {/* Score Summary */}
                <div className="flex-1 space-y-3">
                  <h4 className="text-sm font-semibold text-medium-gray mb-3">
                    评分概览
                  </h4>
                  {Object.entries(data.gateScores).map(([key, item]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-dark-gray">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-light-gray rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.score >= 80
                                ? 'bg-success-green'
                                : item.score >= 60
                                ? 'bg-warning-yellow'
                                : 'bg-error-red'
                            }`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                        <span
                          className={`text-sm font-semibold min-w-[32px] text-right ${
                            item.score >= 80
                              ? 'text-success-green'
                              : item.score >= 60
                              ? 'text-warning-yellow'
                              : 'text-error-red'
                          }`}
                        >
                          {item.score}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-border-gray">
                    <span className="text-sm text-dark-gray">认知地图激活</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-light-gray rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            data.cognitiveMapScore >= 80
                              ? 'bg-success-green'
                              : data.cognitiveMapScore >= 60
                              ? 'bg-warning-yellow'
                              : 'bg-error-red'
                          }`}
                          style={{ width: `${data.cognitiveMapScore}%` }}
                        />
                      </div>
                      <span
                        className={`text-sm font-semibold min-w-[32px] text-right ${
                          data.cognitiveMapScore >= 80
                            ? 'text-success-green'
                            : data.cognitiveMapScore >= 60
                            ? 'text-warning-yellow'
                            : 'text-error-red'
                        }`}
                      >
                        {data.cognitiveMapScore}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gate Scores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ScoreCard
                title="第一道闸门"
                score={data.gateScores.gate1.score}
                description="品牌专业度评估"
                icon={Shield}
              />
              <ScoreCard
                title="第二道闸门"
                score={data.gateScores.gate2.score}
                description="受众洞察深度"
                icon={Target}
              />
              <ScoreCard
                title="第三道闸门"
                score={data.gateScores.gate3.score}
                description="战略意图清晰度"
                icon={TrendingUp}
              />
            </div>

            {/* Tool Scores */}
            <div className="bg-white rounded-xl border border-border-gray p-6">
              <h3 className="text-base font-bold text-dark-gray mb-4 flex items-center gap-2">
                <Zap size={18} className="text-huawei-red" />
                四大工具评分
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(data.toolScores).map(([key, item]) => {
                  const colors =
                    item.score >= 80
                      ? { bg: 'bg-success-green-light', text: 'text-success-green', bar: 'bg-success-green' }
                      : item.score >= 60
                      ? { bg: 'bg-warning-yellow-light', text: 'text-warning-yellow', bar: 'bg-warning-yellow' }
                      : { bg: 'bg-error-red-light', text: 'text-error-red', bar: 'bg-error-red' }

                  return (
                    <div
                      key={key}
                      className={`${colors.bg} rounded-xl p-4 border border-border-gray`}
                    >
                      <p className="text-xs text-medium-gray mb-2">{item.label}</p>
                      <p className={`text-2xl font-bold ${colors.text} mb-3`}>
                        {item.score}
                      </p>
                      <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors.bar} rounded-full transition-all duration-700`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Cognitive Map Score */}
            <div className="bg-white rounded-xl border border-border-gray p-6">
              <h3 className="text-base font-bold text-dark-gray mb-4 flex items-center gap-2">
                <Target size={18} className="text-huawei-red" />
                认知地图激活评估
              </h3>
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-medium-gray">激活程度</span>
                    <span
                      className={`text-lg font-bold ${
                        data.cognitiveMapScore >= 80
                          ? 'text-success-green'
                          : data.cognitiveMapScore >= 60
                          ? 'text-warning-yellow'
                          : 'text-error-red'
                      }`}
                    >
                      {data.cognitiveMapScore}%
                    </span>
                  </div>
                  <div className="w-full h-4 bg-light-gray rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        data.cognitiveMapScore >= 80
                          ? 'bg-success-green'
                          : data.cognitiveMapScore >= 60
                          ? 'bg-warning-yellow'
                          : 'bg-error-red'
                      }`}
                      style={{ width: `${data.cognitiveMapScore}%` }}
                    />
                  </div>
                </div>
                <div
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    data.cognitiveMapScore >= 80
                      ? 'bg-success-green-light text-success-green'
                      : data.cognitiveMapScore >= 60
                      ? 'bg-warning-yellow-light text-warning-yellow'
                      : 'bg-error-red-light text-error-red'
                  }`}
                >
                  {data.cognitiveMapScore >= 80
                    ? '高度激活'
                    : data.cognitiveMapScore >= 60
                    ? '部分激活'
                    : '需加强'}
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="bg-white rounded-xl border border-border-gray p-6">
              <h3 className="text-base font-bold text-dark-gray mb-4 flex items-center gap-2">
                <AlertCircle size={18} className="text-huawei-red" />
                整改建议
              </h3>
              <div className="space-y-3">
                {data.suggestions.map((suggestion, idx) => (
                  <SuggestionItem
                    key={idx}
                    type={suggestion.type}
                    content={suggestion.content}
                    priority={suggestion.priority}
                  />
                ))}
              </div>
            </div>

            {/* Full Report */}
            {auditReport && (
              <div className="bg-white rounded-xl border border-border-gray p-6">
                <h3 className="text-base font-bold text-dark-gray mb-4">
                  完整审计报告
                </h3>
                <div
                  className="markdown-content"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(auditReport) }}
                />
              </div>
            )}

            {/* Spacer */}
            <div className="h-8" />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 解析审计报告（从 Markdown 中提取结构化数据）
 */
function parseAuditReport(report) {
  try {
    // 尝试从报告中提取分数
    const scoreMatch = report.match(/总分[：:]\s*(\d+)/)
    const overallScore = scoreMatch ? parseInt(scoreMatch[1]) : 72

    const gate1Match = report.match(/第一道闸门.*?([\d]+)/s)
    const gate2Match = report.match(/第二道闸门.*?([\d]+)/s)
    const gate3Match = report.match(/第三道闸门.*?([\d]+)/s)

    const cognitiveMatch = report.match(/认知地图.*?([\d]+)/s)

    return {
      overallScore,
      gateScores: {
        gate1: { label: '品牌专业度', score: gate1Match ? parseInt(gate1Match[1]) : 78 },
        gate2: { label: '受众洞察', score: gate2Match ? parseInt(gate2Match[1]) : 65 },
        gate3: { label: '战略意图', score: gate3Match ? parseInt(gate3Match[1]) : 82 }
      },
      cognitiveMapScore: cognitiveMatch ? parseInt(cognitiveMatch[1]) : 70,
      toolScores: {
        AIM: { label: 'AIM 品效模型', score: 75 },
        DESA: { label: 'DESA 内容评估', score: 68 },
        REAN: { label: 'REAN 转化分析', score: 72 },
        SCOPE: { label: 'SCOPE 战略规划', score: 80 }
      },
      radarData: {
        brandProfessionalism: { label: '品牌专业度', score: gate1Match ? parseInt(gate1Match[1]) : 78 },
        audienceInsight: { label: '受众洞察', score: gate2Match ? parseInt(gate2Match[1]) : 65 },
        strategicIntent: { label: '战略意图', score: gate3Match ? parseInt(gate3Match[1]) : 82 },
        cognitiveMap: { label: '认知地图', score: cognitiveMatch ? parseInt(cognitiveMatch[1]) : 70 },
        toolApplication: { label: '工具应用', score: 74 }
      },
      suggestions: extractSuggestions(report)
    }
  } catch (e) {
    return null
  }
}

/**
 * 从报告中提取建议
 */
function extractSuggestions(report) {
  const suggestions = []
  const lines = report.split('\n')

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.slice(2)
      if (content.length > 10) {
        const priority =
          content.includes('必须') || content.includes('重要')
            ? 'high'
            : content.includes('建议') || content.includes('可以')
            ? 'medium'
            : 'low'
        suggestions.push({
          type: 'improvement',
          content,
          priority
        })
      }
    }
  })

  // 如果没有提取到足够的建议，返回默认建议
  if (suggestions.length < 3) {
    return [
      {
        type: 'improvement',
        content: '建议在营销方案中增加对目标受众的细分分析，包括年龄、性别、收入水平等维度的详细描述。',
        priority: 'high'
      },
      {
        type: 'improvement',
        content: '品牌定位部分需要更加明确，建议加入品牌核心价值的具体阐述。',
        priority: 'high'
      },
      {
        type: 'improvement',
        content: '营销渠道策略可以更详细，建议补充各渠道的具体投放预算和预期效果。',
        priority: 'medium'
      }
    ]
  }

  return suggestions.slice(0, 8)
}
