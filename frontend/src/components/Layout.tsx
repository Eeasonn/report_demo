import React, { useEffect } from 'react';
import { Layout as AntLayout, Menu, Badge, Typography, Button, Tooltip, Tag } from 'antd';
import {
  MessageOutlined,
  FileTextOutlined,
  BellOutlined,
  RobotFilled,
  PlusOutlined,
  MessageFilled,
  DeleteOutlined,
  BugOutlined,
} from '@ant-design/icons';
import { Conversations } from '@ant-design/x';
import { useStore } from '../store';
import ChatPanel from './ChatPanel';
import ReportLibrary from './ReportLibrary';
import ReportViewer from './ReportViewer';
import WorkbenchManager from './WorkbenchManager';
import TestPanel from './TestPanel';

const { Header, Sider, Content } = AntLayout;
const { Title } = Typography;

const AppLayout: React.FC = () => {
  const {
    activeTab, setActiveTab, messages,
    conversations, currentConversationId, createConversation,
    switchConversation, deleteConversation, showThoughtChain, setShowThoughtChain,
    ensureInitialConversation, loadFromStorage, currentReport,
  } = useStore();

  useEffect(() => {
    loadFromStorage();
    ensureInitialConversation();
  }, []);

  const menuItems = [
    { key: 'chat', icon: <MessageOutlined />, label: '智能对话' },
    { key: 'library', icon: <FileTextOutlined />, label: '战报库' },
    { key: 'subscriptions', icon: <BellOutlined />, label: '我的工作台' },
    { key: 'test', icon: <BugOutlined />, label: '测试' },
  ];

  const conversationItems = conversations.map(conv => ({
    key: conv.id,
    label: conv.title,
    icon: <MessageFilled />,
    group: '最近对话',
  }));

  const handleNewConversation = () => {
    createConversation();
    setActiveTab('chat');
  };

  return (
    <AntLayout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)' }}>
      {/* 左侧边栏 */}
      <Sider
        width={240}
        theme="light"
        style={{
          boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RobotFilled style={{ fontSize: 28, color: '#1677ff' }} />
            <div>
              <Title level={5} style={{ margin: 0, fontSize: 16 }}>智能战报</Title>
              <span style={{ fontSize: 12, color: '#999' }}>MiniMax-M3</span>
            </div>
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[activeTab]}
          onClick={({ key }) => setActiveTab(key as any)}
          items={menuItems}
          style={{ borderRight: 0, paddingTop: 8 }}
        />

        {activeTab === 'chat' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 8px', borderTop: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px 8px' }}>
              <span style={{ fontSize: 12, color: '#999', fontWeight: 500 }}>对话历史</span>
              <Tooltip title="新建对话">
                <Button type="text" size="small" icon={<PlusOutlined />} onClick={handleNewConversation} />
              </Tooltip>
            </div>
            {conversationItems.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>暂无历史对话</div>
            ) : (
              <Conversations
                items={conversationItems}
                activeKey={currentConversationId || undefined}
                onActiveChange={(key) => {
                  switchConversation(key as string);
                  setActiveTab('chat');
                }}
                menu={(conversation) => ({
                  items: [
                    { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true },
                  ],
                  onClick: ({ key }) => {
                    if (key === 'delete') {
                      deleteConversation(conversation.key as string);
                    }
                  },
                })}
              />
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0' }}>
            <Tag
              color={showThoughtChain ? 'blue' : 'default'}
              style={{ cursor: 'pointer' }}
              onClick={() => setShowThoughtChain(!showThoughtChain)}
            >
              {showThoughtChain ? '思考链路: 开' : '思考链路: 关'}
            </Tag>
          </div>
        )}
      </Sider>

      {/* 中间主内容区 */}
      <AntLayout style={{ flex: 1, minWidth: 0 }}>
        <Header
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 56,
          }}
        >
          <span style={{ color: '#666', fontSize: 14 }}>
            {activeTab === 'chat' && '与战报助手对话'}
            {activeTab === 'library' && '战报库'}
            {activeTab === 'subscriptions' && '我的工作台'}
            {activeTab === 'test' && '自动化测试'}
          </span>
          <Badge count={messages.filter(m => m.role === 'assistant' && !m.data).length} size="small">
            <span style={{ color: '#999', fontSize: 13 }}>v2.0 · MiniMax-M3</span>
          </Badge>
        </Header>

        <Content style={{ padding: 0, overflow: 'hidden', display: 'flex', height: 'calc(100vh - 56px)' }}>
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', height: 'calc(100vh - 56px)' }}>
            {activeTab === 'chat' && <ChatPanel />}
            {activeTab === 'library' && <ReportLibrary />}
            {activeTab === 'subscriptions' && <WorkbenchManager />}
            {activeTab === 'test' && <TestPanel />}
          </div>
          <div
            style={{
              width: currentReport ? 500 : 0,
              minWidth: currentReport ? 500 : 0,
              borderLeft: currentReport ? '1px solid #f0f0f0' : 'none',
              background: '#fafafa',
              overflow: 'auto',
              height: 'calc(100vh - 56px)',
              transition: 'width 0.3s ease, min-width 0.3s ease',
            }}
          >
            {currentReport && <ReportViewer />}
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default AppLayout;
