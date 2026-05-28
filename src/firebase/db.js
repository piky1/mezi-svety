import {
  collection, doc, getDoc, setDoc, updateDoc, deleteDoc,
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

export const CURSES_15 = [
  {
    id: 'slepota', name: 'Slepota', icon: '👁️',
    tiers: [
      { id: 'zavazani_oci', name: 'Zavázání očí', icon: '🙈' },
      { id: 'slunecni_bryle', name: 'Sluneční brýle', icon: '🕶️' },
      { id: 'jedno_oko', name: 'Zavázání jen jednoho oka', icon: '🏴‍☠️' },
    ]
  },
  {
    id: 'ncoz_acab', name: 'NCOZ ACAB', icon: '🫸',
    tiers: [
      { id: 'ruce_vzad', name: 'Zavázání rukou vzad', icon: '🔒' },
      { id: 'ruka_k_noze', name: 'Zavázání ruky k noze', icon: '⛓️' },
      { id: 'obou_nohou', name: 'Zavázání obou nohou', icon: '🦵' },
    ]
  },
  {
    id: 'blbecek', name: 'Blbéček', icon: '🤪',
    tiers: [
      { id: 'jen_jo_ne', name: 'Odpovídá jen „jo" nebo „ne"', icon: '🤐' },
      { id: 'otazkami', name: 'Odpovídá otázkami', icon: '❓' },
      { id: 'slinta', name: 'Nesmí mluvit, jen slintá a kývá', icon: '🤤' },
    ]
  },
  {
    id: 'skibidi67', name: 'Skibidi 67', icon: '💃',
    tiers: [
      { id: '67_interakce', name: 'Musí dělat 67 na jakoukoliv interakci', icon: '🕺' },
      { id: '67_otazka', name: 'Musí 67 když se ho někdo ptá', icon: '🎵' },
      { id: '67_mluveni', name: '67 kdykoli mluví', icon: '🎤' },
    ]
  },
  {
    id: 'zpomaleni', name: 'Zpomalení', icon: '🐢',
    tiers: [
      { id: 'spalek', name: 'Nošení špalku', icon: '🪵' },
      { id: 'zidle', name: 'Nošení židle', icon: '🪑' },
      { id: 'kaminek', name: 'Nošení kamínku', icon: '🪨' },
    ]
  },
]

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

export const giftCurseToUser = async (targetUid, curseId, tierId) => {
  const curse = CURSES_15.find(c => c.id === curseId)
  if (!curse) throw new Error('Kletba nenalezena')
  const tier = curse.tiers.find(t => t.id === tierId)
  if (!tier) throw new Error('Tier nenalezen')
  const targetData = await getUserData(targetUid)
  if (!targetData) throw new Error('Uživatel nenalezen')
  const newInventory = [...(targetData.inventory || []), {
    type: 'curse', curseId: curse.id, curseName: curse.name, curseIcon: curse.icon,
    tierId: tier.id, tierName: tier.name, tierIcon: tier.icon,
    id: `curse_${Date.now()}_${Math.random()}`,
  }]
  await updateDoc(doc(db, 'users', targetUid), { inventory: newInventory })
  return { curse, tier }
}

export const castCurseOnUser = async (adminUid, targetUid, curseId, tierId) => {
  const curse = CURSES_15.find(c => c.id === curseId)
  if (!curse) throw new Error('Kletba nenalezena')
  const tier = curse.tiers.find(t => t.id === tierId)
  if (!tier) throw new Error('Tier nenalezen')
  const adminData = await getUserData(adminUid)
  const targetData = await getUserData(targetUid)
  if (!targetData) throw new Error('Uživatel nenalezen')
  const expireAt = new Date(); expireAt.setHours(23, 59, 59, 999)
  const activeCurse = {
    id: `active_${Date.now()}_${Math.random()}`,
    curseId: curse.id, curseName: curse.name, curseIcon: curse.icon,
    tierId: tier.id, tierName: tier.name, tierIcon: tier.icon,
    senderUid: adminUid, senderName: adminData?.username || 'Admin',
    sentAt: new Date().toISOString(), expireAt: expireAt.toISOString(),
  }
  const targetCurses = (targetData.activeCurses || []).filter(c => new Date(c.expireAt) > new Date())
  targetCurses.push(activeCurse)
  await updateDoc(doc(db, 'users', targetUid), { activeCurses: targetCurses })
  await addDoc(collection(db, 'chat'), {
    uid: adminUid, username: adminData?.username || 'Admin',
    text: `🎭 Admin seslal kletbu ${curse.icon} ${curse.name} (${tier.icon} ${tier.name}) na ${targetData.username}`,
    type: 'system', pinned: false, createdAt: serverTimestamp(),
  })
  return { curse, tier }
}

// Vrací curse + index v CURSES_15
export const spinWheelCurse = async (uid, tokenId) => {
  const userData = await getUserData(uid)
  if (!userData) throw new Error('Uživatel nenalezen')
  if (!userData.inventory?.some(i => i.id === tokenId)) throw new Error('Token nenalezen')
  const index = Math.floor(Math.random() * CURSES_15.length)
  const curse = CURSES_15[index]
  const pendingId = `pending_${Date.now()}_${Math.random()}`
  const newInventory = userData.inventory.filter(i => i.id !== tokenId)
  newInventory.push({
    type: 'pending_curse', curseId: curse.id, curseName: curse.name,
    curseIcon: curse.icon, curseTiers: curse.tiers, id: pendingId,
  })
  await updateDoc(doc(db, 'users', uid), { inventory: newInventory })
  return { curse, index, pendingId }
}

// Vrací tier + index v tiers
export const spinWheelTier = async (uid, pendingItemId, tiers) => {
  const userData = await getUserData(uid)
  if (!userData) throw new Error('Uživatel nenalezen')
  const pendingItem = userData.inventory?.find(i => i.id === pendingItemId)
  if (!pendingItem) throw new Error('Pending kletba nenalezena')
  const index = Math.floor(Math.random() * tiers.length)
  const tier = tiers[index]
  const newInventory = userData.inventory.filter(i => i.id !== pendingItemId)
  newInventory.push({
    type: 'curse', curseId: pendingItem.curseId, curseName: pendingItem.curseName,
    curseIcon: pendingItem.curseIcon, tierId: tier.id, tierName: tier.name, tierIcon: tier.icon,
    id: `curse_${Date.now()}_${Math.random()}`,
  })
  await updateDoc(doc(db, 'users', uid), { inventory: newInventory })
  return { tier, index }
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
      tierId: curseItem.tierId || null, tierName: curseItem.tierName || null, tierIcon: curseItem.tierIcon || null,
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
      text: `⚡ ${senderName} seslal kletbu ${curseItem.curseIcon} ${curseItem.curseName}${curseItem.tierName ? ` / ${curseItem.tierName}` : ''} na ${targetName}`,
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

export const deleteChatMessage = (msgId) => deleteDoc(doc(db, 'chat', msgId))
export const pinChatMessage = (msgId, pinned) => updateDoc(doc(db, 'chat', msgId), { pinned })

export const subscribeToChatMessages = (callback) => {
  const q = query(collection(db, 'chat'), orderBy('createdAt', 'desc'), limit(80))
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse()
    callback(msgs)
  })
}
