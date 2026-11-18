/* Everything the two concepts know about BalrCutz.
   Services, prices and durations: the shop's own Setmore booking pages (Jaya One and Hartamas), November 2026.
   Barbers and their bios: the same Setmore pages. Ratings, phone numbers and reviews: Google Maps and Setmore.
   Hours: Instagram bio and Setmore ("Open everyday 10am-11pm"). Payment details are placeholders until the shop confirms them. */
(() => {
  const BC = window.BC;

  const brand = {
    name: 'BalrCutz',
    long: 'BalrCutz Barbershop',
    tagline: 'Step in. Level up. Stay sharp.',
    est: 2025,
    whatsapp: '60126061715',
    whatsappLabel: '+60 12-606 1715',
    email: 'balrcutz@gmail.com',
    instagram: 'https://www.instagram.com/balrcutz/',
    instagramHandle: '@balrcutz',
    facebook: 'https://www.facebook.com/people/BalrCutz-Barbershop/61573765353855/',
    linktree: 'https://linktr.ee/balrcutz',
    open: 600, // 10:00
    close: 1380, // 23:00
    hoursLabel: 'Open every day, 10am to 11pm',
    wallLine: 'You are only game ready when you have your fade ready',
  };

  const clubs = {
    jayaone: {
      id: 'jayaone',
      name: 'Jaya One',
      area: 'Petaling Jaya',
      short: 'Jaya One, PJ',
      tag: 'The original',
      address: 'D-55-P2, Block D, Jaya One, 72A Jalan Profesor Diraja Ungku Aziz, Section 13, 46200 Petaling Jaya, Selangor',
      addressShort: 'Block D, Jaya One, Petaling Jaya',
      phone: '+60 11-6850 4975',
      tel: '+601168504975',
      rating: 5.0,
      reviews: 1227,
      maps: 'https://www.google.com/maps/place/Balr+Cutz+@+Jaya+One/@3.1174942,101.6360544,17z',
      lat: 3.1174942, lng: 101.6360544,
      mapsName: 'Balr Cutz @ Jaya One, Petaling Jaya',
      from: ['KL Sentral', 'Mid Valley Megamall', 'Bangsar', 'Damansara Utama', 'Subang Jaya'],
      embed: 'https://maps.google.com/maps?q=Balr%20Cutz%20%40%20Jaya%20One%2C%20Petaling%20Jaya&t=&z=16&ie=UTF8&iwloc=&output=embed',
      setmore: 'https://balrcutz.setmore.com/',
      parking: 'Park in the Jaya One car park, then walk to Block D.',
      photo: 'img/shop/jo-storefront.webp',
    },
    hartamas: {
      id: 'hartamas',
      name: 'Hartamas',
      area: 'Desa Sri Hartamas, Kuala Lumpur',
      short: 'Desa Sri Hartamas, KL',
      tag: 'Locker room and VIP Room',
      address: 'No. 1, 2nd Floor, Jalan 26A/70A, Desa Sri Hartamas, 50480 Kuala Lumpur',
      addressShort: '2nd floor, No. 1 Jalan 26A/70A, Desa Sri Hartamas',
      phone: '+60 11-6133 5922',
      tel: '+601161335922',
      rating: 4.9,
      reviews: 833,
      maps: 'https://www.google.com/maps/place/Balr+Cutz+@+Hartamas/@3.1613454,101.649974,17z',
      lat: 3.1613454, lng: 101.649974,
      mapsName: 'Balr Cutz @ Hartamas, Kuala Lumpur',
      from: ['KL Sentral', 'KLCC', 'Mont Kiara', 'Bangsar', 'Damansara Heights'],
      embed: 'https://maps.google.com/maps?q=Balr%20Cutz%20%40%20Hartamas%2C%20Kuala%20Lumpur&t=&z=16&ie=UTF8&iwloc=&output=embed',
      setmore: 'https://balrcutzhartamas.setmore.com/',
      parking: 'Street and open-lot parking around Jalan 26A/70A.',
      photo: 'img/shop/ht-lockers.webp',
    },
  };

  const cats = [
    { id: 'first', name: 'First visit', note: 'For your first cut with us' },
    { id: 'hair', name: 'Haircuts' },
    { id: 'signature', name: 'Signature sessions' },
    { id: 'extras', name: 'Beard and finishing' },
    { id: 'face', name: 'Face care' },
    { id: 'colour', name: 'Colour' },
    { id: 'scalp', name: 'Scalp care' },
    { id: 'other', name: 'Straightening' },
  ];

  /* at: per-club duration (minutes), price (RM) and the name that club's menu uses, when it differs */
  const services = [
    { id: 'ft-cut', cat: 'first', name: 'First Time Cut + Wash', at: { jayaone: { dur: 30, price: 39 }, hartamas: { dur: 40, price: 39 } },
      blurb: 'A precision cut and a fresh finish, tailored to you. The price for your first cut with us.' },
    { id: 'ft-cut-beard', cat: 'first', name: 'First Time Cut + Wash + Beard', at: { jayaone: { dur: 45, price: 59 }, hartamas: { dur: 60, price: 59, name: 'First Time Cut + Wash + Shave' } },
      blurb: 'Start strong: a precision cut, a wash and a clean beard line or close shave.' },

    { id: 'cut-dry', cat: 'hair', name: 'Haircut, no wash', at: { jayaone: { dur: 30, price: 45, name: 'Haircut without wash' }, hartamas: { dur: 30, price: 45, name: 'Dry Haircut' } },
      blurb: 'The cut on its own. In, sharp, out.' },
    { id: 'cut-wash', cat: 'hair', name: 'Haircut + Wash', at: { jayaone: { dur: 40, price: 55 }, hartamas: { dur: 40, price: 55 } },
      blurb: 'A sharp cut tailored to your style, then a deep cleanse.' },
    { id: 'cut-wash-beard', cat: 'hair', name: 'Haircut + Wash + Beard Trim', at: { jayaone: { dur: 45, price: 65 }, hartamas: { dur: 45, price: 65 } },
      blurb: 'Cut, cleanse and a precision beard trim, so every angle is sharp.' },
    { id: 'supercut', cat: 'hair', name: 'Super Cut', at: { jayaone: { dur: 60, price: 75 }, hartamas: { dur: 60, price: 75 } },
      full: 'Haircut + Wash + Beard Trim + Hot and Cold Towel',
      blurb: 'A detailed cut, wash, beard trim and styling, finished with hot and cold towels.' },
    { id: 'cut-beard-wax', cat: 'hair', name: 'Haircut + Wash + Beard Trim + Wax', at: { hartamas: { dur: 60, price: 100 } },
      blurb: 'The full clean-up: cut, wash, beard trim and nose and ear waxing.' },

    { id: 'mvp', cat: 'signature', name: 'MVP Package', at: { jayaone: { dur: 90, price: 200 }, hartamas: { dur: 60, price: 200 } },
      blurb: 'A pro-level refresh: precision cut, deep cleanse wash and a full facial for a clean, camera-ready finish.',
      includes: ['Consultation with your barber', 'Precision cut', 'Deep cleanse wash', 'Full facial'] },
    { id: 'vip', cat: 'signature', name: 'VIP Room', at: { hartamas: { dur: 90, price: 250 } },
      blurb: 'Our private room: premium haircut and wash, full facial and a keratin-infused hair treatment, with a drink on us.',
      includes: ['Private room', 'Premium haircut + wash', 'Full facial', 'Keratin-infused hair treatment', 'Complimentary drink'] },

    { id: 'beard', cat: 'extras', addon: true, name: 'Beard Trimming', at: { jayaone: { dur: 30, price: 35 }, hartamas: { dur: 30, price: 35 } },
      blurb: 'Shape it, sharpen it, own it.' },
    { id: 'brows', cat: 'extras', addon: true, name: 'Eyebrow Trim', at: { jayaone: { dur: 15, price: 10 } },
      blurb: 'Clean, precise brows. Details make the difference.' },
    { id: 'wash-style', cat: 'extras', addon: true, name: 'Hair Wash + Styling', at: { jayaone: { dur: 15, price: 25 }, hartamas: { dur: 20, price: 25 } },
      blurb: 'A deep cleanse and expert styling. Step out fresh.' },
    { id: 'waxing', cat: 'extras', addon: true, name: 'Nose + Ear Waxing', at: { hartamas: { dur: 30, price: 30 } },
      blurb: 'Quick, clean and precise. Pairs with any cut or facial.' },

    { id: 'facial', cat: 'face', name: 'Full Facial', at: { jayaone: { dur: 60, price: 145 }, hartamas: { dur: 60, price: 145 } },
      blurb: 'A complete facial to cleanse and revitalise your skin.' },
    { id: 'black-mask', cat: 'face', addon: true, name: 'Black Mask', at: { jayaone: { dur: 30, price: 35 }, hartamas: { dur: 30, price: 35 } },
      blurb: 'Activated charcoal draws out impurities and excess oil.' },
    { id: 'face-wash', cat: 'face', addon: true, name: 'Face Wash', at: { jayaone: { dur: 30, price: 45 }, hartamas: { dur: 30, price: 45 } },
      blurb: 'A thorough cleanse that leaves skin clean and comfortable.' },

    { id: 'colour', cat: 'colour', name: 'Hair Colouring', at: { jayaone: { dur: 30, price: 105 }, hartamas: { dur: 30, price: 105 } },
      full: 'Black or brown', blurb: 'Black or brown re-colouring with long-lasting, high-quality colour.' },
    { id: 'beard-colour', cat: 'colour', addon: true, name: 'Beard Colouring', at: { jayaone: { dur: 30, price: 55 }, hartamas: { dur: 30, price: 55 } },
      full: 'Black or brown', blurb: 'Cover greys or go darker with a natural finish.' },

    { id: 'oil-massage', cat: 'scalp', addon: true, name: 'Oil Head Massage', at: { jayaone: { dur: 20, price: 35 } },
      blurb: 'Nourishing oils and pressure work. Relax, reset, walk out lighter.' },
    { id: 'scalp', cat: 'scalp', addon: true, name: 'Scalp Treatment + Massage', at: { jayaone: { dur: 30, price: 65 }, hartamas: { dur: 30, price: 65 } },
      blurb: 'Targeted care for dryness, dandruff or build-up, then a massage.' },

    { id: 'straighten', cat: 'other', name: 'Hair Straightening', at: { jayaone: { dur: 60, price: 195 }, hartamas: { dur: 60, price: 195 } },
      blurb: 'Smooth, sleek and frizz-free, with a long-lasting finish.' },
  ];

  const barbers = [
    { id: 'micheal', name: 'Micheal', club: 'jayaone', years: 12, role: 'General manager and master barber',
      skills: 'Modern and classic cuts, premium styling, beard design', photo: 'img/team/micheal', bio: 'Twelve years behind the chair. Precision, detail and cuts that last.' },
    { id: 'laith', name: 'Laith', club: 'jayaone', years: 7, role: 'Barber',
      skills: 'Zero fades and modern classics', photo: 'img/team/laith', bio: 'Seven years in men\'s grooming. Zero fades are his signature.' },
    { id: 'ammar', name: 'Ammar', club: 'jayaone', years: null, role: 'Barber',
      skills: 'Skin fades, beard styling, precision grooming', photo: 'img/team/ammar', bio: 'Modern cuts and skin fades with a sharp, tailored finish.' },
    { id: 'issa', name: 'Issa', full: 'Issa Hdad', club: 'hartamas', years: 12, role: 'Senior barber',
      skills: 'Colour, skin fades, custom styles', photo: 'img/team/issa', bio: 'Twelve years of precision and colour work. Every look is designed.' },
    { id: 'adam', name: 'Adam', club: 'hartamas', years: 11, role: 'Barber',
      skills: 'Fades, modern cuts, beard grooming', photo: 'img/team/adam', bio: 'Eleven years of fades, modern cuts and detailed styling.' },
    { id: 'noor', name: 'Noor', full: 'Noor Almendel', club: 'hartamas', years: null, role: 'Barber',
      skills: 'Haircuts and full grooming', photo: 'img/team/noor', bio: 'Regulars come back for the cut and the service, again and again.' },
    { id: 'crck', name: 'Crck', club: 'hartamas', years: null, role: 'Barber',
      skills: 'Fades with great conversation', photo: 'img/team/crck', bio: 'Solid cuts, great energy, great conversation.' },
  ];

  /* Real reviews (Google Maps and Setmore). Names shortened to first name and initial. `barber` = the barber the review names.
     `rotate: false` keeps the short ones out of the big rotating quote; they still show on the barber's card. */
  const reviews = [
    { text: 'Hands down one of the best barber experiences I\'ve had. Big shout to my barber Michael. Professional and precise. Level of craftsmanship is tip top.', name: 'Aaron G.', club: 'jayaone', source: 'Google', barber: 'micheal' },
    { text: 'Had an incredible experience here today. Huge shoutout to Laith: top-tier precision, great conversation, and hands down one of the best cuts I\'ve had in a long time.', name: 'Islomali S.', club: 'jayaone', source: 'Google', barber: 'laith' },
    { text: 'The ambience is perfect, especially if you\'re into sports. My barber, Mr. Issa, was friendly and gave some solid suggestions that suited me really well.', name: 'Muhammad A.', club: 'hartamas', source: 'Google', barber: 'issa' },
    { text: 'Got a haircut here for the first time as I had a wedding during the weekend. My barber did an amazing job and was an absolute professional. 11/10 service!', name: 'Mark', club: 'hartamas', source: 'Setmore' },
    { text: 'Michale gave me a great experience, clean haircut especially the fades. For a first timer I would definitely recommend the boys to get their desired haircuts at BalrCutz.', name: 'Loghan K.', club: 'jayaone', source: 'Setmore', barber: 'micheal' },
    { text: 'Adam did an amazing job, did my hairstyle perfectly with beard on point. I will definitely go back next time. They know "ball" if you know what I mean.', name: 'Labib', club: 'hartamas', source: 'Setmore', barber: 'adam' },
    { text: 'Just got a haircut done by our brother Michael. Nicely done! Got exactly what I wanted. Came in with an overgrown mullet, got out a better version.', name: 'Alven I.', club: 'jayaone', source: 'Google', barber: 'micheal' },
    { text: 'Solid haircut by Crack, great energy and conversation. Nice place, highly recommended.', name: 'Zulfadli M.', club: 'hartamas', source: 'Google', barber: 'crck' },
    { text: 'Almendel did a great job with the haircut and service again. Worth my money and will look forward to more sessions.', name: 'Kogulan', club: 'hartamas', source: 'Setmore', barber: 'noor', rotate: false },
    { text: 'Shoutout to Adam. Great first time and well priced as well. Music taste on point.', name: 'Zariff', club: 'hartamas', source: 'Google', barber: 'adam', rotate: false },
    { text: 'Ammar very good one.', name: 'Lei L.', club: 'jayaone', source: 'Setmore', barber: 'ammar', rotate: false },
  ];

  /* Payment set-up. Methods are real Malaysian rails; the account details are placeholders the shop confirms. */
  const pay = {
    deposit: 20,
    methods: [
      { id: 'duitnow', label: 'DuitNow QR', short: 'QR Pay', note: 'Scan with any Malaysian banking app or e-wallet.' },
      { id: 'bank', label: 'Bank transfer', short: 'Bank transfer', note: 'Transfer from your bank app, then upload the receipt.' },
      { id: 'tng', label: 'Touch \'n Go eWallet', short: 'TNG eWallet', note: 'Scan in the TNG eWallet app and confirm.' },
    ],
    bank: { bank: 'Maybank', name: 'BalrCutz Barbershop', number: 'Shared by BalrCutz on confirmation' },
    qrMinutes: 10,
  };

  const total = clubs.jayaone.reviews + clubs.hartamas.reviews;
  const stats = {
    reviews: total,
    rating: Math.round(((clubs.jayaone.rating * clubs.jayaone.reviews + clubs.hartamas.rating * clubs.hartamas.reviews) / total) * 100) / 100,
    barbers: barbers.length,
    clubs: 2,
    hours: (brand.close - brand.open) / 60,
  };

  BC.data = { brand, clubs, cats, services, barbers, reviews, pay, stats };

  /* Lookups */
  BC.svc = (id) => services.find((s) => s.id === id);
  BC.barber = (id) => barbers.find((b) => b.id === id);
  BC.svcAt = (id, club) => { const s = BC.svc(id); return s && s.at[club] ? Object.assign({ id: s.id, cat: s.cat, name: s.name, addon: !!s.addon, blurb: s.blurb, full: s.full }, s.at[club], { name: s.at[club].name || s.name }) : null; };
  BC.menu = (club) => services.filter((s) => s.at[club]).map((s) => BC.svcAt(s.id, club));
  BC.teamAt = (club) => barbers.filter((b) => !club || b.club === club);
})();
