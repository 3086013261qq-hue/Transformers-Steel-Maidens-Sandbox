from pathlib import Path
import base64
import hashlib
import json
import struct
import zlib

PNG = Path('build/cards/变形钢姬_v1.0.0-candidate5.png')
OUT = Path('build/cards/变形钢姬_v1.0.0-candidate5.json')
EXPECTED_PNG = 'abaff268f612cff1b40d0d90837e20c35a27a08775fc8f4e41b032481ff61e2a'
EXPECTED_JSON = 'fd6ee660baa299812b5b42d53ba8422ac296fa1f17d9d55413b3b5ce401d4918'

blob = PNG.read_bytes()
assert hashlib.sha256(blob).hexdigest() == EXPECTED_PNG
assert blob[:8] == b'\x89PNG\r\n\x1a\n'
pos = 8
payloads = {}
while pos < len(blob):
    length = struct.unpack('>I', blob[pos:pos+4])[0]
    kind = blob[pos+4:pos+8]
    body = blob[pos+8:pos+8+length]
    crc = struct.unpack('>I', blob[pos+8+length:pos+12+length])[0]
    assert zlib.crc32(kind + body) & 0xffffffff == crc
    if kind == b'tEXt' and b'\x00' in body:
        key, value = body.split(b'\x00', 1)
        if key in (b'chara', b'ccv3'):
            payloads[key] = json.loads(base64.b64decode(value, validate=True))
    pos += 12 + length
    if kind == b'IEND':
        break

assert payloads[b'chara'] == payloads[b'ccv3']
text = json.dumps(payloads[b'chara'], ensure_ascii=False, indent=2) + '\n'
OUT.write_text(text, encoding='utf-8')
assert hashlib.sha256(OUT.read_bytes()).hexdigest() == EXPECTED_JSON
print('Candidate5 PNG/JSON readback PASS')
