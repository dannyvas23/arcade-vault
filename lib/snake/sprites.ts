// Tabla de recortes de la hoja public/games/snake/fruits.png (3790×442 px), fila
// pixel-art (la segunda de las tres: dibujo plano, pixel-art y fotografía).
//
// Procedencia: la hoja procede de The Spriters Resource (sprites del Snake de
// Google), según el comentario de references/source-assets/sprites.js. Es un
// asset de terceros que se usa por petición expresa del usuario; antes de
// publicar el proyecto fuera del uso educativo hay que revisar su licencia.
//
// Las coordenadas son las de references/source-assets/sprites.js, pero los
// nombres están corregidos: en ese atlas `banana` (x: 34) es en realidad una
// manzana, `orange` (x: 186) un plátano, etc. Aquí cada nombre es el dibujo
// real del recorte.

export type FruitSprite = { name: string; x: number; w: number }; // y = SPRITE_Y y h = SPRITE_H en todos

export const SPRITE_Y = 136;
export const SPRITE_H = 160;

export const FRUIT_SPRITES: FruitSprite[] = [
  { name: "apple", x: 34, w: 110 },
  { name: "banana", x: 186, w: 150 },
  { name: "pineapple", x: 378, w: 110 },
  { name: "grapes", x: 540, w: 130 },
  { name: "pumpkin", x: 712, w: 130 },
  { name: "turnip", x: 894, w: 110 },
  { name: "eggplant", x: 1066, w: 110 },
  { name: "strawberry", x: 1228, w: 130 },
  { name: "cherry", x: 1400, w: 130 },
  { name: "carrot", x: 1582, w: 110 },
  { name: "mushroom", x: 1734, w: 150 },
  { name: "broccoli", x: 1906, w: 150 },
  { name: "watermelon", x: 2068, w: 170 },
  { name: "pepper", x: 2250, w: 140 },
  { name: "kiwi", x: 2432, w: 130 },
  { name: "lemon", x: 2604, w: 130 },
  { name: "orange", x: 2786, w: 110 },
  { name: "peach", x: 2948, w: 130 },
  { name: "peanut", x: 3110, w: 150 },
  { name: "raspberry", x: 3302, w: 110 },
  { name: "tomato", x: 3454, w: 150 },
  { name: "fruitbowl", x: 3637, w: 130 }
];
