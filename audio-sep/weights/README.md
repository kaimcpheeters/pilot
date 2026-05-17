# BandIt weights

`process.sh` expects:

| File | Purpose | Tracked? |
|------|---------|----------|
| `config_dnr_bandit_bsrnn_multi_mus64.yaml` | model config | yes |
| `model_bandit_plus_dnr_sdr_11.47.chpt`     | checkpoint (~148 MB) | no — fetch below |

## Fetching the checkpoint

The checkpoint is published by ZFTurbo alongside the MSS repo. From the
[Music-Source-Separation-Training releases](https://github.com/ZFTurbo/Music-Source-Separation-Training/releases)
page, grab `model_bandit_plus_dnr_sdr_11.47.chpt` and drop it next to this
README.

After download, `process.sh` will pick it up automatically.
