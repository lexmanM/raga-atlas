"""Pitch-contour analysis that preserves gamaka instead of quantising it."""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import numpy as np


def frequency_to_cents(frequency_hz: float, sruti_hz: float) -> float:
    """Convert one frequency to its exact, unsnapped distance above sa."""
    if sruti_hz <= 0:
        raise ValueError("sruti must be a positive frequency in Hz")
    if not math.isfinite(frequency_hz) or frequency_hz <= 0:
        return math.nan
    return 1200.0 * math.log2(frequency_hz / sruti_hz)


def hz_to_cents(f0_hz: np.ndarray, sruti_hz: float) -> np.ndarray:
    """Return the raw f0 contour in cents above sa, preserving unvoiced NaNs."""
    import numpy as np

    if sruti_hz <= 0:
        raise ValueError("sruti must be a positive frequency in Hz")
    values = np.asarray(f0_hz, dtype=float)
    result = np.full(values.shape, np.nan, dtype=float)
    voiced = np.isfinite(values) & (values > 0)
    result[voiced] = 1200.0 * np.log2(values[voiced] / sruti_hz)
    return result


def extract_f0(audio_path: Path, sruti_hz: float, *, hop_length: int = 256) -> Path:
    """Extract and cache an unsnapped pYIN contour beside an audio file."""
    import librosa

    audio, sample_rate = librosa.load(audio_path, sr=48_000, mono=True)
    f0, voiced, probability = librosa.pyin(
        audio,
        fmin=max(45.0, sruti_hz * 0.45),
        fmax=min(sample_rate / 2 - 1, sruti_hz * 4.2),
        sr=sample_rate,
        hop_length=hop_length,
    )
    cache_path = audio_path.with_suffix(".f0.npz")
    np.savez_compressed(
        cache_path,
        f0_hz=f0,
        cents=hz_to_cents(f0, sruti_hz),
        voiced=voiced,
        voiced_probability=probability,
        times=librosa.times_like(f0, sr=sample_rate, hop_length=hop_length),
        sruti_hz=float(sruti_hz),
    )
    return cache_path


@dataclass(frozen=True)
class Alignment:
    reference_frames: np.ndarray
    take_frames: np.ndarray
    cumulative_cost: float


def align_contours(reference_cents: np.ndarray, take_cents: np.ndarray) -> Alignment:
    """DTW-align two raw contours; frame slopes expose rushing and dragging."""
    import librosa
    import numpy as np

    reference = np.asarray(reference_cents, dtype=float)
    take = np.asarray(take_cents, dtype=float)
    ref_indices = np.flatnonzero(np.isfinite(reference))
    take_indices = np.flatnonzero(np.isfinite(take))
    if len(ref_indices) < 2 or len(take_indices) < 2:
        raise ValueError("both contours need at least two voiced frames")
    costs, path = librosa.sequence.dtw(X=reference[ref_indices][None, :], Y=take[take_indices][None, :], metric="euclidean")
    path = path[::-1]
    return Alignment(ref_indices[path[:, 0]], take_indices[path[:, 1]], float(costs[-1, -1]))


def timing_observations(alignment: Alignment, frame_seconds: float) -> list[dict[str, float | str]]:
    """Describe local path slope without producing a performance score."""
    observations: list[dict[str, float | str]] = []
    window = 24
    for start in range(0, len(alignment.reference_frames) - window, window):
        ref_delta = alignment.reference_frames[start + window] - alignment.reference_frames[start]
        take_delta = alignment.take_frames[start + window] - alignment.take_frames[start]
        if ref_delta <= 0:
            continue
        ratio = float(take_delta / ref_delta)
        if ratio < 0.82 or ratio > 1.18:
            observations.append({
                "at_seconds": float(alignment.take_frames[start] * frame_seconds),
                "kind": "rushed" if ratio < 0.82 else "dragged",
                "tempo_ratio": ratio,
            })
    return observations
