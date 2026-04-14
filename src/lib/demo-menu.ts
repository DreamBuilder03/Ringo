// Shared menu lookup for demo calls (web + outbound phone).
// Known-chain matches take priority over cuisine-based fallback so the agent
// speaks real items for recognizable restaurants instead of hallucinating.

const CHAIN_MENUS: Array<{ match: RegExp; menu: string }> = [
  { match: /little caesars/i, menu: 'Hot-N-Ready Pepperoni Pizza $6, ExtraMostBestest Pepperoni $9, Classic Cheese $6, Crazy Combo (8 breadsticks + sauce) $4.50, 2-Liter Pepsi $3' },
  { match: /domino'?s/i, menu: 'Medium Hand-Tossed Pepperoni $13, Philly Cheese Steak Pizza $15, Chicken Alfredo Pasta $8, Parmesan Bread Bites $6, 20oz Coke $2.50' },
  { match: /pizza hut/i, menu: 'Large Pepperoni Pan Pizza $15, Supreme Pan $18, 8 Traditional Wings $11, Breadsticks $6, Hershey Cookie $7' },
  { match: /papa john'?s/i, menu: 'Large Pepperoni $14, The Works $17, Chicken Parmesan Papadia $8, Garlic Knots $6, 2-Liter Pepsi $3.50' },
  { match: /chipotle/i, menu: 'Chicken Burrito $10, Steak Bowl $12, Carnitas Tacos (3) $11, Chips & Guacamole $5, Mexican Coke $3.50' },
  { match: /taco bell/i, menu: 'Crunchwrap Supreme $5, Chicken Quesadilla $6, 3-Soft-Taco Combo $8, Nacho Fries $3, Baja Blast $2.50' },
  { match: /mcdonald'?s/i, menu: 'Big Mac $6, Quarter Pounder with Cheese $7, 10pc McNuggets $6.50, Large Fries $4, McFlurry $5' },
  { match: /burger king/i, menu: 'Whopper $7, Bacon King $10, 9pc Nuggets $4, Large Onion Rings $4.50, Vanilla Shake $4' },
  { match: /wendy'?s/i, menu: "Dave's Single $6.50, Baconator $9, 10pc Nuggets $5, Chili (small) $3, Frosty $2.50" },
  { match: /chick-?fil-?a/i, menu: 'Original Chicken Sandwich $6, Spicy Deluxe $8, 8ct Nuggets $5, Waffle Fries $3, Frosted Lemonade $5' },
  { match: /subway/i, menu: 'Footlong Italian BMT $10, 6" Turkey Breast $6, Meatball Marinara $8, Chocolate Chip Cookie $1, Fountain Drink $2.50' },
  { match: /jimmy john'?s/i, menu: "#4 Turkey Tom $7, #9 Italian Night Club $9, #16 Club Lulu $9, Kickin' Ranch Chips $2, Chocolate Chunk Cookie $2" },
  { match: /panda express/i, menu: 'Orange Chicken Plate $10, Kung Pao Chicken $10, Beijing Beef Bowl $9, Chow Mein $4, Cream Cheese Rangoons $2.50' },
  { match: /starbucks/i, menu: 'Grande Caffè Latte $5, Caramel Macchiato $6, Vanilla Sweet Cream Cold Brew $5.50, Butter Croissant $4, Cake Pop $3' },
  { match: /dunkin/i, menu: 'Medium Hot Coffee $3, Iced Caramel Latte $5, Bacon, Egg & Cheese Croissant $6, Glazed Donut $1.50, Hash Browns $2' },
  { match: /panera/i, menu: 'Broccoli Cheddar Soup (bread bowl) $9, Chipotle Chicken Avocado Melt $12, Greek Salad $11, Baguette $3, Chocolate Chipper $2.50' },
  { match: /olive garden/i, menu: 'Chicken Alfredo $20, Tour of Italy $24, Lasagna Classico $20, Unlimited Soup/Salad/Breadsticks $10, Tiramisu $9' },
  { match: /chili'?s/i, menu: 'Oldtimer Burger $11, Chicken Crispers $14, Fajita Trio $21, Bottomless Chips & Salsa $5, Molten Chocolate Cake $8' },
  { match: /applebee'?s/i, menu: 'Bourbon Street Chicken & Shrimp $16, Oriental Chicken Salad $14, Classic Burger $13, Mozzarella Sticks $9, Blondie $8' },
  { match: /ihop/i, menu: 'Original Buttermilk Pancakes $9, 2x2x2 Breakfast $11, French Toast Combo $13, Hash Browns $4, OJ $4' },
  { match: /denny'?s/i, menu: 'Grand Slam $10, Moons Over My Hammy $12, Bacon Avocado Cheeseburger $13, Hash Browns $4, Coffee $3' },
  { match: /waffle house/i, menu: 'All-Star Special $10, Pecan Waffle $5, Texas Bacon Cheesesteak Melt $9, Hashbrowns (smothered) $4, Coffee $2.50' },
  { match: /shake shack/i, menu: "ShackBurger $7, SmokeShack $9, Chick'n Shack $8, Crinkle Cut Fries $4, Vanilla Shake $6" },
  { match: /in-?n-?out/i, menu: 'Double-Double $5.75, Cheeseburger $3.50, Hamburger $3, Fries $2.50, Neapolitan Shake $3.25' },
  { match: /five guys/i, menu: 'Cheeseburger $10, Bacon Cheeseburger $12, Little Hamburger $8, Regular Fries $5, Milkshake $6' },
  { match: /kfc/i, menu: '8pc Bucket $23, Original Recipe Chicken Sandwich $5, Famous Bowl $6, Mac & Cheese $3, Biscuit $1.50' },
  { match: /popeyes/i, menu: 'Classic Chicken Sandwich $5, 3pc Spicy Tenders Combo $10, 8pc Bone-In Meal $22, Cajun Fries $3, Biscuit $1.50' },
  { match: /raising cane'?s/i, menu: "Box Combo (4 tenders) $10, 3 Finger Combo $9, Caniac Combo (6 tenders) $14, Crinkle-Cut Fries $3, Cane's Sauce (extra) $0.75" },
  { match: /jersey mike'?s/i, menu: "#13 Original Italian (regular) $9, #7 Turkey & Provolone $9, Mike's Famous Philly (regular) $11, Chips $2, Cookie $2" },
];

function stubMenuByCuisine(cuisine: string): string {
  const c = (cuisine || '').toLowerCase();
  if (c.includes('pizza')) return 'Cheese Pizza $12, Pepperoni Pizza $14, Supreme Pizza $17, Garlic Knots $6, Caesar Salad $8';
  if (c.includes('mexican') || c.includes('taco'))
    return 'Carne Asada Taco $4.50, Chicken Burrito $11, Chips & Salsa $5, Quesadilla $9, Horchata $3';
  if (c.includes('chinese'))
    return 'General Tso Chicken $13, Beef & Broccoli $14, Vegetable Fried Rice $9, Egg Rolls $5, Wonton Soup $6';
  if (c.includes('sushi') || c.includes('japan'))
    return 'California Roll $8, Spicy Tuna Roll $10, Salmon Nigiri $6, Miso Soup $4, Edamame $5';
  if (c.includes('burger') || c.includes('american'))
    return 'Classic Cheeseburger $12, Bacon Burger $14, Chicken Sandwich $11, Fries $5, Milkshake $6';
  if (c.includes('indian'))
    return 'Chicken Tikka Masala $15, Lamb Vindaloo $16, Garlic Naan $3, Samosa $5, Mango Lassi $4';
  if (c.includes('thai'))
    return 'Pad Thai $13, Green Curry $14, Tom Yum Soup $7, Spring Rolls $6, Thai Iced Tea $4';
  if (c.includes('coffee') || c.includes('cafe') || c.includes('bakery'))
    return 'Latte $5, Cappuccino $4.50, Croissant $4, Avocado Toast $11, Chocolate Chip Cookie $3';
  // Generic fallback — no cuisine-committing items so the agent can stay flexible.
  return "Today's Special (ask host for details), House Plate, Chef's Sampler, Soft Drink, Dessert of the Day";
}

export function stubMenuFor(restaurantName: string, cuisine: string): string {
  for (const { match, menu } of CHAIN_MENUS) {
    if (match.test(restaurantName || '')) return menu;
  }
  return stubMenuByCuisine(cuisine);
}
