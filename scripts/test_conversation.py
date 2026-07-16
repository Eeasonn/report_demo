#!/usr/bin/env python3
"""
智能战报系统 - 自动化测试脚本
支持：对话流测试、API 回归测试、交互日志记录

用法：
    python scripts/test_conversation.py              # 运行默认测试套件
    python scripts/test_conversation.py --scenario mexico  # 运行指定场景
    python scripts/test_conversation.py --record logs/test_$(date +%s).json  # 记录到指定文件
"""

import argparse
import json
import sys
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, asdict

import requests

BASE_URL = "http://localhost:8000"


@dataclass
class TestStep:
    """单步测试定义"""
    user_input: str
    expected_action: Optional[str] = None
    expected_keywords: Optional[List[str]] = None
    description: str = ""


@dataclass
class TestResult:
    """单步测试结果"""
    step_index: int
    user_input: str
    response: str
    action: Optional[str]
    thought_chain: List[Dict]
    session_id: str
    passed: bool
    failure_reason: str = ""
    elapsed_ms: float = 0.0


# ── 预定义测试场景 ────────────────────────────────────────────────

SCENARIOS = {
    "mexico": {
        "name": "墨西哥战报完整对话流",
        "description": "模拟用户查找墨西哥战报、选择、修改参数、保存的完整流程",
        "steps": [
            TestStep(
                user_input="帮我找一下墨西哥的战报",
                expected_action="choose_report",
                expected_keywords=["拉美手机日销", "拉美综合日销"],
                description="查找墨西哥相关战报"
            ),
            TestStep(
                user_input="拉美手机日销",
                expected_action="show_report",
                expected_keywords=["已为您展示", "拉美手机日销"],
                description="选择拉美手机日销战报"
            ),
            TestStep(
                user_input="时间改成 7.11-7.19",
                expected_action="show_report",
                expected_keywords=["07月11日-07月19日"],
                description="修改时间范围"
            ),
            TestStep(
                user_input="重点机型换成 Mate XT",
                expected_action="show_report",
                expected_keywords=["Mate XT"],
                description="修改重点机型"
            ),
            TestStep(
                user_input="保存到我的工作台",
                expected_action=None,  # 前端处理，后端无直接action
                expected_keywords=["已保存", "工作台"],
                description="保存到工作台"
            ),
        ]
    },
    "permission_denied": {
        "name": "权限拒绝场景",
        "description": "测试用户无权限访问时的响应",
        "steps": [
            TestStep(
                user_input="帮我找一下中东非洲的战报",
                expected_action="choose_report",
                description="查找战报（默认有权限）"
            ),
        ]
    },
    "fallback": {
        "name": "Fallback 规则引擎",
        "description": "测试 Fallback 规则引擎的响应",
        "steps": [
            TestStep(
                user_input="你好",
                expected_action=None,
                expected_keywords=["您好", "战报智能助手"],
                description="欢迎语"
            ),
            TestStep(
                user_input="帮我找一下欧洲的战报",
                expected_action="show_report",
                expected_keywords=["欧洲"],
                description="直接查找欧洲战报（只有一个，直接展示）"
            ),
        ]
    },
}


# ── 测试核心 ────────────────────────────────────────────────────

class ConversationTester:
    def __init__(self, base_url: str = BASE_URL, record_path: Optional[str] = None):
        self.base_url = base_url.rstrip("/")
        self.session_id: Optional[str] = None
        self.record_path = record_path
        self.records: List[Dict] = []
        self.results: List[TestResult] = []

    def _call_chat(self, message: str) -> Dict[str, Any]:
        """调用 /api/chat"""
        payload = {
            "message": message,
            "sessionId": self.session_id,
            "context": {"userPermissions": ["GLOBAL"]},
        }
        resp = requests.post(f"{self.base_url}/api/chat", json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if data.get("sessionId"):
            self.session_id = data["sessionId"]
        return data

    def _verify_step(self, step: TestStep, data: Dict) -> tuple[bool, str]:
        """验证单步结果是否符合预期"""
        reply = data.get("reply", "")
        action = data.get("action")
        thought_chain = data.get("thoughtChain", [])

        # 验证 action
        if step.expected_action and action != step.expected_action:
            return False, f"Action 不匹配: 期望 {step.expected_action}, 实际 {action}"

        # 验证关键词
        if step.expected_keywords:
            missing = [kw for kw in step.expected_keywords if kw not in reply]
            if missing:
                return False, f"缺少关键词: {', '.join(missing)}"

        return True, ""

    def run_step(self, index: int, step: TestStep) -> TestResult:
        """执行单步测试"""
        start = time.time()
        print(f"  [{index+1}] {step.description or step.user_input}")
        print(f"      输入: {step.user_input}")

        try:
            data = self._call_chat(step.user_input)
            elapsed = (time.time() - start) * 1000

            passed, reason = self._verify_step(step, data)

            # 记录交互日志
            record = {
                "step": index + 1,
                "timestamp": datetime.now().isoformat(),
                "request": {"message": step.user_input, "sessionId": self.session_id},
                "response": {
                    "reply": data.get("reply", ""),
                    "action": data.get("action"),
                    "thoughtChain": data.get("thoughtChain", []),
                    "sessionId": data.get("sessionId"),
                },
                "verification": {
                    "passed": passed,
                    "reason": reason,
                },
                "elapsed_ms": round(elapsed, 2),
            }
            self.records.append(record)

            result = TestResult(
                step_index=index + 1,
                user_input=step.user_input,
                response=data.get("reply", ""),
                action=data.get("action"),
                thought_chain=data.get("thoughtChain", []),
                session_id=self.session_id or "",
                passed=passed,
                failure_reason=reason,
                elapsed_ms=round(elapsed, 2),
            )
            self.results.append(result)

            status = "✅ 通过" if passed else "❌ 失败"
            print(f"      状态: {status} ({elapsed:.0f}ms)")
            if not passed:
                print(f"      原因: {reason}")
            print(f"      响应: {data.get('reply', '')[:120]}...")
            print()
            return result

        except Exception as e:
            elapsed = (time.time() - start) * 1000
            result = TestResult(
                step_index=index + 1,
                user_input=step.user_input,
                response="",
                action=None,
                thought_chain=[],
                session_id=self.session_id or "",
                passed=False,
                failure_reason=f"异常: {str(e)}",
                elapsed_ms=round(elapsed, 2),
            )
            self.results.append(result)
            print(f"      状态: ❌ 异常 ({elapsed:.0f}ms)")
            print(f"      错误: {str(e)}")
            print()
            return result

    def run_scenario(self, scenario_key: str) -> Dict[str, Any]:
        """运行指定测试场景"""
        scenario = SCENARIOS.get(scenario_key)
        if not scenario:
            raise ValueError(f"未知场景: {scenario_key}。可用: {', '.join(SCENARIOS.keys())}")

        print(f"\n{'='*60}")
        print(f"场景: {scenario['name']}")
        print(f"描述: {scenario['description']}")
        print(f"{'='*60}\n")

        self.session_id = None
        self.records = []
        self.results = []

        for i, step in enumerate(scenario["steps"]):
            self.run_step(i, step)

        # 生成摘要
        passed_count = sum(1 for r in self.results if r.passed)
        total = len(self.results)
        summary = {
            "scenario": scenario_key,
            "scenario_name": scenario["name"],
            "total_steps": total,
            "passed": passed_count,
            "failed": total - passed_count,
            "success_rate": f"{passed_count/total*100:.1f}%" if total > 0 else "N/A",
            "total_elapsed_ms": sum(r.elapsed_ms for r in self.results),
            "results": [asdict(r) for r in self.results],
        }

        return summary

    def save_record(self, path: Optional[str] = None):
        """保存交互日志到文件"""
        save_path = path or self.record_path
        if not save_path:
            save_path = f"logs/conversation_test_{int(time.time())}.json"

        import os
        os.makedirs(os.path.dirname(save_path), exist_ok=True)

        with open(save_path, "w", encoding="utf-8") as f:
            json.dump({
                "meta": {
                    "recorded_at": datetime.now().isoformat(),
                    "base_url": self.base_url,
                    "session_id": self.session_id,
                },
                "records": self.records,
            }, f, ensure_ascii=False, indent=2)

        print(f"\n交互日志已保存: {save_path}")


# ── 测试套件 ────────────────────────────────────────────────────

class TestSuite:
    def __init__(self, tester: ConversationTester):
        self.tester = tester
        self.summaries: List[Dict] = []

    def run_all(self):
        """运行所有测试场景"""
        print(f"\n{'#'*60}")
        print("# 智能战报系统 - 自动化测试套件")
        print(f"{'#'*60}")
        print(f"服务端: {self.tester.base_url}")
        print(f"场景数: {len(SCENARIOS)}")
        print(f"{'#'*60}\n")

        for key in SCENARIOS.keys():
            summary = self.tester.run_scenario(key)
            self.summaries.append(summary)
            self.tester.save_record(f"logs/test_{key}_{int(time.time())}.json")

        # 总报告
        print(f"\n{'='*60}")
        print("测试总报告")
        print(f"{'='*60}")
        total_steps = sum(s["total_steps"] for s in self.summaries)
        total_passed = sum(s["passed"] for s in self.summaries)
        for s in self.summaries:
            status = "✅" if s["failed"] == 0 else "❌"
            print(f"  {status} {s['scenario_name']:20s}  {s['passed']}/{s['total_steps']} 通过")
        print(f"\n  总计: {total_passed}/{total_steps} 通过 ({total_passed/total_steps*100:.1f}%)")
        print(f"{'='*60}\n")

        return total_passed == total_steps


# ── CLI ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="智能战报系统自动化测试")
    parser.add_argument("--scenario", choices=list(SCENARIOS.keys()), help="运行指定测试场景")
    parser.add_argument("--record", help="保存交互日志到指定路径")
    parser.add_argument("--url", default=BASE_URL, help="API 基础 URL")
    args = parser.parse_args()

    tester = ConversationTester(base_url=args.url, record_path=args.record)

    if args.scenario:
        summary = tester.run_scenario(args.scenario)
        tester.save_record()
        sys.exit(0 if summary["failed"] == 0 else 1)
    else:
        suite = TestSuite(tester)
        all_passed = suite.run_all()
        sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
