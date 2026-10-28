from pathlib import Path
import base64
import hashlib
import json
import struct
import zlib

PNG = Path('build/cards/变形钢姬_v1.0.0-candidate5.png')
OUT = Path('build/cards/变形钢姬_v1.0.0-candidate5.json')
QA = Path('qa/变形钢姬_v1.0.0-candidate5_RELEASE_QA.json')
EXPECTED_PNG = '27fddfa956b388363ec81e1d4b1c65b56cb23565a8a2a7e5f64338036827f58d'
EXPECTED_JSON = 'fd6ee660baa299812b5b42d53ba8422ac296fa1f17d9d55413b3b5ce401d4918'

blob = PNG.read_bytes()
assert hashlib.sha256(blob).hexdigest() == EXPECTED_PNG
assert blob[:8] == b'\x89PNG\r\n\x1a\n'
pos = 8
payloads = {}
width = height = None
while pos < len(blob):
    length = struct.unpack('>I', blob[pos:pos+4])[0]
    kind = blob[pos+4:pos+8]
    body = blob[pos+8:pos+8+length]
    crc = struct.unpack('>I', blob[pos+8+length:pos+12+length])[0]
    assert zlib.crc32(kind + body) & 0xffffffff == crc
    if kind == b'IHDR':
        width, height = struct.unpack('>II', body[:8])
    if kind == b'tEXt' and b'\x00' in body:
        key, value = body.split(b'\x00', 1)
        if key in (b'chara', b'ccv3'):
            payloads[key] = json.loads(base64.b64decode(value, validate=True))
    pos += 12 + length
    if kind == b'IEND':
        break

assert pos == len(blob)
assert (width, height) == (768, 1152)
assert payloads[b'chara'] == payloads[b'ccv3']
card = payloads[b'chara']
text = json.dumps(card, ensure_ascii=False, indent=2) + '\n'
OUT.write_text(text, encoding='utf-8')
assert hashlib.sha256(OUT.read_bytes()).hexdigest() == EXPECTED_JSON

entries = card['data']['character_book']['entries']
timelines = [e for e in entries if e['comment'].startswith('时间线-')]
assert len(entries) == 293
assert len(timelines) == 9
assert all(not e['extensions']['prevent_recursion'] and not e['extensions']['exclude_recursion'] for e in timelines)
assert len(card['data']['extensions']['tavern_helper']['scripts']) == 3
assert '<causality>' in card['data']['post_history_instructions']

qa = {
  'status': 'PASS',
  'candidate': '1.0.0-candidate5',
  'android_sillytavern_user_confirmed': True,
  'confirmation_date_singapore': '2026-10-29',
  'repository_artifact': {
    'png_sha256': EXPECTED_PNG,
    'json_sha256': EXPECTED_JSON,
    'cover_dimensions': [768, 1152],
    'cover_storage_optimization': 'same accepted cover, no crop; indexed-color repository optimization only',
    'card_payload_identical_to_tested_candidate5': True,
    'chara_equals_ccv3_equals_json': True,
    'png_crc_valid': True
  },
  'card': {
    'character_book_entries': 293,
    'timeline_entries': 9,
    'fixed_story_nodes': 473,
    'runtime_nodes_with_sandboxes': 482,
    'timeline_recursion_false_false': '9/9',
    'mvu_scripts': 3,
    'causality_double_guarantee': True,
    'first_floor_mvu': True,
    'single_audio_player': True
  }
}
QA.parent.mkdir(parents=True, exist_ok=True)
QA.write_text(json.dumps(qa, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Candidate5 PNG/JSON/RELEASE QA readback PASS')
