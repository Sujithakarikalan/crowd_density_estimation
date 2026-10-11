import torch.nn as nn
from torchvision.models import vgg16, VGG16_Weights


class CSRNet(nn.Module):
    """CSRNet with VGG-16 frontend and dilated-convolution backend.

    Architecture matches the trained checkpoint best_csrnet_improved.pth:
    VGG-16 features[:23] (10 conv layers) + 6 dilated conv layers + 1x1 output.
    """

    def __init__(self, use_imagenet_weights=False):
        super().__init__()
        weights = VGG16_Weights.IMAGENET1K_V1 if use_imagenet_weights else None
        vgg = vgg16(weights=weights)
        self.frontend = nn.Sequential(*list(vgg.features.children())[:23])
        self.backend = nn.Sequential(
            nn.Conv2d(512, 512, 3, padding=2, dilation=2),
            nn.ReLU(inplace=True),
            nn.Conv2d(512, 512, 3, padding=2, dilation=2),
            nn.ReLU(inplace=True),
            nn.Conv2d(512, 512, 3, padding=2, dilation=2),
            nn.ReLU(inplace=True),
            nn.Conv2d(512, 256, 3, padding=2, dilation=2),
            nn.ReLU(inplace=True),
            nn.Conv2d(256, 128, 3, padding=2, dilation=2),
            nn.ReLU(inplace=True),
            nn.Conv2d(128, 64, 3, padding=2, dilation=2),
            nn.ReLU(inplace=True),
        )
        self.output_layer = nn.Conv2d(64, 1, kernel_size=1)

    def forward(self, x):
        x = self.frontend(x)
        x = self.backend(x)
        x = self.output_layer(x)
        return x
