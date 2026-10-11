# Face check models

Used by the face check (`server/face/`) and, for `yunet.onnx`, by the browser
(`public/models/face/yunet.onnx` is the same file). All run with ONNX Runtime.

| File | Model | Source | Licence |
|---|---|---|---|
| `yunet.onnx` | YuNet face detector, `face_detection_yunet_2026may.onnx` (dynamic input size) | [OpenCV Zoo](https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet) | MIT — `LICENSE-YuNet-MIT.txt` |
| `sface.onnx` | SFace face recognition, `face_recognition_sface_2021dec.onnx` | [OpenCV Zoo](https://github.com/opencv/opencv_zoo/tree/main/models/face_recognition_sface) | Apache-2.0 — `LICENSE-Apache-2.0.txt` |
| `minifasnet_v2.onnx` | MiniFASNetV2, 80×80, crop scale 2.7 (`2.7_80x80_MiniFASNetV2.pth`) | [Minivision Silent-Face-Anti-Spoofing](https://github.com/minivision-ai/Silent-Face-Anti-Spoofing) | Apache-2.0 — `LICENSE-Apache-2.0.txt` |
| `minifasnet_v1se.onnx` | MiniFASNetV1SE, 80×80, crop scale 4.0 (`4_0_0_80x80_MiniFASNetV1SE.pth`) | same | Apache-2.0 |

## Changes made to the originals

- **sface.onnx** — the original lists its weights as graph inputs as well, which makes
  ONNX Runtime print hundreds of warnings and skip some optimisations. They were removed
  from the inputs (weights unchanged; outputs identical to within 2 × 10⁻⁶).
- **minifasnet_*.onnx** — converted from the PyTorch weights with
  `scripts/convert-face-models.py` (PyTorch's ONNX exporter, opset 13). On the
  repository's sample pictures, the ONNX and PyTorch outputs are equal to within 10⁻⁶.

## Inputs, as used here

| Model | Input |
|---|---|
| YuNet | `[1, 3, H, W]`, BGR, 0–255, H and W multiples of 32 (`shared/face/yunet.js`) |
| SFace | `[1, 3, 112, 112]`, RGB, 0–255, face aligned to the standard 5-point layout (`server/face/match.js`) |
| MiniFASNet | `[1, 3, 80, 80]`, BGR, 0–255, face box enlarged 2.7× / 4× (`server/face/antispoof.js`) |

## References

- Wu, W., Peng, H. & Yu, S. (2023). YuNet: A Tiny Millisecond-level Face Detector.
  *Machine Intelligence Research*, 20, 656–665.
- Zhong, Y., Deng, W., Hu, J., Zhao, D., Li, X. & Wen, D. (2021). SFace:
  Sigmoid-Constrained Hypersphere Loss for Robust Face Recognition. *IEEE Transactions on
  Image Processing*, 30, 2587–2598.
- Minivision (2020). Silent-Face-Anti-Spoofing. GitHub repository, commit b6d5f04.

## SHA-256

```
ebafce4e3c118d6554634be5c27ab333b4c047a9a8c3faf1d7cf93101c22f0f0  yunet.onnx
ae6a6ac44d2bdc87924e75fb23d8212430dd24f037f5e035c21deff99afc8b61  sface.onnx
25a9a6fc562c644d7b1afc184b3edbc9af8aed8fdd25f3da521046500e6b6b23  minifasnet_v2.onnx
6e69f782861c93e11440f84026048e883de731056aed8fa9dbd8b642e740fe23  minifasnet_v1se.onnx
```
