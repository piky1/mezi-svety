# ✦ Mezi Světy — Návod k instalaci a spuštění

## Co aplikace umí

- Hráči se registrují a mají svůj profil s levelem a XP barem
- Admin přidává XP hráčům → při 100 XP nastane level up
- Každý **druhý level** hráč dostane token na **Kolo štěstí**
- Kolo náhodně přidělí kletbu (Slepota / Zmrzačení / Zatčení) do inventáře
- Hráč může kletbu **vyslat na jiného hráče** — kletba trvá do konce dne
- Všichni vidí všechny hráče, jejich levely a aktivní kletby v reálném čase

---

## KROK 1 — Nainstaluj Node.js

1. Jdi na https://nodejs.org
2. Stáhni verzi **LTS** (doporučená)
3. Nainstaluj normálně jako každý program
4. Ověř instalaci: otevři příkazový řádek (CMD / PowerShell) a napiš:
   ```
   node --version
   ```
   Mělo by se zobrazit číslo verze, např. `v20.11.0`

---

## KROK 2 — Vytvoř Firebase projekt (zdarma)

### 2a) Registrace / přihlášení
1. Jdi na https://console.firebase.google.com
2. Přihlas se Google účtem

### 2b) Nový projekt
1. Klikni **"Přidat projekt"**
2. Název projektu: `mezi-svety` (nebo cokoliv chceš)
3. Google Analytics: **vypni** (nepotřebuješ)
4. Klikni **"Vytvořit projekt"**

### 2c) Zapni Authentication (přihlašování)
1. V levém menu klikni na **"Authentication"**
2. Klikni **"Začít"**
3. Záložka **"Sign-in method"** → klikni na **"Email/heslo"**
4. Přepni na **Zapnuto** a ulož

### 2d) Vytvoř Firestore databázi
1. V levém menu klikni na **"Firestore Database"**
2. Klikni **"Vytvořit databázi"**
3. Zvol **"Začít v testovacím režimu"** (bezpečnostní pravidla nastavíme pak)
4. Vyber server nejblíže tobě (např. `europe-west1`) a klikni **"Hotovo"**

### 2e) Registruj webovou aplikaci a získej konfiguraci
1. Klikni na **ozubené kolečko** (⚙️) vedle "Přehled projektu" → **"Nastavení projektu"**
2. Posuň dolů na sekci **"Tvoje aplikace"**
3. Klikni na ikonu **`</>`** (webová aplikace)
4. Název: `mezi-svety-web`, klikni **"Zaregistrovat aplikaci"**
5. Uvidíš konfiguraci — vypadá takto:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "mezi-svety-xxxxx.firebaseapp.com",
     projectId: "mezi-svety-xxxxx",
     storageBucket: "mezi-svety-xxxxx.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
6. **Zkopíruj tato data** — budou potřeba v dalším kroku

---

## KROK 3 — Nastav konfiguraci v kódu

1. Otevři soubor: `src/firebase/config.js`
2. Nahraď placeholdery svými hodnotami z Firebase:

```javascript
const firebaseConfig = {
  apiKey: "SEM_VLOŽ_SVŮJ_API_KEY",
  authDomain: "SEM_VLOŽ_SVŮJ_AUTH_DOMAIN",
  projectId: "SEM_VLOŽ_SVŮJ_PROJECT_ID",
  storageBucket: "SEM_VLOŽ_SVŮJ_STORAGE_BUCKET",
  messagingSenderId: "SEM_VLOŽ_SVŮJ_MESSAGING_SENDER_ID",
  appId: "SEM_VLOŽ_SVŮJ_APP_ID"
}
```

Po úpravě soubor ulož.

---

## KROK 4 — Nastav bezpečnostní pravidla Firestore

1. Ve Firebase konzoli jdi na **Firestore Database** → záložka **"Pravidla"**
2. Smaž vše co tam je a vlož obsah ze souboru `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && (
        request.auth.uid == userId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true
      );
    }
    match /xp_log/{docId} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

3. Klikni **"Publikovat"**

---

## KROK 5 — Spusť aplikaci

1. Otevři příkazový řádek (CMD nebo PowerShell)
2. Přejdi do složky projektu:
   ```
   cd cesta/k/složce/mezi-svety
   ```
   Například:
   ```
   cd C:\Users\TvéJméno\Desktop\mezi-svety
   ```
3. Nainstaluj závislosti (jen poprvé):
   ```
   npm install
   ```
4. Spusť vývojový server:
   ```
   npm run dev
   ```
5. Otevři prohlížeč na adrese: **http://localhost:5173**

---

## KROK 6 — Nastav svůj adminský účet

1. Jdi na http://localhost:5173/registrace
2. Zaregistruj se svým emailem a heslem — tím vznikne tvůj účet
3. Jdi do **Firebase konzole → Firestore Database**
4. V kolekci `users` najdi svůj dokument (hledej podle svého uživatelského jména)
5. Klikni na něj a přidej pole:
   - Název pole: `isAdmin`
   - Typ: `boolean`
   - Hodnota: `true`
6. Ulož — teď máš adminský přístup a uvidíš záložku **"Admin"** v navigaci

---

## KROK 7 — Nasazení na internet (volitelné, zdarma)

Aby aplikace byla dostupná z mobilu nebo pro ostatní hráče:

### Možnost A: Firebase Hosting (doporučeno)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

### Možnost B: Vercel (jednodušší)
1. Jdi na https://vercel.com a přihlas se GitHubem
2. Nahraj kód na GitHub
3. V Vercelu klikni "Import Project" a vyber repozitář
4. Nasazení proběhne automaticky

---

## Struktura souborů

```
mezi-svety/
├── index.html
├── package.json
├── vite.config.js
├── firestore.rules          ← bezpečnostní pravidla
└── src/
    ├── main.jsx             ← vstupní bod
    ├── App.jsx              ← routování
    ├── index.css            ← styly
    ├── firebase/
    │   ├── config.js        ← ← ← SEM VLOž KONFIGURACI
    │   └── db.js            ← všechna logika (XP, kletby, kolo...)
    ├── hooks/
    │   └── useAuth.jsx      ← správa přihlášení
    ├── components/
    │   ├── Nav.jsx          ← navigace
    │   ├── Toast.jsx        ← notifikace
    │   ├── XpBar.jsx        ← XP progress bar
    │   └── CurseList.jsx    ← zobrazení kleteb
    └── pages/
        ├── Login.jsx        ← přihlášení
        ├── Register.jsx     ← registrace
        ├── Postavy.jsx      ← seznam všech hráčů
        ├── Profil.jsx       ← vlastní profil + inventář
        ├── Spin.jsx         ← kolo štěstí
        └── Admin.jsx        ← admin panel
```

---

## Časté problémy

**"npm: command not found"**
→ Node.js není nainstalován. Viz Krok 1.

**Prázdná stránka nebo chyby v konzoli**
→ Zkontroluj, zda jsi správně vyplnil `src/firebase/config.js`

**"Permission denied" při čtení dat**
→ Zkontroluj, zda jsou správně nastavena bezpečnostní pravidla Firestore (Krok 4)

**Admin záložka se nezobrazuje**
→ Ujisti se, že jsi v Firestore nastavil `isAdmin: true` pro svůj účet (Krok 6)

**Kletby neexpirují**
→ Expirují automaticky na konci každého dne (23:59). Aplikace je filtruje při zobrazení.

---

## Jak přidat hráče

Každý hráč si sám vytvoří účet přes `/registrace`. Ty jako admin pak:
1. Přejdeš na záložku **Admin**
2. Najdeš hráče v seznamu
3. Zadáš počet XP a klikneš **+ XP**

Při 100 XP nastane level up automaticky. Každý sudý level = token na kolo štěstí.
