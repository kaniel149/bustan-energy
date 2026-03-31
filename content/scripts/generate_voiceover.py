import os
import sys
from pathlib import Path
from elevenlabs import ElevenLabs
from elevenlabs.types import VoiceSettings

client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

def generate(script_file: str, output_name: str, voice_id: str = "pNInz6obpgDQGcFmaJgB"):
    """Generate voiceover. Default voice: Adam (English, clear, professional)"""
    script = Path(script_file).read_text()

    audio = client.text_to_speech.convert(
        text=script,
        voice_id=voice_id,
        model_id="eleven_multilingual_v2",
        voice_settings=VoiceSettings(stability=0.5, similarity_boost=0.8, speed=0.9),
    )

    out_path = Path(__file__).parent.parent / "public" / "audio" / f"{output_name}.mp3"
    with open(out_path, "wb") as f:
        for chunk in audio:
            f.write(chunk)
    print(f"Saved: {out_path}")

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        generate(sys.argv[1], sys.argv[2])
    else:
        generate("reel-01-satellite-scan.txt", "reel-01-voiceover")
