from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

DATE_RE = re.compile(
    r'(?P<bce>公元前\s*)?(?P<year>\d{1,5})\s*年\s*'
    r'(?P<month>\d{1,2})\s*月\s*(?P<day>\d{1,2})\s*日'
    r'(?P<time>\s+\d{1,2}:\d{2})?'
)
SPACED_DATE_RE = re.compile(r'(?:公元前\s*)?\d{1,5}\s+年\s+\d{1,2}\s+月\s+\d{1,2}\s+日')


def normalize_date(match: re.Match[str]) -> str:
    prefix = '公元前' if match.group('bce') else ''
    year = match.group('year')
    month = match.group('month').zfill(2)
    day = match.group('day').zfill(2)
    time = match.group('time') or ''
    return f'{prefix}{year}年{month}月{day}日{time}'


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('input', type=Path)
    ap.add_argument('output', type=Path)
    args = ap.parse_args()

    card = json.loads(args.input.read_text(encoding='utf-8'))
    entries = card['data']['character_book']['entries']
    timelines = [e for e in entries if e.get('comment', '').startswith('时间线-')]
    if len(timelines) != 9:
        raise SystemExit(f'expected 9 runtime timelines, got {len(timelines)}')

    replacements = 0
    for entry in timelines:
        before = entry['content']
        after, count = DATE_RE.subn(normalize_date, before)
        entry['content'] = after
        replacements += count
        if SPACED_DATE_RE.search(after):
            raise SystemExit(f"spaced date remains in {entry['comment']}")
        if '沙盒模式 (【最后一个原作事件之后】 - ∞)' not in after:
            raise SystemExit(f"sandbox marker changed in {entry['comment']}")

    if replacements != 473:
        raise SystemExit(f'expected 473 explicit runtime dates, got {replacements}')

    build = card['data'].setdefault('extensions', {}).setdefault('steel_build', {})
    build['timeline_date_format'] = 'compact-zh-runtime-v1'
    build['timeline_date_replacements'] = replacements
    build['timeline_date_example'] = '2007年05月21日 19:00'

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(card, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'pass': True, 'timelines': 9, 'dates_normalized': replacements}, ensure_ascii=False))


if __name__ == '__main__':
    main()
