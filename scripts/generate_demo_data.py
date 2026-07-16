#!/usr/bin/env python3
"""
生成智能战报系统的演示数据
生成 10 个地区 × 20+ 产品 × 2 指标(SO/Inv) × 30 天的模拟数据
"""
import random
import pandas as pd
from datetime import datetime, timedelta
import os

random.seed(42)

# 地区定义
REGIONS = {
    "MEA": ["UAE", "Saudi Arabia", "South Africa", "Nigeria", "Botswana", "Kenya"],
    "LATAM": ["Mexico", "Brazil", "Colombia", "Chile", "Argentina"],
    "EU": ["Germany", "France", "UK", "Spain", "Italy", "Poland"],
    "APAC": ["Japan", "South Korea", "Thailand", "Malaysia", "Australia"],
    "CN": ["China East", "China North", "China South", "China West"],
}

# 产品定义 - 按品类分组
PRODUCTS = {
    "手机": [
        "Mate X7", "Mate XT", "Mate X6",
        "Pura 80", "Pura 80 Pro", "Pura 80 Ultra",
        "Mate 80 Pro",
        "nova 15", "nova 15 Max", "nova 14", "nova 14 Pro", "nova 14i",
        "nova Y73", "nova Y63", "nova Y73s", "nova Y62", "nova Y72", "nova Y72s"
    ],
    "耳机": [
        "FreeClip 2", "FreeClip", "FreeArc",
        "FreeBuds Pro 5", "FreeBuds Pro 4", "FreeBuds 6", "FreeBuds 7i",
        "FreeBuds SE 4 ANC", "FreeBuds SE 3", "FreeBuds SE 2"
    ],
    "穿戴": [
        "Watch 5", "Watch 4", "Watch GT 5", "Watch GT 4",
        "Band 10", "Band 9", "Band 8"
    ],
}

# 地区-品类映射（哪些地区销售哪些品类）
REGION_PRODUCT_MAP = {
    "MEA": ["手机", "耳机", "穿戴"],
    "LATAM": ["手机", "耳机", "穿戴"],
    "EU": ["手机", "耳机", "穿戴"],
    "APAC": ["手机", "耳机", "穿戴"],
    "CN": ["手机", "耳机", "穿戴"],
}

# 基础销量（每个产品的日均 SO 基准值）
BASE_SO = {
    # 手机 - 折叠
    "Mate X7": 65, "Mate XT": 84, "Mate X6": 40,
    # 手机 - Pura
    "Pura 80": 45, "Pura 80 Pro": 28, "Pura 80 Ultra": 10,
    # 手机 - Mate
    "Mate 80 Pro": 54,
    # 手机 - nova
    "nova 15": 120, "nova 15 Max": 797, "nova 14": 51, "nova 14 Pro": 84, "nova 14i": 316,
    # 手机 - Y系列
    "nova Y73": 50, "nova Y63": 792, "nova Y73s": 223,
    "nova Y62": 30, "nova Y72": 20, "nova Y72s": 60,
    # 耳机 - 开放式
    "FreeClip 2": 1292, "FreeClip": 129, "FreeArc": 15,
    # 耳机 - 入耳
    "FreeBuds Pro 5": 62, "FreeBuds Pro 4": 5, "FreeBuds 6": 24, "FreeBuds 7i": 277,
    "FreeBuds SE 4 ANC": 269, "FreeBuds SE 3": 197, "FreeBuds SE 2": 989,
    # 穿戴
    "Watch 5": 150, "Watch 4": 80, "Watch GT 5": 200, "Watch GT 4": 100,
    "Band 10": 300, "Band 9": 150, "Band 8": 80,
}

# 同比基准（去年同期销量，用于计算同比）
YOY_BASE = {
    "Mate X7": 51, "Mate XT": 0, "Mate X6": 35,
    "Pura 80": 93, "Pura 80 Pro": 40, "Pura 80 Ultra": 15,
    "Mate 80 Pro": 0,
    "nova 15": 50, "nova 15 Max": 400, "nova 14": 30, "nova 14 Pro": 50, "nova 14i": 258,
    "nova Y73": 21, "nova Y63": 71, "nova Y73s": 168,
    "nova Y62": 25, "nova Y72": 15, "nova Y72s": 50,
    "FreeClip 2": 356, "FreeClip": 200, "FreeArc": 10,
    "FreeBuds Pro 5": 0, "FreeBuds Pro 4": 20, "FreeBuds 6": 30, "FreeBuds 7i": 150,
    "FreeBuds SE 4 ANC": 0, "FreeBuds SE 3": 80, "FreeBuds SE 2": 500,
    "Watch 5": 0, "Watch 4": 100, "Watch GT 5": 0, "Watch GT 4": 120,
    "Band 10": 0, "Band 9": 100, "Band 8": 60,
}


def generate_daily_so(base, variance=0.3):
    """生成单日 SO，带随机波动"""
    v = base * variance
    value = base + random.uniform(-v, v)
    return max(0, int(round(value)))


def generate_inventory(so_series, target_dos=30):
    """根据 SO 序列生成库存序列，保持合理的 DOS"""
    inv = []
    avg_so = sum(so_series) / len(so_series) if so_series else 1
    target_inv = int(avg_so * target_dos)
    
    current_inv = target_inv + random.randint(-50, 50)
    for so in so_series:
        inv.append(max(0, current_inv))
        # 库存变化：补货 - 销量，保持围绕目标波动
        replenish = so + random.randint(-int(so*0.3), int(so*0.5))
        current_inv = current_inv - so + replenish
        # 拉回目标
        current_inv = int(current_inv * 0.7 + target_inv * 0.3)
    
    return inv


def generate_data():
    """生成完整的演示数据"""
    start_date = datetime(2026, 6, 1)
    num_days = 30
    dates = [start_date + timedelta(days=i) for i in range(num_days)]
    date_strs = [d.strftime("%Y%m%d") for d in dates]
    
    rows = []
    
    for region_code, countries in REGIONS.items():
        categories = REGION_PRODUCT_MAP.get(region_code, ["手机"])
        for country in countries:
            for category in categories:
                for product in PRODUCTS.get(category, []):
                    base_so = BASE_SO.get(product, 50)
                    
                    # 根据国家做系数调整
                    country_factor = random.uniform(0.5, 2.0)
                    adjusted_base = base_so * country_factor
                    
                    # 生成 30 天 SO
                    so_values = [generate_daily_so(adjusted_base) for _ in range(num_days)]
                    
                    # 生成 30 天 Inv
                    inv_values = generate_inventory(so_values, target_dos=random.randint(20, 40))
                    
                    # SO 行
                    so_row = {
                        "Management Region": f"{region_code} Terminal",
                        "Management Country/Region": country,
                        "Product": product,
                        "PSI Type": "Sell Out",
                    }
                    for d, v in zip(date_strs, so_values):
                        so_row[d] = v
                    rows.append(so_row)
                    
                    # Inv 行
                    inv_row = {
                        "Management Region": f"{region_code} Terminal",
                        "Management Country/Region": country,
                        "Product": product,
                        "PSI Type": "Inventory",
                    }
                    for d, v in zip(date_strs, inv_values):
                        inv_row[d] = v
                    rows.append(inv_row)
    
    df = pd.DataFrame(rows)
    return df, YOY_BASE


def save_data():
    """保存数据到文件"""
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(data_dir, exist_ok=True)
    
    df, yoy_base = generate_data()
    
    # 保存 Excel
    excel_path = os.path.join(data_dir, "psi_data.xlsx")
    df.to_excel(excel_path, index=False, engine='openpyxl')
    print(f"✅ 业务数据已保存: {excel_path}")
    print(f"   总行数: {len(df)}")
    print(f"   日期列数: {len(df.columns) - 4}")
    
    # 保存同比基准为 JSON
    import json
    yoy_path = os.path.join(data_dir, "yoy_base.json")
    with open(yoy_path, 'w', encoding='utf-8') as f:
        json.dump(yoy_base, f, ensure_ascii=False, indent=2)
    print(f"✅ 同比基准已保存: {yoy_path}")


if __name__ == "__main__":
    save_data()
    print("\n🎉 演示数据生成完成！")
