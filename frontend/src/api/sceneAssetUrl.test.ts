import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveSceneAssetUrl } from './sceneAssetUrl.ts';

globalThis.window = {
  location: {
    pathname: '/mgview/',
    origin: 'http://localhost:8000',
  },
} as Window & typeof globalThis;

test('scene-relative assets resolve from the supplied scene directory', () => {
  assert.equal(
    resolveSceneAssetUrl('samples/demo/', 'textures/custom.png'),
    'http://localhost:8000/mgview/api/file?root=sample&path=demo%2Ftextures%2Fcustom.png'
  );
  assert.equal(
    resolveSceneAssetUrl('samples/demo/', 'assets/textures/metal.jpg'),
    'http://localhost:8000/mgview/assets/textures/metal.jpg'
  );
});

test('workspace assets use the explicitly rooted file API', () => {
  assert.equal(
    resolveSceneAssetUrl('particle_in_slot/', 'DiskBaseBinary.stl'),
    'http://localhost:8000/mgview/api/file?root=workspace&path=particle_in_slot%2FDiskBaseBinary.stl'
  );
});

test('workspace assets resolve parent segments within copied sample trees', () => {
  assert.equal(
    resolveSceneAssetUrl('MGExampleAircraft/correct/', '../cad/Stealth_Aircraft/untitled.stl'),
    'http://localhost:8000/mgview/api/file?root=workspace&path=MGExampleAircraft%2Fcad%2FStealth_Aircraft%2Funtitled.stl'
  );
});

test('sample assets retain the sample root and resolve parent segments', () => {
  assert.equal(
    resolveSceneAssetUrl('samples/MGExampleAircraft/correct/', '../cad/Stealth_Aircraft/untitled.stl'),
    'http://localhost:8000/mgview/api/file?root=sample&path=MGExampleAircraft%2Fcad%2FStealth_Aircraft%2Funtitled.stl'
  );
});

test('an explicit workspace root disambiguates workspace folders named samples', () => {
  assert.equal(
    resolveSceneAssetUrl('samples/project/', 'mesh.stl', 'workspace'),
    'http://localhost:8000/mgview/api/file?root=workspace&path=samples%2Fproject%2Fmesh.stl'
  );
});

test('asset traversal beyond its API root is not converted to a public URL', () => {
  assert.equal(
    resolveSceneAssetUrl('', '../../private.stl', 'workspace'),
    'http://localhost:8000/mgview/api/file?root=workspace&path=..%2F..%2Fprivate.stl'
  );
});
