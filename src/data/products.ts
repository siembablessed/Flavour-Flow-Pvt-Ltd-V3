export interface Product {
  id: string;
  name: string;
  category: string;
  pack: string;
  code: string;
  casePrice: number;
  unitPrice: number;
  unitPriceVat: number;
}

export const categories = [
  "All",
  "Test",
  "Whisky",
  "Brandy",
  "Rum",
  "Vodka",
  "Gin",
  "Cane Spirit",
  "Spirit Cooler",
  "Cider",
  "Wine",
] as const;

export const products: Product[] = [
  // TEST
  { id: "t1", name: "Test Product ($1)", category: "Test", pack: "1 x 1", code: "T001", casePrice: 1.00, unitPrice: 1.00, unitPriceVat: 1.00 },
  { id: "t2", name: "Test Product ($2)", category: "Test", pack: "1 x 1", code: "T002", casePrice: 2.00, unitPrice: 2.00, unitPriceVat: 2.00 },
  // WHISKY
  { id: "w1", name: "Whisky", category: "Whisky", pack: "12 x 750ml", code: "9680", casePrice: 37.44, unitPrice: 3.12, unitPriceVat: 3.60 },
  { id: "w2", name: "Whisky", category: "Whisky", pack: "24 x 200ml", code: "9519", casePrice: 25.20, unitPrice: 1.05, unitPriceVat: 1.21 },
  { id: "w3", name: "Whisky", category: "Whisky", pack: "12 x 750ml PET", code: "9690", casePrice: 28.68, unitPrice: 2.39, unitPriceVat: 2.76 },
  { id: "w4", name: "Whisky", category: "Whisky", pack: "24 x 200ml PET", code: "9529", casePrice: 16.80, unitPrice: 0.70, unitPriceVat: 0.81 },
  { id: "w5", name: "Gold Blend Black", category: "Whisky", pack: "12 x 750ml", code: "9622", casePrice: 58.18, unitPrice: 4.85, unitPriceVat: 5.60 },
  { id: "w6", name: "Gold Blend Black", category: "Whisky", pack: "24 x 200ml PET", code: "9629", casePrice: 29.76, unitPrice: 1.24, unitPriceVat: 1.43 },
  { id: "w7", name: "Gold Blend No. 9", category: "Whisky", pack: "12 x 750ml", code: "9675", casePrice: 33.24, unitPrice: 2.77, unitPriceVat: 3.20 },
  { id: "w8", name: "Gold Blend No. 9", category: "Whisky", pack: "24 x 200ml PET", code: "9789", casePrice: 12.48, unitPrice: 0.52, unitPriceVat: 0.60 },
  // BRANDY
  { id: "b1", name: "Viceroy 5", category: "Brandy", pack: "12 x 750ml", code: "9660", casePrice: 74.82, unitPrice: 6.24, unitPriceVat: 7.20 },
  { id: "b2", name: "Viceroy 5", category: "Brandy", pack: "24 x 375ml", code: "9596", casePrice: 72.00, unitPrice: 3.00, unitPriceVat: 3.47 },
  { id: "b3", name: "Viceroy 5", category: "Brandy", pack: "24 x 200ml", code: "9509", casePrice: 40.73, unitPrice: 1.70, unitPriceVat: 1.96 },
  { id: "b4", name: "Old Chateau", category: "Brandy", pack: "12 x 750ml", code: "9542", casePrice: 49.86, unitPrice: 4.16, unitPriceVat: 4.80 },
  { id: "b5", name: "Old Chateau", category: "Brandy", pack: "24 x 200ml", code: "9719", casePrice: 38.64, unitPrice: 1.61, unitPriceVat: 1.86 },
  { id: "b6", name: "Old Chateau", category: "Brandy", pack: "24 x 200ml PET", code: "9599", casePrice: 23.71, unitPrice: 0.99, unitPriceVat: 1.14 },
  { id: "b7", name: "Heritage Brandy", category: "Brandy", pack: "12 x 750ml PET", code: "9642", casePrice: 32.22, unitPrice: 2.69, unitPriceVat: 3.10 },
  { id: "b8", name: "Heritage Brandy", category: "Brandy", pack: "24 x 200ml", code: "9579", casePrice: 22.80, unitPrice: 0.95, unitPriceVat: 1.10 },
  { id: "b9", name: "Heritage Brandy", category: "Brandy", pack: "24 x 200ml PET", code: "9589", casePrice: 16.70, unitPrice: 0.70, unitPriceVat: 0.80 },
  { id: "b10", name: "Star Brandy", category: "Brandy", pack: "24 x 200ml PET", code: "9779", casePrice: 14.88, unitPrice: 0.62, unitPriceVat: 0.72 },
  // RUM
  { id: "r1", name: "Admirals Rum", category: "Rum", pack: "12 x 750ml", code: "9562", casePrice: 75.24, unitPrice: 6.27, unitPriceVat: 7.24 },
  // VODKA
  { id: "v1", name: "Smirnoff 1818", category: "Vodka", pack: "12 x 750ml", code: "9580", casePrice: 66.48, unitPrice: 5.54, unitPriceVat: 6.40 },
  { id: "v2", name: "Nikolai", category: "Vodka", pack: "12 x 750ml", code: "9612", casePrice: 41.15, unitPrice: 3.43, unitPriceVat: 3.96 },
  { id: "v3", name: "Nikolai", category: "Vodka", pack: "24 x 200ml", code: "9619", casePrice: 25.20, unitPrice: 1.05, unitPriceVat: 1.21 },
  { id: "v4", name: "Nikolai", category: "Vodka", pack: "12 x 750ml PET", code: "9652", casePrice: 33.24, unitPrice: 2.77, unitPriceVat: 3.20 },
  { id: "v5", name: "Nikolai", category: "Vodka", pack: "24 x 200ml PET", code: "9639", casePrice: 19.94, unitPrice: 0.83, unitPriceVat: 0.96 },
  { id: "v6", name: "Nikolai Vanilla & Coffee Bean", category: "Vodka", pack: "12 x 750ml", code: "9662", casePrice: 40.32, unitPrice: 3.36, unitPriceVat: 3.88 },
  { id: "v7", name: "Nikolai Caramel & Toffee", category: "Vodka", pack: "12 x 750ml", code: "9672", casePrice: 40.32, unitPrice: 3.36, unitPriceVat: 3.88 },
  { id: "v8", name: "Count Pushkin", category: "Vodka", pack: "12 x 750ml", code: "9720", casePrice: 49.87, unitPrice: 4.16, unitPriceVat: 4.80 },
  // GIN
  { id: "g1", name: "Gilberts Gin", category: "Gin", pack: "12 x 750ml", code: "9700", casePrice: 48.62, unitPrice: 4.05, unitPriceVat: 4.68 },
  { id: "g2", name: "Gilberts Gin", category: "Gin", pack: "24 x 200ml", code: "9539", casePrice: 25.20, unitPrice: 1.05, unitPriceVat: 1.21 },
  { id: "g3", name: "Gilberts Gin", category: "Gin", pack: "24 x 200ml PET", code: "9549", casePrice: 24.24, unitPrice: 1.01, unitPriceVat: 1.17 },
  { id: "g4", name: "Whitestone Gin", category: "Gin", pack: "6 x 750ml", code: "9665", casePrice: 24.54, unitPrice: 4.09, unitPriceVat: 4.72 },
  { id: "g5", name: "Whitestone Strawberry", category: "Gin", pack: "6 x 750ml", code: "9695", casePrice: 24.54, unitPrice: 4.09, unitPriceVat: 4.72 },
  { id: "g6", name: "Whitestone Pineapple", category: "Gin", pack: "6 x 750ml", code: "9697", casePrice: 24.54, unitPrice: 4.09, unitPriceVat: 4.72 },
  { id: "g7", name: "Whitestone Blackcurrant", category: "Gin", pack: "6 x 750ml", code: "9698", casePrice: 24.54, unitPrice: 4.09, unitPriceVat: 4.72 },
  // CANE SPIRIT
  { id: "cs1", name: "Mainstay", category: "Cane Spirit", pack: "12 x 750ml", code: "9592", casePrice: 49.87, unitPrice: 4.16, unitPriceVat: 4.80 },
  { id: "cs2", name: "Skipper's", category: "Cane Spirit", pack: "12 x 750ml PET", code: "9632", casePrice: 24.94, unitPrice: 2.08, unitPriceVat: 2.40 },
  { id: "cs3", name: "Skipper's", category: "Cane Spirit", pack: "24 x 200ml", code: "9609", casePrice: 22.80, unitPrice: 0.95, unitPriceVat: 1.10 },
  { id: "cs4", name: "Skipper's", category: "Cane Spirit", pack: "24 x 200ml PET", code: "9679", casePrice: 16.68, unitPrice: 0.70, unitPriceVat: 0.80 },
  { id: "cs5", name: "Star Cane", category: "Cane Spirit", pack: "24 x 200ml PET", code: "9649", casePrice: 14.14, unitPrice: 0.59, unitPriceVat: 0.68 },
  // SPIRIT COOLER
  { id: "sc1", name: "Sting Lemon", category: "Spirit Cooler", pack: "24 x 275ml", code: "9557", casePrice: 16.08, unitPrice: 0.67, unitPriceVat: 0.77 },
  { id: "sc2", name: "Sting Tropical", category: "Spirit Cooler", pack: "24 x 275ml", code: "9577", casePrice: 16.08, unitPrice: 0.67, unitPriceVat: 0.77 },
  { id: "sc3", name: "Sting Strawberry", category: "Spirit Cooler", pack: "24 x 275ml", code: "9587", casePrice: 16.08, unitPrice: 0.67, unitPriceVat: 0.77 },
  { id: "sc4", name: "Night Sky Ginger Ale", category: "Spirit Cooler", pack: "24 x 440ml", code: "9793", casePrice: 20.88, unitPrice: 0.87, unitPriceVat: 1.00 },
  { id: "sc5", name: "Night Sky Black Cherry", category: "Spirit Cooler", pack: "24 x 440ml", code: "9794", casePrice: 20.88, unitPrice: 0.87, unitPriceVat: 1.00 },
  { id: "sc6", name: "Night Sky Lemon Lime", category: "Spirit Cooler", pack: "24 x 440ml", code: "9795", casePrice: 20.88, unitPrice: 0.87, unitPriceVat: 1.00 },
  // CIDER
  { id: "ci1", name: "Hunters Dry", category: "Cider", pack: "24 x 330ml", code: "9536", casePrice: 21.60, unitPrice: 0.90, unitPriceVat: 1.04 },
  { id: "ci2", name: "Hunters Gold", category: "Cider", pack: "24 x 330ml", code: "9546", casePrice: 21.60, unitPrice: 0.90, unitPriceVat: 1.04 },
  { id: "ci3", name: "Savanna Dry", category: "Cider", pack: "24 x 330ml", code: "9556", casePrice: 28.32, unitPrice: 1.18, unitPriceVat: 1.36 },
  { id: "ci4", name: "Hunters Dry", category: "Cider", pack: "12 x 660ml", code: "9688", casePrice: 33.24, unitPrice: 1.39, unitPriceVat: 1.60 },
  { id: "ci5", name: "Hunters Gold", category: "Cider", pack: "12 x 660ml", code: "9676", casePrice: 33.24, unitPrice: 1.39, unitPriceVat: 1.60 },
  // WINE
  { id: "wi1", name: "Montello Jerepigo", category: "Wine", pack: "12 x 750ml", code: "9702", casePrice: 37.40, unitPrice: 3.12, unitPriceVat: 3.60 },
  { id: "wi2", name: "Montello Jerepigo", category: "Wine", pack: "12 x 750ml PET", code: "9692", casePrice: 37.40, unitPrice: 3.12, unitPriceVat: 3.60 },
  { id: "wi3", name: "Montello Jerepigo", category: "Wine", pack: "24 x 200ml PET", code: "9669", casePrice: 16.62, unitPrice: 0.69, unitPriceVat: 0.80 },
  { id: "wi4", name: "Green Valley Medium White", category: "Wine", pack: "12 x 750ml", code: "9740", casePrice: 36.16, unitPrice: 3.01, unitPriceVat: 3.48 },
  { id: "wi5", name: "Green Valley Rose", category: "Wine", pack: "12 x 750ml", code: "9750", casePrice: 36.16, unitPrice: 3.01, unitPriceVat: 3.48 },
  { id: "wi6", name: "4th Street Rose", category: "Wine", pack: "6 x 750ml", code: "9512", casePrice: 20.78, unitPrice: 3.46, unitPriceVat: 4.00 },
  { id: "wi7", name: "4th Street White", category: "Wine", pack: "6 x 750ml", code: "9522", casePrice: 20.78, unitPrice: 3.46, unitPriceVat: 4.00 },
  { id: "wi8", name: "4th Street Red", category: "Wine", pack: "6 x 750ml", code: "9532", casePrice: 20.78, unitPrice: 3.46, unitPriceVat: 4.00 },
];
