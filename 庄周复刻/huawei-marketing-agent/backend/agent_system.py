"""
Agent System Core - The heart of the Huawei Marketing Agent.
Implements a multi-agent workflow with 3 specialized agents:
  1. Competitor Research Agent
  2. Marketing Planner Agent
  3. Marketing 7.0 Auditor Agent

The Main Agent (Coordinator) orchestrates the plan-then-execute workflow,
dispatching sub-tasks sequentially and pushing real-time updates via WebSocket.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Any, Callable, Coroutine, Dict, List, Optional

from config import AUDITOR_REFERENCES_DIR, AUDITOR_SKILL_PATH, PRODUCTS_JSON_PATH
from kimi_client import KimiClientError, kimi_client
from models import (
    AgentProgress,
    AuditResult,
    ReportType,
    ScoreBreakdown,
    SessionState,
    SubTaskState,
)
from session_manager import session_manager

logger = logging.getLogger(__name__)

# =============================================================================
# Prompt Templates
# =============================================================================

COMPETITOR_RESEARCH_SYSTEM_PROMPT = """你是华为产品竞品研究专家。你的任务是针对华为新品进行深入竞品分析。

## 工作方法
1. 从产品知识库中提取目标产品的详细信息
2. 分析产品定位、目标受众、核心卖点
3. 对比上一代产品和友商近似产品
4. 输出结构化的竞品分析报告（Markdown格式）

## 分析维度
- 硬件规格对比（芯片、屏幕、相机、电池等）
- 软件生态对比（操作系统、特色功能）
- 价格定位对比
- 营销策略分析（slogan、目标人群、传播渠道）
- 差异化机会点识别

## 输出要求
- 使用Markdown格式
- 包含产品对比表格
- 分析深入具体，不要泛泛而谈
- 所有结论要有数据支撑
- 使用中文输出
"""

MARKETING_PLANNER_SYSTEM_PROMPT = """你是资深营销策划师， specializing in 华为产品营销策划。

## 工作方法
1. 基于竞品分析报告，制定差异化营销策略
2. 结合华为品牌调性（遥遥领先、先锋计划、纯血鸿蒙等）
3. 输出完整的营销方案（Markdown格式）

## 方案结构
1. **产品定位声明** - 一句话定义产品在市场中的位置
2. **核心卖点提炼** - 3-5个差异化卖点
3. **品牌叙事设计** - 完整的品牌故事（冲突→转折→解决→品牌角色）
4. **传播策略** - 渠道选择、内容节奏、KOL策略
5. **营销物料清单** - 视频、海报、文案、活动等
6. **上市节奏规划** - 预热→发布→持续传播→促销
7. **预期效果与KPI**

## 输出要求
- 使用Markdown格式
- 方案要具体可执行，不要空泛
- 结合华为品牌基因和当前市场热点
- 使用中文输出
"""

AUDITOR_SYSTEM_PROMPT_TEMPLATE = """你是 Marketing 7.0 营销审计师，基于 Philip Kotler《营销7.0》理论体系进行审计。

## 核心理论框架
Marketing 7.0 的核心命题：AI 已完成规模化、实时化、个性化，下一竞争高地是"顾客大脑的认知运作"本身。

## 审计三大模块

### 模块一：三道认知闸门（权重40%）
1. **Social Gate（社交闸门）** - 社会认同、KOL背书、镜像神经元、群体归属
2. **Personal Gate（个人闸门）** - 个性化沟通、System 2理性思考、显著性网络
3. **Experiential Gate（体验闸门）** - 可记忆体验、熟悉感+新奇感平衡、多感官参与

### 模块二：认知地图（权重30%）
1. **注意力大脑** - 理性决策、逻辑支撑、降低认知负荷
2. **社交大脑** - 情感共鸣、社交动机、"我们"感
3. **奖励大脑** - 奖励承诺、期待感、稀缺机制

### 模块三：四大营销刺激工具（权重30%）
1. **品牌叙事** - 理性逻辑/情感共鸣/价值信念三条路径
2. **价值主张** - 锚定效应、框架效应、损失厌恶、社会认同偏差等认知偏见
3. **销售方法** - 信任前置、降低决策风险、渐进承诺
4. **客户体验设计** - 峰终定律（Peak-End Rule）：前期期待→中期峰值→后期记忆→分享触发

## 评分标准
- 0-3分：严重缺失
- 4-5分：存在明显不足
- 6-7分：基本合格
- 8-9分：表现良好
- 10分：典范级

## 审计报告必须包含
1. 三道闸门评分表（每项0-10分）
2. 认知地图激活评分表（每项0-10分）
3. 四大工具评分表（每项0-10分）
4. 综合就绪指数（0-100分）+ 等级（S/A/B/C/D）
5. 核心短板与核心优势
6. 优先整改清单（按ROI排序）
7. 1-2个具体修改示例（原文 vs 修改后）

## 硬性规则
- 三道闸门都需>=6分才算通过
- 即使总分高，任一道闸门<6分，最高评级不超过B

## 输出格式
使用Markdown格式，包含所有表格和评分。
使用中文输出。

{skill_content}
{references_content}
"""


# =============================================================================
# Product Knowledge Loader
# =============================================================================

class ProductKnowledgeBase:
    """Loads and queries the Huawei product knowledge base."""

    _instance = None
    _data: Dict[str, Any] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load(self, filepath: Optional[Path] = None) -> None:
        """Load product knowledge from JSON file."""
        path = filepath or PRODUCTS_JSON_PATH
        try:
            with open(path, "r", encoding="utf-8") as f:
                self._data = json.load(f)
            logger.info(f"Product knowledge loaded from {path}")
        except Exception as e:
            logger.error(f"Failed to load product knowledge: {e}")
            self._data = {"huawei": {}, "competitors": {}}

    def get_all_data(self) -> Dict[str, Any]:
        """Get all product data."""
        return self._data

    def find_product(self, product_name: str) -> Optional[Dict[str, Any]]:
        """Find a Huawei product by name (fuzzy match)."""
        name_lower = product_name.lower().replace(" ", "").replace("\u200b", "")
        huawei = self._data.get("huawei", {})

        # Search all series
        for series_name, products in huawei.items():
            if not isinstance(products, list):
                continue
            for product in products:
                model = product.get("model", "")
                model_lower = model.lower().replace(" ", "").replace("\u200b", "")
                if name_lower in model_lower or model_lower in name_lower:
                    product["_series"] = series_name
                    return product
        return None

    def get_previous_generation(self, product: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Get the previous generation product for comparison."""
        series = product.get("_series", "")
        current_model = product.get("model", "")
        huawei = self._data.get("huawei", {})
        products_in_series = huawei.get(series, [])

        if not isinstance(products_in_series, list):
            return None

        # Find products in same series with earlier launch date
        current_date = product.get("launch_date", "")
        candidates = []
        for p in products_in_series:
            if p.get("model") == current_model:
                continue
            if p.get("launch_date", "") < current_date:
                candidates.append(p)

        if candidates:
            # Return the most recent previous generation
            candidates.sort(key=lambda x: x.get("launch_date", ""), reverse=True)
            return candidates[0]
        return None

    def get_competitor_products(self, category: str = "flagship") -> List[Dict[str, Any]]:
        """Get competitor products in the same category."""
        competitors = self._data.get("competitors", {})
        all_products = []
        for brand, products in competitors.items():
            if isinstance(products, list):
                for p in products:
                    p["_brand"] = brand
                    all_products.append(p)
        return all_products

    def format_product_for_prompt(self, product: Dict[str, Any]) -> str:
        """Format product info as text for LLM prompt."""
        lines = [f"### {product.get('model', 'Unknown')}"]
        fields = [
            ("发布日期", "launch_date"),
            ("价格区间", "price_range"),
            ("芯片", "chip"),
            ("屏幕", "screen"),
            ("相机", "camera"),
            ("电池", "battery"),
            ("操作系统", "os"),
            ("内存", "memory"),
            ("营销Slogan", "marketing_slogan"),
            ("目标人群", "target_audience"),
            ("系列定位", "series_positioning"),
        ]
        for label, key in fields:
            value = product.get(key, "")
            if value:
                lines.append(f"- {label}: {value}")
        features = product.get("key_features", [])
        if features:
            lines.append("- 核心卖点:")
            for f in features:
                lines.append(f"  - {f}")
        return "\n".join(lines)

    def get_knowledge_text(self) -> str:
        """Get full knowledge base as formatted text."""
        lines = ["# 华为产品知识库\n"]
        huawei = self._data.get("huawei", {})
        for series_name, products in huawei.items():
            if not isinstance(products, list) or series_name == "brand_keywords":
                continue
            lines.append(f"\n## {series_name}\n")
            for p in products:
                lines.append(self.format_product_for_prompt(p))
                lines.append("")
        # Competitors
        lines.append("\n## 竞品产品\n")
        competitors = self._data.get("competitors", {})
        for brand, products in competitors.items():
            if isinstance(products, list):
                lines.append(f"\n### {brand}\n")
                for p in products:
                    lines.append(self.format_product_for_prompt(p))
                    lines.append("")
        # Brand keywords
        keywords = self._data.get("huawei", {}).get("brand_keywords", [])
        if keywords:
            lines.append(f"\n## 华为品牌关键词\n{', '.join(keywords)}\n")
        return "\n".join(lines)


# Global instance
product_kb = ProductKnowledgeBase()


# =============================================================================
# Marketing 7.0 Auditor Skill Loader
# =============================================================================

class AuditorSkillLoader:
    """Loads the Marketing 7.0 auditor skill content."""

    _instance = None
    _skill_content: str = ""
    _references_content: str = ""

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load(self) -> None:
        """Load all auditor skill files."""
        try:
            # Load main SKILL.md
            if AUDITOR_SKILL_PATH.exists():
                with open(AUDITOR_SKILL_PATH, "r", encoding="utf-8") as f:
                    self._skill_content = f.read()
                logger.info(f"Auditor skill loaded from {AUDITOR_SKILL_PATH}")
            else:
                logger.warning(f"Auditor skill file not found: {AUDITOR_SKILL_PATH}")
                self._skill_content = ""

            # Load reference files
            ref_parts = []
            if AUDITOR_REFERENCES_DIR.exists():
                for ref_file in sorted(AUDITOR_REFERENCES_DIR.glob("*.md")):
                    with open(ref_file, "r", encoding="utf-8") as f:
                        ref_parts.append(f"\n\n---\n\n# {ref_file.name}\n\n{f.read()}")
                logger.info(f"Loaded {len(ref_parts)} reference files")
            self._references_content = "\n".join(ref_parts)

        except Exception as e:
            logger.error(f"Failed to load auditor skill: {e}")
            self._skill_content = ""
            self._references_content = ""

    def get_full_prompt(self) -> str:
        """Get the full auditor system prompt."""
        return AUDITOR_SYSTEM_PROMPT_TEMPLATE.format(
            skill_content=self._skill_content,
            references_content=self._references_content,
        )


# Global instance
auditor_skill = AuditorSkillLoader()


# =============================================================================
# WebSocket Broadcaster
# =============================================================================

class WebSocketBroadcaster:
    """Helper to broadcast progress updates to WebSocket connections."""

    def __init__(self):
        self._connections: Dict[str, Any] = {}

    def register(self, session_id: str, ws_connection: Any) -> None:
        """Register a WebSocket connection."""
        if session_id not in self._connections:
            self._connections[session_id] = []
        self._connections[session_id].append(ws_connection)

    def unregister(self, session_id: str, ws_connection: Any) -> None:
        """Unregister a WebSocket connection."""
        if session_id in self._connections:
            conns = self._connections[session_id]
            if ws_connection in conns:
                conns.remove(ws_connection)
            if not conns:
                del self._connections[session_id]

    async def broadcast(self, session_id: str, message: Dict[str, Any]) -> None:
        """Broadcast a message to all connections for a session."""
        import json as json_mod
        if session_id not in self._connections:
            return
        dead_connections = []
        for ws in self._connections[session_id]:
            try:
                await ws.send_text(json_mod.dumps(message, ensure_ascii=False, default=str))
            except Exception as e:
                logger.warning(f"WebSocket send failed: {e}")
                dead_connections.append(ws)
        # Clean up dead connections
        for ws in dead_connections:
            self.unregister(session_id, ws)


ws_broadcaster = WebSocketBroadcaster()


# =============================================================================
# Competitor Research Agent
# =============================================================================

class CompetitorResearchAgent:
    """
    Agent that performs competitor analysis for a Huawei product.
    Uses Kimi API + product knowledge base + prompt engineering.
    """

    def __init__(self):
        self.name = "竞品研究员"

    async def research(
        self,
        session_id: str,
        product_name: str,
        product_info: Optional[str] = None,
    ) -> str:
        """
        Execute competitor research workflow.

        Returns:
            Markdown-formatted competitor analysis report
        """
        logger.info(f"[{self.name}] Starting research for: {product_name}")

        # Step 1: Find product in knowledge base
        target_product = product_kb.find_product(product_name)
        if target_product is None:
            logger.warning(f"Product not found in KB: {product_name}")
            target_product = {"model": product_name, "key_features": []}

        # Step 2: Get previous generation
        previous_gen = product_kb.get_previous_generation(target_product)

        # Step 3: Get competitor products
        competitors = product_kb.get_competitor_products()

        # Step 4: Build the analysis prompt
        kb_text = product_kb.get_knowledge_text()
        target_text = product_kb.format_product_for_prompt(target_product)
        previous_text = ""
        if previous_gen:
            previous_text = product_kb.format_product_for_prompt(previous_gen)

        competitors_text = "\n\n".join([
            product_kb.format_product_for_prompt(c) for c in competitors
        ])

        user_prompt = f"""请对以下华为产品进行深入的竞品分析，输出完整的竞品分析报告。

## 目标产品
{target_text}

## 上一代产品（用于纵向对比）
{previous_text if previous_text else "（知识库中未找到上一代产品信息）"}

## 竞品产品（用于横向对比）
{competitors_text}

## 完整产品知识库
{kb_text}

## 用户补充信息
{product_info if product_info else "（无补充信息）"}

## 输出要求
请输出完整的竞品分析报告，必须包含以下内容：

1. **产品定位分析** - 目标产品在市场中的定位
2. **纵向对比分析** - 与上一代产品的升级点对比表格
3. **横向对比分析** - 与主要竞品的对比表格（至少包含价格、芯片、屏幕、相机、电池、特色功能）
4. **竞品营销策略分析** - 各竞品的slogan、目标人群、传播策略
5. **差异化机会点** - 至少3个可执行的差异化营销机会
6. **SWOT分析** - 优势、劣势、机会、威胁

请用Markdown格式输出，表格清晰，分析深入具体。
"""

        # Step 5: Call Kimi API
        try:
            report = await kimi_client.generate_with_system_prompt(
                system_prompt=COMPETITOR_RESEARCH_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                max_tokens=8192,
            )
            logger.info(f"[{self.name}] Research completed: {len(report)} chars")
            return report
        except KimiClientError as e:
            logger.error(f"[{self.name}] Research failed: {e}")
            raise


# =============================================================================
# Marketing Planner Agent
# =============================================================================

class MarketingPlannerAgent:
    """
    Agent that creates comprehensive marketing plans.
    Input: competitor analysis report + product knowledge
    Output: full marketing plan (Markdown)
    """

    def __init__(self):
        self.name = "营销策划师"

    async def plan(
        self,
        session_id: str,
        competitor_report: str,
        product_name: str,
        product_info: Optional[str] = None,
    ) -> str:
        """
        Create a comprehensive marketing plan.

        Returns:
            Markdown-formatted marketing plan
        """
        logger.info(f"[{self.name}] Starting planning for: {product_name}")

        # Get product info from knowledge base
        target_product = product_kb.find_product(product_name)
        target_text = ""
        if target_product:
            target_text = product_kb.format_product_for_prompt(target_product)

        kb_text = product_kb.get_knowledge_text()

        user_prompt = f"""请基于以下竞品分析报告，为华为{product_name}制定完整的营销策划方案。

## 竞品分析报告
{competitor_report}

## 目标产品信息
{target_text if target_text else f"产品名称: {product_name}"}

## 用户补充信息
{product_info if product_info else "（无补充信息）"}

## 完整产品知识库
{kb_text}

## 输出要求
请输出完整的营销策划方案，必须包含以下内容：

### 一、产品定位声明
用一句话精准定义产品在市场中的独特位置。

### 二、核心卖点提炼
提炼3-5个差异化核心卖点，每个卖点包含：
- 卖点名称
- 一句话描述
- 支撑论据
- 对应的目标人群痛点

### 三、品牌叙事设计
设计完整的品牌故事，包含：
- 故事主题
- 冲突设定
- 转折/解决方案（产品如何解决问题）
- 品牌角色定位
- 情感锚点

### 四、传播策略
1. **渠道矩阵**：线上+线下渠道选择及理由
2. **内容节奏**：预热期→发布期→持续传播期→促销期
3. **KOL策略**：头部/腰部/素人KOL搭配方案
4. **事件营销**：至少1个创意事件营销方案

### 五、营销物料清单
列出所有需要的营销物料：
| 物料类型 | 数量 | 规格 | 用途 |
（包括视频、海报、文案、H5、线下物料等）

### 六、上市节奏规划
用时间线形式展示：
- T-30天到T+90天的完整上市节奏
- 每个节点的关键动作

### 七、预期效果与KPI
- 曝光量目标
- 转化率目标
- 品牌认知度提升目标
- ROI预期

请用Markdown格式输出，方案要具体可执行。
"""

        try:
            plan = await kimi_client.generate_with_system_prompt(
                system_prompt=MARKETING_PLANNER_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                max_tokens=8192,
            )
            logger.info(f"[{self.name}] Planning completed: {len(plan)} chars")
            return plan
        except KimiClientError as e:
            logger.error(f"[{self.name}] Planning failed: {e}")
            raise


# =============================================================================
# Marketing 7.0 Auditor Agent
# =============================================================================

class MarketingAuditorAgent:
    """
    Agent that audits marketing plans using Marketing 7.0 framework.
    Input: marketing plan
    Output: structured audit result with scores and recommendations
    """

    def __init__(self):
        self.name = "评估师"
        self._system_prompt = ""

    def _load_skill(self) -> str:
        """Load auditor skill content."""
        if not self._system_prompt:
            auditor_skill.load()
            self._system_prompt = auditor_skill.get_full_prompt()
        return self._system_prompt

    async def audit(
        self,
        session_id: str,
        marketing_plan: str,
        product_name: str,
    ) -> str:
        """
        Audit a marketing plan using Marketing 7.0 framework.

        Returns:
            Markdown-formatted audit report
        """
        logger.info(f"[{self.name}] Starting audit for: {product_name}")

        system_prompt = self._load_skill()

        user_prompt = f"""请对以下华为{product_name}的营销方案进行 Marketing 7.0 审计。

## 待审计的营销方案
{marketing_plan}

## 审计要求
请严格按照 Marketing 7.0 框架进行审计，输出完整的审计报告。

报告必须包含：

### 1. 三道认知闸门评分表（每项0-10分）
| 闸门 | 得分 | 关键发现 | 优先级整改 |
| Social Gate | x/10 | ... | ... |
| Personal Gate | x/10 | ... | ... |
| Experiential Gate | x/10 | ... | ... |

### 2. 认知地图激活评分表（每项0-10分）
| 大脑模块 | 得分 | 激活程度 | 优化方向 |
| 注意力大脑 | x/10 | ... | ... |
| 社交大脑 | x/10 | ... | ... |
| 奖励大脑 | x/10 | ... | ... |

### 3. 四大营销刺激工具评分表（每项0-10分）
| 工具 | 得分 | 关键发现 | 整改建议 |
| 品牌叙事 | x/10 | ... | ... |
| 价值主张 | x/10 | ... | ... |
| 销售方法 | x/10 | ... | ... |
| 客户体验 | x/10 | ... | ... |

### 4. 综合评分
- Marketing 7.0 就绪指数: xx/100
- 等级: S/A/B/C/D
- 状态: 就绪/需优化/重大整改

### 5. 核心分析
- 核心优势
- 核心短板

### 6. 优先整改清单（按ROI排序，高/中/低优先级）

### 7. 修改示例（针对最高优先级的1-2项给出原文 vs 修改后的对比）

请严格按照评分标准评分，不要泛泛而谈。每个评分都要有具体的理由支撑。
"""

        try:
            audit_report = await kimi_client.generate_with_system_prompt(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=8192,
            )
            logger.info(f"[{self.name}] Audit completed: {len(audit_report)} chars")
            return audit_report
        except KimiClientError as e:
            logger.error(f"[{self.name}] Audit failed: {e}")
            raise


# =============================================================================
# Main Agent (Coordinator)
# =============================================================================

class MainAgent:
    """
    Coordinator agent that orchestrates the plan-then-execute workflow.
    Manages the sequential execution of sub-tasks and broadcasts progress.
    """

    def __init__(self):
        self.name = "协调者"
        self.competitor_agent = CompetitorResearchAgent()
        self.planner_agent = MarketingPlannerAgent()
        self.auditor_agent = MarketingAuditorAgent()

    async def run_workflow(
        self,
        session_id: str,
        product_name: str,
        product_info: Optional[str] = None,
        run_audit: bool = False,
    ) -> Dict[str, Any]:
        """
        Execute the full agent workflow:
        1. Competitor research
        2. Marketing planning
        3. Marketing 7.0 audit (optional)

        Progress is broadcast via WebSocket after each step.
        """
        results = {
            "competitor_report": "",
            "marketing_plan": "",
            "audit_report": "",
        }

        try:
            # ---- Step 1: Competitor Research ----
            logger.info(f"[{self.name}] Step 1: Competitor Research")
            task1 = session_manager.create_sub_task(
                session_id=session_id,
                name="竞品研究",
                description=f"分析 {product_name} 的竞争格局",
                agent=self.competitor_agent.name,
                input_data=product_name,
            )
            if task1:
                session_manager.update_sub_task_state(session_id, task1.id, SubTaskState.RUNNING)
                session_manager.transition_to_researching(session_id)
                await self._broadcast_progress(
                    session_id,
                    f"开始竞品研究：分析 {product_name} 的竞争格局...",
                )

            competitor_report = await self.competitor_agent.research(
                session_id=session_id,
                product_name=product_name,
                product_info=product_info,
            )
            results["competitor_report"] = competitor_report

            if task1:
                session_manager.update_sub_task_state(
                    session_id, task1.id, SubTaskState.COMPLETED,
                    output_data=competitor_report[:500],  # Store preview
                )
            session_manager.store_report(session_id, "competitor", {
                "title": f"{product_name} 竞品分析报告",
                "content": competitor_report,
                "markdown": competitor_report,
                "created_at": time.time(),
            })
            await self._broadcast_progress(
                session_id,
                "竞品研究完成！已生成竞品分析报告。",
                "progress",
            )

            # ---- Step 2: Marketing Planning ----
            logger.info(f"[{self.name}] Step 2: Marketing Planning")
            task2 = session_manager.create_sub_task(
                session_id=session_id,
                name="营销策划",
                description=f"为 {product_name} 制定营销方案",
                agent=self.planner_agent.name,
                input_data=competitor_report[:200],
            )
            if task2:
                session_manager.update_sub_task_state(session_id, task2.id, SubTaskState.RUNNING)
                session_manager.transition_to_planning(session_id)
                await self._broadcast_progress(
                    session_id,
                    "开始营销策划：基于竞品分析制定营销方案...",
                )

            marketing_plan = await self.planner_agent.plan(
                session_id=session_id,
                competitor_report=competitor_report,
                product_name=product_name,
                product_info=product_info,
            )
            results["marketing_plan"] = marketing_plan

            if task2:
                session_manager.update_sub_task_state(
                    session_id, task2.id, SubTaskState.COMPLETED,
                    output_data=marketing_plan[:500],
                )
            session_manager.store_report(session_id, "marketing_plan", {
                "title": f"{product_name} 营销策划方案",
                "content": marketing_plan,
                "markdown": marketing_plan,
                "created_at": time.time(),
            })
            await self._broadcast_progress(
                session_id,
                "营销策划完成！已生成完整营销方案。",
                "progress",
            )

            # ---- Step 3: Marketing 7.0 Audit (Optional) ----
            if run_audit:
                logger.info(f"[{self.name}] Step 3: Marketing 7.0 Audit")
                task3 = session_manager.create_sub_task(
                    session_id=session_id,
                    name="Marketing 7.0 评估",
                    description="对营销方案进行 Marketing 7.0 审计",
                    agent=self.auditor_agent.name,
                    input_data=marketing_plan[:200],
                )
                if task3:
                    session_manager.update_sub_task_state(session_id, task3.id, SubTaskState.RUNNING)
                    session_manager.transition_to_auditing(session_id)
                    await self._broadcast_progress(
                        session_id,
                        "开始 Marketing 7.0 评估：审计营销方案...",
                    )

                audit_report = await self.auditor_agent.audit(
                    session_id=session_id,
                    marketing_plan=marketing_plan,
                    product_name=product_name,
                )
                results["audit_report"] = audit_report

                if task3:
                    session_manager.update_sub_task_state(
                        session_id, task3.id, SubTaskState.COMPLETED,
                        output_data=audit_report[:500],
                    )
                session_manager.store_report(session_id, "audit", {
                    "title": f"{product_name} Marketing 7.0 审计报告",
                    "content": audit_report,
                    "markdown": audit_report,
                    "created_at": time.time(),
                })
                await self._broadcast_progress(
                    session_id,
                    "Marketing 7.0 评估完成！",
                    "progress",
                )

            # ---- Workflow Complete ----
            session_manager.transition_to_completed(session_id)
            await self._broadcast_progress(
                session_id,
                "所有任务已完成！您可以查看报告或导出结果。",
                "complete",
            )
            logger.info(f"[{self.name}] Workflow completed for session {session_id}")

        except Exception as e:
            logger.error(f"[{self.name}] Workflow failed: {e}", exc_info=True)
            session_manager.transition_to_error(session_id)
            # Mark running tasks as failed
            session = session_manager.get_session(session_id)
            if session:
                for task in session.sub_tasks:
                    if task.state == SubTaskState.RUNNING:
                        session_manager.update_sub_task_state(
                            session_id, task.id, SubTaskState.FAILED,
                            error_message=str(e),
                        )
            await self._broadcast_progress(
                session_id,
                f"任务执行出错: {str(e)}",
                "error",
            )
            raise

        return results

    async def run_audit_only(
        self,
        session_id: str,
        product_name: str,
    ) -> str:
        """Run audit on an existing marketing plan."""
        marketing_plan_data = session_manager.get_report(session_id, "marketing_plan")
        if marketing_plan_data is None:
            raise ValueError("No marketing plan found for this session")

        marketing_plan = marketing_plan_data.get("content", "")

        task = session_manager.create_sub_task(
            session_id=session_id,
            name="Marketing 7.0 评估",
            description="对现有营销方案进行审计",
            agent=self.auditor_agent.name,
        )
        if task:
            session_manager.update_sub_task_state(session_id, task.id, SubTaskState.RUNNING)
            session_manager.transition_to_auditing(session_id)
            await self._broadcast_progress(session_id, "开始 Marketing 7.0 评估...")

        audit_report = await self.auditor_agent.audit(
            session_id=session_id,
            marketing_plan=marketing_plan,
            product_name=product_name,
        )

        if task:
            session_manager.update_sub_task_state(
                session_id, task.id, SubTaskState.COMPLETED,
                output_data=audit_report[:500],
            )
        session_manager.store_report(session_id, "audit", {
            "title": f"{product_name} Marketing 7.0 审计报告",
            "content": audit_report,
            "markdown": audit_report,
            "created_at": time.time(),
        })

        # Check if all tasks completed
        session = session_manager.get_session(session_id)
        all_done = all(
            t.state in (SubTaskState.COMPLETED, SubTaskState.FAILED)
            for t in (session.sub_tasks if session else [])
        )
        if all_done:
            session_manager.transition_to_completed(session_id)
            await self._broadcast_progress(session_id, "评估完成！", "complete")

        return audit_report

    async def _broadcast_progress(
        self,
        session_id: str,
        message: str,
        msg_type: str = "progress",
    ) -> None:
        """Broadcast progress update via WebSocket."""
        progress = session_manager.build_progress_message(session_id, message, msg_type)
        if progress:
            payload = {
                "type": msg_type,
                "session_id": session_id,
                "state": progress.state.value,
                "current_task": progress.current_task,
                "message": message,
                "sub_tasks": [
                    {
                        "id": t.id,
                        "name": t.name,
                        "state": t.state.value,
                        "agent": t.agent,
                    }
                    for t in (progress.sub_tasks or [])
                ],
                "timestamp": time.time(),
            }
            await ws_broadcaster.broadcast(session_id, payload)


# Global singleton
main_agent = MainAgent()
