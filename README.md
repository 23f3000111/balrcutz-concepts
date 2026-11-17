# BalrCutz Barbershop: website concepts

Two concept websites for **BalrCutz Barbershop**, the sports-themed barbershop with two clubs: **Jaya One** in Petaling Jaya and **Desa Sri Hartamas** in Kuala Lumpur. Both are built to get a visitor into a chair: pick a club, service, barber and time, pay, done.

| | Concept | Folder | Look and motion |
|---|---|---|---|
| A | The Clubhouse | `site-a-clubhouse/` | Professional, clean and chic. Black with white type and one red; headlines in Fraunces Black, the interface in Archivo. The hero is exactly one screen tall: their fade film runs the full height on the right, the copy lines up with its top and bottom, and a live "next free chair" line books the soonest slot in one tap. Every section sits on one 12-column grid with a hairline under its heading; the menu is set like the white price card on the shop wall; the two clubs' cards line up row for row. Motion is calm: masked line rises, slow clip wipes, soft parallax, nothing bounces. |
| B | Game Day | `site-b-gameday/` | The first BalrCutz layout (`BalerCutz-V1.html`) rebuilt section for section: preloader, centred hero, marquee, split about, MVP timeline, services, red stats bar, barbers, reviews, two locations, gallery, socials, final call. Set in one serif family (Roboto Serif, condensed black for the big type). Motion bounces: the badge drops into the hero like a ball, letters land, barbers are jerseys that flip, buttons squash. |

`index.html` at the root is a chooser that links to both.

**Live:** https://23f3000111.github.io/balrcutz-concepts/

## In both concepts

- **Booking calendar** (`shared/js/booking.js`), laid out like the Cal.com month view on the reference site (summary on the left, month in the middle, times on the right):
  1. Service: both clubs' real menus with prices and durations, grouped by type, plus add-ons (beard trim, brows, waxing, masks, scalp care) that add to the total and the time.
  2. Barber: any barber (first free chair) or one of the seven, filtered by club.
  3. Day and time: a month grid with open and fully booked days, free times grouped by morning, afternoon and evening, 12 or 24 hour clock.
  4. Details and a **style brief** for the barber: fade height, length on top, beard, a reference photo and notes. First-time visitors are offered the first-visit price.
  5. Quote and payment: pay a RM 20 deposit, pay in full, or pay at the shop. Methods: **DuitNow QR**, **bank transfer** (with receipt upload) and **Touch 'n Go eWallet**.
  6. A ticket-style confirmation with **add to calendar** (.ics) and **send to BalrCutz on WhatsApp**.
  Every "Book" button on the page (menu lines, service cards, barbers, clubs, the hero finder in A) pre-fills the widget.
- **Coach, the chat** (`shared/js/chat.js`), modelled on the MIR (Malaysia Industrial Realtors) assistant:
  - A lead gate first: name, WhatsApp number, optional email, consent line, and a "prefer WhatsApp?" link.
  - Free text with intent detection plus quick replies. It understands a whole request in one line ("book a fade with Laith tomorrow at 3pm" picks Jaya One, Laith, tomorrow and checks 3pm) and asks only for what is missing.
  - Books inside the conversation with the same rules as the widget (club, service, extras, barber, day strip or month grid, free times, style brief with photo), shows the quote, takes payment by DuitNow QR, bank transfer or TNG eWallet (or pay at the shop) and ends with the ticket.
  - **Group quotes** for weddings, teams, birthdays and shoots: occasion, headcount, club, service and date, with an estimate and how many rounds of chairs it takes.
  - Answers prices, the menu, barbers, both locations with directions, parking, hours, payment, walk-ins, the first-visit offer, the MVP Package and VIP Room, cancelling, kids and products; anything else goes to the team on WhatsApp with the question written out.
  - Every lead, everything the visitor asked about, each quote and each booking is filed for the shop.
- **Front desk** (`shared/js/desk.js`): the staff view of what the site collects. Bookings (with payment status and the style brief), leads with the topics they asked about, quote requests and full chat transcripts. Export bookings as CSV. Open it from the footer ("Staff: front desk") or from any confirmation.
- Both clubs with Google Maps, phone numbers, hours and parking; real Google and Setmore reviews; the shop's own photos and Instagram reels; Instagram, Facebook and WhatsApp links.
- **Motion**: GSAP with ScrollTrigger and SplitText, Lenis smooth scrolling. Concept A uses the calm set, concept B the bouncy set (`shared/js/fx.js`). `prefers-reduced-motion` turns it off and everything stays visible and usable.
- Big, bold serif type in both, black first with white and red. Laptop first: both heroes fit a 1366 x 768 laptop with its browser bars (about 1366 x 633 of page) as well as 1280, 1440 and 1920 wide; phones work but were not polished.

## What is not connected yet

- **Bookings, leads and payments live in the visitor's browser** (`localStorage`: `bc.desk`, `bc.taken`, `bc.chat`, `bc.lead`). GitHub Pages cannot receive them. To go live, post the same records from `BC.book.commit()` and `BC.desk.add()` to the shop's booking system (they use Setmore today) or a small backend, and send reminders through the WhatsApp Business Platform.
- **Availability is simulated**, seeded per barber and day so it is stable between visits; demo bookings block their slot. A live version reads real calendars (Setmore has an API).
- **Payments are a demo.** The QR codes carry plain text, not a DuitNow payload, so no banking app can pay them. A live version would use the shop's DuitNow QR or a gateway (for example Billplz, iPay88 or Stripe with FPX and Touch 'n Go), the shop's real bank account, and payment confirmation from the gateway instead of the "I've paid" button.
- **Coach is rule based** and runs in the browser. The same flows can move to a server or into WhatsApp itself.

## What is real and what to confirm with the client

**Real, from BalrCutz's own channels:**
- Every service, price and duration at both clubs, the service descriptions, the barbers and their bios, and the booking policy ("cancel or reschedule anytime before the appointment time"): balrcutz.setmore.com and balrcutzhartamas.setmore.com, 17 November 2026.
- The badge, the wordmark and the shop photos: the Setmore pages. The photo shoot of barbers in jerseys: the first concept's image folder.
- The reels (Hartamas opening, fade work, the locker room, the team in jerseys) and the bio ("Locker room vibes. Barbershop precision", "Open everyday 10am-11pm"): Instagram @balrcutz.
- "You are only game ready when you have your fade ready": painted on the Hartamas locker room wall (seen in the opening reel).
- Addresses, branch phone numbers, ratings (Jaya One 5.0 from 1,227 reviews, Hartamas 4.9 from 833), the place photos and the reviews: Google Maps. Names are shortened.
- The first-visit prices RM 39 and RM 59 (also on the poster at the Hartamas entrance), the MVP Package and the VIP Room.
- "Step in. Level up. Stay sharp." and "Where style meets sport": the shop's own Setmore copy.

**Written for the mockup, to confirm:**
- The **RM 20 deposit**, the **10% group rate for five or more** and the group-quote flow are proposals.
- **Bank details** are placeholders ("shared by BalrCutz on confirmation"); the bank name shown (Maybank) is a placeholder too.
- **"Coach"** is a suggested name for the assistant.
- Jersey numbers in B are years behind the chair where the Setmore bios give them (Micheal 12, Laith 7, Issa 12, Adam 11); the others wear the house 00.
- Specialties for Noor and Crck are drawn from customer reviews because their Setmore profiles have no bio. Ammar's experience is not stated.
- Parking notes are general ("Jaya One car park, Block D"; "street and open-lot parking around Jalan 26A/70A").

**Worth telling the client:**
- **Hours differ by source**: Instagram and both Setmore pages say every day 10am to 11pm; Google Maps lists Jaya One as closing at 10pm. The sites use 10am to 11pm.
- **Phone numbers**: Setmore lists +60 12-606 1715 for both clubs; Google lists +60 11-6850 4975 (Jaya One) and +60 11-6133 5922 (Hartamas). The sites use the Google numbers per club and +60 12-606 1715 for WhatsApp.
- The style brief and reference photo in both booking flows mean a barber knows the fade height, the length on top and the beard before the client sits down, which saves the "what are we doing today" conversation and the occasional cut that goes shorter than wanted.
- The first concept's hours ("Tuesday closed, 10am to 9pm") and prices (haircut from RM 35, MVP from RM 65) are out of date; these concepts use today's Setmore menu.

## Run locally

```bash
python -m http.server 8765     # then open http://127.0.0.1:8765/
```

The build and test tools are kept out of the repository. They include a browser test, run at 1366 x 633, of the hero fit, the next free chair, every booking path, each payment method, the presets, the chat (gate, one-line booking, prices, places, group quote, fallback), the front desk, downloads, reduced motion and phone width (122 checks across both concepts).
