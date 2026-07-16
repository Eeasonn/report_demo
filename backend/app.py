#!/usr/bin/env python3
"""
智能战报系统 - FastAPI + LangGraph + Minimax M3 后端
"""
import json
import os
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── LangChain / LangGraph ───────────────────────────────────────
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

app = FastAPI(title="智能战报 API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 数据加载 ─────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if not os.path.exists(os.path.join(BASE_DIR, "config", "reports.json")):
    BASE_DIR = os.path.dirname(BASE_DIR)


def load_json(path: str) -> Any:
    with open(os.path.join(BASE_DIR, path), "r", encoding="utf-8") as f:
        return json.load(f)


REPORTS_CONFIG = load_json("config/reports.json")
SEMANTICS = load_json("config/semantics.json")
REPORTS = {r["id"]: r for r in REPORTS_CONFIG["reports"]}

# ── PSI 数据生成（与 v1 相同）────────────────────────────────────

REGION_COUNTRIES = {
    "MEA": ["UAE", "Saudi Arabia", "South Africa", "Nigeria", "Botswana", "Kenya"],
    "LATAM": ["Mexico", "Brazil", "Colombia", "Chile", "Argentina"],
    "EU": ["Germany", "France", "UK", "Spain", "Italy", "Poland"],
    "APAC": ["Japan", "South Korea", "Thailand", "Malaysia", "Australia"],
    "CN": ["China East", "China North", "China South", "China West"],
}

ALL_PRODUCTS = {
    "Mate X7": 65, "Mate XT": 84, "Mate X6": 40,
    "Pura 80": 45, "Pura 80 Pro": 28, "Pura 80 Ultra": 10,
    "Mate 80 Pro": 54,
    "nova 15": 120, "nova 15 Max": 797, "nova 14": 51, "nova 14 Pro": 84, "nova 14i": 316,
    "nova Y73": 50, "nova Y63": 792, "nova Y73s": 223,
    "FreeClip 2": 1292, "FreeClip": 129, "FreeArc": 15,
    "FreeBuds Pro 5": 62, "FreeBuds Pro 4": 5, "FreeBuds 6": 24, "FreeBuds 7i": 277,
    "FreeBuds SE 4 ANC": 269, "FreeBuds SE 3": 197, "FreeBuds SE 2": 989,
    "Watch 5": 150, "Watch 4": 80, "Watch GT 5": 200, "Watch GT 4": 100,
    "Band 10": 300, "Band 9": 150, "Band 8": 80,
}

YOY_BASE = {
    "Mate X7": 51, "Mate XT": 0, "Mate X6": 35,
    "Pura 80": 93, "Pura 80 Pro": 40, "Pura 80 Ultra": 15,
    "Mate 80 Pro": 0,
    "nova 15": 50, "nova 15 Max": 400, "nova 14": 30, "nova 14 Pro": 50, "nova 14i": 258,
    "nova Y73": 21, "nova Y63": 71, "nova Y73s": 168,
    "FreeClip 2": 356, "FreeClip": 200, "FreeArc": 10,
    "FreeBuds Pro 5": 0, "FreeBuds Pro 4": 20, "FreeBuds 6": 30, "FreeBuds 7i": 150,
    "FreeBuds SE 4 ANC": 0, "FreeBuds SE 3": 80, "FreeBuds SE 2": 500,
    "Watch 5": 0, "Watch 4": 100, "Watch GT 5": 0, "Watch GT 4": 120,
    "Band 10": 0, "Band 9": 100, "Band 8": 60,
}


def generate_psi_data():
    import random
    random.seed(42)
    data = {}
    start = datetime(2026, 6, 1)
    for _r, countries in REGION_COUNTRIES.items():
        for c in countries:
            for prod, base in ALL_PRODUCTS.items():
                factor = random.uniform(0.3, 2.0)
                adjusted = base * factor
                inv_target = int(adjusted * 30)
                current_inv = inv_target + random.randint(-30, 30)
                for day in range(30):
                    d = start + timedelta(days=day)
                    ds = d.strftime("%Y%m%d")
                    so = max(0, int(adjusted + random.uniform(-adjusted * 0.3, adjusted * 0.3)))
                    data[(f"{_r} Terminal", c, prod, "Sell Out", ds)] = so
                    data[(f"{_r} Terminal", c, prod, "Inventory", ds)] = max(0, current_inv)
                    replenish = so + random.randint(-int(so * 0.3), int(so * 0.5))
                    current_inv = current_inv - so + replenish
                    current_inv = int(current_inv * 0.7 + inv_target * 0.3)
    return data


PSI_DATA = generate_psi_data()


# ── PSI 计算引擎（与 v1 相同）────────────────────────────────────

def compute_psi(region: str, products: List[str], date_start: str, date_end: str):
    result = {}
    region_prefix = f"{region} Terminal"
    countries = REGION_COUNTRIES.get(region, [])
    if region == "GLOBAL":
        countries = [c for lst in REGION_COUNTRIES.values() for c in lst]

    start_dt = datetime.strptime(date_start, "%Y%m%d")
    end_dt = datetime.strptime(date_end, "%Y%m%d")
    date_list = []
    cur = start_dt
    while cur <= end_dt:
        date_list.append(cur.strftime("%Y%m%d"))
        cur += timedelta(days=1)

    last_date = date_list[-1] if date_list else date_end

    for prod in products:
        so_total = 0
        inv_last = 0
        for c in countries:
            for d in date_list:
                so_total += PSI_DATA.get((region_prefix, c, prod, "Sell Out", d), 0)
            inv_last += PSI_DATA.get((region_prefix, c, prod, "Inventory", last_date), 0)

        base = YOY_BASE.get(prod, 0)
        if base > 0 and len(date_list) > 0:
            yoy_total = base * len(date_list)
            yoy = round((so_total - yoy_total) / yoy_total * 100, 1) if yoy_total > 0 else None
        else:
            yoy = None

        result[prod] = {"so": so_total, "inv": inv_last, "yoy": yoy}

    return result


def format_number(n: int) -> str:
    if n >= 1000:
        return f"{n/1000:.1f}k".replace(".0k", "k")
    return str(n)


# ── 战报渲染引擎（与 v1 相同）────────────────────────────────────

def render_report_content(report: Dict, date_range: Dict[str, str], focus_models: Optional[List[str]] = None):
    region = report["region"]
    template = report["template"]
    style = template.get("style", "series")

    date_start = date_range.get("start", "20260601")
    date_end = date_range.get("end", "20260601")

    ds = datetime.strptime(date_start, "%Y%m%d")
    de = datetime.strptime(date_end, "%Y%m%d")
    if date_start == date_end:
        date_display = ds.strftime("%m月%d日")
    else:
        date_display = f"{ds.strftime('%m月%d日')}-{de.strftime('%m月%d日')}"

    sections = []
    for sec in template.get("sections", []):
        products = sec.get("products", [])
        psi = compute_psi(region, products, date_start, date_end)
        total_so = sum(v["so"] for v in psi.values())
        sec_data = {
            "title": sec.get("title", ""),
            "showTotal": sec.get("showTotal", False),
            "showYoY": sec.get("showYoY", False),
            "showInventory": sec.get("showInventory", False),
            "total": total_so,
            "items": []
        }
        for prod in products:
            pv = psi.get(prod, {"so": 0, "inv": 0, "yoy": None})
            sec_data["items"].append({"product": prod, "so": pv["so"], "inv": pv["inv"], "yoy": pv["yoy"]})
        sections.append(sec_data)

    sub_sections = []
    for sub in template.get("subSections", []):
        products = sub.get("products", [])
        psi = compute_psi(region, products, date_start, date_end)
        total_so = sum(v["so"] for v in psi.values())
        total_inv = sum(v["inv"] for v in psi.values())
        avg_so = total_so / max(len(products), 1)
        dos = round(total_inv / avg_so, 0) if avg_so > 0 else 0
        sub_sections.append({
            "title": sub.get("title", ""),
            "showInventory": sub.get("showInventory", False),
            "total_so": total_so,
            "total_inv": total_inv,
            "dos": dos,
            "items": [{"product": p, **psi.get(p, {"so": 0, "inv": 0, "yoy": None})} for p in products]
        })

    focus_section = None
    fs = template.get("focusSection")
    if fs:
        fm = focus_models if focus_models else fs.get("products", [])
        psi = compute_psi(region, fm, date_start, date_end)
        focus_section = {
            "title": fs.get("title", "重点机型"),
            "items": [{"product": p, "so": psi.get(p, {}).get("so", 0)} for p in fm]
        }

    return {
        "reportId": report["id"],
        "title": f"{report['name']} ({date_display})",
        "style": style,
        "dateDisplay": date_display,
        "dateRange": {"start": date_start, "end": date_end},
        "sections": sections,
        "subSections": sub_sections,
        "focusSection": focus_section
    }


def render_text(content: Dict) -> str:
    lines = []
    style = content.get("style", "series")
    if style == "series":
        for sec in content.get("sections", []):
            title = sec.get("title", "")
            total = sec.get("total", 0)
            show_total = sec.get("showTotal", False)
            show_yoy = sec.get("showYoY", False)
            line = title
            if show_total:
                line += f"{format_number(total)} 台"
            lines.append(line)
            for item in sec.get("items", []):
                prod = item.get("product", "")
                so = item.get("so", 0)
                yoy = item.get("yoy")
                item_line = f"  {prod}: {so} 台"
                if yoy is not None and show_yoy:
                    sign = "+" if yoy >= 0 else ""
                    item_line += f"，同比去年同日：{sign}{yoy}%"
                lines.append(item_line)
            lines.append("")
    elif style == "category":
        for sec in content.get("sections", []):
            title = sec.get("title", "")
            total = sec.get("total", 0)
            show_total = sec.get("showTotal", False)
            show_yoy = sec.get("showYoY", False)
            line = title
            if show_total:
                line += f"{format_number(total)} 台"
            lines.append(line)
            for item in sec.get("items", []):
                prod = item.get("product", "")
                so = item.get("so", 0)
                yoy = item.get("yoy")
                item_line = f"  {prod}：{so} 台"
                if yoy is not None and show_yoy:
                    sign = "+" if yoy >= 0 else ""
                    item_line += f"，同比去年同日：{sign}{yoy}%"
                lines.append(item_line)
            lines.append("")
    elif style == "comprehensive":
        for sec in content.get("sections", []):
            total = sec.get("total", 0)
            items = sec.get("items", [])
            lines.append(f"{content.get('dateDisplay', '')} 2C 总销量 {format_number(total)} 台")
            for item in items:
                yoy = item.get("yoy")
                if yoy is not None:
                    sign = "+" if yoy >= 0 else ""
                    lines.append(f"  {item['product']}: {item['so']} 台 ({sign}{yoy}%)")
                else:
                    lines.append(f"  {item['product']}: {item['so']} 台")
            lines.append("")
        for sub in content.get("subSections", []):
            lines.append(sub.get("title", ""))
            lines.append(f"  销量: {format_number(sub.get('total_so', 0))} 台")
            if sub.get("showInventory"):
                lines.append(f"  渠道库存: {format_number(sub.get('total_inv', 0))} 台，DOS: {sub.get('dos', 0)} 天")
            lines.append("")
    focus = content.get("focusSection")
    if focus:
        lines.append(focus.get("title", "重点机型"))
        for item in focus.get("items", []):
            so = item.get("so", 0)
            lines.append(f"  {item['product']}: {so} 台")
    return "\n".join(lines)


# ── 全局状态：当前会话的战报上下文 ─────────────────────────────────

SESSION_CONTEXT: Dict[str, Dict] = {}


def get_session_context(session_id: str) -> Dict:
    if session_id not in SESSION_CONTEXT:
        SESSION_CONTEXT[session_id] = {
            "current_report_id": None,
            "current_date_range": {"start": "20260624", "end": "20260630"},
            "current_focus_models": None,
            "user_permissions": ["GLOBAL"],  # 默认全部权限
        }
    return SESSION_CONTEXT[session_id]


def _has_permission(report_region: str, user_permissions: List[str]) -> bool:
    """检查用户是否有权限访问指定地区的战报"""
    if "GLOBAL" in user_permissions:
        return True
    return report_region in user_permissions


# ── LangChain Tools ─────────────────────────────────────────────

@tool
def list_reports(region_query: str) -> str:
    """根据用户提到的地区或关键词，查找匹配的标准战报列表。
    
    当用户说"帮我找一下XX的战报"、"XX地区有什么战报"时使用此工具。
    
    Args:
        region_query: 用户提到的地区或关键词，如"墨西哥"、"拉美"、"欧洲"、"手机"等
    """
    session_id = SESSION_CONTEXT.get("_current_session", "default")
    ctx = get_session_context(session_id)
    user_permissions = ctx.get("user_permissions", ["GLOBAL"])
    
    # 地区映射
    mapping = SEMANTICS.get("regionMapping", {})
    matched_regions = set()
    for key, val in mapping.items():
        if key in region_query or region_query in key:
            matched_regions.add(val)
    for code in ["MEA", "LATAM", "EU", "APAC", "CN", "GLOBAL"]:
        if code.lower() in region_query.lower():
            matched_regions.add(code)
    
    # 如果没有匹配到地区，尝试按名称/品类匹配
    if not matched_regions:
        matched = [r for r in REPORTS.values() if region_query in r["name"] or region_query in r["category"]]
    else:
        matched = [r for r in REPORTS.values() if r["region"] in matched_regions]
    
    # 权限过滤
    matched = [r for r in matched if _has_permission(r["region"], user_permissions)]
    
    if not matched:
        # 检查是否是权限问题
        all_matched = [r for r in REPORTS.values() if region_query in r["name"] or region_query in r["category"]]
        if not matched_regions:
            all_matched = [r for r in REPORTS.values() if region_query in r["name"] or region_query in r["category"]]
        else:
            all_matched = [r for r in REPORTS.values() if r["region"] in matched_regions]
        
        denied = [r for r in all_matched if not _has_permission(r["region"], user_permissions)]
        if denied:
            perm_names = ", ".join(user_permissions)
            return f"您没有 {denied[0]['regionName']} 地区的战报访问权限。您的权限范围是：{perm_names}。"
        return f"未找到与「{region_query}」相关的战报。可用的战报地区包括：中东非洲、拉美、欧洲、亚太、中国、全球。"
    
    if len(matched) == 1:
        r = matched[0]
        return f"为您找到战报：「{r['name']}」（{r['regionName']} · {r['category']}）。请说『查看{r['name']}』来展示。"
    
    result = f"为您找到以下相关战报：\n"
    for i, r in enumerate(matched, 1):
        result += f"{i}. {r['name']}（{r['regionName']} · {r['category']}\n"
    result += "\n请告诉我您要查看哪一个（回复编号或名称即可）。"
    return result


@tool
def view_report(report_id: str) -> str:
    """查看/展示指定ID的标准战报内容。
    
    当用户明确选择了某个战报（如回复"拉美手机日销"、"R002"）时使用此工具。
    
    Args:
        report_id: 战报ID（如R001、R002）或战报名称（如"拉美手机日销"）
    """
    session_id = SESSION_CONTEXT.get("_current_session", "default")
    ctx = get_session_context(session_id)
    user_permissions = ctx.get("user_permissions", ["GLOBAL"])
    
    # 尝试按ID或名称匹配
    report = REPORTS.get(report_id)
    if not report:
        for rid, r in REPORTS.items():
            if r["name"] == report_id or report_id in r["name"]:
                report = r
                report_id = rid
                break
    
    if not report:
        return f"未找到战报「{report_id}」。请从列表中选择一个。"
    
    # 权限检查
    if not _has_permission(report["region"], user_permissions):
        perm_names = ", ".join(user_permissions)
        return f"您没有 {report['regionName']} 地区的战报访问权限。您的权限范围是：{perm_names}。"
    
    ctx["current_report_id"] = report_id
    
    date_range = ctx.get("current_date_range", {"start": "20260624", "end": "20260630"})
    content = render_report_content(report, date_range)
    text = render_text(content)
    
    return f"已为您展示「{report['name']}」战报：\n\n{text}\n\n您可以对我说：\n• 『时间改成7.11-7.19』修改时间范围\n• 『重点机型换成Mate XT』调整重点机型"


@tool
def modify_time(date_start: str, date_end: str) -> str:
    """修改当前战报的时间范围。
    
    当用户说"时间改成XX"、"日期换成XX"时使用此工具。
    支持格式：YYYYmmdd，如 20260711、20260624
    
    Args:
        date_start: 开始日期，格式 YYYYmmdd，如 20260711
        date_end: 结束日期，格式 YYYYmmdd，如 20260719
    """
    session_id = SESSION_CONTEXT.get("_current_session", "default")
    ctx = get_session_context(session_id)
    
    if not ctx.get("current_report_id"):
        return "请先选择要查看的战报。您可以说『帮我找一下墨西哥的战报』开始。"
    
    # 解析日期（支持多种输入格式）
    ds = _parse_date(date_start)
    de = _parse_date(date_end)
    if not ds or not de:
        return "日期格式不正确，请使用如「7.11-7.19」或「20260711」格式。"
    
    ctx["current_date_range"] = {"start": ds, "end": de}
    
    report = REPORTS.get(ctx["current_report_id"])
    content = render_report_content(report, ctx["current_date_range"], ctx.get("current_focus_models"))
    text = render_text(content)
    
    return f"已更新时间范围至 {content['dateDisplay']}：\n\n{text}"


@tool
def modify_focus_models(models: str) -> str:
    """修改当前战报的重点机型列表。
    
    当用户说"重点机型换成XX"、"关注XX机型"时使用此工具。
    
    Args:
        models: 机型名称，多个用逗号分隔，如 "Mate XT,Mate X7"
    """
    session_id = SESSION_CONTEXT.get("_current_session", "default")
    ctx = get_session_context(session_id)
    
    if not ctx.get("current_report_id"):
        return "请先选择要查看的战报。"
    
    model_list = [m.strip() for m in models.split(",") if m.strip()]
    ctx["current_focus_models"] = model_list
    
    report = REPORTS.get(ctx["current_report_id"])
    content = render_report_content(report, ctx.get("current_date_range", {"start": "20260624", "end": "20260630"}), model_list)
    text = render_text(content)
    
    return f"已更新重点机型为：{', '.join(model_list)}\n\n{text}"


@tool
def get_report_info() -> str:
    """获取当前会话的状态信息，包括当前选中的战报、时间范围、重点机型等。
    
    当不确定当前上下文时使用此工具。
    """
    session_id = SESSION_CONTEXT.get("_current_session", "default")
    ctx = get_session_context(session_id)
    
    if not ctx.get("current_report_id"):
        return "当前未选择任何战报。可用的操作：\n• 查找战报：『帮我找一下墨西哥的战报』\n• 直接查看：『查看拉美手机日销』"
    
    report = REPORTS.get(ctx["current_report_id"])
    dr = ctx.get("current_date_range", {})
    fm = ctx.get("current_focus_models")
    
    info = f"当前战报：{report['name']}\n"
    info += f"时间范围：{dr.get('start', '?')} 至 {dr.get('end', '?')}\n"
    if fm:
        info += f"重点机型：{', '.join(fm)}\n"
    info += "\n可用操作：修改时间 / 修改重点机型 / 查看其他战报"
    return info


def _parse_date(date_str: str) -> Optional[str]:
    """解析多种日期格式为 YYYYmmdd"""
    date_str = date_str.strip().replace(".", "")
    # 20260711
    if re.match(r'^\d{8}$', date_str):
        return date_str
    # 7.11 → 20260711
    if re.match(r'^\d{1,2}\d{2}$', date_str):
        m = int(date_str[:-2])
        d = int(date_str[-2:])
        return f"2026{m:02d}{d:02d}"
    # 07.11 → 20260711
    if re.match(r'^\d{4}$', date_str):
        m = int(date_str[:2])
        d = int(date_str[2:])
        return f"2026{m:02d}{d:02d}"
    # 昨天/今天等语义
    if date_str in ["昨天", "yesterday"]:
        return (datetime(2026, 6, 30) - timedelta(days=1)).strftime("%Y%m%d")
    if date_str in ["今天", "today"]:
        return "20260630"
    return None


# ── 配置 LLM（支持 Minimax M3 和 Kimi）─────────────────────────────

LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "minimax").lower()
MINIMAX_API_KEY = os.environ.get("MINIMAX_API_KEY", "")
KIMI_API_KEY = os.environ.get("KIMI_API_KEY", "")

# Fallback key（仅用于开发测试）
_FALLBACK_KEY = "sk-cp-EkenCD3ZkKwcUaRaoN0lGmrO8uIMyoWtfyJoxreCKx-cCX_DOn1sOBNGWg5ERdpBGRR2Zk_ztpS5gyaZ3QH-S4DGXxz2kClDFfD-lXsjjc3_74VkNpXmXfw"
if not MINIMAX_API_KEY:
    MINIMAX_API_KEY = _FALLBACK_KEY

llm = None
llm_name = "fallback"

# 尝试初始化 Kimi
if LLM_PROVIDER == "kimi" and KIMI_API_KEY:
    try:
        llm = ChatOpenAI(
            model="moonshot-v1-8k",
            api_key=KIMI_API_KEY,
            base_url="https://api.moonshot.cn/v1",
            temperature=0.2,
            max_tokens=4096,
        )
        llm_name = "Kimi (Moonshot-v1-8k)"
        print(f"✅  {llm_name} LLM initialized")
    except Exception as e:
        print(f"⚠️  WARNING: Failed to initialize Kimi: {e}")
        llm = None

# 尝试初始化 MiniMax（默认或 Kimi 失败时回退）
if llm is None and MINIMAX_API_KEY:
    try:
        llm = ChatOpenAI(
            model="MiniMax-M3",
            api_key=MINIMAX_API_KEY,
            base_url="https://api.minimax.io/v1",
            temperature=0.2,
            max_tokens=4096,
        )
        llm_name = "MiniMax-M3"
        print(f"✅  {llm_name} LLM initialized")
    except Exception as e:
        print(f"⚠️  WARNING: Failed to initialize MiniMax-M3: {e}")
        llm = None

if llm is None:
    print("⚠️  Running in rule-based fallback mode (no LLM)")

# 系统提示词
SYSTEM_PROMPT = """你是「智能战报助手」，一个专业的数据报告查询助手。你的职责是帮助用户查找、查看和定制战报。

## 可用工具
1. **list_reports**: 当用户想查找战报时使用（如"帮我找一下墨西哥的战报"）
2. **view_report**: 当用户明确选择了某个战报时使用（如"拉美手机日销"、"R002"）
3. **modify_time**: 当用户要求修改时间范围时使用（如"时间改成7.11-7.19"）
4. **modify_focus_models**: 当用户要求修改重点机型时使用（如"重点机型换成Mate XT"）
5. **get_report_info**: 当不确定当前上下文时使用

## 工作规则
- 用户查找战报时，先调用 list_reports，让用户选择
- 用户明确选择后，调用 view_report 展示内容
- 展示后，主动告知用户可以继续修改时间或重点机型
- 修改操作前，请先确认理解用户的意图
- 如果用户意图模糊，礼貌地反问澄清
- 用中文回复，保持专业、简洁、友好
- **重要：展示战报后，必须主动提示用户可修改的内容（时间范围、重点机型）**

## 战报模板说明
- 系列分组型：按产品系列分组（折叠、Pura、Mate、nova、Y系列）
- 品类分组型：按品类分组（开放式、入耳式）
- 综合型：含总销量、子分类、渠道库存、DOS、重点机型

## PSI 计算规则
- SO（销量）：时间区间内求和
- Inv（库存）：取区间最后一天
- DOS = Inv / 日均销量

## 权限规则
- 如果用户查询的地区不在其权限范围内，请明确告知用户其权限范围
- 用户权限范围可通过 session context 获取
"""

# 创建 Agent（如果 LLM 可用）
if llm:
    tools = [list_reports, view_report, modify_time, modify_focus_models, get_report_info]
    memory = MemorySaver()
    agent = create_react_agent(llm, tools, prompt=SYSTEM_PROMPT, checkpointer=memory)
    print(f"✅  LangGraph Agent created with {llm_name}")
else:
    agent = None
    print("⚠️  Running in rule-based fallback mode (no LLM)")
if llm:
    tools = [list_reports, view_report, modify_time, modify_focus_models, get_report_info]
    memory = MemorySaver()
    agent = create_react_agent(llm, tools, prompt=SYSTEM_PROMPT, checkpointer=memory)
    print("✅  LangGraph Agent created with MiniMax-M3")
else:
    agent = None
    print("⚠️  Running in rule-based fallback mode (no LLM)")


# ── Pydantic 模型 ────────────────────────────────────────────────

class ReportListItem(BaseModel):
    id: str
    code: str
    name: str
    category: str
    region: str
    regionName: str
    type: str
    description: str


class RenderRequest(BaseModel):
    reportId: str
    dateRange: Optional[Dict[str, str]] = None
    focusModels: Optional[List[str]] = None


class ChatRequest(BaseModel):
    message: str
    sessionId: Optional[str] = None
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    reply: str
    action: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    sessionId: str
    requiresConfirm: bool = False
    confirmMessage: Optional[str] = None
    thoughtChain: Optional[List[Dict[str, str]]] = None  # AI 思考链路


# ── API 路由 ───────────────────────────────────────────────────

@app.get("/api/reports", response_model=List[ReportListItem])
def list_reports_api(q: Optional[str] = Query(None)):
    result = []
    for r in REPORTS.values():
        item = {
            "id": r["id"], "code": r["code"], "name": r["name"],
            "category": r["category"], "region": r["region"],
            "regionName": r["regionName"], "type": r["type"],
            "description": r["description"],
        }
        if q:
            qq = q.lower()
            searchable = f"{r['name']} {r['regionName']} {r['category']} {r['description']}".lower()
            if qq not in searchable:
                continue
        result.append(item)
    return result


@app.get("/api/reports/{report_id}")
def get_report(report_id: str):
    if report_id not in REPORTS:
        raise HTTPException(status_code=404, detail="战报不存在")
    r = REPORTS[report_id]
    return {"id": r["id"], "code": r["code"], "name": r["name"], "category": r["category"],
            "region": r["region"], "regionName": r["regionName"], "type": r["type"],
            "description": r["description"], "template": r["template"]}


@app.post("/api/reports/{report_id}/render")
def render_report(report_id: str, req: RenderRequest):
    if report_id not in REPORTS:
        raise HTTPException(status_code=404, detail="战报不存在")
    report = REPORTS[report_id]
    today = datetime(2026, 6, 30)
    default_start = (today - timedelta(days=6)).strftime("%Y%m%d")
    default_end = today.strftime("%Y%m%d")
    date_range = req.dateRange or {"start": default_start, "end": default_end}
    content = render_report_content(report, date_range, req.focusModels)
    text = render_text(content)
    return {"reportId": report_id, "title": content["title"], "text": text, "content": content}


# ── AI 对话接口（LangGraph Agent）─────────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    import uuid
    session_id = req.sessionId or str(uuid.uuid4())[:8]
    msg = req.message.strip()
    
    # 记录当前会话ID（用于 Tools 访问上下文）
    SESSION_CONTEXT["_current_session"] = session_id
    
    # 设置用户权限（从请求上下文获取，默认 GLOBAL）
    ctx = get_session_context(session_id)
    user_permissions = req.context.get("userPermissions", ["GLOBAL"]) if req.context else ["GLOBAL"]
    ctx["user_permissions"] = user_permissions
    
    # 构建思考链路（用于前端 ThoughtChain 展示）
    thought_chain = []
    
    if agent:
        try:
            config = {"configurable": {"thread_id": session_id}}
            
            thought_chain.append({"step": "理解意图", "status": "loading"})
            
            # 调用 LangGraph Agent
            result = agent.invoke({"messages": [{"role": "user", "content": msg}]}, config)
            
            thought_chain.append({"step": "理解意图", "status": "success"})
            
            # 提取 AI 回复
            last_msg = result["messages"][-1]
            reply = last_msg.content if hasattr(last_msg, "content") else str(last_msg)
            
            # 提取工具调用记录到 thought_chain
            for m in result["messages"]:
                if hasattr(m, "tool_calls") and m.tool_calls:
                    for tc in m.tool_calls:
                        thought_chain.append({
                            "step": f"调用工具: {tc.get('name', 'unknown')}",
                            "status": "success",
                            "detail": str(tc.get("args", {}))[:100]
                        })
            
            # 清理 think 标签
            reply = re.sub(r'<think>.*?</think>', '', reply, flags=re.DOTALL).strip()
            reply = re.sub(r'<think>.*', '', reply, flags=re.DOTALL).strip()
            
            # 判断当前状态：是否刚刚列出战报且用户还未选择
            has_listed = any("list_reports" in step.get("step", "") for step in thought_chain)
            
            action = None
            data = None
            
            if has_listed and not ctx.get("current_report_id"):
                # LLM 刚刚列出战报选项，构建 choose_report 数据供前端渲染卡片
                options = []
                for rid, report in REPORTS.items():
                    if report["name"] in reply:
                        options.append({
                            "id": rid,
                            "name": report["name"],
                            "regionName": report["regionName"],
                            "category": report["category"],
                            "type": report["type"],
                        })
                if len(options) > 1:
                    action = "choose_report"
                    data = {"options": options}
            
            # 如果已有当前战报，渲染报告内容
            if ctx.get("current_report_id"):
                report = REPORTS.get(ctx["current_report_id"])
                if report:
                    content = render_report_content(report, ctx.get("current_date_range", {"start": "20260624", "end": "20260630"}), ctx.get("current_focus_models"))
                    action = "show_report"
                    data = {"reportId": ctx["current_report_id"], "content": content, "text": render_text(content)}
            
            return ChatResponse(
                reply=reply,
                action=action,
                data=data,
                sessionId=session_id,
                thoughtChain=thought_chain
            )
        
        except Exception as e:
            print(f"Agent error: {e}")
            return ChatResponse(
                reply="抱歉，AI 助手暂时遇到问题，请稍后重试。",
                sessionId=session_id,
                thoughtChain=[{"step": "错误", "status": "error", "detail": str(e)}]
            )
    else:
        # Fallback: 原生规则引擎（与 v1 类似）
        return _fallback_chat(msg, session_id, user_permissions)


def _fallback_chat(msg: str, session_id: str, user_permissions: List[str] = None) -> ChatResponse:
    """当 LLM 不可用时回退到规则引擎"""
    if user_permissions is None:
        user_permissions = ["GLOBAL"]
    
    # 简单意图识别
    intents = SEMANTICS.get("intentPatterns", {})
    detected = None
    for intent_name, keywords in intents.items():
        for kw in keywords:
            if kw in msg:
                detected = intent_name
                break
        if detected:
            break
    
    ctx = get_session_context(session_id)
    ctx["user_permissions"] = user_permissions
    
    # 战报名称匹配（用户直接选择战报）
    name_matched = [r for r in REPORTS.values() if r["name"] in msg]
    if name_matched:
        # 权限过滤
        name_matched = [r for r in name_matched if _has_permission(r["region"], user_permissions)]
        if len(name_matched) == 1:
            r = name_matched[0]
            ctx["current_report_id"] = r["id"]
            content = render_report_content(r, {"start": "20260624", "end": "20260630"})
            return ChatResponse(
                reply=f"已为您展示『{r['name']}』战报。\n\n{render_text(content)}\n\n您可以对我说：\n• 『时间改成7.11-7.19』修改时间范围\n• 『重点机型换成Mate XT』调整重点机型",
                action="show_report",
                data={"reportId": r["id"], "content": content, "text": render_text(content)},
                sessionId=session_id
            )
        elif len(name_matched) > 1:
            names = "\n".join([f"{i+1}. {r['name']}" for i, r in enumerate(name_matched)])
            return ChatResponse(
                reply=f"为您找到以下相关战报：\n{names}\n\n请问您要查看哪一个？",
                action="choose_report",
                data={"options": [{"id": r["id"], "name": r["name"], "regionName": r["regionName"], "category": r["category"], "type": r["type"]} for r in name_matched]},
                sessionId=session_id
            )
    
    # 地区匹配
    mapping = SEMANTICS.get("regionMapping", {})
    regions = []
    for key, val in mapping.items():
        if key in msg:
            regions.append(val)
    
    if regions and not ctx.get("current_report_id"):
        matched = [r for r in REPORTS.values() if r["region"] in regions]
        # 权限过滤
        matched = [r for r in matched if _has_permission(r["region"], user_permissions)]
        
        if len(matched) == 1:
            r = matched[0]
            ctx["current_report_id"] = r["id"]
            content = render_report_content(r, {"start": "20260624", "end": "20260630"})
            return ChatResponse(
                reply=f"已为您展示『{r['name']}』战报。\n\n{render_text(content)}\n\n您可以对我说：\n• 『时间改成7.11-7.19』修改时间范围\n• 『重点机型换成Mate XT』调整重点机型",
                action="show_report",
                data={"reportId": r["id"], "content": content, "text": render_text(content)},
                sessionId=session_id
            )
        elif len(matched) > 1:
            names = "\n".join([f"{i+1}. {r['name']}" for i, r in enumerate(matched)])
            return ChatResponse(
                reply=f"为您找到以下相关战报：\n{names}\n\n请问您要查看哪一个？",
                action="choose_report",
                data={"options": [{"id": r["id"], "name": r["name"], "regionName": r["regionName"], "category": r["category"], "type": r["type"]} for r in matched]},
                sessionId=session_id
            )
        else:
            # 检查是否是权限问题
            all_matched = [r for r in REPORTS.values() if r["region"] in regions]
            denied = [r for r in all_matched if not _has_permission(r["region"], user_permissions)]
            if denied:
                perm_names = ", ".join(user_permissions)
                return ChatResponse(
                    reply=f"您没有 {denied[0]['regionName']} 地区的战报访问权限。您的权限范围是：{perm_names}。",
                    sessionId=session_id
                )
    
    # 如果已有当前战报，尝试处理修改请求
    if ctx.get("current_report_id"):
        current_report = REPORTS.get(ctx["current_report_id"])
        if current_report:
            # 修改时间范围
            import re as _re
            date_pattern = _re.compile(r'(\d{1,2})\.(\d{1,2})\s*[~-]\s*(\d{1,2})\.(\d{1,2})')
            date_match = date_pattern.search(msg)
            if date_match:
                m1, d1, m2, d2 = date_match.groups()
                start = f"2026{m1.zfill(2)}{d1.zfill(2)}"
                end = f"2026{m2.zfill(2)}{d2.zfill(2)}"
                ctx["current_date_range"] = {"start": start, "end": end}
                content = render_report_content(current_report, ctx["current_date_range"], ctx.get("current_focus_models"))
                return ChatResponse(
                    reply=f"已为您调整时间范围为 {m1}月{d1}日-{m2}月{d2}日。\n\n{render_text(content)}",
                    action="show_report",
                    data={"reportId": ctx["current_report_id"], "content": content, "text": render_text(content)},
                    sessionId=session_id
                )
            
            # 修改重点机型
            model_keywords = ["换成", "改为", "重点机型", "关注"]
            if any(kw in msg for kw in model_keywords):
                # 尝试提取机型名称（简单匹配）
                models = []
                for model in ["Mate XT", "Pura 70", "Mate 60", "P60", "Nova 12", "畅享 70"]:
                    if model in msg:
                        models.append(model)
                if models:
                    ctx["current_focus_models"] = models
                    content = render_report_content(current_report, ctx.get("current_date_range", {"start": "20260624", "end": "20260630"}), models)
                    return ChatResponse(
                        reply=f"已为您调整重点机型为 {', '.join(models)}。\n\n{render_text(content)}",
                        action="show_report",
                        data={"reportId": ctx["current_report_id"], "content": content, "text": render_text(content)},
                        sessionId=session_id
                    )
    
    # 默认欢迎
    return ChatResponse(
        reply="您好！我是战报智能助手 🤖\n\n我可以帮您：\n• 查找战报（如：帮我找一下墨西哥的战报）\n• 查看战报详情\n• 修改时间范围（如：时间改成 7.11-7.19）\n• 调整重点机型（如：重点机型换成 Mate XT）\n\n请问您需要什么帮助？",
        sessionId=session_id
    )



@app.get("/api/user/permissions")
def get_user_permissions(sessionId: Optional[str] = Query(None)):
    """获取当前用户的权限范围"""
    import uuid
    sid = sessionId or str(uuid.uuid4())[:8]
    ctx = get_session_context(sid)
    return {
        "permissions": ctx.get("user_permissions", ["GLOBAL"]),
        "sessionId": sid,
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0", "llm": llm_name, "provider": LLM_PROVIDER}


# ── 工作台管理 ────────────────────────────────────────────────────

WORKBENCH: List[Dict[str, Any]] = []


class WorkbenchItemCreate(BaseModel):
    reportId: str
    reportName: str
    dateRange: Optional[Dict[str, str]] = None
    focusModels: Optional[List[str]] = None


@app.get("/api/workbench")
def list_workbench():
    """获取工作台中保存的战报配置列表"""
    return WORKBENCH


@app.post("/api/workbench")
def create_workbench_item(req: WorkbenchItemCreate):
    """保存战报配置到工作台"""
    if req.reportId not in REPORTS:
        raise HTTPException(status_code=404, detail="战报不存在")
    item = {
        "id": f"wb_{len(WORKBENCH) + 1:03d}",
        "reportId": req.reportId,
        "reportName": req.reportName,
        "dateRange": req.dateRange,
        "focusModels": req.focusModels,
        "createdAt": datetime.now().isoformat(),
    }
    WORKBENCH.append(item)
    return item


@app.delete("/api/workbench/{item_id}")
def delete_workbench_item(item_id: str):
    """从工作台删除保存的战报配置"""
    global WORKBENCH
    WORKBENCH = [item for item in WORKBENCH if item["id"] != item_id]
    return {"ok": True}


# ── 订阅管理 ──────────────────────────────────────────────────────

SUBSCRIPTIONS: List[Dict[str, Any]] = []


class SubscriptionCreate(BaseModel):
    reportId: str
    schedule: str = "daily"
    pushTime: str = "09:00"
    focusModels: Optional[List[str]] = None
    customDateRange: Optional[Dict[str, str]] = None


@app.get("/api/subscriptions")
def list_subscriptions():
    # 标记自定义订阅
    result = []
    for sub in SUBSCRIPTIONS:
        sub_copy = dict(sub)
        sub_copy["isCustom"] = bool(sub.get("customDateRange") or sub.get("focusModels"))
        result.append(sub_copy)
    return result


@app.post("/api/subscriptions")
def create_subscription(req: SubscriptionCreate):
    if req.reportId not in REPORTS:
        raise HTTPException(status_code=404, detail="战报不存在")
    sub = {
        "id": f"sub_{len(SUBSCRIPTIONS) + 1:03d}",
        "reportId": req.reportId,
        "reportName": REPORTS[req.reportId]["name"],
        "schedule": req.schedule,
        "pushTime": req.pushTime,
        "focusModels": req.focusModels,
        "customDateRange": req.customDateRange,
        "isCustom": bool(req.customDateRange or req.focusModels),
        "createdAt": datetime.now().isoformat(),
        "enabled": True,
    }
    SUBSCRIPTIONS.append(sub)
    return sub


@app.delete("/api/subscriptions/{sub_id}")
def delete_subscription(sub_id: str):
    global SUBSCRIPTIONS
    SUBSCRIPTIONS = [s for s in SUBSCRIPTIONS if s["id"] != sub_id]
    return {"ok": True}


@app.put("/api/subscriptions/{sub_id}/toggle")
def toggle_subscription(sub_id: str):
    for s in SUBSCRIPTIONS:
        if s["id"] == sub_id:
            s["enabled"] = not s["enabled"]
            return s
    raise HTTPException(status_code=404, detail="订阅不存在")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
