import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  MenuFoldOutlined,
  MenuUnfoldOutlined,
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

const MIN_REPORT_WIDTH = 320;
const MAX_REPORT_WIDTH = 900;
const DEFAULT_REPORT_WIDTH = 500;

const AppLayout: React.FC = () => {
  const {
    activeTab, setActiveTab, messages,
    conversations, currentConversationId, createConversation,
    switchConversation, deleteConversation, showThoughtChain, setShowThoughtChain,
    ensureInitialConversation, loadFromStorage, currentReport,
  } = useStore();

  const [collapsed, setCollapsed] = useState(false);
  const [reportWidth, setReportWidth] = useState(DEFAULT_REPORT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_REPORT_WIDTH);

  useEffect(() => {
    loadFromStorage();
    ensureInitialConversation();
  }, []);

  const beginDrag = useCallback((clientX: number) => {
    if (!currentReport) return;
    isDragging.current = true;
    setIsResizing(true);
    startX.current = clientX;
    startWidth.current = reportWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [currentReport, reportWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    beginDrag(e.clientX);
  }, [beginDrag]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!currentReport) return;
    e.preventDefault();
    beginDrag(e.touches[0].clientX);
  }, [currentReport, beginDrag]);

  const onDragMove = useCallback((clientX: number) => {
    if (!isDragging.current) return;
    const delta = startX.current - clientX;
    const newWidth = Math.min(
      MAX_REPORT_WIDTH,
      Math.max(MIN_REPORT_WIDTH, startWidth.current + delta)
    );
    setReportWidth(newWidth);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    onDragMove(e.clientX);
  }, [onDragMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    onDragMove(e.touches[0].clientX);
  }, [onDragMove]);

  const endDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const handleMouseUp = useCallback(() => {
    endDrag();
  }, [endDrag]);

  const handleTouchEnd = useCallback(() => {
    endDrag();
  }, [endDrag]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

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
        collapsedWidth={72}
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        trigger={null}
        theme="light"
        style={{
          boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: collapsed ? '16px 0' : '20px 16px', borderBottom: '1px solid #f0f0f0', textAlign: collapsed ? 'center' : 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <RobotFilled style={{ fontSize: 28, color: '#1677ff', flexShrink: 0 }} />
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <Title level={5} style={{ margin: 0, fontSize: 16 }}>智能战报</Title>
                <span style={{ fontSize: 12, color: '#999' }}>MiniMax-M3</span>
              </div>
            )}
          </div>
        </div>

        <Menu
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={[activeTab]}
          onClick={({ key }) => setActiveTab(key as any)}
          items={menuItems}
          style={{ borderRight: 0, paddingTop: 8 }}
        />

        {!collapsed && activeTab === 'chat' && (
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

        {collapsed && activeTab === 'chat' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 4px', borderTop: '1px solid #f0f0f0' }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <Tooltip title="新建对话">
                <Button type="text" size="small" icon={<PlusOutlined />} onClick={handleNewConversation} />
              </Tooltip>
            </div>
            {conversationItems.length === 0 ? (
              <div style={{ padding: 10, textAlign: 'center', color: '#999', fontSize: 12 }}>无</div>
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
          <div style={{ padding: collapsed ? '8px 0' : '8px 16px', borderTop: '1px solid #f0f0f0', textAlign: collapsed ? 'center' : 'left' }}>
            <Tag
              color={showThoughtChain ? 'blue' : 'default'}
              style={{ cursor: 'pointer' }}
              onClick={() => setShowThoughtChain(!showThoughtChain)}
            >
              {collapsed ? '思' : (showThoughtChain ? '思考链路: 开' : '思考链路: 关')}
            </Tag>
          </div>
        )}

        {/* 收起/展开按钮 */}
        <div
          style={{
            padding: '12px 0',
            borderTop: '1px solid #f0f0f0',
            textAlign: 'center',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
        </div>
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

          {/* 可拖动分隔条 */}
          {currentReport && (
            <div
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              className="resize-handle"
              style={{
                width: 16,
                cursor: 'col-resize',
                background: 'transparent',
                position: 'relative',
                zIndex: 20,
                flexShrink: 0,
                touchAction: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 2,
                  background: isResizing ? '#1677ff' : '#e0e0e0',
                  transition: 'background 0.2s',
                }}
                className="resize-handle-line"
              />
            </div>
          )}

          <div
            style={{
              width: currentReport ? reportWidth : 0,
              minWidth: currentReport ? reportWidth : 0,
              borderLeft: currentReport ? '1px solid #f0f0f0' : 'none',
              background: '#fafafa',
              overflow: 'auto',
              height: 'calc(100vh - 56px)',
              transition: isResizing ? 'none' : 'width 0.3s ease, min-width 0.3s ease',
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
