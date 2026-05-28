export interface ExtraOption {
  id: string;
  name: string;
  nameTh: string;
  price: number;
}

export interface Variant {
  id: string;
  name: string;
  nameTh: string;
  priceModifier: number;
}

export interface MenuItem {
  id: string;
  name: string;
  nameTh: string;
  description: string;
  descriptionTh: string;
  price: number;
  image: string;
  variants?: Variant[];
  extras?: ExtraOption[];
}

export interface MenuCategory {
  id: string;
  name: string;
  nameTh: string;
  icon: string;
  items: MenuItem[];
}

export const menuData: MenuCategory[] = [
  {
    id: 'pizze-classiche',
    name: 'Pizze Classiche',
    nameTh: 'พิซซ่าคลาสสิค',
    icon: '🍕',
    items: [
      {
        id: 'margherita',
        name: 'Margherita',
        nameTh: 'มาร์เกริต้า',
        description: 'San Marzano tomato, fior di latte, fresh basil, olive oil',
        descriptionTh: 'ซอสมะเขือเทศซานมาร์ซาโน่, ชีสมอซซาเรลล่า, ใบโหระพาสด, น้ำมันมะกอก',
        price: 280,
        image: 'https://images.pexels.com/photos/905847/pexels-photo-905847.jpeg?auto=compress&cs=tinysrgb&w=600',
        variants: [
          { id: 'small', name: 'Small (25cm)', nameTh: 'เล็ก (25cm)', priceModifier: 0 },
          { id: 'large', name: 'Large (35cm)', nameTh: 'ใหญ่ (35cm)', priceModifier: 80 },
        ],
        extras: [
          { id: 'extra-mozzarella', name: 'Extra Mozzarella', nameTh: 'ชีสเพิ่ม', price: 30 },
          { id: 'extra-basil', name: 'Extra Basil', nameTh: 'โหระพาเพิ่ม', price: 10 },
          { id: 'truffle-oil', name: 'Truffle Oil', nameTh: 'น้ำมันทรัฟเฟิล', price: 40 },
        ],
      },
      {
        id: 'marinara',
        name: 'Marinara',
        nameTh: 'มาริน่าร่า',
        description: 'Tomato, garlic, oregano, extra virgin olive oil — the original',
        descriptionTh: 'ซอสมะเขือเทศ, กระเทียม, ออริกาโน่, น้ำมันมะกอกบริสุทธิ์',
        price: 240,
        image: 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600',
        variants: [
          { id: 'small', name: 'Small (25cm)', nameTh: 'เล็ก (25cm)', priceModifier: 0 },
          { id: 'large', name: 'Large (35cm)', nameTh: 'ใหญ่ (35cm)', priceModifier: 80 },
        ],
        extras: [
          { id: 'extra-mozzarella', name: 'Extra Mozzarella', nameTh: 'ชีสเพิ่ม', price: 30 },
          { id: 'anchovies', name: 'Anchovies', nameTh: 'ปลาแอนโชวี่', price: 40 },
        ],
      },
      {
        id: 'diavola',
        name: 'Diavola',
        nameTh: 'เดียโวล่า',
        description: 'Spicy Calabrian salami, mozzarella, tomato, chilli',
        descriptionTh: 'ซาลามี่คาลาเบรียรสเผ็ด, มอซซาเรลล่า, มะเขือเทศ, พริก',
        price: 320,
        image: 'https://images.pexels.com/photos/2147491/pexels-photo-2147491.jpeg?auto=compress&cs=tinysrgb&w=600',
        variants: [
          { id: 'small', name: 'Small (25cm)', nameTh: 'เล็ก (25cm)', priceModifier: 0 },
          { id: 'large', name: 'Large (35cm)', nameTh: 'ใหญ่ (35cm)', priceModifier: 80 },
        ],
        extras: [
          { id: 'extra-mozzarella', name: 'Extra Mozzarella', nameTh: 'ชีสเพิ่ม', price: 30 },
          { id: 'extra-chilli', name: 'Extra Chilli', nameTh: 'พริกเพิ่ม', price: 10 },
          { id: 'extra-salami', name: 'Extra Salami', nameTh: 'ซาลามี่เพิ่ม', price: 50 },
        ],
      },
      {
        id: 'quattro-formaggi',
        name: 'Quattro Formaggi',
        nameTh: 'ควาตโตร ฟอร์มัจจี',
        description: 'Mozzarella, gorgonzola, taleggio, parmesan',
        descriptionTh: 'มอซซาเรลล่า, กอร์กอนโซล่า, ทาเลจโจ่, พาร์เมซาน',
        price: 350,
        image: 'https://images.pexels.com/photos/4109111/pexels-photo-4109111.jpeg?auto=compress&cs=tinysrgb&w=600',
        variants: [
          { id: 'small', name: 'Small (25cm)', nameTh: 'เล็ก (25cm)', priceModifier: 0 },
          { id: 'large', name: 'Large (35cm)', nameTh: 'ใหญ่ (35cm)', priceModifier: 80 },
        ],
        extras: [
          { id: 'extra-mozzarella', name: 'Extra Mozzarella', nameTh: 'ชีสเพิ่ม', price: 30 },
          { id: 'truffle', name: 'Truffle Oil', nameTh: 'น้ำมันทรัฟเฟิล', price: 40 },
          { id: 'honey', name: 'Honey Drizzle', nameTh: 'น้ำผึ้งราด', price: 20 },
        ],
      },
      {
        id: 'prosciutto-funghi',
        name: 'Prosciutto e Funghi',
        nameTh: 'พรอสชุตโต้ เอ ฟุงกี',
        description: 'Prosciutto cotto, champignon mushrooms, mozzarella, tomato',
        descriptionTh: 'แฮมปรอสชุตโต้, เห็ดชัมปิยอง, มอซซาเรลล่า, มะเขือเทศ',
        price: 330,
        image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600',
        variants: [
          { id: 'small', name: 'Small (25cm)', nameTh: 'เล็ก (25cm)', priceModifier: 0 },
          { id: 'large', name: 'Large (35cm)', nameTh: 'ใหญ่ (35cm)', priceModifier: 80 },
        ],
        extras: [
          { id: 'extra-mozzarella', name: 'Extra Mozzarella', nameTh: 'ชีสเพิ่ม', price: 30 },
          { id: 'extra-mushrooms', name: 'Extra Mushrooms', nameTh: 'เห็ดเพิ่ม', price: 30 },
          { id: 'extra-ham', name: 'Extra Prosciutto', nameTh: 'แฮมเพิ่ม', price: 50 },
        ],
      },
      {
        id: 'salmone',
        name: 'Salmone',
        nameTh: 'ซัลโมเน่',
        description: 'Smoked salmon, capers, cream cheese, red onion',
        descriptionTh: 'แซลมอนรมควัน, เคเปอร์, ครีมชีส, หัวหอมแดง',
        price: 380,
        image: 'https://images.pexels.com/photos/3737619/pexels-photo-3737619.jpeg?auto=compress&cs=tinysrgb&w=600',
        variants: [
          { id: 'small', name: 'Small (25cm)', nameTh: 'เล็ก (25cm)', priceModifier: 0 },
          { id: 'large', name: 'Large (35cm)', nameTh: 'ใหญ่ (35cm)', priceModifier: 80 },
        ],
        extras: [
          { id: 'extra-salmon', name: 'Extra Salmon', nameTh: 'แซลมอนเพิ่ม', price: 60 },
          { id: 'extra-capers', name: 'Extra Capers', nameTh: 'เคเปอร์เพิ่ม', price: 20 },
          { id: 'arugula', name: 'Arugula', nameTh: 'ผักอรูกูล่า', price: 20 },
        ],
      },
    ],
  },
  {
    id: 'antipasti',
    name: 'Antipasti',
    nameTh: 'อาหารเรียกน้ำย่อย',
    icon: '🥗',
    items: [
      {
        id: 'bruschetta',
        name: 'Bruschetta al Pomodoro',
        nameTh: 'บรุสเก็ตต้า',
        description: 'Toasted sourdough, ripe tomato, basil, extra virgin olive oil',
        descriptionTh: 'ขนมปังซาวโดว์ปิ้ง, มะเขือเทศสุก, โหระพา, น้ำมันมะกอก',
        price: 150,
        image: 'https://images.pexels.com/photos/5175537/pexels-photo-5175537.jpeg?auto=compress&cs=tinysrgb&w=600',
        extras: [
          { id: 'add-mozzarella', name: 'Add Mozzarella', nameTh: 'เพิ่มมอซซาเรลล่า', price: 30 },
          { id: 'prosciutto', name: 'Add Prosciutto', nameTh: 'เพิ่มแฮม', price: 50 },
        ],
      },
      {
        id: 'caprese',
        name: 'Caprese',
        nameTh: 'คาเปรเซ่',
        description: 'Buffalo mozzarella, heritage tomato, fresh basil, olive oil',
        descriptionTh: 'มอซซาเรลล่าควาย, มะเขือเทศเฮอร์ริเทจ, โหระพาสด, น้ำมันมะกอก',
        price: 220,
        image: 'https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?auto=compress&cs=tinysrgb&w=600',
        extras: [
          { id: 'balsamic', name: 'Balsamic Glaze', nameTh: 'น้ำส้มบัลซามิค', price: 20 },
          { id: 'extra-mozzarella', name: 'Extra Mozzarella', nameTh: 'ชีสเพิ่ม', price: 30 },
        ],
      },
      {
        id: 'tagliere',
        name: 'Tagliere Misto',
        nameTh: 'ทาเลียเร่ มิสโต้',
        description: 'Selection of Italian cured meats, cheese, olives, and grissini',
        descriptionTh: 'เนื้อสัตว์อิตาเลียนรักษาต่างๆ, ชีส, มะกอก, กริสสินี่',
        price: 350,
        image: 'https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=600',
        extras: [
          { id: 'extra-cheese', name: 'Extra Cheese', nameTh: 'ชีสเพิ่ม', price: 40 },
          { id: 'extra-olives', name: 'Extra Olives', nameTh: 'มะกอกเพิ่ม', price: 20 },
        ],
      },
    ],
  },
  {
    id: 'pasta',
    name: 'Pasta',
    nameTh: 'พาสต้า',
    icon: '🍝',
    items: [
      {
        id: 'carbonara',
        name: 'Spaghetti Carbonara',
        nameTh: 'สปาเกตตี้ คาร์โบนาร่า',
        description: 'Guanciale, egg yolk, pecorino romano, black pepper',
        descriptionTh: 'แก้มหมูอิตาเลียน, ไข่แดง, เพโครีโน่ โรมาโน่, พริกไทยดำ',
        price: 280,
        image: 'https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg?auto=compress&cs=tinysrgb&w=600',
        extras: [
          { id: 'extra-guanciale', name: 'Extra Guanciale', nameTh: 'แก้มหมูเพิ่ม', price: 40 },
          { id: 'extra-pecorino', name: 'Extra Pecorino', nameTh: 'ชีสเพิ่ม', price: 30 },
          { id: 'black-truffle', name: 'Black Truffle', nameTh: 'ทรัฟเฟิลดำ', price: 80 },
        ],
      },
      {
        id: 'arrabbiata',
        name: "Penne all'Arrabbiata",
        nameTh: 'เปนเน่ อาร์ราเบียต้า',
        description: 'Spicy tomato, garlic, parsley — classic Roman',
        descriptionTh: 'ซอสมะเขือเทศเผ็ด, กระเทียม, ผักชีฝรั่ง',
        price: 240,
        image: 'https://images.pexels.com/photos/3807811/pexels-photo-3807811.jpeg?auto=compress&cs=tinysrgb&w=600',
        extras: [
          { id: 'extra-chilli', name: 'Extra Chilli', nameTh: 'พริกเพิ่ม', price: 10 },
          { id: 'parmesan', name: 'Parmesan', nameTh: 'พาร์เมซาน', price: 30 },
          { id: 'chicken', name: 'Add Chicken', nameTh: 'เพิ่มไก่', price: 50 },
        ],
      },
      {
        id: 'ragu',
        name: 'Rigatoni al Ragù',
        nameTh: 'ริกาโตนี่ อัล ราคู',
        description: 'Slow-cooked beef and pork ragù, parmesan',
        descriptionTh: 'ซอสราคูเนื้อวัวและหมูสโลว์คุก, พาร์เมซาน',
        price: 300,
        image: 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600',
        extras: [
          { id: 'extra-sauce', name: 'Extra Sauce', nameTh: 'ซอสเพิ่ม', price: 30 },
          { id: 'extra-parmesan', name: 'Extra Parmesan', nameTh: 'พาร์เมซานเพิ่ม', price: 30 },
        ],
      },
      {
        id: 'scoglio',
        name: 'Linguine allo Scoglio',
        nameTh: 'ลิงกวีเน่ อัลโล สโกลิโอ',
        description: 'Mixed seafood, cherry tomato, white wine, garlic',
        descriptionTh: 'อาหารทะเลรวม, มะเขือเทศเชอรี่, ไวน์ขาว, กระเทียม',
        price: 360,
        image: 'https://images.pexels.com/photos/725997/pexels-photo-725997.jpeg?auto=compress&cs=tinysrgb&w=600',
        extras: [
          { id: 'extra-seafood', name: 'Extra Seafood', nameTh: 'อาหารทะเลเพิ่ม', price: 60 },
          { id: 'chilli', name: 'Add Chilli', nameTh: 'เพิ่มพริก', price: 10 },
        ],
      },
    ],
  },
  {
    id: 'dolci',
    name: 'Dolci',
    nameTh: 'ของหวาน',
    icon: '🍮',
    items: [
      {
        id: 'tiramisu',
        name: 'Tiramisù',
        nameTh: 'ติรามิสุ',
        description: 'Classic recipe — mascarpone, espresso, ladyfingers, cocoa',
        descriptionTh: 'สูตรคลาสสิค — มาสคาร์โปเน่, เอสเปรสโซ่, ลาดี้ฟิงเกอร์, โกโก้',
        price: 160,
        image: 'https://images.pexels.com/photos/6880219/pexels-photo-6880219.jpeg?auto=compress&cs=tinysrgb&w=600',
        extras: [
          { id: 'extra-cocoa', name: 'Extra Cocoa', nameTh: 'โกโก้เพิ่ม', price: 0 },
          { id: 'cream', name: 'Whipped Cream', nameTh: 'วิปครีม', price: 20 },
        ],
      },
      {
        id: 'panna-cotta',
        name: 'Panna Cotta',
        nameTh: 'พานนา คอตต้า',
        description: 'Vanilla cream, seasonal berry coulis',
        descriptionTh: 'ครีมวานิลลา, ซอสเบอร์รี่ตามฤดูกาล',
        price: 140,
        image: 'https://images.pexels.com/photos/3026804/pexels-photo-3026804.jpeg?auto=compress&cs=tinysrgb&w=600',
        extras: [
          { id: 'extra-berries', name: 'Extra Berries', nameTh: 'เบอร์รี่เพิ่ม', price: 20 },
          { id: 'caramel', name: 'Caramel Sauce', nameTh: 'ซอสคาราเมล', price: 20 },
        ],
      },
      {
        id: 'gelato',
        name: 'Gelato Artigianale',
        nameTh: 'เจลาโต้ อาร์ทิจาเนล',
        description: "Artisan gelato — ask our team for today's flavours",
        descriptionTh: 'เจลาโต้ช่างฝีมือ — ถามทีมงานสำหรับรสชาติวันนี้',
        price: 120,
        image: 'https://images.pexels.com/photos/1362534/pexels-photo-1362534.jpeg?auto=compress&cs=tinysrgb&w=600',
        extras: [
          { id: 'extra-scoop', name: 'Extra Scoop', nameTh: 'เพิ่มสกู๊ป', price: 60 },
          { id: 'cone', name: 'Waffle Cone', nameTh: 'โคนวาฟเฟิล', price: 20 },
        ],
      },
    ],
  },
  {
    id: 'bevande',
    name: 'Bevande',
    nameTh: 'เครื่องดื่ม',
    icon: '🥤',
    items: [
      {
        id: 'espresso',
        name: 'Espresso',
        nameTh: 'เอสเปรสโซ่',
        description: 'Single shot Italian espresso',
        descriptionTh: 'เอสเปรสโซ่อิตาเลียนช็อตเดียว',
        price: 60,
        image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=600',
        variants: [
          { id: 'single', name: 'Single', nameTh: 'ช็อตเดียว', priceModifier: 0 },
          { id: 'double', name: 'Double', nameTh: 'สองช็อต', priceModifier: 30 },
        ],
      },
      {
        id: 'cappuccino',
        name: 'Cappuccino',
        nameTh: 'คาปูชิโน่',
        description: 'Espresso, steamed milk, foam — Italian classic',
        descriptionTh: 'เอสเปรสโซ่, นมอุ่น, โฟม — คลาสสิคอิตาเลียน',
        price: 100,
        image: 'https://images.pexels.com/photos/350478/pexels-photo-350478.jpeg?auto=compress&cs=tinysrgb&w=600',
        extras: [
          { id: 'oat-milk', name: 'Oat Milk', nameTh: 'นมโอ๊ต', price: 20 },
          { id: 'extra-shot', name: 'Extra Shot', nameTh: 'ช็อตเพิ่ม', price: 30 },
        ],
      },
      {
        id: 'acqua',
        name: 'Acqua Minerale',
        nameTh: 'น้ำแร่',
        description: 'Still or sparkling mineral water',
        descriptionTh: 'น้ำแร่แบบธรรมดาหรือแบบฟอง',
        price: 50,
        image: 'https://images.pexels.com/photos/327090/pexels-photo-327090.jpeg?auto=compress&cs=tinysrgb&w=600',
        variants: [
          { id: 'still', name: 'Still', nameTh: 'ธรรมดา', priceModifier: 0 },
          { id: 'sparkling', name: 'Sparkling', nameTh: 'มีฟอง', priceModifier: 10 },
        ],
      },
      {
        id: 'limonata',
        name: 'Limonata Fresca',
        nameTh: 'น้ำมะนาวสด',
        description: 'Fresh-squeezed lemon juice, sparkling water, mint',
        descriptionTh: 'น้ำมะนาวคั้นสด, น้ำอัดลม, มิ้นต์',
        price: 90,
        image: 'https://images.pexels.com/photos/2109099/pexels-photo-2109099.jpeg?auto=compress&cs=tinysrgb&w=600',
        extras: [
          { id: 'extra-lemon', name: 'Extra Lemon', nameTh: 'มะนาวเพิ่ม', price: 10 },
          { id: 'syrup', name: 'Sugar Syrup', nameTh: 'น้ำเชื่อม', price: 10 },
        ],
      },
      {
        id: 'birra',
        name: 'Birra Italiana',
        nameTh: 'เบียร์อิตาเลียน',
        description: 'Peroni or Moretti — chilled Italian lager',
        descriptionTh: 'เปโรนี่ หรือ โมเรตตี้ — เบียร์ลาเกอร์อิตาเลียนเย็น',
        price: 150,
        image: 'https://images.pexels.com/photos/1267317/pexels-photo-1267317.jpeg?auto=compress&cs=tinysrgb&w=600',
        variants: [
          { id: 'peroni', name: 'Peroni', nameTh: 'เปโรนี่', priceModifier: 0 },
          { id: 'moretti', name: 'Moretti', nameTh: 'โมเรตตี้', priceModifier: 0 },
        ],
      },
    ],
  },
];
