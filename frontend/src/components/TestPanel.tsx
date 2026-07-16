import React, { useState, useCallback, useRef } from 'react';
import { Button, Card, Space, Tag, Timeline, Alert, Typography, Divider } from 'antd';
import { PlayCircleOutlined, BugOutlined, FileTextOutlined, DownloadOutlined, ClearOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text, Title } = Typography;

interface TestStep {
  user_input: string;
  expected_action?: string;
  expected_keywords?: string[];
  description: string;
}

interface TestRecord {
  step: number;
  timestamp: string;
  request: { message: string };
  response: { reply: string; action?: string; thoughtChain: any[] };
  verification: { passed: boolean; reason: string };
  elapsed_ms: number;
}

// 预定义测试场景（与后端脚本保持一致）
const TEST_SCENARIOS: Record<string, { name: string; description: string; steps: TestStep[] }> = {
  mexico: {
    name: '墨西哥战报完整对话流',
    description: '模拟用户查找墨西哥战报、选择、修改参数、保存的完整流程',
    steps: [
      { user_input: '帮我找一下墨西哥的战报', expected_action: 'choose_report', expected_keywords: ['拉美手机日销', '拉美综合日销'], description: '查找墨西哥相关战报' },
      { user_input: '拉美手机日销', expected_action: 'show_report', expected_keywords: ['已为您展示', '拉美手机日销'], description: '选择拉美手机日销战报' },
      { user_input: '时间改成 7.11-7.19', expected_action: 'show_report', expected_keywords: ['07月11日-07月19日'], description: '修改时间范围' },
      { user_input: '重点机型换成 Mate XT', expected_action: 'show_report', expected_keywords: ['Mate XT'], description: '修改重点机型' },
    ],
  },
  fallback: {
    name: 'Fallback 欢迎语',
    description: '测试 Fallback 规则引擎的欢迎响应',
    steps: [
      { user_input: '你好', expected_keywords: ['您好', '战报智能助手'], description: '欢迎语' },
      { user_input: '帮我找一下欧洲的战报', expected_action: 'show_report', expected_keywords: ['欧洲'], description: '直接查找欧洲战报' },
    ],
  },
};

const TestPanel: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [records, setRecords] = useState<TestRecord[]>([]);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const abortRef = useRef(false);

  const runScenario = useCallback(async (scenarioKey: string) => {
    const scenario = TEST_SCENARIOS[scenarioKey];
    if (!scenario) return;

    setRunning(true);
    setRecords([]);
    setCurrentScenario(scenarioKey);
    sessionIdRef.current = null;
    abortRef.current = false;

    const newRecords: TestRecord[] = [];

    for (let i = 0; i < scenario.steps.length; i++) {
      if (abortRef.current) break;

      const step = scenario.steps[i];
      const start = performance.now();

      try {
        const res: any = await axios.post('/api/chat', {
          message: step.user_input,
          sessionId: sessionIdRef.current,
          context: { userPermissions: ['GLOBAL'] },
        });
        const data: any = res.data;
        if (data.sessionId) sessionIdRef.current = data.sessionId;

        const elapsed = performance.now() - start;

        // 验证
        let passed = true;
        let reason = '';
        const reply = data.reply || '';

        if (step.expected_action && data.action !== step.expected_action) {
          passed = false;
          reason = `Action 不匹配: 期望 ${step.expected_action}, 实际 ${data.action}`;
        }
        if (step.expected_keywords) {
          const missing = step.expected_keywords.filter((kw: string) => !reply.includes(kw));
          if (missing.length > 0) {
            passed = false;
            reason = `缺少关键词: ${missing.join(', ')}`;
          }
        }

        const record: TestRecord = {
          step: i + 1,
          timestamp: new Date().toISOString(),
          request: { message: step.user_input },
          response: {
            reply: data.reply || '',
            action: data.action,
            thoughtChain: data.thoughtChain || [],
          },
          verification: { passed, reason },
          elapsed_ms: Math.round(elapsed),
        };
        newRecords.push(record);
        setRecords([...newRecords]);

        // 小延迟，让 UI 有时间渲染
        await new Promise(r => setTimeout(r, 200));
      } catch (err: any) {
        const record: TestRecord = {
          step: i + 1,
          timestamp: new Date().toISOString(),
          request: { message: step.user_input },
          response: { reply: `错误: ${err.message}`, thoughtChain: [] },
          verification: { passed: false, reason: err.message },
          elapsed_ms: 0,
        };
        newRecords.push(record);
        setRecords([...newRecords]);
      }
    }

    setRunning(false);
  }, []);

  const stopTest = useCallback(() => {
    abortRef.current = true;
    setRunning(false);
  }, []);

  const downloadLogs = useCallback(() => {
    const blob = new Blob([JSON.stringify({
      meta: {
        scenario: currentScenario,
        recorded_at: new Date().toISOString(),
      },
      records,
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test_log_${currentScenario}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [records, currentScenario]);

  const passedCount = records.filter(r => r.verification.passed).length;
  const failedCount = records.length - passedCount;

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 8 }}>
        <BugOutlined style={{ marginRight: 8 }} />
        自动化测试面板
      </Title>
      <Text type="secondary">运行预定义的测试场景，自动验证对话流程和响应内容</Text>

      <Divider />

      <Space wrap style={{ marginBottom: 16 }}>
        {Object.entries(TEST_SCENARIOS).map(([key, scenario]) => (
          <Button
            key={key}
            type={currentScenario === key ? 'primary' : 'default'}
            icon={<PlayCircleOutlined />}
            onClick={() => runScenario(key)}
            loading={running && currentScenario === key}
            disabled={running && currentScenario !== key}
          >
            运行: {scenario.name}
          </Button>
        ))}
        {running && (
          <Button danger onClick={stopTest}>
            停止测试
          </Button>
        )}
        {records.length > 0 && !running && (
          <>
            <Button icon={<DownloadOutlined />} onClick={downloadLogs}>
              下载日志
            </Button>
            <Button icon={<ClearOutlined />} onClick={() => { setRecords([]); setCurrentScenario(null); }}>
              清空
            </Button>
          </>
        )}
      </Space>

      {records.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Tag color="success">通过: {passedCount}</Tag>
          <Tag color="error">失败: {failedCount}</Tag>
          <Tag>总步数: {records.length}</Tag>
        </div>
      )}

      {records.length > 0 && (
        <Timeline
          items={records.map((record) => ({
            color: record.verification.passed ? 'green' : 'red',
            dot: record.verification.passed ? <PlayCircleOutlined /> : <BugOutlined />,
            children: (
              <Card
                size="small"
                style={{
                  marginBottom: 12,
                  borderColor: record.verification.passed ? '#b7eb8f' : '#ffccc7',
                  background: record.verification.passed ? '#f6ffed' : '#fff2f0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>步骤 {record.step}: {TEST_SCENARIOS[currentScenario!]?.steps[record.step - 1]?.description}</Text>
                  <Tag color={record.verification.passed ? 'success' : 'error'}>
                    {record.verification.passed ? '通过' : '失败'} ({record.elapsed_ms}ms)
                  </Tag>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">输入:</Text>
                  <div style={{ padding: 8, background: '#fff', borderRadius: 4, marginTop: 4 }}>
                    <code>{record.request.message}</code>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">响应:</Text>
                  <div style={{ padding: 8, background: '#fff', borderRadius: 4, marginTop: 4, whiteSpace: 'pre-wrap' }}>
                    {record.response.reply.substring(0, 200)}
                    {record.response.reply.length > 200 ? '...' : ''}
                  </div>
                </div>
                {record.response.action && (
                  <div style={{ marginTop: 4 }}>
                    <Tag color="blue">action: {record.response.action}</Tag>
                  </div>
                )}
                {!record.verification.passed && (
                  <Alert
                    message={record.verification.reason}
                    type="error"
                    showIcon
                    style={{ marginTop: 8 }}
                  />
                )}
              </Card>
            ),
          }))}
        />
      )}
    </div>
  );
};

export default TestPanel;
