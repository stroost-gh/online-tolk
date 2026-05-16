"""Lokale spraakherkenning met faster-whisper.

Het model wordt eenmalig (bij de eerste keer) van Hugging Face gedownload en
daarna lokaal gecachet; tijdens een gesprek gaat er niets naar het internet.
"""

import numpy as np
from faster_whisper import WhisperModel

from config import WHISPER_COMPUTE, WHISPER_DEVICE, WHISPER_MODEL


class Transcriptie:
    def __init__(self):
        self.model = WhisperModel(
            WHISPER_MODEL, device=WHISPER_DEVICE, compute_type=WHISPER_COMPUTE
        )

    def verwerk(
        self,
        audio: np.ndarray,
        toegestane_talen: list[str],
        geforceerde_taal: str | None = None,
    ):
        """Transcribeer een audiosegment. Geeft (tekst, taalcode) terug.

        Met geforceerde_taal (videocall-modus, waar per bron bekend is wie
        spreekt) wordt die taal gebruikt. Anders wordt de taal automatisch
        herkend en bij twijfel teruggevallen op de eerste gekozen taal.
        """
        segments, info = self.model.transcribe(
            audio,
            beam_size=1,
            language=geforceerde_taal,
            vad_filter=False,
        )
        tekst = " ".join(s.text.strip() for s in segments).strip()
        if geforceerde_taal:
            taal = geforceerde_taal
        elif info.language in toegestane_talen:
            taal = info.language
        else:
            taal = toegestane_talen[0]
        return tekst, taal
