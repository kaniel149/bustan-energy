#!/usr/bin/env python3
"""Render the installation player's seven local 20-second, 30 fps MP4s.

Residential sources retain their original 1920x1080 resolution. Other subjects
use the existing 960x540 WebP sequences. The originals contain holds and some
slide/crossfade transitions, rather than continuous physical camera motion.
Optical flow smooths available transitions; it cannot reconstruct missing motion
or remove artifacts already present in those sources. The player supplies its
own continuous camera movement. Scene-change detection limits interpolation
across abrupt changes, where inventing motion could deform the roof.

Only cinematic-*.mp4 outputs are replaced. Existing source assets stay intact.
Requires local ffmpeg/ffprobe with libx264 and the minterpolate filter.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import shutil
import subprocess
import time


ROOT = Path(__file__).resolve().parents[1]
WORK = Path('/tmp/bustan-motion-benchmark/render')
TYPES = ('concrete', 'villa', 'tropical', 'factory', 'largeroof', 'field', 'parking')
RESIDENTIAL = {'concrete', 'villa', 'tropical'}
ACT_TIMES = (0, 3, 6.5, 10.5, 15, 20)
RESIDENTIAL_ANCHORS = (0, 12, 24, 36, 56, 122)
COMMERCIAL_ANCHORS = (0, 24, 36, 60, 88, 122)


def probe(path: Path, ffprobe: str) -> dict:
    result = subprocess.check_output([
        ffprobe, '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=codec_name,width,height,pix_fmt,r_frame_rate,duration,nb_frames',
        '-show_entries', 'format=duration,size', '-of', 'json', str(path),
    ], text=True)
    return json.loads(result)


def retime_expression(source_position: str, anchors: tuple[int, ...]) -> str:
    """Map the source's 0..122 position onto the five player's narrative acts."""
    segments = []
    for start, end, start_time, end_time in zip(anchors, anchors[1:], ACT_TIMES, ACT_TIMES[1:]):
        segments.append(f'({start_time}+(({source_position})-{start})*{end_time-start_time}/{end-start})')
    expression = segments[-1]
    for index in range(len(segments) - 2, -1, -1):
        expression = f'if(lte({source_position},{anchors[index+1]}),{segments[index]},{expression})'
    return expression


def render(kind: str, ffmpeg: str, ffprobe: str, crf: int) -> dict:
    started = time.perf_counter()
    is_residential = kind in RESIDENTIAL
    output = ROOT / 'public' / 'videos' / f'cinematic-{kind}.mp4'
    temporary = WORK / f'cinematic-{kind}.mp4'
    log_path = WORK / f'{kind}.log'
    if is_residential:
        source = ROOT / 'public' / 'videos' / f'{kind}.mp4'
        source_info = probe(source, ffprobe)
        duration = float(source_info['streams'][0].get('duration') or source_info['format']['duration'])
        source_position = f'T*122/{duration:.9f}'
        input_arguments = ['-i', str(source)]
        anchors = RESIDENTIAL_ANCHORS
        dimensions = (1920, 1080)
    else:
        source = ROOT / 'public' / 'frames-smooth' / kind / '%03d.webp'
        input_arguments = ['-framerate', '123/20', '-start_number', '1', '-i', str(source)]
        source_position = 'N'
        anchors = COMMERCIAL_ANCHORS
        dimensions = (960, 540)

    expression = retime_expression(source_position, anchors)
    filters = ','.join([
        'settb=AVTB',
        f"setpts='({expression})/TB'",
        # Look-ahead frames keep minterpolate from dropping the last two source
        # frames. Output trimming below guarantees exactly 600 frames / 20s.
        'tpad=stop_mode=clone:stop_duration=1',
        'minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=fdiff:scd_threshold=4',
        'format=yuv420p',
    ])
    command = [
        ffmpeg, '-hide_banner', '-y', '-benchmark', '-filter_threads', '1',
        *input_arguments,
        '-vf', filters, '-t', '20', '-frames:v', '600', '-an',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', str(crf),
        '-threads', '2', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
        str(temporary),
    ]
    print(f'START {kind}: {dimensions[0]}x{dimensions[1]}, source {source}', flush=True)
    with log_path.open('w') as log:
        completed = subprocess.run(command, stdout=log, stderr=log)
    if completed.returncode:
        raise RuntimeError(f'{kind} failed; see {log_path}\n{log_path.read_text()[-1800:]}')

    metadata = probe(temporary, ffprobe)
    stream = metadata['streams'][0]
    valid = (
        stream['codec_name'] == 'h264'
        and stream['pix_fmt'] == 'yuv420p'
        and (stream['width'], stream['height']) == dimensions
        and stream['r_frame_rate'] == '30/1'
        and int(stream['nb_frames']) == 600
        and abs(float(metadata['format']['duration']) - 20) < .001
    )
    if not valid:
        raise RuntimeError(f'{kind} output validation failed: {metadata}')
    # Validate decoding before replacing the destination.
    subprocess.run([ffmpeg, '-v', 'error', '-i', str(temporary), '-f', 'null', '-'], check=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(temporary), str(output))
    report = {
        'type': kind,
        'output': str(output),
        'elapsed_seconds': round(time.perf_counter() - started, 3),
        'bytes': output.stat().st_size,
        'source': str(source),
        'source_frame_anchors': anchors,
        'act_times_seconds': ACT_TIMES,
        'metadata': metadata,
        'command': command,
    }
    (WORK / f'{kind}.json').write_text(json.dumps(report, indent=2))
    print(f"DONE {kind}: {report['elapsed_seconds']}s, {report['bytes']:,} bytes, {output}", flush=True)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--types', nargs='+', choices=TYPES, default=list(TYPES))
    parser.add_argument('--jobs', type=int, choices=(1, 2), default=2)
    parser.add_argument('--crf', type=int, choices=(20, 21, 22), default=21)
    args = parser.parse_args()
    ffmpeg = shutil.which('ffmpeg')
    ffprobe = shutil.which('ffprobe')
    if not ffmpeg or not ffprobe:
        parser.error('ffmpeg and ffprobe must be installed locally')
    WORK.mkdir(parents=True, exist_ok=True)
    started = time.perf_counter()
    reports = []
    with ThreadPoolExecutor(max_workers=args.jobs) as executor:
        futures = {executor.submit(render, kind, ffmpeg, ffprobe, args.crf): kind for kind in dict.fromkeys(args.types)}
        for future in as_completed(futures):
            reports.append(future.result())
    print(json.dumps({'elapsed_seconds': round(time.perf_counter() - started, 3), 'outputs': [report['output'] for report in reports]}, indent=2))


if __name__ == '__main__':
    main()
