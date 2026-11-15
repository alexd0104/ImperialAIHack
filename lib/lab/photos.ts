import type { TestPhoto } from "./approaches";

/** The five test photos. Real image files are supplied by a human with `--photos <dir>`. */
export const TEST_PHOTOS: TestPhoto[] = [
  {
    key: "beach",
    script: {
      title: "Summer at the beach",
      people: ["Grandma Rose", "Tom"],
      place: "Brighton beach",
      when: "1968",
      sound: "waves and seagulls",
      message: "We loved that day, Rose.",
      freeText: "Rose and Tom on the beach at Brighton in summer 1968, laughing near the waves.",
      description: "Two people standing on a pebble beach near the sea.",
    },
  },
  {
    key: "fireplace",
    script: {
      title: "Christmas by the fire",
      people: ["Grandpa Joe", "Anna"],
      place: "the living room",
      when: "1975",
      sound: "crackling fire",
      message: "Merry Christmas, Joe.",
      freeText: "Joe and Anna by the fireplace on Christmas evening, 1975.",
      description: "Two people sitting beside a lit fireplace in a living room.",
    },
  },
  {
    key: "garden",
    script: {
      title: "Roses in the garden",
      people: ["Grandma Rose"],
      place: "the back garden",
      when: "1980",
      sound: "birdsong and a light breeze",
      message: "Your garden was the loveliest.",
      freeText: "Rose tending her roses in the back garden, spring 1980.",
      description: "A woman kneeling beside flower beds in a garden.",
    },
  },
  {
    key: "wedding",
    script: {
      title: "The wedding day",
      people: ["Joe", "Rose"],
      place: "the village church",
      when: "1962",
      sound: "church bells and cheering",
      message: "The happiest day.",
      freeText: "Joe and Rose leaving the village church after their wedding in 1962.",
      description: "A couple in wedding clothes on church steps, guests around them.",
    },
  },
  {
    key: "kitchen",
    script: {
      title: "Sunday baking",
      people: ["Grandma Rose", "Anna"],
      place: "the family kitchen",
      when: "1985",
      sound: "a kettle and the radio",
      message: "Thank you for the best cakes.",
      freeText: "Rose and little Anna baking a cake together in the kitchen on a Sunday, 1985.",
      description: "A woman and a child at a kitchen table with baking things.",
    },
  },
];
