export const APPS_SCRIPT_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APPS_SCRIPT_URL) ||
  "https://script.google.com/macros/s/AKfycbyUMRVcdasDxGIaaPKbSzhEVbkKyMyYLNv4-NQ8pyGJEjWOukRPzS3Pt5Da6_CdNmP33Q/exec";
export const SHEET_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SHEET_URL) ||
  "https://docs.google.com/spreadsheets/d/1u7oYu63G28y54byhOw-2KS3nlt7GrpmbkT3uKMX2b8M/edit?gid=1496727423#gid=1496727423";

export const WORKFLOW_STATUSES = [
  "PENDING",
  "IN REVIEW",
  "APPROVED / REJECT",
  "DISPATCHED",
  "DELIVERED"
];

export const CATEGORIES = [
  { id: "INITIAL", name: "Initial Trademark", active: true },
  { id: "EXAMINATION", name: "Examination", active: false, placeholder: true },
  { id: "COPYRIGHT", name: "Copyright", active: false, placeholder: true },
  { id: "OPPOSITION", name: "Opposition", active: false, placeholder: true },
  { id: "ADDRESS_LAB", name: "Address Lab", active: false, placeholder: true }
];

export const LAW_FIRM_DEFAULT = {
  name: "BRANDEX LAW ASSOCIATES",
  addr: "DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004"
};

export interface Consultant {
  name: string;
  addr: string;
}

export const CONSULTANT_DATA: Consultant[] = [
  LAW_FIRM_DEFAULT,
  {name:"JAN ONLINE SERVICES/ADISTAAN", addr:"OPPOSITE GRASSY GROUND, SAIDU SHARIF, SWAT CELL # 0307-9118062, 0343-9832412"},
  {name:"NOOR BAAF LAW ASSOCIATES", addr:"PROPERTY NO.1284, CHOWK FAROOQ-E-AZAM, COLONY NO.1, KHANEWAL 03006339721"},
  {name:"AZIZ LAW ASSOCIATES", addr:"OFFICE NO 1, AL-GHURAIR GIGA PAKISTAN (PVT LTD), DHA 2, ISLAMABAD"},
  {name:"MS TAX & FINANCE CONSULTANT", addr:"OFFICE # FF-275 & FF-183, DEANS TRADE CENTER OPPOSITE STATE BANK PESHAWAR CANTT CELL # 03149090397, 03349027935"},
  {name:"MS BRAND EXPERTS (PVT.) LIMITED", addr:"OFFICE NO 06-07,1ST FLOOR, WALAYAT PLAZA REHMANABAD, MURREE ROAD, RAWALPINDI PHONE # 051-4932363"},
  {name:"KK CONSULTANT SMC-PVT LIMITED", addr:"LG 25, MIDCITY MALL, MURREE ROAD RWALPINDI. PH: 03349590247"},
  {name:"SHEIKH LAW ASSOCIATES", addr:"DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # +92 303 2200723"},
  {name:"M. TARIQ SHAIKH LAW FIRM", addr:"DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004"},
  {name:"CONSULTANCYFIN", addr:"FLAT # D905, GREY NOOR TOWER, SCHEME 33, KARACHI"},
  {name:"M/S. SOLUTION LEGACY", addr:"F-173/2. MARTIN ROAD KARACHI PH +92 335 4522225"},
  {name:"M/S. BRAND EXPERTS (PVT.) LIMITED", addr:"OFFICE NO 06-07,1ST FLOOR, WALAYAT PLAZA REHMANABAD, MURREE ROAD, RAWALPINDI PHONE # 051-4932363"},
  {name:"S.A.T.H CONSULTANTS", addr:"DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004"},
  {name:"BADAR CONSULTANTS", addr:"OPPOSITE GRASSY GROUND, SAIDU SHARIF, SWAT CELL # 0307-9118062, 0343-9832412"},
  {name:"MS HAFIZ M. ALI WARRAICH", addr:"DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004"},
  {name:"TAXATIONIST CORPORATE CONSULTANTS", addr:"DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004"},
  {name:"MUHAMMAD ADNAN BIN YOUSAF ASSOCIATES", addr:"OFFICE # 6, LOWER GROUND FLOOR, MEDIACOM TRADE CITY, JARANWALA ROAD, FAISALABAD 03006933982"}
];

export interface ClassItem {
  n: number;
  type: 'GOODS' | 'SERVICES';
  desc: string;
}

export const CLASS_DATA: ClassItem[] = [
  {n:1,  type:'GOODS', desc:'Chemicals for use in industry, science and photography, as well as in agriculture, horticulture and forestry; unprocessed artificial resins, unprocessed plastics; fire extinguishing and fire prevention compositions; tempering and soldering preparations; substances for tanning animal skins and hides; adhesives for use in industry; putties and other paste fillers; compost, manures, fertilizers; biological preparations for use in industry and science.'},
  {n:2,  type:'GOODS', desc:'Paints, varnishes, lacquers; preservatives against rust and against deterioration of wood; colorants, dyes; inks for printing, marking and engraving; raw natural resins; metals in foil and powder form for use in painting, decorating, printing and art.'},
  {n:3,  type:'GOODS', desc:'Non-medicated cosmetics and toiletry preparations; non-medicated dentifrices; perfumery, essential oils; bleaching preparations and other substances for laundry use; cleaning, polishing and abrasive preparations.'},
  {n:4,  type:'GOODS', desc:'Industrial oils and greases, wax; lubricants; dust absorbing, wetting and binding compositions; fuels and illuminants; candles and wicks for lighting.'},
  {n:5,  type:'GOODS', desc:'Pharmaceuticals, medical and veterinary preparations; sanitary preparations for medical purposes; dietetic food and substances adapted for medical or veterinary use, food for babies; dietary supplements for human beings and animals; plasters, materials for dressings; material for stopping teeth, dental wax; disinfectants; preparations for destroying vermin; fungicides, herbicides.'},
  {n:6,  type:'GOODS', desc:'Common metals and their alloys, ores; metal materials for building and construction; transportable buildings of metal; non-electric cables and wires of common metal; small items of metal hardware; metal containers for storage or transport; safes.'},
  {n:7,  type:'GOODS', desc:'Machines, machine tools, power-operated tools; motors and engines, except for land vehicles; machine coupling and transmission components, except for land vehicles; agricultural implements, other than hand-operated; incubators for eggs; automatic vending machines.'},
  {n:8,  type:'GOODS', desc:'Hand tools and implements, hand-operated; cutlery; side arms, except firearms; razors.'},
  {n:9,  type:'GOODS', desc:'Scientific, research, navigation, surveying, photographic, cinematographic, audiovisual, optical, weighing, measuring, signalling, detecting, testing, inspecting, life-saving and teaching apparatus and instruments; apparatus and instruments for conducting, switching, transforming, accumulating, regulating or controlling the distribution or use of electricity; apparatus and instruments for recording, transmission, reproduction or processing of sound, images or data; recorded and downloadable media, computer software, blank digital or analogue recording and storage media; mechanisms for coin-operated apparatus; cash registers, calculating devices; computers and computer peripheral devices; diving suits, divers masks, ear plugs for divers, nose clips for divers and swimmers, gloves for divers, breathing apparatus for underwater swimming; fire-extinguishing apparatus.'},
  {n:10, type:'GOODS', desc:'Surgical, medical, dental and veterinary apparatus and instruments; artificial limbs, eyes and teeth; orthopaedic articles; suture materials; therapeutic and assistive appliances adapted for persons with disabilities; massage apparatus; apparatus, devices and articles for nursing infants; sexual activity devices, appliances and articles.'},
  {n:11, type:'GOODS', desc:'Apparatus and installations for lighting, heating, cooling, steam generating, cooking, drying, ventilating, water supply and sanitary purposes.'},
  {n:12, type:'GOODS', desc:'Vehicles; apparatus for locomotion by land, air or water.'},
  {n:13, type:'GOODS', desc:'Firearms; ammunition and projectiles; explosives; fireworks.'},
  {n:14, type:'GOODS', desc:'Precious metals and their alloys; jewellery, precious and semi-precious stones; horological and chronometric instruments.'},
  {n:15, type:'GOODS', desc:'Musical instruments; music stands and stands for musical instruments; conductors batons.'},
  {n:16, type:'GOODS', desc:'Paper and cardboard; printed matter; bookbinding material; photographs; stationery and office requisites, except furniture; adhesives for stationery or household purposes; artists materials; paintbrushes; typewriters and office requisites (except furniture); instructional and teaching material; plastic sheets, films and bags for wrapping and packaging; printers type, printing blocks.'},
  {n:17, type:'GOODS', desc:'Unprocessed and semi-processed rubber, gutta-percha, gum, asbestos, mica and substitutes for all these materials; plastics in extruded form for use in manufacture; packing, stopping and insulating materials; flexible pipes, tubes and fittings, not of metal.'},
  {n:18, type:'GOODS', desc:'Leather and imitations of leather; animal skins and hides; luggage and carrying bags; umbrellas and parasols; walking sticks; whips, harness and saddlery; collars, leashes and clothing for animals.'},
  {n:19, type:'GOODS', desc:'Materials, not of metal, for building and construction; rigid pipes, not of metal, for building; asphalt, pitch and bitumen; transportable buildings, not of metal; monuments, not of metal.'},
  {n:20, type:'GOODS', desc:'Furniture, mirrors, picture frames; containers, not of metal, for storage or transport; unworked or semi-worked bone, horn, whalebone or mother-of-pearl; shells; meerschaum; yellow amber.'},
  {n:21, type:'GOODS', desc:'Household or kitchen utensils and containers; cookware and tableware, except forks, knives and spoons; combs and sponges; brushes, except paintbrushes; brush-making materials; articles for cleaning purposes; unworked or semi-worked glass, except building glass; glassware, porcelain and earthenware.'},
  {n:22, type:'GOODS', desc:'Ropes and string; nets; tents and tarpaulins; awnings of textile or synthetic materials; sails; sacks for the transport and storage of materials in bulk; padding, cushioning and stuffing materials, except of paper, cardboard, rubber or plastics; raw fibrous textile materials and substitutes therefor.'},
  {n:23, type:'GOODS', desc:'Yarns and threads for textile use.'},
  {n:24, type:'GOODS', desc:'Textiles and substitutes for textiles; household linen; curtains of textile or plastic.'},
  {n:25, type:'GOODS', desc:'Clothing, footwear, headwear.'},
  {n:26, type:'GOODS', desc:'Lace and embroidery, ribbons and braid; buttons, hooks and eyes, pins and needles; artificial flowers; hair decorations; false hair.'},
  {n:27, type:'GOODS', desc:'Carpets, rugs, mats and matting, linoleum and other materials for covering existing floors; wall hangings, not of textile.'},
  {n:28, type:'GOODS', desc:'Games, toys and playthings; video game apparatus; gymnastic and sporting articles; decorations for Christmas trees.'},
  {n:29, type:'GOODS', desc:'Meat, fish, poultry and game; meat extracts; preserved, frozen, dried and cooked fruits and vegetables; jellies, jams, compotes; eggs; milk, cheese, butter, yogurt and other milk products; oils and fats for food.'},
  {n:30, type:'GOODS', desc:'Coffee, tea, cocoa and artificial coffee; rice, pasta and noodles; tapioca and sago; flour and preparations made from cereals; bread, pastries and confectionery; chocolate; ice cream, sorbets and other edible ices; sugar, honey, treacle; yeast, baking-powder; salt, seasonings, spices, preserved herbs; vinegar, sauces and other condiments; ice (frozen water).'},
  {n:31, type:'GOODS', desc:'Raw and unprocessed agricultural, aquacultural, horticultural and forestry products; raw and unprocessed grains and seeds; fresh fruits and vegetables, fresh herbs; natural plants and flowers; bulbs, seedlings and seeds for planting; live animals; foodstuffs and beverages for animals; malt.'},
  {n:32, type:'GOODS', desc:'Beers; non-alcoholic beverages; mineral and aerated waters; fruit beverages and fruit juices; syrups and other non-alcoholic preparations for making beverages.'},
  {n:33, type:'GOODS', desc:'Alcoholic beverages, except beers; alcoholic preparations for making beverages.'},
  {n:34, type:'GOODS', desc:'Tobacco and tobacco substitutes; cigarettes and cigars; electronic cigarettes and oral vaporizers for smokers; smokers articles; matches.'},
  {n:35, type:'SERVICES', desc:'Advertising; business management, organization and administration; office functions.'},
  {n:36, type:'SERVICES', desc:'Financial, monetary and banking services; insurance services; real estate affairs.'},
  {n:37, type:'SERVICES', desc:'Construction services; installation and repair services; mining extraction, oil and gas drilling.'},
  {n:38, type:'SERVICES', desc:'Telecommunications services.'},
  {n:39, type:'SERVICES', desc:'Transport; packaging and storage of goods; travel arrangement.'},
  {n:40, type:'SERVICES', desc:'Treatment of materials; recycling of waste and rubbish; air purification and water treatment; printing services; food and drink preservation.'},
  {n:41, type:'SERVICES', desc:'Education; providing of training; entertainment; sporting and cultural activities.'},
  {n:42, type:'SERVICES', desc:'Scientific and technological services and research and design relating thereto; industrial analysis, industrial research and design services; quality control and authentication services; design and development of computer hardware and software.'},
  {n:43, type:'SERVICES', desc:'Services for providing food and drink; temporary accommodation.'},
  {n:44, type:'SERVICES', desc:'Medical services; veterinary services; hygienic and beauty care for human beings or animals; agriculture, horticulture and forestry services.'},
  {n:45, type:'SERVICES', desc:'Legal services; security services for the physical protection of tangible property and individuals; personal and social services rendered by others to meet the needs of individuals.'}
];
