import React from 'react';
import { Tag, Divider } from 'antd';
import { RiseOutlined, FallOutlined, StockOutlined, EditOutlined } from '@ant-design/icons';
import type { ReportContent } from '../store';

interface Props {
  content: ReportContent;
}

const formatNumber = (n: number): string => {
  if (n >= 1000) {
    const k = n / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(n);
};

const YoYTag: React.FC<{ value: number | null }> = ({ value }) => {
  if (value === null || value === undefined) return null;
  const isPositive = value >= 0;
  return (
    <Tag
      icon={isPositive ? <RiseOutlined /> : <FallOutlined />}
      color={isPositive ? 'success' : 'error'}
      style={{ marginLeft: 8, fontSize: 12 }}
    >
      同比 {isPositive ? '+' : ''}{value}%
    </Tag>
  );
};

const ReportContentView: React.FC<Props> = ({ content }) => {
  const { style, sections, subSections, focusSection, dateDisplay } = content;

  return (
    <div className="report-content">
      {/* 日期标识 - 可修改高亮 */}
      <div className="editable-highlight" style={{ marginBottom: 16, color: '#1677ff', fontSize: 13, fontWeight: 500 }}>
        <StockOutlined style={{ marginRight: 6 }} />
        数据周期：{dateDisplay}
        <Tag color="orange" style={{ marginLeft: 8, fontSize: 11 }}>
          <EditOutlined /> 可修改
        </Tag>
      </div>

      {/* 系列分组型 / 品类分组型 */}
      {(style === 'series' || style === 'category') && (
        <>
          {sections.map((sec, idx) => (
            <div key={idx} style={{ marginBottom: 20 }}>
              <div className="section-title">
                {sec.title}
                {sec.showTotal && (
                  <span style={{ marginLeft: 8, color: '#333' }}>
                    {formatNumber(sec.total)} 台
                    {sec.showYoY && sec.items.length > 0 && sec.items[0].yoy !== null && (
                      <YoYTag value={sec.items[0].yoy} />
                    )}
                  </span>
                )}
              </div>

              {sec.items.map((item: any, i: number) => (
                <div
                  key={i}
                  className={`item-line ${item.so > 0 ? 'highlight' : ''}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{item.product}</span>
                  <span>
                    <strong>{formatNumber(item.so)}</strong> 台
                    {item.yoy !== null && sec.showYoY && (
                      <YoYTag value={item.yoy} />
                    )}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {/* 综合型 */}
      {style === 'comprehensive' && (
        <>
          {sections.map((sec, idx) => (
            <div key={idx} style={{ marginBottom: 20 }}>
              <div className="section-title">{sec.title || '总览'}</div>
              <div
                style={{
                  background: '#f0f5ff',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 600 }}>总销量</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#1677ff' }}>
                  {formatNumber(sec.total)}
                  <span style={{ fontSize: 14, marginLeft: 4 }}>台</span>
                </span>
              </div>

              {sec.items.map((item: any, i: number) => (
                <div
                  key={i}
                  className="item-line"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: i < sec.items.length - 1 ? '1px solid #f5f5f5' : 'none',
                  }}
                >
                  <span>{item.product}</span>
                  <span>
                    {formatNumber(item.so)} 台
                    {item.yoy !== null && <YoYTag value={item.yoy} />}
                  </span>
                </div>
              ))}

              {sec.showInventory && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: '#fff7e6', borderRadius: 6, fontSize: 13 }}>
                  <StockOutlined style={{ color: '#fa8c16', marginRight: 6 }} />
                  渠道库存及 DOS 数据见下方细分
                </div>
              )}
            </div>
          ))}

          {subSections && subSections.length > 0 && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              {subSections.map((sub, idx) => (
                <div key={idx} style={{ marginBottom: 16, padding: '12px 16px', background: '#f6ffed', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, color: '#389e0d', marginBottom: 8 }}>{sub.title}</div>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 13 }}>
                    <span>销量：<strong>{formatNumber(sub.total_so)}</strong> 台</span>
                    {sub.showInventory && (
                      <>
                        <span>库存：<strong>{formatNumber(sub.total_inv)}</strong> 台</span>
                        <span>DOS：<strong>{sub.dos}</strong> 天</span>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {sub.items.map((it: any) => `${it.product}: ${formatNumber(it.so)}`).join(' / ')}
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* 重点机型 - 可修改高亮 */}
      {focusSection && (
        <div className="focus-section editable-highlight">
          <div className="focus-title">
            {focusSection.title}
            <Tag color="purple" style={{ marginLeft: 8, fontSize: 11 }}>
              <EditOutlined /> 可修改
            </Tag>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {focusSection.items.map((item: any, i: number) => (
              <div
                key={i}
                style={{
                  padding: '10px 14px',
                  background: '#f9f0ff',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 13 }}>{item.product}</span>
                <span style={{ fontWeight: 700, color: '#722ed1' }}>
                  {item.so > 0 ? formatNumber(item.so) : '-'}
                  {item.so > 0 && <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2 }}>台</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportContentView;
