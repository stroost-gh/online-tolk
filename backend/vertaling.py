"""Lokale machinevertaling met NLLB-200.

Het model wordt eenmalig (bij de eerste keer) van Hugging Face gedownload en
daarna lokaal gecachet; tijdens een gesprek gaat er niets naar het internet.
"""

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from config import NLLB_MODEL

# Onze taalcodes -> de FLORES-200-codes die NLLB verwacht.
NLLB_TAAL = {
    "nl": "nld_Latn",
    "en": "eng_Latn",
    "de": "deu_Latn",
    "pl": "pol_Latn",
    "ar": "arb_Arab",
    "fr": "fra_Latn",
    "es": "spa_Latn",
    "pt": "por_Latn",
    "it": "ita_Latn",
    "uk": "ukr_Cyrl",
}


class Vertaling:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.tokenizer = AutoTokenizer.from_pretrained(NLLB_MODEL)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(NLLB_MODEL).to(self.device)

    def vertaal(self, tekst: str, bron: str, doel: str) -> str:
        tekst = tekst.strip()
        if not tekst or bron == doel or bron not in NLLB_TAAL or doel not in NLLB_TAAL:
            return tekst

        self.tokenizer.src_lang = NLLB_TAAL[bron]
        invoer = self.tokenizer(
            tekst, return_tensors="pt", truncation=True, max_length=256
        ).to(self.device)
        uitvoer = self.model.generate(
            **invoer,
            forced_bos_token_id=self.tokenizer.convert_tokens_to_ids(NLLB_TAAL[doel]),
            max_length=256,
            num_beams=1,
        )
        return self.tokenizer.batch_decode(uitvoer, skip_special_tokens=True)[0]
