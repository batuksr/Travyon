interface CityGuideVisualSet {
  highlights: string[];
  foods: string[];
}

const unsplash = (id: string, width = 1000) =>
  `https://images.unsplash.com/${id}?q=82&w=${width}&auto=format&fit=crop`;

export const CITY_GUIDE_VISUALS: Record<string, CityGuideVisualSet> = {
  roma: {
    highlights: [
      unsplash('photo-1552832230-c0197dd311b5'),
      unsplash('photo-1531572753322-ad063cecc140'),
      unsplash('photo-1529260830199-42c24126f198'),
      unsplash('photo-1542820229-081e0c12af0b'),
    ],
    foods: [
      unsplash('photo-1551183053-bf91a1d81141', 700),
      unsplash('photo-1473093295043-cdd812d0e601', 700),
      unsplash('photo-1601050690597-df0568f70950', 700),
    ],
  },
  paris: {
    highlights: [
      unsplash('photo-1502602898657-3e91760cbb34'),
      unsplash('photo-1499856871958-5b9627545d1a'),
      unsplash('photo-1471623432079-b009d30b6729'),
      unsplash('photo-1520939817895-060bdaf4fe1b'),
    ],
    foods: [
      unsplash('photo-1509440159596-0249088772ff', 700),
      unsplash('photo-1547592180-85f173990554', 700),
      unsplash('photo-1484723091739-30a097e8f929', 700),
    ],
  },
  tokyo: {
    highlights: [
      unsplash('photo-1540959733332-eab4deabeeaf'),
      unsplash('photo-1524413840807-0c3cb6fa808d'),
      unsplash('photo-1536098561742-ca998e48cbcc'),
      unsplash('photo-1503899036084-c55cdd92da26'),
    ],
    foods: [
      unsplash('photo-1579871494447-9811cf80d66c', 700),
      unsplash('photo-1569718212165-3a8278d5f624', 700),
      unsplash('photo-1547592180-85f173990554', 700),
    ],
  },
  istanbul: {
    highlights: [
      unsplash('photo-1524231757912-21f4fe3a7200'),
      unsplash('photo-1541432901042-2d8bd64b4a9b'),
      unsplash('photo-1527838832700-5059252407fa'),
      unsplash('photo-1564507592333-c60657eea523'),
    ],
    foods: [
      unsplash('photo-1555507036-ab1f4038808a', 700),
      unsplash('photo-1555939594-58d7cb561ad1', 700),
      unsplash('photo-1569050467447-ce54b3bbc37d', 700),
    ],
  },
  barcelona: {
    highlights: [
      unsplash('photo-1583422409516-2895a77efded'),
      unsplash('photo-1539037116277-4db20889f2d4'),
      unsplash('photo-1464790719320-516ecd75af6c'),
      unsplash('photo-1509840841025-9088ba78a826'),
    ],
    foods: [
      unsplash('photo-1559314809-0d155014e29e', 700),
      unsplash('photo-1534080564583-6be75777b70a', 700),
      unsplash('photo-1578985545062-69928b1d9587', 700),
    ],
  },
  newyork: {
    highlights: [
      unsplash('photo-1496442226666-8d4d0e62e6e9'),
      unsplash('photo-1522083165195-3424ed129620'),
      unsplash('photo-1485871981521-5b1fd3805eee'),
      unsplash('photo-1534430480872-3498386e7856'),
    ],
    foods: [
      unsplash('photo-1565299624946-b28f40a0ae38', 700),
      unsplash('photo-1558961363-fa8fdf82db35', 700),
      unsplash('photo-1578985545062-69928b1d9587', 700),
    ],
  },
};
