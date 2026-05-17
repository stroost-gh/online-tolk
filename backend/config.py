# 0.0.0.0 zodat een tweede scherm (tablet/telefoon) op hetzelfde lokale
# netwerk verbinding kan maken. Het verkeer blijft binnen het LAN.
HOST = "0.0.0.0"
POORT = 8765

# Audio dat de frontend stuurt: mono PCM 16-bit op 16 kHz.
SAMPLE_RATE = 16000

# Whisper-model (lokaal). Grotere modellen = nauwkeuriger maar trager.
# tiny / base / small / medium / large-v3
# Op een gewone CPU is "base" een goede balans; "tiny" is nog sneller maar
# minder nauwkeurig, "small" nauwkeuriger maar merkbaar trager.
WHISPER_MODEL = "base"
# "int8" werkt overal (ook zonder GPU); op een GPU is "float16" sneller.
WHISPER_COMPUTE = "int8"
# "auto" kiest GPU indien beschikbaar, anders CPU.
WHISPER_DEVICE = "auto"
# Aantal CPU-kernen voor transcriptie. 0 = automatisch.
WHISPER_CPU_THREADS = 0

# Segmentatie / stiltedetectie
SPRAAK_RMS_DREMPEL = 0.012      # energie waarboven een blok als spraak telt
STILTE_DREMPEL_SEC = 0.9        # zoveel aaneengesloten stilte beeindigt een segment
INTERIM_INTERVAL_SEC = 1.2      # hoe vaak voorlopige (grijze) tekst getoond wordt
MAX_SEGMENT_SEC = 10            # harde bovengrens; lange spraak wordt eerder getoond

# Vertaalmodel (lokaal). distilled-600M is een goede balans snelheid/kwaliteit.
NLLB_MODEL = "facebook/nllb-200-distilled-600M"
