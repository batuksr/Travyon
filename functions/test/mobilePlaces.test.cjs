const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateMobilePlaceQuery, lookupMobilePlace, validateMobilePhotoName, lookupMobilePhoto } = require('../lib/mobilePlaces.js');
test('reject invalid input before calling Google', () => {
  for (const value of [null, {}, {name:'',destination:'Rome'}, {name:'x',destination:'Rome',location:{lat:91,lng:0}}]) {
    assert.throws(() => validateMobilePlaceQuery(value), /durak|konum/);
  }
});
test('search then details: fixed field masks and reviews preserved', async () => {
  const calls = [];
  const result = await lookupMobilePlace({name:'Pantheon',destination:'Roma'}, 'test-key', async (url, options) => {
    calls.push({url, options});
    return new Response(JSON.stringify(calls.length === 1 ? {places:[{id:'place-id'}]} : {id:'place-id', rating:4.8, reviews:[{authorAttribution:{displayName:'Author'}}]}));
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers['X-Goog-FieldMask'], 'places.id');
  assert.ok(calls[1].options.headers['X-Goog-FieldMask'].includes('reviews'));
  assert.ok(calls[1].options.headers['X-Goog-FieldMask'].includes('photos'));
  assert.equal(result.place.reviews[0].authorAttribution.displayName, 'Author');
});

test('photos use a fixed Google endpoint and never return the server key', async () => {
  const name = 'places/place-id/photos/photo-ref';
  const result = await lookupMobilePhoto(name, 'server-secret', async (url, options) => {
    assert.equal(url, `https://places.googleapis.com/v1/${name}/media?maxWidthPx=1000&skipHttpRedirect=true`);
    assert.equal(options.headers['X-Goog-Api-Key'], 'server-secret');
    assert.equal(options.redirect, 'error');
    return new Response(JSON.stringify({photoUri:'https://lh3.googleusercontent.com/photo'}));
  });
  assert.equal(result.photoUri, 'https://lh3.googleusercontent.com/photo');
  assert.ok(!JSON.stringify(result).includes('server-secret'));
});
test('reject unsafe photo resources and foreign or keyed photo URLs', async () => {
  for (const name of ['https://evil.test/photo', 'places/x/photos/../../secret', 'places/x/photos/y?key=x', '', 'x'.repeat(5000)]) {
    assert.throws(() => validateMobilePhotoName({name}));
  }
  for (const photoUri of ['http://lh3.googleusercontent.com/a','https://evil.test/a','https://lh3.googleusercontent.com/a?key=secret']) {
    await assert.rejects(lookupMobilePhoto('places/x/photos/y','secret',async () => new Response(JSON.stringify({photoUri}))), /Fotoğraf/);
  }
});
test('expired photos return a retryable error without affecting place details', async () => {
  await assert.rejects(lookupMobilePhoto('places/x/photos/y','secret',async () => new Response('',{status:404})), /yenileyip/);
});
test('empty search skips details and missing permission has safe error', async () => {
  const result = await lookupMobilePlace({name:'x',destination:'Rome'}, 'test-key', async () => new Response('{}'));
  assert.equal(result.place, null);
  await assert.rejects(lookupMobilePlace({name:'x',destination:'Rome'}, 'test-key', async () => new Response('',{status:403})), /Places API/);
});
test('reject a matching name in another city', async () => {
  let n = 0;
  const result = await lookupMobilePlace({name:'x',destination:'Rome',location:{lat:41.89,lng:12.49}}, 'test-key', async () => new Response(JSON.stringify(++n === 1 ? {places:[{id:'x'}]} : {location:{latitude:48.85,longitude:2.35}})));
  assert.equal(result.place, null);
});

test('non-object Google responses fail with a safe error', async () => {
  for (const data of [null, [], 'invalid', 42]) {
    await assert.rejects(lookupMobilePlace({name:'Hotel',destination:'Roma'}, 'secret',
      async () => new Response(JSON.stringify(data))), /Google yanıtı okunamadı/);
  }
});
