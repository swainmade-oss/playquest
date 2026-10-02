# Pip's voice clips (audio/voice/*.mp3)

All clips were generated offline on the build machine with **Piper TTS**
(https://github.com/rhasspy/piper / OHF-Voice piper1) using the voice model
**en_US-kristin-medium** from https://huggingface.co/rhasspy/piper-voices
(repository license: MIT).

- Voice model card: dataset = LibriVox.org recordings, **License: public domain**;
  "Trained from scratch on medium quality settings" by Bryce Beattie
  (https://brycebeattie.com/files/tts/ — "Kristin … License: public domain").
  It is not fine-tuned from the research-only "lessac" voice.
- The clips are synthesized speech of PlayQuest's own narration text. No third-party
  recordings are included. Piper itself is a tool; its license does not apply to its output.

How they're made: `tools/voice-lines.mjs` lists every line the app can say,
`tools/make-voice.py` synthesizes each one (length_scale 1.06), trims silence, adds a
gentle presence EQ, loudness-normalizes to −16 LUFS and encodes mono 22.05 kHz 32 kbps MP3.
With `--qa` every clip is transcribed with Whisper (faster-whisper small.en) and
re-synthesized up to 4× if it doesn't match the text.

`manifest.json` maps hash(normalized text) → file + duration (see js/core/textkey.js).
