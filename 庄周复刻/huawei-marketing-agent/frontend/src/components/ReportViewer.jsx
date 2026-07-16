import { useState } from 'react'
import {
  FileText,
  BarChart3,
  ClipboardList,
  Download,
  Printer,
  ChevronLeft
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { renderMarkdown } from '../utils/markdown'
import { exportMarkdown, exportPDF, generateFilename } from '../utils/export'

/**
 * 标签页配置
 */
const TABS = [
  {
    id: 'competitorAnalysis',
    label: '竞品分析',
    icon: BarChart3,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    emptyText: '暂无竞品分析报告',
    emptySubtext: 'AI 将自动分析主要竞争对手的产品特点、市场定位和营销策略'
  },
  {
    id: 'marketingPlan',
    label: '营销方案',
    icon: FileText,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    emptyText: '暂无营销方案',
    emptySubtext: 'AI 将基于竞品分析生成针对性的营销策略和方案'
  },
  {
    id: 'auditReport',
    label: '审计报告',
    icon: ClipboardList,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    emptyText: '暂无审计报告',
    emptySubtext: '启用 Marketing 7.0 审计后，将生成详细的合规性评估报告'
  }
]

/**
 * 报告浏览器
 */
export default function ReportViewer({ onBack }) {
  const { reports, currentProductName } = useApp()
  const [activeTab, setActiveTab] = useState('competitorAnalysis')

  const currentTab = TABS.find((t) => t.id === activeTab)
  const currentReport = reports[activeTab]
  const TabIcon = currentTab?.icon || FileText

  // 导出 Markdown
  const handleExportMarkdown = () => {
    if (!currentReport) return
    const titleMap = {
      competitorAnalysis: `竞品分析报告 - ${currentProductName || '华为产品'}`,
      marketingPlan: `营销方案 - ${currentProductName || '华为产品'}`,
      auditReport: `Marketing 7.0 审计报告 - ${currentProductName || '华为产品'}`
    }
    const content = `# ${titleMap[activeTab]}\n\n---\n\n${currentReport}`
    const filename = generateFilename(
      activeTab === 'competitorAnalysis'
        ? 'competitor_analysis'
        : activeTab === 'marketingPlan'
        ? 'marketing_plan'
        : 'audit_report',
      'md'
    )
    exportMarkdown(content, filename)
  }

  // 导出 PDF
  const handleExportPDF = () => {
    exportPDF('report-content', currentTab?.label || '报告')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-gray bg-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-light-gray text-medium-gray hover:text-dark-gray transition-colors"
              title="返回"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="text-lg font-bold text-dark-gray">报告浏览</h2>
            <p className="text-sm text-medium-gray mt-0.5">
              {currentProductName
                ? `查看 ${currentProductName} 的生成报告`
                : '查看生成的报告'}
            </p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportMarkdown}
            disabled={!currentReport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-gray text-sm font-medium text-dark-gray hover:bg-light-gray disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={16} />
            <span>导出 Markdown</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!currentReport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-huawei-red text-white text-sm font-medium hover:bg-huawei-red-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Printer size={16} />
            <span>导出 PDF</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 pt-4 bg-white">
        <div className="flex gap-2 border-b border-border-gray">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const hasContent = !!reports[tab.id]
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
                  isActive
                    ? `${tab.color} border-current ${tab.bgColor} rounded-t-lg`
                    : 'text-medium-gray border-transparent hover:text-dark-gray hover:bg-light-gray rounded-t-lg'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {hasContent && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-current' : 'bg-success-green'
                    }`}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Report Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div
          id="report-content"
          className="max-w-4xl mx-auto bg-white rounded-xl border border-border-gray p-8 shadow-sm"
        >
          {/* Report Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-huawei-red">
            <div className={`w-10 h-10 rounded-xl ${currentTab?.bgColor} flex items-center justify-center`}>
              <TabIcon size={22} className={currentTab?.color} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-dark-gray">
                {currentTab?.label}报告
              </h3>
              {currentProductName && (
                <p className="text-sm text-medium-gray">
                  产品：{currentProductName}
                </p>
              )}
            </div>
          </div>

          {/* Report Body */}
          {currentReport ? (
            <div
              className="markdown-content"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(currentReport)
              }}
            />
          ) : (
            <div className="text-center py-16">
              <TabIcon
                size={48}
                className={`mx-auto mb-4 ${
                  currentTab?.color || 'text-gray-200'
                } opacity-30`}
              />
              <p className="text-medium-gray font-medium">
                {currentTab?.emptyText}
              </p>
              <p className="text-medium-gray/60 text-sm mt-2 max-w-md mx-auto">
                {currentTab?.emptySubtext}
              </p>
            </div>
          )}
        </div>

        {/* Footer Spacing */}
        <div className="h-8" />
      </div>
    </div>
  )
}
