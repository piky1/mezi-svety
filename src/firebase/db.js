import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, addDoc, where, limit, runTransaction
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { db, auth } from './config'

export const XP_PER_LEVEL = 100

// ─── Globální nastavení (sdílené přes celou hru) ───
export const subscribeToSettings = (callback) =>
  onSnapshot(doc(db, 'settings', 'app'), (snap) =>
    callback(snap.exists() ? snap.data() : {}))

export const setLevelsHidden = (hidden) =>
  setDoc(doc(db, 'settings', 'app'), { levelsHidden: hidden }, { merge: true })

// ─── Vzácnosti (rarity) ───
// `weight` = SKUTEČNÁ šance losování (59/29/9/3 – NESAHAT).
// `visualWeight` = jen velikost dílku na kole. Reálná šance se NEMĚNÍ.
// Pozn.: id zůstávají kvůli návaznosti na uložené kletby; mění se jen názvy a barvy:
//   id 'legendary' = zobrazeno jako „Epic" (fialová), id 'exotic' = „Legendary" (zlatá).
export const RARITIES = [
  { id: 'common',    name: 'Common',    icon: '⚪', weight: 59, visualWeight: 54, wheelColor: '#8a8a92', gem: { base: '#8a8a92', tab: '#bcbcc3', str: '#56565d' } },
  { id: 'rare',      name: 'Rare',      icon: '🔵', weight: 29, visualWeight: 29, wheelColor: '#4488bb', gem: { base: '#4488bb', tab: '#83bce2', str: '#285a80' } },
  { id: 'legendary', name: 'Epic',      icon: '🟣', weight: 9,  visualWeight: 11, wheelColor: '#8844aa', gem: { base: '#8844aa', tab: '#b974d6', str: '#592c72' } },
  { id: 'exotic',    name: 'Legendary', icon: '🟡', weight: 3,  visualWeight: 6,  wheelColor: '#c9a84c', gem: { base: '#c9a84c', tab: '#ecd692', str: '#8a6f1e' } },
]

export const RARITY_BY_ID = Object.fromEntries(RARITIES.map(r => [r.id, r]))

// ─── Všechny kletby (id musí zůstat stabilní – ukládá se do inventářů) ───
export const CURSES = [
  // ── COMMON (šedá) ──
  { id: 'milan',        rarity: 'common', icon: '🪵', name: 'Milanova kletba',            desc: 'Nosíš s sebou klacek.' },
  { id: 'piky',         rarity: 'common', icon: '👓', name: 'Pikyho kletba',            desc: 'Dostaneš speciální brýle.' },
  { id: 'klid_pohoda',  rarity: 'common', icon: '🎧', name: 'Kletba klidu, míru a pohody', desc: 'Dostaneš špunty do uší.' },
  { id: 'cringe',       rarity: 'common', icon: '💀', name: 'Kletba smrti cringem',       desc: 'V každé větě musíš říct „skibidi".' },
  { id: 'definitni',    rarity: 'common', icon: '✅', name: 'Definitní kletba',           desc: 'Odpovídáš jenom ano/ne.' },
  { id: 'ewa_farna',    rarity: 'common', icon: '🎤', name: 'Ewa Farna kletba',           desc: 'Všechno, co chceš říct, musíš zazpívat.' },
  { id: 'stary_tabor',  rarity: 'common', icon: '✋', name: 'Kletba starého tábora',      desc: 'Dostaneš stopku na 2 minuty.' },
  { id: 'oralni',       rarity: 'common', icon: '🤐', name: 'Orální kletba',              desc: 'Musíš být potichu. Pokud promluvíš, vylosuje se ti jedna z legendary kleteb.' },
  { id: 'superhvezda',  rarity: 'common', icon: '🖊️', name: 'Kletba superhvězdy',         desc: 'Musíš se podepsat na lidi, se kterými vedeš konverzaci.' },
  { id: 'prokleti_p',   rarity: 'common', icon: '🅿️', name: 'Prokletí písmene P',          desc: 'Pán/paní promlouvá pouze pomocí pojmů počínající písmenem P' },
  { id: 'hubeny_krivak',   rarity: 'common', icon: '🎭', name: 'Kletba hubeného křiváka',  desc: 'Každé slovo, každá věta — tvá řeč musí být veršem opletá.' },
  { id: 'velka_67',     rarity: 'common', icon: '🙌', name: 'Kletba velké šedesát sedmičky', desc: 'Kdykoliv mluvíš, děláš rukama 67.' },
  { id: 'saturnin',     rarity: 'common', icon: '⭕', name: 'Saturninova kletba',          desc: 'Nosíš kolem pasu obruč.' },

  // ── RARE (modrá) ──
  { id: 'zapachajici',  rarity: 'rare', icon: '🦨', name: 'Kletba zapáchajícího poutníka', desc: 'Nesmíš do sprchy dalších 24 h.' },
  { id: 'drevorubec',   rarity: 'rare', icon: '🪓', name: 'Kletba nadšeného dřevorubce', desc: 'Nosíš s sebou špalek.' },
  { id: 'hadankar',     rarity: 'rare', icon: '❓', name: 'Kletba hádankáře',            desc: 'Odpovídáš otázkami.' },
  { id: 'hipizak',      rarity: 'rare', icon: '🧦', name: 'Kletba hipízáckého naturalisty', desc: 'Nesmíš mít na sobě boty.' },
  { id: 'kravi',        rarity: 'rare', icon: '🐄', name: 'Krávovská kletba',            desc: 'Posloucháš nonstop verzi Tylko jedno w głowie mam.' },
  { id: 'policejni',    rarity: 'rare', icon: '👮', name: 'Policejní kletba',            desc: 'Nosíš policejní kanady.' },
  { id: 'mimozeman',    rarity: 'rare', icon: '👽', name: 'Mimozemská kletba',           desc: 'Nesmíš používat reálná slova.' },
  { id: 'domina',       rarity: 'rare', icon: '⛓️', name: 'Domina kletba',               desc: 'Jsi přivázaný/á na vodítko k tomu, kdo na tebe kletbu seslal. Nutno seslat do 24 h od získání, jinak se losuje legendary kletba.' },
  { id: 'vodnik',       rarity: 'rare', icon: '🌊', name: 'Vodníkova kletba',            desc: 'Celý/á se ponoříš do Odry.' },
  { id: 'hrabal',       rarity: 'rare', icon: '📝', name: 'Hrabalova kletba',            desc: 'Sepiš konstruktivní kritiku Hrabalova programu a veď s ním o tom konverzaci.' },

  // ── LEGENDARY (zlatá) ──
  { id: 'mucednik',     rarity: 'legendary', icon: '✝️', name: 'Kletba mučedníka',       desc: 'Nosíš s sebou kříž.' },
  { id: 'brainrot',     rarity: 'legendary', icon: '🧠', name: 'Kletba brainrotu',       desc: 'Totálně jsi přišel/přišla o rozum – jen slintáš, kýveš a děláš 67 rukama na jakoukoliv interakci se světem.' },
  { id: 'trestanec',    rarity: 'legendary', icon: '👟', name: 'Trestanecká kletba',     desc: 'Zavaž si k sobě tkaničky (půjdeš jako vězeň).' },
  { id: 'yes_man',      rarity: 'legendary', icon: '👍', name: 'Yes Man kletba',         desc: 'Stáváš se yes manem.' },
  { id: 'vlk',          rarity: 'legendary', icon: '🐺', name: 'Kletba vlka',            desc: 'Chodíš po čtyřech. Když se zastavíš, jednou rukou můžeš něco dělat.' },
  { id: 'mim',          rarity: 'legendary', icon: '🎭', name: 'Kletba mima',            desc: 'Stáváš se mimem.' },

  // ── EXOTIC (fialová) ──
  { id: 'zizala',       rarity: 'exotic', icon: '🪱', name: 'Kletba žížaly',             desc: 'Musíš být ve svém spacáku.' },
  { id: 'vitr',         rarity: 'exotic', icon: '🌬️', name: 'Kletba větru',              desc: 'Tvoje chatka dostala letečák.' },
  { id: 'nejhorsi_opravdu', rarity: 'exotic', icon: '🧲', name: 'Nejhorší kletba', desc: 'Nesmíš se hnout od Gusa 1 hodinu. (Gus se musí nacházet v táboru při seslání kletby).' },
  { id: 'krupave_krizecek', rarity: 'exotic', icon: '🍗', name: 'Kletba křupavého řízečku', desc: 'Nejprve budeš namočen vodou, poté obalen moukou a strouhankou. Trojobal máš na sobě buď do oběda nebo do večeře.' },
]

export const CURSE_BY_ID = Object.fromEntries(CURSES.map(c => [c.id, c]))
export const cursesOfRarity = (rarityId) => CURSES.filter(c => c.rarity === rarityId)

// Vážený náhodný výběr – vrací index podle vah
const weightedIndex = (weights) => {
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return Math.floor(Math.random() * weights.length)
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r < 0) return i
  }
  return weights.length - 1
}

// Spočítá, kolik kopií každé kletby je napříč inventáři všech hráčů
const getCurseCounts = async () => {
  const counts = {}
  try {
    const snap = await getDocs(collection(db, 'users'))
    snap.forEach(d => {
      const u = d.data()
      ;(u.inventory || []).forEach(it => {
        if (it.type === 'curse' && it.curseId) counts[it.curseId] = (counts[it.curseId] || 0) + 1
      })
    })
  } catch { /* při chybě prostě nevážíme */ }
  return counts
}

const toKey = (username) => username.trim().toLowerCase().replace(/\s+/g, '_')
const toEmail = (key) => `${key}@mezisvetyhra.cz`

export const registerUser = async (username, password) => {
  const key = toKey(username)
  const existingSnap = await getDoc(doc(db, 'usernames', key))
  if (existingSnap.exists()) throw new Error('username-taken')
  const fakeEmail = toEmail(key)
  const cred = await createUserWithEmailAndPassword(auth, fakeEmail, password)
  await setDoc(doc(db, 'usernames', key), { uid: cred.user.uid, email: fakeEmail })
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid, username: username.trim(), usernameLower: key,
    level: 1, xp: 0, isAdmin: false, approved: false,
    inventory: [], activeCurses: [], createdAt: serverTimestamp(),
  })
  return cred.user
}

export const loginUser = async (username, password) => {
  const key = toKey(username)
  const snap = await getDoc(doc(db, 'usernames', key))
  if (!snap.exists()) throw new Error('auth/user-not-found')
  return signInWithEmailAndPassword(auth, snap.data().email, password)
}

export const logoutUser = async () => signOut(auth)

export const getUserData = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export const subscribeToUser = (uid, callback) =>
  onSnapshot(doc(db, 'users', uid), (snap) => { if (snap.exists()) callback(snap.data()) })

export const subscribeToAllUsers = (callback) =>
  onSnapshot(query(collection(db, 'users'), orderBy('level', 'desc')),
    (snap) => callback(snap.docs.map(d => d.data())))

export const subscribeToApprovedUsersForDisplay = (myUid, isAdmin, callback) => {
  const q = query(collection(db, 'users'), orderBy('level', 'desc'))
  return onSnapshot(q, (snap) => {
    const users = snap.docs.map(d => d.data()).filter(u => u.approved && !u.isAdmin)
    callback(users)
  })
}

export const subscribeToPendingUsers = (callback) => {
  const q = query(collection(db, 'users'), where('approved', '==', false))
  return onSnapshot(q, (snap) => callback(snap.docs.map(d => d.data()).filter(u => !u.isAdmin)))
}

export const approveUser = (uid) => updateDoc(doc(db, 'users', uid), { approved: true })

export const rejectUser = async (uid) => {
  const userData = await getUserData(uid)
  if (!userData) return
  if (userData.usernameLower) { try { await deleteDoc(doc(db, 'usernames', userData.usernameLower)) } catch {} }
  await deleteDoc(doc(db, 'users', uid))
}

export const addXpToUser = async (uid, xpToAdd) => {
  const userData = await getUserData(uid)
  if (!userData) throw new Error('Uživatel nenalezen')
  let newXp = userData.xp + xpToAdd, newLevel = userData.level
  let leveledUp = false
  while (newXp >= XP_PER_LEVEL) {
    newXp -= XP_PER_LEVEL; newLevel++; leveledUp = true
  }
  await updateDoc(doc(db, 'users', uid), { xp: newXp, level: newLevel })
  return { leveledUp, newLevel }
}

// Avatar (uložený jako data URL přímo v dokumentu uživatele)
export const updateUserAvatar = (uid, avatar) =>
  updateDoc(doc(db, 'users', uid), { avatar })

export const removeUserAvatar = (uid) =>
  updateDoc(doc(db, 'users', uid), { avatar: null })

// Admin přiděluje tokeny na kolo štěstí ručně
export const giveTokenToUser = async (uid, count = 1) => {
  const userData = await getUserData(uid)
  if (!userData) throw new Error('Uživatel nenalezen')
  const newInventory = [...(userData.inventory || [])]
  for (let i = 0; i < count; i++) {
    newInventory.push({ type: 'spin_token', id: `token_${Date.now()}_${Math.random()}_${i}` })
  }
  await updateDoc(doc(db, 'users', uid), { inventory: newInventory })
}

export const removeXpFromUser = async (uid, xpToRemove) => {
  const userData = await getUserData(uid)
  if (!userData) throw new Error('Uživatel nenalezen')
  let newXp = userData.xp - xpToRemove, newLevel = userData.level
  while (newXp < 0 && newLevel > 1) { newLevel--; newXp += XP_PER_LEVEL }
  if (newXp < 0) newXp = 0
  await updateDoc(doc(db, 'users', uid), { xp: newXp, level: newLevel })
  return { newLevel, newXp }
}

export const deleteUserData = async (uid) => {
  const userData = await getUserData(uid)
  if (!userData) return
  if (userData.usernameLower) { try { await deleteDoc(doc(db, 'usernames', userData.usernameLower)) } catch {} }
  await deleteDoc(doc(db, 'users', uid))
}

export const removeInventoryItem = async (uid, itemId) => {
  const userData = await getUserData(uid)
  if (!userData) return
  await updateDoc(doc(db, 'users', uid), { inventory: (userData.inventory || []).filter(i => i.id !== itemId) })
}

export const removeCurseFromUser = async (uid, curseId) => {
  const userData = await getUserData(uid)
  if (!userData) return
  await updateDoc(doc(db, 'users', uid), { activeCurses: (userData.activeCurses || []).filter(c => c.id !== curseId) })
}

export const giftCurseToUser = async (targetUid, curseId) => {
  const curse = CURSE_BY_ID[curseId]
  if (!curse) throw new Error('Kletba nenalezena')
  const targetData = await getUserData(targetUid)
  if (!targetData) throw new Error('Uživatel nenalezen')
  const newInventory = [...(targetData.inventory || []), {
    type: 'curse', curseId: curse.id, curseName: curse.name, curseIcon: curse.icon, rarity: curse.rarity,
    id: `curse_${Date.now()}_${Math.random()}`,
  }]
  await updateDoc(doc(db, 'users', targetUid), { inventory: newInventory })
  return { curse }
}

export const castCurseOnUser = async (adminUid, targetUid, curseId, options = {}) => {
  const curse = CURSE_BY_ID[curseId]
  if (!curse) throw new Error('Kletba nenalezena')
  const adminData = await getUserData(adminUid)
  const targetData = await getUserData(targetUid)
  if (!targetData) throw new Error('Uživatel nenalezen')
  const expireAt = new Date(); expireAt.setHours(23, 59, 59, 999)
  const activeCurse = {
    id: `active_${Date.now()}_${Math.random()}`,
    curseId: curse.id, curseName: curse.name, curseIcon: curse.icon, rarity: curse.rarity,
    senderUid: adminUid, senderName: adminData?.username || 'Admin',
    sentAt: new Date().toISOString(), expireAt: expireAt.toISOString(),
  }
  const targetCurses = (targetData.activeCurses || []).filter(c => new Date(c.expireAt) > new Date())
  targetCurses.push(activeCurse)
  await updateDoc(doc(db, 'users', targetUid), { activeCurses: targetCurses })
  if (!options.silent) {
    await addDoc(collection(db, 'chat'), {
      uid: adminUid, username: adminData?.username || 'Admin',
      text: `🎭 Admin seslal kletbu ${curse.icon} ${curse.name} na ${targetData.username}`,
      type: 'system', pinned: false, createdAt: serverTimestamp(),
    })
  }
  return { curse, targetName: targetData.username }
}

// ── KOLO 1 — vzácnost (váženo 59/29/9/3) ──
// Vrací rarity + její index v RARITIES + id vytvořené pending položky
export const spinWheelRarity = async (uid, tokenId) => {
  const userData = await getUserData(uid)
  if (!userData) throw new Error('Uživatel nenalezen')
  if (!userData.inventory?.some(i => i.id === tokenId)) throw new Error('Token nenalezen')
  const index = weightedIndex(RARITIES.map(r => r.weight))
  const rarity = RARITIES[index]
  const pendingId = `pending_${Date.now()}_${Math.random()}`
  const newInventory = userData.inventory.filter(i => i.id !== tokenId)
  newInventory.push({
    type: 'pending_curse', rarity: rarity.id,
    curseName: rarity.name, curseIcon: rarity.icon, // pro zobrazení v inventáři
    id: pendingId,
  })
  await updateDoc(doc(db, 'users', uid), { inventory: newInventory })
  return { rarity, index, pendingId }
}

// ── KOLO 2 — konkrétní kletba z dané vzácnosti ──
// Vážení: kletby, které už hráči mají v inventářích, padají s menší pravděpodobností.
// Vrací curse + jeho index v seznamu kleteb dané vzácnosti.
export const spinWheelCurseFromRarity = async (uid, pendingItemId) => {
  const userData = await getUserData(uid)
  if (!userData) throw new Error('Uživatel nenalezen')
  const pendingItem = userData.inventory?.find(i => i.id === pendingItemId)
  if (!pendingItem) throw new Error('Pending kletba nenalezena')
  const candidates = cursesOfRarity(pendingItem.rarity)
  if (candidates.length === 0) throw new Error('Pro tuto vzácnost nejsou žádné kletby')

  const counts = await getCurseCounts()
  // čím víckrát už kletba je v inventářích, tím menší šance (1, 1/2, 1/3, …)
  const weights = candidates.map(c => 1 / (1 + (counts[c.id] || 0)))
  const index = weightedIndex(weights)
  const curse = candidates[index]

  const newInventory = userData.inventory.filter(i => i.id !== pendingItemId)
  newInventory.push({
    type: 'curse', curseId: curse.id, curseName: curse.name, curseIcon: curse.icon, rarity: curse.rarity,
    id: `curse_${Date.now()}_${Math.random()}`,
  })
  await updateDoc(doc(db, 'users', uid), { inventory: newInventory })

  // Domina kletba má 24h limit na seslání – oznámíme to do chatu s deadlinem
  if (curse.id === 'domina') {
    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
    await addDoc(collection(db, 'chat'), {
      uid, username: userData.username,
      text: `⛓️ ${userData.username} získal domina kletbu, má čas do ${deadline}`,
      type: 'system', pinned: false, createdAt: serverTimestamp(),
    }).catch(() => {})
  }

  return { curse, index }
}

export const sendCurse = async (senderUid, targetUid, curseInventoryId) => {
  const senderRef = doc(db, 'users', senderUid)
  const targetRef = doc(db, 'users', targetUid)
  let curseItem = null, senderName = '', targetName = ''

  await runTransaction(db, async (transaction) => {
    const senderSnap = await transaction.get(senderRef)
    const targetSnap = await transaction.get(targetRef)
    if (!senderSnap.exists()) throw new Error('Odesílatel nenalezen')
    if (!targetSnap.exists()) throw new Error('Cíl nenalezen')
    const senderData = senderSnap.data()
    const targetData = targetSnap.data()
    senderName = senderData.username
    targetName = targetData.username
    curseItem = senderData.inventory?.find(i => i.id === curseInventoryId)
    if (!curseItem) throw new Error('Kletba nenalezena')
    const expireAt = new Date(); expireAt.setHours(23, 59, 59, 999)
    const activeCurse = {
      id: `active_${Date.now()}_${Math.random()}`,
      curseId: curseItem.curseId, curseName: curseItem.curseName, curseIcon: curseItem.curseIcon,
      rarity: curseItem.rarity || null,
      senderUid, senderName,
      sentAt: new Date().toISOString(), expireAt: expireAt.toISOString(),
    }
    const newSenderInventory = senderData.inventory.filter(i => i.id !== curseInventoryId)
    const targetCurses = (targetData.activeCurses || []).filter(c => new Date(c.expireAt) > new Date())
    targetCurses.push(activeCurse)
    transaction.update(senderRef, { inventory: newSenderInventory })
    transaction.update(targetRef, { activeCurses: targetCurses })
  })

  if (curseItem) {
    await addDoc(collection(db, 'chat'), {
      uid: senderUid, username: senderName,
      text: `⚡ ${senderName} seslal kletbu ${curseItem.curseIcon} ${curseItem.curseName} na ${targetName}`,
      type: 'system', pinned: false, createdAt: serverTimestamp(),
    })
  }
}

export const cleanExpiredCurses = (curses) => {
  const now = new Date()
  return (curses || []).filter(c => new Date(c.expireAt) > now)
}

export const sendChatMessage = async (uid, username, text) => {
  if (!text?.trim()) return
  await addDoc(collection(db, 'chat'), {
    uid, username, text: text.trim(),
    type: 'message', pinned: false, createdAt: serverTimestamp(),
  })
}

// Oznámení do chatu o vylosované kletbě z adminského kola (jen zobrazení)
export const announceAdminRoll = (adminUid, adminName, text) =>
  addDoc(collection(db, 'chat'), {
    uid: adminUid, username: adminName || 'Admin', text,
    type: 'system', pinned: false, createdAt: serverTimestamp(),
  })

export const deleteChatMessage = (msgId) => deleteDoc(doc(db, 'chat', msgId))
export const pinChatMessage = (msgId, pinned) => updateDoc(doc(db, 'chat', msgId), { pinned })

export const subscribeToChatMessages = (callback, max = 200) => {
  const q = query(collection(db, 'chat'), orderBy('createdAt', 'desc'), limit(max))
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse()
    callback(msgs)
  })
}
