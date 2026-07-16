import React from 'react';
import { Button, Space, Tag, Tooltip, message, Empty } from 'antd';
import {
  CloseOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  BellOutlined,
  EditOutlined,
  ExportOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useStore } from '../store';
import ReportContent from './ReportContent';
import axios from 'axios';

const ReportViewer: React.FC = () => {
  const { currentReport, setCurrentReport, setActiveTab } = useStore();

  const handleEditViaChat = () => {
    setActiveTab('chat');
    message.success('已切换到对话模式，请在下方输入您的修改需求，右侧报告保持显示供对照');
  };

  const handleShare = () => {
    if (!currentReport) return;
    const text = currentReport.title + '\n\n' + JSON.stringify(currentReport.sections, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      message.success('战报内容已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败');
    });
  };

  const handleExport = () => {
    if (!currentReport) return;
    const dataStr = JSON.stringify(currentReport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentReport.reportId}_${currentReport.dateRange.start}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('战报已导出');
  };

  const handleSubscribe = async () => {
    if (!currentReport) return;
    try {
      await axios.post('/api/subscriptions', {
        reportId: currentReport.reportId,
        schedule: 'daily',
        pushTime: '09:00',
      });
      message.success('订阅成功！您可以在「我的订阅」中管理');
    } catch (err) {
      message.error('订阅失败，请重试');
    }
  };

  // 没有战报时显示占位提示
  if (!currentReport) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        color: '#999',
      }}>
        <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
        <div style={{ fontSize: 15, fontWeight: 500, color: '#666', marginBottom: 8 }}>
          选择战报后在右侧展示
        </div>
        <div style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
          在对话中查找战报或点击「查看完整战报」<br />即可在此处实时预览
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 头部标题栏 */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid #f0f0f0',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
          <span style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentReport.title}
          </span>
          <Tag color="blue">
            {currentReport.style === 'series' ? '系列分组' : currentReport.style === 'category' ? '品类分组' : '综合型'}
          </Tag>
        </div>
        <Space>
          <Tooltip title="订阅">
            <Button icon={<BellOutlined />} size="small" type="text" onClick={handleSubscribe} />
          </Tooltip>
          <Tooltip title="分享">
            <Button icon={<ShareAltOutlined />} size="small" type="text" onClick={handleShare} />
          </Tooltip>
          <Tooltip title="导出 JSON">
            <Button icon={<ExportOutlined />} size="small" type="text" onClick={handleExport} />
          </Tooltip>
          <Button icon={<CloseOutlined />} size="small" type="text" onClick={() => setCurrentReport(null)} />
        </Space>
      </div>

      {/* 战报内容 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: '#fafafa' }}>
        <ReportContent content={currentReport} />
      </div>

      {/* 底部操作栏 */}
      <div style={{
        padding: '12px 24px',
        borderTop: '1px dashed #d9d9d9',
        background: '#fff',
      }}>
        <Button type="primary" icon={<EditOutlined />} block onClick={handleEditViaChat}>
          通过对话修改
        </Button>
      </div>
    </div>
  );
};

export default ReportViewer;
