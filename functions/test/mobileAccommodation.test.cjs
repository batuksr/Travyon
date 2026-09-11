const {test} = require('node:test');
const assert = require('node:assert/strict');
const {lookupAccommodation, validateAccommodationQuery} = require('../lib/mobileAccommodation');
const sessionToken = '1234567890abcdef1234567890abcdef';
const query = {action: 'suggest', input: 'Hilton', destination: 'Roma, İtalya', sessionToken};

test('autocomplete validates input, session, coordinates and place IDs', () => {
  for (const bad of [null, {}, {...query, input:'ab'}, {...query, input:'x'.repeat(301)}, {...query, sessionToken:'bad'},
    {...query, bias:{lat:999,lng:12}}, {action:'resolve',sessionToken,placeId:'../foo?key=secret'}]) {
    assert.throws(() => validateAccommodationQuery(bad));
  }
  assert.equal(validateAccommodationQuery(query).input, 'Hilton');
});

test('suggestions use fixed endpoint, field mask, session and destination bias', async () => {
  const result = await lookupAccommodation({...query,bias:{lat:41.9,lng:12.5}}, 'secret', async (url, options) => {
    assert.equal(url,'https://places.googleapis.com/v1/places:autocomplete');
    const body = JSON.parse(options.body);
    assert.equal(body.input,'Hilton');
    assert.equal(body.sessionToken,sessionToken);
    assert.equal(body.locationBias.circle.center.latitude,41.9);
    assert.equal(options.headers['X-Goog-FieldMask'].includes('reviews'),false);
    return new Response(JSON.stringify({suggestions:[{placePrediction:{placeId:'id1',text:{text:'Hilton Roma'},structuredFormat:{mainText:{text:'Hilton'},secondaryText:{text:'Roma'}}}}]}));
  });
  assert.deepEqual(result.suggestions,[{placeId:'id1',title:'Hilton',subtitle:'Roma'}]);
  assert.ok(!JSON.stringify(result).includes('secret'));
});

test('resolves the exact chosen ID with the same session and no extra fields', async () => {
  const result = await lookupAccommodation({action:'resolve',placeId:'id1',sessionToken},'secret',async(url, options) => {
    assert.equal(url,`https://places.googleapis.com/v1/places/id1?languageCode=tr&sessionToken=${sessionToken}`);
    assert.equal(options.headers['X-Goog-FieldMask'],'id,formattedAddress,location');
    return new Response(JSON.stringify({formattedAddress:'Via Roma 1',location:{latitude:41.9,longitude:12.5}}));
  });
  assert.deepEqual(result,{address:'Via Roma 1',lat:41.9,lng:12.5});
});

test('empty results, permissions and invalid detail response are safe', async () => {
  assert.deepEqual(await lookupAccommodation(query,'secret',async()=>new Response('{}')),{suggestions:[]});
  await assert.rejects(lookupAccommodation(query,'secret',async()=>new Response('',{status:403})), /Places API/);
  await assert.rejects(lookupAccommodation(query,'secret',async()=>{throw new Error('key=secret');}), e => !e.message.includes('secret') && e.code === 'unavailable');
  await assert.rejects(lookupAccommodation({action:'resolve',placeId:'id1',sessionToken},'secret',async()=>new Response('{}')), e=>e.code==='not-found');
});

test('malformed prediction fields never become non-string mobile labels', async () => {
  const result = await lookupAccommodation(query, 'secret', async () => new Response(JSON.stringify({suggestions: [
    null, {placePrediction: {placeId:'id1', text:{text:'Hotel Roma'}, structuredFormat:{mainText:{text:42}, secondaryText:{text:{}}}}},
    {placePrediction: {placeId:'id2', text:{text:42}}},
  ]})));
  assert.deepEqual(result.suggestions, [{placeId:'id1', title:'Hotel Roma', subtitle:''}]);
  for (const bias of [null, [], '41,12', {lat:'41',lng:12}, {lat:41,lng:Infinity}]) {
    assert.throws(() => validateAccommodationQuery({...query, bias}));
  }
});
