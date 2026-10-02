#!/usr/bin/env python3
"""
Pre-record Pip's voice: every line in tools/voice-lines.json -> audio/voice/<hash>.mp3
using Piper TTS (offline neural TTS) with the en_US "kristin" voice.

  Voice model: rhasspy/piper-voices  en/en_US/kristin/medium
  Dataset: LibriVox recordings (public domain), trained from scratch by Bryce Beattie.
  See audio/voice/LICENSE.md.

Setup (once):
  python3 -m venv .venv-tts && .venv-tts/bin/pip install piper-tts
  curl -L -o en_US-kristin-medium.onnx      https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/kristin/medium/en_US-kristin-medium.onnx
  curl -L -o en_US-kristin-medium.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/kristin/medium/en_US-kristin-medium.onnx.json
Run:
  node tools/voice-lines.mjs && .venv-tts/bin/python tools/make-voice.py --model /path/en_US-kristin-medium.onnx
Needs ffmpeg (libmp3lame). Unchanged lines are skipped; stale clips are removed.

Quality check (--qa, needs `pip install faster-whisper`): every clip is transcribed
with Whisper; if it doesn't match the text well, the line is re-synthesized (Piper
is slightly random) up to --tries times and the best take is kept.
"""
import argparse, json, os, re, subprocess, tempfile, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audio' / 'voice'
LINES = ROOT / 'tools' / 'voice-lines.json'

# Spoken-form fixes for the TTS (the on-screen text stays the same).
SAY_AS = [
    (r'PlayQuest', 'Play Quest'),
    (r'\bLOC(\d\d)', r'location \1'),
    (r'’', "'"),
]

def synth(voice, cfg, say, dst, bitrate):
    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / 'a.wav'
        with wave.open(str(wav), 'wb') as w:
            voice.synthesize_wav(say, w, syn_config=cfg)
        # 60 ms lead-in (Piper starts abruptly), trim trailing silence, gentle EQ for small
        # phone speakers, loudness-normalize, mono 22.05 kHz MP3
        af = ('adelay=60,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,'
              'highpass=f=90,equalizer=f=3000:t=q:w=1.2:g=2,'
              'loudnorm=I=-16:TP=-1.5:LRA=11,aresample=22050')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav), '-af', af, '-ac', '1', '-ar', '22050',
                        '-codec:a', 'libmp3lame', '-b:a', bitrate, str(dst)], check=True)

def spoken(text):
    t = text
    if re.fullmatch(r'\d', t):  # number-pad keys
        return NUM[t].capitalize() + '!'
    for a, b in SAY_AS:
        t = re.sub(a, b, t)
    # ALL-CAPS words (HIGH, LOW, GO) would be spelled out: make them normal words
    t = re.sub(r'\b([A-Z]{2,})\b', lambda m: m.group(1).capitalize(), t)
    return t

NUM = {str(i): w for i, w in enumerate('zero one two three four five six seven eight nine ten'.split())}

def words(t):
    t = t.lower().replace('’', "'").replace("'", '').replace('-', ' ')
    t = re.sub(r'\b(10|[0-9])\b', lambda m: NUM[m.group(1)], t)
    return re.sub(r'[^a-z ]', ' ', t).split()

class QA:
    def __init__(self, model='base.en'):
        from faster_whisper import WhisperModel
        import numpy as np
        self.np = np
        self.m = WhisperModel(model, device='cpu', compute_type='int8')
    def score(self, path, text):
        from difflib import SequenceMatcher
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'], capture_output=True).stdout
        segs, _ = self.m.transcribe(self.np.frombuffer(raw, self.np.float32), beam_size=1, language='en')
        got = ' '.join(s.text for s in segs)
        a, b = words(text), words(got)
        r = SequenceMatcher(None, a, b).ratio()
        if a and b and a[0] != b[0]:
            r -= 0.15  # a lost first sound ("Power" -> "How are") is the typical Piper glitch
        return r, got.strip()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', default='/workspace/piper-voices/en_US-kristin-medium.onnx')
    ap.add_argument('--length-scale', type=float, default=1.06)  # a touch slower for kids
    ap.add_argument('--bitrate', default='32k')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--qa', action='store_true', help='Whisper check + retake (needs faster-whisper)')
    ap.add_argument('--tries', type=int, default=4)
    ap.add_argument('--asr-model', default='small.en')
    args = ap.parse_args()

    from piper import PiperVoice, SynthesisConfig
    voice = PiperVoice.load(args.model)
    cfg = SynthesisConfig(length_scale=args.length_scale, noise_scale=0.55, noise_w_scale=0.8)

    OUT.mkdir(parents=True, exist_ok=True)
    lines = json.loads(LINES.read_text())
    mpath = OUT / 'manifest.json'
    old = json.loads(mpath.read_text()) if mpath.exists() else {'clips': {}, 'texts': {}}
    clips, texts = {}, {}
    made = 0
    qa = QA(args.asr_model) if args.qa else None
    report = []
    for item in lines:
        h, text = item['hash'], item['text']
        say = spoken(text)
        fname = f'{h}.mp3'
        dst = OUT / fname
        if not args.force and dst.exists() and old.get('texts', {}).get(h) == say and h in old.get('clips', {}):
            clips[h] = old['clips'][h]; texts[h] = say
            continue
        best = None
        for attempt in range(args.tries if qa else 1):
            cand = OUT / f'.{h}.{attempt}.mp3'
            synth(voice, cfg, say, cand, args.bitrate)
            sc, heard = qa.score(cand, text) if qa else (1.0, '')
            if best is None or sc > best[0]:
                if best: best[1].unlink(missing_ok=True)
                best = (sc, cand, heard)
            else:
                cand.unlink(missing_ok=True)
            if sc >= 0.92:
                break
        best[1].replace(dst)
        if qa: report.append((round(best[0], 2), text, best[2]))
        dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(dst)],
                                   capture_output=True, text=True).stdout.strip() or 0)
        clips[h] = [fname, int(dur * 1000)]
        texts[h] = say
        made += 1
    if qa:
        low = sorted(r for r in report if r[0] < 0.85)
        print(f'QA: {len(report)} checked, {len(low)} below 0.85 (often just ASR mishearing names):')
        for r in low: print('  ', r)
    # remove clips that are no longer used
    for f in OUT.glob('*.mp3'):
        if f.stem not in clips:
            f.unlink()
    manifest = {
        'voice': 'Piper TTS · en_US-kristin-medium',
        'license': 'Voice model trained on public-domain LibriVox data; see audio/voice/LICENSE.md',
        'count': len(clips),
        'clips': clips,
        'texts': texts,
    }
    mpath.write_text(json.dumps(manifest, separators=(',', ':')))
    total = sum((OUT / c[0]).stat().st_size for c in clips.values())
    print(f'{made} new clips, {len(clips)} total, {total/1024/1024:.2f} MB, {sum(c[1] for c in clips.values())/1000:.0f}s of audio')

if __name__ == '__main__':
    main()
