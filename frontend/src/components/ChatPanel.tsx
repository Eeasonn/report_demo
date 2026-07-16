import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bubble, Sender, Prompts, Welcome, ThoughtChain } from '@ant-design/x';
import { Button, Space, Spin, Card, Tag, message } from 'antd';
import {
  RobotFilled,
  UserOutlined,
  SearchOutlined,
  CalendarOutlined,
  MobileOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
  TagOutlined,
  ClockCircleOutlined,
  BellOutlined,
  SaveOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useStore } from '../store';
import axios from 'axios';

const ChatPanel: React.FC = () => {
  const {
    messages, addMessage, sessionId, setSessionId, isLoading, setLoading,
    setCurrentReport, currentThoughtChain, showThoughtChain, setThoughtChain,
    updateConversationTitle, currentConversationId, userPermissions,
    addWorkbenchItem, currentReport,
  } = useStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showPrompts, setShowPrompts] = useState(true);
  const inputRef = useRef(input);
  const sessionIdRef = useRef(sessionId);
  const loadingRef = useRef(isLoading);

  // 需求7: 从后端获取用户权限
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await axios.get('/api/user/permissions');
        if (res.data?.permissions) {
          useStore.getState().setUserPermissions(res.data.permissions);
        }
      } catch (err) {
        console.error('Failed to fetch permissions:', err);
      }
    };
    fetchPermissions();
  }, []);

  useEffect(() => { inputRef.current = input; }, [input]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { loadingRef.current = isLoading; }, [isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentThoughtChain, isLoading]);

  // 核心发送逻辑
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loadingRef.current) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: text.trim(),
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setInput('');
    setShowPrompts(false);
    setLoading(true);
    setThoughtChain([{ step: '理解意图', status: 'loading' }]);

    try {
      const res = await axios.post('/api/chat', {
        message: userMsg.content,
        sessionId: sessionIdRef.current,
        context: { userPermissions: userPermissions },
      });

      const data = res.data;
      if (data.sessionId) setSessionId(data.sessionId);
      if (data.thoughtChain) setThoughtChain(data.thoughtChain);

      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: data.reply,
        action: data.action,
        data: data.data,
        timestamp: Date.now(),
        thoughtChain: data.thoughtChain,
      };
      addMessage(assistantMsg);

      // 需求2: 展示战报后，自动更新对话标题
      if (data.action === 'show_report' && data.data?.content?.title && currentConversationId) {
        const title = data.data.content.title.replace(/\s*\(\d{1,2}月\d{1,2}日.*?\)$/, '');
        updateConversationTitle(currentConversationId, title);
      }

      if (data.data?.content) {
        setCurrentReport(data.data.content);
      }
    } catch (err) {
      addMessage({
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '抱歉，服务暂时不可用，请稍后重试。',
        timestamp: Date.now(),
      });
      setThoughtChain([{ step: '服务错误', status: 'error' }]);
    } finally {
      setLoading(false);
    }
  }, [addMessage, setSessionId, setLoading, setThoughtChain, setCurrentReport, updateConversationTitle, currentConversationId]);

  const handleSubmit = useCallback(() => {
    sendMessage(inputRef.current);
  }, [sendMessage]);

  // 修改：快捷操作改为填入输入框，而不是直接发送
  const handleQuickAction = useCallback((text: string) => {
    setInput(text);
  }, []);

  // 直接发送（用于选择战报卡片等需要立即生效的场景）
  const handleSendAction = useCallback((text: string) => {
    sendMessage(text);
  }, [sendMessage]);

  // 保存到工作台
  const handleSaveToWorkbench = useCallback(async () => {
    const report = currentReport;
    if (!report) {
      message.warning('当前没有可保存的战报');
      return;
    }

    try {
      // 调用后端保存API
      const res = await axios.post('/api/workbench', {
        reportId: report.reportId,
        reportName: report.title,
        dateRange: report.dateRange,
        focusModels: null, // 可从当前session context获取，简化处理
      });

      if (res.data?.id) {
        addWorkbenchItem(res.data);
        message.success('已保存到工作台 ✅');

        // 添加助手消息询问是否订阅
        const subscribeMsg = {
          id: `assistant-${Date.now()}`,
          role: 'assistant' as const,
          content: '战报已保存到您的工作台 ✅\n\n是否需要订阅推送？订阅后系统会按您设定的时间自动推送最新战报数据。',
          timestamp: Date.now(),
          action: 'ask_subscribe',
          data: { savedItem: res.data },
        };
        addMessage(subscribeMsg);
      }
    } catch (err) {
      console.error('Save to workbench failed:', err);
      // 降级：仅保存到前端状态
      const item = {
        id: `wb_${Date.now()}`,
        reportId: report.reportId,
        reportName: report.title,
        dateRange: report.dateRange,
        focusModels: null,
        createdAt: new Date().toISOString(),
      };
      addWorkbenchItem(item);
      message.success('已保存到工作台（本地）✅');

      const subscribeMsg = {
        id: `assistant-${Date.now() + 1}`,
        role: 'assistant' as const,
        content: '战报已保存到您的工作台 ✅\n\n是否需要订阅推送？订阅后系统会按您设定的时间自动推送最新战报数据。',
        timestamp: Date.now(),
        action: 'ask_subscribe',
        data: { savedItem: item },
      };
      addMessage(subscribeMsg);
    }
  }, [currentReport, addWorkbenchItem, addMessage]);

  // 处理订阅确认
  const handleSubscribeConfirm = useCallback(async (workbenchItem: any) => {
    try {
      const res = await axios.post('/api/subscriptions', {
        reportId: workbenchItem.reportId,
        schedule: 'daily',
        pushTime: '09:00',
        focusModels: workbenchItem.focusModels,
        customDateRange: workbenchItem.dateRange,
      });
      if (res.data?.id) {
        message.success('订阅成功 🔔');
        const confirmMsg = {
          id: `assistant-${Date.now()}`,
          role: 'assistant' as const,
          content: `已为您订阅「${workbenchItem.reportName}」的每日推送 🔔\n\n推送时间：每日 09:00\n您可以在「我的工作台」中管理订阅。`,
          timestamp: Date.now(),
        };
        addMessage(confirmMsg);
      }
    } catch (err) {
      message.error('订阅失败，请稍后重试');
    }
  }, [addMessage]);

  // 需求7: 构建权限提示文本
  const getPermissionText = () => {
    if (userPermissions.includes('GLOBAL')) return '';
    const regionMap: Record<string, string> = {
      MEA: '中东非洲',
      LATAM: '拉美',
      EU: '欧洲',
      APAC: '亚太',
      CN: '中国',
      GLOBAL: '全球',
    };
    const names = userPermissions
      .filter(p => p !== 'GLOBAL')
      .map(p => regionMap[p] || p);
    return names.length > 0 ? `（您当前拥有 ${names.join('、')} 地区的战报访问权限）` : '';
  };

  const renderContent = (content: string, action?: string, data?: any) => {
    return (
      <div>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{content}</div>
        {/* 需求5: 展示战报后提示可修改内容 */}
        {action === 'show_report' && data?.content && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#666' }}>您可修改：</span>
            <Tag color="orange" icon={<CalendarOutlined />}>时间范围</Tag>
            <Tag color="purple" icon={<MobileOutlined />}>重点机型</Tag>
          </div>
        )}
        {/* 需求4: 卡片气泡预览 */}
        {action === 'choose_report' && data?.options && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {data.options.map((opt: any) => (
                <Card
                  key={opt.id}
                  hoverable
                  size="small"
                  style={{ width: 220, borderRadius: 10, cursor: 'pointer' }}
                  bodyStyle={{ padding: 12 }}
                  onClick={() => handleSendAction(opt.name)}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: '#1677ff' }}>
                    <FileTextOutlined style={{ marginRight: 6 }} />
                    {opt.name}
                  </div>
                  {opt.regionName && (
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                      <EnvironmentOutlined style={{ marginRight: 4 }} />
                      {opt.regionName}
                    </div>
                  )}
                  {opt.category && (
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                      <TagOutlined style={{ marginRight: 4 }} />
                      {opt.category}
                    </div>
                  )}
                  {opt.type && (
                    <div style={{ fontSize: 12, color: '#666' }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {opt.type === 'daily' ? '日报' : opt.type === 'weekly' ? '周报' : opt.type}
                    </div>
                  )}
                </Card>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>点击卡片即可查看该战报</div>
          </div>
        )}
        {/* 保留原来的 choose_report 按钮回退（如果后端没有返回完整选项数据） */}
        {action === 'choose_report' && data?.options && data.options.length > 0 && !data.options[0]?.regionName && (
          <Space wrap style={{ marginTop: 12 }}>
            {data.options.map((opt: any) => (
              <Button key={opt.id} size="small" onClick={() => handleSendAction(opt.name)}>
                {opt.name}
              </Button>
            ))}
          </Space>
        )}
        {/* 您接下来可以：展示战报后的快捷操作提示 */}
        {action === 'show_report' && data?.content && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: '#f0f5ff', borderRadius: 8, border: '1px solid #d6e4ff' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1677ff', marginBottom: 8 }}>
              <SearchOutlined style={{ marginRight: 4 }} />
              您接下来可以：
            </div>
            <Space wrap>
              <Button size="small" icon={<CalendarOutlined />} onClick={() => handleQuickAction('时间改成 7.11-7.19')}>
                修改时间范围
              </Button>
              <Button size="small" icon={<MobileOutlined />} onClick={() => handleQuickAction('重点机型换成 Mate XT')}>
                调整重点机型
              </Button>
              <Button size="small" icon={<SaveOutlined />} type="primary" onClick={handleSaveToWorkbench}>
                保存到工作台
              </Button>
            </Space>
          </div>
        )}
        {/* 询问是否订阅的交互区域 */}
        {action === 'ask_subscribe' && data?.savedItem && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#52c41a', marginBottom: 8 }}>
              <BellOutlined style={{ marginRight: 4 }} />
              订阅推送
            </div>
            <Space wrap>
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleSubscribeConfirm(data.savedItem)}
              >
                确认订阅
              </Button>
              <Button size="small" onClick={() => handleQuickAction('不需要订阅')}>
                暂不订阅
              </Button>
            </Space>
          </div>
        )}
      </div>
    );
  };

  const promptItems = [
    { key: '1', icon: <SearchOutlined style={{ color: '#1677ff' }} />, description: '帮我找一下墨西哥的战报' },
    { key: '2', icon: <CalendarOutlined style={{ color: '#52c41a' }} />, description: '时间改成 7.11-7.19' },
    { key: '3', icon: <MobileOutlined style={{ color: '#722ed1' }} />, description: '重点机型换成 Mate XT' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      {/* 消息区域 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {messages.length === 0 && (
          <Welcome
            icon={<RobotFilled style={{ fontSize: 48, color: '#1677ff' }} />}
            title="战报智能助手"
            description={
              <span>
                基于 MiniMax-M3 的智能战报查询与分析系统
                {getPermissionText() && (
                  <div style={{ fontSize: 13, color: '#999', marginTop: 8 }}>
                    {getPermissionText()}
                  </div>
                )}
              </span>
            }
          />
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: 16 }} className="fade-in">
            {/* ThoughtChain */}
            {msg.role === 'assistant' && msg.thoughtChain && msg.thoughtChain.length > 0 && showThoughtChain && (
              <div style={{ marginLeft: 44, marginBottom: 8, maxWidth: 500 }}>
                <ThoughtChain
                  items={msg.thoughtChain.map((step: any) => ({
                    title: step.step,
                    description: step.detail || '',
                    status: step.status === 'loading' ? 'pending' : step.status === 'error' ? 'error' : 'success',
                  }))}
                  collapsible
                />
              </div>
            )}

            <Bubble
              content={renderContent(msg.content, msg.action, msg.data)}
              avatar={
                msg.role === 'assistant' ? (
                  <RobotFilled style={{ fontSize: 28, color: '#1677ff' }} />
                ) : (
                  <UserOutlined style={{ fontSize: 28, color: '#52c41a' }} />
                )
              }
              placement={msg.role === 'user' ? 'end' : 'start'}
              styles={{
                content: {
                  background: msg.role === 'user' ? '#e6f4ff' : '#fff',
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  padding: '12px 16px',
                  maxWidth: 600,
                },
              }}
            />
          </div>
        ))}

        {/* 实时思考链路 */}
        {isLoading && currentThoughtChain.length > 0 && (
          <div style={{ marginBottom: 16, marginLeft: 44, maxWidth: 500 }} className="fade-in">
            <ThoughtChain
              items={currentThoughtChain.map((step: any) => ({
                title: step.step,
                description: step.detail || '',
                status: step.status === 'loading' ? 'pending' : step.status === 'error' ? 'error' : 'success',
              }))}
              collapsible
            />
          </div>
        )}

        {isLoading && (
          <div style={{ marginBottom: 16 }} className="fade-in">
            <Bubble
              content={
                <Space>
                  <Spin size="small" />
                  <span style={{ color: '#999' }}>AI 正在思考...</span>
                </Space>
              }
              avatar={<RobotFilled style={{ fontSize: 28, color: '#1677ff' }} />}
              placement="start"
              styles={{
                content: {
                  background: '#fff',
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  padding: '12px 16px',
                },
              }}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 快捷提示 - 空对话或消息少于3条时显示 */}
      {(messages.length === 0 || (messages.length > 0 && messages.length < 3 && showPrompts)) && (
        <div style={{ padding: '0 24px 8px' }}>
          <Prompts
            title="您可以试试："
            items={promptItems}
            onItemClick={(info: any) => handleQuickAction(info.data?.description)}
          />
        </div>
      )}

      {/* 输入区域 */}
      <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #f0f0f0' }}>
        <Sender
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="输入您的需求，例如：帮我找一下中东非洲的战报"
          loading={isLoading}
          allowSpeech
          style={{
            borderRadius: 24,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}
        />
      </div>
    </div>
  );
};

export default ChatPanel;
