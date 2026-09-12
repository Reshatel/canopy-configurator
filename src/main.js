import { Viewer } from './Viewer.js';
import { PartLibrary } from './PartLibrary.js';
import { Canopy } from './canopy/Canopy.js';
import { ParamPanel } from './ui/ParamPanel.js';
import { Inspector } from './ui/Inspector.js';
import { MODEL_URL } from './config.js';

const overlay = document.getElementById('overlay');
const panelRoot = document.getElementById('panel');

async function bootstrap() {
  const viewer = new Viewer(document.getElementById('viewport'));
  const library = await PartLibrary.load(
    MODEL_URL,
    viewer.renderer.capabilities.getMaxAnisotropy()
  );
  const canopy = new Canopy(library);

  viewer.scene.add(canopy.root);
  viewer.start();

  let pending = null;

  const apply = (params) => {
    if (pending !== null) return;
    pending = requestAnimationFrame(() => {
      pending = null;
      inspector.clear();
      panel.renderStats(canopy.update(params));
      viewer.refreshShadows(canopy.root);
    });
  };

  const inspector = new Inspector(viewer, canopy, document.getElementById('tag'));
  const panel = new ParamPanel(panelRoot, apply);

  panel.renderStats(canopy.update(panel.values));
  viewer.frame(canopy.root);

  document.getElementById('fit').addEventListener('click', () => viewer.frame(canopy.root));

  const framing = document.getElementById('framing');
  framing.addEventListener('change', () => {
    inspector.clear();
    canopy.setCladdingVisible(!framing.checked);
  });

  overlay.hidden = true;
}

bootstrap().catch((error) => {
  overlay.hidden = false;
  overlay.textContent = `Не вдалося завантажити сцену: ${error.message}`;
  console.error(error);
});
