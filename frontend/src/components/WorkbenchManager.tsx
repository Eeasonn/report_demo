import React, { useEffect, useState } from 'react';
import { List, Card, Tag, Button, Switch, Empty, Spin, message, Popconfirm, Space, Tabs, Divider } from 'antd';
import { BellOutlined, DeleteOutlined, FileTextOutlined, ClockCircleOutlined, EyeOutlined, SettingOutlined, SaveOutlined, InboxOutlined } from '@ant-design/icons';
import { useStore } from '../store';
import axios from 'axios';

const WorkbenchManager: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [workbenchItems, setWorkbenchItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { setCurrentReport, setActiveTab, workbenchItems: storeWorkbenchItems } = useStore();

  useEffect(() => {
    fetchData();
  }, [storeWorkbenchItems]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取订阅列表
      const subRes = await axios.get('/api/subscriptions');
      setSubscriptions(subRes.data);
      // 获取工作台列表
      const wbRes = await axios.get('/api/workbench');
      setWorkbenchItems(wbRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      // 降级：使用本地存储的数据
      setWorkbenchItems(storeWorkbenchItems);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (subId: string) => {
    try {
      await axios.put(`/api/subscriptions/${subId}/toggle`);
      fetchData();
    } catch (err) {
      message.error('操作失败');
    }
  };

  const handleDeleteSub = async (subId: string) => {
    try {
      await axios.delete(`/api/subscriptions/${subId}`);
      message.success('已取消订阅');
      fetchData();
    } catch (err) {
      message.error('删除失败');
    }
  };

  const handleDeleteWorkbenchItem = async (itemId: string) => {
    try {
      await axios.delete(`/api/workbench/${itemId}`);
      message.success('已删除');
      fetchData();
    } catch (err) {
      // 降级：仅从本地状态删除
      useStore.getState().removeWorkbenchItem(itemId);
      setWorkbenchItems(prev => prev.filter(item => item.id !== itemId));
      message.success('已删除');
    }
  };

  const handlePreview = async (reportId: string, dateRange?: any, focusModels?: any) => {
    try {
      const res = await axios.post(`/api/reports/${reportId}/render`, {
        reportId,
        dateRange,
        focusModels,
      });
      if (res.data?.content) {
        setCurrentReport(res.data.content);
        setActiveTab('chat');
        message.success('已加载战报预览');
      } else {
        message.error('预览内容为空');
      }
    } catch (err) {
      console.error('Preview error:', err);
      message.error('预览加载失败');
    }
  };

  const getScheduleText = (schedule: string) => {
    return schedule === 'daily' ? '每日推送' : '每周推送';
  };

  const isCustomSub = (sub: any) => {
    return !!(sub.customDateRange || (sub.focusModels && sub.focusModels.length > 0));
  };

  const getCustomSummary = (sub: any) => {
    const parts: string[] = [];
    if (sub.customDateRange) {
      const { start, end } = sub.customDateRange;
      parts.push(`时间: ${start} ~ ${end}`);
    }
    if (sub.focusModels && sub.focusModels.length > 0) {
      parts.push(`机型: ${sub.focusModels.join(', ')}`);
    }
    return parts.join(' · ');
  };

  const tabItems = [
    {
      key: 'saved',
      label: (
        <span>
          <SaveOutlined style={{ marginRight: 4 }} />
          已保存的战报
          {workbenchItems.length > 0 && <Tag color="blue" style={{ marginLeft: 4 }}>{workbenchItems.length}</Tag>}
        </span>
      ),
      children: (
        <div>
          {workbenchItems.length === 0 ? (
            <Empty
              description={
                <div>
                  <p>暂无保存的战报</p>
                  <p style={{ fontSize: 13, color: '#999' }}>在对话中查看战报后，点击「保存到工作台」即可</p>
                </div>
              }
              style={{ padding: 60 }}
            >
              <Button type="primary" onClick={() => setActiveTab('chat')}>
                去保存战报
              </Button>
            </Empty>
          ) : (
            <List
              dataSource={workbenchItems}
              renderItem={(item) => (
                <List.Item>
                  <Card
                    style={{ width: '100%', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                    bodyStyle={{ padding: 16 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
                        <SaveOutlined style={{ fontSize: 20, color: '#1677ff', marginTop: 2 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, fontSize: 15 }}>{item.reportName}</span>
                            <Tag color="green">已保存</Tag>
                          </div>
                          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                            <ClockCircleOutlined style={{ marginRight: 4 }} />
                            保存于 {new Date(item.createdAt).toLocaleString()}
                          </div>
                          {item.dateRange && (
                            <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
                              <SettingOutlined style={{ marginRight: 4 }} />
                              时间范围: {item.dateRange.start} ~ {item.dateRange.end}
                            </div>
                          )}
                        </div>
                      </div>
                      <Space>
                        <Button
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => handlePreview(item.reportId, item.dateRange, item.focusModels)}
                        >
                          预览
                        </Button>
                        <Popconfirm
                          title="确认删除？"
                          onConfirm={() => handleDeleteWorkbenchItem(item.id)}
                          okText="确认"
                          cancelText="取消"
                        >
                          <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          )}
        </div>
      ),
    },
    {
      key: 'subscriptions',
      label: (
        <span>
          <BellOutlined style={{ marginRight: 4 }} />
          我的订阅
          {subscriptions.length > 0 && <Tag color="blue" style={{ marginLeft: 4 }}>{subscriptions.length}</Tag>}
        </span>
      ),
      children: (
        <div>
          {subscriptions.length === 0 ? (
            <Empty
              description={
                <div>
                  <p>暂无订阅</p>
                  <p style={{ fontSize: 13, color: '#999' }}>保存战报到工作台后，可以选择订阅自动推送</p>
                </div>
              }
              style={{ padding: 60 }}
            >
              <Button type="primary" onClick={() => setActiveTab('chat')}>
                去订阅战报
              </Button>
            </Empty>
          ) : (
            <List
              dataSource={subscriptions}
              renderItem={(sub) => {
                const custom = isCustomSub(sub);
                return (
                  <List.Item>
                    <Card
                      style={{ width: '100%', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                      bodyStyle={{ padding: 16 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
                          <FileTextOutlined style={{ fontSize: 20, color: '#1677ff', marginTop: 2 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: 15 }}>{sub.reportName}</span>
                              <Tag color={custom ? 'purple' : 'blue'}>
                                {custom ? '自定义' : '公共'}
                              </Tag>
                            </div>
                            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                              <ClockCircleOutlined style={{ marginRight: 4 }} />
                              {getScheduleText(sub.schedule)} · {sub.pushTime}
                            </div>
                            {custom && (
                              <div style={{ fontSize: 12, color: '#722ed1', marginTop: 6, padding: '4px 8px', background: '#f9f0ff', borderRadius: 4, display: 'inline-block' }}>
                                <SettingOutlined style={{ marginRight: 4 }} />
                                {getCustomSummary(sub)}
                              </div>
                            )}
                          </div>
                        </div>
                        <Space>
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handlePreview(sub.reportId, sub.customDateRange, sub.focusModels)}
                          >
                            预览
                          </Button>
                          <Switch
                            checked={sub.enabled}
                            onChange={() => handleToggle(sub.id)}
                            checkedChildren="开"
                            unCheckedChildren="关"
                          />
                          <Popconfirm
                            title="确认取消订阅？"
                            onConfirm={() => handleDeleteSub(sub.id)}
                            okText="确认"
                            cancelText="取消"
                          >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      </div>
                    </Card>
                  </List.Item>
                );
              }}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600 }}>
          <InboxOutlined style={{ marginRight: 8, color: '#1677ff' }} />
          我的工作台
        </h2>
        <p style={{ color: '#666', fontSize: 13 }}>管理您保存的战报配置和订阅推送</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Tabs items={tabItems} defaultActiveKey="saved" />
      )}
    </div>
  );
};

export default WorkbenchManager;
