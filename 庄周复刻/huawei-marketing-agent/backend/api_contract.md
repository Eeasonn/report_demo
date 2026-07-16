# API 接口契约

## 基础信息
- Base URL: `http://localhost:8000`
- WebSocket: `ws://localhost:8000/ws/{session_id}`

## 接口列表

### 1. 创建会话
```
POST /api/sessions
Body: {
  "product_name": "Mate 90 Pro",
  "product_info": "用户输入的新品信息(可选)"
}
Response: {
  "session_id": "uuid",
  "status": "created",
  "message": "会话已创建"
}
```

### 2. 发送消息（开始策划流程）
```
POST /api/sessions/{session_id}/chat
Body: {
  "message": "我想为Mate 90 Pro制定上市营销方案",
  "options": {
    "enable_audit": true  // 是否启用Marketing 7.0评估
  }
}
Response: {
  "message_id": "uuid",
  "status": "processing",  // processing / completed / error
  "agent_state": "researching",  // idle / researching / planning / auditing / completed
  "content": "Agent的回复内容",
  "reports": {
    "competitor_analysis": "/api/sessions/{id}/reports/competitor",
    "marketing_plan": "/api/sessions/{id}/reports/plan",
    "audit_report": "/api/sessions/{id}/reports/audit"
  }
}
```

### 3. WebSocket 实时状态推送
```
ws://localhost:8000/ws/{session_id}

Server → Client 消息格式:
{
  "type": "agent_state_change",
  "data": {
    "state": "researching",  // researching / planning / auditing / completed
    "progress": 35,  // 0-100
    "message": "正在搜索华为Pura 70 Pro营销物料...",
    "sub_tasks": [
      {"name": "华为系竞品研究", "status": "completed"},
      {"name": "友商竞品研究", "status": "in_progress"},
      {"name": "营销策划", "status": "pending"}
    ]
  }
}
```

### 4. 获取报告
```
GET /api/sessions/{session_id}/reports/{report_type}
report_type: competitor | plan | audit

Response: {
  "report_type": "competitor",
  "content": "Markdown格式的报告内容",
  "created_at": "2025-07-07T10:00:00"
}
```

### 5. 导出报告
```
GET /api/sessions/{session_id}/reports/{report_type}/export?format=pdf|md

Response: 文件下载
```

### 6. 获取产品知识库
```
GET /api/products
Response: products.json 内容
```

### 7. 触发Marketing 7.0评估（可选独立触发）
```
POST /api/sessions/{session_id}/audit
Body: {
  "plan_content": "营销方案内容（如已在前端保存）"
}
Response: {
  "audit_report": "Markdown格式的审计报告",
  "score": {
    "social_gate": 7,
    "personal_gate": 6,
    "experiential_gate": 8,
    "attention_brain": 7.5,
    "social_brain": 8,
    "reward_brain": 7,
    "storytelling": 7,
    "value_proposition": 8,
    "selling_approach": 6,
    "customer_experience": 7.5,
    "total_score": 72
  }
}
```
