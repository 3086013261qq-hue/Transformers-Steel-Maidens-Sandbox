from __future__ import annotations
import argparse, json, re, hashlib
from pathlib import Path

SECTION_SPECS = [
    ("记忆相关", 600, 551),
    ("输出规则", 550, 451),
    ("核心规则", 450, 401),
    ("核心设定", 400, 301),
    ("主要角色", 300, 201),
    ("其他角色", 200, 101),
    ("地点", 100, 1),
]

HUMAN_SHORT = {
    "H01":["山姆"],"H02":["米凯拉"],"H03":["伦诺克斯"],"H04":["埃普斯"],"H05":["西蒙斯"],
    "H06":["罗恩"],"H07":["朱迪"],"H08":["玛吉"],"H09":["格伦"],"H10":["凯勒"],"H11":["里奥"],
    "H12":["加洛韦"],"H13":["莫肖尔"],"H14":["卡莉"],"H15":["迪伦"],"H16":["米琳"],
    "H17":["凯德"],"H18":["泰莎"],"H19":["谢恩"],"H20":["约书亚"],"H21":["阿汀格"],
    "H22":["萨沃伊"],"H23":["达茜"],"H24":["月明"],"H25":["伯顿","伯顿爵士"],
    "H26":["维维安"],"H27":["伊莎贝拉"],"H28":["桑托斯"]
}

TIMELINE_TITLES = {
    "MAIN01_movie-01_Transformers-2007.md":"MAIN01-第一卷《Transformers》",
    "MAIN02A_movie-02_Revenge-of-the-Fallen-2009_upper.md":"MAIN02A-第二卷（上）《卷土重来》",
    "MAIN02B_movie-02_Revenge-of-the-Fallen-2009_lower.md":"MAIN02B-第二卷（下）《卷土重来》",
    "MAIN03A_movie-03_Dark-of-the-Moon-2012_upper.md":"MAIN03A-第三卷（上）《月黑之时》",
    "MAIN03B_movie-03_Dark-of-the-Moon-2012_lower.md":"MAIN03B-第三卷（下）《月黑之时》",
    "MAIN04A_movie-04_Age-of-Extinction-2017_upper.md":"MAIN04A-第四卷（上）《绝迹重生》",
    "MAIN04B_movie-04_Age-of-Extinction-2017_lower.md":"MAIN04B-第四卷（下）《绝迹重生》",
    "MAIN05A_movie-05_The-Last-Knight-2022_upper.md":"MAIN05A-第五卷（上）《最后的骑士》",
    "MAIN05B_movie-05_The-Last-Knight-2022_lower.md":"MAIN05B-第五卷（下）《最后的骑士》",
}
TIMELINE_ORDER = list(TIMELINE_TITLES)

BAD_EXTENSION_ALIASES = {
    "preventRecursion","excludeRecursion","displayIndex","scanDepth","caseSensitive","matchWholeWords",
    "delayUntilRecursion","groupOverride","groupWeight","useGroupScoring","automationId","outletName",
    "matchPersonaDescription","matchCharacterDescription","matchCharacterPersonality","matchCharacterDepthPrompt",
    "matchScenario","matchCreatorNotes","ignoreBudget"
}

ENGINEERING_TOKENS = ["# BLUE", "# GREEN", "> 灯色", "> 上位蓝灯", "> 职责", "<!-- source:", "<!-- runtime-volume:", "<!-- date-policy:"]


def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8").replace("\r\n","\n").replace("\r","\n")

def js_escape(s: str) -> str:
    # Escape JS regex metacharacters except hyphen (safe outside character classes).
    return re.sub(r'([\\.^$|?*+()\[\]{}\/])', r'\\\1', s)

def uniq(seq):
    out=[]; seen=set()
    for x in seq:
        x=x.strip()
        if x and x not in seen:
            seen.add(x); out.append(x)
    return out

def story_regex(aliases):
    a=uniq(aliases)
    return r"/<story_scene>[\s\S]*?(?:" + "|".join(js_escape(x) for x in a) + r")[\s\S]*?<\/story_scene>/s"

def status_exact_regex(aliases):
    a=uniq(aliases)
    # Exact current-location field value. Still uses the fullstack <status>/当前位置 trigger surface,
    # while preventing parent location names from also matching child locations.
    return r"/<status>[\s\S]*?当前位置:\s*(?:" + "|".join(js_escape(x) for x in a) + r")\s*(?=\n|<)[\s\S]*?<\/status>/s"

def strip_setting_source(text: str, name: str) -> str:
    text=text.strip()
    if text.startswith("<核心设定:"):
        return text
    lines=text.splitlines()
    i=0
    # Strip only the leading engineering header block, not legitimate markdown inside the body.
    while i < len(lines):
        s=lines[i].strip()
        if not s or s.startswith("# BLUE") or s.startswith("# GREEN") or s.startswith(">"):
            i += 1
            continue
        break
    body="\n".join(lines[i:]).strip()
    return f"<核心设定:{name}>\n{body}\n</核心设定:{name}>"

def strip_timeline_source(text: str) -> str:
    m=re.search(r"(?m)^<world_timeline>\s*$[\s\S]*?^</world_timeline>\s*$", text)
    if not m:
        raise ValueError("timeline lacks <world_timeline>")
    return m.group(0).strip()

def convert_location_source(text: str, fallback_name: str) -> tuple[str,str]:
    text=text.strip()
    m=re.fullmatch(r"<核心设定:(.+?)>\s*([\s\S]*?)\s*</核心设定:\1>", text)
    if m:
        name=m.group(1).strip(); body=m.group(2).strip()
    else:
        m2=re.fullmatch(r"<地点:(.+?)>\s*([\s\S]*?)\s*</地点:\1>", text)
        if m2:
            name=m2.group(1).strip(); body=m2.group(2).strip()
            if body.startswith("介绍:"):
                return text, name
        else:
            name=fallback_name; body=text
    return f"<地点:{name}>\n介绍:\n{body}\n</地点:{name}>", name

def parse_humans(md: str):
    rows=[]
    for line in md.splitlines():
        if not line.startswith("| H"):
            continue
        cols=[c.strip() for c in line.strip().strip("|").split("|")]
        if len(cols)>=5:
            rows.append({"id":cols[0],"name":cols[1],"en":cols[2]})
    return rows

def parse_location_aliases(md: str):
    d={}
    for line in md.splitlines():
        if not line.startswith("| LOC-"):
            continue
        cols=[c.strip() for c in line.strip().strip("|").split("|")]
        if len(cols) < 5: continue
        id_, name, typ, movie = cols[:4]
        ticks=re.findall(r'`([^`]+)`', line)
        aliascol=ticks[-1] if ticks else "|".join(cols[4:])
        aliases=[]
        for token in aliascol.split("|"):
            token=token.strip().strip('`').strip()
            if token: aliases.append(token)
        aliases=uniq([name]+aliases)
        d[id_]={"name":name,"aliases":aliases}
    return d

def ext(position=1, depth=4, display_index=0, prevent=True, exclude=False, scan_depth=2):
    return {
      "selectiveLogic":0,
      "position":position,
      "depth":depth,
      "role":0,
      "match_whole_words":True,
      "probability":100,
      "useProbability":True,
      "sticky":0,
      "cooldown":0,
      "delay":0,
      "prevent_recursion":prevent,
      "exclude_recursion":exclude,
      "delay_until_recursion":False,
      "group":"",
      "group_override":False,
      "group_weight":100,
      "use_group_scoring":False,
      "scan_depth":scan_depth,
      "case_sensitive":False,
      "automation_id":"",
      "vectorized":False,
      "display_index":display_index,
      "outlet_name":"",
      "match_persona_description":False,
      "match_character_description":False,
      "match_character_personality":False,
      "match_character_depth_prompt":False,
      "match_scenario":False,
      "match_creator_notes":False,
      "triggers":[],
      "ignore_budget":False
    }

def make_entry(*, comment, content, order, constant, selective, enabled=True, position="after_char", keys=None,
               prevent=True, exclude=False, depth=4, scan_depth=2):
    pos_code = 4 if position=="at_depth" else 1
    return {
      "id":0,
      "keys":keys or [],
      "secondary_keys":[],
      "comment":comment,
      "content":content,
      "constant":constant,
      "selective":selective,
      "insertion_order":order,
      "enabled":enabled,
      "position":position,
      "use_regex":True,
      "extensions":ext(position=pos_code, depth=depth, display_index=0, prevent=prevent, exclude=exclude, scan_depth=scan_depth)
    }

def marker(section, start, order):
    suffix="起始" if start else "结尾"
    return make_entry(comment=f"【{section}:{suffix}】", content="", order=order, constant=True, selective=True,
                      prevent=True, exclude=False)

def sha256_text(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest()

def build(root: Path, outdir: Path, source_head: str):
    settings_manifest=json.loads(read_text(root/'manifest/worldbook-settings-lights.v2.2.json'))
    char_map=json.loads(read_text(root/'manifest/character-name-replacements.v1.json'))
    human_rows=parse_humans(read_text(root/'docs/004_变形钢姬_人类NPC总名册_v1.0.md'))
    location_map=parse_location_aliases(read_text(root/'docs/005_变形钢姬_地点总名册_v0.1.md'))
    char_alias={x['id']:uniq([x['au_name'], *x.get('zh',[]), *x.get('en',[])]) for x in char_map['entries']}
    char_name={x['id']:x['au_name'] for x in char_map['entries']}
    human_alias={x['id']:uniq([x['name'],x['en'],*HUMAN_SHORT.get(x['id'],[])]) for x in human_rows}

    entries=[]; source_records=[]
    # Section 1: memory markers only.
    entries += [marker("记忆相关",True,600), marker("记忆相关",False,551)]
    # Section 2: output rules + timelines.
    entries.append(marker("输出规则",True,550))
    for idx,fn in enumerate(TIMELINE_ORDER):
        p=root/'timeline/fullstack'/fn
        content=strip_timeline_source(read_text(p))
        e=make_entry(comment=f"时间线-{TIMELINE_TITLES[fn]}(多选一)", content=content, order=470-idx,
                     constant=True, selective=False, enabled=(idx==0), position="at_depth", keys=[],
                     prevent=True, exclude=True, depth=0, scan_depth=2)
        entries.append(e); source_records.append((e['comment'],p.relative_to(root).as_posix(),sha256_text(content)))
    entries.append(marker("输出规则",False,451))
    # Empty core rules markers.
    entries += [marker("核心规则",True,450), marker("核心规则",False,401)]
    # Core settings.
    entries.append(marker("核心设定",True,400))
    blue=settings_manifest['blue_entries']
    green=settings_manifest['active_green_entries']
    assert len(blue)==9 and len(green)==46
    for idx,item in enumerate(blue):
        p=root/item['path']
        name=p.stem.split('_',1)[1]
        content=strip_setting_source(read_text(p),name)
        e=make_entry(comment=f"核心设定:{name}", content=content, order=398-idx,
                     constant=True, selective=False, keys=[], prevent=True, exclude=False)
        entries.append(e); source_records.append((e['comment'],p.relative_to(root).as_posix(),sha256_text(content)))
    for idx,item in enumerate(green):
        p=root/item['path']; name=p.stem.split('_',1)[1]
        content=strip_setting_source(read_text(p),name)
        key=story_regex(item['keywords'])
        e=make_entry(comment=f"核心设定:{name}", content=content, order=389-idx,
                     constant=False, selective=True, keys=[key], prevent=True, exclude=True)
        entries.append(e); source_records.append((e['comment'],p.relative_to(root).as_posix(),sha256_text(content)))
    # Ability entries: exact same owner regex as character, grouped 3/order to stay in core-setting range.
    ability_files=sorted([p for p in (root/'worldbook/abilities').glob('*.md') if p.name!='.gitkeep'])
    assert len(ability_files)==69
    for idx,p in enumerate(ability_files):
        id_=p.stem.split('_',1)[0]
        name=char_name[id_]
        content=read_text(p).strip()
        e=make_entry(comment=f"核心设定:{name}·能力", content=content, order=343-(idx//3),
                     constant=False, selective=True, keys=[story_regex(char_alias[id_])], prevent=True, exclude=True)
        entries.append(e); source_records.append((e['comment'],p.relative_to(root).as_posix(),sha256_text(content)))
    entries.append(marker("核心设定",False,301))
    # Main A characters.
    entries.append(marker("主要角色",True,300))
    main_files=sorted([p for p in (root/'worldbook/characters/main').glob('*.md') if p.name!='.gitkeep'])
    assert len(main_files)==24
    for idx,p in enumerate(main_files):
        id_=p.stem.split('_',1)[0]; name=char_name[id_]
        content=read_text(p).strip()
        e=make_entry(comment=f"角色:{name}", content=content, order=299-idx, constant=False, selective=True,
                     keys=[story_regex(char_alias[id_])], prevent=True, exclude=True)
        entries.append(e); source_records.append((e['comment'],p.relative_to(root).as_posix(),sha256_text(content)))
    entries.append(marker("主要角色",False,201))
    # Other cyber + human.
    entries.append(marker("其他角色",True,200))
    other_files=sorted([p for p in (root/'worldbook/characters/other').glob('*.md') if p.name!='.gitkeep'])
    human_files=sorted([p for p in (root/'worldbook/characters/human').glob('*.md') if p.name!='.gitkeep'])
    assert len(other_files)==45 and len(human_files)==28
    oi=0
    for p in other_files:
        id_=p.stem.split('_',1)[0]; name=char_name[id_]
        content=read_text(p).strip()
        e=make_entry(comment=f"角色:{name}", content=content, order=199-oi, constant=False, selective=True,
                     keys=[story_regex(char_alias[id_])], prevent=True, exclude=True)
        oi+=1; entries.append(e); source_records.append((e['comment'],p.relative_to(root).as_posix(),sha256_text(content)))
    human_by_id={x['id']:x for x in human_rows}
    for p in human_files:
        id_=p.stem.split('_',1)[0]; name=human_by_id[id_]['name']
        content=read_text(p).strip()
        e=make_entry(comment=f"角色:{name}", content=content, order=199-oi, constant=False, selective=True,
                     keys=[story_regex(human_alias[id_])], prevent=True, exclude=True)
        oi+=1; entries.append(e); source_records.append((e['comment'],p.relative_to(root).as_posix(),sha256_text(content)))
    entries.append(marker("其他角色",False,101))
    # Locations.
    entries.append(marker("地点",True,100))
    loc_files=sorted([p for p in (root/'worldbook/locations').glob('LOC-*.md')])
    assert len(loc_files)==39
    for idx,p in enumerate(loc_files):
        id_=p.stem.split('_',1)[0]
        fallback=location_map[id_]['name']
        content,name=convert_location_source(read_text(p),fallback)
        aliases=location_map[id_]['aliases']
        e=make_entry(comment=f"地点:{name}", content=content, order=99-idx, constant=False, selective=True,
                     keys=[status_exact_regex(aliases)], prevent=True, exclude=True)
        entries.append(e); source_records.append((e['comment'],p.relative_to(root).as_posix(),sha256_text(content)))
    entries.append(marker("地点",False,1))

    # Final IDs / display order.
    for i,e in enumerate(entries, start=1):
        e['id']=i
        e['extensions']['display_index']=i-1

    book={"name":"变形钢姬｜咩咩全栈世界书","entries":entries}

    # QA
    failures=[]
    def check(cond,msg):
        if not cond: failures.append(msg)
    check(len(entries)==283, f"entry count {len(entries)} != 283")
    triggered=[e for e in entries if not e['constant']]
    blue_runtime=[e for e in entries if e['comment'].startswith('核心设定:') and e['constant'] and e['content']]
    timelines=[e for e in entries if e['comment'].startswith('时间线-')]
    markers=[e for e in entries if e['comment'].startswith('【')]
    check(len(triggered)==251, f"triggered count {len(triggered)} != 251")
    check(len(blue_runtime)==9, f"blue runtime {len(blue_runtime)} != 9")
    check(len(timelines)==9, f"timeline {len(timelines)} != 9")
    check(len(markers)==14, f"markers {len(markers)} != 14")
    check(sum(1 for e in timelines if e['enabled'])==1 and timelines[0]['enabled'], "timeline default enabled not MAIN01 only")
    for e in triggered:
        check(len(e['keys'])==1, f"{e['comment']}: keys != 1")
        check(e['secondary_keys']==[], f"{e['comment']}: secondary_keys nonempty")
        check(e['use_regex'] is True, f"{e['comment']}: use_regex false")
        check(e['extensions']['prevent_recursion'] is True and e['extensions']['exclude_recursion'] is True,
              f"{e['comment']}: recursion pair not both true")
    for e in blue_runtime:
        check(e['keys']==[] and e['constant'] and not e['selective'], f"{e['comment']}: blue semantics wrong")
    for e in entries:
        for bad in BAD_EXTENSION_ALIASES:
            check(bad not in e['extensions'], f"{e['comment']}: bad extension alias {bad}")
        check(e['extensions']['display_index']==e['id']-1, f"{e['comment']}: display index mismatch")
        if e['content']:
            for badtok in ENGINEERING_TOKENS:
                check(badtok not in e['content'], f"{e['comment']}: engineering token in content: {badtok}")
    # Content type counts.
    setting_contents=[e for e in entries if e['comment'].startswith('核心设定:') and '·能力' not in e['comment']]
    ability_contents=[e for e in entries if e['comment'].startswith('核心设定:') and '·能力' in e['comment']]
    char_contents=[e for e in entries if e['comment'].startswith('角色:')]
    loc_contents=[e for e in entries if e['comment'].startswith('地点:')]
    check(len(setting_contents)==55, f"settings {len(setting_contents)}")
    check(len(ability_contents)==69, f"abilities {len(ability_contents)}")
    check(len(char_contents)==97, f"characters {len(char_contents)}")
    check(len(loc_contents)==39, f"locations {len(loc_contents)}")
    for e in setting_contents: check(e['content'].startswith('<核心设定:'), f"{e['comment']}: setting tag")
    for e in ability_contents: check(e['content'].startswith('<核心设定:'), f"{e['comment']}: ability tag")
    for e in char_contents: check(re.match(r'^<[^\n]+character>',e['content']) is not None, f"{e['comment']}: character tag")
    for e in loc_contents: check(e['content'].startswith('<地点:'), f"{e['comment']}: location tag")
    for e in timelines: check(e['content'].startswith('<world_timeline>') and e['content'].endswith('</world_timeline>'), f"{e['comment']}: timeline tag")
    # Order ranges.
    for e in setting_contents + ability_contents: check(301 < e['insertion_order'] < 400, f"{e['comment']}: core order out of range")
    for e in char_contents[:24]: check(201 < e['insertion_order'] < 300, f"{e['comment']}: main order out of range")
    for e in char_contents[24:]: check(101 < e['insertion_order'] < 200, f"{e['comment']}: other order out of range")
    for e in loc_contents: check(1 < e['insertion_order'] < 100, f"{e['comment']}: location order out of range")
    for e in timelines: check(451 < e['insertion_order'] < 550 and e['position']=='at_depth' and e['extensions']['depth']==0,
                              f"{e['comment']}: timeline range/depth")
    # Location trigger collision test against every formal location name and alias.
    def js_to_py(pattern):
        assert pattern.startswith('/') and pattern.endswith('/s')
        body=pattern[1:-2].replace(r'<\/', '</')
        return re.compile(body, re.S)
    for e in loc_contents:
        rx=js_to_py(e['keys'][0])
        own_name=e['comment'].split(':',1)[1]
        own_id=next((id_ for id_,v in location_map.items() if v['name']==own_name),None)
        check(own_id is not None, f"{own_name}: location ID not found")
        for id2,v in location_map.items():
            sample=f"<status>\n当前位置: {v['name']}\n</status>"
            got=bool(rx.search(sample))
            expect=(id2==own_id)
            if got != expect:
                failures.append(f"location collision {own_name} vs {v['name']}: got={got} expect={expect}")
    # Formal name trigger tests.
    for e in char_contents:
        name=e['comment'].split(':',1)[1]
        rx=js_to_py(e['keys'][0])
        check(bool(rx.search(f"<story_scene>\n{name}走进房间。\n</story_scene>")), f"{name}: character regex misses formal name")
    for e in ability_contents:
        owner=e['comment'].split(':',1)[1].removesuffix('·能力')
        rx=js_to_py(e['keys'][0])
        check(bool(rx.search(f"<story_scene>\n{owner}准备战斗。\n</story_scene>")), f"{owner}: ability regex misses owner")
    for item in green:
        name=Path(item['path']).stem.split('_',1)[1]
        e=next(x for x in setting_contents if x['comment']==f"核心设定:{name}")
        rx=js_to_py(e['keys'][0])
        for kw in item['keywords']:
            check(bool(rx.search(f"<story_scene>\n{kw}\n</story_scene>")), f"{name}: green regex misses {kw}")

    outdir.mkdir(parents=True,exist_ok=True)
    worldbook_path=outdir/'变形钢姬_worldbook_v1.0.0.json'
    worldbook_path.write_text(json.dumps(book,ensure_ascii=False,indent=2)+"\n",encoding='utf-8')
    source_manifest={
      "schema":"transformers-steel-maidens.worldbook-assembly.v1",
      "source_head":source_head,
      "fullstack_basis":"咩咩制卡·全栈 v1.0.0 / chara_card_v3 character_book",
      "output":"build/worldbook/变形钢姬_worldbook_v1.0.0.json",
      "entry_counts":{
        "total":len(entries),"section_markers":len(markers),"timelines":len(timelines),"blue_settings":9,
        "green_settings":46,"abilities":69,"cybertronian_characters":69,"human_characters":28,"locations":39,
        "triggered_entries":len(triggered)
      },
      "policies":{
        "strip_engineering_headers":True,
        "trigger_keys":"exactly one regex in keys; secondary_keys=[]",
        "green_recursion":{"prevent_recursion":True,"exclude_recursion":True},
        "extension_naming":"ccv3 canonical snake_case; no recursion/display camelCase aliases",
        "timeline_default":"MAIN01 enabled; remaining eight disabled; manual switching only",
        "location_trigger":"single exact-current-location <status> regex to prevent parent/child collision"
      },
      "sources":[{"comment":c,"source":s,"runtime_content_sha256":h} for c,s,h in source_records],
      "qa":{"pass":not failures,"failures":failures}
    }
    (outdir/'worldbook-assembly.v1.json').write_text(json.dumps(source_manifest,ensure_ascii=False,indent=2)+"\n",encoding='utf-8')
    report=[]
    report.append('# 《变形钢姬》咩咩全栈世界书装配 QA v1.0')
    report.append('')
    report.append(f'结论：**{"PASS" if not failures else "FAIL"}**')
    report.append('')
    report.append('## 基线')
    report.append(f'- 源 HEAD：`{source_head}`')
    report.append('- 技术口径：咩咩制卡·全栈 v1.0.0 / chara_card_v3 `character_book`')
    report.append('- 世界书成品：`build/worldbook/变形钢姬_worldbook_v1.0.0.json`')
    report.append('')
    report.append('## 条目计数')
    report.append(f'- 总条目：{len(entries)}')
    report.append('- 分区起始/结尾标记：14')
    report.append('- 时间线：9（MAIN01 默认启用，其余8条默认禁用；手动切卷）')
    report.append('- 蓝灯设定：9')
    report.append('- 绿灯设定：46')
    report.append('- 角色能力：69')
    report.append('- 赛博坦角色：69')
    report.append('- 人类NPC：28')
    report.append('- 地点：39')
    report.append(f'- 触发型业务条目：{len(triggered)}')
    report.append('')
    report.append('## 三个历史坑的硬验收')
    report.append('1. **工程头禁止进正文：PASS**。运行时 `content` 不含 `# BLUE/GREEN`、`> 灯色`、`> 上位蓝灯`、`> 职责` 或时间线 HTML 工程注释。')
    report.append('2. **关键词格式：PASS**。所有触发型条目均 `keys=[单一正则]`、`secondary_keys=[]`、`use_regex=true`；角色/能力只扫 `<story_scene>`，地点只扫 `<status>` 的 `当前位置:`。')
    report.append('3. **绿灯双防递归：PASS**。全部触发型业务条目 `prevent_recursion=true` 且 `exclude_recursion=true`。')
    report.append('')
    report.append('## ccv3 字段净化')
    report.append('- extensions 使用规范字段；不存在 `preventRecursion/excludeRecursion/displayIndex/scanDepth` 等与 snake_case 同义字段并存。')
    report.append('- `display_index` 与条目数组阅读顺序逐条一致。')
    report.append('- after_char 使用 extensions.position=1；时间线 @Depth 0 使用 position=`at_depth`、extensions.position=4、depth=0。')
    report.append('')
    report.append('## 内容格式')
    report.append('- 55条设定运行时正文统一为 `<核心设定:...>...</核心设定:...>`；BLUE09原封版标签直接保留。')
    report.append('- 97条角色正文保留原人物 XML 标签，不重写人物内容。')
    report.append('- 69条能力正文保留 `<核心设定:角色·能力>`。')
    report.append('- 39条地点在装配层转换为全栈地点标签 `<地点:...>`，并保留原地点详情；追加 `介绍:` 入口字段。')
    report.append('- 9条时间线只保留完整 `<world_timeline>` 块，剥离源码 HTML 注释。')
    report.append('')
    report.append('## 地点触发冲突')
    report.append('- 地点仍采用咩咩 `<status>` / `当前位置:` 正则面；本卡进一步把当前位置字段做精确值匹配，39×39 交叉测试无父子地点误触发。')
    report.append('')
    report.append('## MVU边界')
    report.append('- 本轮只装业务世界书；MVU initvar/update/output/list 四条系统条目尚未加入，等轻量 MVU 施工时按全栈空模板原样接入，避免提前混线。')
    if failures:
        report.append(''); report.append('## FAILURES')
        report.extend(f'- {x}' for x in failures)
    (outdir/'WORLDBOOK_ASSEMBLY_v1.0_QA.md').write_text('\n'.join(report)+'\n',encoding='utf-8')
    print(json.dumps({"pass":not failures,"entries":len(entries),"triggered":len(triggered),"failures":failures[:20],"worldbook":str(worldbook_path)},ensure_ascii=False,indent=2))
    if failures: raise SystemExit(2)

if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('--repo-root',type=Path,required=True); ap.add_argument('--outdir',type=Path,required=True); ap.add_argument('--source-head',required=True)
    a=ap.parse_args(); build(a.repo_root,a.outdir,a.source_head)
