"""Rebuilds the anti-spoofing models in models/face/ from their original PyTorch weights,
and tidies sface.onnx. Only needed to check or redo that work; the site uses the
.onnx files already in models/face/.

Needs Python 3, PyTorch, onnx, onnxruntime and opencv-python, and a copy of
https://github.com/minivision-ai/Silent-Face-Anti-Spoofing:

    pip install torch onnx onnxruntime opencv-python-headless numpy
    git clone https://github.com/minivision-ai/Silent-Face-Anti-Spoofing
    python scripts/convert-face-models.py Silent-Face-Anti-Spoofing models/face

For each model it prints the PyTorch and ONNX outputs on the repository's sample
pictures (two fakes, one real face), which must match.
"""
import os
import sys

import cv2
import numpy as np
import onnx
import onnxruntime as ort
import torch

repo, out_dir = sys.argv[1], sys.argv[2]
sys.path.insert(0, repo)
from src.generate_patches import CropImage  # noqa: E402
from src.model_lib.MiniFASNet import MiniFASNetV1SE, MiniFASNetV2  # noqa: E402
from src.utility import get_kernel, parse_model_name  # noqa: E402

MODELS = {
    'minifasnet_v2': ('2.7_80x80_MiniFASNetV2.pth', MiniFASNetV2),
    'minifasnet_v1se': ('4_0_0_80x80_MiniFASNetV1SE.pth', MiniFASNetV1SE),
}
detector = cv2.FaceDetectorYN.create(os.path.join(out_dir, 'yunet.onnx'), '', (320, 320), 0.8)


def face_box(img):
    h, w = img.shape[:2]
    detector.setInputSize((w, h))
    _, faces = detector.detect(img)
    f = faces[np.argmax(faces[:, 2] * faces[:, 3])]
    return [int(round(v)) for v in f[:4]]


for name, (weights, cls) in MODELS.items():
    h, w, _, scale = parse_model_name(weights)
    model = cls(conv6_kernel=get_kernel(h, w))
    state = torch.load(os.path.join(repo, 'resources/anti_spoof_models', weights), map_location='cpu', weights_only=False)
    model.load_state_dict({k[7:] if k.startswith('module.') else k: v for k, v in state.items()})
    model.eval()
    path = os.path.join(out_dir, f'{name}.onnx')
    torch.onnx.export(model, torch.rand(1, 3, h, w) * 255, path, input_names=['input'],
                      output_names=['logits'], opset_version=13, dynamo=False)
    onnx.checker.check_model(onnx.load(path))

    session = ort.InferenceSession(path)
    for sample in ['image_F1.jpg', 'image_F2.jpg', 'image_T1.jpg']:
        img = cv2.imread(os.path.join(repo, 'images/sample', sample))
        crop = CropImage().crop(img, face_box(img), scale, w, h, True)
        x = torch.from_numpy(crop.transpose(2, 0, 1)).float().unsqueeze(0)
        with torch.no_grad():
            expected = torch.softmax(model(x), 1).numpy()
        logits = session.run(None, {'input': x.numpy()})[0]
        got = np.exp(logits - logits.max()) / np.exp(logits - logits.max()).sum()
        print(f'{name} {sample}: pytorch {np.round(expected, 4)} onnx {np.round(got, 4)} '
              f'max difference {float(np.abs(expected - got).max()):.1e}')

# sface.onnx: drop weights that are also listed as graph inputs.
sface = os.path.join(out_dir, 'sface.onnx')
m = onnx.load(sface)
weights = {i.name for i in m.graph.initializer}
inputs = [i for i in m.graph.input if i.name not in weights]
if len(inputs) != len(m.graph.input):
    del m.graph.input[:]
    m.graph.input.extend(inputs)
    onnx.save(m, sface)
    print('sface.onnx: removed weights from the graph inputs')
