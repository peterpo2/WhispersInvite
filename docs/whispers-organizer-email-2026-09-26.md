# Email до организатора

До: bgacheva@gmail.com

Subject: WHISPERS Invite - спецификация, текущ flow и въпроси

---

Здравей,

Пращам обобщение на всичко, което имаме до момента за WHISPERS Invite, плюс въпросите, които трябва да уточним преди финалната разработка.

Накратко:

- имаме текущ live invitation flow
- подготвяме регистрация с име, email и телефон
- ако гост добави друг човек, email-ът на добавения човек е задължителен
- за +1 не събираме телефон в публичния flow
- добавяме опция "Would you like us to reserve a table for you?"
- ако гостът избере резервация на маса, ще показваме "Our team will contact you with the reservation details."
- билетите и локацията ще бъдат заключени до 09.10 в 18:00
- на 09.10 в 18:00 всеки човек ще получи собствен private ticket link
- всеки билет ще има собствен QR код, който отваря ticket page в браузър
- ако table reservation е потвърдена, в билета ще пише само че масата е потвърдена, без номер на маса/floor plan
- в края добавяме дискретен Powered by блок с логата на спонсорите
- сайтът го правим основно за iPhone users и ще го тестваме първо на iPhone/Safari
- подготвяме admin страница със Scanner, Members и Tables
- Members ще има търсачка, сортиране, check-in toggle и export към CSV/Excel/Google Sheets-friendly формат
- Tables ще позволява разпределяне на групите по маси
- admin достъпът ще бъде подготвен за username/password + email confirmation code, но няма да го включваме преди домейн/email setup
- admin session ще важи 1 ден
- admin users ще се пазят server-side/в базата данни
- засега махаме referral flow-а и работим само с основния invitation flow

Прикачвам `.md` файл с цялата спецификация, edge case-овете и въпросите:

`docs/whispers-organizer-spec-and-questions-2026-09-26.md`

Моля те, прегледай го и ми върни насоки по въпросите вътре, особено за:

1. кога ще имаме финалното видео, font и brand/sponsor assets
2. реална схема на масите
3. финалните admin email адреси
4. финални промени по guest-facing текстовете, ако има такива

След като имаме тези отговори, ще можем да заключим финалния flow и да продължим спокойно с implementation-а.
