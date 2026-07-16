import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  Clock,
  AlertTriangle,
  Sparkles
} from 'lucide-react'
import { useApp } from '../context/AppContext'

/**
 * 任务状态配置
 */
const STATUS_CONFIG = {
  pending: {
    icon: Circle,
    label: '等待中',
    color: 'text-medium-gray',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    progressColor: 'bg-gray-200'
  },
  in_progress: {
    icon: Loader2,
    label: '进行中',
    color: 'text-huawei-red',
    bgColor: 'bg-huawei-red-light',
    borderColor: 'border-huawei-red/20',
    progressColor: 'bg-huawei-red'
  },
  completed: {
    icon: CheckCircle2,
    label: '已完成',
    color: 'text-success-green',
    bgColor: 'bg-success-green-light',
    borderColor: 'border-success-green/20',
    progressColor: 'bg-success-green'
  },
  error: {
    icon: XCircle,
    label: '失败',
    color: 'text-error-red',
    bgColor: 'bg-error-red-light',
    borderColor: 'border-error-red/20',
    progressColor: 'bg-error-red'
  }
}

/**
 * 单个任务项组件
 */
function TaskItem({ task }) {
  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending
  const StatusIcon = status.icon
  const isInProgress = task.status === 'in_progress'

  return (
    <div
      className={`relative flex items-start gap-3 p-4 rounded-xl border ${status.borderColor} ${status.bgColor} transition-all duration-300`}
    >
      {/* Status Icon */}
      <div className="shrink-0 mt-0.5">
        <StatusIcon
          size={20}
          className={`${status.color} ${isInProgress ? 'animate-spin-slow' : ''}`}
        />
      </div>

      {/* Task Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-dark-gray">
            {task.name}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.color} border ${status.borderColor}`}
          >
            {status.label}
          </span>
        </div>

        {task.description && (
          <p className="text-xs text-medium-gray mt-1.5 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Progress Bar */}
        {task.progress !== undefined && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-medium-gray">进度</span>
              <span className={`text-xs font-medium ${status.color}`}>
                {task.progress}%
              </span>
            </div>
            <div className="w-full h-2 bg-white/80 rounded-full overflow-hidden border border-gray-100">
              <div
                className={`h-full ${status.progressColor} rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Subtasks */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {task.subtasks.map((sub, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                {sub.status === 'completed' ? (
                  <CheckCircle2 size={12} className="text-success-green shrink-0" />
                ) : sub.status === 'in_progress' ? (
                  <Loader2 size={12} className="text-huawei-red shrink-0 animate-spin-slow" />
                ) : sub.status === 'error' ? (
                  <XCircle size={12} className="text-error-red shrink-0" />
                ) : (
                  <Circle size={12} className="text-gray-300 shrink-0" />
                )}
                <span
                  className={`${
                    sub.status === 'completed'
                      ? 'text-medium-gray line-through'
                      : sub.status === 'in_progress'
                      ? 'text-dark-gray font-medium'
                      : 'text-medium-gray'
                  }`}
                >
                  {sub.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timestamp */}
      {task.timestamp && (
        <div className="shrink-0 text-xs text-medium-gray flex items-center gap-1">
          <Clock size={10} />
          {task.timestamp}
        </div>
      )}
    </div>
  )
}

/**
 * 任务进度看板
 */
export default function TaskBoard() {
  const { tasks, agentStatus } = useApp()

  const getOverallProgress = () => {
    if (!tasks || tasks.length === 0) return 0
    const completed = tasks.filter(
      (t) => t.status === 'completed'
    ).length
    return Math.round((completed / tasks.length) * 100)
  }

  const getStatusDisplay = () => {
    switch (agentStatus.status) {
      case 'running':
        return {
          icon: Loader2,
          text: 'AI 正在工作中',
          subtext: agentStatus.description || agentStatus.currentStep,
          color: 'text-huawei-red',
          bgColor: 'bg-huawei-red-light',
          animate: true
        }
      case 'completed':
        return {
          icon: CheckCircle2,
          text: '所有任务已完成',
          subtext: agentStatus.description || '可以查看生成的报告',
          color: 'text-success-green',
          bgColor: 'bg-success-green-light',
          animate: false
        }
      case 'error':
        return {
          icon: AlertTriangle,
          text: '执行出错',
          subtext: agentStatus.description || '请重试或联系支持',
          color: 'text-error-red',
          bgColor: 'bg-error-red-light',
          animate: false
        }
      default:
        return {
          icon: Sparkles,
          text: '准备就绪',
          subtext: '等待您的指令开始工作',
          color: 'text-medium-gray',
          bgColor: 'bg-gray-50',
          animate: false
        }
    }
  }

  const statusDisplay = getStatusDisplay()
  const StatusIcon = statusDisplay.icon
  const progress = getOverallProgress()

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-gray bg-white">
        <h2 className="text-lg font-bold text-dark-gray">任务进度看板</h2>
        <p className="text-sm text-medium-gray mt-1">
          实时追踪 AI Agent 的任务执行情况
        </p>
      </div>

      {/* Status Banner */}
      <div className={`mx-6 mt-4 p-4 rounded-xl ${statusDisplay.bgColor} border border-border-gray`}>
        <div className="flex items-center gap-3">
          <StatusIcon
            size={24}
            className={`${statusDisplay.color} ${statusDisplay.animate ? 'animate-spin-slow' : ''}`}
          />
          <div>
            <p className={`font-semibold text-sm ${statusDisplay.color}`}>
              {statusDisplay.text}
            </p>
            {statusDisplay.subtext && (
              <p className="text-xs text-medium-gray mt-0.5">
                {statusDisplay.subtext}
              </p>
            )}
          </div>
        </div>

        {/* Overall Progress */}
        {tasks.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-medium-gray">总体进度</span>
              <span className="text-sm font-bold text-dark-gray">
                {progress}%
              </span>
            </div>
            <div className="w-full h-3 bg-white/80 rounded-full overflow-hidden border border-gray-100">
              <div
                className="h-full bg-gradient-to-r from-huawei-red to-huawei-red/80 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-medium-gray">
              <span>
                总任务: <strong className="text-dark-gray">{tasks.length}</strong>
              </span>
              <span>
                已完成:{" "}
                <strong className="text-success-green">
                  {tasks.filter((t) => t.status === 'completed').length}
                </strong>
              </span>
              <span>
                进行中:{" "}
                <strong className="text-huawei-red">
                  {tasks.filter((t) => t.status === 'in_progress').length}
                </strong>
              </span>
              {tasks.filter((t) => t.status === 'error').length > 0 && (
                <span>
                  失败:{" "}
                  <strong className="text-error-red">
                    {tasks.filter((t) => t.status === 'error').length}
                  </strong>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles size={40} className="text-gray-200 mb-3" />
            <p className="text-medium-gray text-sm">暂无任务</p>
            <p className="text-medium-gray/60 text-xs mt-1">
              发送消息后将自动创建任务
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
