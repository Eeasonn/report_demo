import React, { useEffect, useState, useMemo } from 'react';
import { List, Card, Tag, Input, Empty, Spin, message, Select, Space, Button, Statistic, Row, Col } from 'antd';
import { SearchOutlined, FileTextOutlined, GlobalOutlined, EyeOutlined, FilterOutlined } from '@ant-design/icons';
import { useStore } from '../store';
import axios from 'axios';

const { Option } = Select;

const ReportLibrary: React.FC = () => {
  const { reportList, setReportList, setCurrentReport, setActiveTab } = useStore();
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [renderingId, setRenderingId] = useState<string | null>(null);

  // BI 筛选器状态
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async (q?: string) => {
    setLoading(true);
    try {
      const res = await axios.get('/api/reports', { params: { q } });
      setReportList(res.data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    fetchReports(value);
  };

  const handleViewReport = async (reportId: string) => {
    setRenderingId(reportId);
    try {
      const res = await axios.post(`/api/reports/${reportId}/render`, {
        reportId,
        dateRange: { start: '20260624', end: '20260630' }
      });
      setCurrentReport(res.data.content);
      setActiveTab('chat');
      message.success('战报已加载，请在对话中继续修改');
    } catch (err) {
      message.error('加载战报失败');
    } finally {
      setRenderingId(null);
    }
  };

  const handleSubscribe = async (reportId: string) => {
    try {
      await axios.post('/api/subscriptions', {
        reportId,
        schedule: 'daily',
        pushTime: '09:00',
      });
      message.success('订阅成功！');
    } catch (err) {
      message.error('订阅失败');
    }
  };

  // 筛选逻辑
  const filteredReports = useMemo(() => {
    return reportList.filter(item => {
      if (regionFilter !== 'all' && item.region !== regionFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      return true;
    });
  }, [reportList, regionFilter, categoryFilter, typeFilter]);

  // 统计数据
  const stats = useMemo(() => {
    return {
      total: filteredReports.length,
      daily: filteredReports.filter(r => r.type === 'daily').length,
      weekly: filteredReports.filter(r => r.type === 'weekly').length,
      regions: new Set(filteredReports.map(r => r.region)).size,
    };
  }, [filteredReports]);

  const getCategoryColor = (category: string) => {
    const map: Record<string, string> = { '手机': 'blue', '耳机': 'green', '穿戴': 'purple', '综合': 'orange' };
    return map[category] || 'default';
  };

  const getTypeTag = (type: string) => type === 'daily' ? '日销' : '周销';

  const allRegions = useMemo(() => [...new Set(reportList.map(r => r.region))], [reportList]);
  const allCategories = useMemo(() => [...new Set(reportList.map(r => r.category))], [reportList]);
  const regionNameMap: Record<string, string> = { 'MEA': '中东非洲', 'LATAM': '拉美', 'EU': '欧洲', 'APAC': '亚太', 'CN': '中国', 'GLOBAL': '全球' };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* 标题 + 搜索 */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 600 }}>战报库</h2>
        <Space style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <Input.Search
            placeholder="搜索战报名称、地区、品类..."
            allowClear
            enterButton={<><SearchOutlined /> 搜索</>}
            size="large"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 400 }}
          />
          <Button
            icon={<FilterOutlined />}
            size="large"
            onClick={() => setShowFilters(!showFilters)}
            type={showFilters ? 'primary' : 'default'}
          >
            筛选器
          </Button>
        </Space>
      </div>

      {/* BI 筛选器 */}
      {showFilters && (
        <Card style={{ marginBottom: 20, borderRadius: 12, background: '#f8fafc' }} bodyStyle={{ padding: 16 }}>
          <Row gutter={16} align="middle">
            <Col>
              <span style={{ fontWeight: 500, marginRight: 8 }}>地区:</span>
              <Select value={regionFilter} onChange={setRegionFilter} style={{ width: 140 }} allowClear placeholder="全部地区">
                <Option value="all">全部</Option>
                {allRegions.map(r => <Option key={r} value={r}>{regionNameMap[r] || r}</Option>)}
              </Select>
            </Col>
            <Col>
              <span style={{ fontWeight: 500, marginRight: 8 }}>品类:</span>
              <Select value={categoryFilter} onChange={setCategoryFilter} style={{ width: 120 }} allowClear placeholder="全部品类">
                <Option value="all">全部</Option>
                {allCategories.map(c => <Option key={c} value={c}>{c}</Option>)}
              </Select>
            </Col>
            <Col>
              <span style={{ fontWeight: 500, marginRight: 8 }}>周期:</span>
              <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 120 }} allowClear placeholder="全部周期">
                <Option value="all">全部</Option>
                <Option value="daily">日销</Option>
                <Option value="weekly">周销</Option>
              </Select>
            </Col>
            <Col>
              <Button onClick={() => { setRegionFilter('all'); setCategoryFilter('all'); setTypeFilter('all'); }}>
                重置
              </Button>
            </Col>
          </Row>
        </Card>
      )}

      {/* 统计面板 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card style={{ borderRadius: 10 }}>
            <Statistic title="战报总数" value={stats.total} suffix="张" />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 10 }}>
            <Statistic title="日销战报" value={stats.daily} suffix="张" />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 10 }}>
            <Statistic title="周销战报" value={stats.weekly} suffix="张" />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 10 }}>
            <Statistic title="覆盖地区" value={stats.regions} suffix="个" />
          </Card>
        </Col>
      </Row>

      {/* 战报列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : filteredReports.length === 0 ? (
        <Empty description="暂无战报" style={{ padding: 60 }} />
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 3, xl: 3 }}
          dataSource={filteredReports}
          renderItem={(item) => (
            <List.Item>
              <Card
                hoverable
                loading={renderingId === item.id}
                onClick={() => handleViewReport(item.id)}
                style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }}
                bodyStyle={{ padding: 16 }}
                actions={[
                  <span key="view" style={{ color: '#1677ff', fontSize: 13 }}><EyeOutlined /> 查看</span>,
                  <span key="sub" style={{ color: '#52c41a', fontSize: 13 }} onClick={(e) => { e.stopPropagation(); handleSubscribe(item.id); }}>订阅</span>,
                ]}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileTextOutlined style={{ fontSize: 18, color: '#1677ff' }} />
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{item.name}</span>
                  </div>
                  <Tag color={getCategoryColor(item.category)}>{item.category}</Tag>
                </div>
                <p style={{ color: '#666', fontSize: 12, margin: '0 0 10px', lineHeight: 1.5, minHeight: 36 }}>
                  {item.description}
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Tag icon={<GlobalOutlined />} color="processing">{item.regionName}</Tag>
                  <Tag>{getTypeTag(item.type)}</Tag>
                </div>
              </Card>
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default ReportLibrary;
