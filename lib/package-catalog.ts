export const CUSTOM_ITEM_KEY = "custom"

const BLOCKED_PACKAGE_TYPES = new Set(["restricted_hazmat"])

export interface CatalogItem {
  value: string
  label: string
  packageType: string
  category: string
  categoryLabel: string
  subcategory: string
  subcategoryLabel: string
  keywords: string[]
  defaultWeightKg: number
  defaultDimensionsCm: {
    length: number
    width: number
    height: number
  }
  blocked: boolean
  custom: boolean
}

export interface CatalogSubcategory {
  value: string
  label: string
  items: CatalogItem[]
}

export interface CatalogCategory {
  value: string
  label: string
  subcategories: CatalogSubcategory[]
}

interface ItemOverride {
  packageType?: string
  weightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  keywords?: string[]
  blocked?: boolean
  custom?: boolean
}

type ItemSeed = [value: string, label: string, overrides?: ItemOverride]

interface SubcategorySeed {
  value: string
  label: string
  packageType: string
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  keywords?: string[]
  items: ItemSeed[]
}

interface CategorySeed {
  value: string
  label: string
  subcategories: SubcategorySeed[]
}

const CATEGORY_SEEDS: CategorySeed[] = [
  {
    value: "household",
    label: "Household",
    subcategories: [
      {
        value: "furniture",
        label: "Furniture",
        packageType: "furniture",
        weightKg: 40,
        lengthCm: 150,
        widthCm: 100,
        heightCm: 80,
        items: [
          ["bed", "Bed", { weightKg: 60, lengthCm: 200, widthCm: 160, heightCm: 30, keywords: ["sleep", "base"] }],
          ["mattress", "Mattress", { weightKg: 35, lengthCm: 200, widthCm: 150, heightCm: 25 }],
          ["couch", "Couch / Sofa", { weightKg: 70, lengthCm: 200, widthCm: 90, heightCm: 90, keywords: ["sofa", "settee"] }],
          ["dining_table", "Dining table", { weightKg: 40, lengthCm: 180, widthCm: 90, heightCm: 75 }],
          ["dining_chairs", "Chairs", { weightKg: 8, lengthCm: 100, widthCm: 50, heightCm: 100, keywords: ["chair"] }],
          ["wardrobe", "Wardrobe", { weightKg: 80, lengthCm: 120, widthCm: 60, heightCm: 200, keywords: ["closet"] }],
          ["chest_of_drawers", "Chest of drawers", { weightKg: 35, lengthCm: 100, widthCm: 50, heightCm: 100 }],
          ["desk", "Desk", { weightKg: 30, lengthCm: 140, widthCm: 70, heightCm: 75 }],
          ["bookshelf", "Bookshelf", { weightKg: 30, lengthCm: 90, widthCm: 40, heightCm: 180 }],
          ["tv_stand", "TV stand", { weightKg: 20, lengthCm: 150, widthCm: 45, heightCm: 50 }],
          ["coffee_table", "Coffee table", { weightKg: 20, lengthCm: 110, widthCm: 60, heightCm: 45 }],
        ],
      },
      {
        value: "appliances",
        label: "Appliances",
        packageType: "appliance",
        weightKg: 60,
        lengthCm: 90,
        widthCm: 70,
        heightCm: 90,
        items: [
          ["fridge", "Fridge", { weightKg: 70, lengthCm: 70, widthCm: 70, heightCm: 180, keywords: ["refrigerator"] }],
          ["freezer", "Freezer", { weightKg: 65, lengthCm: 70, widthCm: 70, heightCm: 170 }],
          ["washing_machine", "Washing machine", { weightKg: 70, lengthCm: 60, widthCm: 60, heightCm: 85, keywords: ["washer"] }],
          ["dryer", "Dryer", { weightKg: 50, lengthCm: 60, widthCm: 60, heightCm: 85, keywords: ["tumble dryer"] }],
          ["dishwasher", "Dishwasher", { weightKg: 50, lengthCm: 60, widthCm: 60, heightCm: 85 }],
          ["stove_oven", "Stove / Oven", { weightKg: 60, lengthCm: 75, widthCm: 65, heightCm: 90, keywords: ["cooker"] }],
          ["microwave", "Microwave", { weightKg: 15, lengthCm: 55, widthCm: 45, heightCm: 35 }],
          ["air_conditioner", "Air conditioner", { weightKg: 35, lengthCm: 100, widthCm: 40, heightCm: 35, keywords: ["aircon", "ac"] }],
          ["heater", "Heater", { weightKg: 10, lengthCm: 60, widthCm: 30, heightCm: 40 }],
          ["vacuum_cleaner", "Vacuum cleaner", { weightKg: 8, lengthCm: 40, widthCm: 30, heightCm: 30, keywords: ["vacuum"] }],
        ],
      },
      {
        value: "kitchenware",
        label: "Kitchenware",
        packageType: "other",
        weightKg: 8,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 30,
        items: [
          ["pots", "Pots", { weightKg: 6, lengthCm: 40, widthCm: 30, heightCm: 30 }],
          ["pans", "Pans", { weightKg: 5, lengthCm: 35, widthCm: 30, heightCm: 15 }],
          ["crockery", "Crockery", { packageType: "fragile_glass", weightKg: 10, lengthCm: 45, widthCm: 35, heightCm: 30, keywords: ["plates", "dishes"] }],
          ["cutlery", "Cutlery", { weightKg: 3, lengthCm: 30, widthCm: 20, heightCm: 10 }],
          ["kettle", "Kettle", { packageType: "appliance", weightKg: 1.5, lengthCm: 25, widthCm: 20, heightCm: 25 }],
          ["toaster", "Toaster", { packageType: "appliance", weightKg: 2, lengthCm: 30, widthCm: 20, heightCm: 20 }],
          ["air_fryer", "Air fryer", { packageType: "appliance", weightKg: 5, lengthCm: 35, widthCm: 35, heightCm: 35, keywords: ["fryer"] }],
        ],
      },
      {
        value: "bedding",
        label: "Bedding and Linen",
        packageType: "other",
        weightKg: 5,
        lengthCm: 50,
        widthCm: 40,
        heightCm: 30,
        items: [
          ["duvets", "Duvets", { weightKg: 4, lengthCm: 50, widthCm: 40, heightCm: 30 }],
          ["pillows", "Pillows", { weightKg: 2, lengthCm: 60, widthCm: 40, heightCm: 20 }],
          ["blankets", "Blankets", { weightKg: 3, lengthCm: 50, widthCm: 40, heightCm: 30 }],
          ["curtains", "Curtains", { weightKg: 3, lengthCm: 40, widthCm: 30, heightCm: 20 }],
          ["rugs", "Rugs", { packageType: "bulky", weightKg: 10, lengthCm: 150, widthCm: 20, heightCm: 20 }],
        ],
      },
      {
        value: "home_decor",
        label: "Home Decor",
        packageType: "fragile_glass",
        weightKg: 3,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 30,
        items: [
          ["mirrors", "Mirrors", { weightKg: 8, lengthCm: 100, widthCm: 10, heightCm: 120 }],
          ["paintings", "Paintings", { weightKg: 5, lengthCm: 100, widthCm: 10, heightCm: 80, keywords: ["art", "picture"] }],
          ["lamps", "Lamps", { packageType: "other", weightKg: 4, lengthCm: 40, widthCm: 40, heightCm: 60, keywords: ["lamp", "light"] }],
          ["ornaments", "Ornaments", { weightKg: 2, lengthCm: 30, widthCm: 20, heightCm: 30 }],
        ],
      },
      {
        value: "boxes_moving",
        label: "Boxes and Moving",
        packageType: "bulky",
        weightKg: 20,
        lengthCm: 60,
        widthCm: 50,
        heightCm: 50,
        items: [
          ["moving_boxes", "Moving boxes", { weightKg: 15, lengthCm: 60, widthCm: 50, heightCm: 50, keywords: ["cartons"] }],
          ["packed_household_goods", "Packed household goods", { weightKg: 50, lengthCm: 100, widthCm: 80, heightCm: 100, keywords: ["house move", "relocation"] }],
          ["suitcases", "Suitcases", { weightKg: 10, lengthCm: 70, widthCm: 45, heightCm: 30, keywords: ["luggage"] }],
        ],
      },
    ],
  },
  {
    value: "electronics",
    label: "Electronics",
    subcategories: [
      {
        value: "computing",
        label: "Computing",
        packageType: "electronics",
        weightKg: 3,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20,
        items: [
          ["laptop", "Laptop", { weightKg: 2.5, lengthCm: 45, widthCm: 35, heightCm: 10, keywords: ["notebook", "computer"] }],
          ["desktop", "Desktop", { weightKg: 10, lengthCm: 50, widthCm: 50, heightCm: 30, keywords: ["pc", "tower"] }],
          ["monitor", "Monitor", { weightKg: 6, lengthCm: 70, widthCm: 20, heightCm: 50, keywords: ["screen", "display"] }],
          ["printer", "Printer", { weightKg: 12, lengthCm: 60, widthCm: 50, heightCm: 40 }],
          ["keyboard", "Keyboard", { weightKg: 1, lengthCm: 50, widthCm: 20, heightCm: 5 }],
          ["mouse", "Mouse", { weightKg: 0.2, lengthCm: 12, widthCm: 8, heightCm: 5 }],
          ["router", "Router", { weightKg: 0.8, lengthCm: 25, widthCm: 20, heightCm: 10, keywords: ["wifi", "modem"] }],
        ],
      },
      {
        value: "mobile_accessories",
        label: "Mobile and Accessories",
        packageType: "electronics",
        weightKg: 1,
        lengthCm: 25,
        widthCm: 18,
        heightCm: 8,
        items: [
          ["phone", "Phone", { weightKg: 0.4, lengthCm: 20, widthCm: 15, heightCm: 8, keywords: ["cellphone", "mobile"] }],
          ["tablet", "Tablet", { weightKg: 0.7, lengthCm: 30, widthCm: 22, heightCm: 3, keywords: ["ipad"] }],
          ["charger", "Charger", { weightKg: 0.2, lengthCm: 10, widthCm: 8, heightCm: 5 }],
          ["power_bank", "Power bank", { weightKg: 0.4, lengthCm: 15, widthCm: 10, heightCm: 3 }],
        ],
      },
      {
        value: "audio_video",
        label: "Audio and Video",
        packageType: "electronics",
        weightKg: 5,
        lengthCm: 50,
        widthCm: 35,
        heightCm: 30,
        items: [
          ["tv", "TV", { weightKg: 15, lengthCm: 130, widthCm: 20, heightCm: 80, keywords: ["television", "screen"] }],
          ["speakers", "Speakers", { weightKg: 5, lengthCm: 40, widthCm: 30, heightCm: 60, keywords: ["speaker", "sound"] }],
          ["headphones", "Headphones", { weightKg: 0.4, lengthCm: 25, widthCm: 20, heightCm: 10 }],
          ["camera", "Camera", { weightKg: 2, lengthCm: 20, widthCm: 15, heightCm: 15 }],
          ["projector", "Projector", { weightKg: 4, lengthCm: 35, widthCm: 30, heightCm: 15 }],
        ],
      },
      {
        value: "gaming",
        label: "Gaming",
        packageType: "electronics",
        weightKg: 3,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20,
        items: [
          ["console", "Console", { weightKg: 4, lengthCm: 40, widthCm: 30, heightCm: 15, keywords: ["playstation", "xbox"] }],
          ["controllers", "Controllers", { weightKg: 0.5, lengthCm: 20, widthCm: 15, heightCm: 10 }],
          ["games", "Games", { weightKg: 0.2, lengthCm: 20, widthCm: 15, heightCm: 3 }],
        ],
      },
    ],
  },
  {
    value: "fashion",
    label: "Fashion and Personal",
    subcategories: [
      {
        value: "clothing",
        label: "Clothing",
        packageType: "clothing",
        weightKg: 3,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20,
        items: [
          ["clothes", "Clothes", { weightKg: 3, lengthCm: 40, widthCm: 30, heightCm: 20 }],
          ["uniforms", "Uniforms", { weightKg: 4, lengthCm: 45, widthCm: 35, heightCm: 25 }],
          ["bulk_apparel", "Bulk apparel", { weightKg: 15, lengthCm: 60, widthCm: 50, heightCm: 50 }],
        ],
      },
      {
        value: "footwear",
        label: "Footwear",
        packageType: "clothing",
        weightKg: 2,
        lengthCm: 35,
        widthCm: 25,
        heightCm: 15,
        items: [
          ["shoes", "Shoes", { weightKg: 1.5, lengthCm: 35, widthCm: 25, heightCm: 15 }],
          ["boots", "Boots", { weightKg: 2, lengthCm: 40, widthCm: 30, heightCm: 20 }],
        ],
      },
      {
        value: "accessories",
        label: "Accessories",
        packageType: "clothing",
        weightKg: 2,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20,
        items: [
          ["bags", "Bags", { weightKg: 2, lengthCm: 40, widthCm: 30, heightCm: 20, keywords: ["handbag", "backpack"] }],
          ["watches", "Watches", { packageType: "other", weightKg: 0.3, lengthCm: 15, widthCm: 10, heightCm: 8 }],
          ["jewellery", "Jewellery", { packageType: "other", weightKg: 0.3, lengthCm: 15, widthCm: 10, heightCm: 8, keywords: ["jewelry"] }],
        ],
      },
      {
        value: "health_beauty",
        label: "Health and Beauty",
        packageType: "other",
        weightKg: 2,
        lengthCm: 30,
        widthCm: 20,
        heightCm: 20,
        items: [
          ["cosmetics", "Cosmetics", { weightKg: 2, lengthCm: 30, widthCm: 20, heightCm: 20 }],
          ["hair_products", "Hair products", { weightKg: 2, lengthCm: 30, widthCm: 20, heightCm: 20 }],
          ["toiletries", "Toiletries", { weightKg: 3, lengthCm: 35, widthCm: 25, heightCm: 25 }],
        ],
      },
    ],
  },
  {
    value: "food",
    label: "Food and Groceries",
    subcategories: [
      {
        value: "non_perishable",
        label: "Non-perishable",
        packageType: "food_ambient",
        weightKg: 10,
        lengthCm: 50,
        widthCm: 40,
        heightCm: 30,
        items: [
          ["dry_goods", "Dry goods", { weightKg: 10, lengthCm: 50, widthCm: 40, heightCm: 30 }],
          ["canned_food", "Canned food", { weightKg: 12, lengthCm: 45, widthCm: 35, heightCm: 30 }],
          ["beverages", "Beverages", { weightKg: 15, lengthCm: 40, widthCm: 30, heightCm: 30 }],
        ],
      },
      {
        value: "perishable",
        label: "Perishable",
        packageType: "food_cold",
        weightKg: 10,
        lengthCm: 50,
        widthCm: 40,
        heightCm: 30,
        items: [
          ["fresh_produce", "Fresh produce", { weightKg: 8, lengthCm: 50, widthCm: 40, heightCm: 30 }],
          ["meat", "Meat", { weightKg: 8, lengthCm: 45, widthCm: 35, heightCm: 25 }],
          ["dairy", "Dairy", { weightKg: 8, lengthCm: 45, widthCm: 35, heightCm: 25 }],
        ],
      },
      {
        value: "frozen_cold_chain",
        label: "Frozen and Cold Chain",
        packageType: "food_cold",
        weightKg: 10,
        lengthCm: 50,
        widthCm: 40,
        heightCm: 30,
        items: [
          ["frozen_food", "Frozen food", { weightKg: 10, lengthCm: 50, widthCm: 40, heightCm: 30 }],
          ["medication_cooling", "Medication requiring cooling", { weightKg: 3, lengthCm: 30, widthCm: 25, heightCm: 20, keywords: ["medicine", "vaccine", "cold chain"] }],
        ],
      },
      {
        value: "prepared_food",
        label: "Prepared Food",
        packageType: "food_cold",
        weightKg: 8,
        lengthCm: 45,
        widthCm: 35,
        heightCm: 25,
        items: [
          ["restaurant_orders", "Restaurant orders", { weightKg: 8, lengthCm: 45, widthCm: 35, heightCm: 25, keywords: ["takeaway", "food delivery"] }],
          ["catering", "Catering", { weightKg: 20, lengthCm: 60, widthCm: 45, heightCm: 40 }],
        ],
      },
    ],
  },
  {
    value: "documents",
    label: "Documents and Parcels",
    subcategories: [
      {
        value: "documents",
        label: "Documents",
        packageType: "documents",
        weightKg: 0.5,
        lengthCm: 35,
        widthCm: 25,
        heightCm: 5,
        items: [
          ["contracts", "Contracts", { weightKg: 0.5, lengthCm: 35, widthCm: 25, heightCm: 5 }],
          ["certificates", "Certificates", { weightKg: 0.3, lengthCm: 35, widthCm: 25, heightCm: 3 }],
          ["legal_papers", "Legal papers", { weightKg: 1, lengthCm: 35, widthCm: 25, heightCm: 8 }],
        ],
      },
      {
        value: "small_parcels",
        label: "Small Parcels",
        packageType: "small_parcel",
        weightKg: 2,
        lengthCm: 30,
        widthCm: 20,
        heightCm: 15,
        items: [
          ["envelopes", "Envelopes", { packageType: "documents", weightKg: 0.3, lengthCm: 35, widthCm: 25, heightCm: 3 }],
          ["small_boxes", "Small boxes", { weightKg: 3, lengthCm: 30, widthCm: 20, heightCm: 15 }],
          ["gifts", "Gifts", { weightKg: 2, lengthCm: 30, widthCm: 25, heightCm: 20 }],
        ],
      },
      {
        value: "mail_packages",
        label: "Mail and Packages",
        packageType: "small_parcel",
        weightKg: 3,
        lengthCm: 35,
        widthCm: 25,
        heightCm: 20,
        items: [
          ["ecommerce_parcels", "E-commerce parcels", { weightKg: 3, lengthCm: 35, widthCm: 25, heightCm: 20, keywords: ["online order", "parcel"] }],
          ["returns", "Returns", { weightKg: 2, lengthCm: 30, widthCm: 25, heightCm: 15 }],
        ],
      },
    ],
  },
  {
    value: "building",
    label: "Building and Hardware",
    subcategories: [
      {
        value: "building_materials",
        label: "Building Materials",
        packageType: "bulky",
        weightKg: 50,
        lengthCm: 80,
        widthCm: 60,
        heightCm: 60,
        items: [
          ["cement", "Cement", { weightKg: 50, lengthCm: 60, widthCm: 40, heightCm: 20 }],
          ["bricks", "Bricks", { weightKg: 200, lengthCm: 100, widthCm: 80, heightCm: 60 }],
          ["timber", "Timber", { weightKg: 80, lengthCm: 200, widthCm: 30, heightCm: 30, keywords: ["wood", "lumber"] }],
          ["roofing", "Roofing", { weightKg: 100, lengthCm: 150, widthCm: 50, heightCm: 50, keywords: ["roof sheets", "tiles"] }],
          ["tiles", "Tiles", { weightKg: 60, lengthCm: 60, widthCm: 60, heightCm: 30 }],
          ["pipes", "Pipes", { weightKg: 30, lengthCm: 200, widthCm: 20, heightCm: 20 }],
        ],
      },
      {
        value: "tools_equipment",
        label: "Tools and Equipment",
        packageType: "bulky",
        weightKg: 15,
        lengthCm: 60,
        widthCm: 40,
        heightCm: 40,
        items: [
          ["power_tools", "Power tools", { weightKg: 12, lengthCm: 60, widthCm: 40, heightCm: 40, keywords: ["drill", "grinder"] }],
          ["hand_tools", "Hand tools", { weightKg: 8, lengthCm: 50, widthCm: 35, heightCm: 30 }],
          ["ladders", "Ladders", { weightKg: 15, lengthCm: 200, widthCm: 30, heightCm: 20 }],
        ],
      },
      {
        value: "paint_finishes",
        label: "Paint and Finishes",
        packageType: "liquids_nonhaz",
        weightKg: 20,
        lengthCm: 35,
        widthCm: 35,
        heightCm: 40,
        items: [
          ["paint", "Paint", { weightKg: 20, lengthCm: 35, widthCm: 35, heightCm: 40 }],
          ["adhesives", "Adhesives", { weightKg: 10, lengthCm: 35, widthCm: 30, heightCm: 30, keywords: ["glue"] }],
          ["sealants", "Sealants", { weightKg: 8, lengthCm: 30, widthCm: 25, heightCm: 25 }],
        ],
      },
      {
        value: "electrical_plumbing",
        label: "Electrical and Plumbing",
        packageType: "bulky",
        weightKg: 20,
        lengthCm: 50,
        widthCm: 40,
        heightCm: 40,
        items: [
          ["cables", "Cables", { weightKg: 15, lengthCm: 50, widthCm: 40, heightCm: 40, keywords: ["wire", "electrical"] }],
          ["geysers", "Geysers", { weightKg: 80, lengthCm: 100, widthCm: 60, heightCm: 60, keywords: ["water heater"] }],
          ["taps", "Taps", { weightKg: 5, lengthCm: 30, widthCm: 20, heightCm: 20, keywords: ["faucet"] }],
          ["fittings", "Fittings", { weightKg: 10, lengthCm: 40, widthCm: 30, heightCm: 30 }],
        ],
      },
    ],
  },
  {
    value: "automotive",
    label: "Automotive",
    subcategories: [
      {
        value: "spare_parts",
        label: "Spare Parts",
        packageType: "tyres_parts",
        weightKg: 25,
        lengthCm: 60,
        widthCm: 60,
        heightCm: 40,
        items: [
          ["tyres", "Tyres", { weightKg: 15, lengthCm: 70, widthCm: 70, heightCm: 30, keywords: ["tires", "wheel"] }],
          ["batteries", "Batteries", { weightKg: 20, lengthCm: 35, widthCm: 25, heightCm: 25, keywords: ["car battery"] }],
          ["engines", "Engines", { weightKg: 150, lengthCm: 80, widthCm: 60, heightCm: 60, keywords: ["engine"] }],
          ["body_panels", "Body panels", { weightKg: 30, lengthCm: 150, widthCm: 60, heightCm: 30, keywords: ["bumper", "door", "panel"] }],
        ],
      },
      {
        value: "car_accessories",
        label: "Accessories",
        packageType: "other",
        weightKg: 10,
        lengthCm: 60,
        widthCm: 40,
        heightCm: 40,
        items: [
          ["car_seats", "Car seats", { weightKg: 12, lengthCm: 60, widthCm: 50, heightCm: 50, keywords: ["child seat", "booster"] }],
          ["roof_racks", "Roof racks", { weightKg: 15, lengthCm: 150, widthCm: 30, heightCm: 20 }],
          ["car_audio", "Audio", { packageType: "electronics", weightKg: 5, lengthCm: 40, widthCm: 30, heightCm: 20, keywords: ["car radio", "speaker"] }],
        ],
      },
      {
        value: "vehicles",
        label: "Vehicles",
        packageType: "bulky",
        weightKg: 150,
        lengthCm: 200,
        widthCm: 80,
        heightCm: 120,
        items: [
          ["motorcycle", "Motorcycle", { weightKg: 180, lengthCm: 220, widthCm: 80, heightCm: 120, keywords: ["bike", "motorbike"] }],
          ["scooter", "Scooter", { weightKg: 100, lengthCm: 180, widthCm: 70, heightCm: 110 }],
          ["bicycle", "Bicycle", { weightKg: 18, lengthCm: 180, widthCm: 60, heightCm: 110, keywords: ["bike", "cycle"] }],
        ],
      },
    ],
  },
  {
    value: "office",
    label: "Office and Commercial",
    subcategories: [
      {
        value: "office_furniture",
        label: "Office Furniture",
        packageType: "furniture",
        weightKg: 30,
        lengthCm: 150,
        widthCm: 80,
        heightCm: 80,
        items: [
          ["office_desks", "Desks", { weightKg: 40, lengthCm: 160, widthCm: 80, heightCm: 75 }],
          ["office_chairs", "Chairs", { weightKg: 12, lengthCm: 100, widthCm: 60, heightCm: 100 }],
          ["cabinets", "Cabinets", { weightKg: 40, lengthCm: 100, widthCm: 50, heightCm: 150 }],
          ["boardroom_tables", "Boardroom tables", { weightKg: 80, lengthCm: 240, widthCm: 110, heightCm: 75 }],
        ],
      },
      {
        value: "retail_stock",
        label: "Retail Stock",
        packageType: "bulky",
        weightKg: 30,
        lengthCm: 100,
        widthCm: 80,
        heightCm: 80,
        items: [
          ["shelving", "Shelving", { weightKg: 30, lengthCm: 100, widthCm: 50, heightCm: 180 }],
          ["display_units", "Display units", { weightKg: 25, lengthCm: 100, widthCm: 60, heightCm: 150 }],
          ["bulk_stock", "Bulk stock", { weightKg: 50, lengthCm: 100, widthCm: 80, heightCm: 80 }],
          ["retail_pallets", "Pallets", { weightKg: 100, lengthCm: 120, widthCm: 100, heightCm: 80 }],
        ],
      },
      {
        value: "stationery",
        label: "Stationery and Supplies",
        packageType: "documents",
        weightKg: 5,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 30,
        items: [
          ["paper", "Paper", { weightKg: 10, lengthCm: 50, widthCm: 40, heightCm: 30, keywords: ["printing paper", "a4"] }],
          ["printer_cartridges", "Printer cartridges", { packageType: "electronics", weightKg: 2, lengthCm: 30, widthCm: 20, heightCm: 15, keywords: ["ink", "toner"] }],
        ],
      },
    ],
  },
  {
    value: "industrial",
    label: "Industrial and Agricultural",
    subcategories: [
      {
        value: "machinery",
        label: "Machinery",
        packageType: "bulky",
        weightKg: 100,
        lengthCm: 100,
        widthCm: 80,
        heightCm: 100,
        items: [
          ["generators", "Generators", { weightKg: 100, lengthCm: 100, widthCm: 80, heightCm: 100 }],
          ["pumps", "Pumps", { weightKg: 50, lengthCm: 80, widthCm: 60, heightCm: 60 }],
          ["compressors", "Compressors", { weightKg: 80, lengthCm: 100, widthCm: 60, heightCm: 80 }],
          ["workshop_machinery", "Workshop machinery", { weightKg: 250, lengthCm: 150, widthCm: 100, heightCm: 150 }],
        ],
      },
      {
        value: "agricultural",
        label: "Agricultural",
        packageType: "bulky",
        weightKg: 30,
        lengthCm: 80,
        widthCm: 60,
        heightCm: 50,
        items: [
          ["seed", "Seed", { weightKg: 25, lengthCm: 60, widthCm: 40, heightCm: 30 }],
          ["fertiliser", "Fertiliser", { weightKg: 50, lengthCm: 80, widthCm: 60, heightCm: 40 }],
          ["feed", "Feed", { weightKg: 40, lengthCm: 80, widthCm: 60, heightCm: 50 }],
          ["farm_equipment", "Farm equipment", { weightKg: 200, lengthCm: 200, widthCm: 100, heightCm: 150 }],
        ],
      },
      {
        value: "bulk_pallet",
        label: "Bulk and Pallet Freight",
        packageType: "bulky",
        weightKg: 80,
        lengthCm: 120,
        widthCm: 100,
        heightCm: 100,
        items: [
          ["industrial_pallets", "Pallets", { weightKg: 100, lengthCm: 120, widthCm: 100, heightCm: 80 }],
          ["drums", "Drums", { weightKg: 80, lengthCm: 60, widthCm: 60, heightCm: 90 }],
          ["crates", "Crates", { weightKg: 60, lengthCm: 100, widthCm: 80, heightCm: 80 }],
        ],
      },
    ],
  },
  {
    value: "sports",
    label: "Sports, Leisure and Kids",
    subcategories: [
      {
        value: "sports_outdoor",
        label: "Sports and Outdoor",
        packageType: "bulky",
        weightKg: 20,
        lengthCm: 80,
        widthCm: 50,
        heightCm: 50,
        items: [
          ["gym_equipment", "Gym equipment", { weightKg: 40, lengthCm: 120, widthCm: 80, heightCm: 100, keywords: ["weights", "fitness"] }],
          ["sports_bicycles", "Bicycles", { weightKg: 18, lengthCm: 180, widthCm: 60, heightCm: 110, keywords: ["bike", "cycle"] }],
          ["camping_gear", "Camping gear", { weightKg: 20, lengthCm: 80, widthCm: 50, heightCm: 50, keywords: ["tent"] }],
          ["fishing_gear", "Fishing gear", { weightKg: 10, lengthCm: 150, widthCm: 20, heightCm: 20, keywords: ["rod", "tackle"] }],
        ],
      },
      {
        value: "baby_kids",
        label: "Baby and Kids",
        packageType: "bulky",
        weightKg: 15,
        lengthCm: 70,
        widthCm: 50,
        heightCm: 50,
        items: [
          ["cots", "Cots", { packageType: "furniture", weightKg: 20, lengthCm: 120, widthCm: 70, heightCm: 30, keywords: ["crib"] }],
          ["prams", "Prams", { weightKg: 15, lengthCm: 100, widthCm: 60, heightCm: 50, keywords: ["stroller", "pushchair"] }],
          ["toys", "Toys", { weightKg: 8, lengthCm: 60, widthCm: 40, heightCm: 40 }],
          ["child_car_seats", "Car seats", { weightKg: 10, lengthCm: 60, widthCm: 50, heightCm: 50, keywords: ["child seat", "booster"] }],
        ],
      },
      {
        value: "musical_instruments",
        label: "Musical Instruments",
        packageType: "fragile_glass",
        weightKg: 10,
        lengthCm: 80,
        widthCm: 40,
        heightCm: 40,
        items: [
          ["guitar", "Guitar", { weightKg: 5, lengthCm: 110, widthCm: 50, heightCm: 20 }],
          ["piano", "Piano", { packageType: "bulky", weightKg: 150, lengthCm: 160, widthCm: 80, heightCm: 120 }],
          ["drum_kit", "Drum kit", { packageType: "bulky", weightKg: 30, lengthCm: 100, widthCm: 80, heightCm: 80 }],
        ],
      },
    ],
  },
  {
    value: "special_handling",
    label: "Special Handling",
    subcategories: [
      {
        value: "fragile",
        label: "Fragile",
        packageType: "fragile_glass",
        weightKg: 5,
        lengthCm: 50,
        widthCm: 40,
        heightCm: 40,
        items: [
          ["glass", "Glass", { weightKg: 8, lengthCm: 60, widthCm: 40, heightCm: 30 }],
          ["artwork", "Artwork", { weightKg: 5, lengthCm: 100, widthCm: 10, heightCm: 80, keywords: ["painting", "art"] }],
          ["antiques", "Antiques", { weightKg: 20, lengthCm: 80, widthCm: 60, heightCm: 60 }],
        ],
      },
      {
        value: "hazardous",
        label: "Hazardous",
        packageType: "restricted_hazmat",
        weightKg: 20,
        lengthCm: 60,
        widthCm: 40,
        heightCm: 40,
        items: [
          ["chemicals", "Chemicals", { weightKg: 20, lengthCm: 50, widthCm: 40, heightCm: 40, blocked: true }],
          ["gas_cylinders", "Gas cylinders", { weightKg: 30, lengthCm: 80, widthCm: 30, heightCm: 30, blocked: true, keywords: ["lpg", "gas"] }],
          ["flammables", "Flammables", { weightKg: 15, lengthCm: 50, widthCm: 40, heightCm: 40, blocked: true, keywords: ["fuel", "petrol"] }],
        ],
      },
      {
        value: "live_medical",
        label: "Live and Medical",
        packageType: "other",
        weightKg: 10,
        lengthCm: 60,
        widthCm: 40,
        heightCm: 40,
        items: [
          ["pets", "Pets", { weightKg: 10, lengthCm: 60, widthCm: 40, heightCm: 40, keywords: ["animal", "pet transport"] }],
          ["plants", "Plants", { weightKg: 5, lengthCm: 60, widthCm: 40, heightCm: 60 }],
          ["medical_equipment", "Medical equipment", { packageType: "electronics", weightKg: 15, lengthCm: 60, widthCm: 50, heightCm: 50, keywords: ["medical device"] }],
        ],
      },
      {
        value: "high_value",
        label: "High Value",
        packageType: "other",
        weightKg: 5,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 30,
        items: [
          ["high_value_jewellery", "Jewellery", { weightKg: 0.5, lengthCm: 20, widthCm: 15, heightCm: 10, keywords: ["jewelry", "valuables"] }],
          ["cash_in_transit", "Cash-in-transit", { weightKg: 5, lengthCm: 40, widthCm: 30, heightCm: 30, keywords: ["cash", "valuables"] }],
          ["high_value_electronics", "Electronics high-value", { packageType: "electronics", weightKg: 5, lengthCm: 45, widthCm: 35, heightCm: 20, keywords: ["laptop", "phone", "valuables"] }],
        ],
      },
    ],
  },
  {
    value: "other",
    label: "Other",
    subcategories: [
      {
        value: "custom_not_listed",
        label: "Custom / not listed",
        packageType: "other",
        weightKg: 5,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 30,
        keywords: ["custom", "other", "not listed", "misc"],
        items: [
          ["custom", "Custom / not listed", { custom: true, keywords: ["custom item", "other", "misc"] }],
        ],
      },
    ],
  },
]

function buildItems(category: CategorySeed, subcategory: SubcategorySeed): CatalogItem[] {
  return subcategory.items.map(([value, label, override]) => {
    const overrides = override ?? {}
    return {
      value,
      label,
      packageType: overrides.packageType ?? subcategory.packageType,
      category: category.value,
      categoryLabel: category.label,
      subcategory: subcategory.value,
      subcategoryLabel: subcategory.label,
      keywords: Array.from(
        new Set([
          ...(subcategory.keywords ?? []),
          ...(overrides.keywords ?? []),
          label.toLowerCase(),
          subcategory.label.toLowerCase(),
          category.label.toLowerCase(),
        ]),
      ),
      defaultWeightKg: overrides.weightKg ?? subcategory.weightKg,
      defaultDimensionsCm: {
        length: overrides.lengthCm ?? subcategory.lengthCm,
        width: overrides.widthCm ?? subcategory.widthCm,
        height: overrides.heightCm ?? subcategory.heightCm,
      },
      blocked: overrides.blocked ?? false,
      custom: overrides.custom ?? false,
    }
  })
}

export const PACKAGE_CATALOG: CatalogCategory[] = CATEGORY_SEEDS.map((category) => ({
  value: category.value,
  label: category.label,
  subcategories: category.subcategories.map((subcategory) => ({
    value: subcategory.value,
    label: subcategory.label,
    items: buildItems(category, subcategory),
  })),
}))

export const CATALOG_ITEMS: CatalogItem[] = PACKAGE_CATALOG.flatMap((category) =>
  category.subcategories.flatMap((subcategory) => subcategory.items),
)

const CATALOG_INDEX = new Map(CATALOG_ITEMS.map((item) => [item.value, item]))

export function getCatalogItem(value: string | null | undefined): CatalogItem | undefined {
  if (!value) return undefined
  return CATALOG_INDEX.get(value)
}

export function getCatalogCategory(value: string | null | undefined): CatalogCategory | undefined {
  if (!value) return undefined
  return PACKAGE_CATALOG.find((category) => category.value === value)
}

export function getCatalogSubcategory(
  categoryValue: string | null | undefined,
  subcategoryValue: string | null | undefined,
): CatalogSubcategory | undefined {
  const category = getCatalogCategory(categoryValue)
  if (!category || !subcategoryValue) return undefined
  return category.subcategories.find((subcategory) => subcategory.value === subcategoryValue)
}

export function catalogItemPath(item: Pick<CatalogItem, "categoryLabel" | "subcategoryLabel" | "label">) {
  return `${item.categoryLabel} > ${item.subcategoryLabel} > ${item.label}`
}

export function parcelCatalogPath(parcel: {
  itemKey?: string | null
  itemLabel?: string | null
  catalogCategory?: string | null
  catalogSubcategory?: string | null
}): string | null {
  const item = getCatalogItem(parcel.itemKey)
  if (item) return catalogItemPath(item)

  if (!parcel.itemLabel) return null

  const category = getCatalogCategory(parcel.catalogCategory)
  const subcategory = getCatalogSubcategory(parcel.catalogCategory, parcel.catalogSubcategory)
  return [category?.label, subcategory?.label, parcel.itemLabel].filter(Boolean).join(" > ")
}

export function isCatalogItemBlocked(item: CatalogItem) {
  return item.blocked || BLOCKED_PACKAGE_TYPES.has(item.packageType)
}

export function searchCatalogItems(query: string): CatalogItem[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []

  return CATALOG_ITEMS.filter((item) => {
    const haystack = [
      item.value,
      item.label,
      item.categoryLabel,
      item.subcategoryLabel,
      item.packageType,
      ...item.keywords,
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(needle)
  })
}

export function catalogItemEstimate(item: CatalogItem, quantity = 1) {
  const qty = Math.max(1, Math.min(50, Math.round(quantity) || 1))
  const scale = Math.cbrt(qty)
  return {
    weight: Math.max(0.1, Math.round(item.defaultWeightKg * qty * 10) / 10),
    length: Math.max(5, Math.round(item.defaultDimensionsCm.length * scale)),
    width: Math.max(5, Math.round(item.defaultDimensionsCm.width * scale)),
    height: Math.max(5, Math.round(item.defaultDimensionsCm.height * scale)),
  }
}

export function catalogItemsByCategory() {
  return PACKAGE_CATALOG
}
