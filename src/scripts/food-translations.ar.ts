// ─────────────────────────────────────────────────────────────
// src/scripts/food-translations.ar.ts
//
// Curated English → Arabic translations for the USDA FoodData
// Central "Foundation Foods" dataset used by seed-foods.ts.
//
// Keys MUST match the exact `description` string from the source
// JSON. If a description is missing here, the seeder falls back to
// nameAr = null (the row is still inserted).
//
// Regenerate the list of keys to cover with:
//   node -e "const d=require('../../../FoodData_Central_foundation_food_json_2026-04-30.json'); \
//     const s=new Set(); d.FoundationFoods.filter(Boolean).forEach(x=>s.add(x.description)); \
//     [...s].forEach(k=>console.log(k));"
// ─────────────────────────────────────────────────────────────

export const FOOD_NAME_AR: Record<string, string> = {
  "Hummus, commercial": "حُمّص، تجاري",
  "Tomatoes, grape, raw": "طماطم عنبية، نيئة",
  "Beans, snap, green, canned, regular pack, drained solids":
    "فاصوليا خضراء، معلّبة، عبوة عادية، مصفّاة",
  "Frankfurter, beef, unheated": "نقانق فرانكفورتر بقري، غير مُسخّنة",
  "Nuts, almonds, dry roasted, with salt added": "لوز، محمّص جاف، مُملّح",
  "Kale, raw": "كرنب أجعد (كيل)، نيء",
  "Egg, whole, raw, frozen, pasteurized": "بيض كامل، نيء، مجمّد، مُبستر",
  "Egg, white, raw, frozen, pasteurized": "بياض بيض، نيء، مجمّد، مُبستر",
  "Egg, white, dried": "بياض بيض، مجفّف",
  "Onion rings, breaded, par fried, frozen, prepared, heated in oven":
    "حلقات بصل، مغطّاة بالبقسماط، نصف مقلية، مجمّدة، محضّرة في الفرن",
  "Pickles, cucumber, dill or kosher dill": "مخلّل خيار بالشبت",
  "Cheese, parmesan, grated": "جبن بارميزان، مبشور",
  "Cheese, pasteurized process, American, vitamin D fortified":
    "جبن أمريكي مُعالج مُبستر، مدعّم بفيتامين د",
  "Grapefruit juice, white, canned or bottled, unsweetened":
    "عصير جريب فروت أبيض، معلّب أو معبّأ، غير مُحلّى",
  "Peaches, yellow, raw": "خوخ (دُرّاق) أصفر، نيء",
  "Seeds, sunflower seed kernels, dry roasted, with salt added":
    "بذور دوّار الشمس، محمّصة جافة، مُملّحة",
  "Kale, frozen, cooked, boiled, drained, without salt":
    "كرنب أجعد (كيل)، مجمّد، مسلوق، مصفّى، بدون ملح",
  "Mustard, prepared, yellow": "خردل أصفر مُحضّر",
  "Kiwifruit, green, raw": "كيوي أخضر، نيء",
  "Nectarines, raw": "نكتارين، نيء",
  "Cheese, cheddar": "جبن شيدر",
  "Cheese, cottage, lowfat, 2% milkfat": "جبن قريش قليل الدسم، 2% دسم",
  "Cheese, mozzarella, low moisture, part-skim":
    "جبن موزاريلا قليل الرطوبة، نصف منزوع الدسم",
  "Egg, whole, dried": "بيض كامل، مجفّف",
  "Egg, yolk, raw, frozen, pasteurized": "صفار بيض، نيء، مجمّد، مُبستر",
  "Egg, yolk, dried": "صفار بيض، مجفّف",
  "Yogurt, Greek, plain, nonfat": "زبادي يوناني، سادة، خالٍ من الدسم",
  "Yogurt, Greek, strawberry, nonfat": "زبادي يوناني بالفراولة، خالٍ من الدسم",
  "Oil, coconut": "زيت جوز الهند",
  "Chicken, broilers or fryers, drumstick, meat only, cooked, braised":
    "دجاج، ساق (دبوس)، لحم فقط، مطبوخ، مطهو ببطء",
  "Chicken, broiler or fryers, breast, skinless, boneless, meat only, cooked, braised":
    "دجاج، صدر منزوع الجلد والعظم، لحم فقط، مطبوخ، مطهو ببطء",
  "Sauce, pasta, spaghetti/marinara, ready-to-serve":
    "صلصة معكرونة (سباغيتي/مارينارا)، جاهزة للتقديم",
  "Ham, sliced, pre-packaged, deli meat (96%fat free, water added)":
    "لحم خنزير مدخّن، شرائح، معبّأ مسبقاً (96% خالٍ من الدهون، مضاف إليه ماء)",
  "Olives, green, Manzanilla, stuffed with pimiento":
    "زيتون أخضر مانزانيا، محشو بالفلفل الأحمر",
  "Cookies, oatmeal, soft, with raisins": "بسكويت شوفان طري، بالزبيب",
  "Tomatoes, canned, red, ripe, diced": "طماطم معلّبة، حمراء ناضجة، مكعّبات",
  "Fish, haddock, raw": "سمك الحدوق، نيء",
  "Fish, pollock, raw": "سمك البلوق، نيء",
  "Fish, tuna, light, canned in water, drained solids":
    "تونة فاتحة، معلّبة في الماء، مصفّاة",
  "Restaurant, Chinese, fried rice, without meat":
    "مطعم صيني، أرز مقلي، بدون لحم",
  "Restaurant, Latino, tamale, pork": "مطعم لاتيني، تامالي بلحم الخنزير",
  "Restaurant, Latino, pupusas con frijoles (pupusas, bean)":
    "مطعم لاتيني، بوبوساس بالفاصوليا",
  'Beef, loin, tenderloin roast, separable lean only, boneless, trimmed to 0" fat, select, cooked, roasted':
    "لحم بقري، فيليه (تندرلوين)، لحم خالٍ من الدهن، منزوع العظم، منزوع الدهن، درجة سيلكت، مطبوخ، مشوي بالفرن",
  'Beef, loin, top loin steak, boneless, lip-on, separable lean only, trimmed to 1/8" fat, choice, raw':
    "لحم بقري، شريحة توب لوين، منزوع العظم، لحم خالٍ من الدهن، دهن مقلّم 1/8 إنش، درجة تشويس، نيء",
  'Beef, round, eye of round roast, boneless, separable lean only, trimmed to 0" fat, select, raw':
    "لحم بقري، آي أوف راوند، منزوع العظم، لحم خالٍ من الدهن، منزوع الدهن، درجة سيلكت، نيء",
  'Beef, round, top round roast, boneless, separable lean only, trimmed to 0" fat, select, raw':
    "لحم بقري، توب راوند، منزوع العظم، لحم خالٍ من الدهن، منزوع الدهن، درجة سيلكت، نيء",
  'Beef, short loin, porterhouse steak, separable lean only, trimmed to 1/8" fat, select, raw':
    "لحم بقري، شريحة بورترهاوس، لحم خالٍ من الدهن، دهن مقلّم 1/8 إنش، درجة سيلكت، نيء",
  'Beef, short loin, t-bone steak, bone-in, separable lean only, trimmed to 1/8" fat, choice, cooked, grilled':
    "لحم بقري، شريحة تي-بون بالعظم، لحم خالٍ من الدهن، دهن مقلّم 1/8 إنش، درجة تشويس، مطبوخ، مشوي",
  "Carrots, frozen, unprepared": "جزر، مجمّد، غير محضّر",
  "Cheese, dry white, queso seco": "جبن أبيض جاف (كيسو سيكو)",
  "Cheese, ricotta, whole milk": "جبن ريكوتا، حليب كامل الدسم",
  "Cheese, swiss": "جبن سويسري",
  "Figs, dried, uncooked": "تين مجفّف، غير مطبوخ",
  "Lettuce, cos or romaine, raw": "خس روماني (كوس)، نيء",
  "Melons, cantaloupe, raw": "شمّام (كانتالوب)، نيء",
  "Oranges, raw, navels": "برتقال أبو سرّة، نيء",
  "Milk, lowfat, fluid, 1% milkfat, with added vitamin A and vitamin D":
    "حليب سائل قليل الدسم، 1% دسم، مدعّم بفيتامين أ ود",
  "Pears, raw, bartlett": "كمثرى بارتليت، نيئة",
  "Restaurant, Chinese, sweet and sour pork": "مطعم صيني، لحم خنزير حلو وحامض",
  "Salt, table, iodized": "ملح طعام، مُيوْدن",
  "Milk, nonfat, fluid, with added vitamin A and vitamin D (fat free or skim)":
    "حليب سائل خالٍ من الدسم، مدعّم بفيتامين أ ود",
  "Sauce, salsa, ready-to-serve": "صلصة سالسا، جاهزة للتقديم",
  "Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D":
    "حليب سائل مخفّض الدسم، 2% دسم، مدعّم بفيتامين أ ود",
  "Sausage, breakfast sausage, beef, pre-cooked, unprepared":
    "نقانق إفطار بقري، مطبوخة مسبقاً، غير محضّرة",
  "Sausage, Italian, pork, mild, cooked, pan-fried":
    "نقانق إيطالية بلحم الخنزير، خفيفة التوابل، مطبوخة، مقلية في المقلاة",
  "Sausage, pork, chorizo, link or ground, cooked, pan-fried":
    "نقانق تشوريزو بلحم الخنزير، أصابع أو مفروم، مطبوخة، مقلية في المقلاة",
  "Milk, whole, 3.25% milkfat, with added vitamin D":
    "حليب كامل الدسم، 3.25% دسم، مدعّم بفيتامين د",
  "Sausage, turkey, breakfast links, mild, raw":
    "نقانق ديك رومي للإفطار، خفيفة التوابل، نيئة",
  "Sugars, granulated": "سكر مُحبّب",
  "Turkey, ground, 93% lean, 7% fat, pan-broiled crumbles":
    "ديك رومي مفروم، 93% لحم خالص، 7% دهن، مفتّت ومطهو بالمقلاة",
  "Ham, sliced, restaurant": "لحم خنزير مدخّن، شرائح، مطاعم",
  "Cheese, American, restaurant": "جبن أمريكي، مطاعم",
  "Beans, Dry, Medium Red (0% moisture)":
    "فاصوليا جافة، حمراء متوسطة (0% رطوبة)",
  "Beans, Dry, Red (0% moisture)": "فاصوليا جافة، حمراء (0% رطوبة)",
  "Beans, Dry, Flor de Mayo (0% moisture)":
    "فاصوليا جافة، فلور دي مايو (0% رطوبة)",
  "Beans, Dry, Brown (0% moisture)": "فاصوليا جافة، بنية (0% رطوبة)",
  "Beans, Dry, Tan (0% moisture)": "فاصوليا جافة، بيج (0% رطوبة)",
  "Beans, Dry, Light Tan (0% moisture)": "فاصوليا جافة، بيج فاتح (0% رطوبة)",
  "Beans, Dry, Carioca (0% moisture)": "فاصوليا جافة، كاريوكا (0% رطوبة)",
  "Beans, Dry, Cranberry (0% moisture)":
    "فاصوليا جافة، كرانبيري (مرقّطة) (0% رطوبة)",
  "Beans, Dry, Light Red Kidney (0% moisture)":
    "فاصوليا كلوية جافة، حمراء فاتحة (0% رطوبة)",
  "Beans, Dry, Pink (0% moisture)": "فاصوليا جافة، وردية (0% رطوبة)",
  "Beans, Dry, Dark Red Kidney (0% moisture)":
    "فاصوليا كلوية جافة، حمراء داكنة (0% رطوبة)",
  "Beans, Dry, Navy (0% moisture)":
    "فاصوليا بيضاء صغيرة جافة (نيفي) (0% رطوبة)",
  "Beans, Dry, Small White (0% moisture)":
    "فاصوليا بيضاء صغيرة جافة (0% رطوبة)",
  "Beans, Dry, Small Red (0% moisture)": "فاصوليا حمراء صغيرة جافة (0% رطوبة)",
  "Beans, Dry, Black (0% moisture)": "فاصوليا سوداء جافة (0% رطوبة)",
  "Beans, Dry, Pinto (0% moisture)": "فاصوليا بينتو جافة (0% رطوبة)",
  "Beans, Dry, Great Northern (0% moisture)":
    "فاصوليا جريت نورذرن جافة (0% رطوبة)",
  "Broccoli, raw": "بروكلي، نيء",
  "Ketchup, restaurant": "كاتشب، مطاعم",
  "Eggs, Grade A, Large, egg white": "بيض درجة أ، كبير، بياض البيض",
  "Eggs, Grade A, Large, egg yolk": "بيض درجة أ، كبير، صفار البيض",
  "Oil, canola": "زيت الكانولا",
  "Oil, corn": "زيت الذرة",
  "Oil, soybean": "زيت فول الصويا",
  "Oil, olive, extra virgin": "زيت الزيتون البكر الممتاز",
  "Eggs, Grade A, Large, egg whole": "بيض درجة أ، كبير، البيضة كاملة",
  "Pork, cured, bacon, cooked, restaurant":
    "لحم خنزير مُملّح (بيكون)، مطبوخ، مطاعم",
  "Butter, stick, unsalted": "زبدة، أصابع، بدون ملح",
  "Flour, wheat, all-purpose, enriched, bleached":
    "دقيق قمح متعدد الأغراض، مدعّم، مبيّض",
  "Flour, wheat, all-purpose, enriched, unbleached":
    "دقيق قمح متعدد الأغراض، مدعّم، غير مبيّض",
  "Flour, wheat, all-purpose, unenriched, unbleached":
    "دقيق قمح متعدد الأغراض، غير مدعّم، غير مبيّض",
  "Flour, whole wheat, unenriched": "دقيق قمح كامل، غير مدعّم",
  "Flour, bread, white, enriched, unbleached":
    "دقيق خبز أبيض، مدعّم، غير مبيّض",
  "Flour, rice, white, unenriched": "دقيق أرز أبيض، غير مدعّم",
  "Flour, corn, yellow, fine meal, enriched": "دقيق ذرة أصفر، طحن ناعم، مدعّم",
  "Butter, stick, salted": "زبدة، أصابع، مُملّحة",
  "Onions, red, raw": "بصل أحمر، نيء",
  "Onions, yellow, raw": "بصل أصفر، نيء",
  "Garlic, raw": "ثوم، نيء",
  "Flour, soy, defatted": "دقيق فول الصويا، منزوع الدسم",
  "Flour, soy, full-fat": "دقيق فول الصويا، كامل الدسم",
  "Flour, rice, brown": "دقيق أرز بنّي",
  "Flour, rice, glutinous": "دقيق أرز دبق (لزج)",
  "Flour, pastry, unenriched, unbleached": "دقيق معجنات، غير مدعّم، غير مبيّض",
  "Onions, white, raw": "بصل أبيض، نيء",
  "Bananas, overripe, raw": "موز شديد النضج، نيء",
  "Bananas, ripe and slightly ripe, raw": "موز ناضج وشبه ناضج، نيء",
  "Apples, red delicious, with skin, raw": "تفاح ريد ديليشس، بالقشرة، نيء",
  "Apples, fuji, with skin, raw": "تفاح فوجي، بالقشرة، نيء",
  "Apples, gala, with skin, raw": "تفاح غالا، بالقشرة، نيء",
  "Apples, granny smith, with skin, raw": "تفاح جراني سميث، بالقشرة، نيء",
  "Apples, honeycrisp, with skin, raw": "تفاح هاني كرِسب، بالقشرة، نيء",
  "Oil, peanut": "زيت الفول السوداني",
  "Oil, sunflower": "زيت دوّار الشمس",
  "Oil, safflower": "زيت العصفر (القرطم)",
  "Oil, olive, extra light": "زيت زيتون خفيف جداً",
  "Mushroom, lion's mane": "فطر عُرف الأسد",
  "Mushroom, oyster": "فطر المحار",
  "Mushrooms, shiitake": "فطر شيتاكي",
  "Mushrooms, white button": "فطر أبيض (زر)",
  "Soy milk, unsweetened, plain, shelf stable":
    "حليب الصويا، غير مُحلّى، سادة، طويل الأمد",
  "Almond milk, unsweetened, plain, shelf stable":
    "حليب اللوز، غير مُحلّى، سادة، طويل الأمد",
  "Spinach, baby": "سبانخ صغيرة (بيبي)",
  "Spinach, mature": "سبانخ ناضجة",
  "Tomato, roma": "طماطم روما",
  "Flour, 00": "دقيق 00",
  "Flour, spelt, whole grain": "دقيق سبلت (قمح القرون)، حبة كاملة",
  "Flour, semolina, coarse and semi-coarse": "دقيق سميد، خشن ونصف خشن",
  "Flour, semolina, fine": "دقيق سميد، ناعم",
  "Apple juice, with added vitamin C, from concentrate, shelf stable":
    "عصير تفاح، مدعّم بفيتامين ج، من مركّز، طويل الأمد",
  "Orange juice, no pulp, not fortified, from concentrate, refrigerated":
    "عصير برتقال، بدون لب، غير مدعّم، من مركّز، مبرّد",
  "Grape juice, purple, with added vitamin C, from concentrate, shelf stable":
    "عصير عنب أرجواني، مدعّم بفيتامين ج، من مركّز، طويل الأمد",
  "Grape juice, white, with added vitamin C, from concentrate, shelf stable":
    "عصير عنب أبيض، مدعّم بفيتامين ج، من مركّز، طويل الأمد",
  "Cranberry juice, not fortified, from concentrate, shelf stable":
    "عصير توت بري (كرانبيري)، غير مدعّم، من مركّز، طويل الأمد",
  "Grapefruit juice, red, not fortified, not from concentrate, refrigerated":
    "عصير جريب فروت أحمر، غير مدعّم، غير مركّز، مبرّد",
  "Tomato juice, with added ingredients, from concentrate, shelf stable":
    "عصير طماطم، بمكوّنات مضافة، من مركّز، طويل الأمد",
  "Orange juice, no pulp, not fortified, not from concentrate, refrigerated":
    "عصير برتقال، بدون لب، غير مدعّم، غير مركّز، مبرّد",
  "Mushroom, portabella": "فطر بورتابيلا",
  "Mushroom, king oyster": "فطر المحار الملكي",
  "Mushroom, enoki": "فطر إينوكي",
  "Mushroom, crimini": "فطر كريميني",
  "Mushroom, maitake": "فطر مايتاكي",
  "Mushroom, beech": "فطر الزان (بيتش)",
  "Mushroom, pioppini": "فطر بيوبّيني",
  "Soy milk, sweetened, plain, refrigerated":
    "حليب الصويا، مُحلّى، سادة، مبرّد",
  "Almond milk, unsweetened, plain, refrigerated":
    "حليب اللوز، غير مُحلّى، سادة، مبرّد",
  "Oat milk, unsweetened, plain, refrigerated":
    "حليب الشوفان، غير مُحلّى، سادة، مبرّد",
  "Carrots, mature, raw": "جزر ناضج، نيء",
  "Carrots, baby, raw": "جزر صغير (بيبي)، نيء",
  "Peppers, bell, green, raw": "فلفل حلو أخضر (رومي)، نيء",
  "Peppers, bell, yellow, raw": "فلفل حلو أصفر (رومي)، نيء",
  "Peppers, bell, red, raw": "فلفل حلو أحمر (رومي)، نيء",
  "Peppers, bell, orange, raw": "فلفل حلو برتقالي (رومي)، نيء",
  "Buttermilk, low fat": "لبن مخيض (شنينة)، قليل الدسم",
  "Yogurt, plain, whole milk": "زبادي سادة، حليب كامل الدسم",
  "Yogurt, Greek, plain, whole milk": "زبادي يوناني سادة، حليب كامل الدسم",
  "Cheese, parmesan, grated, refrigerated": "جبن بارميزان، مبشور، مبرّد",
  "Cheese, feta, whole milk, crumbled": "جبن فيتا، حليب كامل الدسم، مفتّت",
  "Flour, almond": "دقيق اللوز",
  "Flour, oat, whole grain": "دقيق الشوفان، حبة كاملة",
  "Flour, potato": "دقيق البطاطس",
  "Peanut butter, creamy": "زبدة الفول السوداني، ناعمة",
  "Sesame butter, creamy": "زبدة السمسم (طحينة)، ناعمة",
  "Almond butter, creamy": "زبدة اللوز، ناعمة",
  "Flaxseed, ground": "بذور الكتّان، مطحونة",
  "Cottage cheese, full fat, large or small curd":
    "جبن قريش كامل الدسم، خثارة كبيرة أو صغيرة",
  "Cream cheese, full fat, block": "جبن كريمي كامل الدسم، قالب",
  "Cream, heavy": "كريمة ثقيلة (دسمة)",
  "Cream, sour, full fat": "كريمة حامضة، كاملة الدسم",
  "Lettuce, iceberg, raw": "خس آيسبرغ، نيء",
  "Lettuce, romaine, green, raw": "خس روماني أخضر، نيء",
  "Lettuce, leaf, red, raw": "خس ورقي أحمر، نيء",
  "Lettuce, leaf, green, raw": "خس ورقي أخضر، نيء",
  "Nuts, pine nuts, raw": "صنوبر، نيء",
  "Nuts, almonds, whole, raw": "لوز كامل، نيء",
  "Nuts, walnuts, English, halves, raw": "جوز إنجليزي، أنصاف، نيء",
  "Nuts, pecans, halves, raw": "جوز البقان (بيكان)، أنصاف، نيء",
  "Oats, whole grain, rolled, old fashioned": "شوفان حبة كاملة، مدحرج (تقليدي)",
  "Oats, whole grain, steel cut": "شوفان حبة كاملة، مقطّع خشن",
  "Pineapple, raw": "أناناس، نيء",
  "Cherries, sweet, dark red, raw": "كرز حلو، أحمر داكن، نيء",
  "Beans, snap, green, raw": "فاصوليا خضراء، نيئة",
  "Potatoes, russet, without skin, raw": "بطاطس راسِت، بدون قشرة، نيئة",
  "Potatoes, red, without skin, raw": "بطاطس حمراء، بدون قشرة، نيئة",
  "Potatoes, gold, without skin, raw": "بطاطس ذهبية، بدون قشرة، نيئة",
  "Sweet potatoes, orange flesh, without skin, raw":
    "بطاطا حلوة، لب برتقالي، بدون قشرة، نيئة",
  "Celery, raw": "كرفس، نيء",
  "Cucumber, with peel, raw": "خيار، بالقشرة، نيء",
  "Cabbage, green, raw": "ملفوف أخضر، نيء",
  "Cabbage, red, raw": "ملفوف أحمر، نيء",
  "Strawberries, raw": "فراولة، نيئة",
  "Raspberries, raw": "توت العليق (راسبيري)، نيء",
  "Blueberries, raw": "توت أزرق (بلوبيري)، نيء",
  "Grapes, red, seedless, raw": "عنب أحمر بدون بذور، نيء",
  "Grapes, green, seedless, raw": "عنب أخضر بدون بذور، نيء",
  "Applesauce, unsweetened, with added vitamin C":
    "صلصة تفاح، غير مُحلّاة، مدعّمة بفيتامين ج",
  "Flour, amaranth": "دقيق القطيفة (أمارانث)",
  "Flour, quinoa": "دقيق الكينوا",
  "Flour, sorghum": "دقيق الذرة الرفيعة (سورغم)",
  "Flour, buckwheat": "دقيق الحنطة السوداء",
  "Flour, rye": "دقيق الجاودار (الشيلم)",
  "Flour, barley": "دقيق الشعير",
  "Flour, cassava": "دقيق الكسافا",
  "Buckwheat, whole grain": "حنطة سوداء، حبة كاملة",
  "Millet, whole grain": "دُخن، حبة كاملة",
  "Rice, brown, long grain, unenriched, raw":
    "أرز بنّي، حبة طويلة، غير مدعّم، نيء",
  "Rice, white, long grain, unenriched, raw":
    "أرز أبيض، حبة طويلة، غير مدعّم، نيء",
  "Beef, ground, 90% lean meat / 10% fat, raw":
    "لحم بقري مفروم، 90% لحم خالص / 10% دهن، نيء",
  "Beef, ground, 80% lean meat / 20% fat, raw":
    "لحم بقري مفروم، 80% لحم خالص / 20% دهن، نيء",
  "Pork, ground, raw": "لحم خنزير مفروم، نيء",
  "Chicken, ground, with additives, raw": "دجاج مفروم، بإضافات، نيء",
  "Turkey, ground, 93% lean/ 7% fat, raw":
    "ديك رومي مفروم، 93% لحم خالص / 7% دهن، نيء",
  "Nuts, brazilnuts, raw": "جوز برازيلي، نيء",
  "Nuts, cashew nuts, raw": "كاجو، نيء",
  "Nuts, hazelnuts or filberts, raw": "بندق، نيء",
  "Peanuts, raw": "فول سوداني، نيء",
  "Flour, chestnut": "دقيق الكستناء (أبو فروة)",
  "Nuts, macadamia nuts, raw": "جوز المكاديميا، نيء",
  "Nuts, pistachio nuts, raw": "فستق حلبي، نيء",
  "Seeds, pumpkin seeds (pepitas), raw": "بذور اليقطين (لب)، نيئة",
  "Seeds, sunflower seed, kernel, raw": "بذور دوّار الشمس، اللب، نيء",
  "Flour, coconut": "دقيق جوز الهند",
  "Beans, cannellini, dry": "فاصوليا كانيليني، جافة",
  "Chickpeas, (garbanzo beans, bengal gram), dry": "حمّص (نخود)، جاف",
  "Lentils, dry": "عدس، جاف",
  "Blackeye pea, dry": "لوبيا (بازلاء العين السوداء)، جافة",
  "Beans, black, canned, sodium added, drained and rinsed":
    "فاصوليا سوداء، معلّبة، مضاف إليها صوديوم، مصفّاة ومغسولة",
  "Beans, navy, canned, sodium added, drained and rinsed":
    "فاصوليا بيضاء صغيرة (نيفي)، معلّبة، مضاف إليها صوديوم، مصفّاة ومغسولة",
  "Beans, cannellini, canned, sodium added, drained and rinsed":
    "فاصوليا كانيليني، معلّبة، مضاف إليها صوديوم، مصفّاة ومغسولة",
  "Chickpeas (garbanzo beans, bengal gram), canned, sodium added, drained and rinsed":
    "حمّص (نخود)، معلّب، مضاف إليه صوديوم، مصفّى ومغسول",
  "Beans, kidney, dark red, canned, sodium added, sugar added, drained and rinsed":
    "فاصوليا كلوية حمراء داكنة، معلّبة، مضاف إليها صوديوم وسكر، مصفّاة ومغسولة",
  "Beans, kidney, light red, canned, sodium added, sugar added, drained and rinsed":
    "فاصوليا كلوية حمراء فاتحة، معلّبة، مضاف إليها صوديوم وسكر، مصفّاة ومغسولة",
  "Peas, green, sweet, canned, sodium added, sugar added, drained and rinsed":
    "بازلاء خضراء حلوة، معلّبة، مضاف إليها صوديوم وسكر، مصفّاة ومغسولة",
  "Beans, pinto, canned, sodium added, drained and rinsed":
    "فاصوليا بينتو، معلّبة، مضاف إليها صوديوم، مصفّاة ومغسولة",
  "Blackeye pea, canned, sodium added, drained and rinsed":
    "لوبيا (بازلاء العين السوداء)، معلّبة، مضاف إليها صوديوم، مصفّاة ومغسولة",
  "Beans, great northern, canned, sodium added, drained and rinsed":
    "فاصوليا جريت نورذرن، معلّبة، مضاف إليها صوديوم، مصفّاة ومغسولة",
  "Pork, loin, boneless, raw": "لحم خنزير، خاصرة، منزوع العظم، نيء",
  "Pork, loin, tenderloin, boneless, raw":
    "لحم خنزير، خاصرة، فيليه، منزوع العظم، نيء",
  "Chicken, breast, boneless, skinless, raw":
    "دجاج، صدر، منزوع العظم والجلد، نيء",
  "Chicken, thigh, boneless, skinless, raw":
    "دجاج، فخذ، منزوع العظم والجلد، نيء",
  "Beef, ribeye, steak, boneless, choice, raw":
    "لحم بقري، شريحة ريب آي، منزوع العظم، درجة تشويس، نيء",
  "Beef, round, top round, boneless, choice, raw":
    "لحم بقري، توب راوند، منزوع العظم، درجة تشويس، نيء",
  "Beef, chuck, roast, boneless, choice, raw":
    "لحم بقري، رقبة (تشاك)، قطعة شواء، منزوع العظم، درجة تشويس، نيء",
  "Beef, flank, steak, boneless, choice, raw":
    "لحم بقري، شريحة فلانك (خاصرة)، منزوع العظم، درجة تشويس، نيء",
  "Yogurt, plain, nonfat": "زبادي سادة، خالٍ من الدسم",
  "Cheese, monterey jack, solid": "جبن مونتيري جاك، صلب",
  "Cheese, pasteurized process cheese food or product, American, singles":
    "شرائح جبن أمريكي مُعالج مُبستر",
  "Cheese, provolone, sliced": "جبن بروفولوني، شرائح",
  "Cheese, oaxaca, solid": "جبن واهاكا، صلب",
  "Cheese, queso fresco, solid": "جبن طازج (كيسو فريسكو)، صلب",
  "Cheese, cotija, solid": "جبن كوتيخا، صلب",
  "Fish, salmon, sockeye, wild caught, raw":
    "سمك السلمون الأحمر (سوكآي)، صيد بري، نيء",
  "Fish, salmon, Atlantic, farm raised, raw":
    "سمك السلمون الأطلسي، مستزرع، نيء",
  "Fish, tilapia, farm raised, raw": "سمك البلطي (تيلابيا)، مستزرع، نيء",
  "Crustaceans, shrimp, farm raised, raw": "روبيان (جمبري)، مستزرع، نيء",
  "Fish, cod, Atlantic, wild caught, raw":
    "سمك القد (كود) الأطلسي، صيد بري، نيء",
  "Fish, catfish, farm raised, raw": "سمك السلّور (قرموط)، مستزرع، نيء",
  "Crustaceans, crab, blue swimming, lump, pasteurized, refrigerated":
    "سرطان البحر الأزرق السبّاح، قطع كبيرة، مُبستر، مبرّد",
  "Squash, summer, green, zucchini, includes skin, raw":
    "كوسة خضراء، تشمل القشرة، نيئة",
  "Squash, summer, yellow, includes skin, raw":
    "قرع صيفي أصفر، يشمل القشرة، نيء",
  "Squash, winter, butternut, raw": "قرع شتوي (باترنت)، نيء",
  "Squash, winter, acorn, raw": "قرع شتوي (آكورن)، نيء",
  "Cabbage, bok choy, raw": "ملفوف بوك تشوي (الصيني)، نيء",
  "Cauliflower, raw": "قرنبيط، نيء",
  "Collards, raw": "كرنب أخضر (كولارد)، نيء",
  "Brussels sprouts, raw": "كرنب بروكسل، نيء",
  "Beets, raw": "بنجر (شمندر)، نيء",
  "Eggplant, raw": "باذنجان، نيء",
  "Tomatoes, whole, canned, solids and liquids, with salt added":
    "طماطم كاملة، معلّبة، صلبة وسائلة، مضاف إليها ملح",
  "Tomato, sauce, canned, with salt added":
    "صلصة طماطم، معلّبة، مضاف إليها ملح",
  "Tomato, paste, canned, without salt added":
    "معجون طماطم، معلّب، بدون ملح مضاف",
  "Tomatoes, crushed, canned": "طماطم مهروسة، معلّبة",
  "Tomato, puree, canned": "بيوريه طماطم، معلّب",
  "Apricot, with skin, raw": "مشمش، بالقشرة، نيء",
  "Melons, honeydew, raw": "شمّام عسلي (هانيديو)، نيء",
  "Plantains, ripe, raw": "موز الجنة ناضج، نيء",
  "Plantains, underripe, raw": "موز الجنة شبه ناضج، نيء",
  "Chia seeds, dry, raw": "بذور الشيا، جافة، نيئة",
  "Bulgur, dry, raw": "برغل، جاف، نيء",
  "Wild rice, dry, raw": "أرز بري، جاف، نيء",
  "Arugula, baby, raw": "جرجير صغير (بيبي)، نيء",
  "Asparagus, green, raw": "هليون أخضر، نيء",
  "Avocado, Hass, peeled, raw": "أفوكادو هاس، مقشّر، نيء",
  "Rice, black, unenriched, raw": "أرز أسود، غير مدعّم، نيء",
  "Corn, sweet, yellow and white kernels,  fresh, raw":
    "ذرة حلوة، حبات صفراء وبيضاء، طازجة، نيئة",

  "Corn, sweet, yellow and white kernels, fresh, raw":
    "ذرة حلوة، حبات صفراء وبيضاء، طازجة، نيئة",

  "Einkorn, grain, dry, raw": "قمح أينكورن، حبوب، جافة، نيئة",
  "Farro, pearled, dry, raw": "فارو، مقشور، جاف، نيء",
  "Fonio, grain, dry, raw": "فونيو، حبوب، جافة، نيئة",
  "Khorasan, grain, dry, raw": "قمح خراسان (كاموت)، حبوب، جافة، نيئة",
  "Kiwifruit (kiwi), green, peeled, raw": "كيوي أخضر، مقشّر، نيء",
  "Mandarin, seedless, peeled, raw": "يوسفي (ماندرين) بدون بذور، مقشّر، نيء",
  "Mango, Tommy Atkins, peeled, raw": "مانجو تومي أتكنز، مقشّرة، نيئة",
  "Mango, Ataulfo, peeled, raw": "مانجو أتاولفو، مقشّرة، نيئة",
  "Corn flour, masa harina, white or yellow, dry, raw":
    "دقيق ذرة (ماسا هارينا)، أبيض أو أصفر، جاف، نيء",
  "Pear, Anjou, green, with skin, raw": "كمثرى أنجو خضراء، بالقشرة، نيئة",
  "Plum, black, with skin, raw": "برقوق أسود، بالقشرة، نيء",
  "Rice, red, unenriched, dry, raw": "أرز أحمر، غير مدعّم، جاف، نيء",
  "Sorghum bran, white, unenriched, dry, raw":
    "نخالة الذرة الرفيعة، بيضاء، غير مدعّمة، جافة، نيئة",
  "Sorghum flour, white, pearled, unenriched, dry, raw":
    "دقيق الذرة الرفيعة، أبيض، مقشور، غير مدعّم، جاف، نيء",
  "Sorghum grain, white, pearled, unenriched, dry, raw":
    "حبوب الذرة الرفيعة، بيضاء، مقشورة، غير مدعّمة، جافة، نيئة",
  "Sorghum, whole grain, white, dry, raw":
    "ذرة رفيعة، حبة كاملة، بيضاء، جافة، نيئة",
  "Plantains, overripe, raw": "موز الجنة شديد النضج، نيء",
  "Chicken, drumstick, meat and skin, raw": "دجاج، ساق، لحم وجلد، نيء",
  "Chicken, thigh, meat and skin, raw": "دجاج، فخذ، لحم وجلد، نيء",
  "Chicken, wing, meat and skin, raw": "دجاج، جناح، لحم وجلد، نيء",
  "Chicken, breast, meat and skin, raw": "دجاج، صدر، لحم وجلد، نيء",
  "Lamb, ground, raw": "لحم ضأن مفروم، نيء",
  "Bison, ground, raw": "لحم بيسون (ثور أمريكي) مفروم، نيء",
  "Beef, short loin (NY strip steak), raw":
    "لحم بقري، شريحة نيويورك سترِب، نيء",
  "Beef, tenderloin steak, raw": "لحم بقري، شريحة فيليه (تندرلوين)، نيء",
  "Beef, top sirloin steak, raw": "لحم بقري، شريحة توب سيرلوين، نيء",
  "Pork, chop, center cut, raw": "لحم خنزير، شريحة من الوسط، نيئة",
  "Pork, belly, with skin, raw": "لحم خنزير، بطن، بالجلد، نيء",
  "Pawpaw, peeled, seeded, raw": "بابو (باباو)، مقشّر، منزوع البذور، نيء",
  "Squash, pie pumpkin, peeled, seeded, raw":
    "يقطين الفطائر، مقشّر، منزوع البذور، نيء",
  "Squash, spaghetti, peeled, seeded, raw":
    "قرع السباغيتي، مقشّر، منزوع البذور، نيء",
  "Rutabaga, peeled, raw": "لفت سويدي (روتاباغا)، مقشّر، نيء",
  "Blackberries, raw": "توت العُلّيق الأسود (بلاكبيري)، نيء",
  "Tomatillos, dehusked, raw": "طماطم تومّاتيلو، منزوعة القشرة، نيئة",
  "Cabbage, napa, leaf, destemmed, raw":
    "ملفوف نابا، أوراق، منزوعة الساق، نيئة",
  "Leeks, bulb and greens, root removed, raw":
    "كرّاث، البصلة والأوراق، منزوع الجذر، نيء",
  "Green onion, (scallion), bulb and greens, root removed, raw":
    "بصل أخضر، البصلة والأوراق، منزوع الجذر، نيء",
  "Shallots, bulb, peeled, root removed, raw":
    "بصل الإشالوت، البصلة، مقشّرة، منزوعة الجذر، نيئة",
  "Juice, prune, shelf-stable": "عصير البرقوق المجفّف، طويل الأمد",
  "Juice, pomegranate, from concentrate, shelf-stable":
    "عصير الرمّان، من مركّز، طويل الأمد",
  "Juice, tart cherry, from concentrate, shelf-stable":
    "عصير الكرز الحامض، من مركّز، طويل الأمد",
  "Anchovies, canned in olive oil, with salt, drained":
    "أنشوجة، معلّبة في زيت الزيتون، مع ملح، مصفّاة",
  "Beet greens, raw": "أوراق البنجر (الشمندر)، نيئة",
  "Cod, Pacific or Alaskan, frozen, wild caught":
    "سمك القد، المحيط الهادئ أو ألاسكا، مجمّد، صيد بري",
  "Fennel, bulb, raw": "شمر (شمار)، البصلة، نيئة",
  "Halibut, frozen, wild caught": "سمك الهلبوت، مجمّد، صيد بري",
  "Lobster, tail only, frozen, wild caught":
    "كركند (لوبستر)، الذيل فقط، مجمّد، صيد بري",
  "Mahi mahi, frozen, wild caught": "سمك ماهي ماهي (الدلفين)، مجمّد، صيد بري",
  "Parsnips, raw": "جزر أبيض (باستِناج)، نيء",
  "Peppers, banana or Hungarian wax, seeded, raw":
    "فلفل موزي (شمعي مجري)، منزوع البذور، نيء",
  "Peppers, jalapeno, seeded, raw": "فلفل هالابينو، منزوع البذور، نيء",
  "Peppers, poblano, seeded, raw": "فلفل بوبلانو، منزوع البذور، نيء",
  "Peppers, serrano, seeded, raw": "فلفل سيرّانو، منزوع البذور، نيء",
  "Radicchio, raw": "هندباء حمراء (راديكيو)، نيئة",
  "Radishes, red, raw": "فجل أحمر، نيء",
  "Scallops, bay, Patagonian, frozen, wild caught":
    "إسكالوب الخليج الباتاغوني، مجمّد، صيد بري",
  "Scallops, sea, frozen, wild caught": "إسكالوب البحر، مجمّد، صيد بري",
  "Sea bass, Chilean, frozen, wild caught":
    "قاروص (سي باس) تشيلي، مجمّد، صيد بري",
  "Snapper, frozen, wild caught": "سمك النهّاش (سنابر)، مجمّد، صيد بري",
  "Snow crab, legs only, frozen": "سرطان الثلج، الأرجل فقط، مجمّد",
  "Squid (calamari), frozen, tubes only":
    "حبّار (كاليماري)، مجمّد، الأنابيب فقط",
  "Swordfish, frozen, wild caught": "سمك أبو سيف، مجمّد، صيد بري",
  "Tuna, ahi or yellowfin, frozen, wild caught":
    "تونة (آهي أو صفراء الزعانف)، مجمّدة، صيد بري",
  "Turnips, raw": "لفت، نيء",
  "Watermelon, seedless, flesh only, raw":
    "بطيخ (حبحب) بدون بذور، اللب فقط، نيء",
  "Watermelon, seedless, rind only, raw":
    "بطيخ (حبحب) بدون بذور، القشرة فقط، نيئة",
};

// 19 USDA food categories present in this dataset. The food_items
// table currently has no category_ar column, so this is exported
// only for logging / future use.
export const FOOD_CATEGORY_AR: Record<string, string> = {
  "Legumes and Legume Products": "البقوليات ومنتجاتها",
  "Vegetables and Vegetable Products": "الخضروات ومنتجاتها",
  "Sausages and Luncheon Meats": "النقانق واللحوم الباردة",
  "Nut and Seed Products": "المكسرات والبذور ومنتجاتها",
  "Dairy and Egg Products": "منتجات الألبان والبيض",
  "Fruits and Fruit Juices": "الفواكه وعصائرها",
  "Spices and Herbs": "التوابل والأعشاب",
  "Fats and Oils": "الدهون والزيوت",
  "Poultry Products": "منتجات الدواجن",
  "Soups, Sauces, and Gravies": "الشوربات والصلصات والمرق",
  "Baked Products": "المخبوزات",
  "Finfish and Shellfish Products": "الأسماك والمأكولات البحرية",
  "Restaurant Foods": "أطعمة المطاعم",
  "Beef Products": "منتجات لحم البقر",
  Sweets: "الحلويات",
  "Pork Products": "منتجات لحم الخنزير",
  "Cereal Grains and Pasta": "الحبوب والمعكرونة",
  Beverages: "المشروبات",
  "Lamb, Veal, and Game Products": "لحوم الضأن والعجل والطرائد",
};
