"""Segmentatie van de binnenkomende audiostroom.

Een segment wordt pas definitief na een aaneengesloten stilte van
STILTE_DREMPEL_SEC. Korte denkpauzes vallen daar binnen, zodat een langzame
spreker niet wordt afgekapt. Tijdens het spreken wordt periodiek voorlopige
tekst getoond.
"""

import math

import numpy as np

from config import (
    INTERIM_INTERVAL_SEC,
    MAX_SEGMENT_SEC,
    SAMPLE_RATE,
    SPRAAK_RMS_DREMPEL,
    STILTE_DREMPEL_SEC,
)


class Segmentator:
    def __init__(self):
        self.blokken: list[np.ndarray] = []
        self.stilte_sec = 0.0
        self.sinds_interim = 0.0
        self.heeft_spraak = False

    def voeg_toe(self, samples: np.ndarray) -> str | None:
        """Verwerk een audioblok. Geeft 'interim', 'definitief' of None terug."""
        if len(samples) == 0:
            return None

        duur = len(samples) / SAMPLE_RATE
        rms = math.sqrt(float(np.mean(samples * samples)))
        is_spraak = rms >= SPRAAK_RMS_DREMPEL

        if is_spraak:
            self.stilte_sec = 0.0
            self.heeft_spraak = True
            self.blokken.append(samples)
        elif self.heeft_spraak:
            # Stilte binnen een lopend segment: meenemen als korte pauze.
            self.blokken.append(samples)
            self.stilte_sec += duur

        self.sinds_interim += duur

        if not self.heeft_spraak:
            return None
        if self.stilte_sec >= STILTE_DREMPEL_SEC or self._duur() >= MAX_SEGMENT_SEC:
            return "definitief"
        if self.sinds_interim >= INTERIM_INTERVAL_SEC:
            self.sinds_interim = 0.0
            return "interim"
        return None

    def audio(self) -> np.ndarray | None:
        if not self.blokken:
            return None
        return np.concatenate(self.blokken)

    def neem_segment(self) -> np.ndarray | None:
        audio = self.audio()
        self.blokken = []
        self.stilte_sec = 0.0
        self.sinds_interim = 0.0
        self.heeft_spraak = False
        return audio

    def _duur(self) -> float:
        return sum(len(b) for b in self.blokken) / SAMPLE_RATE
