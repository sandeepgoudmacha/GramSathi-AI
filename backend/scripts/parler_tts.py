#!/usr/bin/env python3
import sys
import json
import io
import traceback

def err(msg):
    sys.stderr.write(msg + "\n")
    sys.exit(1)

def main():
    try:
        data = None
        if not sys.stdin.isatty():
            raw = sys.stdin.read()
            if raw:
                data = json.loads(raw)
        # fallback to args
        if data is None:
            import argparse
            p = argparse.ArgumentParser()
            p.add_argument('--text', required=True)
            p.add_argument('--description', default='')
            p.add_argument('--speaker', default='')
            args = p.parse_args()
            data = {'text': args.text, 'description': args.description, 'speaker': args.speaker}

        text = data.get('text') or ''
        description = data.get('description') or ''
        speaker = data.get('speaker') or None
        if not text:
            err('No text provided')

        # Import heavy libs lazily
        import torch
        from parler_tts import ParlerTTSForConditionalGeneration
        from transformers import AutoTokenizer
        import soundfile as sf
        import numpy as np

        device = "cuda:0" if torch.cuda.is_available() else "cpu"
        model = ParlerTTSForConditionalGeneration.from_pretrained("ai4bharat/indic-parler-tts").to(device)
        tokenizer = AutoTokenizer.from_pretrained("ai4bharat/indic-parler-tts")
        description_tokenizer = AutoTokenizer.from_pretrained(model.config.text_encoder._name_or_path)

        # if speaker provided, append to description for consistency
        if speaker:
            description = (description + " ") + f"Speaker: {speaker}."
        # include language hint if provided (e.g., 'hi' -> 'Hindi')
        lang = data.get('lang') or None
        if lang:
            lang_map = {'hi':'Hindi','en':'English','te':'Telugu','ta':'Tamil','kn':'Kannada','ml':'Malayalam','bn':'Bengali','gu':'Gujarati','pa':'Punjabi','or':'Odia'}
            lname = lang_map.get(lang, lang)
            description = (description + " ") + f"Language: {lname}."

        description_input_ids = description_tokenizer(description, return_tensors="pt").to(device)
        prompt_input_ids = tokenizer(text, return_tensors="pt").to(device)

        generation = model.generate(input_ids=description_input_ids.input_ids,
                                    attention_mask=description_input_ids.attention_mask,
                                    prompt_input_ids=prompt_input_ids.input_ids,
                                    prompt_attention_mask=prompt_input_ids.attention_mask)
        audio_arr = generation.cpu().numpy().squeeze()
        sr = getattr(model.config, 'sampling_rate', 24000)

        # write WAV to stdout buffer
        bio = io.BytesIO()
        sf.write(bio, audio_arr, sr, format='WAV')
        bio.seek(0)
        # write binary to stdout
        sys.stdout.buffer.write(bio.read())
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        err('parler_tts generation failed: ' + str(e))

if __name__ == '__main__':
    main()
