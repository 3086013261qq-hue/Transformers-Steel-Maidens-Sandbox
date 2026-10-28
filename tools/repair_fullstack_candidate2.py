from __future__ import annotations
import argparse, copy, json, re
from pathlib import Path

"""Candidate2 fullstack repair pass.

Run after tools/build_worldbook.py. It does not rewrite frozen setting/character/location
bodies. It only restores mature fullstack scaffold entries, canonical recursion flags,
runtime sandbox notation, and safe human short-name triggers found by Android QA.
"""

SCAFFOLD = {
    "🗑️清空局部变量(别关)": {
        "order": 601, "enabled": True, "position": "before_char", "use_regex": False,
        "content": "{{setvar::combat_driver::}}\n{{setvar::status_format::}}\n{{setvar::世界书重大记忆存储::}}\n{{setvar::世界书日常记忆存储::}}\n{{setvar::世界书玩家身世背景::}}",
    },
    "日常记忆存储": {
        "order": 599, "enabled": False, "position": "after_char", "use_regex": False,
        "content": "{{setvar::世界书日常记忆存储::\n【xx年x月x日至xx年x月x日】:xxxx (例子，自行替换)\n}}",
    },
    "重大记忆存储": {
        "order": 598, "enabled": False, "position": "after_char", "use_regex": False,
        "content": "{{setvar::世界书重大记忆存储::\n核心设定：\n(记录改变故事的大事件)\n}}",
    },
    "玩家身世背景": {
        "order": 597, "enabled": False, "position": "after_char", "use_regex": False,
        "content": "{{setvar::世界书玩家身世背景::\n<user>身世背景:\n}}",
    },
    "战斗思维链": {
        "order": 452, "enabled": True, "position": "after_char", "use_regex": True,
        "content": """{{setvar::combat_driver::
每回合保留独立的 <combat_driver> 协议槽。若本回合没有战斗，仅输出 <combat_driver>无</combat_driver>；不得省略或挪入状态、亲和、阵营好感等结构块。发生战斗时只输出简明条件依据与结果摘要，不展开内部推理过程。不创建第二套状态引擎，不改写 <causality> 阵营好感规则。
<combat_driver>
1. 初始化：读取双方身份、种族、机体/装备与战力层级，以「核心设定:战力与机体强弱基准」、角色能力和当前剧情事实为准；未知项保持未知。
2. 条件修正：核对形态切换、空地机动、武器射界、距离、地形、掩体、人数与交叉火力、情报、伏击、伤势、能量和弹药；优势必须有场景依据。
3. 对抗判定：按动作时机、距离、武器覆盖、装甲承受、机动与可持续性判定命中、格挡、闪避、压制、失衡、脱离或变形；禁止等级高一级自动无伤秒杀。
4. 战损/结果：只按已成立交锋记录装甲破损、武器失效、能量消耗、伤势、机动变化、撤离条件与伤亡；修复、扫描和形态重构必须服从封版规则与现实时间。
</combat_driver>
}}""",
    },
}

SAFE_SURNAME_ALIASES = {
    "角色:米凯拉·贝恩斯": ["贝恩斯"],
    "角色:玛吉·麦德森": ["麦德森"],
    "角色:格伦·惠特曼": ["惠特曼"],
    "角色:里奥·斯皮茨": ["斯皮茨"],
    "角色:卡莉·斯宾塞": ["斯宾塞"],
    "角色:迪伦·古尔德": ["古尔德"],
    "角色:谢恩·戴森": ["戴森"],
    "角色:约书亚·乔伊斯": ["乔伊斯"],
    "角色:达茜·蒂里尔": ["蒂里尔"],
    "角色:维维安·温布利": ["温布利"],
}


def add_alias(regex: str, alias: str) -> str:
    match = re.search(r"\(\?:([^)]*)\)", regex)
    if not match:
        raise ValueError(f"unexpected trigger regex: {regex}")
    parts = match.group(1).split("|")
    if alias in parts:
        return regex
    parts.append(alias)
    return regex[:match.start(1)] + "|".join(parts) + regex[match.end(1):]


def make_scaffold(template: dict, comment: str, spec: dict) -> dict:
    entry = copy.deepcopy(template)
    entry.update({
        "id": 0,
        "keys": [],
        "secondary_keys": [],
        "comment": comment,
        "content": spec["content"],
        "constant": True,
        "selective": True,
        "insertion_order": spec["order"],
        "enabled": spec["enabled"],
        "position": spec["position"],
        "use_regex": spec["use_regex"],
    })
    ext = entry["extensions"]
    ext["position"] = 0 if spec["position"] == "before_char" else 1
    ext["depth"] = 0 if comment == "战斗思维链" else 4
    ext["prevent_recursion"] = False
    ext["exclude_recursion"] = False
    return entry


def repair(book: dict) -> dict:
    entries = copy.deepcopy(book["entries"])
    template = next(e for e in entries if e["comment"] == "【记忆相关:起始】")

    # Mature fullstack scaffold and BLUE entries do not opt into recursive suppression.
    for entry in entries:
        comment = entry.get("comment", "")
        is_marker = comment.startswith("【")
        is_blue = comment.startswith("核心设定:") and entry.get("constant") and entry.get("content") and "·能力" not in comment
        if is_marker or is_blue:
            entry["extensions"]["prevent_recursion"] = False
            entry["extensions"]["exclude_recursion"] = False

    # Fullstack sandbox marker: open-ended until the player manually changes MAIN.
    for entry in entries:
        if not entry.get("comment", "").startswith("时间线-"):
            continue
        entry["content"], count = re.subn(
            r"沙盒模式\s*\([^)]*\)",
            "沙盒模式 (【最后一个原作事件之后】 - ∞)",
            entry["content"], count=1,
        )
        if count != 1:
            raise ValueError(f"sandbox marker count != 1: {entry['comment']}")

    # Add surname aliases only when they are not shared-family collision risks.
    by_comment = {e["comment"]: e for e in entries}
    for comment, aliases in SAFE_SURNAME_ALIASES.items():
        entry = by_comment[comment]
        for alias in aliases:
            entry["keys"][0] = add_alias(entry["keys"][0], alias)

    existing = set(by_comment)
    for comment, spec in SCAFFOLD.items():
        if comment not in existing:
            entries.append(make_scaffold(template, comment, spec))

    entries.sort(key=lambda e: (0 if e.get("position") == "before_char" else 1, -int(e.get("insertion_order") or 0)))
    for i, entry in enumerate(entries, 1):
        entry["id"] = i
        entry["extensions"]["display_index"] = i - 1

    if len(entries) != 288:
        raise ValueError(f"expected 288 business entries, got {len(entries)}")
    blues = [e for e in entries if e["comment"].startswith("核心设定:") and e["constant"] and e["content"] and "·能力" not in e["comment"]]
    if len(blues) != 9 or any(e["extensions"]["prevent_recursion"] or e["extensions"]["exclude_recursion"] for e in blues):
        raise ValueError("BLUE recursion QA failed")
    timelines = [e for e in entries if e["comment"].startswith("时间线-")]
    if len(timelines) != 9 or any("沙盒模式 (【最后一个原作事件之后】 - ∞)" not in e["content"] for e in timelines):
        raise ValueError("timeline sandbox QA failed")
    return {"name": book.get("name", "变形钢姬｜咩咩全栈世界书"), "entries": entries}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input", type=Path)
    ap.add_argument("output", type=Path)
    args = ap.parse_args()
    book = json.loads(args.input.read_text(encoding="utf-8"))
    fixed = repair(book)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(fixed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "PASS", "entries": len(fixed["entries"]), "output": str(args.output)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
